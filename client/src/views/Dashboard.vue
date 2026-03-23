<template>
  <div class="dashboard-page">
    <van-nav-bar title="管理驾驶舱" left-arrow @click-left="$router.back()" />

    <div class="dash-scroll">
      <!-- ── 统计卡片 ─────────────────────────────────────────────────── -->
      <div class="stats-grid">
        <div class="stat-card" style="--accent:#4caf50">
          <span class="stat-num">{{ data.stats.totalInStock }}</span>
          <span class="stat-label">总在库</span>
        </div>
        <div class="stat-card" style="--accent:#ff9800">
          <span class="stat-num">{{ data.stats.borrowed }}</span>
          <span class="stat-label">借出中</span>
        </div>
        <div class="stat-card" style="--accent:#f44336">
          <span class="stat-num">{{ data.stats.warnings }}</span>
          <span class="stat-label">异常预警</span>
        </div>
        <div class="stat-card" style="--accent:#1976d2">
          <span class="stat-num">{{ data.stats.weeklyInbound }}</span>
          <span class="stat-label">本周入库</span>
        </div>
      </div>

      <!-- ── 厂区新鲜度着色图 ─────────────────────────────────────────── -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-title">厂区数据状态</span>
          <div class="freshness-legend">
            <span class="fl-item"><span class="fl-dot" style="background:#4caf50"/>7天内</span>
            <span class="fl-item"><span class="fl-dot" style="background:#ff9800"/>7-30天</span>
            <span class="fl-item"><span class="fl-dot" style="background:#f44336"/>超30天</span>
          </div>
        </div>
        <MiniFloorMap
          color-mode="freshness"
          :highlight-room-id="highlightedRoom"
          :interactive="true"
          @room-click="onMapRoomClick"
        />
        <p v-if="highlightedRoom" class="map-hint">
          已高亮：{{ roomNameMap[highlightedRoom] ?? highlightedRoom }}
          <van-icon name="cross" size="12" color="#aaa" style="margin-left:6px;cursor:pointer" @click="highlightedRoom=''"/>
        </p>
      </div>

      <!-- ── 异常预警列表 ─────────────────────────────────────────────── -->
      <div class="section-card">
        <div class="section-header">
          <span class="section-title">异常预警</span>
          <van-tag type="danger" plain>{{ data.alerts.length }} 条</van-tag>
        </div>
        <van-cell-group inset>
          <van-cell
            v-for="alert in data.alerts"
            :key="alert.id"
            :title="alert.itemName"
            :label="`${alert.roomName} · ${alert.detail}`"
            clickable
            @click="onAlertClick(alert)"
          >
            <template #icon>
              <van-icon
                :name="alert.type === 'overdue' ? 'logistics' : 'warning-o'"
                :color="alert.level === 'critical' ? '#f44336' : '#ff9800'"
                size="20"
                style="margin-right:8px;margin-top:2px"
              />
            </template>
            <template #right-icon>
              <van-tag
                :type="alert.level === 'critical' ? 'danger' : 'warning'"
                plain
              >
                {{ alert.type === 'overdue' ? '借出' : '临期' }}
              </van-tag>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- ── 图表区域 ──────────────────────────────────────────────────── -->
      <div class="charts-row">
        <!-- 区域分布饼图 -->
        <div class="section-card chart-card">
          <div class="section-header">
            <span class="section-title">区域库存分布</span>
          </div>
          <div ref="pieRef" class="chart-canvas" />
        </div>

        <!-- 本周入库趋势柱状图 -->
        <div class="section-card chart-card">
          <div class="section-header">
            <span class="section-title">本周入库趋势</span>
          </div>
          <div ref="barRef" class="chart-canvas" />
        </div>
      </div>

      <div class="bottom-spacer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import MiniFloorMap from '@/components/MiniFloorMap.vue'
import { getDashboardData } from '@/services/mockDashboardData'
import type { AnomalyAlert } from '@/services/mockDashboardData'

// ECharts — tree-shakable imports
import * as echarts from 'echarts/core'
import { PieChart, BarChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([PieChart, BarChart, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

// ── Data ──────────────────────────────────────────────────────────────────────

const router = useRouter()
const data = getDashboardData()

// room id → name lookup for hint text
const roomNameMap: Record<string, string> = {
  training: '培训室', engineering: '工程部', printroom: '文印室',
  pantry: '茶水间', office1: '办公室1', reception: '前台',
  lab: '实验室', office2: '办公室2', microlab: '微生物实验室',
  restricted: '易制毒品储存室', office3: '办公室3', cold: '冷库',
  smallstore: '小库房', warehouse: '库房', kennel: '犬舍',
  finished: '成品间', cook: '蒸煮间', fill: '灌装间',
  emulsify: '乳化间', prep: '备料间', wash: '清洗间',
}

// ── Map highlight ──────────────────────────────────────────────────────────────

const highlightedRoom = ref('')

function onMapRoomClick(roomId: string) {
  highlightedRoom.value = highlightedRoom.value === roomId ? '' : roomId
}

function onAlertClick(alert: AnomalyAlert) {
  highlightedRoom.value = alert.roomId
  // Scroll to map section
  document.querySelector('.section-card')?.scrollIntoView({ behavior: 'smooth' })
}

// ── ECharts ───────────────────────────────────────────────────────────────────

const pieRef = ref<HTMLElement | null>(null)
const barRef = ref<HTMLElement | null>(null)
let pieChart: ReturnType<typeof echarts.init> | null = null
let barChart: ReturnType<typeof echarts.init> | null = null

function initPie() {
  if (!pieRef.value) return
  pieChart = echarts.init(pieRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}件 ({d}%)' },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
    series: [{
      type: 'pie',
      radius: ['38%', '65%'],
      center: ['50%', '42%'],
      label: { show: false },
      data: data.zoneDistribution.map(z => ({
        name: z.name,
        value: z.count,
        itemStyle: { color: z.color },
      })),
    }],
  })
}

function initBar() {
  if (!barRef.value) return
  barChart = echarts.init(barRef.value)
  barChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 28, right: 8, top: 12, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.weeklyInbound.map(d => d.date),
      axisLabel: { fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { fontSize: 9 },
    },
    series: [{
      type: 'bar',
      data: data.weeklyInbound.map(d => d.count),
      itemStyle: { color: '#1976d2', borderRadius: [3, 3, 0, 0] },
    }],
  })
}

function handleResize() {
  pieChart?.resize()
  barChart?.resize()
}

onMounted(() => {
  initPie()
  initBar()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  pieChart?.dispose()
  barChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.dash-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Stats grid ─────────────────────────────────────────────────────────────── */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-card {
  background: white;
  border-radius: 10px;
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  border-top: 3px solid var(--accent, #ccc);
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}

.stat-label {
  font-size: 10px;
  color: #888;
}

/* ── Section card ───────────────────────────────────────────────────────────── */

.section-card {
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

/* ── Freshness legend ───────────────────────────────────────────────────────── */

.freshness-legend {
  display: flex;
  gap: 8px;
}

.fl-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: #666;
}

.fl-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.map-hint {
  font-size: 11px;
  color: #888;
  margin: 8px 0 0;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Charts ─────────────────────────────────────────────────────────────────── */

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.chart-card {
  padding: 10px;
}

.chart-canvas {
  height: 160px;
  width: 100%;
}

/* ── Spacer ─────────────────────────────────────────────────────────────────── */

.bottom-spacer {
  height: 16px;
  flex-shrink: 0;
}
</style>
