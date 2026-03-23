import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { PermissionLevel, Role } from '../../../shared/types.js';

export interface AuthUser {
  id: string;
  larkUserId: string;
  name: string;
  role: Role;
  permissions: PermissionLevel;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '缺少认证令牌' } });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: '令牌无效或已过期' } });
  }
}

/** 可选认证：有 token 则解析，无 token 不拦截（用于搜索日志记录） */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
    } catch {
      // ignore invalid token
    }
  }
  next();
}
