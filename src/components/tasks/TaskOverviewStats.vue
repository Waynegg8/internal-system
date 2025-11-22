<template>
  <!-- 超緊湊型統計摘要，一行形式，無框設計 -->
  <div class="task-stats-inline">
    <a-spin :spinning="loading" :tip="null" size="small">
      <div class="stats-inline-row">
        <!-- 總任務數 -->
        <div 
          class="stat-inline-item stat-inline-total" 
          @click="handleStatClick('total')"
          title="點擊篩選總任務"
        >
          <FileTextOutlined class="stat-inline-icon" />
          <span class="stat-inline-value">{{ animatedStats.total }}</span>
          <span class="stat-inline-label">總任務</span>
        </div>
        
        <!-- 分隔線 -->
        <div class="stat-divider"></div>
        
        <!-- 進行中任務數 -->
        <div 
          class="stat-inline-item stat-inline-in-progress" 
          @click="handleStatClick('in_progress')"
          title="點擊篩選進行中任務"
        >
          <SyncOutlined spin class="stat-inline-icon" />
          <span class="stat-inline-value">{{ animatedStats.in_progress }}</span>
          <span class="stat-inline-label">進行中</span>
        </div>
        
        <!-- 分隔線 -->
        <div class="stat-divider"></div>
        
        <!-- 已完成任務數 -->
        <div 
          class="stat-inline-item stat-inline-completed" 
          @click="handleStatClick('completed')"
          title="點擊篩選已完成任務"
        >
          <CheckCircleOutlined class="stat-inline-icon" />
          <span class="stat-inline-value">{{ animatedStats.completed }}</span>
          <span class="stat-inline-label">已完成</span>
        </div>
        
        <!-- 分隔線 -->
        <div class="stat-divider"></div>
        
        <!-- 逾期任務數 -->
        <div 
          class="stat-inline-item stat-inline-overdue" 
          @click="handleStatClick('overdue')"
          title="點擊篩選逾期任務"
        >
          <ExclamationCircleOutlined class="stat-inline-icon" />
          <span class="stat-inline-value">{{ animatedStats.overdue }}</span>
          <span class="stat-inline-label">逾期</span>
        </div>
        
        <!-- 分隔線 -->
        <div class="stat-divider"></div>
        
        <!-- 可開始任務數 -->
        <div 
          class="stat-inline-item stat-inline-can-start" 
          @click="handleStatClick('can_start')"
          title="點擊篩選可開始任務"
        >
          <PlayCircleOutlined class="stat-inline-icon" />
          <span class="stat-inline-value">{{ animatedStats.can_start }}</span>
          <span class="stat-inline-label">可開始</span>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  BarChartOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  stats: {
    type: Object,
    required: true,
    default: () => ({
      total: 0,
      in_progress: 0,
      completed: 0,
      overdue: 0,
      can_start: 0
    })
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['stat-click'])

// 處理統計項點擊
const handleStatClick = (statType) => {
  emit('stat-click', statType)
}

// 首次加載標記
const isFirstLoad = ref(true)

// 動畫統計數據（用於數字動畫效果）
const animatedStats = ref({
  total: 0,
  in_progress: 0,
  completed: 0,
  overdue: 0,
  can_start: 0
})

// 數字動畫函數
const animateValue = (start, end, duration, callback) => {
  const startTime = performance.now()
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    // 使用緩動函數（ease-out）
    const easeOut = 1 - Math.pow(1 - progress, 3)
    const current = Math.floor(start + (end - start) * easeOut)
    callback(current)
    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }
  requestAnimationFrame(animate)
}

// 更新動畫統計數據
const updateAnimatedStats = () => {
  const duration = 500 // 動畫持續時間（毫秒）
  
  Object.keys(props.stats).forEach(key => {
    const startValue = animatedStats.value[key] || 0
    const endValue = props.stats[key] || 0
    
    if (startValue !== endValue) {
      animateValue(startValue, endValue, duration, (value) => {
        animatedStats.value[key] = value
      })
    }
  })
}

// 監聽 stats 變化，實時更新動畫
watch(
  () => props.stats,
  (newStats) => {
    if (!props.loading) {
      updateAnimatedStats()
    }
  },
  { deep: true, immediate: false }
)

// 監聽 loading 狀態變化
watch(
  () => props.loading,
  (newLoading, oldLoading) => {
    // 從加載中變為加載完成
    if (oldLoading && !newLoading) {
      isFirstLoad.value = false
      // 延遲一下再開始動畫，確保數據已更新
      setTimeout(() => {
        updateAnimatedStats()
      }, 100)
    }
    // 首次加載完成
    if (!newLoading && isFirstLoad.value) {
      isFirstLoad.value = false
      // 初始化動畫統計數據
      Object.keys(props.stats).forEach(key => {
        animatedStats.value[key] = props.stats[key] || 0
      })
    }
  }
)

// 組件掛載時初始化
onMounted(() => {
  if (!props.loading) {
    isFirstLoad.value = false
    Object.keys(props.stats).forEach(key => {
      animatedStats.value[key] = props.stats[key] || 0
    })
  }
})
</script>

<style scoped>
.task-stats-inline {
  padding: 0;
  margin: 0;
  height: 28px;
  display: flex;
  align-items: center;
}

.stats-inline-row {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: nowrap;
  background: transparent;
  border-radius: 0;
  padding: 0;
  border: none;
  height: 100%;
}

.stat-inline-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 0 0 auto;
  white-space: nowrap;
  border-radius: 4px;
  height: 28px;
}

.stat-inline-item:hover {
  background: #f0f0f0;
}

.stat-inline-total:hover {
  background: #e6f7ff;
}

.stat-inline-in-progress:hover {
  background: #fff7e6;
}

.stat-inline-completed:hover {
  background: #f6ffed;
}

.stat-inline-overdue:hover {
  background: #fff1f0;
}

.stat-inline-can-start:hover {
  background: #f0fdf4;
}

.stat-divider {
  width: 1px;
  height: 16px;
  background: #e5e7eb;
  flex-shrink: 0;
  margin: 0 2px;
}

.stat-inline-icon {
  font-size: 14px;
  flex-shrink: 0;
  line-height: 1;
}

.stat-inline-total .stat-inline-icon {
  color: #1890ff;
}

.stat-inline-in-progress .stat-inline-icon {
  color: #fa8c16;
}

.stat-inline-completed .stat-inline-icon {
  color: #52c41a;
}

.stat-inline-overdue .stat-inline-icon {
  color: #ef4444;
}

.stat-inline-can-start .stat-inline-icon {
  color: #10b981;
}

.stat-inline-value {
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

.stat-inline-total .stat-inline-value {
  color: #1890ff;
}

.stat-inline-in-progress .stat-inline-value {
  color: #fa8c16;
}

.stat-inline-completed .stat-inline-value {
  color: #52c41a;
}

.stat-inline-overdue .stat-inline-value {
  color: #ef4444;
}

.stat-inline-can-start .stat-inline-value {
  color: #10b981;
}

.stat-inline-label {
  font-size: 11px;
  color: #6b7280;
  line-height: 1;
  white-space: nowrap;
}

/* 響應式 */
@media (max-width: 1200px) {
  .stats-inline-row {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .stat-divider {
    display: none;
  }
  
  .stat-inline-item {
    flex: 1 1 auto;
    min-width: 0;
    padding: 6px 8px;
  }
}

@media (max-width: 768px) {
  .stat-inline-value {
    font-size: 14px;
  }
  
  .stat-inline-label {
    font-size: 12px;
  }
  
  .stat-inline-icon {
    font-size: 12px;
  }
  
  .stat-inline-item {
    padding: 5px 6px;
    gap: 4px;
  }
}
</style>


