<template>
  <div class="item-detail">
    <van-nav-bar title="物品详情" left-arrow @click-left="$router.back()" />
    <van-loading v-if="loading" />
    <template v-else-if="item">
      <van-cell-group title="基本信息">
        <van-cell title="名称" :value="item.name" />
        <van-cell title="分类" :value="item.category" />
        <van-cell title="状态" :value="item.status" />
        <van-cell title="位置" :value="item.locationDetail" />
        <van-cell title="数量" :value="`${item.quantity} ${item.unit}`" />
      </van-cell-group>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { Item } from '@shared/types';

const route = useRoute();
const loading = ref(true);
const item = ref<Item | null>(null);

onMounted(async () => {
  const id = route.params.id as string;
  // TODO: fetch item by id
  loading.value = false;
});
</script>
