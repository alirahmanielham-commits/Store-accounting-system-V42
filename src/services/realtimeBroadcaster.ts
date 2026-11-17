import { Response } from 'express';

export interface RealtimeEvent {
  table: string;
  action: 'create' | 'update' | 'delete' | 'batch';
  data: any;
  timestamp: number;
  entityId?: string | number;
  storeId?: string;
  originClientId?: string;
}

interface ClientConnection {
  id: string;
  storeId: string;
  res: Response;
  connectedAt: number;
}

// Map of storeId -> Map<clientId, ClientConnection>
const clientsByStore = new Map<string, Map<string, ClientConnection>>();

/**
 * Register a new SSE client connection
 */
export const registerSseClient = (storeId: string, clientId: string, res: Response): void => {
  if (!clientsByStore.has(storeId)) {
    clientsByStore.set(storeId, new Map());
  }

  const storeClients = clientsByStore.get(storeId)!;
  storeClients.set(clientId, {
    id: clientId,
    storeId,
    res,
    connectedAt: Date.now()
  });

  // Send initial connected acknowledgement
  try {
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, storeId, time: Date.now() })}\n\n`);
  } catch (e) {
    console.error('Error sending SSE handshake:', e);
  }
};

/**
 * Remove an SSE client connection
 */
export const removeSseClient = (storeId: string, clientId: string): void => {
  const storeClients = clientsByStore.get(storeId);
  if (storeClients) {
    storeClients.delete(clientId);
    if (storeClients.size === 0) {
      clientsByStore.delete(storeId);
    }
  }
};

/**
 * Broadcast an event to all connected clients in a store, optionally excluding the origin client
 */
export const broadcastRealtimeEvent = (
  storeId: string,
  event: Omit<RealtimeEvent, 'timestamp'>,
  originClientId?: string
): void => {
  const fullEvent: RealtimeEvent = {
    ...event,
    storeId,
    timestamp: Date.now(),
    originClientId
  };

  const payload = `event: sync\ndata: ${JSON.stringify(fullEvent)}\n\n`;

  // 1. Send to target store clients
  const storeClients = clientsByStore.get(storeId);
  if (storeClients && storeClients.size > 0) {
    storeClients.forEach((client, clientId) => {
      if (originClientId && clientId === originClientId) {
        return; // Skip echoing to the exact initiating client
      }
      try {
        client.res.write(payload);
      } catch (err) {
        console.warn(`[realtimeBroadcaster] Failed to send to client ${clientId}:`, err);
        removeSseClient(storeId, clientId);
      }
    });
  }

  // 2. Also broadcast to default/global store clients if storeId is standard
  if (storeId !== 'default' && clientsByStore.has('default')) {
    const defaultClients = clientsByStore.get('default');
    if (defaultClients) {
      defaultClients.forEach((client, clientId) => {
        if (originClientId && clientId === originClientId) return;
        try {
          client.res.write(payload);
        } catch (err) {
          removeSseClient('default', clientId);
        }
      });
    }
  }
};

/**
 * Periodic heartbeat to prevent Cloud Run / Reverse Proxy / Browser timeouts (every 25s)
 */
setInterval(() => {
  const pingMessage = `: ping\n\n`;
  clientsByStore.forEach((storeClients, storeId) => {
    storeClients.forEach((client, clientId) => {
      try {
        client.res.write(pingMessage);
      } catch {
        removeSseClient(storeId, clientId);
      }
    });
  });
}, 25000);
