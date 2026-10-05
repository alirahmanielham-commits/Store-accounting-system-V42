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
    } else if (req.cookies && req.cookies.refreshToken) {
       token = req.cookies.refreshToken;
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
