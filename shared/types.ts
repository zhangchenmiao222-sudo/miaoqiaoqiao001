// ============================================================
// 共享类型定义 — 前后端通用
// ============================================================

// ---- 枚举 / 字面量类型 ----------------------------------------

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

/** 物品状态 */
export type ItemStatus = 'in_stock' | 'in_use' | 'transferred' | 'expired' | 'scrapped';

/** 别名类型 */
export type AliasType = 'pinyin' | 'abbreviation' | 'colloquial';

// ---- 核心实体 -------------------------------------------------

/** 角色 */
export interface Role_ {
  id: string;
  name: Role;
  label: string;
  permission_level: PermissionLevel;
  created_at: string;
}

/** 用户 */
export interface User {
  id: string;
  lark_user_id: string;
  name: string;
  avatar_url?: string;
  role_id: string;
  role?: Role;
  department?: string;
  is_active: boolean;
  permissions?: PermissionLevel;   // 由角色推断，前端展示用
  created_at: string;
  updated_at: string;
}

/** 分类（单节点，含 children 为树形） */
export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

/** 位置（三级树：区域 > 房间 > 具体位置） */
export interface Location {
  id: string;
  name: string;
  parent_id: string | null;
  level: 1 | 2 | 3;
  description?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Location[];
}

/** 物品别名 */
export interface ItemAlias {
  id: string;
  item_id: string;
  alias: string;
  alias_type: AliasType;
  created_at: string;
}

/** 物品 */
export interface Item {
  id: string;
  name: string;
  aliases?: string[] | null;       // JSON 列，直接存别名文本数组
  category_id: string;
  location_id?: string | null;
  status: ItemStatus;
  dog_id?: string | null;          // 关联犬只编号
  expiry_date?: string | null;     // ISO 日期 YYYY-MM-DD
  photo_url?: string | null;
  responsible_user_id?: string | null;
  notes?: string | null;
  quantity: number;
  unit: string;
  last_confirmed_at?: string | null;
  last_confirmed_by?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // 联表扩展字段（LIST/DETAIL 返回）
  category_name?: string;
  location_name?: string;
  responsible_user_name?: string;
  item_aliases?: ItemAlias[];
}

/** 搜索日志 */
export interface SearchLog {
  id: string;
  user_id?: string | null;
  keyword: string;
  result_count: number;
  created_at: string;
}

// ---- 通用响应结构 ---------------------------------------------

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** 操作成功响应 */
export interface SuccessResponse {
  message: string;
  id?: string;
  count?: number;
}

/** 错误响应 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// ---- API 请求参数 ---------------------------------------------

/** 物品列表查询参数 */
export interface ItemListParams {
  category?: string;
  location?: string;
  status?: ItemStatus;
  page?: number;
  limit?: number;
}

/** 搜索请求参数 */
export interface SearchParams extends ItemListParams {
  q: string;
}

/** 新建物品请求体 */
export interface CreateItemBody {
  name: string;
  aliases?: Array<{ alias: string; alias_type?: AliasType }>;
  category_id: string;
  location_id?: string;
  status?: ItemStatus;
  dog_id?: string;
  expiry_date?: string;
  photo_url?: string;
  responsible_user_id?: string;
  notes?: string;
  quantity?: number;
  unit?: string;
}

/** 更新物品请求体（所有字段可选） */
export type UpdateItemBody = Partial<CreateItemBody> & {
  last_confirmed_at?: string;
};

/** 新建分类请求体 */
export interface CreateCategoryBody {
  name: string;
  parent_id?: string;
  sort_order?: number;
}

/** 新建位置请求体 */
export interface CreateLocationBody {
  name: string;
  parent_id?: string;
  description?: string;
  sort_order?: number;
}

// ---- 废弃/兼容（保留供旧代码过渡） ----------------------------

/** @deprecated 使用 Location 替代 */
export interface Zone {
  id: string;
  name: string;
  floor: number;
  building: string;
  mapCoordinates?: { x: number; y: number; width: number; height: number };
}

/** @deprecated 使用 Category.id/name 替代 */
export type ItemCategory =
  | 'reagent' | 'consumable' | 'equipment' | 'tool'
  | 'controlled' | 'feed' | 'office' | 'spare_part';
