import type { Request, Response, NextFunction } from 'express';
import type { PermissionLevel, Role } from '../../../shared/types.js';

/** 角色 → 权限等级映射 */
const ROLE_PERMISSIONS: Record<Role, PermissionLevel> = {
  manager:         'manage',
  lab_tester:      'edit',
  warehouse:       'edit',
  qc:              'edit',
  kennel:          'edit',
  admin_logistics: 'edit',
  engineer:        'edit',
  trainee:         'view',
};

const LEVEL_RANK: Record<PermissionLevel, number> = {
  view:   1,
  edit:   2,
  manage: 3,
};

/**
 * 权限中间件工厂
 * 用法：router.delete('/:id', authenticate, requirePermission('manage'), handler)
 */
export function requirePermission(required: PermissionLevel) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '请先登录' } });
      return;
    }

    const userLevel = LEVEL_RANK[ROLE_PERMISSIONS[user.role] ?? 'view'];
    const requiredLevel = LEVEL_RANK[required];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `需要 ${required} 权限，您当前权限不足`,
        },
      });
      return;
    }

    // 将解析后的权限等级写入 user，方便下游使用
    user.permissions = ROLE_PERMISSIONS[user.role];
    next();
  };
}

export { ROLE_PERMISSIONS };
