import type { RowDataPacket } from 'mysql2';
import { queryRows } from '../db.js';
import { HttpError } from '../http.js';

export interface MapRecord {
  id: number;
  ownerId: number | null;
  ownerName: string;
  name: string;
  description: string;
  data: string;
  width: number;
  height: number;
  goldCount: number;
  isPublic: boolean;
  runCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface MapRow extends RowDataPacket {
  id: number;
  owner_id: number | null;
  owner_name: string;
  name: string;
  description: string;
  data: string;
  width: number;
  height: number;
  gold_count: number;
  is_public: number;
  run_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

const MAP_SELECT = `
  SELECT m.id, m.owner_id, COALESCE(u.username, 'Rendszer') AS owner_name,
         m.name, m.description, m.data, m.width, m.height, m.gold_count,
         m.is_public, m.created_at, m.updated_at,
         (SELECT COUNT(*) FROM runs r WHERE r.map_id = m.id) AS run_count
  FROM maps m
  LEFT JOIN users u ON u.id = m.owner_id
`;

function toRecord(row: MapRow): MapRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    name: row.name,
    description: row.description,
    data: row.data,
    width: row.width,
    height: row.height,
    goldCount: row.gold_count,
    isPublic: row.is_public === 1,
    runCount: Number(row.run_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findMapById(id: number): Promise<MapRecord | null> {
  const rows = await queryRows<MapRow>(`${MAP_SELECT} WHERE m.id = ? LIMIT 1`, [id]);
  return rows[0] ? toRecord(rows[0]) : null;
}

/** A felhasználó számára látható térképek: nyilvánosak és sajátok. */
export async function listVisibleMaps(userId: number): Promise<MapRecord[]> {
  const rows = await queryRows<MapRow>(
    `
      ${MAP_SELECT}
      WHERE m.is_public = 1 OR m.owner_id = ?
      ORDER BY (m.owner_id IS NULL) DESC, m.updated_at DESC, m.id ASC
    `,
    [userId],
  );
  return rows.map(toRecord);
}

export function canAccessMap(map: MapRecord, userId: number): boolean {
  return map.isPublic || map.ownerId === userId;
}

export async function requireAccessibleMap(id: number, userId: number): Promise<MapRecord> {
  const map = await findMapById(id);
  if (!map || !canAccessMap(map, userId)) {
    throw new HttpError(404, 'A térkép nem található.', 'MAP_NOT_FOUND');
  }
  return map;
}

export function mapSummary(map: MapRecord, userId: number) {
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
