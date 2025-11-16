<template>
  <div>
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
    
    <!-- 操作欄 -->
    <div style="margin-bottom: 16px; display: flex; gap: 12px; align-items: center">
      <a-select
        v-model:value="selectedServiceId"
        placeholder="全部服務"
        style="width: 200px"
        allow-clear
        @change="handleServiceFilterChange"
      >
        <a-select-option :value="null">全部服務</a-select-option>
        <a-select-option
          v-for="service in store.tempServices"
          :key="service.id"
          :value="service.id"
        >
          {{ service.name || service.service_name }}
        </a-select-option>
      </a-select>

      <a-button @click="handleSelectAll(true)">全選</a-button>
      <a-button @click="handleSelectAll(false)">全不選</a-button>
      <a-button
        type="primary"
        danger
        :disabled="selectedRowKeys.length === 0"
        @click="handleBatchDelete"
      >
        批量刪除
      </a-button>
      <a-dropdown>
        <template #overlay>
          <a-menu @click="handleMenuClick">
            <a-menu-item key="recurring">+ 新增定期服務收費計劃</a-menu-item>
            <a-menu-item key="one-time">+ 新增一次性收費</a-menu-item>
          </a-menu>
        </template>
        <a-button type="primary">
          + 新增收費
          <DownOutlined />
        </a-button>
      </a-dropdown>
    </div>

    <!-- 收費列表表格 -->
    <a-table
      :dataSource="filteredBillings"
      :columns="columns"
      :pagination="false"
      row-key="id"
      :row-selection="{
        selectedRowKeys: selectedRowKeys,
        onChange: handleSelectionChange
      }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'service_name'">
          {{ record.service_name }}
        </template>
        <template v-if="column.key === 'month_or_item'">
          <span v-if="record.billing_type === 'recurring' || record.billing_type === 'monthly'">
            <template v-if="record.billing_year">{{ record.billing_year }}年</template>{{ record.billing_month }}月
          </span>
          <span v-else>
            {{ record.description || '未命名項目' }}
          </span>
        </template>
        <template v-if="column.key === 'billing_amount'">
          {{ formatCurrency(record.billing_amount) }}
        </template>
        <template v-if="column.key === 'payment_due_days'">
          {{ record.payment_due_days }} 天
        </template>
        <template v-if="column.key === 'notes'">
          {{ record.notes || '-' }}
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="handleEdit(record)">
              編輯
            </a-button>
            <a-button type="link" danger size="small" @click="handleDelete(record.id)">
              刪除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <div v-if="filteredBillings.length === 0" style="text-align: center; padding: 40px; color: #9ca3af">
      尚未設定收費
    </div>

    <!-- 保存按鈕 -->
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 12px">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="store.loading" @click="handleSave">
        保存帳務設定
      </a-button>
    </div>

    <!-- 收費彈窗（一次性服務） -->
    <BillingModal
      v-model:visible="isModalVisible"
      :editing-billing="editingBilling"
      @success="handleModalSuccess"
    />

    <!-- 定期服務收費計劃彈窗 -->
    <RecurringBillingPlanModal
      v-model:visible="isPlanModalVisible"
      :editing-plan="editingPlan"
      @success="handlePlanModalSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { DownOutlined } from '@ant-design/icons-vue'
import { useClientAddStore } from '@/stores/clientAdd'
import { usePageAlert } from '@/composables/usePageAlert'
import { formatCurrency } from '@/utils/formatters'
import BillingModal from '@/components/clients/BillingModal.vue'
import RecurringBillingPlanModal from '@/components/clients/RecurringBillingPlanModal.vue'

const store = useClientAddStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 本地狀態
const selectedServiceId = ref(null)
const selectedRowKeys = ref([])
const isModalVisible = ref(false)
const isPlanModalVisible = ref(false)
const editingBilling = ref(null)
const editingPlan = ref(null)

// 過濾後的收費列表
const filteredBillings = computed(() => {
  if (!selectedServiceId.value) {
    return store.tempBillings
  }
  return store.tempBillings.filter(billing => {
    return billing.temp_service_id === selectedServiceId.value
  })
})

// 表格列定義
const columns = [
  {
    title: '服務名稱',
    key: 'service_name',
    dataIndex: 'service_name'
  },
  {
    title: '月份/項目',
    key: 'month_or_item'
  },
  {
    title: '金額',
    key: 'billing_amount',
    dataIndex: 'billing_amount',
    width: 120
  },
  {
    title: '付款期限',
    key: 'payment_due_days',
    dataIndex: 'payment_due_days',
    width: 100
  },
  {
    title: '備註',
    key: 'notes',
    dataIndex: 'notes'
  },
  {
    title: '操作',
    key: 'action',
    width: 150
  }
]

// 處理服務篩選變化
const handleServiceFilterChange = () => {
  selectedRowKeys.value = []
}

// 處理全選/全不選
const handleSelectAll = (selectAll) => {
  if (selectAll) {
    selectedRowKeys.value = filteredBillings.value.map(billing => billing.id)
  } else {
    selectedRowKeys.value = []
  }
}

// 處理選擇變化
const handleSelectionChange = (keys) => {
  selectedRowKeys.value = keys
}

// 處理批量刪除
const handleBatchDelete = () => {
  if (selectedRowKeys.value.length === 0) {
    return
  }

  store.batchRemoveTempBillings(selectedRowKeys.value)
  selectedRowKeys.value = []
  showSuccess('已刪除選中的收費記錄')
}

// 處理菜單點擊
const handleMenuClick = ({ key }) => {
  if (key === 'recurring') {
    editingPlan.value = null
    isPlanModalVisible.value = true
  } else if (key === 'one-time') {
    editingBilling.value = null
    isModalVisible.value = true
  }
}

// 處理新增收費（向後兼容）
const handleAddBilling = () => {
  editingBilling.value = null
  isModalVisible.value = true
}

// 處理編輯
const handleEdit = (billing) => {
  editingBilling.value = billing
  isModalVisible.value = true
}

// 處理刪除
const handleDelete = (billingId) => {
  store.removeTempBilling(billingId)
  showSuccess('已刪除收費記錄')
}

// 處理彈窗成功
const handleModalSuccess = () => {
  // 彈窗關閉後，清空編輯狀態
  editingBilling.value = null
}

// 處理收費計劃彈窗成功
const handlePlanModalSuccess = () => {
  // 彈窗關閉後，清空編輯狀態
  editingPlan.value = null
}

// 處理保存帳務設定
const handleSave = async () => {
  try {
    // 檢查客戶是否已存在
    if (!store.createdClientId) {
      showError('請先保存基本資訊，客戶必須已存在才能保存帳務設定')
      return
    }
    
    // 保存帳務設定
    await store.saveBillings()
    
    showSuccess('帳務設定保存成功！')
    
    // 保存成功後，可以選擇繼續編輯其他分頁或離開
  } catch (error) {
    showError(error.message || '保存失敗')
  }
}

// 處理取消
const handleCancel = () => {
  window.history.back()
}
</script>

<style scoped>
</style>
