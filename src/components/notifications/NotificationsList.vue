<template>
  <div class="notifications-list">
    <a-card title="任務通知" :loading="loading">
      <template #extra>
        <a-space>
          <a-select
            v-model:value="filters.alert_type"
            placeholder="通知類型"
            allow-clear
            style="width: 120px"
            @change="handleFilterChange"
          >
            <a-select-option value="overdue">逾期</a-select-option>
            <a-select-option value="upcoming">即將到期</a-select-option>
            <a-select-option value="delay">前置任務延誤</a-select-option>
            <a-select-option value="conflict">固定期限衝突</a-select-option>
          </a-select>
          <a-select
            v-model:value="filters.is_read"
            placeholder="已讀狀態"
            allow-clear
            style="width: 120px"
            @change="handleFilterChange"
          >
            <a-select-option value="false">未讀</a-select-option>
            <a-select-option value="true">已讀</a-select-option>
          </a-select>
          <a-button @click="handleMarkAllAsRead" :disabled="unreadCount === 0">
            全部標記為已讀
          </a-button>
        </a-space>
      </template>

      <a-spin :spinning="loading">
        <a-empty
          v-if="!loading && notifications.length === 0"
          description="暫無通知"
          :image="false"
        />

        <a-list
          v-else
          :data-source="notifications"
          :pagination="paginationConfig"
          item-layout="vertical"
        >
          <template #renderItem="{ item }">
            <a-list-item
              :class="['notification-item', { 'unread': !item.is_read, 'read': item.is_read }]"
            >
              <template #actions>
                <a-button
                  v-if="!item.is_read"
                  type="link"
                  size="small"
                  @click="handleMarkAsRead(item)"
                >
                  標記為已讀
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  @click="handleViewTask(item)"
                >
                  查看任務
                </a-button>
              </template>

              <a-list-item-meta>
                <template #title>
                  <div style="display: flex; align-items: center; gap: 8px">
                    <a-badge
                      v-if="!item.is_read"
                      status="processing"
                      :color="getNotificationTypeColor(item.notification_type)"
                    />
                    <a-tag :color="getNotificationTypeColor(item.notification_type)">
                      {{ getNotificationTypeText(item.notification_type) }}
                    </a-tag>
                    <span style="font-weight: 500">{{ item.title }}</span>
                  </div>
                </template>

                <template #description>
                  <div class="notification-content">
                    <div class="notification-description">
                      {{ item.content || item.description || '無描述' }}
                    </div>
                    <div class="notification-meta">
                      <span v-if="item.payload?.clientName">
                        <strong>客戶：</strong>{{ item.payload.clientName }}
                      </span>
                      <span v-if="item.payload?.serviceName">
                        <strong>服務：</strong>{{ item.payload.serviceName }}
                      </span>
                      <span v-if="item.payload?.dueDate">
                        <strong>到期日：</strong>{{ formatDate(item.payload.dueDate) }}
                      </span>
                      <span v-if="item.payload?.delayDays !== null && item.payload?.delayDays !== undefined">
                        <strong>逾期天數：</strong>{{ item.payload.delayDays }} 天
                      </span>
                      <span v-if="item.payload?.remainingDays !== null && item.payload?.remainingDays !== undefined">
                        <strong>剩餘天數：</strong>{{ item.payload.remainingDays }} 天
                      </span>
                    </div>
                    <div class="notification-time">
                      <ClockCircleOutlined />
                      {{ formatDateTime(item.created_at) }}
                      <span v-if="item.is_read && item.read_at" style="margin-left: 8px; color: #999">
                        已讀於 {{ formatDateTime(item.read_at) }}
                      </span>
                    </div>
                  </div>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ClockCircleOutlined } from '@ant-design/icons-vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useNotificationsApi } from '@/api/notifications'
import { formatDate, formatDateTime } from '@/utils/formatters'

const router = useRouter()
const { showSuccess, showError } = usePageAlert()
const notificationsApi = useNotificationsApi()

const props = defineProps({
  autoLoad: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['notification-click', 'mark-read'])

// 狀態
const loading = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `共 ${total} 條通知`
})

// 篩選條件
const filters = reactive({
  alert_type: null,
  is_read: null
})

// 分頁配置
const paginationConfig = computed(() => ({
  ...pagination,
  onChange: (page, pageSize) => {
    pagination.current = page
    pagination.pageSize = pageSize
    loadNotifications()
  },
  onShowSizeChange: (current, size) => {
    pagination.current = 1
    pagination.pageSize = size
    loadNotifications()
  }
}))

// 獲取通知類型顏色
const getNotificationTypeColor = (type) => {
  const colorMap = {
    overdue: 'red',
    upcoming: 'orange',
    delay: 'blue',
    conflict: 'purple'
  }
  return colorMap[type] || 'default'
}

// 獲取通知類型文本
const getNotificationTypeText = (type) => {
  const textMap = {
    overdue: '逾期',
    upcoming: '即將到期',
    delay: '前置任務延誤',
    conflict: '固定期限衝突'
  }
  return textMap[type] || type
}

// 載入通知列表
const loadNotifications = async () => {
  try {
    loading.value = true
    
    const params = {
      page: pagination.current,
      perPage: pagination.pageSize
    }
    
    if (filters.alert_type) {
      params.alert_type = filters.alert_type
    }
    
    if (filters.is_read !== null) {
      params.is_read = filters.is_read
    }
    
    const data = await notificationsApi.fetchNotifications(params)
    
    notifications.value = data?.notifications || []
    unreadCount.value = data?.unreadCount || 0
    pagination.total = data?.pagination?.total || 0
  } catch (error) {
    console.error('[NotificationsList] 載入通知列表失敗:', error)
    showError('載入通知列表失敗')
  } finally {
    loading.value = false
  }
}

// 篩選變更
const handleFilterChange = () => {
  pagination.current = 1
  loadNotifications()
}

// 標記為已讀
const handleMarkAsRead = async (notification) => {
  try {
    await notificationsApi.markAsRead(notification.notification_id || notification.alert_id)
    showSuccess('已標記為已讀')
    
    // 更新本地狀態
    notification.is_read = true
    notification.read_at = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    
    emit('mark-read', notification)
  } catch (error) {
    console.error('[NotificationsList] 標記為已讀失敗:', error)
    showError('標記為已讀失敗')
  }
}

// 全部標記為已讀
const handleMarkAllAsRead = async () => {
  try {
    const unreadNotifications = notifications.value.filter(n => !n.is_read)
    if (unreadNotifications.length === 0) {
      return
    }
    
    const ids = unreadNotifications.map(n => n.notification_id || n.alert_id)
    await notificationsApi.markAsRead(ids)
    showSuccess(`已標記 ${ids.length} 條通知為已讀`)
    
    // 更新本地狀態
    unreadNotifications.forEach(n => {
      n.is_read = true
      n.read_at = new Date().toISOString()
    })
    unreadCount.value = 0
    
    emit('mark-read', unreadNotifications)
  } catch (error) {
    console.error('[NotificationsList] 全部標記為已讀失敗:', error)
    showError('全部標記為已讀失敗')
  }
}

// 查看任務
const handleViewTask = (notification) => {
  const taskId = notification.payload?.taskId || notification.payload?.task_id
  const link = notification.related_url || notification.link
  
  if (taskId) {
    router.push(`/tasks/${taskId}`)
  } else if (link) {
    router.push(link)
  } else {
    showError('無法找到任務連結')
    return
  }
  
  // 如果未讀，自動標記為已讀
  if (!notification.is_read) {
    handleMarkAsRead(notification)
  }
  
  emit('notification-click', notification)
}

// 生命週期
onMounted(() => {
  if (props.autoLoad) {
    loadNotifications()
  }
})

// 暴露方法供父組件調用
defineExpose({
  loadNotifications,
  refresh: loadNotifications
})
</script>

<style scoped>
.notifications-list {
  width: 100%;
}

.notification-item {
  border-bottom: 1px solid #f0f0f0;
  padding: 16px 0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #fafafa;
}

.notification-item.unread {
  background-color: #f6ffed;
  border-left: 3px solid #52c41a;
  padding-left: 13px;
}

.notification-item.read {
  opacity: 0.8;
}

.notification-content {
  margin-top: 8px;
}

.notification-description {
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 8px;
  line-height: 1.6;
}

.notification-meta {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.notification-meta strong {
  color: #4b5563;
  margin-right: 4px;
}

.notification-time {
  font-size: 12px;
  color: #9ca3af;
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.ant-list-item-action) {
  margin-left: 16px;
}

:deep(.ant-list-item-meta-title) {
  margin-bottom: 8px;
}

:deep(.ant-list-item-meta-description) {
  color: #6b7280;
}
</style>

