<template>
  <div class="search-page">
    <van-nav-bar title="搜索" left-arrow @click-left="$router.back()" />
    <van-search v-model="keyword" placeholder="搜索物品" autofocus @search="doSearch" />
    <van-list>
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

const route = useRoute();
const keyword = ref((route.query.q as string) || '');
const results = ref<Item[]>([]);

function doSearch() {
  // TODO: call API
}

onMounted(() => {
  if (keyword.value) doSearch();
});
</script>
