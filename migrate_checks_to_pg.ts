import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './src/db/schema';
import fs from 'fs';

async function main() {
  const sqliteFile = process.argv[2] || 'database.sqlite';
  if (!fs.existsSync(sqliteFile)) {
    console.error(`SQLite file not found: ${sqliteFile}`);
    process.exit(1);
  }

  console.log(`Reading from SQLite database: ${sqliteFile}`);
  const sqliteDb = new DatabaseSync(sqliteFile);

  const connectionString = process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db";
  console.log(`Connecting to PostgreSQL...`);
  const pool = new Pool({ connectionString });
  const pgDb = drizzle(pool, { schema });

  const getSqliteData = (key: string) => {
    try {
      const row = sqliteDb.prepare('SELECT value FROM store WHERE key = ?').get(key) as { value: string } | undefined;
      return row ? JSON.parse(row.value) : [];
    } catch (e) {
      console.warn(`Could not read ${key} from SQLite. Error:`, e);
      return [];
    }
  };

  const checkbooks = getSqliteData('checkbooks');
  const issuedChecks = getSqliteData('issued_checks');
  const receivedChecks = getSqliteData('received_checks');

  console.log(`Found ${checkbooks.length} checkbooks, ${issuedChecks.length} issued checks, ${receivedChecks.length} received checks in SQLite.`);

  const parseDate = (d: string) => {
    if (!d) return null;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  if (checkbooks.length > 0) {
    console.log('Migrating checkbooks...');
    const values = checkbooks.map((c: any) => ({
      id: String(c.id),
      accountId: c.accountId ? String(c.accountId) : null,
      bankName: c.bankName || null,
      startNumber: c.startNumber || null,
      endNumber: c.endNumber || null,
      totalLeaves: c.totalLeaves ? parseInt(c.totalLeaves) : null,
      issuedDate: parseDate(c.issuedDate),
      createdAt: parseDate(c.createdAt) || new Date(),
      updatedAt: parseDate(c.updatedAt) || new Date(),
    }));
    await pgDb.insert(schema.checkbooks).values(values).onConflictDoNothing();
  }

  if (issuedChecks.length > 0) {
    console.log('Migrating issued_checks...');
    const values = issuedChecks.map((c: any) => ({
      id: String(c.id),
      checkbookId: c.checkbookId ? String(c.checkbookId) : null,
      checkNumber: String(c.checkNumber || c.id),
      amount: String(c.amount || 0),
      issueDate: parseDate(c.issueDate),
      dueDate: parseDate(c.dueDate),
      payeeId: c.payeeId ? String(c.payeeId) : null,
      status: c.status || 'blank',
      receiptNumber: c.receiptNumber || null,
      assignedToId: c.assignedToId ? String(c.assignedToId) : null,
      bankAccountId: c.bankAccountId ? String(c.bankAccountId) : null,
      description: c.description || null,
      imageUrl: c.imageUrl || null,
      createdAt: parseDate(c.createdAt) || new Date(),
      updatedAt: parseDate(c.updatedAt) || new Date(),
    }));
    await pgDb.insert(schema.issuedChecks).values(values).onConflictDoNothing();
  }

  if (receivedChecks.length > 0) {
    console.log('Migrating received_checks...');
    const values = receivedChecks.map((c: any) => ({
      id: String(c.id),
      checkNumber: String(c.checkNumber || c.id),
      bankName: c.bankName || null,
      branchName: c.branchName || null,
      amount: String(c.amount || 0),
      receiveDate: parseDate(c.receiveDate),
      dueDate: parseDate(c.dueDate),
      payerId: c.payerId ? String(c.payerId) : null,
      status: c.status || 'received',
      receiptNumber: c.receiptNumber || null,
      assignedToId: c.assignedToId ? String(c.assignedToId) : null,
      accountId: c.accountId ? String(c.accountId) : null,
      description: c.description || null,
      createdAt: parseDate(c.createdAt) || new Date(),
      updatedAt: parseDate(c.updatedAt) || new Date(),
    }));
    await pgDb.insert(schema.receivedChecks).values(values).onConflictDoNothing();
  }

  console.log('Migration completed successfully.');
  await pool.end();
}

main().catch(e => {
  console.error("Migration failed:", e);
  process.exit(1);
});
