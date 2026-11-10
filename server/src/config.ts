import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET?.trim();

if (isProduction && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error(
    'Éles módban kötelező legalább 32 karakteres JWT_SECRET beállítása a server/.env fájlban.',
  );
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`A(z) ${name} környezeti változó nem szám: ${raw}`);
  }
  return parsed;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: numberFromEnv('PORT', 3000),
  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: numberFromEnv('DB_PORT', 3306),
    user: process.env.DB_USER ?? 'minescript',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'minescript',
    ssl: process.env.DB_SSL === 'true',
    /** Egyidejű MySQL kapcsolatok felső korlátja. */
    poolSize: Math.max(2, Math.min(50, numberFromEnv('DB_POOL_SIZE', 10))),
  },
  jwtSecret:
    jwtSecret ??
    'fejlesztoi-titok-csak-helyi-fejleszteshez-1234567890-ne-használd-élesben',
  sessionDays: numberFromEnv('SESSION_DAYS', 7),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieName: 'minescript_session',
  /** Apache/Nginx reverse proxy mögött 1, közvetlen kiszolgálásnál 0. */
  trustProxy: numberFromEnv('TRUST_PROXY', isProduction ? 1 : 0),
} as const;

export type AppConfig = typeof config;
