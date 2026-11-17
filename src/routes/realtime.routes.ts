import { Router, Request, Response } from 'express';
import { registerSseClient, removeSseClient, broadcastRealtimeEvent } from '../services/realtimeBroadcaster';

const router = Router();

/**
 * GET /api/events
 * Real-time Server-Sent Events stream
 */
router.get('/api/events', (req: Request, res: Response) => {
  // 1. Establish SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Flush headers immediately if available
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // 2. Identify store context and client ID
  const storeId = (req.headers['x-store-id'] as string) || (req.query.storeId as string) || (req as any).storeId || 'default';
  const clientId = (req.headers['x-client-session-id'] as string) || (req.query.clientId as string) || `client_${Math.random().toString(36).substring(2, 11)}`;

  // 3. Register client in broadcaster
  registerSseClient(storeId, clientId, res);

  // 4. Handle client disconnection
  req.on('close', () => {
    removeSseClient(storeId, clientId);
  });
});

/**
 * POST /api/events/broadcast
 * Optional endpoint for explicit/test real-time dispatch
 */
router.post('/api/events/broadcast', (req: Request, res: Response) => {
  const storeId = (req.headers['x-store-id'] as string) || (req.body.storeId as string) || 'default';
  const originClientId = req.headers['x-client-session-id'] as string | undefined;
  const { table, action, data, entityId } = req.body;

  if (!table || !action || !data) {
    return res.status(400).json({ error: 'Missing required fields: table, action, data' });
  }

  broadcastRealtimeEvent(
    storeId,
    {
      table,
      action,
      data,
      entityId: entityId || data.id
    },
    originClientId
  );

  return res.json({ success: true });
});

export default router;
