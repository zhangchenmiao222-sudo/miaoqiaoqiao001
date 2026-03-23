/**
 * 飞书审批流服务
 * 创建管控物品领用审批实例、处理审批回调
 */

const LARK_BASE = 'https://open.feishu.cn/open-apis';
const APP_ID = process.env.LARK_APP_ID || '';
const APP_SECRET = process.env.LARK_APP_SECRET || '';

// 审批定义 code（在飞书管理后台创建审批模板后获取，TODO: 配置后填入）
const APPROVAL_CODE = process.env.LARK_APPROVAL_CODE || '';

/** 缓存 tenant_access_token */
let cachedToken = '';
let tokenExpiresAt = 0;

async function getTenantToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const res = await fetch(`${LARK_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`获取 token 失败: ${data.msg}`);
  }

  cachedToken = data.tenant_access_token;
  tokenExpiresAt = Date.now() + (data.expire - 300) * 1000;
  return cachedToken;
}

/** 领用申请参数 */
export interface ApprovalRequest {
  userId: string;       // 飞书 open_id
  itemName: string;     // 物品名称
  quantity: number;     // 数量
  purpose: string;      // 用途
  returnDate: string;   // 预计归还时间 YYYY-MM-DD
}

/**
 * 创建管控物品领用审批实例
 */
export async function createApprovalInstance(params: ApprovalRequest) {
  if (!APPROVAL_CODE) {
    throw new Error('审批定义 code 未配置，请在飞书管理后台创建审批模板后配置 LARK_APPROVAL_CODE');
  }

  const token = await getTenantToken();

  const form = JSON.stringify([
    { id: 'item_name', type: 'input', value: params.itemName },
    { id: 'quantity', type: 'input', value: String(params.quantity) },
    { id: 'purpose', type: 'textarea', value: params.purpose },
    { id: 'return_date', type: 'date', value: params.returnDate },
  ]);

  const res = await fetch(`${LARK_BASE}/approval/v4/instances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      approval_code: APPROVAL_CODE,
      open_id: params.userId,
      form,
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`创建审批失败: ${data.msg}`);
  }

  return data.data as { instance_code: string };
}

/**
 * 查询审批实例状态
 */
export async function getApprovalInstance(instanceCode: string) {
  const token = await getTenantToken();

  const res = await fetch(`${LARK_BASE}/approval/v4/instances/${instanceCode}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`查询审批失败: ${data.msg}`);
  }

  return data.data as {
    instance_code: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
    form: string;
  };
}
