<template>
  <div style="padding: 24px">
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
    
    <!-- 頁面標題和操作按鈕 -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px">
      <a-button type="text" @click="handleBack" style="padding: 0">
        <template #icon>
          <ArrowLeftOutlined />
        </template>
        返回收據列表
      </a-button>
      
      <a-space>
        <a-button
          type="primary"
          @click="handleAddPayment"
          :disabled="isCancelled || loading"
        >
          新增收款
        </a-button>
        <a-button
          @click="handleEditReceipt"
          :disabled="isCancelled || loading"
        >
          編輯收據
        </a-button>
        <a-button
          @click="handlePrintInvoice"
          :disabled="loading"
          style="color: #10b981; border-color: #10b981"
        >
          <template #icon>
            <PrinterOutlined />
          </template>
          列印請款單
        </a-button>
        <a-button
          @click="handlePrintReceipt"
          :disabled="loading"
          style="color: #ea580c; border-color: #ea580c"
        >
          <template #icon>
            <PrinterOutlined />
          </template>
          列印收據
        </a-button>
        <a-button
          danger
          @click="handleCancelReceipt"
          :disabled="isCancelled || loading"
        >
          作廢收據
        </a-button>
      </a-space>
    </div>
    
    <!-- 載入中 -->
    <a-spin :spinning="loading" style="width: 100%">
      <div v-if="receipt">
        <!-- 收據基本信息 -->
        <ReceiptInfo :receipt="receipt" style="margin-bottom: 24px" />
        
        <!-- 收據明細 -->
        <ReceiptItemsTable
          :items="receipt.items || receipt.receipt_items || []"
          style="margin-bottom: 24px"
        />
        
        <!-- 收款記錄 -->
        <ReceiptPaymentsTable
          :payments="receipt.payments || receipt.receipt_payments || []"
          style="margin-bottom: 24px"
        />

        <!-- 編輯歷史 -->
        <ReceiptEditHistory
          :edit-history="receipt.edit_history || []"
        />
      </div>
      
      <!-- 空狀態 -->
      <a-empty
        v-else-if="!loading"
        description="收據不存在"
        style="padding: 60px 0"
      />
    </a-spin>
    
    <!-- 新增收款彈窗 -->
    <PaymentFormModal
      v-model:visible="paymentModalVisible"
      :outstanding-amount="outstandingAmount"
      :receipt-id="receiptId"
      @success="handlePaymentSuccess"
    />
    
    <!-- 編輯收據彈窗 -->
    <EditReceiptModal
      v-model:visible="editReceiptModalVisible"
      :receipt="receipt"
      :receipt-id="receiptId"
      @success="handleEditReceiptSuccess"
    />

    <!-- 作廢收據彈窗 -->
    <ReceiptCancelModal
      v-model:visible="cancelReceiptModalVisible"
      :receipt="receipt"
      @success="handleCancelReceiptSuccess"
    />

    <!-- 列印選擇彈窗 -->
    <ReceiptPrintModal
      v-model:visible="printModalVisible"
      :receipt="receipt"
      @success="handlePrintSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons-vue'
import { useReceiptStore } from '@/stores/receipts'
import { usePageAlert } from '@/composables/usePageAlert'
import ReceiptInfo from '@/components/receipts/ReceiptInfo.vue'
import ReceiptItemsTable from '@/components/receipts/ReceiptItemsTable.vue'
import ReceiptPaymentsTable from '@/components/receipts/ReceiptPaymentsTable.vue'
import ReceiptEditHistory from '@/components/receipts/ReceiptEditHistory.vue'
import PaymentFormModal from '@/components/receipts/PaymentFormModal.vue'
import EditReceiptModal from '@/components/receipts/EditReceiptModal.vue'
import ReceiptCancelModal from '@/components/receipts/ReceiptCancelModal.vue'
import ReceiptPrintModal from '@/components/receipts/ReceiptPrintModal.vue'
import { printInvoice, printReceipt } from '@/utils/receiptPrint'

const route = useRoute()
const router = useRouter()
const store = useReceiptStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { currentReceipt, loading, error } = storeToRefs(store)

// 從路由獲取收據ID
const receiptId = computed(() => route.params.id)

// 本地狀態
const paymentModalVisible = ref(false)
const editReceiptModalVisible = ref(false)
const cancelReceiptModalVisible = ref(false)
const printModalVisible = ref(false)

// 計算屬性
const receipt = computed(() => currentReceipt.value)

const outstandingAmount = computed(() => {
  if (!receipt.value) return 0
  return receipt.value.remaining_amount || receipt.value.outstandingAmount || receipt.value.outstanding_amount || 0
})

const isCancelled = computed(() => {
  if (!receipt.value) return false
  return receipt.value.status === 'cancelled'
})

// 載入收據詳情
const loadReceiptDetail = async () => {
  try {
    await store.fetchReceiptDetail(receiptId.value)
  } catch (err) {
    console.error('載入收據詳情失敗:', err)
    showError(err.message || '載入收據詳情失敗')
  }
}

// 處理返回
const handleBack = () => {
  router.push('/receipts')
}

// 處理新增收款
const handleAddPayment = () => {
  paymentModalVisible.value = true
}

// 處理新增收款成功
const handlePaymentSuccess = async (payload) => {
  try {
    await store.createPayment(receiptId.value, payload)
    showSuccess('收款記錄已新增')
    // store 的 createPayment 會自動刷新收據詳情
  } catch (err) {
    showError(err.message || '新增收款記錄失敗')
    throw err // 重新拋出錯誤，讓彈窗保持打開狀態
  }
}

// 處理編輯收據
const handleEditReceipt = () => {
  editReceiptModalVisible.value = true
}

// 處理編輯收據成功
const handleEditReceiptSuccess = async (payload) => {
  try {
    await store.updateReceipt(receiptId.value, payload)
    showSuccess('收據已更新')
    // store 的 updateReceipt 會自動刷新收據詳情
  } catch (err) {
    showError(err.message || '更新收據失敗')
    throw err // 重新拋出錯誤，讓彈窗保持打開狀態
  }
}

// 處理作廢收據
const handleCancelReceipt = () => {
  cancelReceiptModalVisible.value = true
}

// 處理作廢收據成功
const handleCancelReceiptSuccess = async (payload) => {
  try {
    await store.cancelReceipt(receiptId.value, payload.cancellationReason)
    showSuccess('收據已作廢')
    // 跳轉到收據列表
    router.push('/receipts')
  } catch (err) {
    showError(err.message || '作廢收據失敗')
    throw err // 重新拋出錯誤，讓彈窗保持打開狀態
  }
}

// 處理關閉錯誤提示
const handleCloseError = () => {
  store.error = null
}

// 處理列印請款單
const handlePrintInvoice = () => {
  if (!receipt.value) return
  printModalVisible.value = true
}

// 處理列印收據
const handlePrintReceipt = () => {
  if (!receipt.value) return
  printModalVisible.value = true
}

// 處理列印成功
const handlePrintSuccess = (payload) => {
  // 列印已在組件內處理，這裡只需要關閉彈窗
  printModalVisible.value = false
}

// 監聽路由參數變化，重新載入收據詳情
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadReceiptDetail()
  }
})

// 生命週期
onMounted(() => {
  if (receiptId.value) {
    loadReceiptDetail()
  }
})
</script>

