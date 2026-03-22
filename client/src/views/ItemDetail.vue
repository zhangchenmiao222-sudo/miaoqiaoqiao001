<template>
  <div class="item-detail">
    <van-nav-bar title="物品详情" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon
          v-if="item"
          :name="isFav ? 'star' : 'star-o'"
          :color="isFav ? '#ffd21e' : ''"
          size="22"
          @click="item && favStore.toggleFavorite(item)"
        />
      </template>
    </van-nav-bar>

    <van-loading v-if="loading" type="spinner" color="#1989fa" style="padding: 40px; text-align: center" />

    <van-empty v-else-if="error" image="error" :description="error" />

    <template v-else-if="item">
      <van-cell-group inset title="基本信息" style="margin-top: 12px">
        <van-cell title="名称" :value="item.name" />
        <van-cell title="分类" :value="CATEGORY_LABELS[item.category]" />
        <van-cell title="状态">
          <template #value>
            <van-tag :type="statusTagType(item.status)">{{ STATUS_LABELS[item.status] }}</van-tag>
          </template>
        </van-cell>
        <van-cell title="数量" :value="`${item.quantity} ${item.unit}`" />
      </van-cell-group>

      <van-cell-group inset title="位置信息" style="margin-top: 12px">
        <van-cell title="具体位置" :value="item.locationDetail" />
        <van-cell title="最后确认" :value="formatDate(item.lastVerifiedAt)" />
      </van-cell-group>

      <van-cell-group v-if="item.expiryDate" inset title="有效期" style="margin-top: 12px">
        <van-cell title="到期日期" :value="item.expiryDate">
          <template #value>
            <span :style="{ color: isExpiringSoon(item.expiryDate) ? '#ee0a24' : '' }">
              {{ item.expiryDate }}
              <span v-if="isExpiringSoon(item.expiryDate)"> ⚠️ 即将到期</span>
            </span>
          </template>
        </van-cell>
      </van-cell-group>

      <div style="padding: 16px">
        <van-button block type="primary" icon="map-marked" @click="goToMap">在地图上查看</van-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showToast } from 'vant';
import { getItem } from '@/services/api';
import { useFavoritesStore } from '@/stores/favorites';
import type { Item, ItemStatus, ItemCategory } from '@shared/types';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref('');
const item = ref<Item | null>(null);
const favStore = useFavoritesStore();
const isFav = computed(() => item.value ? favStore.isFavorite(item.value.id) : false);

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  reagent: '试剂',
  consumable: '耗材',
  equipment: '设备',
  tool: '工具',
  controlled: '管控品',
  feed: '饲料',
  office: '办公用品',
  spare_part: '备件',
};

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

function statusTagType(status: ItemStatus) {
  return STATUS_TAG_TYPES[status] ?? 'default';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN');
}

function isExpiringSoon(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 3600 * 1000; // 30天内
}

function goToMap() {
  router.push({ name: 'Map', query: { itemId: item.value?.id } });
}

onMounted(async () => {
  const id = route.params.id as string;
  try {
    item.value = await getItem(id);
  } catch (e: unknown) {
    error.value = (e as Error).message || '加载失败';
    showToast(error.value);
  } finally {
    loading.value = false;
  }
});
</script>
