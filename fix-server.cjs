const fs = require('fs');

const serverCode = `import os from "os";
import 'dotenv/config';
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';

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
  startCronJobs();
  await initDB();
  const app = express();
  const PORT = 3000;
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  
  app.use(express.json({ limit: '50mb' }));
  app.use(express.text({ limit: '500mb', type: ['text/*', 'application/sql', 'application/json'] }));
  app.use(cookieParser());

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
      server: { middlewareMode: true },
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
    console.log(\`Server running on port \${PORT}\`);
  });
}

startServer();
startSyncWorker();
`;
fs.writeFileSync('server.ts', serverCode);
