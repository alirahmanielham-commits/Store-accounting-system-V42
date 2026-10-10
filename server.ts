import os from "os";
import 'dotenv/config';
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

import { initDB } from './src/db/migration';
import { startCronJobs } from './src/jobs/checkNotificationsJob';
import { authMiddleware } from './src/middleware/auth.middleware';
import { storeContextMiddleware } from './src/middleware/store-context.middleware';
import { startSyncWorker } from './src/worker/sync-worker';

import authRoutes from './src/routes/auth.routes';
import setupRoutes from './src/routes/setup.routes';
import databaseRoutes from './src/routes/database.routes';
import dataRoutes from './src/routes/data.routes';
import backupRoutes from './src/routes/backup.routes';
import migrationRoutes from './src/routes/migration.routes';
import reportsRoutes from './src/routes/reports.routes';
import systemRoutes from './src/routes/system.routes';
import miscRoutes from './src/routes/misc.routes';

if (process.env.SENTRY_DSN && String(process.env.SENTRY_DSN).startsWith('http')) {
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [
        nodeProfilingIntegration(),
      ],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });
  } catch (e) {
    console.error("Failed to initialize Sentry on backend:", e);
  }
}

async function startServer() {
  try {
    startCronJobs();
  } catch (e) {
    console.warn("Cron jobs start warning:", e);
  }
  try {
    await initDB();
  } catch (e) {
    console.warn("initDB warning (using local database):", e);
  }
  const app = express();
  const PORT = 3000;

  // Trust Cloud Run / Reverse Proxy headers (X-Forwarded-For, Forwarded)
  app.set('trust proxy', 1);

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  
  // 1. CORS Configuration
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-store-id', 'x-custom-origin']
  }));

  // 2. Helmet Web Security Headers (customized for AI Studio iframe & Vite SPA)
  app.use(helmet({
    contentSecurityPolicy: false,
    frameguard: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // 3. Rate Limiting to prevent brute-force and DoS
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false
    },
    message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه دیگر دوباره امتحان کنید.' },
    skip: (req) => req.path === '/api/health' || !req.path.startsWith('/api/')
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
      xForwardedForHeader: false,
      forwardedHeader: false
    },
    message: { error: 'تعداد دفعات تلاش برای ورود بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر دوباره تلاش فرمایید.' }
  });

  app.use('/api/', generalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/verify-otp', authLimiter);

  // 4. HTTP Response Compression (gzip / deflate)
  app.use(compression({
    level: 6,
    threshold: 1024, // only compress responses > 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.text({ limit: '500mb', type: ['text/*', 'application/sql', 'application/json'] }));
  app.use(cookieParser());

  app.get('/favicon.ico', (req, res) => {
    const iconPath = path.join(process.cwd(), 'public', 'favicon.svg');
    if (fs.existsSync(iconPath)) {
      res.type('image/svg+xml').sendFile(iconPath);
    } else {
      res.status(204).end();
    }
  });

  app.use(authMiddleware);
  app.use(storeContextMiddleware);

  app.use(authRoutes);
  app.use(setupRoutes);
  app.use(databaseRoutes);
  app.use(dataRoutes);
  app.use(backupRoutes);
  app.use(migrationRoutes);
  app.use(reportsRoutes);
  app.use(systemRoutes);
  app.use(miscRoutes);

  if (process.env.SENTRY_DSN && String(process.env.SENTRY_DSN).startsWith('http')) {
    Sentry.setupExpressErrorHandler(app);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/server_logs.txt',
            '**/server_logs*',
            '**/*.log',
            '**/*.txt',
            '**/logs/**',
            '**/.logs/**',
            '**/data.json',
            '**/database.json',
            '**/db_config.json',
            '**/*.sqlite*',
            '**/*.db*',
            '**/backups/**',
            '**/my_backups/**',
            '**/tmp/**',
            '**/temp/**',
            '**/*.tmp',
            '**/*.bak'
          ]
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
startSyncWorker();
