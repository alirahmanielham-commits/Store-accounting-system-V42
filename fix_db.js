import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function main() {
  const envPath = path.resolve('.env');
  let dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl && fs.existsSync(envPath)) {
     const content = fs.readFileSync(envPath, 'utf8');
     const match = content.match(/DATABASE_URL=(.*)/);
     if (match) dbUrl = match[1].trim();
  }
  
  if (!dbUrl) {
     const settingsPath = path.resolve('.data/db_config.json');
     if (fs.existsSync(settingsPath)) {
        const conf = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        dbUrl = conf.connectionString;
     }
  }

  if (!dbUrl) {
    console.log("No DB URL found.");
    return;
  }

  const pool = new Pool({ connectionString: dbUrl });
  try {
    await pool.query(`ALTER TABLE "check_history" ALTER COLUMN "createdAt" TYPE text USING "createdAt"::text;`);
    console.log("Successfully altered createdAt to text in check_history");
  } catch (e) {
    console.log("Error altering check_history:", e.message);
  }
  
  try {
     await pool.query(`ALTER TABLE "check_audit_logs" ALTER COLUMN "createdAt" TYPE text USING "createdAt"::text;`);
     console.log("Successfully altered createdAt to text in check_audit_logs");
  } catch (e) {
     console.log("Error altering check_audit_logs:", e.message);
  }
  await pool.end();
}

main();
