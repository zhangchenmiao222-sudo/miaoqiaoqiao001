import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';

import 'vant/lib/index.css';
import './styles/global.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');

// ── Service Worker 注册 ───────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[SW] Registered, scope:', reg.scope)

        // 新版本 SW 等待时，提示用户刷新（可在 UI 层扩展）
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available — send SKIP_WAITING to activate')
              // 可在此处弹出「发现新版本，点击刷新」的提示
            }
          })
        })
      })
      .catch(err => console.warn('[SW] Registration failed:', err))
  })
}
