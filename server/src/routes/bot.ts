/**
 * 飞书机器人回调路由
 * POST /api/bot/event    — 接收飞书事件回调（群聊消息等）
 * POST /api/bot/callback — 接收消息卡片按钮回调
 */

import { Router } from 'express';
import { handleLarkEvent } from '../../lark-bot/handlers/message-handler.js';
import { handleCardCallback } from '../../lark-bot/handlers/card-callback-handler.js';

const router = Router();

/**
 * POST /api/bot/event
 * 飞书事件订阅回调（消息接收）
 */
router.post('/event', async (req, res) => {
  try {
    // 飞书 URL 验证（首次配置时）
    if (req.body.challenge) {
      return res.json({ challenge: req.body.challenge });
    }

    const result = await handleLarkEvent(req.body);
    res.json(result);
  } catch (err) {
    console.error('处理飞书事件失败:', err);
    res.json({ code: 0 });
  }
});

/**
 * POST /api/bot/callback
 * 消息卡片按钮回调
 */
router.post('/callback', async (req, res) => {
  try {
    const result = await handleCardCallback(req.body);
    res.json(result);
  } catch (err) {
    console.error('处理卡片回调失败:', err);
    res.json({ toast: { type: 'error', content: '操作失败，请重试' } });
  }
});

export default router;
