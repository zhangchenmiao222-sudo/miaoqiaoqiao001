<template>
  <div class="onboarding">
    <!-- 顶部：跳过按钮 + 进度 -->
    <div class="ob-header">
      <span class="ob-progress">{{ currentStep + 1 }} / {{ steps.length }}</span>
      <span class="ob-skip" @click="finish">跳过</span>
    </div>

    <!-- 步骤内容 -->
    <div class="ob-body">
      <!-- Step 0: 欢迎 + 厂区地图概览 -->
      <template v-if="currentStep === 0">
        <div class="ob-icon">🏭</div>
        <h2 class="ob-title">欢迎来到厂区物资系统</h2>
        <p class="ob-desc">帮你快速找到任何物品的位置，全厂区一图掌握。</p>
        <div class="map-preview">
          <div v-for="zone in ZONES" :key="zone.id" class="map-zone" :style="zone.style">
            {{ zone.name }}
          </div>
        </div>
        <p class="ob-tip">点击区域可查看该区域物品</p>
      </template>

      <!-- Step 1: 搜索示范 -->
      <template v-if="currentStep === 1">
        <div class="ob-icon">🔍</div>
        <h2 class="ob-title">任何方式都能搜到</h2>
        <p class="ob-desc">支持口语化、拼音、别名搜索，3秒内找到目标。</p>
        <div class="demo-search">
          <van-search
            v-model="demoKeyword"
            placeholder="试试输入「双面胶」"
            @search="onDemoSearch"
            show-action
          >
            <template #action>
              <span @click="onDemoSearch" style="color:#1989fa">搜索</span>
            </template>
          </van-search>
          <div v-if="demoSearched" class="demo-result">
            <van-cell title="泡棉胶带" label="库房 - B区 - 货架3" is-link icon="success" />
            <p class="demo-tip">✅ 「双面胶」→ 找到「泡棉胶带」</p>
          </div>
          <div v-else class="demo-examples">
            <van-tag plain type="primary" @click="demoKeyword='双面胶'">双面胶</van-tag>
            <van-tag plain type="primary" @click="demoKeyword='xcfxy'">xcfxy（拼音首字母）</van-tag>
            <van-tag plain type="primary" @click="demoKeyword='量血'">量血（口语化）</van-tag>
          </div>
        </div>
        <p v-if="!demoSearched" class="ob-tip">完成一次搜索即可继续 👆</p>
      </template>

      <!-- Step 2: 分类浏览示范 -->
      <template v-if="currentStep === 2">
        <div class="ob-icon">📂</div>
        <h2 class="ob-title">按区域或类别浏览</h2>
        <p class="ob-desc">不知道搜什么？直接浏览所有物品。</p>
        <van-cell-group inset class="demo-browse">
          <van-cell title="🏭 生产区" label="备料间 / 蒸煮间 / 灌装间…" is-link />
          <van-cell title="🧪 实验室" label="试剂 / 耗材 / 检测设备" is-link />
          <van-cell title="📦 仓储区" label="库房 / 小库房 / 冷库" is-link />
          <van-cell title="🏢 办公区" label="办公室 / 文印室 / 会议室" is-link />
          <van-cell title="🐕 犬舍" label="犬粮 / 专属物品" is-link />
        </van-cell-group>
        <van-button
          type="primary"
          size="small"
          plain
          style="margin-top: 12px"
          @click="$router.push('/browse')"
        >
          立即体验分类浏览 →
        </van-button>
      </template>

      <!-- Step 3: 扫码体验 -->
      <template v-if="currentStep === 3">
        <div class="ob-icon">📷</div>
        <h2 class="ob-title">扫码 2 步更新位置</h2>
        <p class="ob-desc">扫库位码 → 扫物品码，自动完成位置绑定，全程不超过 5 秒。</p>
        <div class="demo-qr">
          <div class="demo-qr-card">
            <div class="qr-placeholder">
              <van-icon name="scan" size="48" color="#969799" />
              <p>示范库位码</p>
              <code>loc:warehouse:B区-货架3</code>
            </div>
          </div>
          <van-icon name="arrow" size="20" color="#c8c9cc" style="margin: 0 8px" />
          <div class="demo-qr-card">
            <div class="qr-placeholder">
              <van-icon name="scan" size="48" color="#969799" />
              <p>示范物品码</p>
              <code>item:2</code>
            </div>
          </div>
        </div>
        <van-button
          type="primary"
          size="small"
          plain
          style="margin-top: 16px"
          @click="$router.push('/scan')"
        >
          立即体验扫码 →
        </van-button>
      </template>
    </div>

    <!-- 底部操作 -->
    <div class="ob-footer">
      <van-button v-if="currentStep > 0" plain @click="prev">上一步</van-button>
      <van-button
        v-if="currentStep < steps.length - 1"
        type="primary"
        :disabled="currentStep === 1 && !demoSearched"
        @click="next"
      >
        下一步
      </van-button>
      <van-button v-else type="primary" @click="finish">开始使用 🚀</van-button>
    </div>

    <!-- 步骤点 -->
    <div class="ob-dots">
      <span
        v-for="(_, i) in steps"
        :key="i"
        class="dot"
        :class="{ active: i === currentStep }"
        @click="currentStep = i"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const ONBOARDING_KEY = 'onboarding_done';

const steps = ['map', 'search', 'browse', 'scan'];
const currentStep = ref(0);
const demoKeyword = ref('');
const demoSearched = ref(false);

// 厂区地图简要预览数据
const ZONES = [
  { id: 'production', name: '生产区', style: { background: '#e8f4ff', gridArea: '1/1/2/2' } },
  { id: 'lab',        name: '实验室', style: { background: '#fff3e0', gridArea: '1/2/2/3' } },
  { id: 'warehouse',  name: '仓储区', style: { background: '#e8f5e9', gridArea: '2/1/3/2' } },
  { id: 'office',     name: '办公区', style: { background: '#fce4ec', gridArea: '2/2/3/3' } },
  { id: 'kennel',     name: '犬舍',  style: { background: '#f3e5f5', gridArea: '1/3/3/4' } },
];

function onDemoSearch() {
  if (demoKeyword.value.trim()) {
    demoSearched.value = true;
  }
}

function next() {
  if (currentStep.value < steps.length - 1) currentStep.value++;
}

function prev() {
  if (currentStep.value > 0) currentStep.value--;
}

function finish() {
  localStorage.setItem(ONBOARDING_KEY, '1');
  router.replace('/');
}
</script>

<style scoped>
.onboarding {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.ob-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 8px;
}
.ob-progress { font-size: 13px; color: #969799; }
.ob-skip { font-size: 14px; color: #1989fa; cursor: pointer; }

.ob-body {
  flex: 1;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ob-icon { font-size: 56px; margin: 8px 0; }
.ob-title { font-size: 20px; font-weight: 700; color: #323233; margin: 8px 0; text-align: center; }
.ob-desc { font-size: 14px; color: #646566; text-align: center; margin-bottom: 16px; line-height: 1.7; }
.ob-tip { font-size: 13px; color: #969799; margin-top: 12px; text-align: center; }

/* 地图预览 */
.map-preview {
  display: grid;
  grid-template-columns: 1fr 1fr 0.8fr;
  grid-template-rows: 1fr 1fr;
  gap: 4px;
  width: 100%;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebedf0;
}
.map-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #323233;
}

/* 搜索示范 */
.demo-search { width: 100%; }
.demo-examples { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 16px; }
.demo-result { padding: 8px 0; width: 100%; }
.demo-tip { font-size: 13px; color: #07c160; padding: 4px 16px; }

/* 分类浏览 */
.demo-browse { width: 100%; }

/* 扫码示范 */
.demo-qr {
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: center;
  margin-top: 8px;
}
.demo-qr-card {
  flex: 1;
  max-width: 140px;
}
.qr-placeholder {
  border: 2px dashed #c8c9cc;
  border-radius: 8px;
  padding: 16px 8px;
  text-align: center;
  color: #969799;
}
.qr-placeholder p { font-size: 12px; margin: 6px 0 4px; }
.qr-placeholder code { font-size: 10px; word-break: break-all; }

/* 底部按钮 */
.ob-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  justify-content: flex-end;
}
.ob-footer .van-button { min-width: 100px; }

/* 步骤点 */
.ob-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding-bottom: 20px;
}
.dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #ebedf0;
  cursor: pointer;
  transition: background 0.2s;
}
.dot.active { background: #1989fa; width: 20px; border-radius: 4px; }
</style>
