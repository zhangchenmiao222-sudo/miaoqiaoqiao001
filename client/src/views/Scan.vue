<template>
  <div class="scan-page">
    <van-nav-bar title="扫码" left-arrow @click-left="$router.back()" />
    <div id="qr-reader" class="qr-reader"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Html5Qrcode } from 'html5-qrcode';

const router = useRouter();
let scanner: Html5Qrcode | null = null;

onMounted(async () => {
  scanner = new Html5Qrcode('qr-reader');
  try {
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        scanner?.stop();
        // TODO: parse QR and navigate
        router.push(`/item/${decodedText}`);
      },
      () => {
        // scan error - ignore
      },
    );
  } catch {
    // camera permission denied
  }
});

onUnmounted(() => {
  scanner?.stop().catch(() => {});
});
</script>

<style scoped>
.qr-reader {
  width: 100%;
  max-width: 500px;
  margin: 20px auto;
}
</style>
