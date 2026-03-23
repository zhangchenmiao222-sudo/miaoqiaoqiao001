<template>
  <transition name="banner-slide">
    <div v-if="isOffline || isSyncing" class="offline-banner" :class="{ syncing: isSyncing }">
      <span class="banner-icon">{{ isSyncing ? '🔄' : '📶' }}</span>
      <span class="banner-text">
        <template v-if="isSyncing">正在同步最新数据…</template>
        <template v-else>离线数据，仅供参考 · {{ syncLabel }}</template>
      </span>
      <span v-if="!isSyncing" class="banner-tag">离线</span>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useNetwork } from '@/composables/useNetwork'

const { isOffline, isSyncing, syncLabel } = useNetwork()
</script>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #ff9800;
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.offline-banner.syncing {
  background: #1677ff;
}

.banner-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.banner-text {
  flex: 1;
}

.banner-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.7);
  flex-shrink: 0;
}

.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
