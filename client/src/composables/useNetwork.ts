/**
 * useNetwork — 网络状态管理 composable
 *
 * 功能：
 *  - 监听 online/offline 事件 + SW postMessage
 *  - 弱网/离线时暴露 isOffline、offlineReason
 *  - 网络恢复后触发回调（供各页面刷新数据）
 *  - 显示「离线数据，仅供参考」横幅
 */

import { ref, readonly, onMounted, onUnmounted } from 'vue'
import { markSynced, setOfflineMode, lastSyncLabel } from '@/utils/cache'

// ── 全局单例状态（跨组件共享） ────────────────────────────────────────────────

const isOffline   = ref(!navigator.onLine)
const isSyncing   = ref(false)
const syncLabel   = ref(lastSyncLabel())

/** 网络恢复时的回调队列 */
const onRecoverCallbacks: Array<() => void | Promise<void>> = []

// ── SW 消息监听 ───────────────────────────────────────────────────────────────

function handleSwMessage(event: MessageEvent) {
  if (event.data?.type !== 'NETWORK_STATUS') return

  const online: boolean = event.data.online
  setOfflineMode(!online)

  if (online && isOffline.value) {
    // 从离线变为在线 → 触发同步
    isOffline.value = false
    triggerSync()
  } else if (!online && !isOffline.value) {
    isOffline.value = true
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', handleSwMessage)
}

// ── 浏览器原生 online/offline 事件 ───────────────────────────────────────────

window.addEventListener('online', () => {
  setOfflineMode(false)
  if (isOffline.value) {
    isOffline.value = false
    triggerSync()
  }
})

window.addEventListener('offline', () => {
  setOfflineMode(true)
  isOffline.value = true
})

// ── 同步触发 ──────────────────────────────────────────────────────────────────

async function triggerSync() {
  if (isSyncing.value) return
  isSyncing.value = true

  try {
    // 通知 SW 清空旧的 API 缓存，让下一次请求拿最新数据
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_API_CACHE' })
    }

    // 依次执行注册的回调（各页面的数据刷新逻辑）
    await Promise.allSettled(onRecoverCallbacks.map(fn => fn()))

    markSynced()
    syncLabel.value = lastSyncLabel()
  } finally {
    isSyncing.value = false
  }
}

// ── 公共 API ──────────────────────────────────────────────────────────────────

export function useNetwork() {
  /**
   * 注册网络恢复回调（组件 onMounted 时调用，onUnmounted 时自动移除）
   */
  function onNetworkRecover(fn: () => void | Promise<void>) {
    onMounted(() => {
      onRecoverCallbacks.push(fn)
    })
    onUnmounted(() => {
      const idx = onRecoverCallbacks.indexOf(fn)
      if (idx !== -1) onRecoverCallbacks.splice(idx, 1)
    })
  }

  return {
    isOffline:  readonly(isOffline),
    isSyncing:  readonly(isSyncing),
    syncLabel,
    onNetworkRecover,
    triggerSync,
  }
}
