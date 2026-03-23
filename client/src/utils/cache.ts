/**
 * 本地缓存工具
 * 替代飞书小程序 tt.setStorage / tt.getStorage
 *
 * 策略：
 *   地图数据      TTL 24h   — 结构变化少，首次加载后长期可用
 *   分类树        TTL 7d    — 几乎不变
 *   物品搜索结果  TTL 5min  — 弱网时兜底，恢复后立即刷新
 *   搜索历史      永久       — 本地个人数据，手动清除
 */

// ── TTL 常量（毫秒） ───────────────────────────────────────────────────────────

export const TTL = {
  MAP_DATA:       24 * 60 * 60 * 1000,       // 24 小时
  CATEGORY_TREE:   7 * 24 * 60 * 60 * 1000,  // 7 天
  ITEM_SEARCH:         5 * 60 * 1000,         // 5 分钟
  FOREVER:                           0,        // 0 表示永不过期
} as const

// ── Cache key 常量 ────────────────────────────────────────────────────────────

const KEYS = {
  MAP_DATA:       'mq:cache:map_data',
  CATEGORY_TREE:  'mq:cache:category_tree',
  SEARCH_HISTORY: 'mq:cache:search_history',
  LAST_SYNC_AT:   'mq:cache:last_sync_at',
  ITEM_SEARCH:    'mq:cache:items:',    // 后面追加 hash
  OFFLINE_MODE:   'mq:cache:offline_mode',
} as const

const MAX_SEARCH_HISTORY = 20

// ── 内部结构 ──────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data:      T
  cachedAt:  number   // Unix ms
  ttl:       number   // ms, 0 = forever
}

// ── 基础读写 ──────────────────────────────────────────────────────────────────

function write<T>(key: string, data: T, ttl: number): void {
  try {
    const entry: CacheEntry<T> = { data, cachedAt: Date.now(), ttl }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch (e) {
    // localStorage 空间不足时静默失败
    console.warn('[cache] write failed:', key, e)
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry<T>

    // 检查 TTL
    if (entry.ttl > 0 && Date.now() - entry.cachedAt > entry.ttl) {
      localStorage.removeItem(key)
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

function remove(key: string): void {
  localStorage.removeItem(key)
}

/** 返回缓存距今时间（秒），未命中返回 null */
function ageSeconds(key: string): number | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<unknown>
    return Math.floor((Date.now() - entry.cachedAt) / 1000)
  } catch {
    return null
  }
}

// ── 地图数据 ──────────────────────────────────────────────────────────────────

export function cacheMapData<T>(data: T): void {
  write(KEYS.MAP_DATA, data, TTL.MAP_DATA)
}

export function getMapData<T>(): T | null {
  return read<T>(KEYS.MAP_DATA)
}

export function mapDataAge(): number | null {
  return ageSeconds(KEYS.MAP_DATA)
}

// ── 分类树 ────────────────────────────────────────────────────────────────────

export function cacheCategoryTree<T>(data: T): void {
  write(KEYS.CATEGORY_TREE, data, TTL.CATEGORY_TREE)
}

export function getCategoryTree<T>(): T | null {
  return read<T>(KEYS.CATEGORY_TREE)
}

// ── 物品搜索结果（按参数哈希分桶缓存） ────────────────────────────────────────

/** 简单字符串哈希，用于给搜索参数生成 cache key */
function hashParams(params: Record<string, unknown>): string {
  const str = JSON.stringify(params, Object.keys(params).sort())
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

export function cacheItemSearch<T>(params: Record<string, unknown>, data: T): void {
  write(KEYS.ITEM_SEARCH + hashParams(params), data, TTL.ITEM_SEARCH)
}

export function getCachedItemSearch<T>(params: Record<string, unknown>): T | null {
  return read<T>(KEYS.ITEM_SEARCH + hashParams(params))
}

// ── 搜索历史 ──────────────────────────────────────────────────────────────────

export function getSearchHistory(): string[] {
  return read<string[]>(KEYS.SEARCH_HISTORY) ?? []
}

export function pushSearchHistory(keyword: string): void {
  const trimmed = keyword.trim()
  if (!trimmed) return

  const history = getSearchHistory().filter(k => k !== trimmed)
  history.unshift(trimmed)

  // 保留最近 N 条
  write(KEYS.SEARCH_HISTORY, history.slice(0, MAX_SEARCH_HISTORY), TTL.FOREVER)
}

export function removeSearchHistory(keyword: string): void {
  const history = getSearchHistory().filter(k => k !== keyword)
  write(KEYS.SEARCH_HISTORY, history, TTL.FOREVER)
}

export function clearSearchHistory(): void {
  remove(KEYS.SEARCH_HISTORY)
}

// ── 同步时间戳 ────────────────────────────────────────────────────────────────

export function markSynced(): void {
  write(KEYS.LAST_SYNC_AT, Date.now(), TTL.FOREVER)
}

export function getLastSyncAt(): number | null {
  return read<number>(KEYS.LAST_SYNC_AT)
}

/** 返回上次同步时间的人类可读描述 */
export function lastSyncLabel(): string {
  const ts = getLastSyncAt()
  if (!ts) return '从未同步'

  const diffMs  = Date.now() - ts
  const diffMin = Math.floor(diffMs / 60000)
  const diffH   = Math.floor(diffMin / 60)
  const diffD   = Math.floor(diffH / 24)

  if (diffMin < 1)   return '刚刚同步'
  if (diffMin < 60)  return `${diffMin} 分钟前同步`
  if (diffH   < 24)  return `${diffH} 小时前同步`
  return `${diffD} 天前同步`
}

// ── 离线模式标记（供 SW postMessage 写入） ────────────────────────────────────

export function setOfflineMode(offline: boolean): void {
  write(KEYS.OFFLINE_MODE, offline, TTL.FOREVER)
}

export function isOfflineMode(): boolean {
  return read<boolean>(KEYS.OFFLINE_MODE) ?? false
}

// ── 清理所有缓存 ──────────────────────────────────────────────────────────────

export function clearAllCache(): void {
  const keys = Object.values(KEYS)
  // 前缀匹配清理 item search 分桶
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (k && (keys.includes(k as never) || k.startsWith(KEYS.ITEM_SEARCH))) {
      localStorage.removeItem(k)
    }
  }
}

/** 返回所有已缓存 key 的摘要（调试用） */
export function cacheStats(): Record<string, string> {
  const stats: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith('mq:cache:')) continue
    const age = ageSeconds(k)
    stats[k] = age !== null ? `${age}s ago` : 'expired/missing'
  }
  return stats
}
