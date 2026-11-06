import { countGold, DEMO_MAPS, formatMap, parseMap } from '@minescript/shared';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import fs from 'node:fs/promises';
import { config } from '../config.js';

const schemaUrl = new URL('../../sql/schema.sql', import.meta.url);

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
    console.log(`Adatbázis séma rendben: ${config.db.database}`);

    let created = 0;
    let skipped = 0;

    for (const demo of DEMO_MAPS) {
      const parsed = parseMap(demo.data);
      if (!parsed.ok) {
        throw new Error(`A(z) „${demo.name}” minta térkép érvénytelen: ${parsed.error}`);
      }

      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM maps WHERE owner_id IS NULL AND name = ? LIMIT 1',
        [demo.name],
      );
      if (existing.length > 0) {
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
