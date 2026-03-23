/**
 * 飞书开放平台 API 服务
 * 负责：获取 tenant_access_token、用 code 换用户信息、获取部门信息
 */

const LARK_BASE = 'https://open.feishu.cn/open-apis';

const APP_ID = process.env.LARK_APP_ID!;
const APP_SECRET = process.env.LARK_APP_SECRET!;

/** 缓存 tenant_access_token（有效期 2 小时） */
let cachedTenantToken = '';
let tokenExpiresAt = 0;

/** 获取 tenant_access_token */
export async function getTenantAccessToken(): Promise<string> {
  if (cachedTenantToken && Date.now() < tokenExpiresAt) {
    return cachedTenantToken;
  }

  const res = await fetch(`${LARK_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取 tenant_access_token 失败: ${data.msg}`);
  }

  cachedTenantToken = data.tenant_access_token;
  // 提前 5 分钟过期，避免边界问题
  tokenExpiresAt = Date.now() + (data.expire - 300) * 1000;
  return cachedTenantToken;
}

/** 用授权码 code 换取 user_access_token 和用户信息 */
export async function getUserAccessToken(code: string) {
  const tenantToken = await getTenantAccessToken();

  const res = await fetch(`${LARK_BASE}/authen/v1/oidc/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tenantToken}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`换取用户 token 失败: ${data.msg}`);
  }

  return data.data as {
    access_token: string;
    token_type: string;
    expires_in: number;
    name: string;
    en_name: string;
    avatar_url: string;
    open_id: string;
    union_id: string;
    user_id: string;
    tenant_key: string;
  };
}

/** 获取用户详细信息（含部门） */
export async function getUserInfo(userAccessToken: string) {
  const res = await fetch(`${LARK_BASE}/authen/v1/user_info`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${userAccessToken}`,
    },
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取用户信息失败: ${data.msg}`);
  }

  return data.data as {
    name: string;
    avatar_url: string;
    open_id: string;
    user_id: string;
    department_ids: string[];
  };
}

/** 根据部门 ID 获取部门名称 */
export async function getDepartmentName(departmentId: string): Promise<string> {
  const tenantToken = await getTenantAccessToken();

  const res = await fetch(
    `${LARK_BASE}/contact/v3/departments/${departmentId}`,
    {
      headers: { Authorization: `Bearer ${tenantToken}` },
    },
  );

  const data = await res.json();
  if (data.code !== 0) {
    return '未知部门';
  }

  return data.data?.department?.name || '未知部门';
}
