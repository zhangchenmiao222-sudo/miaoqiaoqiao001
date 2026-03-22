<template>
  <div class="quiz-page">
    <van-nav-bar title="厂区认知小测验" left-arrow @click-left="$router.back()" />

    <!-- 完成界面 -->
    <div v-if="phase === 'done'" class="done-panel">
      <div class="done-icon">🎉</div>
      <h2 class="done-title">测验完成！</h2>
      <p class="done-score">得分 <b>{{ score }}</b> / {{ questions.length }}</p>
      <div class="star-row">
        <span v-for="i in 3" :key="i" class="star" :class="{ lit: i <= stars }">⭐</span>
      </div>
      <p class="done-desc">{{ doneMessage }}</p>

      <!-- 已点亮区域汇总 -->
      <div class="lit-zones">
        <p class="lit-title">你已掌握的区域</p>
        <div class="mini-map">
          <div
            v-for="zone in ZONES"
            :key="zone.id"
            class="mini-zone"
            :style="zone.gridStyle"
            :class="{ lit: litZones.has(zone.id) }"
          >
            {{ zone.name }}
          </div>
        </div>
      </div>

      <div class="done-actions">
        <van-button type="primary" block @click="startQuiz">再玩一次</van-button>
        <van-button style="margin-top: 10px" block plain @click="$router.push('/')">回到首页</van-button>
      </div>
    </div>

    <!-- 答题界面 -->
    <template v-else-if="phase === 'quiz'">
      <!-- 进度条 -->
      <div class="progress-bar">
        <van-progress
          :percentage="Math.round((currentIdx / questions.length) * 100)"
          stroke-width="6"
          :show-pivot="false"
          color="#1989fa"
        />
        <span class="progress-text">{{ currentIdx + 1 }} / {{ questions.length }}</span>
      </div>

      <!-- 问题卡片 -->
      <div class="question-card">
        <p class="question-tag">{{ currentQ.category }}</p>
        <h3 class="question-text">「{{ currentQ.item }}」在哪个区域？</h3>
        <p class="question-hint">点击地图上的区域作答</p>
      </div>

      <!-- 交互式地图 -->
      <div class="map-grid">
        <div
          v-for="zone in ZONES"
          :key="zone.id"
          class="map-zone"
          :style="zone.gridStyle"
          :class="{
            correct: answerState === 'correct' && zone.id === currentQ.zoneId,
            wrong:   answerState === 'wrong'   && zone.id === selectedZone,
            hint:    answerState === 'wrong'   && zone.id === currentQ.zoneId,
            lit:     litZones.has(zone.id) && answerState === 'idle',
          }"
          @click="selectZone(zone.id)"
        >
          <span class="zone-name">{{ zone.name }}</span>
          <span v-if="answerState === 'correct' && zone.id === currentQ.zoneId" class="zone-badge">✓</span>
          <span v-if="answerState === 'wrong' && zone.id === currentQ.zoneId" class="zone-badge hint-badge">→</span>
        </div>
      </div>

      <!-- 答题反馈 -->
      <div v-if="answerState !== 'idle'" class="feedback-bar" :class="answerState">
        <span v-if="answerState === 'correct'">✅ 正确！{{ currentQ.item }} 在{{ currentQ.zoneName }}，区域已点亮</span>
        <span v-else>❌ 答错了，正确答案是「{{ currentQ.zoneName }}」</span>
        <van-button
          size="small"
          :type="answerState === 'correct' ? 'success' : 'primary'"
          style="margin-left: auto"
          @click="nextQuestion"
        >
          {{ currentIdx < questions.length - 1 ? '下一题' : '查看结果' }}
        </van-button>
      </div>

      <!-- 得分角标 -->
      <div class="score-badge">得分 {{ score }} ⭐</div>
    </template>

    <!-- 开始界面 -->
    <div v-else class="start-panel">
      <div class="start-icon">🏭</div>
      <h2 class="start-title">厂区认知小测验</h2>
      <p class="start-desc">通过回答「物品在哪个区域」来熟悉厂区布局，答对即可点亮该区域地图！</p>

      <!-- 历史进度 -->
      <van-cell-group v-if="hasSavedProgress" inset title="上次记录" style="margin-bottom: 16px">
        <van-cell title="已点亮区域" :value="`${litZones.size} / ${ZONES.length} 个`" />
        <van-cell title="历史最高分" :value="`${bestScore} 分`" />
      </van-cell-group>

      <div class="mini-map" style="margin-bottom: 20px">
        <div
          v-for="zone in ZONES"
          :key="zone.id"
          class="mini-zone"
          :style="zone.gridStyle"
          :class="{ lit: litZones.has(zone.id) }"
        >{{ zone.name }}</div>
      </div>

      <van-button type="primary" block size="large" @click="startQuiz">开始测验</van-button>
      <van-button v-if="hasSavedProgress" plain block style="margin-top: 10px" @click="resetProgress">
        重置进度
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { showToast } from 'vant';

// ---- 存储 Key ----
const STORAGE_KEY = 'quiz_progress';

// ---- 厂区区域（复用 zones 数据） ----
const ZONES = [
  { id: 'production', name: '生产区', gridStyle: { gridArea: '1/1/2/2', background: '#e8f4ff' } },
  { id: 'lab',        name: '实验室', gridStyle: { gridArea: '1/2/2/3', background: '#fff3e0' } },
  { id: 'warehouse',  name: '仓储区', gridStyle: { gridArea: '2/1/3/2', background: '#e8f5e9' } },
  { id: 'office',     name: '办公区', gridStyle: { gridArea: '2/2/3/3', background: '#fce4ec' } },
  { id: 'kennel',     name: '犬舍',   gridStyle: { gridArea: '1/3/3/4', background: '#f3e5f5' } },
];
const ZONE_NAME: Record<string, string> = Object.fromEntries(ZONES.map((z) => [z.id, z.name]));

// ---- 题库 ----
interface Question { item: string; zoneId: string; zoneName: string; category: string }
const QUESTION_BANK: Question[] = [
  { item: '搅拌机',      zoneId: 'production', zoneName: '生产区', category: '设备' },
  { item: '灌装线',      zoneId: 'production', zoneName: '生产区', category: '设备' },
  { item: '血常规分析仪', zoneId: 'lab',        zoneName: '实验室', category: '检测设备' },
  { item: '试剂柜',      zoneId: 'lab',        zoneName: '实验室', category: '存储' },
  { item: '乙醇溶液',    zoneId: 'lab',        zoneName: '实验室', category: '试剂' },
  { item: '货架（库房）', zoneId: 'warehouse',  zoneName: '仓储区', category: '设施' },
  { item: '泡棉胶带',    zoneId: 'warehouse',  zoneName: '仓储区', category: '耗材' },
  { item: '打印纸',      zoneId: 'office',     zoneName: '办公区', category: '办公用品' },
  { item: '考勤机',      zoneId: 'office',     zoneName: '办公区', category: '设备' },
  { item: '犬粮K-027',   zoneId: 'kennel',     zoneName: '犬舍',   category: '饲料' },
  { item: '犬只健康档案', zoneId: 'kennel',     zoneName: '犬舍',   category: '档案' },
  { item: '扭矩扳手',    zoneId: 'production', zoneName: '生产区', category: '工具' },
];

// ---- 状态 ----
type Phase = 'start' | 'quiz' | 'done';
type AnswerState = 'idle' | 'correct' | 'wrong';

const phase = ref<Phase>('start');
const questions = ref<Question[]>([]);
const currentIdx = ref(0);
const score = ref(0);
const selectedZone = ref('');
const answerState = ref<AnswerState>('idle');
const litZones = ref<Set<string>>(new Set());
const bestScore = ref(0);

const currentQ = computed(() => questions.value[currentIdx.value] ?? QUESTION_BANK[0]);
const hasSavedProgress = computed(() => litZones.value.size > 0 || bestScore.value > 0);

const stars = computed(() => {
  const ratio = score.value / questions.value.length;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.6) return 2;
  return 1;
});
const doneMessage = computed(() => {
  if (stars.value === 3) return '太棒了！你对厂区了如指掌 🏆';
  if (stars.value === 2) return '不错！再练练就能全部掌握 💪';
  return '继续加油，熟悉厂区需要多走走 🚶';
});

// ---- 进度持久化 ----
function loadProgress() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  const { lit, best } = JSON.parse(saved) as { lit: string[]; best: number };
  litZones.value = new Set(lit);
  bestScore.value = best;
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    lit: Array.from(litZones.value),
    best: bestScore.value,
  }));
}

function resetProgress() {
  litZones.value = new Set();
  bestScore.value = 0;
  localStorage.removeItem(STORAGE_KEY);
  showToast('进度已重置');
}

// ---- 游戏逻辑 ----
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function startQuiz() {
  questions.value = shuffle(QUESTION_BANK).slice(0, 8);
  currentIdx.value = 0;
  score.value = 0;
  answerState.value = 'idle';
  selectedZone.value = '';
  phase.value = 'quiz';
}

function selectZone(zoneId: string) {
  if (answerState.value !== 'idle') return;
  selectedZone.value = zoneId;

  if (zoneId === currentQ.value.zoneId) {
    answerState.value = 'correct';
    score.value++;
    litZones.value = new Set([...litZones.value, zoneId]);
  } else {
    answerState.value = 'wrong';
  }
}

function nextQuestion() {
  if (currentIdx.value < questions.value.length - 1) {
    currentIdx.value++;
    answerState.value = 'idle';
    selectedZone.value = '';
  } else {
    // 更新最高分并保存
    if (score.value > bestScore.value) bestScore.value = score.value;
    saveProgress();
    phase.value = 'done';
  }
}

onMounted(loadProgress);
</script>

<style scoped>
.quiz-page { min-height: 100vh; background: #f7f8fa; }

/* 进度条 */
.progress-bar { padding: 12px 16px 4px; display: flex; align-items: center; gap: 10px; background: #fff; }
.progress-text { font-size: 12px; color: #969799; white-space: nowrap; }

/* 问题卡片 */
.question-card {
  margin: 12px 16px; background: #fff; border-radius: 12px;
  padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.06);
}
.question-tag { font-size: 11px; color: #1989fa; background: #e8f4ff; display: inline-block; padding: 2px 8px; border-radius: 10px; margin-bottom: 8px; }
.question-text { font-size: 18px; font-weight: 700; color: #323233; margin: 0 0 6px; }
.question-hint { font-size: 12px; color: #969799; margin: 0; }

/* 地图网格 */
.map-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 0.8fr;
  grid-template-rows: 1fr 1fr;
  gap: 6px;
  margin: 0 16px 12px;
  height: 200px;
}
.map-zone {
  border-radius: 10px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; cursor: pointer;
  position: relative; transition: all 0.2s; border: 2px solid transparent;
  user-select: none;
}
.map-zone:active { transform: scale(0.96); }
.zone-name { font-size: 13px; font-weight: 600; color: #323233; }
.zone-badge { position: absolute; top: 4px; right: 6px; font-size: 14px; }
.hint-badge { color: #07c160; }

/* 答题状态 */
.map-zone.correct { border-color: #07c160; background: #e8f5e9 !important; animation: pop 0.3s ease; }
.map-zone.wrong   { border-color: #ee0a24; background: #ffeded !important; }
.map-zone.hint    { border-color: #07c160; animation: pulse-hint 0.5s ease 2; }
.map-zone.lit     { border-color: #1989fa; box-shadow: 0 0 0 2px rgba(25,137,250,.2); }

@keyframes pop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
@keyframes pulse-hint { 0%,100%{opacity:1} 50%{opacity:0.5} }

/* 反馈条 */
.feedback-bar {
  margin: 0 16px; padding: 10px 14px; border-radius: 8px;
  font-size: 13px; display: flex; align-items: center; gap: 8px;
}
.feedback-bar.correct { background: #e8f5e9; color: #07c160; }
.feedback-bar.wrong   { background: #ffeded; color: #ee0a24; }

/* 得分角标 */
.score-badge {
  position: fixed; top: 60px; right: 16px;
  background: #fff; border: 1px solid #ebedf0;
  padding: 4px 10px; border-radius: 12px;
  font-size: 12px; color: #323233; box-shadow: 0 2px 6px rgba(0,0,0,.1);
}

/* 开始/完成面板 */
.start-panel, .done-panel {
  padding: 32px 20px 20px; display: flex; flex-direction: column; align-items: center;
}
.start-icon, .done-icon { font-size: 64px; margin-bottom: 8px; }
.start-title, .done-title { font-size: 22px; font-weight: 700; color: #323233; margin: 0 0 8px; }
.start-desc { font-size: 14px; color: #646566; text-align: center; line-height: 1.7; margin-bottom: 20px; }
.done-score { font-size: 20px; color: #323233; margin: 4px 0; }
.done-desc { font-size: 14px; color: #646566; margin: 8px 0 16px; text-align: center; }
.done-actions { width: 100%; margin-top: 16px; }

/* 星星 */
.star-row { display: flex; gap: 8px; margin: 8px 0; }
.star { font-size: 28px; filter: grayscale(1); transition: filter 0.3s; }
.star.lit { filter: none; }

/* 已点亮区域 */
.lit-zones { width: 100%; margin-top: 16px; }
.lit-title { font-size: 13px; color: #969799; text-align: center; margin-bottom: 8px; }

/* 小地图（开始/完成页） */
.mini-map {
  display: grid;
  grid-template-columns: 1fr 1fr 0.8fr;
  grid-template-rows: 1fr 1fr;
  gap: 4px;
  width: 100%;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebedf0;
}
.mini-zone {
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; color: #969799;
  transition: all 0.3s; filter: grayscale(0.6);
}
.mini-zone.lit { filter: none; color: #323233; box-shadow: inset 0 0 0 2px #1989fa; }
</style>
