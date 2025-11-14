<template>
  <a-alert
    v-if="reminders && reminders.length > 0"
    type="success"
    show-icon
    style="margin-bottom: 16px"
  >
    <template #message>
      <div>
        <div style="font-weight: 600; margin-bottom: 12px">
          📋 應開收據提醒（{{ reminders.length }} 項）
        </div>
        <a-list
          :data-source="reminders"
          size="small"
          :bordered="false"
        >
          <template #renderItem="{ item }">
            <a-list-item style="padding: 8px 0; border-bottom: 1px solid #f0f0f0">
              <a-list-item-meta>
                <template #title>
                  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
                    <span style="font-weight: 500">
                      <strong>{{ item.client_name || item.clientName }}</strong>
                      - {{ item.service_name || item.serviceName }}
                    </span>
                    <a-tag color="blue">
                      {{ item.billing_month || item.billingMonth }}月
                    </a-tag>
                    <span style="color: #52c41a; font-weight: 600">
                      ${{ (item.amount || 0).toLocaleString() }}
                    </span>
                    <span v-if="item.total_tasks || item.totalTasks" style="color: #6b7280; font-size: 12px">
                      （{{ item.completed_tasks || item.completedTasks }}/{{ item.total_tasks || item.totalTasks }} 任務已完成）
                    </span>
                  </div>
                </template>
              </a-list-item-meta>
              <template #actions>
                <a-space>
                  <a-button type="link" size="small" @click="handleQuickCreate(item)">
                    立即開收據
                  </a-button>
                  <a-button type="link" size="small" danger @click="handlePostpone(item)">
                    暫緩
                  </a-button>
                </a-space>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </div>
    </template>
  </a-alert>
  
  <!-- 暫緩原因輸入彈窗 -->
  <a-modal
    v-model:open="postponeModalVisible"
    title="暫緩開票提醒"
    :confirm-loading="postponing"
    @ok="handlePostponeConfirm"
    @cancel="handlePostponeCancel"
  >
    <a-form :model="postponeForm" layout="vertical">
      <a-form-item label="暫緩原因（可選）">
        <a-textarea
          v-model:value="postponeForm.reason"
          placeholder="例如：等其他服務完成後一起開收據"
          :rows="3"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  reminders: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['quick-create', 'postpone'])

// 暫緩相關狀態
const postponeModalVisible = ref(false)
const postponing = ref(false)
const currentReminder = ref(null)
const postponeForm = ref({
  reason: ''
})

// 處理快速開收據
const handleQuickCreate = (reminder) => {
  emit('quick-create', reminder)
}

// 處理暫緩
const handlePostpone = (reminder) => {
  currentReminder.value = reminder
  postponeForm.value.reason = ''
  postponeModalVisible.value = true
}

// 確認暫緩
const handlePostponeConfirm = async () => {
  if (!currentReminder.value) return
  
  postponing.value = true
  try {
    const data = {
      client_service_id: currentReminder.value.client_service_id || currentReminder.value.clientServiceId,
      service_month: getServiceMonth(currentReminder.value),
      postpone_reason: postponeForm.value.reason.trim() || ''
    }
    
    emit('postpone', currentReminder.value, data)
    
    postponeModalVisible.value = false
    currentReminder.value = null
    postponeForm.value.reason = ''
  } catch (error) {
    console.error('暫緩提醒失敗:', error)
  } finally {
    postponing.value = false
  }
}

// 取消暫緩
const handlePostponeCancel = () => {
  postponeModalVisible.value = false
  currentReminder.value = null
  postponeForm.value.reason = ''
}

// 獲取服務月份（格式：YYYY-MM）
const getServiceMonth = (reminder) => {
  const billingMonth = reminder.billing_month || reminder.billingMonth
  if (!billingMonth) {
    // 如果沒有月份，使用當前年月
    const now = new Date()
    const year = now.getFullYear()
    const month = String(billingMonth || now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }
  
  // 如果已經是 YYYY-MM 格式，直接返回
  if (String(billingMonth).includes('-')) {
    return String(billingMonth)
  }
  
  // 如果是數字月份，轉換為 YYYY-MM
  const now = new Date()
  const year = now.getFullYear()
  const month = String(billingMonth).padStart(2, '0')
  return `${year}-${month}`
}
</script>

