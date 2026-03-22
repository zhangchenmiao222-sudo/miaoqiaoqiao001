<template>
  <div class="scan-page">
    <van-nav-bar title="扫码" left-arrow @click-left="onBack" />

    <!-- 模式选择（未开始扫码时显示） -->
    <div v-if="phase === 'select'" class="mode-select">
      <p class="mode-title">请选择操作</p>
      <van-cell-group inset>
        <van-cell
          title="查看物品"
          label="扫描物品二维码，直接查看详情"
          icon="search"
          is-link
          @click="startMode('item')"
        />
        <van-cell
          title="更新位置"
          label="先扫库位码，再扫物品码，自动绑定（2步完成）"
          icon="location-o"
          is-link
          @click="startMode('location')"
        />
      </van-cell-group>
    </div>

    <!-- 进度指示（更新位置模式） -->
    <div v-if="mode === 'location' && phase !== 'select'" class="steps-bar">
      <van-steps :active="stepActive">
        <van-step>扫库位码</van-step>
        <van-step>扫物品码</van-step>
        <van-step>完成</van-step>
      </van-steps>
    </div>

    <!-- 扫码提示文字 -->
    <div v-if="phase === 'scan_location'" class="scan-hint">
      <van-icon name="location-o" size="18" color="#1989fa" />
      请将摄像头对准<b>库位二维码</b>
    </div>
    <div v-if="phase === 'scan_item'" class="scan-hint">
      <van-icon name="label-o" size="18" color="#07c160" />
      库位已确认：<b>{{ scannedLocation?.locationDetail }}</b><br />
      请扫描<b>物品二维码</b>
    </div>
    <div v-if="phase === 'scan_item_only'" class="scan-hint">
      <van-icon name="search" size="18" color="#1989fa" />
      请将摄像头对准<b>物品二维码</b>
    </div>

    <!-- 摄像头区域 -->
    <div v-show="['scan_location','scan_item','scan_item_only'].includes(phase)" class="qr-wrapper">
      <div id="qr-reader" />
    </div>

    <!-- 结果反馈 -->
    <div v-if="phase === 'done'" class="result-panel">
      <van-icon name="checked" size="64" color="#07c160" />
      <p class="result-title">位置更新成功！</p>
      <p class="result-desc">
        <b>{{ resultItem?.name }}</b><br />
        已移至 {{ resultItem?.locationDetail }}
      </p>
      <div class="result-actions">
        <van-button type="primary" block @click="startMode('location')">继续扫码</van-button>
        <van-button style="margin-top:10px" block @click="$router.push(`/item/${resultItem?.id}`)">查看详情</van-button>
      </div>
    </div>

    <div v-if="phase === 'error'" class="result-panel">
      <van-icon name="close" size="64" color="#ee0a24" />
      <p class="result-title">操作失败</p>
      <p class="result-desc">{{ errorMsg }}</p>
      <van-button type="primary" block @click="reset">重试</van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import { Html5Qrcode } from 'html5-qrcode';
import { getItem, updateItemLocation } from '@/services/api';
import type { Item } from '@shared/types';

// ============================================================
// QR 码格式约定：
//   库位码: loc:{zoneId}:{locationDetail}  例: loc:warehouse:B区-货架3
//   物品码: item:{itemId}                  例: item:2
// ============================================================

type Mode = 'item' | 'location';
type Phase = 'select' | 'scan_location' | 'scan_item' | 'scan_item_only' | 'done' | 'error';

const router = useRouter();
const mode = ref<Mode>('item');
const phase = ref<Phase>('select');
const stepActive = ref(0);
const scannedLocation = ref<{ zoneId: string; locationDetail: string } | null>(null);
const resultItem = ref<Item | null>(null);
const errorMsg = ref('');

let scanner: Html5Qrcode | null = null;

// ---- 启动模式 ----
async function startMode(m: Mode) {
  mode.value = m;
  phase.value = m === 'location' ? 'scan_location' : 'scan_item_only';
  stepActive.value = 0;
  await nextTick();
  startScanner();
}

// ---- 启动摄像头 ----
function startScanner() {
  scanner = new Html5Qrcode('qr-reader');
  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 260 },
    onScanSuccess,
    () => { /* 扫描失败忽略 */ },
  ).catch(() => {
    showToast('无法访问摄像头，请检查权限');
    phase.value = 'select';
  });
}

// ---- 停止摄像头 ----
async function stopScanner() {
  if (scanner) {
    await scanner.stop().catch(() => {});
    scanner = null;
  }
}

// ---- 扫码成功回调 ----
async function onScanSuccess(text: string) {
  await stopScanner();

  if (phase.value === 'scan_item_only') {
    // 查看物品模式：直接跳详情
    const itemId = parseItemCode(text);
    if (itemId) {
      router.push(`/item/${itemId}`);
    } else {
      // 未知格式也尝试当 id 处理
      router.push(`/item/${text}`);
    }
    return;
  }

  if (phase.value === 'scan_location') {
    const loc = parseLocationCode(text);
    if (!loc) {
      errorMsg.value = `无法识别库位码：${text}`;
      phase.value = 'error';
      return;
    }
    scannedLocation.value = loc;
    stepActive.value = 1;
    phase.value = 'scan_item';
    showToast('库位确认，请扫物品码');
    await nextTick();
    startScanner();
    return;
  }

  if (phase.value === 'scan_item') {
    const itemId = parseItemCode(text);
    if (!itemId) {
      errorMsg.value = `无法识别物品码：${text}`;
      phase.value = 'error';
      return;
    }
    stepActive.value = 2;
    await bindLocation(itemId);
  }
}

// ---- 解析库位码 ----
function parseLocationCode(text: string): { zoneId: string; locationDetail: string } | null {
  // 格式：loc:{zoneId}:{locationDetail}
  if (text.startsWith('loc:')) {
    const parts = text.slice(4).split(':');
    if (parts.length >= 2) {
      return { zoneId: parts[0], locationDetail: parts.slice(1).join(':') };
    }
  }
  return null;
}

// ---- 解析物品码 ----
function parseItemCode(text: string): string | null {
  if (text.startsWith('item:')) return text.slice(5);
  // 纯数字也当 id 处理
  if (/^\d+$/.test(text)) return text;
  return null;
}

// ---- 调用 API 绑定位置 ----
async function bindLocation(itemId: string) {
  if (!scannedLocation.value) return;
  try {
    const updated = await updateItemLocation(itemId, scannedLocation.value);
    resultItem.value = updated;
    phase.value = 'done';
  } catch (e: unknown) {
    errorMsg.value = (e as Error).message || '更新失败，请重试';
    phase.value = 'error';
  }
}

// ---- 重置 ----
function reset() {
  scannedLocation.value = null;
  resultItem.value = null;
  errorMsg.value = '';
  stepActive.value = 0;
  phase.value = 'select';
}

function onBack() {
  stopScanner();
  router.back();
}

onUnmounted(() => stopScanner());
</script>

<style scoped>
.scan-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.mode-select {
  padding: 24px 0;
}
.mode-title {
  text-align: center;
  font-size: 15px;
  color: #646566;
  margin-bottom: 12px;
}

.steps-bar {
  background: #fff;
  padding: 16px 24px 8px;
}

.scan-hint {
  background: #fff;
  padding: 10px 16px;
  font-size: 14px;
  color: #323233;
  line-height: 1.8;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid #ebedf0;
}

.qr-wrapper {
  padding: 12px;
  background: #000;
  display: flex;
  justify-content: center;
}

#qr-reader {
  width: 100%;
  max-width: 480px;
}

.result-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px 24px;
  text-align: center;
}
.result-title {
  font-size: 18px;
  font-weight: 600;
  margin: 16px 0 8px;
  color: #323233;
}
.result-desc {
  font-size: 14px;
  color: #646566;
  line-height: 1.8;
  margin-bottom: 24px;
}
.result-actions {
  width: 100%;
}
</style>
