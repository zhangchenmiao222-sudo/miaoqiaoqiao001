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
      <!-- Step3：位置过期提示（超7天未确认） -->
      <div v-if="isStale" class="stale-banner">
        <van-icon name="warning-o" color="#ff976a" />
        <span>位置信息已超 <b>{{ staledays }}</b> 天未确认，请核实</span>
        <span class="stale-action" @click="scrollToPhoto">去拍照更新</span>
      </div>

      <!-- Step2：位置参考照片 -->
      <div v-if="item.imageUrl" class="photo-section">
        <p class="photo-label">位置参考照片</p>
        <van-image :src="item.imageUrl" width="100%" fit="cover" radius="8" style="max-height: 240px" />
        <p class="photo-tip">照片由上次更新者拍摄，可作为位置参考</p>
      </div>

      <!-- 基本信息 -->
      <van-cell-group inset title="基本信息" style="margin-top: 12px">
        <van-cell title="名称" :value="item.name" />
        <van-cell title="分类" :value="CATEGORY_LABELS[item.category]" />
        <van-cell title="状态">
          <template #value>
            <van-tag :type="statusTagType(item.status)">{{ STATUS_LABELS[item.status] }}</van-tag>
          </template>
        </van-cell>
        <van-cell title="数量" :value="`${item.quantity} ${item.unit}`" />
        <van-cell v-if="item.dogId" title="关联犬只" :value="item.dogId" />
      </van-cell-group>

      <!-- 位置信息 -->
      <van-cell-group inset title="位置信息" style="margin-top: 12px">
        <van-cell title="具体位置" :value="item.locationDetail" />
        <van-cell title="最后确认">
          <template #value>
            <span :style="{ color: isStale ? '#ff976a' : '' }">{{ formatDate(item.lastVerifiedAt) }}</span>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 有效期 -->
      <van-cell-group v-if="item.expiryDate" inset title="有效期" style="margin-top: 12px">
        <van-cell title="到期日期">
          <template #value>
            <span :style="{ color: isExpiringSoon(item.expiryDate) ? '#ee0a24' : '' }">
              {{ item.expiryDate }}<span v-if="isExpiringSoon(item.expiryDate)"> ⚠️ 即将到期</span>
            </span>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 操作区 -->
      <div class="actions" ref="photoSectionRef">
        <!-- Step3：在地图上查看 -->
        <van-button block plain type="primary" icon="map-marked" @click="goToMap">
          在地图上查看
        </van-button>

        <!-- Step2：拍照更新位置 -->
        <van-button
          block type="primary" icon="photograph"
          style="margin-top: 10px"
          :loading="uploading" loading-text="上传中..."
          @click="triggerPhoto"
        >
          拍照更新位置
        </van-button>
        <!-- H5替代 tt.chooseImage：input file + capture -->
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          capture="environment"
          style="display: none"
          @change="onPhotoSelected"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { showToast, showSuccessToast } from 'vant';
import { getItem, uploadItemPhoto } from '@/services/api';
import { useFavoritesStore } from '@/stores/favorites';
import type { Item, ItemStatus, ItemCategory } from '@shared/types';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref('');
const item = ref<Item | null>(null);
const uploading = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const photoSectionRef = ref<HTMLElement | null>(null);

const favStore = useFavoritesStore();
const isFav = computed(() => item.value ? favStore.isFavorite(item.value.id) : false);

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  reagent: '试剂', consumable: '耗材', equipment: '设备', tool: '工具',
  controlled: '管控品', feed: '饲料', office: '办公用品', spare_part: '备件',
};
const STATUS_LABELS: Record<ItemStatus, string> = {
  in_stock: '在库', in_use: '使用中', transferred: '已转移', expired: '已过期', scrapped: '已报废',
};
const STATUS_TAG_TYPES: Record<ItemStatus, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
  in_stock: 'success', in_use: 'primary', transferred: 'warning', expired: 'danger', scrapped: 'default',
};
function statusTagType(s: ItemStatus) { return STATUS_TAG_TYPES[s] ?? 'default'; }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('zh-CN'); }
function isExpiringSoon(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 3600 * 1000;
}

// Step3：过期天数
const STALE_DAYS = 7;
const staledays = computed(() =>
  item.value ? Math.floor((Date.now() - new Date(item.value.lastVerifiedAt).getTime()) / 86400000) : 0
);
const isStale = computed(() => staledays.value > STALE_DAYS);

function scrollToPhoto() {
  photoSectionRef.value?.scrollIntoView({ behavior: 'smooth' });
}

// Step3：地图查看（非侵入 toast 提示联调状态）
function goToMap() {
  showToast({ message: '正在跳转地图定位…', position: 'bottom' });
  router.push({ name: 'Map', query: { itemId: item.value?.id } });
}

// Step2：拍照更新
function triggerPhoto() { fileInputRef.value?.click(); }

async function onPhotoSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !item.value) return;
  uploading.value = true;
  try {
    const res = await uploadItemPhoto(item.value.id, file);
    item.value = res.item;
    showSuccessToast('照片上传成功！位置记录已更新');
  } catch (err: unknown) {
    showToast((err as Error).message || '上传失败，请重试');
  } finally {
    uploading.value = false;
    if (fileInputRef.value) fileInputRef.value.value = '';
  }
}

onMounted(async () => {
  const id = route.params.id as string;
  try {
    item.value = await getItem(id);
  } catch (e: unknown) {
    error.value = (e as Error).message || '加载失败';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.stale-banner {
  background: #fff7f0; border-bottom: 1px solid #fde3d0;
  padding: 10px 16px; font-size: 13px; color: #ff976a;
  display: flex; align-items: center; gap: 6px;
}
.stale-action { margin-left: auto; color: #1989fa; cursor: pointer; white-space: nowrap; }

.photo-section { padding: 12px 16px 0; }
.photo-label { font-size: 12px; color: #969799; margin-bottom: 6px; }
.photo-tip { font-size: 12px; color: #c8c9cc; text-align: center; margin-top: 4px; }

.actions { padding: 16px; }
</style>
