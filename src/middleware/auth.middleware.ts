import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET_MW = process.env.JWT_SECRET || 'super-secret-jwt-key-2024';
const JWT_REFRESH_MW = process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-2024';

export const authMiddleware = (req: any, res: any, next: any) => {
    const publicPaths = [
      '/api/health',
      '/api/auth/login',
      '/api/auth/verify-otp',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/setup/status',
      '/api/setup/admin',
      '/api/db/test',
      '/api/db/config'
    ];
    if (!req.path.startsWith('/api/') || publicPaths.includes(req.path)) {
       return next();
    }
    
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
       token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && (req.cookies.accessToken || req.cookies.refreshToken)) {
       token = req.cookies.accessToken || req.cookies.refreshToken;
    }
    
    if (!token) {
       return res.status(401).json({ error: 'احراز هویت الزامی است. لطفاً وارد سیستم شوید.' });
    }
    
    try {
       try {
           const decoded = jwt.verify(token, JWT_SECRET_MW);
           req.user = decoded;
       } catch (err) {
           const decoded = jwt.verify(token, JWT_REFRESH_MW);
           req.user = decoded;
       }
       next();
    } catch(e) {
       return res.status(401).json({ error: 'توکن نامعتبر یا منقضی شده است. لطفاً مجدداً وارد شوید.' });
    }
};

/**
 * RBAC middleware: ensures the authenticated user has at least one of the required roles.
 * 'admin' role always bypasses checks with full privileges.
 */
export const requireRole = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'احراز هویت الزامی است. لطفاً ابتدا وارد سیستم شوید.' });
    }
    const userRole = req.user.role || 'user';
    if (userRole === 'admin' || roles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({ 
      error: 'دسترسی غیرمجاز. شما مجوز دسترسی به این بخش یا عملیات را ندارید.',
      requiredRoles: roles,
      currentRole: userRole 
    });
  };
};

export const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'احراز هویت الزامی است. لطفاً وارد سیستم شوید.' });
  }
  next();
};

