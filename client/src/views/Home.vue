<template>
  <div class="home">
    <h1>厂区智能物资定位</h1>
    <van-search v-model="keyword" placeholder="搜索物品名称/编号" @search="onSearch" />
    <van-grid :column-num="4" :border="false">
      <van-grid-item icon="scan" text="扫码" to="/scan" />
      <van-grid-item icon="search" text="搜索" to="/search" />
      <van-grid-item icon="map-marked" text="地图" to="/map" />
      <van-grid-item icon="apps-o" text="浏览" to="/browse" />
    </van-grid>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const keyword = ref('');

function onSearch() {
  if (keyword.value.trim()) {
    router.push({ name: 'Search', query: { q: keyword.value } });
  }
}
</script>
