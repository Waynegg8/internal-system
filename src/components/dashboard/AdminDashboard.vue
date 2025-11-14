<template>
  <div class="dashboard-layout">
    <a-row :gutter="[12, 12]" class="dashboard-row">
      <!-- 左側：最近動態置頂 -->
      <a-col :xs="24" :sm="24" :md="8" :lg="8" class="left-column">
        <div class="left-column-wrapper" ref="leftColumnWrapper" :style="{ height: leftColumnHeight }">
          <RecentActivities
            :activities="adminData?.recentActivities || []"
            :team-members="adminData?.teamMembers || []"
            :filters="activityFilters"
            @filter-change="handleActivityFilterChange"
          />
        </div>
      </a-col>
      
      <!-- 右側：今日摘要、即時提醒、員工任務、員工工時 -->
      <a-col :xs="24" :sm="24" :md="16" :lg="16" class="right-column">
      <a-row :gutter="[12, 12]">
        <!-- 第一行：今日摘要、即時提醒 -->
        <a-col :xs="24" :sm="24" :md="12" :lg="12">
          <a-card
            class="summary-card"
            :loading="false"
            title="今日摘要"
            :extra="summaryExtra"
          >
            <template v-if="hasSummary">
              <a-row :gutter="8" class="summary-stats">
                <a-col :span="24">
                  <div class="stat-item warning">
                    <div class="label">逾期</div>
                    <div class="value">{{ dailySummary.stats.overdue }}</div>
                  </div>
                </a-col>
                <a-col :span="24">
                  <div class="stat-item info">
                    <div class="label">今日到期</div>
                    <div class="value">{{ dailySummary.stats.dueToday }}</div>
                  </div>
                </a-col>
                <a-col :span="24">
                  <div class="stat-item neutral">
                    <div class="label">待處理</div>
                    <div class="value">{{ dailySummary.stats.waitingForUpdate }}</div>
                  </div>
                </a-col>
              </a-row>
            </template>
            <a-empty v-else description="暫無今日摘要" :image="false" />
          </a-card>
        </a-col>
        
        <a-col :xs="24" :sm="24" :md="12" :lg="12">
          <a-card
            class="alerts-card"
            :loading="false"
            title="即時提醒"
            :extra="alertsExtra"
          >
            <a-list
              v-if="alerts && alerts.length"
              class="alerts-list"
              :data-source="alerts"
              :renderItem="renderAlertItem"
              size="small"
            />
            <a-empty v-else description="暫無即時提醒" :image="false" />
          </a-card>
        </a-col>
        
        <!-- 第二行：各員工任務狀態（全寬） -->
        <a-col :xs="24" :sm="24" :md="24" :lg="24">
          <EmployeeTasks
            :employee-tasks="adminData?.employeeTasks || []"
            :current-ym="currentYm"
            @month-change="handleTaskMonthChange"
          />
        </a-col>
        
        <!-- 第三行：各員工工時（全寬） -->
        <a-col :xs="24" :sm="24" :md="24" :lg="24">
          <EmployeeHours
            :employee-hours="adminData?.employeeHours || []"
            :current-ym="currentYm"
            @month-change="handleHourMonthChange"
          />
        </a-col>
        
        <!-- 第四行：財務狀況（全寬） -->
        <a-col :xs="24" :sm="24" :md="24" :lg="24" class="financial-section" ref="financialSection">
          <a-row :gutter="[12, 12]">
            <a-col
              v-if="receipts && receipts.length > 0"
              :xs="24"
              :sm="24"
              :md="12"
              :lg="12"
            >
              <ReceiptsPending :receipts="receipts" />
            </a-col>
            
            <a-col 
              :xs="24" 
              :sm="24" 
              :md="receipts && receipts.length > 0 ? 12 : 24" 
              :lg="receipts && receipts.length > 0 ? 12 : 24"
            >
              <FinancialStatus
                :financial-status="adminData?.financialStatus || { month: {}, ytd: {} }"
                :finance-mode="financeMode"
                :finance-ym="financeYm"
                @mode-change="handleFinanceModeChange"
                @month-change="handleFinanceMonthChange"
              />
            </a-col>
          </a-row>
        </a-col>
      </a-row>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { computed, h, resolveComponent, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { formatDate, formatDateTime } from '@/utils/formatters'
import RecentActivities from './RecentActivities.vue'
import EmployeeTasks from './EmployeeTasks.vue'
import EmployeeHours from './EmployeeHours.vue'
import ReceiptsPending from './ReceiptsPending.vue'
import FinancialStatus from './FinancialStatus.vue'

const props = defineProps({
  adminData: {
    type: Object,
    default: () => ({})
  },
  currentYm: {
    type: String,
    required: true
  },
  financeMode: {
    type: String,
    default: 'month'
  },
  financeYm: {
    type: String,
    required: true
  },
  activityFilters: {
    type: Object,
    default: () => ({
      type: '',
      userId: '',
      days: 7
    })
  }
})

const emit = defineEmits([
  'activity-filter-change',
  'task-month-change',
  'hour-month-change',
  'finance-mode-change',
  'finance-month-change'
])

const receipts = computed(() => {
  return Array.isArray(props.adminData?.receiptsPendingTasks)
    ? props.adminData.receiptsPendingTasks
    : []
})

const alerts = computed(() => {
  return Array.isArray(props.adminData?.alerts)
    ? props.adminData.alerts
    : []
})

const dailySummary = computed(() => {
  return props.adminData?.dailySummary || null
})

const hasSummary = computed(() => {
  return dailySummary.value && dailySummary.value.stats
})

const AListItem = resolveComponent('a-list-item')

const summaryExtra = computed(() => {
  if (!dailySummary.value?.generatedAt) return null
  const text = `更新於 ${formatDateTime(dailySummary.value.generatedAt)}`
  return h('span', { class: 'summary-extra' }, text)
})

const alertsExtra = computed(() => {
  if (!alerts.value?.length) return null
  const latest = alerts.value[0]?.createdAt
  if (!latest) return null
  const text = `最近更新 ${formatDateTime(latest)}`
  return h('span', { class: 'summary-extra' }, text)
})

const renderAlertItem = (item) => {
  return h(
    AListItem,
    {
      class: ['alert-item', item.type],
      onClick: () => handleViewTask(item)
    },
    {
      default: () =>
        h('div', { class: 'alert-item-content' }, [
          h('div', { class: 'title' }, item.title || '任務提醒'),
          h('div', { class: 'meta' }, [
            h('span', [
              h('strong', item.clientName || '未命名客戶'),
              item.serviceName ? `｜${item.serviceName}` : ''
            ]),
            item.dueDate
              ? h('span', { class: 'due' }, `到期：${formatDate(item.dueDate)}`)
              : null
          ]),
          h('div', { class: 'meta' }, [
            h('span', `負責人：${item.assignee?.name || '未指派'}`),
            item.delayDays
              ? h('span', { class: 'delay' }, `延遲 ${item.delayDays} 天`)
              : null,
            h('span', { class: 'time' }, formatDateTime(item.createdAt))
          ])
        ])
    }
  )
}

const handleViewTask = (item) => {
  // 可以發送事件到父組件處理
}

const handleActivityFilterChange = (filters) => {
  emit('activity-filter-change', filters)
}

const handleTaskMonthChange = (ym) => {
  emit('task-month-change', ym)
}

const handleHourMonthChange = (ym) => {
  emit('hour-month-change', ym)
}

const handleFinanceModeChange = (mode) => {
  emit('finance-mode-change', mode)
}

const handleFinanceMonthChange = (ym) => {
  emit('finance-month-change', ym)
}

// 動態計算「最近動態」面板的高度，使其與「財務狀況」面板底部對齊
const leftColumnWrapper = ref(null)
const financialSection = ref(null)
const leftColumnHeight = ref('auto')

const updateLeftColumnHeight = () => {
  nextTick(() => {
    if (financialSection.value && leftColumnWrapper.value) {
      const financialBottom = financialSection.value.getBoundingClientRect().bottom
      const leftColumnTop = leftColumnWrapper.value.getBoundingClientRect().top
      const calculatedHeight = financialBottom - leftColumnTop
      
      if (calculatedHeight > 0) {
        leftColumnHeight.value = `${calculatedHeight}px`
      }
    }
  })
}

let resizeObserver = null
let mutationObserver = null

watch(() => [financialSection.value, leftColumnWrapper.value], ([financial, left]) => {
  if (financial && left) {
    updateLeftColumnHeight()
    
    // 使用 ResizeObserver 監聽財務狀況面板的大小變化
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
    resizeObserver = new ResizeObserver(updateLeftColumnHeight)
    resizeObserver.observe(financial)
    
    // 使用 MutationObserver 監聽右側內容變化
    if (mutationObserver) {
      mutationObserver.disconnect()
    }
    mutationObserver = new MutationObserver(() => {
      setTimeout(updateLeftColumnHeight, 100)
    })
    mutationObserver.observe(financial.parentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    })
  }
}, { immediate: true })

onMounted(() => {
  updateLeftColumnHeight()
  window.addEventListener('resize', updateLeftColumnHeight)
  
  // 延遲執行以確保 DOM 已完全渲染
  setTimeout(updateLeftColumnHeight, 300)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateLeftColumnHeight)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (mutationObserver) {
    mutationObserver.disconnect()
  }
})
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.dashboard-row {
  flex: 1;
  display: flex;
  align-items: flex-start;
  min-height: calc(100vh - 150px);
}

.left-column {
  display: flex;
  flex-direction: column;
  position: relative;
}

.left-column-wrapper {
  display: flex;
  flex-direction: column;
  transition: height 0.2s ease;
}

.left-column-wrapper :deep(.recent-activities-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.right-column {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.summary-card,
.alerts-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.summary-card :deep(.ant-card),
.alerts-card :deep(.ant-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.summary-card :deep(.ant-card-head),
.alerts-card :deep(.ant-card-head) {
  padding: 0 12px;
  min-height: 40px;
  flex-shrink: 0;
  border-bottom: 1px solid #f0f0f0;
}

.summary-card :deep(.ant-card-head-title),
.alerts-card :deep(.ant-card-head-title) {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.summary-card :deep(.ant-card-body) {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.alerts-card :deep(.ant-card-body) {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.summary-extra {
  color: #999;
  font-size: 11px;
}

.summary-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  border-radius: 6px;
  padding: 8px;
  background: #f5f5f5;
  text-align: center;
}

.stat-item .label {
  font-size: 11px;
  color: #666;
  margin-bottom: 2px;
}

.stat-item .value {
  font-size: 18px;
  font-weight: 600;
}

.stat-item.warning {
  background: #fff1f0;
  color: #cf1322;
}

.stat-item.info {
  background: #e6f4ff;
  color: #0958d9;
}

.stat-item.neutral {
  background: #f6ffed;
  color: #3f8600;
}

.alerts-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  max-height: 200px;
}

.alerts-list :deep(.ant-list-item) {
  padding: 8px 0;
}

.alert-item-content .title {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 13px;
}

.alert-item-content .meta {
  font-size: 11px;
  color: #666;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 2px;
  line-height: 1.4;
}

.alert-item-content .meta .delay {
  color: #cf1322;
}

.alert-item-content .meta .due {
  color: #fa541c;
}

.alert-item-content .meta .time {
  color: #999;
}

.financial-section {
  flex-shrink: 0;
}
</style>

