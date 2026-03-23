import { createRouter, createWebHistory } from 'vue-router';
import { isLoggedIn } from '@/utils/lark-auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/views/Home.vue'),
    },
    {
      path: '/search',
      name: 'Search',
      component: () => import('@/views/Search.vue'),
    },
    {
      path: '/map',
      name: 'Map',
      component: () => import('@/views/Map.vue'),
    },
    {
      path: '/item/:id',
      name: 'ItemDetail',
      component: () => import('@/views/ItemDetail.vue'),
    },
    {
      path: '/scan',
      name: 'Scan',
      component: () => import('@/views/Scan.vue'),
    },
    {
      path: '/auth/callback',
      name: 'AuthCallback',
      component: () => import('@/views/AuthCallback.vue'),
      meta: { public: true },
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/quiz',
      name: 'Quiz',
      component: () => import('@/views/Quiz.vue'),
    },
    {
      path: '/apply',
      name: 'ApplyControlled',
      component: () => import('@/views/ApplyControlled.vue'),
    },
  ],
});

// 路由守卫：未登录自动跳转登录页
router.beforeEach((to) => {
  if (to.meta.public) return true;
  if (!isLoggedIn()) {
    return { name: 'Login' };
  }
  return true;
});

export default router;
