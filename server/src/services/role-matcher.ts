/**
 * 角色匹配服务
 * 根据用户的部门名称自动匹配系统角色
 */

import type { Role, PermissionLevel } from '../../../shared/types.js';

/** 部门关键词 → 角色映射 */
const DEPARTMENT_ROLE_MAP: Array<{ keywords: string[]; role: Role }> = [
  { keywords: ['实验', '检测', '化验'], role: 'lab_tester' },
  { keywords: ['仓储', '物料', '仓库', '库房'], role: 'warehouse' },
  { keywords: ['品控', '质检', '质量'], role: 'qc' },
  { keywords: ['犬舍', '饲养', '养殖'], role: 'kennel' },
  { keywords: ['行政', '后勤', '办公'], role: 'admin_logistics' },
  { keywords: ['工程', '设备', '维护', '维修'], role: 'engineer' },
  { keywords: ['管理', '厂长', '总经理', '副总'], role: 'manager' },
  { keywords: ['培训', '新员工', '实习'], role: 'trainee' },
];

/** 角色 → 权限等级 */
const ROLE_PERMISSION_MAP: Record<Role, PermissionLevel> = {
  lab_tester: 'edit',
  warehouse: 'edit',
  qc: 'edit',
  kennel: 'edit',
  admin_logistics: 'edit',
  engineer: 'edit',
  manager: 'manage',
  trainee: 'view',
};

/** 根据部门名称匹配角色 */
export function matchRoleByDepartment(departmentName: string): Role {
  for (const mapping of DEPARTMENT_ROLE_MAP) {
    if (mapping.keywords.some((kw) => departmentName.includes(kw))) {
      return mapping.role;
    }
  }
  // 默认角色：新员工（最低权限）
  return 'trainee';
}

/** 获取角色对应的权限等级 */
export function getPermissionLevel(role: Role): PermissionLevel {
  return ROLE_PERMISSION_MAP[role];
}
