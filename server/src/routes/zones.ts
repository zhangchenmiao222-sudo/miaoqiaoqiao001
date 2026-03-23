import { Router } from 'express';
import type { Zone } from '../../../shared/types.js';

const router = Router();

// 5 大区域 + 子区域列表
const ZONES: Zone[] = [
  { id: 'production', name: '生产区', floor: 1, building: '主楼',
    mapCoordinates: { x: 0, y: 0, width: 200, height: 150 } },
  { id: 'lab', name: '实验室', floor: 1, building: '主楼',
    mapCoordinates: { x: 200, y: 0, width: 150, height: 150 } },
  { id: 'warehouse', name: '仓储区', floor: 1, building: '主楼',
    mapCoordinates: { x: 0, y: 150, width: 180, height: 120 } },
  { id: 'office', name: '办公区', floor: 2, building: '主楼',
    mapCoordinates: { x: 180, y: 150, width: 170, height: 120 } },
  { id: 'kennel', name: '犬舍', floor: 1, building: '附楼',
    mapCoordinates: { x: 350, y: 0, width: 150, height: 200 } },
];

// GET /api/zones
router.get('/', (_req, res) => {
  res.json(ZONES);
});

// GET /api/zones/:id
router.get('/:id', (req, res) => {
  const zone = ZONES.find((z) => z.id === req.params.id);
  if (!zone) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: '区域不存在' } });
  }
  res.json(zone);
});

export default router;
export { ZONES };
