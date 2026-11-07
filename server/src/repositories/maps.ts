import type { RowDataPacket } from 'mysql2';
import { queryRows } from '../db.js';
import { HttpError } from '../http.js';

export interface MapSummaryRecord {
  id: number;
  ownerId: number | null;
  ownerName: string;
  name: string;
  description: string;
  width: number;
  height: number;
  goldCount: number;
  isPublic: boolean;
  runCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MapRecord extends MapSummaryRecord {
  data: string;
}

export interface MapContentRecord {
  id: number;
  ownerId: number | null;
  isPublic: boolean;
  data: string;
}

interface MapContentRow extends RowDataPacket {
  id: number;
  owner_id: number | null;
  is_public: number;
  data: string;
}

interface MapSummaryRow extends RowDataPacket {
  id: number;
  owner_id: number | null;
  owner_name: string;
  name: string;
  description: string;
  width: number;
  height: number;
  gold_count: number;
  is_public: number;
  run_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

interface MapRow extends MapSummaryRow {
  data: string;
}

const MAP_FIELDS = `
  m.id, m.owner_id, COALESCE(u.username, 'Rendszer') AS owner_name,
  m.name, m.description, m.width, m.height, m.gold_count,
  m.is_public, m.created_at, m.updated_at,
  (SELECT COUNT(*) FROM runs r WHERE r.map_id = m.id) AS run_count
`;

const MAP_FROM = `
  FROM maps m
  LEFT JOIN users u ON u.id = m.owner_id
`;

// A lista lekérdezés szándékosan nem tölti be a térkép teljes adatát (data).
const MAP_SUMMARY_SELECT = `SELECT ${MAP_FIELDS} ${MAP_FROM}`;
const MAP_DETAIL_SELECT = `SELECT ${MAP_FIELDS}, m.data ${MAP_FROM}`;

function toSummary(row: MapSummaryRow): MapSummaryRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    name: row.name,
    description: row.description,
    width: row.width,
    height: row.height,
    goldCount: row.gold_count,
    isPublic: row.is_public === 1,
    runCount: Number(row.run_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRecord(row: MapRow): MapRecord {
  return {
    ...toSummary(row),
    data: row.data,
  };
}

export async function findMapById(id: number): Promise<MapRecord | null> {
  const rows = await queryRows<MapRow>(`${MAP_DETAIL_SELECT} WHERE m.id = ? LIMIT 1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

/**
 * Csak a futtatáshoz szükséges mezőket tölti be. Így a futás indítása nem
 * futtatja le a térkép futásszámát számoló alkérdést.
 */
export async function findMapContentById(id: number): Promise<MapContentRecord | null> {
  const rows = await queryRows<MapContentRow>(
    'SELECT m.id, m.owner_id, m.is_public, m.data FROM maps m WHERE m.id = ? LIMIT 1',
    [id],
  );
  const row = rows[0];
  return row
    ? {
        id: row.id,
        ownerId: row.owner_id,
        isPublic: row.is_public === 1,
        data: row.data,
      }
    : null;
}

export async function findMapSummaryById(id: number): Promise<MapSummaryRecord | null> {
  const rows = await queryRows<MapSummaryRow>(
    `${MAP_SUMMARY_SELECT} WHERE m.id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? toSummary(rows[0]) : null;
}

/** A felhasználó számára látható térképek: nyilvánosak és sajátok. */
export async function listVisibleMaps(userId: number): Promise<MapSummaryRecord[]> {
  const rows = await queryRows<MapSummaryRow>(
    `
      ${MAP_SUMMARY_SELECT}
      WHERE m.is_public = 1 OR m.owner_id = ?
      ORDER BY (m.owner_id IS NULL) DESC, m.updated_at DESC, m.id ASC
    `,
    [userId],
  );
  return rows.map(toSummary);
}

export function canAccessMap(
  map: Pick<MapSummaryRecord, 'isPublic' | 'ownerId'>,
  userId: number,
): boolean {
  return map.isPublic || map.ownerId === userId;
}

export async function requireAccessibleMap(id: number, userId: number): Promise<MapRecord> {
  const map = await findMapById(id);
  if (!map || !canAccessMap(map, userId)) {
    throw new HttpError(404, 'A térkép nem található.', 'MAP_NOT_FOUND');
  }
  return map;
}

export async function requireAccessibleMapContent(
  id: number,
  userId: number,
): Promise<MapContentRecord> {
  const map = await findMapContentById(id);
  if (!map || !canAccessMap(map, userId)) {
    throw new HttpError(404, 'A térkép nem található.', 'MAP_NOT_FOUND');
  }
  return map;
}

export async function requireAccessibleMapSummary(
  id: number,
  userId: number,
): Promise<MapSummaryRecord> {
  const map = await findMapSummaryById(id);
  if (!map || !canAccessMap(map, userId)) {
    throw new HttpError(404, 'A térkép nem található.', 'MAP_NOT_FOUND');
  }
  return map;
}

export function mapSummary(map: MapSummaryRecord, userId: number) {
  return {
    id: map.id,
    name: map.name,
    description: map.description,
    width: map.width,
    height: map.height,
    goldCount: map.goldCount,
    isPublic: map.isPublic,
    owner: map.ownerName,
    isOwner: map.ownerId !== null && map.ownerId === userId,
    runCount: map.runCount,
    createdAt: map.createdAt,
    updatedAt: map.updatedAt,
  };
}

export function mapDetail(map: MapRecord, userId: number) {
  return {
    ...mapSummary(map, userId),
    data: map.data,
  };
}
