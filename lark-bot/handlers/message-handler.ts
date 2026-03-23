/**
 * 飞书机器人消息处理器
 * 监听群聊 @机器人 消息，解析关键词并搜索物品，回复位置卡片
 */

import { sendCardMessage } from '../webhooks/bot-sender.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001/api';
const H5_BASE = process.env.H5_BASE_URL || 'http://localhost:5173';

interface LarkEvent {
  header: {
    event_type: string;
    token: string;
  };
  event: {
    message: {
      message_id: string;
      chat_id: string;
      message_type: string;
      content: string;
    };
    sender: {
      sender_id: {
        open_id: string;
        user_id: string;
      };
      sender_type: string;
    };
  };
}

/**
 * 处理飞书事件回调
 */
export async function handleLarkEvent(body: LarkEvent) {
  const { header, event } = body;

  // URL 验证（飞书首次配置回调时发送）
  if ((body as any).challenge) {
    return { challenge: (body as any).challenge };
  }

  if (header.event_type !== 'im.message.receive_v1') {
    return { code: 0 };
  }

  const { message, sender } = event;

  // 只处理文本消息
  if (message.message_type !== 'text') {
    return { code: 0 };
  }

  // 解析消息内容（飞书文本消息格式：{"text":"@_user_1 搜索内容"}）
  let text = '';
  try {
    const content = JSON.parse(message.content);
    text = content.text?.replace(/@_user_\d+/g, '').trim() || '';
  } catch {
    return { code: 0 };
  }

  if (!text) {
    await sendCardMessage(message.chat_id, buildHelpCard());
    return { code: 0 };
  }

  // 搜索物品
  try {
    const res = await fetch(`${API_BASE}/items?keyword=${encodeURIComponent(text)}&limit=5`);
    const data = await res.json();
    const items = data.data || [];

    if (items.length === 0) {
      await sendCardMessage(message.chat_id, buildNotFoundCard(text));
    } else {
      await sendCardMessage(message.chat_id, buildSearchResultCard(text, items));
    }
  } catch (err) {
    console.error('群聊查询失败:', err);
    await sendCardMessage(message.chat_id, buildErrorCard());
  }

  return { code: 0 };
}

/** 搜索结果卡片 */
function buildSearchResultCard(keyword: string, items: any[]) {
  const itemList = items
    .map((item: any, i: number) => `${i + 1}. **${item.name}** — ${item.locationDetail || '未知位置'}`)
    .join('\n');

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text' as const, content: `🔍 搜索「${keyword}」结果` },
      template: 'blue' as const,
    },
    elements: [
      { tag: 'div' as const, text: { tag: 'lark_md' as const, content: itemList } },
      { tag: 'hr' as const },
      {
        tag: 'action' as const,
        actions: [
          {
            tag: 'button' as const,
            text: { tag: 'plain_text' as const, content: '在H5中查看更多' },
            type: 'primary' as const,
            url: `${H5_BASE}/search?keyword=${encodeURIComponent(keyword)}`,
          },
        ],
      },
    ],
  };
}

/** 未找到卡片 */
function buildNotFoundCard(keyword: string) {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text' as const, content: '🔍 搜索结果' },
      template: 'grey' as const,
    },
    elements: [
      {
        tag: 'div' as const,
        text: {
          tag: 'lark_md' as const,
          content: `未找到「${keyword}」相关物品。\n\n💡 试试换个关键词，或使用拼音首字母搜索。`,
        },
      },
    ],
  };
}

/** 帮助卡片 */
function buildHelpCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text' as const, content: '🤖 找物助手' },
      template: 'blue' as const,
    },
    elements: [
      {
        tag: 'div' as const,
        text: {
          tag: 'lark_md' as const,
          content:
            '**使用方法：**\n@找物助手 + 物品名称\n\n**示例：**\n@找物助手 酒精\n@找物助手 K-027\n@找物助手 移液器',
        },
      },
    ],
  };
}

/** 错误卡片 */
function buildErrorCard() {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text' as const, content: '⚠️ 查询失败' },
      template: 'red' as const,
    },
    elements: [
      {
        tag: 'div' as const,
        text: { tag: 'lark_md' as const, content: '系统暂时无法处理请求，请稍后重试。' },
      },
    ],
  };
}
