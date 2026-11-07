import mysql, { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import { config } from './config.js';

/** Az SQL-lekérdezésekben megengedett kötési értékek. */
export type SqlParameter = string | number | boolean | Date | null | Buffer | Uint8Array;

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.poolSize,
  queueLimit: 0,
  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  maxPreparedStatements: 200,
});

/**
 * Paraméterezett lekérdezés. A mysql2 előkészített utasításokat használ,
 * így az értékek nem kerülnek közvetlenül az SQL szövegébe.
 */
export async function queryRows<T extends RowDataPacket>(
  sql: string,
  params: SqlParameter[] = [],
): Promise<T[]> {
  const [rows] = await pool.execute<T[]>(sql, params);
  return rows;
}

export async function execute(sql: string, params: SqlParameter[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

export async function closePool(): Promise<void> {
  await pool.end();
}
