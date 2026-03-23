/** Mock 驾驶舱数据 — 等成员B的 /api/dashboard API 就绪后替换此文件 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashStats {
  totalInStock: number   // 总在库件数
  borrowed: number       // 借出中
  warnings: number       // 预警数（过期/临期）
  weeklyInbound: number  // 本周入库次数
}

export interface AnomalyAlert {
  id: string
  type: 'overdue' | 'expiry'
  roomId: string
  roomName: string
  itemName: string
  detail: string         // '逾期3天' | '6天后到期' | '已过期45天'
  level: 'warning' | 'critical'
}

export interface ZoneDistItem {
  zone: string
  name: string
  count: number
  color: string
}

export interface WeeklyInboundPoint {
  date: string   // 'MM-DD'
  count: number
}

export interface DashboardData {
  stats: DashStats
  alerts: AnomalyAlert[]
  zoneDistribution: ZoneDistItem[]
  weeklyInbound: WeeklyInboundPoint[]
}

// ── Mock 数据（以 2026-03-23 为基准） ─────────────────────────────────────────

const DATA: DashboardData = {
  stats: {
    totalInStock: 83,
    borrowed: 2,
    warnings: 6,
    weeklyInbound: 12,
  },

  alerts: [
    {
      id: 'al-01',
      type: 'overdue',
      roomId: 'engineering',
      roomName: '工程部',
      itemName: '电钻套装',
      detail: '借出中 · 还至 03-26',
      level: 'warning',
    },
    {
      id: 'al-02',
      type: 'overdue',
      roomId: 'warehouse',
      roomName: '库房',
      itemName: '食品添加剂套装',
      detail: '借出中 · 还至 03-28',
      level: 'warning',
    },
    {
      id: 'al-03',
      type: 'expiry',
      roomId: 'kennel',
      roomName: '犬舍',
      itemName: '防疫药品柜-疫苗A',
      detail: '5天后到期',
      level: 'critical',
    },
    {
      id: 'al-04',
      type: 'expiry',
      roomId: 'lab',
      roomName: '实验室',
      itemName: 'ELISA试剂盒（鼠）',
      detail: '6天后到期',
      level: 'critical',
    },
    {
      id: 'al-05',
      type: 'expiry',
      roomId: 'smallstore',
      roomName: '小库房',
      itemName: '备用包装袋（小）',
      detail: '已过期 45天',
      level: 'critical',
    },
    {
      id: 'al-06',
      type: 'expiry',
      roomId: 'smallstore',
      roomName: '小库房',
      itemName: '标签纸卷',
      detail: '已过期 12天',
      level: 'critical',
    },
  ],

  zoneDistribution: [
    { zone: 'office',     name: '办公区',   count: 28, color: '#f0c89a' },
    { zone: 'production', name: '生产区',   count: 20, color: '#9ecbf0' },
    { zone: 'storage',    name: '仓储区',   count: 16, color: '#f5c87a' },
    { zone: 'lab',        name: '实验室区', count: 14, color: '#7ecba8' },
    { zone: 'kennel',     name: '犬舍区',   count: 5,  color: '#c9a8e8' },
  ],

  weeklyInbound: [
    { date: '03-17', count: 2 },
    { date: '03-18', count: 3 },
    { date: '03-19', count: 5 },
    { date: '03-20', count: 7 },
    { date: '03-21', count: 3 },
    { date: '03-22', count: 4 },
    { date: '03-23', count: 2 },
  ],
}

export function getDashboardData(): DashboardData {
  return DATA
}
