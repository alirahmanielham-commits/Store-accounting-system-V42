import express from 'express';
import cookieParser from 'cookie-parser';
import { storeContextMiddleware } from '../src/middleware/store-context.middleware';
import { authMiddleware } from '../src/middleware/auth.middleware';
import authRoutes from '../src/routes/auth.routes';
import backupRoutes from '../src/routes/backup.routes';
import dataRoutes from '../src/routes/data.routes';

export function createTestApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use(storeContextMiddleware);
  app.use(authMiddleware);

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      version: '1.0.0'
    });
  });

  app.use(authRoutes);
  app.use(backupRoutes);
  app.use(dataRoutes);

  return app;
}
