/**
 * 审批流路由
 * POST /api/approval/apply     — H5 页面发起管控物品领用申请
 * POST /api/approval/callback  — 飞书审批通过/拒绝回调
 * GET  /api/approval/:code     — 查询审批状态
 */

import { Router } from 'express';
import { createApprovalInstance, getApprovalInstance } from '../services/lark-approval.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/approval/apply
 * H5 页面发起领用申请 → 创建飞书审批实例
 */
router.post('/apply', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { itemId, itemName, quantity, purpose, returnDate } = req.body;

    if (!itemName || !quantity || !purpose || !returnDate) {
      return res.status(400).json({
        error: { code: 'INVALID_PARAMS', message: '请填写完整的领用信息' },
      });
    }

    const result = await createApprovalInstance({
      userId: req.userId!,
      itemName,
      quantity,
      purpose,
      returnDate,
    });

    // TODO: 将审批实例与物品关联存入数据库
    console.log(`[Approval] 用户 ${req.userId} 发起领用申请: ${itemName} x${quantity}, 审批单号: ${result.instance_code}`);

    res.json({
      instanceCode: result.instance_code,
      message: '领用申请已提交，请在飞书中等待审批',
    });
  } catch (err) {
    console.error('创建审批失败:', err);
    res.status(500).json({
      error: { code: 'APPROVAL_FAILED', message: err instanceof Error ? err.message : '审批创建失败' },
    });
  }
});

/**
 * POST /api/approval/callback
 * 飞书审批事件回调（审批通过/拒绝时触发）
 */
router.post('/callback', async (req, res) => {
  try {
    // 飞书 URL 验证
    if (req.body.challenge) {
      return res.json({ challenge: req.body.challenge });
    }

    const { event } = req.body;
    if (!event) {
      return res.json({ code: 0 });
    }

    const instanceCode = event.instance_code;
    const status = event.status; // APPROVED | REJECTED | CANCELED

    console.log(`[Approval] 审批回调: ${instanceCode} → ${status}`);

    if (status === 'APPROVED') {
      // TODO: 更新物品状态为「借出中」，记录流转日志
      console.log(`[Approval] 审批通过，更新物品状态`);
    } else if (status === 'REJECTED') {
      // TODO: 通知申请人审批被拒绝
      console.log(`[Approval] 审批被拒绝`);
    }

    res.json({ code: 0 });
  } catch (err) {
    console.error('处理审批回调失败:', err);
    res.json({ code: 0 });
  }
});

/**
 * GET /api/approval/:code
 * 查询审批实例状态
 */
router.get('/:code', authMiddleware, async (req, res) => {
  try {
    const result = await getApprovalInstance(req.params.code);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: { code: 'QUERY_FAILED', message: err instanceof Error ? err.message : '查询失败' },
    });
  }
});

export default router;
