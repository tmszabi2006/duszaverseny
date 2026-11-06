import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { RowDataPacket } from 'mysql2';
import { clearSessionCookie, currentUser, requireAuth, setSessionCookie, signSession } from '../auth.js';
import { execute, queryRows } from '../db.js';
import { HttpError, asyncHandler } from '../http.js';

const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,23}$/;

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Túl sok próbálkozás. Próbáld újra néhány perc múlva.' },
});

function validateUsername(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new HttpError(400, 'A felhasználónév megadása kötelező.');
  }
  const username = raw.trim();
  if (!USERNAME_RE.test(username)) {
    throw new HttpError(
      400,
      'A felhasználónév 3–24 karakter lehet, betűvel vagy számmal kezdődik, és csak betűt, számot, pontot, alávonást vagy kötőjelet tartalmazhat.',
    );
  }
  return username;
}

function validatePassword(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new HttpError(400, 'A jelszó megadása kötelező.');
  }
  if (raw.length < 8) {
    throw new HttpError(400, 'A jelszó legalább 8 karakter legyen.');
  }
  if (raw.length > 200) {
    throw new HttpError(400, 'A jelszó legfeljebb 200 karakter lehet.');
  }
  return raw;
}

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const username = validateUsername((req.body as { username?: unknown } | undefined)?.username);
    const password = validatePassword((req.body as { password?: unknown } | undefined)?.password);
    const usernameLower = username.toLowerCase();

    const existing = await queryRows<RowDataPacket>(
      'SELECT id FROM users WHERE username_lower = ? LIMIT 1',
      [usernameLower],
    );
    if (existing.length > 0) {
      throw new HttpError(409, 'Ez a felhasználónév már foglalt.', 'USERNAME_TAKEN');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let userId: number;
    try {
      const result = await execute(
        'INSERT INTO users (username, username_lower, password_hash) VALUES (?, ?, ?)',
        [username, usernameLower, passwordHash],
      );
      userId = result.insertId;
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        throw new HttpError(409, 'Ez a felhasználónév már foglalt.', 'USERNAME_TAKEN');
      }
      throw error;
    }

    const user = { id: userId, username };
    setSessionCookie(res, signSession(user));
    res.status(201).json({ user });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const rawUsername = (req.body as { username?: unknown } | undefined)?.username;
    const rawPassword = (req.body as { password?: unknown } | undefined)?.password;
    if (typeof rawUsername !== 'string' || typeof rawPassword !== 'string') {
      throw new HttpError(400, 'Add meg a felhasználónevet és a jelszót.');
    }

    const username = rawUsername.trim();
    const password = rawPassword;
    const rows = await queryRows<UserRow>(
      'SELECT id, username, password_hash, created_at FROM users WHERE username_lower = ? LIMIT 1',
      [username.toLowerCase()],
    );
    const row = rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      throw new HttpError(401, 'Hibás felhasználónév vagy jelszó.', 'INVALID_CREDENTIALS');
    }

    const user = { id: row.id, username: row.username };
    setSessionCookie(res, signSession(user));
    res.json({ user: { ...user, createdAt: row.created_at } });
  }),
);

authRouter.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await queryRows<UserRow>(
      'SELECT id, username, created_at FROM users WHERE id = ? LIMIT 1',
      [user.id],
    );
    const row = rows[0];
    if (!row) {
      clearSessionCookie(res);
      throw new HttpError(401, 'A felhasználó már nem létezik.', 'UNAUTHENTICATED');
    }
    res.json({ user: { id: row.id, username: row.username, createdAt: row.created_at } });
  }),
);
