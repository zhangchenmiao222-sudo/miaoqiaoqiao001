/**
 * 权限变更日志服务
 * 记录所有权限相关操作（授权/取消/角色变更），通知管理层
 */

import { sendPrivateCard } from '../../lark-bot/webhooks/bot-sender.js';

const H5_BASE = process.env.H5_BASE_URL || 'http://localhost:5173';

export type PermissionAction = 'grant' | 'revoke' | 'role_change';

export interface PermissionLog {
  action: PermissionAction;
  targetUserId: string;
  targetUserName: string;
  operatorId: string;
  operatorName: string;
  oldRole?: string;
  newRole?: string;
  detail: string;
  timestamp: string;
}

// 内存日志（TODO: 接入数据库后替换）
const logs: PermissionLog[] = [];

/**
 * 记录权限变更并通知管理层
 */
export async function logPermissionChange(log: PermissionLog) {
  // 1. 记录日志
  logs.push(log);
  console.log(`[Permission] ${log.action}: ${log.detail}`);

  // 2. 构建通知卡片
  const actionLabel = {
    grant: '授予权限',
    revoke: '取消权限',
    role_change: '角色变更',
  }[log.action];

  const card = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text' as const, content: `🔐 ${actionLabel}通知` },
      template: 'violet' as const,
    },
    elements: [
      {
        tag: 'div' as const,
        fields: [
          {
            is_short: true,
            text: { tag: 'lark_md' as const, content: `**操作人**\n${log.operatorName}` },
          },
          {
            is_short: true,
            text: { tag: 'lark_md' as const, content: `**目标用户**\n${log.targetUserName}` },
          },
        ],
      },
      {
        tag: 'div' as const,
        text: { tag: 'lark_md' as const, content: `**详情：** ${log.detail}` },
      },
      {
        tag: 'div' as const,
        text: {
          tag: 'lark_md' as const,
          content: `**时间：** ${log.timestamp}`,
        },
      },
    ],
  };

  // 3. 通知管理层（TODO: 从数据库查询管理层用户列表）
  // 这里预留接口，等成员B的用户表就绪后联调
  const managerOpenIds: string[] = []; // TODO: 填入管理层 open_id
  for (const managerId of managerOpenIds) {
    await sendPrivateCard(managerId, card).catch((err) =>
      console.error(`通知管理层失败 (${managerId}):`, err),
    );
  }
}

/** 获取权限变更日志 */
export function getPermissionLogs(limit = 50): PermissionLog[] {
  return logs.slice(-limit);
}
