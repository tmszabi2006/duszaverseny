import { countGold, DEMO_MAPS, formatMap, parseMap } from '@minescript/shared';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import fs from 'node:fs/promises';
import { config } from '../config.js';

const schemaUrl = new URL('../../sql/schema.sql', import.meta.url);

/**
 * A CREATE TABLE IF NOT EXISTS nem ad hozzá indexet egy már létező táblához,
 * a MySQL pedig nem ismeri a CREATE INDEX IF NOT EXISTS szintaxist. Ezért
 * az INFORMATION_SCHEMA-ból ellenőrizzük, hogy szükséges-e a migráció.
 */
async function ensureIndex(
  connection: Connection,
  table: string,
  indexName: string,
  definition: string,
): Promise<void> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
      LIMIT 1
    `,
    [config.db.database, table, indexName],
  );

  if (rows.length > 0) return;

  await connection.query(`ALTER TABLE \`${table}\` ADD ${definition}`);
  console.log(`Hiányzó index pótolva: ${table}.${indexName}`);
}

async function main(): Promise<void> {
  const schema = await fs.readFile(schemaUrl, 'utf8');

  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: process.env.DB_ADMIN_USER ?? config.db.user,
    password: process.env.DB_ADMIN_PASSWORD ?? config.db.password,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    const [schemas] = await connection.query<RowDataPacket[]>(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1',
      [config.db.database],
    );
    if (schemas.length === 0) {
      await connection.query(
        'CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
        [config.db.database],
      );
    }
    await connection.changeUser({ database: config.db.database });
    await connection.query(schema);

    // Meglévő adatbázisok frissítése: a hiányzó teljesítményindexek pótlása.
    await ensureIndex(
      connection,
      'maps',
      'idx_maps_public_updated',
      'INDEX idx_maps_public_updated (is_public, updated_at)',
    );
    await ensureIndex(
      connection,
      'maps',
      'idx_maps_owner_updated',
      'INDEX idx_maps_owner_updated (owner_id, updated_at)',
    );
    await ensureIndex(
      connection,
      'runs',
      'idx_runs_map_user_score',
      'INDEX idx_runs_map_user_score (map_id, user_id, gold DESC, steps ASC, created_at ASC, id ASC)',
    );

    console.log(`Adatbázis séma rendben: ${config.db.database}`);

    let created = 0;
    let skipped = 0;

    for (const demo of DEMO_MAPS) {
      const parsed = parseMap(demo.data);
      if (!parsed.ok) {
        throw new Error(`A(z) „${demo.name}” minta térkép érvénytelen: ${parsed.error}`);
      }

      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM maps WHERE owner_id IS NULL AND (name = ? OR name = ?) LIMIT 1',
        [demo.name, demo.legacyName ?? demo.name],
      );
      if (existing.length > 0) {
        await connection.execute('UPDATE maps SET name = ?, description = ? WHERE id = ? AND owner_id IS NULL',
          [demo.name, demo.description, existing[0].id]);
        skipped++;
        continue;
      }

      await connection.execute(
        `
          INSERT INTO maps (owner_id, name, description, data, width, height, gold_count, is_public)
          VALUES (NULL, ?, ?, ?, ?, ?, ?, 1)
        `,
        [
          demo.name,
          demo.description,
          formatMap(parsed.map),
          parsed.map.width,
          parsed.map.height,
          countGold(parsed.map),
        ],
      );
      created++;
    }

    console.log(`Rendszer-térképek: ${created} létrehozva, ${skipped} már létezett.`);
    console.log('Kész. Indíthatod a szervert: npm start');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Az adatbázis előkészítése sikertelen:', error);
  process.exitCode = 1;
});
