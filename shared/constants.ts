import type { ItemCategory, Role } from './types';

/** 物品分类中文映射 */
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  reagent: '试剂',
  consumable: '耗材',
  equipment: '设备',
  tool: '工具',
  controlled: '管控品',
  feed: '饲料',
  office: '办公用品',
  spare_part: '备件',
};

/** 角色中文映射 */
export const ROLE_LABELS: Record<Role, string> = {
  lab_tester: '实验室检测人员',
  warehouse: '仓储/物料管理',
  qc: '品控/质检',
  kennel: '犬舍管理/饲养员',
  admin_logistics: '行政/后勤',
  engineer: '工程/设备维护',
  manager: '管理层/厂长',
  trainee: '新员工（培训期）',
};

/** 分页默认值 */
export const DEFAULT_PAGE_SIZE = 20;

/** 数据新鲜度阈值（天） */
export const FRESHNESS_THRESHOLDS = {
  fresh: 7,
  stale: 30,
  expired: 90,
} as const;
