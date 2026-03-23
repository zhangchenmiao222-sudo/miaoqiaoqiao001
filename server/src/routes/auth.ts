/**
 * 飞书 OAuth 认证路由
 * POST /api/auth/login  — 用飞书授权码换取 JWT
 * GET  /api/auth/me     — 获取当前登录用户信息
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getUserAccessToken, getUserInfo, getDepartmentName } from '../services/lark.js';
import { matchRoleByDepartment, getPermissionLevel } from '../services/role-matcher.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/**
 * POST /api/auth/login
 * Body: { code: string }
 * 用飞书 OAuth 授权码换取用户信息，签发 JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        error: { code: 'MISSING_CODE', message: '缺少授权码 code' },
      });
    }

    // 1. 用 code 换取 user_access_token
    const tokenData = await getUserAccessToken(code);

    // 2. 获取用户详细信息（含部门 ID）
    const userInfo = await getUserInfo(tokenData.access_token);

    // 3. 获取部门名称
    let departmentName = '未知部门';
    if (userInfo.department_ids?.length > 0) {
      departmentName = await getDepartmentName(userInfo.department_ids[0]);
    }

    // 4. 根据部门匹配角色
    const role = matchRoleByDepartment(departmentName);
    const permissions = getPermissionLevel(role);

    // 5. 构建用户对象
    const user = {
      id: userInfo.open_id,
      larkUserId: userInfo.user_id || userInfo.open_id,
      name: tokenData.name || userInfo.name,
      avatar: tokenData.avatar_url || userInfo.avatar_url,
      role,
      department: departmentName,
      permissions,
    };

    // 6. 签发 JWT（有效期 7 天）
    const token = jwt.sign(
      { userId: user.id, role: user.role, permissions: user.permissions },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({ user, token });
  } catch (err) {
    console.error('飞书登录失败:', err);
    res.status(500).json({
      error: { code: 'AUTH_FAILED', message: err instanceof Error ? err.message : '登录失败' },
    });
  }
});

/**
 * GET /api/auth/me
 * 获取当前登录用户信息（需 JWT）
 */
router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  res.json({
    userId: req.userId,
    role: req.userRole,
  });
});

export default router;
