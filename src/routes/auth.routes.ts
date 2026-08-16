
import { usePgMap, activePgPools, storeContext, SQLITE_FILE, connectPgDb, getDb, getActivePgPool, isPgActive, DB_CONFIG_FILE, dbs, DATA_FILE } from '../db/connection';
import { KNOWN_TABLES, tableSchemas, syncTableSchema, ensurePostgresTables } from '../db/schema-sync';
import { getDbData, setDbData, getAllDbData, innerGetDbData, innerSetDbData, handleRelations } from '../db/kv-store';
import { migrateSqliteToPostgres } from '../db/migration';
const loginSchema = z.object({ username: z.string().min(3), password: z.string().min(1) });
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
import { eq, isNull, sql, desc, asc, inArray, and } from 'drizzle-orm';
import { db } from '../db';
import { checkbooks, issuedChecks, receivedChecks, checkAuditLogs, notifications, accounts, cashboxes } from '../db/schema';
import * as schema from '../db/schema';

const router = Router();


  // === AUTHENTICATION & USERS === //
  // const JWT_SECRET = ...
  // const JWT_REFRESH_SECRET = ...

  const getUsers = async () => {
    let users = (await getDbData('users')) || [];
    if (!Array.isArray(users) || users.length === 0) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      const defaultAdmin = {
        id: 'admin-default',
        username: 'admin',
        password: hashedPassword,
        name: 'مدیر سیستم',
        role: 'admin',
        personId: null,
        profileLinkedAt: null,
        isProfileRequired: true,
        isActive: true,
        createdAt: Date.now()
      };
      users = [defaultAdmin];
      await setDbData('users', users);
    }
    return users;
  };

  const saveUsers = async (users) => {
    await setDbData('users', users);
  };
  
  // Custom users endpoint intercepting password saves
function finalizeLogin(res: any, user: any) {
     const tokenVersion = user.tokenVersion || 1;
     const accessToken = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
     const refreshToken = jwt.sign({ username: user.username, tokenVersion }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
     
     res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/refresh' });
     
     const userWithoutPwd = { ...user };
     delete userWithoutPwd.password;
     delete userWithoutPwd.currentOTP;
     res.json({ accessToken, user: userWithoutPwd });
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-2024';

router.post('/api/auth/login', async (req, res) => {
    try {
      console.log('Login attempt body:', req.body); loginSchema.parse(req.body);
    } catch (e) {
      return res.status(400).json({ error: 'داده‌های ورودی نامعتبر است', details: e.errors, message: e.message, name: e.name });
    }

    const { username, password } = req.body;
    const users = await getUsers();
    
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    if (!user.isActive) return res.status(403).json({ error: 'حساب کاربری غیرفعال است.' });
    
    let isMatch = false;
    if (user.password.startsWith('$2b$')) {
       isMatch = await bcrypt.compare(password, user.password);
    } else {
       isMatch = (password === user.password);
       if (isMatch) {
          user.password = await bcrypt.hash(password, 10);
          await saveUsers(users);
       }
    }
    
    if (!isMatch) return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    
    if (user.requires2FA) {
       const otp = Math.floor(100000 + Math.random() * 900000).toString();
       user.currentOTP = { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 };
       await saveUsers(users);
       console.log('OTP for ' + username + ' is: ' + otp);
       
       const tempToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '5m' });
       return res.json({ requireOTP: true, tempToken, message: 'کد تایید ورود جهت تست (در کنسول هم چاپ شد): ' + otp }); 
    } else {
       return finalizeLogin(res, user);
    }
  });

router.post('/api/auth/verify-otp', async (req, res) => {
    const { tempToken, otp } = req.body;
    try {
      const decoded = jwt.verify(tempToken || '', process.env.JWT_SECRET || 'default_secret') as any;
      const users = await getUsers();
      const user = users.find(u => u.username === (decoded as any).username);
      
      if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
      if (!user.currentOTP || user.currentOTP.code !== otp || user.currentOTP.expiresAt < Date.now()) {
         return res.status(401).json({ error: 'کد ورود نامعتبر است یا منقضی شده است' });
      }
      
      delete user.currentOTP;
      await saveUsers(users);
      
      return finalizeLogin(res, user);
    } catch(err) {
      return res.status(401).json({ error: 'توکن نامعتبر است' });
    }
  });

router.post('/api/auth/refresh', async (req, res) => {
     const token = req.cookies.refreshToken;
     if (!token) return res.status(401).json({ error: 'نیازمند ورود مجدد' });
     
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as any;
       const users = await getUsers();
       const user = users.find(u => u.username === (decoded as any).username);
       if (!user || user.tokenVersion !== (decoded as any).tokenVersion) {
         return res.status(401).json({ error: 'توکن نامعتبر است' });
       }
       
       const accessToken = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
       res.json({ accessToken });
     } catch(e) {
       res.status(401).json({ error: 'توکن نامعتبر است' });
     }
  });

router.post('/api/auth/logout', (req, res) => {
      res.clearCookie('refreshToken');
      res.json({ success: true });
  });


export default router;
