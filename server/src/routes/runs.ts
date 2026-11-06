import { parseMap, parseProgram, runProgram } from '@minescript/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../auth.js';
import { HttpError, asyncHandler, parseIdParam } from '../http.js';
import { requireAccessibleMap } from '../repositories/maps.js';
import {
  findRunById,
  insertRun,
  listRunsForUser,
  runStatsForUser,
  serializeRun,
} from '../repositories/runs.js';

const MAX_PROGRAM_LENGTH = 20000;

const runLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Túl sok futtatás rövid idő alatt. Várj egy kicsit, és próbáld újra.' },
});

function readMapId(body: unknown): number {
  const raw = (body as { mapId?: unknown } | null | undefined)?.mapId;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0 && raw <= 2_147_483_647) {
    return raw;
  }
  if (typeof raw === 'string' && /^[1-9][0-9]{0,9}$/.test(raw)) {
    return Number(raw);
  }
  throw new HttpError(400, 'Érvénytelen vagy hiányzó mapId.');
}

function readProgramSource(body: unknown): string {
  const raw = (body as { source?: unknown } | null | undefined)?.source;
  if (typeof raw !== 'string') {
    throw new HttpError(400, 'A program forrása kötelező (source mező).');
  }
  if (raw.length > MAX_PROGRAM_LENGTH) {
    throw new HttpError(400, `A program legfeljebb ${MAX_PROGRAM_LENGTH} karakter lehet.`);
  }
  return raw;
}

export const runsRouter = Router();

runsRouter.use(requireAuth);

runsRouter.post(
  '/',
  runLimiter,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const mapId = readMapId(req.body);
    const source = readProgramSource(req.body);

    const map = await requireAccessibleMap(mapId, user.id);

    const parsedProgram = parseProgram(source);
    if (!parsedProgram.ok) {
      throw new HttpError(
        400,
        parsedProgram.error.message,
        'PROGRAM_PARSE_ERROR',
        { line: parsedProgram.error.line },
      );
    }

    const parsedMap = parseMap(map.data);
    if (!parsedMap.ok) {
      throw new HttpError(
        500,
        'A mentett térkép érvénytelen, ezért a futtatás nem lehetséges.',
        'STORED_MAP_INVALID',
      );
    }

    // A szerver nem bízik a kliensben: ugyanazzal a közös motorral futtatja
    // újra a programot, és az itt kapott eredmény kerül az adatbázisba.
    const result = runProgram(parsedMap.map, parsedProgram.program);

    const runId = await insertRun({
      mapId,
      userId: user.id,
      programSource: source,
      gold: result.gold,
      steps: result.steps,
      errorCode: result.error?.code ?? null,
      errorLine: result.error?.line ?? null,
      errorMessage: result.error?.message ?? null,
    });

    const stored = await findRunById(runId);
    if (!stored) {
      throw new HttpError(500, 'A futás mentése nem sikerült.');
    }

    res.status(201).json({
      run: serializeRun(stored),
      result: {
        gold: result.gold,
        initialGold: result.initialGold,
        steps: result.steps,
        error: result.error,
      },
    });
  }),
);

runsRouter.get(
  '/mine',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const [runs, stats] = await Promise.all([
      listRunsForUser(user.id),
      runStatsForUser(user.id),
    ]);
    res.json({
      runs: runs.map(serializeRun),
      stats,
    });
  }),
);

runsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = parseIdParam(req.params.id);
    const run = await findRunById(id);
    if (!run) throw new HttpError(404, 'A futás nem található.', 'RUN_NOT_FOUND');
    // A futás közvetlen lekérése csak a tulajdonosnak engedélyezett.
    const map = await requireAccessibleMap(run.map_id, user.id);
    if (run.user_id !== user.id && map.ownerId !== user.id) {
      throw new HttpError(403, 'Ehhez a futáshoz nincs jogosultságod.', 'FORBIDDEN');
    }
    res.json({ run: serializeRun(run) });
  }),
);
