<template>
  <div class="map-page">
    <van-nav-bar title="厂区地图" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon
          name="guide-o"
          size="18"
          :color="routeMode ? '#1976d2' : '#666'"
          style="margin-right:12px"
          @click="toggleRouteMode"
        />
        <van-icon name="search" size="18" @click="toggleSearch" />
      </template>
    </van-nav-bar>

    <!-- 搜索栏 -->
    <transition name="slide-down">
      <van-search
        v-if="showSearch"
        v-model="searchQuery"
        placeholder="搜索房间名或物品名称…"
        autofocus
        @search="onSearch"
        @clear="clearHighlight"
        @cancel="showSearch = false"
        show-action
      />
    </transition>

    <!-- 图例 -->
    <div class="legend-bar">
      <span v-for="zone in mapData.zones" :key="zone.id" class="legend-item">
        <span class="legend-dot" :style="{ background: zone.color }" />
        {{ zone.name }}
      </span>
      <span class="legend-sep" />
      <span class="legend-item"><span class="legend-dot" style="background:#4caf50" />新鲜</span>
      <span class="legend-item"><span class="legend-dot" style="background:#ff9800" />较旧</span>
      <span class="legend-item"><span class="legend-dot" style="background:#f44336" />过期</span>
    </div>

    <!-- SVG 地图容器 -->
    <div
      ref="containerRef"
      class="map-container"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="stopDrag"
      @mouseleave="stopDrag"
      @wheel.prevent="onWheel"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend.prevent="onTouchEnd"
    >
      <svg
        :width="VP_W"
        :height="VP_H"
        :viewBox="`0 0 ${VP_W} ${VP_H}`"
        class="factory-svg"
        :style="svgStyle"
      >
        <!-- 地面（室外） -->
        <rect x="0" y="0" :width="VP_W" :height="VP_H" fill="#c8c4bb" />

        <!-- 楼栋1: 培训室/工程部/文印室 (顶部) -->
        <rect x="0" y="0" width="200" height="70" fill="#ece8dc" stroke="#555" stroke-width="1.5" rx="2"/>
        <!-- 楼栋2: 实验/办公区 (中部左侧) -->
        <rect x="0" y="110" width="140" height="158" fill="#ece8dc" stroke="#555" stroke-width="1.5" rx="2"/>
        <!-- 楼栋3: 冷库/小库房 (左下) -->
        <rect x="0" y="290" width="50" height="80" fill="#ece8dc" stroke="#555" stroke-width="1.5" rx="2"/>
        <!-- 楼栋4: 库房/犬舍 (右侧) -->
        <rect x="330" y="110" width="70" height="260" fill="#ece8dc" stroke="#555" stroke-width="1.5" rx="2"/>
        <!-- 楼栋5: 生产区 (底部) -->
        <rect x="0" y="400" width="280" height="130" fill="#ece8dc" stroke="#555" stroke-width="1.5" rx="2"/>

        <!-- 区域标签（空地区域）-->
        <text x="255" y="36"  text-anchor="middle" font-size="7" fill="#999" font-weight="bold">办 公 区</text>
        <text x="70"  y="280" text-anchor="middle" font-size="7" fill="#666" font-weight="bold">实 验 室 区</text>
        <text x="365" y="160" text-anchor="middle" font-size="7" fill="#888" font-weight="bold">仓 储 区</text>
        <text x="140" y="412" text-anchor="middle" font-size="7" fill="#888" font-weight="bold">生 产 区</text>
        <text x="365" y="340" text-anchor="middle" font-size="7" fill="#888" font-weight="bold">犬 舍 区</text>

        <!-- 总面积标注 -->
        <text x="255" y="220" text-anchor="middle" font-size="6" fill="#aaa">厂区总面积：1012.39 m²</text>

        <!-- 房间 -->
        <g
          v-for="room in mapData.rooms"
          :key="room.id"
          class="room-group"
          @click="onRoomClick(room)"
        >
          <!-- 房间主体 -->
          <rect
            :x="room.x"
            :y="room.y"
            :width="room.width"
            :height="room.height"
            :fill="roomFill(room)"
            :stroke="isHighlighted(room) ? '#e53935' : isSelected(room) ? '#1976d2' : '#666'"
            :stroke-width="isHighlighted(room) || isSelected(room) ? 2.5 : 1.5"
            rx="4"
            :class="{ 'room-blink': isHighlighted(room) }"
          />

          <!-- 数据新鲜度色条（底部） -->
          <rect
            :x="room.x + 4"
            :y="room.y + room.height - 5"
            :width="room.width - 8"
            height="3"
            :fill="statusColor(room.dataStatus)"
            rx="1.5"
          />

          <!-- 限制区蒙层纹理 -->
          <rect
            v-if="room.restricted"
            :x="room.x"
            :y="room.y"
            :width="room.width"
            :height="room.height"
            fill="url(#hatch)"
            rx="4"
            opacity="0.25"
          />

          <!-- 房间名称 -->
          <text
            :x="room.x + room.width / 2"
            :y="room.y + room.height / 2 - (room.subLabel ? 9 : 0)"
            text-anchor="middle"
            dominant-baseline="middle"
            :font-size="labelFontSize(room)"
            font-family="sans-serif"
            fill="#222"
            font-weight="600"
            pointer-events="none"
          >{{ room.name }}</text>

          <!-- 副标签（限制提示） -->
          <text
            v-if="room.subLabel"
            :x="room.x + room.width / 2"
            :y="room.y + room.height / 2 + 10"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="8"
            font-family="sans-serif"
            fill="#c62828"
            pointer-events="none"
          >{{ room.subLabel }}</text>

          <!-- 物品数量角标 -->
          <g v-if="room.items && room.items.length > 0">
            <circle
              :cx="room.x + room.width - 11"
              :cy="room.y + 11"
              r="9"
              fill="#1976d2"
            />
            <text
              :x="room.x + room.width - 11"
              :y="room.y + 11"
              text-anchor="middle"
              dominant-baseline="middle"
              font-size="8"
              fill="white"
              font-weight="bold"
              pointer-events="none"
            >{{ room.items.length }}</text>
          </g>

          <!-- 高亮脉冲圆环 -->
          <rect
            v-if="isHighlighted(room)"
            :x="room.x - 4"
            :y="room.y - 4"
            :width="room.width + 8"
            :height="room.height + 8"
            fill="none"
            stroke="#e53935"
            stroke-width="2"
            rx="6"
            class="pulse-ring"
          />
        </g>

        <!-- 斜纹填充定义（限制区） -->
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#c62828" stroke-width="2" />
          </pattern>
        </defs>

        <!-- 动线路径 -->
        <polyline
          v-if="routeMode && optimizedRoute.length >= 2"
          :points="optimizedRoute.map(r => `${roomCenterX(r)},${roomCenterY(r)}`).join(' ')"
          fill="none"
          stroke="#1976d2"
          stroke-width="2.5"
          stroke-dasharray="8,5"
          stroke-linecap="round"
          opacity="0.85"
        />

        <!-- 路线停靠点编号徽章 -->
        <g v-for="(room, idx) in optimizedRoute" :key="room.id + '-routebadge'">
          <circle
            :cx="roomCenterX(room)"
            :cy="roomCenterY(room)"
            r="10"
            fill="#1976d2"
            stroke="white"
            stroke-width="1.5"
          />
          <text
            :x="roomCenterX(room)"
            :y="roomCenterY(room)"
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="8"
            fill="white"
            font-weight="bold"
            pointer-events="none"
          >{{ idx + 1 }}</text>
        </g>

        <!-- 指北针（中部空地区域） -->
        <g transform="translate(245, 60)">
          <circle cx="0" cy="0" r="15" fill="white" stroke="#aaa" stroke-width="1" opacity="0.9"/>
          <polygon points="0,-12 4,5 0,1 -4,5" fill="#e53935" />
          <polygon points="0,12 4,-5 0,-1 -4,-5" fill="#999" />
          <text x="0" y="-4" text-anchor="middle" font-size="7" fill="#333" font-weight="bold">N</text>
        </g>
      </svg>

      <!-- 缩放控制 -->
      <div class="zoom-controls">
        <button class="zoom-btn" @click="zoomIn">＋</button>
        <button class="zoom-btn" @click="zoomOut">－</button>
        <button class="zoom-btn reset-btn" @click="resetView">⊙</button>
      </div>

      <!-- 当前缩放比例提示 -->
      <div class="scale-hint">{{ Math.round(transform.scale * 100) }}%</div>
    </div>

    <!-- 路线规划操作栏 -->
    <transition name="slide-up">
      <div v-if="routeMode" class="route-bar">
        <div class="route-bar-top">
          <span class="route-title">
            <van-icon name="guide-o" color="#1976d2" size="14" style="margin-right:4px"/>
            路线规划
            <span class="route-hint">（点击地图选择房间）</span>
          </span>
          <van-button size="mini" plain type="default" @click="clearRoute">清除</van-button>
        </div>

        <div v-if="optimizedRoute.length === 0" class="route-empty">
          请点击地图上的房间来添加停靠点
        </div>
        <template v-else>
          <div class="route-stops-scroll">
            <span
              v-for="(room, idx) in optimizedRoute"
              :key="room.id"
              class="route-stop-chip"
            >
              <span class="route-num">{{ idx + 1 }}</span>{{ room.name }}
            </span>
          </div>
          <div v-if="optimizedRoute.length >= 2" class="route-footer">
            <van-icon name="clock-o" size="12" color="#666" />
            <span class="route-time-text">{{ estimatedTime }}</span>
            <span class="route-dist-text">（步行约 {{ Math.round(totalRouteDist * 0.1) }} m）</span>
          </div>
          <div v-else class="route-footer route-hint">再选一个房间即可规划路线</div>
        </template>
      </div>
    </transition>

    <!-- 房间详情弹层 -->
    <van-popup
      v-model:show="showPopup"
      position="bottom"
      round
      :style="{ height: '58%' }"
      @closed="selectedRoomId = ''"
    >
      <div v-if="selectedRoom" class="room-popup">
        <div class="popup-header">
          <span class="zone-dot" :style="{ background: zoneColor(selectedRoom.zone) }" />
          <span class="room-title">{{ selectedRoom.name }}</span>
          <van-tag
            :type="(statusTagType(selectedRoom.dataStatus) as any)"
            class="status-tag"
          >{{ statusLabel(selectedRoom.dataStatus) }}</van-tag>
        </div>
        <div class="room-zone-name">{{ zoneName(selectedRoom.zone) }}</div>

        <van-divider style="margin: 10px 0" />

        <div v-if="selectedRoom.restricted" class="restricted-notice">
          <van-icon name="lock" color="#c62828" />
          <span>该区域为受限区域，物品信息仅限授权人员查看</span>
        </div>

        <template v-else>
          <div class="items-header">
            <span class="items-label">区域物品</span>
            <span class="items-count">共 {{ selectedRoom.items.length }} 件</span>
          </div>
          <van-empty
            v-if="selectedRoom.items.length === 0"
            description="暂无物品记录"
            image-size="60"
          />
          <van-cell-group v-else inset>
            <van-cell
              v-for="item in selectedRoom.items"
              :key="item.id"
              :title="item.name"
              :label="item.location"
              is-link
              @click="goToItem(item.id)"
            >
              <template #right-icon>
                <van-tag :type="(itemTagType(item.status) as any)" plain style="margin-right:8px">
                  {{ item.status }}
                </van-tag>
                <van-icon name="arrow" />
              </template>
            </van-cell>
          </van-cell-group>
        </template>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import mapDataRaw from '@/assets/map-data.json'

// ── Types ────────────────────────────────────────────────────────────────────

interface Item {
  id: string
  name: string
  location: string
  status: string
}

interface Room {
  id: string
  name: string
  subLabel?: string
  zone: string
  restricted?: boolean
  x: number
  y: number
  width: number
  height: number
  dataStatus: 'fresh' | 'stale' | 'expired'
  items: Item[]
}

interface Zone {
  id: string
  name: string
  color: string
}

interface MapData {
  viewport: { width: number; height: number }
  zones: Zone[]
  rooms: Room[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const mapData = mapDataRaw as MapData
const VP_W = mapData.viewport.width
const VP_H = mapData.viewport.height
const MIN_SCALE = 0.25
const MAX_SCALE = 5

// ── Router ────────────────────────────────────────────────────────────────────

const route = useRoute()
const router = useRouter()

// ── UI state ──────────────────────────────────────────────────────────────────

const showSearch = ref(false)
const searchQuery = ref('')
const showPopup = ref(false)
const selectedRoomId = ref('')
const highlightedRoomId = ref('')
const containerRef = ref<HTMLElement | null>(null)

// ── Route navigation state ─────────────────────────────────────────────────────
const routeMode = ref(false)
const routeStops = ref<Room[]>([])

const selectedRoom = computed<Room | null>(
  () => mapData.rooms.find(r => r.id === selectedRoomId.value) ?? null
)

function isHighlighted(room: Room) { return room.id === highlightedRoomId.value }
function isSelected(room: Room)    { return room.id === selectedRoomId.value }

// ── Transform (pan + zoom) ────────────────────────────────────────────────────

const transform = reactive({ x: 0, y: 0, scale: 1 })
let isAnimating = false

const svgStyle = computed(() => ({
  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
  transformOrigin: '0 0',
  cursor: dragging.active ? 'grabbing' : 'grab',
  transition: isAnimating ? 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' : 'none',
  willChange: 'transform',
}))

// ── Dragging ──────────────────────────────────────────────────────────────────

const dragging = reactive({ active: false, lastX: 0, lastY: 0 })

function onMouseDown(e: MouseEvent) {
  dragging.active = true
  dragging.lastX = e.clientX
  dragging.lastY = e.clientY
}

function onMouseMove(e: MouseEvent) {
  if (!dragging.active) return
  transform.x += e.clientX - dragging.lastX
  transform.y += e.clientY - dragging.lastY
  dragging.lastX = e.clientX
  dragging.lastY = e.clientY
}

function stopDrag() { dragging.active = false }

function onWheel(e: WheelEvent) {
  const ratio = e.deltaY > 0 ? 0.9 : 1.1
  applyZoom(ratio, e.offsetX, e.offsetY)
}

// ── Touch ─────────────────────────────────────────────────────────────────────

let prevTouchDist = 0
let prevMidX = 0
let prevMidY = 0

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    dragging.active = true
    dragging.lastX = e.touches[0].clientX
    dragging.lastY = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    dragging.active = false
    prevTouchDist = touchDist(e)
    const mid = touchMid(e)
    prevMidX = mid.x
    prevMidY = mid.y
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 1 && dragging.active) {
    transform.x += e.touches[0].clientX - dragging.lastX
    transform.y += e.touches[0].clientY - dragging.lastY
    dragging.lastX = e.touches[0].clientX
    dragging.lastY = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    const dist = touchDist(e)
    const mid = touchMid(e)
    const ratio = dist / prevTouchDist

    // pan from midpoint shift
    transform.x += mid.x - prevMidX
    transform.y += mid.y - prevMidY

    // pinch zoom at midpoint
    applyZoom(ratio, mid.x, mid.y)

    prevTouchDist = dist
    prevMidX = mid.x
    prevMidY = mid.y
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0) dragging.active = false
}

function touchDist(e: TouchEvent) {
  const dx = e.touches[0].clientX - e.touches[1].clientX
  const dy = e.touches[0].clientY - e.touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function touchMid(e: TouchEvent) {
  return {
    x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
    y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
  }
}

// ── Zoom helpers ──────────────────────────────────────────────────────────────

function applyZoom(ratio: number, originX: number, originY: number) {
  const newScale = Math.min(Math.max(transform.scale * ratio, MIN_SCALE), MAX_SCALE)
  const r = newScale / transform.scale
  transform.x = originX - r * (originX - transform.x)
  transform.y = originY - r * (originY - transform.y)
  transform.scale = newScale
}

function containerCenter() {
  const el = containerRef.value
  return el ? { x: el.clientWidth / 2, y: el.clientHeight / 2 } : { x: 0, y: 0 }
}

function zoomIn()  { applyZoom(1.3, containerCenter().x, containerCenter().y) }
function zoomOut() { applyZoom(0.77, containerCenter().x, containerCenter().y) }

function resetView() {
  fitToContainer()
}

function fitToContainer() {
  const el = containerRef.value
  if (!el) return
  const sx = el.clientWidth / VP_W
  const sy = el.clientHeight / VP_H
  const s = Math.min(sx, sy) * 0.95
  isAnimating = true
  transform.scale = s
  transform.x = (el.clientWidth  - VP_W * s) / 2
  transform.y = (el.clientHeight - VP_H * s) / 2
  setTimeout(() => { isAnimating = false }, 400)
}

// ── Room click ────────────────────────────────────────────────────────────────

function onRoomClick(room: Room) {
  if (routeMode.value) {
    // Toggle room in route stops
    const idx = routeStops.value.findIndex(r => r.id === room.id)
    if (idx >= 0) {
      routeStops.value.splice(idx, 1)
    } else {
      routeStops.value.push(room)
    }
    return
  }
  selectedRoomId.value = room.id
  showPopup.value = true
}

function goToItem(id: string) {
  router.push({ name: 'ItemDetail', params: { id } })
}

// ── Route navigation helpers ───────────────────────────────────────────────────

function toggleRouteMode() {
  routeMode.value = !routeMode.value
  if (!routeMode.value) clearRoute()
  // Close popup if open when entering route mode
  if (routeMode.value) showPopup.value = false
}

function clearRoute() {
  routeStops.value = []
}

function roomCenterX(room: Room) { return room.x + room.width  / 2 }
function roomCenterY(room: Room) { return room.y + room.height / 2 }

function manhattanDist(a: Room, b: Room) {
  return Math.abs(roomCenterX(a) - roomCenterX(b)) + Math.abs(roomCenterY(a) - roomCenterY(b))
}

// Nearest-neighbor heuristic: greedy TSP starting from first selected room
const optimizedRoute = computed<Room[]>(() => {
  const stops = routeStops.value
  if (stops.length <= 2) return [...stops]
  const result = [stops[0]]
  const remaining = stops.slice(1)
  while (remaining.length > 0) {
    const last = result[result.length - 1]
    let nearestIdx = 0
    let minDist = Infinity
    for (let i = 0; i < remaining.length; i++) {
      const d = manhattanDist(last, remaining[i])
      if (d < minDist) { minDist = d; nearestIdx = i }
    }
    result.push(remaining.splice(nearestIdx, 1)[0])
  }
  return result
})

// Total Manhattan distance of optimized route (SVG units; 1 unit ≈ 0.1 m)
const totalRouteDist = computed<number>(() => {
  const r = optimizedRoute.value
  let d = 0
  for (let i = 1; i < r.length; i++) d += manhattanDist(r[i - 1], r[i])
  return d
})

// Format as "约X分X秒" (walking speed: 1 SVG unit = 0.1 m, 1 m/s)
const estimatedTime = computed<string>(() => {
  const seconds = Math.round(totalRouteDist.value * 0.1)
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `约 ${m} 分 ${s} 秒` : `约 ${s} 秒`
})

// ── Search & highlight ────────────────────────────────────────────────────────

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) clearHighlight()
}

function onSearch() {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return

  // match room name first, then item name
  const room =
    mapData.rooms.find(r => r.name.includes(q)) ??
    mapData.rooms.find(r => r.items.some(i => i.name.toLowerCase().includes(q)))

  if (room) jumpToRoom(room)
}

function clearHighlight() {
  highlightedRoomId.value = ''
}

function jumpToRoom(room: Room) {
  highlightedRoomId.value = room.id

  const el = containerRef.value
  if (!el) return

  const targetScale = 2.4
  const cx = room.x + room.width  / 2
  const cy = room.y + room.height / 2

  isAnimating = true
  transform.scale = targetScale
  transform.x = el.clientWidth  / 2 - cx * targetScale
  transform.y = el.clientHeight / 2 - cy * targetScale

  setTimeout(() => {
    isAnimating = false
    selectedRoomId.value = room.id
    showPopup.value = true
  }, 400)
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  fitToContainer()

  // Handle query params from Search view: ?highlight=roomId or ?q=keyword
  const highlight = route.query.highlight as string | undefined
  const q         = route.query.q         as string | undefined

  if (highlight) {
    const room = mapData.rooms.find(r => r.id === highlight)
    if (room) jumpToRoom(room)
  } else if (q) {
    searchQuery.value = q
    showSearch.value  = true
    onSearch()
  }
})

// ── Display helpers ───────────────────────────────────────────────────────────

function zoneColor(zoneId: string): string {
  return mapData.zones.find(z => z.id === zoneId)?.color ?? '#ccc'
}

function zoneName(zoneId: string): string {
  return mapData.zones.find(z => z.id === zoneId)?.name ?? ''
}

function roomFill(room: Room): string {
  const base = zoneColor(room.zone)
  if (isHighlighted(room)) return base
  if (isSelected(room))    return base + 'dd'
  return base + 'aa'
}

function labelFontSize(room: Room): number {
  const chars = room.name.length
  // Estimate max font size so text fits within room width (approx 0.55em per char)
  const maxByWidth = Math.floor((room.width - 4) / (chars * 0.58))
  const maxByHeight = Math.floor((room.height - 8) / 1.4)
  return Math.min(Math.max(maxByWidth, 5), maxByHeight, 13)
}

function statusColor(s: string): string {
  if (s === 'fresh')   return '#4caf50'
  if (s === 'stale')   return '#ff9800'
  return '#f44336'
}

function statusLabel(s: string): string {
  if (s === 'fresh')   return '数据新鲜'
  if (s === 'stale')   return '数据较旧'
  return '数据过期'
}

function statusTagType(s: string): string {
  if (s === 'fresh')   return 'success'
  if (s === 'stale')   return 'warning'
  return 'danger'
}

function itemTagType(s: string): string {
  if (s === '在库')   return 'success'
  if (s === '借出')   return 'warning'
  if (s === '使用中') return 'primary'
  return 'default'
}
</script>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
}

/* Legend */
.legend-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px;
  background: #fff;
  border-bottom: 1px solid #eee;
  overflow-x: auto;
  white-space: nowrap;
  font-size: 11px;
  color: #555;
  flex-shrink: 0;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.legend-sep {
  width: 1px;
  height: 14px;
  background: #ddd;
  margin: 0 4px;
  flex-shrink: 0;
}

/* Map container */
.map-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #ccc;
  touch-action: none;
  user-select: none;
}

.factory-svg {
  display: block;
  user-select: none;
  -webkit-user-select: none;
}

/* Room interactions */
.room-group {
  cursor: pointer;
}

.room-group:active rect:first-child {
  opacity: 0.75;
}

/* Blink animation for highlighted room */
.room-blink {
  animation: roomBlink 0.7s ease-in-out infinite alternate;
}

@keyframes roomBlink {
  from { opacity: 1; }
  to   { opacity: 0.45; filter: brightness(1.4) saturate(1.5); }
}

/* Pulse ring */
.pulse-ring {
  animation: pulseRing 1.2s ease-out infinite;
  pointer-events: none;
}

@keyframes pulseRing {
  0%   { opacity: 1; transform: scale(1); transform-origin: center; }
  100% { opacity: 0; transform: scale(1.15); transform-origin: center; }
}

/* Zoom controls */
.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 10;
}

.zoom-btn {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  -webkit-tap-highlight-color: transparent;
}

.zoom-btn:active {
  background: #f0f0f0;
}

.reset-btn {
  font-size: 16px;
}

/* Scale hint */
.scale-hint {
  position: absolute;
  bottom: 24px;
  left: 12px;
  font-size: 11px;
  color: #666;
  background: rgba(255,255,255,0.8);
  padding: 2px 6px;
  border-radius: 8px;
}

/* Search slide animation */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

/* Popup */
.room-popup {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.zone-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.room-title {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
  color: #1a1a1a;
}

.status-tag {
  flex-shrink: 0;
}

.room-zone-name {
  font-size: 12px;
  color: #999;
  margin-left: 20px;
  margin-bottom: 2px;
}

.restricted-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #fff3f3;
  border-radius: 8px;
  color: #c62828;
  font-size: 13px;
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.items-count {
  font-size: 12px;
  color: #aaa;
}

/* ── Route bar ──────────────────────────────────────────────────────────────── */

.route-bar {
  background: #fff;
  border-top: 1px solid #e0e0e0;
  padding: 10px 12px;
  flex-shrink: 0;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.08);
}

.route-bar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.route-title {
  font-size: 13px;
  font-weight: 600;
  color: #1976d2;
  display: flex;
  align-items: center;
}

.route-hint {
  font-size: 11px;
  color: #aaa;
  font-weight: 400;
}

.route-empty {
  font-size: 12px;
  color: #bbb;
  text-align: center;
  padding: 4px 0;
}

.route-stops-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.route-stop-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e3f0ff;
  border-radius: 12px;
  padding: 3px 10px 3px 4px;
  white-space: nowrap;
  font-size: 12px;
  color: #1976d2;
  flex-shrink: 0;
}

.route-num {
  width: 18px;
  height: 18px;
  background: #1976d2;
  border-radius: 50%;
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.route-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  color: #666;
}

.route-time-text {
  font-weight: 600;
  color: #1976d2;
}

.route-dist-text {
  color: #aaa;
}

/* Slide-up transition for route bar */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>
