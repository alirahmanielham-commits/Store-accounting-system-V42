import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let db: any;
try {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db",
  });
  db = drizzle(pool, { schema });
} catch {
  console.warn('[AI Studio] Database not connected — using mock');
  const noOp = { 
    findMany: async () => [], 
    findFirst: async () => null,
    findUnique: async () => null, 
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {}, 
    delete: async () => ({}) 
  };
  db = new Proxy({}, {
    get: (_, prop) => prop === 'query'
      ? new Proxy({}, { get: () => noOp }) : async () => [],
  });
}

export { db };
