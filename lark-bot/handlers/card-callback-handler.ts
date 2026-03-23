/**
 * 飞书消息卡片按钮回调处理器
 * 处理用户点击卡片按钮后的交互（确认位置、确认归还等）
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001/api';

interface CardAction {
  open_id: string;
  user_id: string;
  action: {
    value: {
      action: string;
      item_ids?: string;
    };
    tag: string;
  };
}

/**
 * 处理卡片按钮回调
 */
export async function handleCardCallback(body: CardAction) {
  const { action: actionData, open_id } = body;
  const { action, item_ids } = actionData.action.value;

  switch (action) {
    case 'confirm_location':
      return await handleConfirmLocation(item_ids, open_id);
    case 'confirm_return':
      return await handleConfirmReturn(item_ids, open_id);
    default:
      return buildToastResponse('未知操作');
  }
}

/** 确认位置正确 */
async function handleConfirmLocation(itemIds: string | undefined, openId: string) {
  if (!itemIds) return buildToastResponse('缺少物品信息');

  const ids = itemIds.split(',');
  let successCount = 0;

  for (const id of ids) {
    try {
      const res = await fetch(`${API_BASE}/items/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmedBy: openId }),
      });
      if (res.ok) successCount++;
    } catch {
      // 单个失败不影响其他
    }
  }

  return buildToastResponse(`已确认 ${successCount}/${ids.length} 个物品位置`);
}

/** 确认归还 */
async function handleConfirmReturn(itemIds: string | undefined, openId: string) {
  if (!itemIds) return buildToastResponse('缺少物品信息');

  const ids = itemIds.split(',');
  let successCount = 0;

  for (const id of ids) {
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_stock', returnedBy: openId }),
      });
      if (res.ok) successCount++;
    } catch {
      // 单个失败不影响其他
    }
  }

  return buildToastResponse(`已归还 ${successCount}/${ids.length} 个物品`);
}

/** 构建 Toast 提示响应 */
function buildToastResponse(message: string) {
  return {
    toast: {
      type: 'success' as const,
      content: message,
    },
  };
}
