<template>
  <div style="padding: 24px">
    <a-card>
      
      <!-- 成功提示 -->
      <a-alert
        v-if="successMessage"
        type="success"
        :message="successMessage"
        show-icon
        closable
        @close="successMessage = ''"
        style="margin-bottom: 16px"
      />
      
      <!-- 錯誤提示 -->
      <a-alert
        v-if="errorMessage || error"
        type="error"
        :message="errorMessage || error"
        show-icon
        closable
        @close="errorMessage = ''; handleCloseError()"
        style="margin-bottom: 16px"
      />
      
      <!-- 收據提醒橫幅 -->
      <ReceiptReminderBanner
        :reminders="store.reminders"
        :loading="store.loading"
        @quick-create="handleQuickCreate"
        @postpone="handlePostponeReminder"
      />
      
      <!-- 篩選工具欄 -->
      <ReceiptFilters
        :filters="store.filters"
        @filters-change="handleFiltersChange"
        @add-receipt="handleAddReceipt"
      />
      
      <!-- 收據列表表格 -->
      <ReceiptTable
        :receipts="store.receipts"
        :loading="store.loading"
        :pagination="store.pagination"
        @page-change="handlePageChange"
        @view-receipt="handleViewReceipt"
      />
    </a-card>
    
    <!-- 新增收據彈窗 -->
    <ReceiptFormModal
      v-model:visible="receiptFormModalVisible"
      :clients="clients"
      :initial-data="quickCreateData"
      @success="handleReceiptFormSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { useReceiptStore } from '@/stores/receipts'
import { useClientApi } from '@/api/clients'
import ReceiptFilters from '@/components/receipts/ReceiptFilters.vue'
import ReceiptTable from '@/components/receipts/ReceiptTable.vue'
import ReceiptReminderBanner from '@/components/receipts/ReceiptReminderBanner.vue'
import ReceiptFormModal from '@/components/receipts/ReceiptFormModal.vue'

const router = useRouter()
const store = useReceiptStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { error } = storeToRefs(store)

// 本地狀態
const receiptFormModalVisible = ref(false)
const quickCreateData = ref(null)
const clients = ref([])

// 載入收據列表
const loadReceipts = async () => {
  try {
    await store.fetchAllReceipts()
  } catch (err) {
    console.error('載入收據列表失敗:', err)
  }
}

// 載入提醒列表
const loadReminders = async () => {
  try {
    await store.fetchReceiptReminders()
  } catch (err) {
    console.error('載入提醒列表失敗:', err)
  }
}

// 載入客戶列表
const loadClients = async () => {
  try {
    const response = await useClientApi().fetchClients({ perPage: 1000 })
    if (response.data && Array.isArray(response.data)) {
      clients.value = response.data
    }
  } catch (err) {
    console.error('載入客戶列表失敗:', err)
  }
}

// 載入所有數據
const loadData = async () => {
  await Promise.all([
    loadReceipts(),
    loadReminders(),
    loadClients()
  ])
}

// 處理篩選條件變化
const handleFiltersChange = (filters) => {
  store.setFilters(filters)
  store.setPagination({ current: 1 })
  loadReceipts()
}

// 處理分頁變化
const handlePageChange = (page, pageSize) => {
  store.setPagination({ current: page, pageSize })
  loadReceipts()
}

// 處理查看收據
const handleViewReceipt = (receiptId) => {
  router.push(`/receipts/${receiptId}`)
}

// 處理新增收據
const handleAddReceipt = () => {
  quickCreateData.value = null
  receiptFormModalVisible.value = true
}

// 處理快速開收據
const handleQuickCreate = (reminder) => {
  quickCreateData.value = {
    client_id: reminder.client_id || reminder.clientId,
    clientServiceId: reminder.client_service_id || reminder.clientServiceId,
    billing_month: reminder.billing_month || reminder.billingMonth,
    service_month: reminder.billing_month || reminder.billingMonth,
    amount: reminder.amount,
    service_name: reminder.service_name || reminder.serviceName
  }
  receiptFormModalVisible.value = true
}

// 處理暫緩提醒
const handlePostponeReminder = async (reminder, data) => {
  try {
    await store.postponeReminder(data)
    showSuccess('已暫緩開票提醒')
    // 提醒列表會在 store 的 postponeReminder action 中自動刷新
  } catch (err) {
    showError(err.message || '暫緩失敗，請稍後再試')
  }
}

// 處理新增收據成功
const handleReceiptFormSuccess = async (payload) => {
  try {
    await store.createReceipt(payload)
    showSuccess('收據建立成功')
    
    // 刷新列表和提醒
    await Promise.all([
      loadReceipts(),
      loadReminders()
    ])
    
    receiptFormModalVisible.value = false
    quickCreateData.value = null
  } catch (err) {
    showError(err.message || '建立失敗，請稍後再試')
  }
}

// 處理關閉錯誤提示
const handleCloseError = () => {
  store.error = null
}

// 生命週期
onMounted(() => {
  loadData()
})
</script>

