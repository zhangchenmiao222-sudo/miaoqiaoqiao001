/**
 * Service Worker — 厂区智能物资定位系统
 *
 * 缓存策略：
 *   App Shell（HTML/JS/CSS/图片）  →  Cache-First（离线可用）
 *   API 请求 /api/*               →  Network-First，失败时回落缓存
 *   地图数据 JSON                  →  Stale-While-Revalidate
 *
 * 替代飞书小程序 tt.setStorage 的静态资源缓存层
 */

const CACHE_VERSION    = 'mq-v1'
const SHELL_CACHE      = `${CACHE_VERSION}-shell`
const API_CACHE        = `${CACHE_VERSION}-api`
const STALE_CACHE      = `${CACHE_VERSION}-stale`

/** 安装时预缓存的 App Shell 资源 */
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      cache.addAll(SHELL_ASSETS).catch(err => {
        // 部分资源不存在时不阻塞安装
        console.warn('[SW] Shell pre-cache partial fail:', err)
      })
    ).then(() => self.skipWaiting())
  )
})

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('mq-') && k !== SHELL_CACHE && k !== API_CACHE && k !== STALE_CACHE)
          .map(k => {
            console.log('[SW] Deleting old cache:', k)
            return caches.delete(k)
          })
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 只处理 GET
  if (request.method !== 'GET') return

  // ── API 请求：Network-First ──────────────────────────────────────────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request))
    return
  }

  // ── 地图 JSON：Stale-While-Revalidate ────────────────────────────────────
  if (url.pathname.includes('map-data.json')) {
    event.respondWith(staleWhileRevalidate(request, STALE_CACHE))
    return
  }

  // ── App Shell / 静态资源：Cache-First ────────────────────────────────────
  event.respondWith(cacheFirst(request))
})

// ── 策略实现 ──────────────────────────────────────────────────────────────────

/**
 * Network-First（带超时）
 * 成功时更新 API 缓存；超时或失败时回落缓存并通知客户端离线
 */
async function networkFirstApi(request) {
  const TIMEOUT_MS = 5000

  const networkPromise = fetch(request.clone()).then(async response => {
    if (response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, response.clone())
      broadcastNetworkStatus(true)
    }
    return response
  })

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
  )

  try {
    return await Promise.race([networkPromise, timeoutPromise])
  } catch {
    broadcastNetworkStatus(false)
    const cached = await caches.match(request, { cacheName: API_CACHE })
    if (cached) return cached

    // 无缓存时返回离线 JSON
    return new Response(
      JSON.stringify({ error: { code: 'OFFLINE', message: '当前处于离线状态，请检查网络' } }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Cache-First
 * 命中缓存直接返回；未命中则请求网络并缓存
 */
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request.clone())
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // 无缓存 + 无网络：返回 index.html（SPA fallback）
    const fallback = await caches.match('/index.html')
    return fallback ?? new Response('离线中，请稍后重试', { status: 503 })
  }
}

/**
 * Stale-While-Revalidate
 * 立即返回缓存（如果有），后台刷新缓存
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)

  const fetchAndUpdate = fetch(request.clone()).then(response => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)

  return cached ?? fetchAndUpdate
}

// ── 客户端通信 ────────────────────────────────────────────────────────────────

/** 广播网络状态变化给所有客户端页面 */
function broadcastNetworkStatus(online) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client =>
      client.postMessage({ type: 'NETWORK_STATUS', online })
    )
  })
}

// ── 手动同步触发（来自主线程的消息） ─────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls ?? []
    caches.open(STALE_CACHE).then(cache => cache.addAll(urls))
  }

  if (event.data?.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE).then(() =>
      event.source?.postMessage({ type: 'API_CACHE_CLEARED' })
    )
  }
})
