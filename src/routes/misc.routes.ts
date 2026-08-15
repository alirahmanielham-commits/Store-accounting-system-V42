
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
router.post('/api/generate_demo_data', async (req, res) => {
    res.json({ success: true, message: 'Demo data generation not available in this environment.' });
  });

router.post('/api/persons/check-duplicates', async (req, res) => {
    try {
       const { name, nationalId, phone, taxNumber, registrationNumber, companyName } = req.body;
       const persons = await getDbData('persons') || [];
       
       const duplicates = persons.filter((p) => {
           let score = 0;
           if (nationalId && p.nationalId && p.nationalId === nationalId) score += 100;
           if (taxNumber && p.taxNumber && p.taxNumber === taxNumber) score += 100;
           if (registrationNumber && p.registrationNumber && p.registrationNumber === registrationNumber) score += 100;
           
           if (phone && p.phone) {
               // strip non-digits
               const ph1 = String(phone).replace(/\D/g, '');
               const ph2 = String(p.phone).replace(/\D/g, '');
               if (ph1 && ph1 === ph2) score += 80;
           }
           
           if (name && p.name && typeof p.name === 'string') {
               if (p.name.includes(name) || name.includes(p.name)) score += 50;
           }
           
           if (companyName && p.companyName && typeof p.companyName === 'string') {
               if (p.companyName.includes(companyName) || companyName.includes(p.companyName)) score += 60;
           }

           return score >= 50;
       });

       res.json({ success: true, duplicates: duplicates.slice(0, 5) });
    } catch (err) {
       console.error(err);
       res.status(500).json({ error: err.message });
    }
  });

router.post('/api/search-products', async (req, res) => {
    const { query, category } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }
  
    try {
      const prompt = `Generate a realistic list of 10 fake products related to "${query}"${category ? ` in the category of "${category}"` : ''}. Focus on Persian product names. Return purely a JSON array of objects with keys "name", "description", and "priceStr". No markdown formatting, no backticks, just raw JSON.`;
      
      const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const text = await response.text();
      let cleanText = text;
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        cleanText = match[0];
      } else {
        cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      
      const products = JSON.parse(cleanText || "[]");
      
      res.json({ products });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


export default router;
