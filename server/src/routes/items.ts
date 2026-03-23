import { Router } from 'express';
import multer from 'multer';
import pool from '../db/connection.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';
import { ExcelImportService } from '../services/excelImport.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ============================================================
// GET /api/items/template — 下载 Excel 导入模板
// ============================================================
router.get('/template', authenticate, async (_req, res) => {
  try {
    const buffer = await ExcelImportService.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename*=UTF-8\'\'%E7%89%A9%E5%93%81%E5%AF%BC%E5%85%A5%E6%A8%A1%E6%9D%BF.xlsx');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'TEMPLATE_ERROR', message: '模板生成失败' } });
  }
});

// ============================================================
// GET /api/items/search?q=关键词&category=&location=&status=&page=&limit=
// ============================================================
router.get('/search', optionalAuth, async (req, res) => {
  const { q = '', category, location, status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (q) {
      where += ` AND (
        i.name LIKE ? OR
        EXISTS (SELECT 1 FROM item_aliases ia WHERE ia.item_id = i.id AND ia.alias LIKE ?)
      )`;
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category)  { where += ' AND i.category_id = ?'; params.push(category); }
    if (location)  { where += ' AND i.location_id = ?'; params.push(location); }
    if (status)    { where += ' AND i.status = ?';      params.push(status); }

    const countSql = `SELECT COUNT(*) AS total FROM items i ${where}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
    const total = countRows[0].total as number;

    const dataSql = `
      SELECT i.*, c.name AS category_name, l.name AS location_name,
             u.name AS responsible_user_name
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN locations  l ON l.id = i.location_id
      LEFT JOIN users      u ON u.id = i.responsible_user_id
      ${where}
      ORDER BY i.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query<RowDataPacket[]>(dataSql, [...params, Number(limit), offset]);

    // 记录搜索日志
    if (q) {
      await pool.query(
        'INSERT INTO search_logs (id, user_id, keyword, result_count) VALUES (?, ?, ?, ?)',
        [uuidv4(), req.user?.id ?? null, q, total]
      );
    }

    res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: '查询失败' } });
  }
});

// ============================================================
// GET /api/items — 列表（支持分页和过滤）
// ============================================================
router.get('/', authenticate, async (req, res) => {
  const { category, location, status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    if (category)  { where += ' AND i.category_id = ?'; params.push(category); }
    if (location)  { where += ' AND i.location_id = ?'; params.push(location); }
    if (status)    { where += ' AND i.status = ?';      params.push(status); }

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM items i ${where}`, params
    );
    const total = (countRows[0] as RowDataPacket).total as number;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT i.*, c.name AS category_name, l.name AS location_name,
              u.name AS responsible_user_name
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN locations  l ON l.id = i.location_id
       LEFT JOIN users      u ON u.id = i.responsible_user_id
       ${where}
       ORDER BY i.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: '查询失败' } });
  }
});

// ============================================================
// GET /api/items/:id — 详情
// ============================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT i.*, c.name AS category_name, l.name AS location_name,
              u.name AS responsible_user_name
       FROM items i
       LEFT JOIN categories c ON c.id = i.category_id
       LEFT JOIN locations  l ON l.id = i.location_id
       LEFT JOIN users      u ON u.id = i.responsible_user_id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: '物品不存在' } });
      return;
    }
    // 附带别名
    const [aliases] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM item_aliases WHERE item_id = ?', [req.params.id]
    );
    res.json({ ...rows[0], aliases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: '查询失败' } });
  }
});

// ============================================================
// POST /api/items — 新建（需要 edit 权限）
// ============================================================
router.post('/', authenticate, requirePermission('edit'), async (req, res) => {
  const {
    name, aliases, category_id, location_id, status = 'in_stock',
    dog_id, expiry_date, photo_url, responsible_user_id, notes,
    quantity = 1, unit = '个',
  } = req.body;

  if (!name || !category_id) {
    res.status(400).json({ error: { code: 'VALIDATION', message: '物品名称和分类为必填项' } });
    return;
  }

  const id = uuidv4();
  try {
    await pool.query(
      `INSERT INTO items
        (id, name, aliases, category_id, location_id, status, dog_id,
         expiry_date, photo_url, responsible_user_id, notes, quantity, unit, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, aliases ? JSON.stringify(aliases) : null, category_id,
       location_id, status, dog_id, expiry_date, photo_url,
       responsible_user_id, notes, quantity, unit, req.user!.id]
    );

    // 保存别名到 item_aliases 表
    if (Array.isArray(aliases) && aliases.length) {
      const aliasRows = aliases.map((a: { alias: string; alias_type?: string }) => [
        uuidv4(), id, a.alias, a.alias_type ?? 'colloquial'
      ]);
      await pool.query(
        'INSERT INTO item_aliases (id, item_id, alias, alias_type) VALUES ?',
        [aliasRows]
      );
    }

    res.status(201).json({ id, message: '创建成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: '创建失败' } });
  }
});

// ============================================================
// PUT /api/items/:id — 更新（需要 edit 权限）
// ============================================================
router.put('/:id', authenticate, requirePermission('edit'), async (req, res) => {
  const { id } = req.params;
  const {
    name, aliases, category_id, location_id, status,
    dog_id, expiry_date, photo_url, responsible_user_id,
    notes, quantity, unit, last_confirmed_at,
  } = req.body;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE items SET
        name = COALESCE(?, name),
        aliases = COALESCE(?, aliases),
        category_id = COALESCE(?, category_id),
        location_id = COALESCE(?, location_id),
        status = COALESCE(?, status),
        dog_id = COALESCE(?, dog_id),
        expiry_date = COALESCE(?, expiry_date),
        photo_url = COALESCE(?, photo_url),
        responsible_user_id = COALESCE(?, responsible_user_id),
        notes = COALESCE(?, notes),
        quantity = COALESCE(?, quantity),
        unit = COALESCE(?, unit),
        last_confirmed_at = COALESCE(?, last_confirmed_at),
        last_confirmed_by = COALESCE(?, last_confirmed_by)
       WHERE id = ?`,
      [name, aliases ? JSON.stringify(aliases) : null,
       category_id, location_id, status, dog_id, expiry_date,
       photo_url, responsible_user_id, notes, quantity, unit,
       last_confirmed_at, last_confirmed_at ? req.user!.id : null, id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: '物品不存在' } });
      return;
    }
    res.json({ message: '更新成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: '更新失败' } });
  }
});

// ============================================================
// DELETE /api/items/:id — 删除（需要 manage 权限）
// ============================================================
router.delete('/:id', authenticate, requirePermission('manage'), async (req, res) => {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM items WHERE id = ?', [req.params.id]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: '物品不存在' } });
      return;
    }
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'DB_ERROR', message: '删除失败' } });
  }
});

// ============================================================
// POST /api/items/import — Excel 批量导入（需要 edit 权限）
//
// Body (multipart/form-data):
//   file          — .xlsx 文件（必须使用模板格式）
//   locationId    — 可选，按区域导入时覆盖所有行的位置
//   skipDuplicates — 可选，'false' 时不跳过重复项（默认 true）
// ============================================================
router.post('/import', authenticate, requirePermission('edit'), upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: '请上传 Excel 文件（.xlsx）' } });
    return;
  }

  const { locationId, skipDuplicates = 'true' } = req.body as Record<string, string>;

  try {
    // Step 1: 解析 + 校验
    const { valid, errors: parseErrors } = await ExcelImportService.parseAndValidate(req.file.buffer);

    if (valid.length === 0 && parseErrors.length === 0) {
      res.status(400).json({ error: { code: 'EMPTY_FILE', message: 'Excel 文件无有效数据行' } });
      return;
    }

    // Step 2: 写库
    const result = await ExcelImportService.importRows(valid, {
      locationId:     locationId || undefined,
      skipDuplicates: skipDuplicates !== 'false',
      createdBy:      req.user!.id,
    });

    // 合并解析阶段的错误
    const allErrors = [...parseErrors, ...result.errors];

    res.json({
      message: `导入完成：成功 ${result.success} 条，跳过 ${result.skipped} 条，失败 ${allErrors.length} 条`,
      success:  result.success,
      skipped:  result.skipped,
      failed:   allErrors.length,
      errors:   allErrors,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: 'IMPORT_ERROR', message: '导入失败，请检查文件格式' } });
  }
});

export default router;
