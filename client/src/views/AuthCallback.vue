<template>
  <div class="auth-callback">
    <van-loading v-if="loading" size="48px" vertical>登录中...</van-loading>
    <van-empty v-else-if="error" :description="error">
      <van-button type="primary" @click="retry">重新登录</van-button>
    </van-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { parseAuthCallback, redirectToLarkAuth } from '@/utils/lark-auth';
import http from '@/services/api';

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    // 1. 从 URL 解析授权码
    const result = parseAuthCallback(window.location.search);
    if (!result) {
      error.value = '授权失败：未获取到授权码';
      loading.value = false;
      return;
    }

    // 2. 将授权码发送到后端换取 JWT
    const { data } = await http.post('/auth/login', { code: result.code });

    // 3. 保存登录状态
    authStore.setAuth(data.user, data.token);

    // 4. 跳转首页
    router.replace('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败，请重试';
    loading.value = false;
  }
});

function retry() {
  redirectToLarkAuth();
}
</script>

<style scoped>
.auth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
</style>
