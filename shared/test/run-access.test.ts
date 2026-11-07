import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';

vi.mock('../../server/src/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: () => void) => {
    req.user = { id: Number(req.headers['x-test-user']), username: 'Teszt' };
    next();
  },
}));
vi.mock('../../server/src/repositories/maps.js', () => ({
  requireAccessibleMap: async () => ({ ownerId: 2, isPublic: true }),
  requireAccessibleMapContent: vi.fn(),
}));
vi.mock('../../server/src/db.js', () => ({
  execute: vi.fn(),
  queryRows: async (sql: string) => [{
    id: 10, map_id: 5, map_name: 'Tesztpálya', program_source: 'print 1',
    gold: 0, steps: 1, error_code: null, created_at: '2026-11-07',
    // A lekérdezés csak a ténylegesen kiválasztott mezőket adja vissza.
    ...(sql.includes('r.user_id') ? { user_id: 1 } : {}),
  }],
}));

import { runsRouter } from '../../server/src/routes/runs.js';
let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use('/runs', runsRouter);
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status ?? 500).json({ message: error.message }));
  await new Promise<void>((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });

it('a futás készítője a rendszer/idegen pályán is eléri a saját programját', async () => {
  const response = await fetch(`${base}/runs/10`, { headers: { 'x-test-user': '1' } });
  expect(response.status).toBe(200);
  expect((await response.json()).run.programSource).toBe('print 1');
});
it('a pálya tulajdonosa továbbra is megtekintheti a futást', async () => {
  expect((await fetch(`${base}/runs/10`, { headers: { 'x-test-user': '2' } })).status).toBe(200);
});
it('más játékos nem olvashatja el az idegen megoldást', async () => {
  expect((await fetch(`${base}/runs/10`, { headers: { 'x-test-user': '3' } })).status).toBe(403);
});
