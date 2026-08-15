
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';
// import { loginSchema } from '../schemas/validation';
import { DatabaseSync } from 'node:sqlite';
import { Client, Pool } from 'pg';
import os from 'os';

import { Router } from 'express';
import fsPromises from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { exec } from 'child_process';
import { validateData } from '../schemas/validation';
import { getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData } from '../db/kv-store';
import { KNOWN_TABLES, tableSchemas } from '../db/schema-sync';
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';

const router = Router();
router.get('/api/setup/status', async (req, res) => {
    try {
       let configExists = false;
       try {
           await fsPromises.access(DB_CONFIG_FILE);
           configExists = true;
       } catch(e) { }
       
       const usingEnvVars = !!(process.env.SQL_HOST || process.env.DATABASE_URL);
       
       const users = await getDbData('users') || [];
       const adminConfigured = users.length > 0;
       
       const profile = await getDbData('company_profile') || null;
       const companyConfigured = !!(profile && profile.companyName);
       
       const dbConfigured = configExists || usingEnvVars || (adminConfigured && companyConfigured);
       
       res.json({ 
         dbConfigured, 
         usingEnvVars,
         adminConfigured,
         companyConfigured,
         isComplete: dbConfigured && adminConfigured,
         companyProfile: profile,
         adminUser: users.length > 0 ? { username: users[0].username } : null
       });
    } catch(e) {
       res.status(500).json({ error: e.message });
    }
  });

router.get('/api/system/info', (req, res) => {
    
    res.json({
      platform: os.platform(),
      arch: os.arch(),
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      nodeVersion: process.version
    });
  });

router.post('/api/setup/admin', async (req, res) => {
    try {
      const { username, password } = req.body;
      const users = await getDbData('users') || [];
      const hashed = await bcrypt.hash(password, 10);
      
      const adminIndex = users.findIndex((u: any) => u.role === 'admin' || u.username === username);
      if (adminIndex !== -1) {
        users[adminIndex].username = username;
        users[adminIndex].password = hashed;
        await setDbData('users', users);
      } else {
        const adminUser = {
          id: Math.random().toString(36).substring(2, 15),
          username,
          password: hashed,
          role: 'admin',
          createdAt: new Date().toISOString(),
          firstName: 'مدیر',
          lastName: 'سیستم',
          isActive: true
        };
        users.push(adminUser);
        await setDbData('users', users);
      }
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

router.post('/api/setup/company', async (req, res) => {
    try {
      const profileData = req.body;
      const existing = await getDbData('company_profile') || {};
      const updatedProfile = { ...existing, ...profileData };
      await setDbData('company_profile', updatedProfile);
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });


export default router;
