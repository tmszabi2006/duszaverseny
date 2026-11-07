import compression from 'compression';
import cookieParser from 'cookie-parser';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import { config } from './config.js';
import { closePool, queryRows } from './db.js';
import { HttpError, asyncHandler } from './http.js';
import { authRouter } from './routes/auth.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { mapsRouter } from './routes/maps.js';
import { runsRouter } from './routes/runs.js';
import type { RowDataPacket } from 'mysql2';

const app = express();
app.disable('x-powered-by');

if (config.trustProxy > 0) {
  app.set('trust proxy', config.trustProxy);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// A tömörítés a JSON API és a statikus szöveges erőforrások méretét csökkenti.
app.use(
  compression({
    threshold: 1024,
    // A gyorsítótárazott, már tömörített válaszokat nem tömörítjük újra.
    filter: (req, res) => {
      if (res.getHeader('Content-Encoding')) return false;
      return compression.filter(req, res);
    },
  }),
);

app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());

// Az API válaszai mindig friss adatot mutassanak, ne a böngésző gyorsítótárát.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    await queryRows<RowDataPacket>('SELECT 1 AS ok');
    res.json({ ok: true, service: 'minescript', time: new Date().toISOString() });
  }),
);

app.use('/api/auth', authRouter);
app.use('/api/maps', mapsRouter);
app.use('/api/maps', leaderboardRouter);
app.use('/api/runs', runsRouter);

// Ismeretlen API-végpont: mindig JSON válasz, soha nem az SPA.
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Az API végpont nem található.', code: 'NOT_FOUND' });
});

const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
const clientIndex = path.join(clientDist, 'index.html');

if (fs.existsSync(clientIndex)) {
  app.use(
    express.static(clientDist, {
      index: false,
      maxAge: config.isProduction ? '1y' : 0,
      immutable: config.isProduction,
      setHeaders(res, filePath) {
        const normalized = filePath.replace(/\\/g, '/');

        if (normalized.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
          return;
        }

        // Csak a Vite által hash-elt build-eszközök kapnak hosszú, változatlan
        // gyorsítótárazást. A többi fájl (pl. favicon) rövidebb élettartamú.
        if (!normalized.includes('/assets/')) {
          res.setHeader(
            'Cache-Control',
            config.isProduction ? 'public, max-age=3600' : 'no-cache',
          );
        }
      },
    }),
  );

  // Single Page Application: minden nem API útvonal az index.html-t kapja.
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(clientIndex);
  });
} else {
  app.get('/', (_req, res) => {
    res
      .status(503)
      .type('text/plain; charset=utf-8')
      .send(
        'A kliens még nem készült el. Fejlesztéshez használd a Vite fejlesztői szervert (npm run dev), éles üzemhez pedig futtasd az npm run build parancsot.',
      );
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      type?: string;
      status?: number;
      statusCode?: number;
      message?: string;
    };
    if (candidate.type === 'entity.parse.failed') {
      res.status(400).json({ message: 'A kérés törzse érvényes JSON kell legyen.' });
      return;
    }
    if (candidate.type === 'entity.too.large') {
      res.status(413).json({ message: 'A kérés törzse túl nagy.' });
      return;
    }
    if (typeof candidate.status === 'number' && candidate.status >= 400 && candidate.status < 500) {
      res.status(candidate.status).json({ message: candidate.message ?? 'Hibás kérés.' });
      return;
    }
  }

  console.error('Nem várt szerverhiba:', error);
  res.status(500).json({
    message: 'Váratlan szerverhiba történt. Próbáld újra később.',
    code: 'INTERNAL_ERROR',
  });
});

const server = app.listen(config.port, () => {
  console.log(`MineScript szerver fut: http://127.0.0.1:${config.port} (${config.nodeEnv})`);
});

// Reverse proxy mögött a hosszabb keep-alive csökkenti az új kapcsolatok számát.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} jelzés: a szerver leállítása...`);

  server.close(() => {
    closePool()
      .catch((error) => console.error('A MySQL kapcsolódoboz lezárása nem sikerült:', error))
      .finally(() => process.exit(0));
  });

  setTimeout(() => {
    console.error('A szerver nem állt le időben, kényszerített kilépés.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
