<template>
  <div class="dashboard-alerts-panel">
    <a-row :gutter="8">
      <a-col :xs="24" :md="9">
        <a-card
          class="summary-card"
          :loading="loading"
          title="今日摘要"
          :extra="summaryExtra"
        >
          <template v-if="hasSummary">
            <a-row :gutter="8" class="summary-stats">
              <a-col :span="8">
                <div class="stat-item warning">
                  <div class="label">逾期</div>
                  <div class="value">{{ dailySummary.stats.overdue }}</div>
                </div>
              </a-col>
              <a-col :span="8">
                <div class="stat-item info">
                  <div class="label">今日到期</div>
                  <div class="value">{{ dailySummary.stats.dueToday }}</div>
                </div>
              </a-col>
              <a-col :span="8">
                <div class="stat-item neutral">
                  <div class="label">待處理</div>
                  <div class="value">{{ dailySummary.stats.waitingForUpdate }}</div>
                </div>
              </a-col>
            </a-row>

            <a-list
              class="summary-list"
              :data-source="displayedSummaryItems"
              :renderItem="renderSummaryItem"
              :locale="{ emptyText: '今日暫無重點任務' }"
              size="small"
            />
          </template>
          <a-empty v-else description="暫無今日摘要" :image="false" />
        </a-card>
      </a-col>

      <a-col :xs="24" :md="15">
        <a-card
          class="alerts-card"
          :loading="loading"
          title="即時提醒"
          :extra="alertsExtraWithNotifications"
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
    </a-row>
  </div>
</template>

<script setup>
import { computed, h, resolveComponent, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { BellOutlined } from '@ant-design/icons-vue'
import { formatDate, formatDateTime } from '@/utils/formatters'
import { useNotificationsApi } from '@/api/notifications'

const router = useRouter()
const notificationsApi = useNotificationsApi()

const props = defineProps({
  alerts: {
    type: Array,
    default: () => []
  },
  dailySummary: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const AListItem = resolveComponent('a-list-item')

// 未讀通知數量
const unreadNotificationCount = ref(0)
const loadingNotifications = ref(false)

// 載入未讀通知數量
const loadUnreadCount = async () => {
  try {
    loadingNotifications.value = true
    const count = await notificationsApi.fetchUnreadCount()
    unreadNotificationCount.value = count
  } catch (error) {
    console.error('[DashboardAlertsPanel] 載入未讀通知數量失敗:', error)
  } finally {
    loadingNotifications.value = false
  }
}

// 跳轉到通知列表
const handleViewNotifications = () => {
  router.push('/notifications')
}

// 定時刷新未讀數量（每30秒）
let refreshTimer = null

onMounted(() => {
  loadUnreadCount()
  // 每30秒刷新一次未讀數量
  refreshTimer = setInterval(() => {
    loadUnreadCount()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

const hasSummary = computed(() => {
  return props.dailySummary && props.dailySummary.stats
})

const summaryExtra = computed(() => {
  if (!props.dailySummary?.generatedAt) return null
  const text = `更新於 ${formatDateTime(props.dailySummary.generatedAt)}`
  return h('span', { class: 'summary-extra' }, text)
})

const alertsExtra = computed(() => {
  if (!props.alerts?.length) return null
  const latest = props.alerts[0]?.createdAt
  if (!latest) return null
  const text = `最近更新 ${formatDateTime(latest)}`
  return h('span', { class: 'summary-extra' }, text)
})

const alertsExtraWithNotifications = computed(() => {
  const elements = []
  
  // 未讀通知數量 Badge
  if (unreadNotificationCount.value > 0) {
    elements.push(
      h(
        'a-badge',
        {
          count: unreadNotificationCount.value,
          overflowCount: 99,
          style: { marginRight: '8px' }
        },
        {
          default: () =>
            h(
              'a-button',
              {
                type: 'link',
                size: 'small',
                icon: h(BellOutlined),
                onClick: handleViewNotifications,
                style: { padding: '0 4px' }
              },
              { default: () => '通知' }
            )
        }
      )
    )
  } else {
    elements.push(
      h(
        'a-button',
        {
          type: 'link',
          size: 'small',
          icon: h(BellOutlined),
          onClick: handleViewNotifications,
          style: { padding: '0 4px', marginRight: '8px' }
        },
        { default: () => '通知' }
      )
    )
  }
  
  // 原有時間信息
  if (props.alerts?.length) {
    const latest = props.alerts[0]?.createdAt
    if (latest) {
      elements.push(
        h('span', { class: 'summary-extra' }, `最近更新 ${formatDateTime(latest)}`)
      )
    }
  }
  
  return elements.length > 0 ? h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, elements) : null
})

const displayedSummaryItems = computed(() => {
  if (!props.dailySummary?.items) return []
  return props.dailySummary.items.slice(0, 10)
})

const renderSummaryItem = (item) => {
  return h(
    AListItem,
    { class: 'summary-item' },
    {
      default: () =>
        h('div', { class: 'summary-item-content' }, [
          h('div', { class: 'title' }, item.taskName || '未命名任務'),
          h('div', { class: 'meta' }, [
            h('span', item.clientName || '未指定客戶'),
            h('span', ' • '),
            h('span', item.serviceName || '未指定服務')
          ]),
          h('div', { class: 'meta' }, [
            h('span', `負責人：${item.assignee?.name || '未指派'}`),
            h('span', ' • '),
            h('span', `到期：${item.dueDate ? formatDate(item.dueDate) : '—'}`)
          ])
        ])
    }
  )
}

const emit = defineEmits(['viewTask'])

const handleViewTask = (item) => {
  emit('viewTask', item)
}

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
</script>

<style scoped>
.dashboard-alerts-panel {
  margin-bottom: 12px;
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
  margin-bottom: 6px;
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

.summary-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.summary-list :deep(.ant-list-item) {
  padding: 8px 0;
}

.summary-item-content .title {
  font-weight: 600;
  margin-bottom: 2px;
  font-size: 13px;
}

.summary-item-content .meta {
  font-size: 11px;
  color: #666;
  line-height: 1.4;
}

.summary-item-content .meta span + span {
  margin-left: 4px;
}

.alerts-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
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

@media (max-width: 991px) {
  .summary-card,
  .alerts-card {
    margin-bottom: 12px;
  }
}
</style>


