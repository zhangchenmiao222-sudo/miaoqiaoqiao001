/**
 * 飞书机器人消息发送服务
 * 支持：发送卡片消息到群聊、发送私信
 */

const LARK_BASE = 'https://open.feishu.cn/open-apis';
const APP_ID = process.env.LARK_APP_ID || '';
const APP_SECRET = process.env.LARK_APP_SECRET || '';

/** 缓存 tenant_access_token */
let cachedToken = '';
let tokenExpiresAt = 0;

/** 获取 tenant_access_token */
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

/**
 * 发送卡片消息到群聊
 */
export async function sendCardMessage(chatId: string, card: object) {
  const token = await getTenantToken();

  const res = await fetch(`${LARK_BASE}/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: 'interactive',
      content: JSON.stringify(card),
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    console.error('发送卡片消息失败:', data.msg);
  }
  return data;
}

/**
 * 发送卡片私信给用户
 */
export async function sendPrivateCard(openId: string, card: object) {
  const token = await getTenantToken();

  const res = await fetch(`${LARK_BASE}/im/v1/messages?receive_id_type=open_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      receive_id: openId,
      msg_type: 'interactive',
      content: JSON.stringify(card),
    }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    console.error('发送私信失败:', data.msg);
  }
  return data;
}

/**
 * 通过 Webhook 发送消息（自定义机器人）
 */
export async function sendWebhookMessage(webhookUrl: string, card: object) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg_type: 'interactive', card }),
  });

  const data = await res.json();
  if (data.code !== 0) {
    console.error('Webhook 发送失败:', data.msg);
  }
  return data;
}
