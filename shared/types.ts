// ============================================================
// 共享类型定义 — 前后端通用
// ============================================================

/** 用户角色 */
export type Role =
  | 'lab_tester'        // 实验室检测人员
  | 'warehouse'         // 仓储/物料管理
  | 'qc'                // 品控/质检
  | 'kennel'            // 犬舍管理/饲养员
  | 'admin_logistics'   // 行政/后勤
  | 'engineer'          // 工程/设备维护
  | 'manager'           // 管理层/厂长
  | 'trainee';          // 新员工（培训期）

/** 权限等级 */
export type PermissionLevel = 'view' | 'edit' | 'manage';

/** 厂区区域 */
export interface Zone {
  id: string;
  name: string;
  floor: number;
  building: string;
  mapCoordinates?: { x: number; y: number; width: number; height: number };
}

/** 物品分类 */
export type ItemCategory =
  | 'reagent'           // 试剂
  | 'consumable'        // 耗材
  | 'equipment'         // 设备
  | 'tool'              // 工具
  | 'controlled'        // 管控品
  | 'feed'              // 饲料
  | 'office'            // 办公用品
  | 'spare_part';       // 备件

/** 物品状态 */
export type ItemStatus = 'in_stock' | 'in_use' | 'transferred' | 'expired' | 'scrapped';

/** 物品 */
export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  status: ItemStatus;
  zoneId: string;
  locationDetail: string;       // 具体存放位置描述
  qrCode?: string;
  quantity: number;
  unit: string;
  expiryDate?: string;          // ISO 日期
  lastVerifiedAt: string;       // 数据新鲜度
  lastVerifiedBy: string;
  imageUrl?: string;
  isControlled: boolean;        // 是否管控品
  dogId?: string;               // 关联犬只编号，如 K-027
  createdAt: string;
  updatedAt: string;
}

/** 流转记录 */
export interface TransferRecord {
  id: string;
  itemId: string;
  fromZoneId: string;
  toZoneId: string;
  operatorId: string;
  reason: string;
  timestamp: string;
}

/** 用户 */
export interface User {
  id: string;
  larkUserId: string;
  name: string;
  avatar?: string;
  role: Role;
  department: string;
  permissions: PermissionLevel;
}

// ============================================================
// API 请求/响应类型
// ============================================================

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** 错误响应 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/** 搜索请求参数 */
export interface SearchParams {
  keyword?: string;
  category?: ItemCategory;
  zoneId?: string;
  status?: ItemStatus;
  dogId?: string;               // 按犬只编号过滤
  page?: number;
  limit?: number;
}

/** 犬只关联搜索响应（按物品类型分组） */
export interface DogSearchResult {
  dogId: string;
  groups: {
    category: ItemCategory;
    label: string;
    items: Item[];
  }[];
}

/** 管控物品领用申请 */
export interface ApprovalApplyRequest {
  itemId: string;
  itemName: string;
  quantity: number;
  purpose: string;
  returnDate: string;
}

/** 审批状态 */
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';

/** 审批实例响应 */
export interface ApprovalInstance {
  instanceCode: string;
  status: ApprovalStatus;
  message?: string;
}
