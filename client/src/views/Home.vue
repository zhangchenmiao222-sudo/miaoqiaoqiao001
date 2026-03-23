<template>
  <div class="home">
    <!-- 顶部搜索框 -->
    <div class="search-header">
      <van-search
        v-model="keyword"
        placeholder="搜索物品名称 / 拼音 / 别名"
        @search="onSearch"
        @focus="onSearchFocus"
      />
    </div>

    <!-- 功能快捷入口 -->
    <van-grid :column-num="5" :border="false" class="quick-nav">
      <van-grid-item icon="scan" text="扫码" to="/scan" />
      <van-grid-item icon="search" text="搜索" to="/search" />
      <van-grid-item icon="map-marked" text="地图" to="/map" />
      <van-grid-item icon="apps-o" text="浏览" to="/browse" />
      <van-grid-item icon="flag-o" text="测验" to="/quiz" />
    </van-grid>

    <!-- 收藏物品 -->
    <template v-if="favStore.favorites.length > 0">
      <div class="section-header">
        <span>我的收藏</span>
      </div>
      <van-cell-group inset>
        <van-cell
          v-for="item in favStore.favorites"
          :key="item.id"
          :title="item.name"
          :label="item.locationDetail"
          is-link
          :to="`/item/${item.id}`"
          icon="star"
        />
      </van-cell-group>
    </template>

    <!-- 最近搜索 -->
    <template v-if="favStore.recentSearches.length > 0">
      <div class="section-header">
        <span>最近搜索</span>
        <span class="section-action" @click="favStore.clearRecentSearches()">清空</span>
      </div>
      <div class="recent-tags">
        <van-tag
          v-for="kw in favStore.recentSearches"
          :key="kw"
          type="default"
          plain
          class="recent-tag"
          @click="onSearch(kw)"
        >
          {{ kw }}
        </van-tag>
      </div>
    </template>

    <!-- 常找物品快捷入口 -->
    <div class="section-header">
      <span>常找物品</span>
      <span class="section-action" @click="restartOnboarding">新手引导</span>
    </div>
    <van-cell-group inset>
      <van-cell title="试剂耗材" icon="logistics" label="实验室区域" is-link to="/search?category=reagent" />
      <van-cell title="设备工具" icon="setting-o" label="工程部 / 各区域" is-link to="/search?category=equipment" />
      <van-cell title="办公用品" icon="records-o" label="文印室 / 办公区" is-link to="/search?category=office" />
      <van-cell title="犬粮饲料" icon="gift-o" label="成品间 / 冷库" is-link to="/search?category=feed" />
    </van-cell-group>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFavoritesStore } from '@/stores/favorites';

const ONBOARDING_KEY = 'onboarding_done';

const router = useRouter();
const keyword = ref('');
const favStore = useFavoritesStore();

function onSearch(kw?: string) {
  const q = (kw ?? keyword.value).trim();
  if (!q) return;
  favStore.addRecentSearch(q);
  router.push({ name: 'Search', query: { q } });
}

function onSearchFocus() {
  router.push({ name: 'Search' });
}

function restartOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
  router.push({ name: 'Onboarding' });
}

// 新用户首次打开自动进入引导
onMounted(() => {
  if (!localStorage.getItem(ONBOARDING_KEY)) {
    router.replace({ name: 'Onboarding' });
  }
});
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: #f7f8fa;
}

.search-header {
  background: #fff;
  padding-bottom: 4px;
}

.quick-nav {
  margin: 8px 0;
  background: #fff;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 6px;
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}

.section-action {
  font-size: 12px;
  color: #969799;
  font-weight: normal;
  cursor: pointer;
}

.recent-tags {
  padding: 4px 12px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recent-tag {
  cursor: pointer;
}
</style>
