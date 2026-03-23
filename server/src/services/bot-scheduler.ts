/**
 * 飞书 Bot 定时推送调度器
 * 9:00 — 每日物资概览
 * 10:00 — 待确认物品清单
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { sendWebhookMessage } from '../../lark-bot/webhooks/bot-sender.js';

const WEBHOOK_URL = process.env.LARK_BOT_WEBHOOK || '';
const H5_BASE = process.env.H5_BASE_URL || 'http://localhost:5173';

/** 加载卡片模板并替换变量 */
function loadCardTemplate(name: string, vars: Record<string, string>): object {
  const filePath = resolve(process.cwd(), `lark-bot/cards/${name}.json`);
  let content = readFileSync(filePath, 'utf-8');

  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }

  return JSON.parse(content);
}

/** 发送每日概览（9:00） */
export async function sendDailyOverview() {
  if (!WEBHOOK_URL) {
    console.log('[Bot] WEBHOOK_URL 未配置，跳过每日概览推送');
    return;
  }

  // TODO: 从数据库查询实际数据，目前使用占位数据
  const card = loadCardTemplate('daily-overview', {
    total_items: '--',
    today_updated: '--',
    in_use_count: '--',
    expiring_count: '--',
    alert_summary: '暂无异常预警',
    h5_base_url: H5_BASE,
  });

  await sendWebhookMessage(WEBHOOK_URL, card);
  console.log('[Bot] 每日概览已推送');
}

/** 发送待确认清单（10:00） */
export async function sendConfirmChecklist() {
  if (!WEBHOOK_URL) {
    console.log('[Bot] WEBHOOK_URL 未配置，跳过待确认清单推送');
    return;
  }

  // TODO: 从数据库查询超过7天未确认的物品
  const card = loadCardTemplate('confirm-checklist', {
    threshold_days: '7',
    item_list: '暂无待确认物品',
    item_ids: '',
    first_item_id: '',
    h5_base_url: H5_BASE,
  });

  await sendWebhookMessage(WEBHOOK_URL, card);
  console.log('[Bot] 待确认清单已推送');
}

/** 发送有效期预警 */
export async function sendExpiryWarning() {
  if (!WEBHOOK_URL) {
    console.log('[Bot] WEBHOOK_URL 未配置，跳过有效期预警推送');
    return;
  }

  // TODO: 从数据库查询即将过期的物品
  const card = loadCardTemplate('expiry-warning', {
    expiry_list: '暂无过期预警',
    first_item_id: '',
    h5_base_url: H5_BASE,
  });

  await sendWebhookMessage(WEBHOOK_URL, card);
  console.log('[Bot] 有效期预警已推送');
}

/**
 * 启动定时任务
 * 使用简单的 setInterval 实现，生产环境可替换为 node-cron
 */
export function startBotScheduler() {
  console.log('[Bot] 定时推送调度器已启动');

  // 每分钟检查一次是否到了推送时间
  setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // 9:00 — 每日概览
    if (hours === 9 && minutes === 0) {
      sendDailyOverview().catch((err) => console.error('[Bot] 每日概览推送失败:', err));
    }

    // 10:00 — 待确认清单
    if (hours === 10 && minutes === 0) {
      sendConfirmChecklist().catch((err) => console.error('[Bot] 待确认清单推送失败:', err));
    }

    // 14:00 — 有效期预警
    if (hours === 14 && minutes === 0) {
      sendExpiryWarning().catch((err) => console.error('[Bot] 有效期预警推送失败:', err));
    }
  }, 60 * 1000);
}
