<template>
  <div class="search-page">
    <van-nav-bar title="搜索" left-arrow @click-left="$router.back()" />

    <!-- 搜索框 + 麦克风按钮 -->
    <div class="search-bar-row">
      <van-search
        v-model="keyword"
        :placeholder="isDogMode ? '犬只编号搜索模式' : '搜索物品名称 / 拼音 / 别名'"
        autofocus
        show-action
        class="search-input"
        @search="doSearch"
        @update:model-value="onKeywordChange"
      >
        <template #action>
          <div @click="doSearch" style="color: #1989fa">搜索</div>
        </template>
      </van-search>
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

    <!-- 犬只模式标识 -->
    <div v-if="isDogMode" class="dog-mode-bar">
      <van-icon name="dog" color="#ff976a" />
      <span>犬只编号模式：将列出该犬只所有专属物品</span>
    </div>

    <!-- 录音波形 -->
    <div v-if="voiceState === 'recording'" class="wave-panel">
      <p class="wave-hint">松开结束录音</p>
      <div class="wave-bars">
        <div v-for="i in 7" :key="i" class="wave-bar" :style="{ height: `${getBarHeight(i)}px` }" />
      </div>
    </div>
    <div v-if="voiceState === 'processing'" class="wave-panel">
      <p class="wave-hint">正在识别语音...</p>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" style="padding: 32px; text-align: center">
      <van-loading type="spinner" color="#1989fa" />
    </div>

    <!-- ===== 犬只模式：分组展示 ===== -->
    <template v-else-if="isDogMode && searched && dogResult">
      <div class="dog-header">
        <van-icon name="dog" size="20" color="#ff976a" />
        <span>犬只 <b>{{ dogResult.dogId }}</b> 的专属物品（共 {{ dogTotalCount }} 件）</span>
      </div>
      <van-cell-group
        v-for="group in dogResult.groups"
        :key="group.category"
        inset
        :title="group.label"
        style="margin-top: 12px"
      >
        <van-cell
          v-for="item in group.items"
          :key="item.id"
          :title="item.name"
          :label="item.locationDetail"
          is-link
          :to="`/item/${item.id}`"
        >
          <template #right-icon>
            <van-tag :type="statusTagType(item.status)" style="margin-right: 8px">
              {{ STATUS_LABELS[item.status] }}
            </van-tag>
            <van-icon name="arrow" />
          </template>
        </van-cell>
      </van-cell-group>
    </template>

    <!-- 犬只模式：未找到 -->
    <van-empty
      v-else-if="isDogMode && searched && !dogResult"
      image="search"
      :description="`未找到犬只 ${keyword} 的关联物品`"
    />

    <!-- ===== 普通模式：搜索结果 ===== -->
    <template v-else-if="!isDogMode">
      <!-- Step3：无结果上下文提示 -->
      <div v-if="!loading && searched && results.length === 0 && voiceState === 'idle'" class="empty-ctx">
        <van-empty image="search" description="没有找到相关物品" />
        <div class="ctx-hints">
          <p class="ctx-title">试试这些方法</p>
          <van-cell-group inset>
            <van-cell title="换个关键词" label="尝试别名、拼音或口语化描述" icon="edit" is-link @click="clearSearch" />
            <van-cell title="切换到分类浏览" label="按区域或类别查找物品" icon="apps-o" is-link to="/browse" />
          </van-cell-group>
        </div>
      </div>
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
              {{ STATUS_LABELS[item.status] }}
            </van-tag>
            <van-icon name="arrow" />
          </template>
        </van-cell>
      </van-list>
    </template>

    <!-- 未搜索提示 -->
    <div v-if="!searched && voiceState === 'idle'" class="search-tips">
      <p class="tips-title">支持多种搜索方式</p>
      <van-cell-group inset>
        <van-cell title="犬只编号" label="输入 K-027 自动列出该犬只所有专属物品" icon="dog" />
        <van-cell title="语音" label="长按麦克风说出物品名称" icon="microphone-o" />
        <van-cell title="口语化" label="「那个量血的机器」→ 血常规分析仪" icon="chat-o" />
        <van-cell title="拼音" label="「xcfxy」→ 血常规分析仪" icon="font-o" />
      </van-cell-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { showToast } from 'vant';
import { searchItems, searchByDogId } from '@/services/api';
import { useFavoritesStore } from '@/stores/favorites';
import { useVoiceSearch } from '@/composables/useVoiceSearch';
import type { Item, ItemStatus, DogSearchResult } from '@shared/types';

const route = useRoute();
const favStore = useFavoritesStore();
const { voiceState, volumeLevel, startRecording, stopRecording, cancelRecording } = useVoiceSearch();

const keyword = ref((route.query.q as string) || '');
const results = ref<Item[]>([]);
const dogResult = ref<DogSearchResult | null>(null);
const loading = ref(false);
const finished = ref(false);
const searched = ref(false);
const currentPage = ref(1);
const PAGE_SIZE = 20;

// 犬只编号格式：K-xxx 或 k-xxx（大小写均支持）
const DOG_ID_RE = /^[Kk]-\d+$/;
const isDogMode = computed(() => DOG_ID_RE.test(keyword.value.trim()));
const dogTotalCount = computed(() =>
  dogResult.value?.groups.reduce((sum, g) => sum + g.items.length, 0) ?? 0,
);

function onKeywordChange(val: string) {
  // 切换模式时重置结果
  if (!DOG_ID_RE.test(val.trim())) {
    dogResult.value = null;
  }
}

// ---- 波形 ----
function getBarHeight(index: number): number {
  const base = [30, 50, 70, 90, 70, 50, 30][index - 1] ?? 40;
  const noise = (volumeLevel.value / 100) * 30;
  return base * (0.4 + (volumeLevel.value / 100) * 0.6) + (Math.random() * noise - noise / 2);
}

// ---- 麦克风 ----
async function onMicDown() { await startRecording(); }
async function onMicUp() {
  const text = await stopRecording();
  if (text) { keyword.value = text; showToast(`识别到：${text}`); await doSearch(); }
}
function onMicCancel() { cancelRecording(); }

// ---- 状态标签 ----
const STATUS_LABELS: Record<ItemStatus, string> = {
  in_stock: '在库', in_use: '使用中', transferred: '已转移',
  expired: '已过期', scrapped: '已报废',
};
const STATUS_TAG_TYPES: Record<ItemStatus, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
  in_stock: 'success', in_use: 'primary', transferred: 'warning',
  expired: 'danger', scrapped: 'default',
};
function statusTagType(s: ItemStatus) { return STATUS_TAG_TYPES[s] ?? 'default'; }

// ---- 搜索入口 ----
async function doSearch() {
  const kw = keyword.value.trim();
  if (!kw) return;
  favStore.addRecentSearch(kw);
  searched.value = true;
  loading.value = true;

  if (isDogMode.value) {
    // 犬只编号模式
    dogResult.value = null;
    results.value = [];
    try {
      dogResult.value = await searchByDogId(kw.toUpperCase());
    } catch {
      showToast(`未找到犬只 ${kw} 的关联物品`);
    } finally {
      loading.value = false;
    }
  } else {
    // 普通搜索模式
    results.value = [];
    currentPage.value = 1;
    finished.value = false;
    await fetchPage(1);
  }
}

async function loadMore() {
  if (!searched.value || finished.value || isDogMode.value) return;
  await fetchPage(currentPage.value + 1);
}

async function fetchPage(page: number) {
  loading.value = true;
  try {
    const res = await searchItems({ keyword: keyword.value, page, limit: PAGE_SIZE });
    if (page === 1) results.value = res.data;
    else results.value.push(...res.data);
    currentPage.value = page;
    finished.value = results.value.length >= res.total;
  } catch (e: unknown) {
    showToast((e as Error).message || '搜索失败，请重试');
    finished.value = true;
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  keyword.value = '';
  searched.value = false;
  results.value = [];
}

onMounted(() => { if (keyword.value) doSearch(); });
</script>

<style scoped>
.search-bar-row {
  display: flex; align-items: center;
  background: #fff; padding-right: 12px;
}
.search-input { flex: 1; }

.dog-mode-bar {
  background: #fff7f0; padding: 8px 16px;
  font-size: 13px; color: #ff976a;
  display: flex; align-items: center; gap: 6px;
  border-bottom: 1px solid #fde3d0;
}

.dog-header {
  padding: 12px 16px 4px;
  font-size: 14px; color: #323233;
  display: flex; align-items: center; gap: 6px;
}

.mic-btn {
  width: 40px; height: 40px; border-radius: 50%;
  background: #f2f3f5; display: flex; align-items: center;
  justify-content: center; cursor: pointer; flex-shrink: 0;
  transition: background 0.2s; user-select: none;
}
.mic-btn.recording { background: #ee0a24; animation: pulse 0.8s infinite; }
.mic-btn.processing { background: #1989fa; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }

.wave-panel { background: #fff; padding: 16px; text-align: center; border-bottom: 1px solid #ebedf0; }
.wave-hint { font-size: 13px; color: #969799; margin: 0 0 12px; }
.wave-bars { display: flex; align-items: center; justify-content: center; gap: 5px; height: 60px; }
.wave-bar { width: 5px; background: #ee0a24; border-radius: 3px; transition: height 0.15s ease; min-height: 6px; }

.search-tips { padding: 16px; }
.tips-title { font-size: 13px; color: #969799; margin-bottom: 8px; padding-left: 4px; }

.empty-ctx { padding-bottom: 16px; }
.ctx-hints { padding: 0 0 16px; }
.ctx-title { font-size: 13px; color: #969799; padding: 8px 16px 4px; }
</style>
