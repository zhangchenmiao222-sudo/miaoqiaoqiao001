<template>
  <div class="search-page">
    <van-nav-bar title="搜索" left-arrow @click-left="$router.back()" />

    <!-- 搜索框 + 麦克风按钮 -->
    <div class="search-bar-row">
      <van-search
        v-model="keyword"
        placeholder="搜索物品名称 / 拼音 / 别名"
        autofocus
        show-action
        class="search-input"
        @search="doSearch"
      >
        <template #action>
          <div @click="doSearch" style="color: #1989fa">搜索</div>
        </template>
      </van-search>

      <!-- 麦克风按钮 -->
      <div
        class="mic-btn"
        :class="{ recording: voiceState === 'recording', processing: voiceState === 'processing' }"
        @mousedown="onMicDown"
        @mouseup="onMicUp"
        @touchstart.prevent="onMicDown"
        @touchend.prevent="onMicUp"
        @touchcancel.prevent="onMicCancel"
      >
        <van-icon v-if="voiceState === 'idle' || voiceState === 'error'" name="microphone-o" size="22" />
        <van-loading v-else-if="voiceState === 'processing'" size="22" color="#fff" />
        <van-icon v-else name="microphone" size="22" color="#fff" />
      </div>
    </div>

    <!-- 录音中：波形动画提示 -->
    <div v-if="voiceState === 'recording'" class="wave-panel">
      <p class="wave-hint">松开结束录音</p>
      <div class="wave-bars">
        <div
          v-for="i in 7"
          :key="i"
          class="wave-bar"
          :style="{ height: `${getBarHeight(i)}px` }"
        />
      </div>
    </div>

    <!-- 识别中提示 -->
    <div v-if="voiceState === 'processing'" class="wave-panel">
      <p class="wave-hint">正在识别语音...</p>
    </div>

    <!-- 空状态提示 -->
    <van-empty
      v-if="!loading && searched && results.length === 0 && voiceState === 'idle'"
      image="search"
      description="没有找到相关物品"
    />

    <!-- 搜索结果 -->
    <van-list
      v-model:loading="loading"
      :finished="finished"
      finished-text="已显示全部结果"
      @load="loadMore"
    >
      <van-cell
        v-for="item in results"
        :key="item.id"
        :title="item.name"
        :label="item.locationDetail"
        is-link
        :to="`/item/${item.id}`"
      >
        <template #right-icon>
          <van-tag :type="statusTagType(item.status)" style="margin-right: 8px">
            {{ statusLabel(item.status) }}
          </van-tag>
          <van-icon name="arrow" />
        </template>
      </van-cell>
    </van-list>

    <!-- 未搜索时显示使用提示 -->
    <div v-if="!searched && voiceState === 'idle'" class="search-tips">
      <p class="tips-title">支持多种搜索方式</p>
      <van-cell-group inset>
        <van-cell title="语音" label="长按麦克风说出物品名称" icon="microphone-o" />
        <van-cell title="口语化" label="「那个量血的机器」→ 血常规分析仪" icon="chat-o" />
        <van-cell title="别名" label="「双面胶」→ 泡棉胶带" icon="label-o" />
        <van-cell title="拼音" label="「xcfxy」→ 血常规分析仪" icon="font-o" />
      </van-cell-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { showToast } from 'vant';
import { searchItems } from '@/services/api';
import { useFavoritesStore } from '@/stores/favorites';
import { useVoiceSearch } from '@/composables/useVoiceSearch';
import type { Item, ItemStatus } from '@shared/types';

const route = useRoute();
const favStore = useFavoritesStore();
const { voiceState, volumeLevel, startRecording, stopRecording, cancelRecording } = useVoiceSearch();

const keyword = ref((route.query.q as string) || '');
const results = ref<Item[]>([]);
const loading = ref(false);
const finished = ref(false);
const searched = ref(false);
const currentPage = ref(1);
const PAGE_SIZE = 20;

// ---- 波形动画 ----
function getBarHeight(index: number): number {
  const base = [30, 50, 70, 90, 70, 50, 30][index - 1] ?? 40;
  const noise = (volumeLevel.value / 100) * 30;
  return base * (0.4 + (volumeLevel.value / 100) * 0.6) + (Math.random() * noise - noise / 2);
}

// ---- 麦克风长按交互 ----
async function onMicDown() {
  await startRecording();
}

async function onMicUp() {
  const text = await stopRecording();
  if (text) {
    keyword.value = text;
    showToast(`识别到：${text}`);
    await doSearch();
  }
}

function onMicCancel() {
  cancelRecording();
}

// ---- 状态标签 ----
const STATUS_LABELS: Record<ItemStatus, string> = {
  in_stock: '在库',
  in_use: '使用中',
  transferred: '已转移',
  expired: '已过期',
  scrapped: '已报废',
};

const STATUS_TAG_TYPES: Record<ItemStatus, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
  in_stock: 'success',
  in_use: 'primary',
  transferred: 'warning',
  expired: 'danger',
  scrapped: 'default',
};

function statusLabel(status: ItemStatus) {
  return STATUS_LABELS[status] ?? status;
}

function statusTagType(status: ItemStatus) {
  return STATUS_TAG_TYPES[status] ?? 'default';
}

// ---- 搜索逻辑 ----
async function doSearch() {
  if (!keyword.value.trim()) return;
  favStore.addRecentSearch(keyword.value.trim());
  searched.value = true;
  results.value = [];
  currentPage.value = 1;
  finished.value = false;
  await fetchPage(1);
}

async function loadMore() {
  if (!searched.value || finished.value) return;
  await fetchPage(currentPage.value + 1);
}

async function fetchPage(page: number) {
  loading.value = true;
  try {
    const res = await searchItems({ keyword: keyword.value, page, limit: PAGE_SIZE });
    if (page === 1) {
      results.value = res.data;
    } else {
      results.value.push(...res.data);
    }
    currentPage.value = page;
    finished.value = results.value.length >= res.total;
  } catch (e: unknown) {
    showToast((e as Error).message || '搜索失败，请重试');
    finished.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (keyword.value) doSearch();
});
</script>

<style scoped>
.search-bar-row {
  display: flex;
  align-items: center;
  background: #fff;
  padding-right: 12px;
}

.search-input {
  flex: 1;
}

.mic-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f2f3f5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
  user-select: none;
}

.mic-btn.recording {
  background: #ee0a24;
  animation: pulse 0.8s infinite;
}

.mic-btn.processing {
  background: #1989fa;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}

/* 波形面板 */
.wave-panel {
  background: #fff;
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid #ebedf0;
}

.wave-hint {
  font-size: 13px;
  color: #969799;
  margin: 0 0 12px;
}

.wave-bars {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 60px;
}

.wave-bar {
  width: 5px;
  background: #ee0a24;
  border-radius: 3px;
  transition: height 0.15s ease;
  min-height: 6px;
}

.search-tips {
  padding: 16px;
}

.tips-title {
  font-size: 13px;
  color: #969799;
  margin-bottom: 8px;
  padding-left: 4px;
}
</style>
