import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { Item } from '@shared/types';

const STORAGE_KEY = 'favorites';
const RECENT_KEY = 'recent_searches';
const MAX_RECENT = 10;

export const useFavoritesStore = defineStore('favorites', () => {
  // 收藏：存储完整 Item 对象，方便离线展示
  const favorites = ref<Item[]>(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

  // 最近搜索关键词
  const recentSearches = ref<string[]>(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'));

  // 持久化
  watch(favorites, (val) => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)), { deep: true });
  watch(recentSearches, (val) => localStorage.setItem(RECENT_KEY, JSON.stringify(val)));

  function isFavorite(id: string) {
    return favorites.value.some((f) => f.id === id);
  }

  function toggleFavorite(item: Item) {
    const idx = favorites.value.findIndex((f) => f.id === item.id);
    if (idx >= 0) {
      favorites.value.splice(idx, 1);
    } else {
      favorites.value.unshift(item);
    }
  }

  function addRecentSearch(keyword: string) {
    const k = keyword.trim();
    if (!k) return;
    const list = recentSearches.value.filter((r) => r !== k);
    list.unshift(k);
    recentSearches.value = list.slice(0, MAX_RECENT);
  }

  function clearRecentSearches() {
    recentSearches.value = [];
  }

  return { favorites, recentSearches, isFavorite, toggleFavorite, addRecentSearch, clearRecentSearches };
});
