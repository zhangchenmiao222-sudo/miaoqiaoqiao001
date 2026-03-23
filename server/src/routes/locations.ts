import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// GET /api/locations — 返回三级树形结构
router.get('/', authenticate, async (_req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM locations ORDER BY sort_order, name'
    );

    const map = new Map<string, RowDataPacket & { children: RowDataPacket[] }>();
    const roots: (RowDataPacket & { children: RowDataPacket[] })[] = [];

    rows.forEach(row => { map.set(row.id, { ...row, children: [] }); });
    rows.forEach(row => {
      const node = map.get(row.id)!;
      if (row.parent_id && map.has(row.parent_id)) {
        map.get(row.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    res.json({ data: roots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: '查询失败' } });
  }
});

// POST /api/locations — 新建位置（manage 权限）
router.post('/', authenticate, requirePermission('manage'), async (req, res) => {
  const { name, parent_id, description, sort_order = 0 } = req.body;
  if (!name) {
    res.status(400).json({ error: { code: 'VALIDATION', message: '位置名称为必填项' } });
    return;
  }

  let level = 1;
  if (parent_id) {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT level FROM locations WHERE id = ?', [parent_id]
    );
    if (!rows.length) {
      res.status(400).json({ error: { code: 'NOT_FOUND', message: '父位置不存在' } });
      return;
    }
    level = (rows[0].level as number) + 1;
    if (level > 3) {
      res.status(400).json({ error: { code: 'VALIDATION', message: '位置最多支持三级层级' } });
      return;
    }
  }

  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO locations (id, name, parent_id, level, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, parent_id ?? null, level, description, sort_order]
    );
    res.status(201).json({ id, message: '创建成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: '创建失败' } });
  }
});

// PUT /api/locations/:id — 更新（manage 权限）
router.put('/:id', authenticate, requirePermission('manage'), async (req, res) => {
  const { name, description, sort_order } = req.body;
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE locations SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        sort_order = COALESCE(?, sort_order)
       WHERE id = ?`,
      [name, description, sort_order, req.params.id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: '位置不存在' } });
      return;
    }
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: '更新失败' } });
  }
});

export default router;
