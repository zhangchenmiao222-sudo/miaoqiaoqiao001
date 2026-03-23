<template>
  <div class="browse-page">
    <van-nav-bar title="分类浏览" left-arrow @click-left="$router.back()" />

    <!-- 顶部 Tab：按区域 / 按类别 -->
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="按区域" name="zone" />
      <van-tab title="按类别" name="category" />
    </van-tabs>

    <!-- ========== 按区域 ========== -->
    <template v-if="activeTab === 'zone'">
      <van-cell-group
        v-for="zone in ZONES"
        :key="zone.id"
        inset
        :title="zone.name"
        style="margin-top: 12px"
      >
        <template v-if="zoneItems[zone.id]?.length">
          <van-cell
            v-for="item in zoneItems[zone.id]"
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
        </template>
        <van-cell v-else-if="zoneLoading[zone.id]" title="加载中...">
          <template #right-icon><van-loading size="16" /></template>
        </van-cell>
        <van-cell v-else title="暂无物品" title-style="color:#969799" />
      </van-cell-group>
    </template>

    <!-- ========== 按类别 ========== -->
    <template v-if="activeTab === 'category'">
      <van-cell-group
        v-for="cat in CATEGORIES"
        :key="cat.id"
        inset
        :title="cat.label"
        style="margin-top: 12px"
      >
        <template v-if="categoryItems[cat.id]?.length">
          <van-cell
            v-for="item in categoryItems[cat.id]"
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
        </template>
        <van-cell v-else-if="catLoading[cat.id]" title="加载中...">
          <template #right-icon><van-loading size="16" /></template>
        </van-cell>
        <van-cell v-else title="暂无物品" title-style="color:#969799" />
      </van-cell-group>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { getItemsByFilter } from '@/services/api';
import type { Item, ItemCategory, ItemStatus } from '@shared/types';

// ---- 区域定义（5大区域）----
const ZONES = [
  { id: 'production', name: '生产区' },
  { id: 'lab',        name: '实验室' },
  { id: 'warehouse',  name: '仓储区' },
  { id: 'office',     name: '办公区' },
  { id: 'kennel',     name: '犬舍' },
];

// ---- 类别定义（6大分类）----
const CATEGORIES: { id: ItemCategory; label: string }[] = [
  { id: 'reagent',    label: '试剂耗材' },
  { id: 'consumable', label: '耗材' },
  { id: 'equipment',  label: '设备工具' },
  { id: 'tool',       label: '工具' },
  { id: 'office',     label: '办公用品' },
  { id: 'feed',       label: '犬粮成品' },
];

// ---- 状态 ----
const STATUS_LABELS: Record<ItemStatus, string> = {
  in_stock: '在库', in_use: '使用中', transferred: '已转移',
  expired: '已过期', scrapped: '已报废',
};
const STATUS_TAG: Record<ItemStatus, 'success' | 'primary' | 'warning' | 'danger' | 'default'> = {
  in_stock: 'success', in_use: 'primary', transferred: 'warning',
  expired: 'danger', scrapped: 'default',
};
function statusTagType(s: ItemStatus) { return STATUS_TAG[s] ?? 'default'; }

// ---- Tab ----
const activeTab = ref<'zone' | 'category'>('zone');

// ---- 区域物品 ----
const zoneItems = ref<Record<string, Item[]>>({});
const zoneLoading = ref<Record<string, boolean>>({});

async function loadZoneItems() {
  for (const zone of ZONES) {
    if (zoneItems.value[zone.id]) continue; // 已加载过
    zoneLoading.value[zone.id] = true;
    try {
      const res = await getItemsByFilter({ zoneId: zone.id, limit: 50 });
      zoneItems.value[zone.id] = res.data;
    } catch {
      zoneItems.value[zone.id] = [];
    } finally {
      zoneLoading.value[zone.id] = false;
    }
  }
}

// ---- 类别物品 ----
const categoryItems = ref<Record<string, Item[]>>({});
const catLoading = ref<Record<string, boolean>>({});

async function loadCategoryItems() {
  for (const cat of CATEGORIES) {
    if (categoryItems.value[cat.id]) continue;
    catLoading.value[cat.id] = true;
    try {
      const res = await getItemsByFilter({ category: cat.id, limit: 50 });
      categoryItems.value[cat.id] = res.data;
    } catch {
      categoryItems.value[cat.id] = [];
    } finally {
      catLoading.value[cat.id] = false;
    }
  }
}

// ---- 切 Tab 时按需加载 ----
watch(activeTab, (val) => {
  if (val === 'zone') loadZoneItems();
  else loadCategoryItems();
});

onMounted(() => loadZoneItems());
</script>

<style scoped>
.browse-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 20px;
}
</style>
