import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, Role, PermissionLevel } from '@shared/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));

  // 从 localStorage 恢复用户信息
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      user.value = JSON.parse(savedUser);
    } catch {
      localStorage.removeItem('user');
    }
  }

  const isLoggedIn = computed(() => !!token.value);
  const userRole = computed<Role | null>(() => user.value?.role ?? null);
  const userPermissions = computed<PermissionLevel | null>(() => user.value?.permissions ?? null);

  function setAuth(u: User, t: string) {
    user.value = u;
    token.value = t;
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /** 检查当前用户是否拥有指定权限等级 */
  function hasPermission(required: PermissionLevel): boolean {
    const levels: PermissionLevel[] = ['view', 'edit', 'manage'];
    const userLevel = user.value?.permissions;
    if (!userLevel) return false;
    return levels.indexOf(userLevel) >= levels.indexOf(required);
  }

  return { user, token, isLoggedIn, userRole, userPermissions, setAuth, logout, hasPermission };
});
