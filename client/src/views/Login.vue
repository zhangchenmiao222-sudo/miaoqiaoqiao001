<template>
  <div class="login-page">
    <div class="login-card">
      <img class="logo" src="@/assets/logo.svg" alt="logo" onerror="this.style.display='none'" />
      <h1 class="title">厂区智能物资定位系统</h1>
      <p class="subtitle">妙巧巧（山西）技术发展有限公司</p>
      <van-button
        type="primary"
        block
        size="large"
        class="login-btn"
        @click="handleLogin"
      >
        飞书账号登录
      </van-button>
      <p class="tip">点击后将跳转到飞书授权页面</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { redirectToLarkAuth } from '@/utils/lark-auth';

function handleLogin() {
  redirectToLarkAuth();
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 48px 32px;
  text-align: center;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.logo {
  width: 72px;
  height: 72px;
  margin-bottom: 20px;
}

.title {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 14px;
  color: #999;
  margin: 0 0 36px;
}

.login-btn {
  border-radius: 8px;
}

.tip {
  font-size: 12px;
  color: #bbb;
  margin-top: 16px;
}
</style>
