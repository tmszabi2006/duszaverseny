import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { asyncHandler, parseIdParam } from '../http.js';
import { mapSummary, requireAccessibleMapSummary } from '../repositories/maps.js';
import { leaderboardForMap } from '../repositories/runs.js';

export const leaderboardRouter = Router();

leaderboardRouter.use(requireAuth);

leaderboardRouter.get(
  '/:id/leaderboard',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const id = parseIdParam(req.params.id);
    const map = await requireAccessibleMapSummary(id, user.id);
    const rows = await leaderboardForMap(id);

    res.json({
      map: mapSummary(map, user.id),
      entries: rows.map((row, index) => ({
        rank: index + 1,
        userId: row.user_id,
        username: row.username,
        gold: row.gold,
        steps: row.steps,
        errorCode: row.error_code,
        createdAt: row.created_at,
        isCurrentUser: row.user_id === user.id,
      })),
    });
  }),
);
