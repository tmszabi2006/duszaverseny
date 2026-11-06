import type { RowDataPacket } from 'mysql2';
import { execute, queryRows } from '../db.js';

export interface NewRun {
  mapId: number;
  userId: number;
  programSource: string;
  gold: number;
  steps: number;
  errorCode: string | null;
  errorLine: number | null;
  errorMessage: string | null;
}

interface RunRow extends RowDataPacket {
  id: number;
  map_id: number;
  map_name: string;
  program_source: string;
  gold: number;
  steps: number;
  error_code: string | null;
  error_line: number | null;
  error_message: string | null;
  created_at: Date | string;
}

interface StatsRow extends RowDataPacket {
  total_runs: number;
  total_gold: number | string;
  maps_tried: number;
  clean_runs: number | string;
  best_gold: number | string;
}

export interface LeaderboardRow extends RowDataPacket {
  user_id: number;
  username: string;
  gold: number;
  steps: number;
  error_code: string | null;
  created_at: Date | string;
}

export function serializeRun(row: RunRow) {
  return {
    id: row.id,
    mapId: row.map_id,
    mapName: row.map_name,
    programSource: row.program_source,
    gold: row.gold,
    steps: row.steps,
    error: row.error_code
      ? {
          code: row.error_code,
          line: row.error_line,
          message: row.error_message ?? '',
        }
      : null,
    createdAt: row.created_at,
  };
}

const RUN_SELECT = `
  SELECT r.id, r.map_id, m.name AS map_name, r.program_source, r.gold, r.steps,
         r.error_code, r.error_line, r.error_message, r.created_at
  FROM runs r
  JOIN maps m ON m.id = r.map_id
`;

export async function insertRun(run: NewRun): Promise<number> {
  const result = await execute(
    `
      INSERT INTO runs
        (map_id, user_id, program_source, gold, steps, error_code, error_line, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      run.mapId,
      run.userId,
      run.programSource,
      run.gold,
      run.steps,
      run.errorCode,
      run.errorLine,
      run.errorMessage,
    ],
  );
  return result.insertId;
}

export async function findRunById(id: number): Promise<RunRow | null> {
  const rows = await queryRows<RunRow>(`${RUN_SELECT} WHERE r.id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function listRunsForUser(userId: number, limit = 50): Promise<RunRow[]> {
  return queryRows<RunRow>(
    `
      ${RUN_SELECT}
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT ?
    `,
    [userId, limit],
  );
}

export async function runStatsForUser(userId: number) {
  const rows = await queryRows<StatsRow>(
    `
      SELECT COUNT(*) AS total_runs,
             COALESCE(SUM(gold), 0) AS total_gold,
             COUNT(DISTINCT map_id) AS maps_tried,
             COALESCE(SUM(error_code IS NULL), 0) AS clean_runs,
             COALESCE(MAX(gold), 0) AS best_gold
      FROM runs
      WHERE user_id = ?
    `,
    [userId],
  );
  const row = rows[0];
  return {
    totalRuns: Number(row?.total_runs ?? 0),
    totalGold: Number(row?.total_gold ?? 0),
    mapsTried: Number(row?.maps_tried ?? 0),
    cleanRuns: Number(row?.clean_runs ?? 0),
    bestGold: Number(row?.best_gold ?? 0),
  };
}

/**
 * Minden felhasználó legjobb futása egy térképen.
 *
 * A PDF 3.5. fejezete szerint több arany előrébb áll, azonos arany esetén
 * pedig a kevesebb feldolgozott programsor. Azonos eredmény esetén a
 * korábban született futás kerül előrébb, hogy a sorrend determinisztikus legyen.
 */
export async function leaderboardForMap(mapId: number, limit = 100): Promise<LeaderboardRow[]> {
  return queryRows<LeaderboardRow>(
    `
      SELECT ranked.user_id, ranked.username, ranked.gold, ranked.steps,
             ranked.error_code, ranked.created_at
      FROM (
        SELECT r.user_id, u.username, r.gold, r.steps, r.created_at, r.error_code,
               ROW_NUMBER() OVER (
                 PARTITION BY r.user_id
                 ORDER BY r.gold DESC, r.steps ASC, r.created_at ASC, r.id ASC
               ) AS position_in_user
        FROM runs r
        JOIN users u ON u.id = r.user_id
        WHERE r.map_id = ?
      ) AS ranked
      WHERE ranked.position_in_user = 1
      ORDER BY ranked.gold DESC, ranked.steps ASC, ranked.created_at ASC, ranked.user_id ASC
      LIMIT ?
    `,
    [mapId, limit],
  );
}
