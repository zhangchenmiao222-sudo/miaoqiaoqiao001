import { createRouter, createWebHistory } from 'vue-router';

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
      path: '/browse',
      name: 'Browse',
      component: () => import('@/views/Browse.vue'),
    },
    {
      path: '/onboarding',
      name: 'Onboarding',
      component: () => import('@/views/Onboarding.vue'),
    },
  ],
});

export default router;
