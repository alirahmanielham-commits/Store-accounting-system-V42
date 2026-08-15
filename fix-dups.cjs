const fs = require('fs');

const files = fs.readdirSync('src/routes');
for (const file of files) {
  if (file.endsWith('.ts')) {
    let content = fs.readFileSync('src/routes/' + file, 'utf8');
    // Remove the whole block that I added from extract_routes.cjs
    const blockToRemove = `import { Router } from 'express';
import fsPromises from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { exec } from 'child_process';
import { validateData } from '../schemas/validation';
import { getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';
import { KNOWN_TABLES, tableSchemas } from '../db/schema-sync';
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';`;

    // Only keep the imports I just added recently + Router + what's needed from drizzle
    // It's easier to just remove duplicate lines from the top of the file
    let lines = content.split('\n');
    let seenImports = new Set();
    let newLines = [];
    for(let i=0; i<lines.length; i++) {
       let line = lines[i];
       if(line.startsWith('import ')) {
           if(seenImports.has(line)) {
               continue;
           }
           seenImports.add(line);
       }
       newLines.push(line);
    }
    
    // Also fix loginSchema import
    newLines = newLines.map(l => l.replace('import { loginSchema } from', '// import { loginSchema } from'));
    
    fs.writeFileSync('src/routes/' + file, newLines.join('\n'));
  }
}
