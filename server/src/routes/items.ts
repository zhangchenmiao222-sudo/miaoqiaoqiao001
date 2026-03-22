import { Router } from 'express';
import { pinyin } from 'pinyin-pro';
import type { Item, ItemCategory, ItemStatus } from '../../../shared/types.js';

const router = Router();

// ============================================================
// 内存模拟数据（含别名、拼音字段，后续替换为数据库查询）
// ============================================================
interface ItemWithAliases extends Item {
  aliases: string[];
  pinyinFull: string;   // 全拼，如 "xuechang fenxiyi"
  pinyinInitials: string; // 首字母，如 "xcfxy"
}

const MOCK_ITEMS: ItemWithAliases[] = [
  {
    id: '1',
    name: '血常规分析仪',
    aliases: ['那个量血的机器', '验血仪', '血液分析仪', '血球仪'],
    category: 'equipment',
    status: 'in_stock',
    zoneId: 'lab',
    locationDetail: '实验室 - A柜 - 第2层',
    quantity: 1,
    unit: '台',
    isControlled: false,
    lastVerifiedAt: '2026-03-20T08:00:00Z',
    lastVerifiedBy: 'user1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-20T08:00:00Z',
    pinyinFull: '',
    pinyinInitials: '',
  },
  {
    id: '2',
    name: '泡棉胶带',
    aliases: ['双面胶', '泡沫胶带', '海绵胶带'],
    category: 'consumable',
    status: 'in_stock',
    zoneId: 'warehouse',
    locationDetail: '库房 - B区 - 货架3',
    quantity: 50,
    unit: '卷',
    isControlled: false,
    lastVerifiedAt: '2026-03-18T10:00:00Z',
    lastVerifiedBy: 'user2',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-18T10:00:00Z',
    pinyinFull: '',
    pinyinInitials: '',
  },
  {
    id: '3',
    name: '乙醇溶液',
    aliases: ['酒精', '医用酒精', '75%酒精', 'jjy'],
    category: 'reagent',
    status: 'in_stock',
    zoneId: 'lab',
    locationDetail: '实验室 - 试剂柜 - 第1层',
    quantity: 20,
    unit: '瓶',
    expiryDate: '2026-12-31',
    isControlled: false,
    lastVerifiedAt: '2026-03-15T09:00:00Z',
    lastVerifiedBy: 'user1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-15T09:00:00Z',
    pinyinFull: '',
    pinyinInitials: '',
  },
  {
    id: '4',
    name: '犬粮K-027',
    aliases: ['27号犬粮', 'K027犬粮'],
    category: 'feed',
    status: 'in_stock',
    zoneId: 'kennel',
    locationDetail: '成品间 - 冷库 - 编号K-027',
    quantity: 10,
    unit: '袋',
    isControlled: false,
    lastVerifiedAt: '2026-03-21T07:00:00Z',
    lastVerifiedBy: 'user3',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-21T07:00:00Z',
    pinyinFull: '',
    pinyinInitials: '',
  },
  {
    id: '5',
    name: '扭矩扳手',
    aliases: ['力矩扳手', '扭力扳手', 'njbs'],
    category: 'tool',
    status: 'in_stock',
    zoneId: 'engineering',
    locationDetail: '工程部 - 工具柜 - 第3层',
    quantity: 2,
    unit: '把',
    isControlled: false,
    lastVerifiedAt: '2026-03-10T14:00:00Z',
    lastVerifiedBy: 'user4',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-10T14:00:00Z',
    pinyinFull: '',
    pinyinInitials: '',
  },
  {
    id: '6',
    name: '打印纸',
    aliases: ['A4纸', '复印纸', 'A4'],
    category: 'office',
    status: 'in_stock',
    zoneId: 'office',
    locationDetail: '文印室 - 储物柜 - 第2层',
    quantity: 100,
    unit: '包',
    isControlled: false,
    lastVerifiedAt: '2026-03-19T11:00:00Z',
    lastVerifiedBy: 'user5',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-19T11:00:00Z',
    pinyinFull: '',
    pinyinInitials: '',
  },
];

// 初始化拼音字段
MOCK_ITEMS.forEach((item) => {
  item.pinyinFull = pinyin(item.name, { toneType: 'none', separator: ' ' }).toLowerCase();
  item.pinyinInitials = pinyin(item.name, { pattern: 'first', separator: '' }).toLowerCase();
});

// ============================================================
// 模糊匹配：名称 | 别名 | 全拼 | 首字母
// ============================================================
function matchesKeyword(item: ItemWithAliases, kw: string): boolean {
  const k = kw.toLowerCase().trim();
  if (!k) return true;
  if (item.name.toLowerCase().includes(k)) return true;
  if (item.aliases.some((a) => a.toLowerCase().includes(k))) return true;
  if (item.pinyinFull.includes(k)) return true;
  if (item.pinyinInitials.includes(k)) return true;
  return false;
}

// ============================================================
// 路由
// ============================================================

// GET /api/items — 搜索/列表
router.get('/', (req, res) => {
  const keyword = (req.query.keyword as string) || '';
  const category = req.query.category as ItemCategory | undefined;
  const zoneId = req.query.zoneId as string | undefined;
  const status = req.query.status as ItemStatus | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

  let results = MOCK_ITEMS.filter((item) => {
    if (!matchesKeyword(item, keyword)) return false;
    if (category && item.category !== category) return false;
    if (zoneId && item.zoneId !== zoneId) return false;
    if (status && item.status !== status) return false;
    return true;
  });

  const total = results.length;
  const data = results.slice((page - 1) * limit, page * limit).map(({ aliases, pinyinFull, pinyinInitials, ...item }) => item);

  res.json({ data, total, page, limit });
});

// GET /api/items/:id — 详情
router.get('/:id', (req, res) => {
  const found = MOCK_ITEMS.find((i) => i.id === req.params.id);
  if (!found) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: `物品 ${req.params.id} 不存在` } });
  }
  const { aliases, pinyinFull, pinyinInitials, ...item } = found;
  res.json(item);
});

// POST /api/items — 新建
router.post('/', (req, res) => {
  // TODO: persist to database
  res.status(201).json(req.body);
});

// PUT /api/items/:id — 更新（含位置绑定）
router.put('/:id', (req, res) => {
  const idx = MOCK_ITEMS.findIndex((i) => i.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: '物品不存在' } });
  }
  const allowed: (keyof Item)[] = ['zoneId', 'locationDetail', 'status', 'quantity'];
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) {
      (MOCK_ITEMS[idx] as Record<string, unknown>)[key] = req.body[key];
    }
  });
  MOCK_ITEMS[idx].updatedAt = new Date().toISOString();
  MOCK_ITEMS[idx].lastVerifiedAt = new Date().toISOString();
  const { aliases, pinyinFull, pinyinInitials, ...item } = MOCK_ITEMS[idx];
  res.json(item);
});

export default router;
