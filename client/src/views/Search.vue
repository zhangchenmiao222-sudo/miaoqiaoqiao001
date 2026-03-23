<template>
  <div class="search-page">
    <van-nav-bar title="搜索" left-arrow @click-left="$router.back()" />
    <van-search v-model="keyword" placeholder="搜索物品" autofocus @search="doSearch" />
    <van-notice-bar
      v-if="fromCache || isOffline"
      left-icon="warning-o"
      text="离线数据，仅供参考，网络恢复后将自动刷新"
      background="#fff7e6"
      color="#ff9800"
    />

    <van-loading v-if="loading" size="24px" vertical style="margin-top:40px">搜索中…</van-loading>

    <van-list v-else>
      <van-empty v-if="!results.length && keyword" description="未找到相关物品" />
      <van-cell
        v-for="item in results"
        :key="item.id"
        :title="item.name"
        :label="item.locationDetail"
        is-link
        :to="`/item/${item.id}`"
      />
    </van-list>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { Item } from '@shared/types';
import { searchItems } from '@/services/api';
import {
  getCachedItemSearch,
  cacheItemSearch,
  pushSearchHistory,
} from '@/utils/cache';
import { useNetwork } from '@/composables/useNetwork';

const route    = useRoute();
const keyword  = ref((route.query.q as string) || '');
const results  = ref<Item[]>([]);
const loading  = ref(false);
const fromCache = ref(false);

const { isOffline, onNetworkRecover } = useNetwork();

async function doSearch() {
  const q = keyword.value.trim();
  if (!q) return;

  loading.value   = true;
  fromCache.value = false;
  const params    = { keyword: q };

  try {
    const res  = await searchItems(params);
    results.value = res.data;
    cacheItemSearch(params, res);   // 缓存本次结果
    pushSearchHistory(q);
  } catch {
    // 网络失败 → 回落本地缓存
    const cached = getCachedItemSearch<{ data: Item[] }>(params);
    if (cached) {
      results.value  = cached.data;
      fromCache.value = true;
    } else {
      results.value = [];
    }
  } finally {
    loading.value = false;
  }
}

// 网络恢复后自动重新搜索
onNetworkRecover(() => {
  if (keyword.value.trim()) doSearch();
});

onMounted(() => {
  if (keyword.value) doSearch();
});
</script>
