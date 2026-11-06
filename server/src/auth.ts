import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { config } from './config.js';
import { HttpError } from './http.js';

export interface AuthUser {
  id: number;
  username: string;
}

export function signSession(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, username: user.username },
    config.jwtSecret,
    { expiresIn: `${config.sessionDays}d` },
  );
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(config.cookieName, token, cookieOptions());
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.cookieName, { ...cookieOptions(), maxAge: undefined });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = req.cookies?.[config.cookieName];
  if (!token || typeof token !== 'string') {
    next(new HttpError(401, 'Jelentkezz be a folytatáshoz.', 'UNAUTHENTICATED'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0 || typeof payload.username !== 'string') {
      throw new Error('invalid payload');
    }
    req.user = { id, username: payload.username };
    next();
  } catch {
    clearSessionCookie(res);
    next(new HttpError(401, 'A munkamenet lejárt. Jelentkezz be újra.', 'UNAUTHENTICATED'));
  }
};

export function currentUser(req: Request): AuthUser {
  if (!req.user) {
    throw new HttpError(401, 'Jelentkezz be a folytatáshoz.', 'UNAUTHENTICATED');
  }
  return req.user;
}
