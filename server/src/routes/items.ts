import { Router } from 'express';

const router = Router();

// GET /api/items — 搜索/列表
router.get('/', async (req, res) => {
  // TODO: implement search with query params
  res.json({ data: [], total: 0, page: 1, limit: 20 });
});

// GET /api/items/:id — 详情
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  // TODO: fetch from database
  res.json({ error: { code: 'NOT_FOUND', message: `Item ${id} not found` } });
});

// POST /api/items — 新建
router.post('/', async (req, res) => {
  // TODO: create item
  res.status(201).json(req.body);
});

// PUT /api/items/:id — 更新
router.put('/:id', async (req, res) => {
  // TODO: update item
  res.json(req.body);
});

export default router;
