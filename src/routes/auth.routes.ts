
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
  
  async function logAuthToServer(action: string, user: any, req: any, details?: string) {
    try {
      const sysLogs = (await getDbData('system_logs')) || [];
      const ua = (req.headers && req.headers['user-agent']) || '';
      const ip = (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || req.socket?.remoteAddress || req.ip || '127.0.0.1';
      const cleanIp = Array.isArray(ip) ? ip[0] : String(ip).split(',')[0].trim();
      
      let browser = 'مرورگر وب';
      let os = 'نامشخص';
      let device = 'رایانه (Desktop)';
      if (/mobile/i.test(ua)) device = 'تلفن همراه (Mobile)';
      else if (/tablet|ipad/i.test(ua)) device = 'تبلت (Tablet)';

      if (/windows/i.test(ua)) os = 'ویندوز';
      else if (/macintosh|mac os x/i.test(ua)) os = 'مک (macOS)';
      else if (/android/i.test(ua)) os = 'اندروید';
      else if (/iphone|ipad|ipod/i.test(ua)) os = 'آی‌او‌اس (iOS)';
      else if (/linux/i.test(ua)) os = 'لینوکس';

      if (/edg\//i.test(ua)) browser = 'مایکروسافت اج';
      else if (/opr\/|opera\//i.test(ua)) browser = 'اپرا';
      else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = 'گوگل کروم';
      else if (/firefox\//i.test(ua)) browser = 'موزیلا فایرفاکس';
      else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'سافاری اپل';

      const timestamp = Date.now();
      const log = {
        id: Math.random().toString(36).substring(2, 15),
        timestamp,
        action,
        userId: user?.id || user?.username || 'system',
        username: user?.username || 'unknown',
        userName: user?.name || user?.username || 'کاربر سیستم',
        userRole: user?.role || 'user',
        details: details || (action === 'LOGIN' ? `ورود موفق کاربر «${user?.name || user?.username}» به سیستم` : `خروج کاربر «${user?.name || user?.username}» از سیستم`),
        entityType: 'auth',
        entityId: user?.id || null,
        browser,
        os,
        device,
        ip: cleanIp,
        userAgent: ua
      };

      sysLogs.unshift(log);
      if (sysLogs.length > 3000) sysLogs.length = 3000;
      await setDbData('system_logs', sysLogs);
    } catch (e) {
      console.error('Error logging auth event:', e);
    }
  }

  // Custom users endpoint intercepting password saves
  function finalizeLogin(res: any, user: any, req?: any) {
     const tokenVersion = user.tokenVersion || 1;
     const accessToken = jwt.sign({ 
       id: user.id, 
       username: user.username, 
       name: user.name, 
       role: user.role 
     }, JWT_SECRET, { expiresIn: '15m' });
     const refreshToken = jwt.sign({ username: user.username, tokenVersion }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
     
     res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/refresh' });
     
     if (req) {
       logAuthToServer('LOGIN', user, req);
     }

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
    if (!user) {
      logAuthToServer('LOGIN_FAILED', { username }, req, `تلاش ناموفق برای ورود با نام کاربری ناموجود «${username}»`);
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    }
    if (!user.isActive) {
      logAuthToServer('LOGIN_FAILED', user, req, `تلاش برای ورود با حساب غیرفعال «${username}»`);
      return res.status(403).json({ error: 'حساب کاربری غیرفعال است.' });
    }
    
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
    
    if (!isMatch) {
      logAuthToServer('LOGIN_FAILED', user, req, `تلاش ناموفق برای ورود با رمز عبور نادرست برای «${username}»`);
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
    }
    
    if (user.requires2FA) {
       const otp = Math.floor(100000 + Math.random() * 900000).toString();
       user.currentOTP = { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 };
       await saveUsers(users);
       console.log('OTP for ' + username + ' is: ' + otp);
       
       const tempToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '5m' });
       return res.json({ requireOTP: true, tempToken, message: 'کد تایید ورود جهت تست (در کنسول هم چاپ شد): ' + otp }); 
    } else {
       return finalizeLogin(res, user, req);
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
         logAuthToServer('LOGIN_FAILED', user, req, `کد OTP نامعتبر یا منقضی برای کاربر «${user.username}»`);
         return res.status(401).json({ error: 'کد ورود نامعتبر است یا منقضی شده است' });
      }
      
      delete user.currentOTP;
      await saveUsers(users);
      
      return finalizeLogin(res, user, req);
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
       
       const accessToken = jwt.sign({ 
         id: user.id, 
         username: user.username, 
         name: user.name, 
         role: user.role 
       }, JWT_SECRET, { expiresIn: '15m' });
       res.json({ accessToken });
     } catch(e) {
       res.status(401).json({ error: 'توکن نامعتبر است' });
     }
  });

router.post('/api/auth/logout', (req, res) => {
      const authHeader = req.headers.authorization;
      let currentUser: any = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          currentUser = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'super-secret-jwt-key-2024');
        } catch (_) {}
      }
      logAuthToServer('LOGOUT', currentUser || {}, req, currentUser?.name ? `خروج کاربر «${currentUser.name}» از سیستم` : 'خروج کاربر از سیستم');
      res.clearCookie('refreshToken');
      res.json({ success: true });
  });


export default router;
