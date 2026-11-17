import { describe, test, expect, afterEach } from 'vitest';
import http from 'http';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createTestApp } from '../createTestApp';

function openSseClient(
  baseUrl: string,
  storeId: string,
  clientId: string
): Promise<{
  close: () => void;
  events: Array<{ event: string; data: any }>;
  waitForEvent: (predicate: (ev: { event: string; data: any }) => boolean, timeoutMs?: number) => Promise<{ event: string; data: any }>;
}> {
  return new Promise((resolve, reject) => {
    const events: Array<{ event: string; data: any }> = [];
    const waiters: Array<{
      predicate: (ev: { event: string; data: any }) => boolean;
      resolve: (ev: { event: string; data: any }) => void;
    }> = [];

    const req = http.get(
      `${baseUrl}/api/events?storeId=${encodeURIComponent(storeId)}&clientId=${encodeURIComponent(clientId)}`,
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Unexpected SSE status: ${res.statusCode}`));
          return;
        }
        const contentType = res.headers['content-type'] || '';
        if (!contentType.includes('text/event-stream')) {
          reject(new Error(`Expected text/event-stream, got ${contentType}`));
          return;
        }

        let buffer = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          buffer += chunk;
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';
          for (const block of blocks) {
            if (!block.trim() || block.trim().startsWith(':')) continue;
            let eventName = 'message';
            const dataLines: string[] = [];
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trim());
              }
            }
            const rawData = dataLines.join('\n');
            let parsedData: any = rawData;
            try {
              parsedData = JSON.parse(rawData);
            } catch (_) {}

            const ev = { event: eventName, data: parsedData };
            events.push(ev);
            for (let i = waiters.length - 1; i >= 0; i--) {
              if (waiters[i].predicate(ev)) {
                const matched = waiters.splice(i, 1)[0];
                matched.resolve(ev);
              }
            }
          }
        });

        resolve({
          events,
          close: () => {
            res.destroy();
            req.destroy();
          },
          waitForEvent: (predicate, timeoutMs = 3000) => {
            const existing = events.find(predicate);
            if (existing) return Promise.resolve(existing);
            return new Promise((resWait, rejWait) => {
              const timer = setTimeout(() => {
                rejWait(new Error('Timed out waiting for SSE event'));
              }, timeoutMs);
              waiters.push({
                predicate,
                resolve: (ev) => {
                  clearTimeout(timer);
                  resWait(ev);
                },
              });
            });
          },
        });
      }
    );

    req.on('error', reject);
  });
}

describe('Integration — Real-Time SSE Sync & Unpaginated Invoice Hydration', () => {
  const app = createTestApp();
  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
  const token = jwt.sign(
    { id: 'admin-rt', username: 'admin', role: 'admin', name: 'مدیر تست' },
    JWT_SECRET
  );

  let server: http.Server | null = null;
  const openClosers: Array<() => void> = [];

  afterEach(async () => {
    while (openClosers.length > 0) {
      const close = openClosers.pop();
      try {
        close?.();
      } catch (_) {}
    }
    if (server) {
      await new Promise<void>((res) => server!.close(() => res()));
      server = null;
    }
  });

  test('SSE /api/events connects and broadcasts append & batch updates across clients while skipping echo', async () => {
    server = http.createServer(app);
    await new Promise<void>((res) => server!.listen(0, '127.0.0.1', () => res()));
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const clientA = await openSseClient(baseUrl, 'default', 'client-alpha');
    const clientB = await openSseClient(baseUrl, 'default', 'client-beta');
    const clientOtherStore = await openSseClient(baseUrl, 'other_store_xyz', 'client-gamma');
    openClosers.push(clientA.close, clientB.close, clientOtherStore.close);

    // Wait for initial connected handshake on clientB
    const connEv = await clientB.waitForEvent((e) => e.event === 'connected');
    expect(connEv.data.clientId).toBe('client-beta');
    expect(connEv.data.storeId).toBe('default');

    // Client A appends a receipt
    const receiptRes = await request(app)
      .post('/api/data/receipt_transactions/append')
      .set('Authorization', `Bearer ${token}`)
      .set('x-client-session-id', 'client-alpha')
      .send({
        id: 'tx-sse-rec-1',
        type: 'receive',
        personId: 'person-sse-1',
        amount: 750000,
        description: 'دریافت وجه آنی'
      });

    expect(receiptRes.status).toBe(200);

    // Client B should immediately receive the SSE sync event
    const syncEv = await clientB.waitForEvent(
      (e) => e.event === 'sync' && e.data?.table === 'receipt_transactions' && e.data?.entityId === 'tx-sse-rec-1'
    );
    expect(syncEv.data.action).toBe('create');
    expect(syncEv.data.data.amount).toBe(750000);

    // Client A (sender) must NOT receive an echo of its own mutation
    await new Promise((r) => setTimeout(r, 80));
    const echoedToA = clientA.events.some(
      (e) => e.event === 'sync' && e.data?.entityId === 'tx-sse-rec-1'
    );
    expect(echoedToA).toBe(false);

    // Client in another store must NOT receive events from 'default'
    const leakedToOtherStore = clientOtherStore.events.some(
      (e) => e.event === 'sync' && e.data?.entityId === 'tx-sse-rec-1'
    );
    expect(leakedToOtherStore).toBe(false);

    // Batch operation broadcast check (receipt + accounting document)
    const batchRes = await request(app)
      .post('/api/data/batch')
      .set('Authorization', `Bearer ${token}`)
      .set('x-client-session-id', 'client-alpha')
      .send({
        operations: [
          {
            type: 'append',
            key: 'receipt_transactions',
            data: { id: 'tx-sse-batch-2', type: 'receive', amount: 300000, personId: 'person-sse-1' }
          },
          {
            type: 'append',
            key: 'accounting_documents',
            data: { id: 'doc-sse-batch-2', sourceId: 'tx-sse-batch-2', sourceType: 'receipt', description: 'سند خودکار' }
          }
        ]
      });

    expect(batchRes.status).toBe(200);
    const batchTxEv = await clientB.waitForEvent(
      (e) => e.event === 'sync' && e.data?.table === 'receipt_transactions' && e.data?.entityId === 'tx-sse-batch-2'
    );
    const batchDocEv = await clientB.waitForEvent(
      (e) => e.event === 'sync' && e.data?.table === 'accounting_documents' && e.data?.entityId === 'doc-sse-batch-2'
    );
    expect(batchTxEv.data.action).toBe('create');
    expect(batchDocEv.data.action).toBe('create');
  });

  test('GET /api/data/invoices without pagination returns ALL invoices (> 20) with hydrated items for PersonLedger', async () => {
    for (let i = 1; i <= 23; i++) {
      await request(app)
        .post('/api/data/invoices/append')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: `inv-ledger-all-${i}`,
          type: 'sale',
          invoiceNumber: `L-${1000 + i}`,
          customerId: 'person-ledger-check',
          date: '1403/09/01',
          totalAmount: 100000 * i,
          items: [
            {
              id: `item-l-${i}`,
              productId: `prod-l-${i}`,
              productName: `کالای تست ${i}`,
              quantity: 2,
              unitPrice: 50000 * i,
              totalPrice: 100000 * i,
            }
          ]
        });
    }

    const resAll = await request(app)
      .get('/api/data/invoices')
      .set('Authorization', `Bearer ${token}`);

    expect(resAll.status).toBe(200);
    expect(Array.isArray(resAll.body)).toBe(true);
    expect(resAll.body.length).toBeGreaterThanOrEqual(23);

    const oldestInv = resAll.body.find((inv: any) => inv.id === 'inv-ledger-all-1');
    expect(oldestInv).toBeDefined();
    expect(Array.isArray(oldestInv.items)).toBe(true);
    expect(oldestInv.items.length).toBe(1);
    expect(oldestInv.items[0].productName).toBe('کالای تست 1');
  });
});
