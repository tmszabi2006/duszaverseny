import { countGold, formatMap, parseMap } from '@minescript/shared';
import { Router } from 'express';
import type { RowDataPacket } from 'mysql2';
import { requireAuth } from '../auth.js';
import { execute, queryRows } from '../db.js';
import { HttpError, asyncHandler, bodyString, parseIdParam } from '../http.js';
import {
  findMapById,
  listVisibleMaps,
  mapDetail,
  mapSummary,
  requireAccessibleMap,
  type MapRecord,
} from '../repositories/maps.js';

interface MapInput {
  name: string;
  description: string;
  data: string;
  isPublic: boolean;
  canonicalData: string;
  width: number;
  height: number;
  goldCount: number;
}

interface RunCountRow extends RowDataPacket {
  count: number;
}

function readMapInput(body: unknown): MapInput {
  const name = bodyString(body, 'name', { required: true, maxLength: 80 });
  const description = bodyString(body, 'description', { maxLength: 500 });
  const data = bodyString(body, 'data', { required: true, maxLength: 10000, trim: false });

  const rawPublic = (body as { isPublic?: unknown } | null | undefined)?.isPublic;
  if (rawPublic !== undefined && typeof rawPublic !== 'boolean') {
    throw new HttpError(400, 'Az isPublic mező logikai érték kell legyen.');
  }
  const isPublic = rawPublic === undefined ? true : rawPublic;

  const parsed = parseMap(data);
  if (!parsed.ok) {
    throw new HttpError(400, parsed.error, 'INVALID_MAP', parsed.line ? { line: parsed.line } : undefined);
  }

  return {
    name,
    description,
    data,
    isPublic,
    canonicalData: formatMap(parsed.map),
    width: parsed.map.width,
    height: parsed.map.height,
    goldCount: countGold(parsed.map),
  };
}

function ensureOwner(map: MapRecord, userId: number): void {
  if (map.ownerId === null) {
    throw new HttpError(403, 'A rendszer térképei nem szerkeszthetők.', 'SYSTEM_MAP');
  }
  if (map.ownerId !== userId) {
    throw new HttpError(403, 'Ehhez a térképhez nincs szerkesztési jogosultságod.', 'FORBIDDEN');
  }
}

export const mapsRouter = Router();

mapsRouter.use(requireAuth);

mapsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const maps = await listVisibleMaps(user.id);
    res.json({ maps: maps.map((map) => mapSummary(map, user.id)) });
  }),
);

mapsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = parseIdParam(req.params.id);
    const map = await requireAccessibleMap(id, user.id);
    res.json({ map: mapDetail(map, user.id) });
  }),
);

mapsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const input = readMapInput(req.body);

    const result = await execute(
      `
        INSERT INTO maps (owner_id, name, description, data, width, height, gold_count, is_public)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user.id,
        input.name,
        input.description,
        input.canonicalData,
        input.width,
        input.height,
        input.goldCount,
        input.isPublic ? 1 : 0,
      ],
    );

    const map = await findMapById(result.insertId);
    if (!map) throw new HttpError(500, 'A térkép mentése nem sikerült.');
    res.status(201).json({ map: mapDetail(map, user.id) });
  }),
);

mapsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = parseIdParam(req.params.id);
    const existing = await findMapById(id);
    if (!existing) throw new HttpError(404, 'A térkép nem található.', 'MAP_NOT_FOUND');
    ensureOwner(existing, user.id);

    const input = readMapInput(req.body);
    const dataChanged = input.canonicalData !== existing.data;

    if (dataChanged) {
      const counts = await queryRows<RunCountRow>(
        'SELECT COUNT(*) AS `count` FROM runs WHERE map_id = ?',
        [id],
      );
      if ((counts[0]?.count ?? 0) > 0) {
        throw new HttpError(
          409,
          'Ezen a térképen már születtek eredmények, ezért a pálya tartalma nem módosítható. Hozz létre új térképet a módosított változatból.',
          'MAP_HAS_RUNS',
        );
      }
    }

    await execute(
      `
        UPDATE maps
        SET name = ?, description = ?, data = ?, width = ?, height = ?, gold_count = ?,
            is_public = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        input.name,
        input.description,
        input.canonicalData,
        input.width,
        input.height,
        input.goldCount,
        input.isPublic ? 1 : 0,
        id,
      ],
    );

    const updated = await findMapById(id);
    if (!updated) throw new HttpError(500, 'A térkép frissítése nem sikerült.');
    res.json({ map: mapDetail(updated, user.id) });
  }),
);

mapsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = parseIdParam(req.params.id);
    const map = await findMapById(id);
    if (!map) throw new HttpError(404, 'A térkép nem található.', 'MAP_NOT_FOUND');
    ensureOwner(map, user.id);

    await execute('DELETE FROM maps WHERE id = ?', [id]);
    res.status(204).end();
  }),
);
