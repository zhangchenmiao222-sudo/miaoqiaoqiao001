<template>
  <div class="mini-map-wrapper">
    <svg
      viewBox="0 0 400 530"
      class="mini-map-svg"
      :class="{ clickable: interactive }"
    >
      <!-- 地面 -->
      <rect x="0" y="0" width="400" height="530" fill="#c8c4bb" />

      <!-- 楼栋轮廓 -->
      <rect x="0"   y="0"   width="200" height="70"  fill="#ece8dc" stroke="#555" stroke-width="1.5" rx="2"/>
      <rect x="0"   y="110" width="140" height="158" fill="#ece8dc" stroke="#555" stroke-width="1.5" rx="2"/>
      <rect x="0"   y="290" width="50"  height="80"  fill="#ece8dc" stroke="#555" stroke-width="1.5" rx="2"/>
      <rect x="330" y="110" width="70"  height="260" fill="#ece8dc" stroke="#555" stroke-width="1.5" rx="2"/>
      <rect x="0"   y="400" width="280" height="130" fill="#ece8dc" stroke="#555" stroke-width="1.5" rx="2"/>

      <!-- 区域标签 -->
      <text x="255" y="36"  text-anchor="middle" font-size="7" fill="#999" font-weight="bold">办 公 区</text>
      <text x="70"  y="280" text-anchor="middle" font-size="7" fill="#666" font-weight="bold">实 验 室 区</text>
      <text x="365" y="160" text-anchor="middle" font-size="7" fill="#888" font-weight="bold">仓 储 区</text>
      <text x="140" y="412" text-anchor="middle" font-size="7" fill="#888" font-weight="bold">生 产 区</text>
      <text x="365" y="340" text-anchor="middle" font-size="7" fill="#888" font-weight="bold">犬 舍 区</text>

      <!-- 斜纹填充定义（受限区） -->
      <defs>
        <pattern id="hatch-mini" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#c62828" stroke-width="2" />
        </pattern>
      </defs>

      <!-- 房间 -->
      <g
        v-for="room in rooms"
        :key="room.id"
        :class="{ 'mini-room-group': interactive }"
        @click="interactive && $emit('room-click', room.id)"
      >
        <rect
          :x="room.x"
          :y="room.y"
          :width="room.width"
          :height="room.height"
          :fill="roomFill(room)"
          :stroke="room.id === highlightRoomId ? '#e53935' : '#666'"
          :stroke-width="room.id === highlightRoomId ? 2.5 : 1"
          rx="3"
        />
        <!-- 受限区纹理 -->
        <rect
          v-if="room.restricted"
          :x="room.x"
          :y="room.y"
          :width="room.width"
          :height="room.height"
          fill="url(#hatch-mini)"
          rx="3"
          opacity="0.25"
        />
        <!-- 房间名称 -->
        <text
          :x="room.x + room.width / 2"
          :y="room.y + room.height / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          :font-size="labelFontSize(room)"
          font-family="sans-serif"
          fill="#222"
          font-weight="600"
          pointer-events="none"
        >{{ room.name }}</text>

        <!-- 高亮脉冲圆环 -->
        <rect
          v-if="room.id === highlightRoomId"
          :x="room.x - 3"
          :y="room.y - 3"
          :width="room.width + 6"
          :height="room.height + 6"
          fill="none"
          stroke="#e53935"
          stroke-width="2"
          rx="5"
          class="mini-pulse-ring"
        />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import mapDataRaw from '@/assets/map-data.json'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Room {
  id: string
  name: string
  zone: string
  restricted?: boolean
  x: number
  y: number
  width: number
  height: number
  dataStatus: 'fresh' | 'stale' | 'expired'
  items: unknown[]
}

interface Zone {
  id: string
  name: string
  color: string
}

// ── Props / Emits ─────────────────────────────────────────────────────────────

const props = withDefaults(defineProps<{
  /** 着色模式: 'zone' = 区域色, 'freshness' = 数据新鲜度色 */
  colorMode?: 'zone' | 'freshness'
  /** 高亮某个房间（红色描边+脉冲） */
  highlightRoomId?: string
  /** 是否可交互（点击触发 room-click） */
  interactive?: boolean
}>(), {
  colorMode: 'freshness',
  highlightRoomId: '',
  interactive: false,
})

defineEmits<{ (e: 'room-click', roomId: string): void }>()

// ── Data ──────────────────────────────────────────────────────────────────────

const mapData = mapDataRaw as { zones: Zone[]; rooms: Room[] }
const rooms = mapData.rooms

// ── Helpers ───────────────────────────────────────────────────────────────────

function zoneColor(zoneId: string): string {
  return mapData.zones.find(z => z.id === zoneId)?.color ?? '#ccc'
}

function freshnessColor(s: string): string {
  if (s === 'fresh') return '#4caf50'
  if (s === 'stale') return '#ff9800'
  return '#f44336'
}

function roomFill(room: Room): string {
  const base = props.colorMode === 'freshness'
    ? freshnessColor(room.dataStatus)
    : zoneColor(room.zone)
  return base + 'aa'
}

function labelFontSize(room: Room): number {
  const chars = room.name.length
  const maxByWidth  = Math.floor((room.width  - 4) / (chars * 0.58))
  const maxByHeight = Math.floor((room.height - 8) / 1.4)
  return Math.min(Math.max(maxByWidth, 4), maxByHeight, 11)
}
</script>

<style scoped>
.mini-map-wrapper {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #c8c4bb;
}

.mini-map-svg {
  display: block;
  width: 100%;
  height: auto;
}

.mini-room-group {
  cursor: pointer;
}

.mini-room-group:active rect:first-child {
  opacity: 0.7;
}

.mini-pulse-ring {
  animation: miniPulse 1.2s ease-out infinite;
  pointer-events: none;
}

@keyframes miniPulse {
  0%   { opacity: 1; }
  100% { opacity: 0.2; }
}
</style>
