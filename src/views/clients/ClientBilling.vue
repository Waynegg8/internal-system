<template>
  <a-card title="收費設定">
    <!-- 頁面提示 -->
    <PageAlerts
      v-model:success="successMessage"
      v-model:error="errorMessage"
      v-model:warning="warningMessage"
    />
    
    <!-- 頂部操作區 -->
    <template #extra>
      <a-space>
        <a-select
          v-model:value="selectedServiceId"
          placeholder="請選擇服務"
          style="width: 200px"
          :options="serviceOptions"
          allow-clear
        >
          <template #placeholder>
            <span>請選擇服務</span>
          </template>
        </a-select>
        <a-button danger :disabled="selectedRowKeys.length === 0" @click="handleBatchDelete">
          批量刪除
        </a-button>
        <a-button type="primary" @click="showAddModal">
          <template #icon>
            <PlusOutlined />
          </template>
          新增收費
        </a-button>
      </a-space>
    </template>

    <!-- 收費列表表格 -->
    <a-table
      :dataSource="billingSchedules"
      :columns="columns"
      :loading="isLoading"
      :pagination="false"
      :rowSelection="rowSelection"
      row-key="schedule_id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'billing_type'">
          <a-tag :color="record.billing_type === 'monthly' ? 'blue' : 'green'">
            {{ record.billing_type === 'monthly' ? '按月收費' : '一次性收費' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'month'">
          <span v-if="record.billing_type === 'monthly'">
            {{ record.billing_month }}月
          </span>
          <span v-else>
            {{ formatDate(record.billing_date) }}
          </span>
        </template>
        <template v-else-if="column.key === 'amount'">
          <span>{{ formatCurrency(record.billing_amount || 0) }}</span>
        </template>
        <template v-else-if="column.key === 'payment_due_days'">
          <span>{{ record.payment_due_days ? `${record.payment_due_days} 天` : '-' }}</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="showEditModal(record)">編輯</a-button>
            <a-button type="link" danger size="small" @click="handleDelete(getId(record, 'scheduleId', 'schedule_id', 'id'))">刪除</a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 空狀態 -->
    <a-empty v-if="!isLoading && billingSchedules.length === 0" description="尚無收費計劃" />

    <!-- 新增/編輯收費 Modal -->
    <a-modal
      v-model:open="isModalVisible"
      :title="isEditing ? '編輯收費' : '新增收費'"
      :width="800"
      :confirm-loading="isSubmitting"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :model="formState" layout="vertical" ref="formRef">
        <!-- 選擇服務（新增時顯示，編輯時隱藏） -->
        <a-form-item
          v-if="!isEditing"
          label="選擇服務"
          name="client_service_id"
          :rules="[{ required: true, message: '請選擇服務' }]"
        >
          <a-select
            v-model:value="formState.client_service_id"
            placeholder="請選擇服務"
            :options="serviceOptions"
          />
        </a-form-item>

        <!-- 收費類型選擇（編輯模式下禁用） -->
        <a-form-item
          label="收費類型"
          name="billing_type"
          :rules="[{ required: true, message: '請選擇收費類型' }]"
        >
          <a-radio-group
            v-model:value="billingType"
            @change="handleBillingTypeChange"
            :disabled="isEditing"
          >
            <a-radio-button value="monthly">
              <div style="text-align: left">
                <div style="font-weight: 500">按月收費</div>
                <div style="font-size: 12px; color: #6b7280">每月固定金額</div>
              </div>
            </a-radio-button>
            <a-radio-button value="one-time">
              <div style="text-align: left">
                <div style="font-weight: 500">一次性收費</div>
                <div style="font-size: 12px; color: #6b7280">設立費、顧問費等</div>
              </div>
            </a-radio-button>
          </a-radio-group>
        </a-form-item>

        <!-- 按月收費表單 -->
        <div v-if="billingType === 'monthly'">
          <a-form-item
            label="每月金額"
            name="billing_amount"
            :rules="[{ required: true, message: '請輸入金額' }]"
          >
            <a-input-number
              v-model:value="formState.billing_amount"
              placeholder="請輸入金額"
              :min="0"
              :precision="2"
              style="width: 100%"
            />
          </a-form-item>

          <a-form-item label="付款期限（天）" name="payment_due_days">
            <a-input-number
              v-model:value="formState.payment_due_days"
              placeholder="30"
              :min="1"
              style="width: 100%"
            />
          </a-form-item>

          <!-- 編輯模式下顯示當前月份（只讀） -->
          <a-form-item v-if="isEditing" label="月份">
            <a-input :value="`${formState.billing_month}月`" disabled />
          </a-form-item>

          <!-- 新增模式下顯示月份選擇 -->
          <template v-else>
            <a-form-item label="月份範圍" name="month_range">
              <a-select v-model:value="formState.month_range" @change="handleMonthRangeChange">
                <a-select-option value="all">全年（1-12月）</a-select-option>
                <a-select-option value="custom">自選月份</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item
              v-if="formState.month_range === 'custom'"
              label="選擇月份"
              name="billing_months"
              :rules="[
                {
                  required: formState.month_range === 'custom',
                  message: '請至少選擇一個月份',
                  trigger: 'change'
                }
              ]"
            >
              <div style="margin-bottom: 8px">
                <a-space>
                  <a-button size="small" @click="selectAllMonths(true)">全選</a-button>
                  <a-button size="small" @click="selectAllMonths(false)">全不選</a-button>
                </a-space>
              </div>
              <a-checkbox-group v-model:value="formState.billing_months">
                <a-row :gutter="[8, 8]">
                  <a-col :span="4" v-for="month in 12" :key="month">
                    <a-checkbox :value="month">{{ month }}月</a-checkbox>
                  </a-col>
                </a-row>
              </a-checkbox-group>
            </a-form-item>
          </template>
        </div>

        <!-- 一次性收費表單 -->
        <div v-if="billingType === 'one-time'">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item
                label="項目名稱"
                name="description"
                :rules="[{ required: true, message: '請輸入項目名稱' }]"
              >
                <a-input
                  v-model:value="formState.description"
                  placeholder="例如：設立費"
                  :maxlength="100"
                />
                <template #help>
                  <span style="color: #6b7280; font-size: 12px">用於識別這筆收費</span>
                </template>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item
                label="收費金額"
                name="billing_amount"
                :rules="[{ required: true, message: '請輸入金額' }]"
              >
                <a-input-number
                  v-model:value="formState.billing_amount"
                  placeholder="請輸入金額"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item
                label="收費日期"
                name="billing_date"
                :rules="[{ required: true, message: '請選擇收費日期' }]"
              >
                <a-date-picker
                  v-model:value="formState.billing_date"
                  placeholder="請選擇日期"
                  style="width: 100%"
                  value-format="YYYY-MM-DD"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="付款期限（天）" name="payment_due_days">
                <a-input-number
                  v-model:value="formState.payment_due_days"
                  placeholder="30"
                  :min="1"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="備註" name="notes">
            <a-textarea
              v-model:value="formState.notes"
              placeholder="選填：補充說明"
              :rows="3"
            />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>
  </a-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useClientStore } from '@/stores/clients'
import { extractApiArray, extractApiData } from '@/utils/apiHelpers'
import {
  fetchBillingSchedules,
  createBillingSchedule,
  updateBillingSchedule,
  deleteBillingSchedule,
  batchDeleteBillingSchedules
} from '@/api/billing'
import { getId, getField } from '@/utils/fieldHelper'
import { formatCurrency } from '@/utils/formatters'
import PageAlerts from '@/components/shared/PageAlerts.vue'

const route = useRoute()
const clientStore = useClientStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 從 store 獲取響應式狀態
const { currentClient } = storeToRefs(clientStore)

// 服務列表（從 currentClient 計算）
const services = computed(() => {
  return currentClient.value?.services || []
})

// 服務選項（用於下拉選單）
const serviceOptions = computed(() => {
  return services.value.map((service) => ({
    label: getField(service, 'serviceName', 'service_name', '') || getField(service, 'name', null, ''),
    value: getId(service, 'clientServiceId', 'client_service_id', 'id')
  }))
})

// 選中的服務 ID
const selectedServiceId = ref(null)

// 收費計劃列表
const billingSchedules = ref([])
const isLoading = ref(false)

// 表格多選
const selectedRowKeys = ref([])

// 表格列定義
const columns = [
  {
    title: '服務名稱',
    dataIndex: 'service_name',
    key: 'service_name'
  },
  {
    title: '類型',
    key: 'billing_type',
    width: 120
  },
  {
    title: '月份/日期',
    key: 'month',
    width: 120
  },
  {
    title: '金額',
    key: 'amount',
    width: 150,
    align: 'right'
  },
  {
    title: '付款期限',
    key: 'payment_due_days',
    width: 120
  },
  {
    title: '備註',
    dataIndex: 'notes',
    key: 'notes',
    ellipsis: true
  },
  {
    title: '操作',
    key: 'action',
    width: 150
  }
]

// 表格行選擇配置
const rowSelection = {
  selectedRowKeys: selectedRowKeys,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  }
}

// Modal 狀態
const isModalVisible = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const billingType = ref('monthly')
const formRef = ref(null)

// 表單狀態
const formState = reactive({
  schedule_id: null, // 編輯時使用
  client_service_id: null,
  billing_type: 'monthly',
  billing_amount: null,
  payment_due_days: 30,
  month_range: 'all',
  billing_months: [],
  billing_month: null,
  billing_date: null,
  description: '',
  notes: ''
})

// 加載收費計劃
const loadBillingSchedules = async () => {
  if (!selectedServiceId.value) {
    billingSchedules.value = []
    return
  }

  isLoading.value = true
  try {
    const response = await fetchBillingSchedules(selectedServiceId.value)
    
    // 處理響應格式
    const data = extractApiData(response, {})
    let schedules = []
    if (data.schedules && Array.isArray(data.schedules)) {
      schedules = data.schedules
    } else if (Array.isArray(data)) {
      schedules = data
    } else {
      schedules = extractApiArray(response, [])
    }

    // 添加服務名稱
    const service = services.value.find(
      (s) => getId(s, 'clientServiceId', 'client_service_id', 'id') === selectedServiceId.value
    )
    billingSchedules.value = schedules.map((schedule) => ({
      ...schedule,
      service_name: getField(service, 'serviceName', 'service_name', '') || getField(service, 'name', null, '') || ''
    }))
  } catch (error) {
    console.error('載入收費計劃失敗:', error)
    showError('載入收費計劃失敗')
    billingSchedules.value = []
  } finally {
    isLoading.value = false
  }
}

// 監聽服務選擇變化
watch(selectedServiceId, () => {
  loadBillingSchedules()
  selectedRowKeys.value = [] // 清空選擇
})

// 監聽服務列表變化，自動選中第一個服務
watch(
  services,
  (newServices) => {
    if (newServices.length > 0 && !selectedServiceId.value) {
      selectedServiceId.value = getId(newServices[0], 'clientServiceId', 'client_service_id', 'id')
    }
  },
  { immediate: true }
)

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW')
}

// 處理收費類型變化
const handleBillingTypeChange = () => {
  formState.billing_type = billingType.value
  // 重置表單字段
  if (billingType.value === 'monthly') {
    formState.billing_date = null
    formState.description = ''
  } else {
    formState.billing_month = null
    formState.billing_months = []
    formState.month_range = 'all'
  }
}

// 處理月份範圍變化
const handleMonthRangeChange = () => {
  if (formState.month_range === 'all') {
    formState.billing_months = []
  }
}

// 全選/全不選月份
const selectAllMonths = (selectAll) => {
  if (selectAll) {
    formState.billing_months = Array.from({ length: 12 }, (_, i) => i + 1)
  } else {
    formState.billing_months = []
  }
}

// 顯示新增 Modal
const showAddModal = () => {
  isEditing.value = false
  billingType.value = 'monthly'
  formState.schedule_id = null
  formState.client_service_id = selectedServiceId.value
  formState.billing_type = 'monthly'
  formState.billing_amount = null
  formState.payment_due_days = 30
  formState.month_range = 'all'
  formState.billing_months = []
  formState.billing_month = null
  formState.billing_date = null
  formState.description = ''
  formState.notes = ''
  isModalVisible.value = true
}

// 顯示編輯 Modal
const showEditModal = (record) => {
  isEditing.value = true
  billingType.value = getField(record, 'billingType', 'billing_type', 'monthly') === 'monthly' ? 'monthly' : 'one-time'
  formState.schedule_id = getId(record, 'scheduleId', 'schedule_id', 'id')
  formState.client_service_id = getId(record, 'clientServiceId', 'client_service_id', 'id')
  formState.billing_type = getField(record, 'billingType', 'billing_type', 'monthly')
  formState.billing_amount = getField(record, 'billingAmount', 'billing_amount', null)
  formState.payment_due_days = getField(record, 'paymentDueDays', 'payment_due_days', 30)
  formState.notes = getField(record, 'notes', null, '')

  if (getField(record, 'billingType', 'billing_type', 'monthly') === 'monthly') {
    formState.month_range = 'custom'
    const billingMonth = getField(record, 'billingMonth', 'billing_month', null)
    formState.billing_months = billingMonth ? [billingMonth] : []
    formState.billing_month = billingMonth
    formState.billing_date = null
    formState.description = ''
  } else {
    formState.billing_date = getField(record, 'billingDate', 'billing_date', null)
    formState.description = getField(record, 'description', null, '')
    formState.month_range = 'all'
    formState.billing_months = []
    formState.billing_month = null
  }

  isModalVisible.value = true
}

// Modal 確認
const handleModalOk = async () => {
  try {
    // 表單驗證
    await formRef.value.validate()

    isSubmitting.value = true

    if (isEditing.value) {
      // 編輯模式：只更新當前收費計劃
      if (!formState.schedule_id) {
        showError('找不到要更新的收費計劃')
        return
      }

      const payload = {
        billing_amount: parseFloat(formState.billing_amount),
        payment_due_days: formState.payment_due_days || 30,
        notes: formState.notes || null
      }

      if (billingType.value === 'one-time') {
        payload.billing_date = formState.billing_date
        payload.description = formState.description
      }

      await updateBillingSchedule(formState.schedule_id, payload)
      showSuccess('收費已更新')
    } else {
      // 新增模式
      if (billingType.value === 'monthly') {
        // 按月收費
        if (formState.month_range === 'all') {
          // 批量創建全年（1-12月）
          const months = Array.from({ length: 12 }, (_, i) => i + 1)
          let successCount = 0
          let skipCount = 0
          let failCount = 0

          for (const month of months) {
            try {
              const payload = {
                client_service_id: parseInt(formState.client_service_id),
                billing_type: 'monthly',
                billing_month: month,
                billing_amount: parseFloat(formState.billing_amount),
                payment_due_days: formState.payment_due_days || 30
              }
              await createBillingSchedule(payload)
              successCount++
            } catch (error) {
              if (error.response?.data?.code === 'DUPLICATE') {
                skipCount++
              } else {
                failCount++
                console.error(`創建 ${month} 月收費失敗:`, error)
              }
            }
          }

          showSuccess(
            `批量新增完成：成功 ${successCount} 個，跳過 ${skipCount} 個，失敗 ${failCount} 個`
          )
        } else {
          // 自選月份
          if (!formState.billing_months || formState.billing_months.length === 0) {
            showError('請至少選擇一個月份')
            return
          }

          let successCount = 0
          let skipCount = 0
          let failCount = 0

          for (const month of formState.billing_months) {
            try {
              const payload = {
                client_service_id: parseInt(formState.client_service_id),
                billing_type: 'monthly',
                billing_month: month,
                billing_amount: parseFloat(formState.billing_amount),
                payment_due_days: formState.payment_due_days || 30
              }
              await createBillingSchedule(payload)
              successCount++
            } catch (error) {
              if (error.response?.data?.code === 'DUPLICATE') {
                skipCount++
              } else {
                failCount++
                console.error(`創建 ${month} 月收費失敗:`, error)
              }
            }
          }

          showSuccess(
            `批量新增完成：成功 ${successCount} 個，跳過 ${skipCount} 個，失敗 ${failCount} 個`
          )
        }
      } else {
        // 一次性收費
        const payload = {
          client_service_id: parseInt(formState.client_service_id),
          billing_type: 'one-time',
          billing_month: 0,
          billing_amount: parseFloat(formState.billing_amount),
          payment_due_days: formState.payment_due_days || 30,
          billing_date: formState.billing_date,
          description: formState.description,
          notes: formState.notes || null
        }

        await createBillingSchedule(payload)
        showSuccess('收費已新增')
      }
    }

    // 關閉 Modal
    isModalVisible.value = false

    // 刷新收費計劃列表
    await loadBillingSchedules()
  } catch (error) {
    console.error('操作失敗:', error)
    if (error.errorFields) {
      showError('請檢查表單輸入')
    } else {
      showError(error.message || '操作失敗，請稍後再試')
    }
  } finally {
    isSubmitting.value = false
  }
}

// Modal 取消
const handleModalCancel = () => {
  isModalVisible.value = false
  formRef.value?.resetFields()
}

// 刪除收費
const handleDelete = async (scheduleId) => {
  try {
    await deleteBillingSchedule(scheduleId)
    showSuccess('收費已刪除')

    // 刷新收費計劃列表
    await loadBillingSchedules()
  } catch (error) {
    console.error('刪除收費失敗:', error)
    showError(error.message || '刪除失敗，請稍後再試')
  }
}

// 批量刪除
const handleBatchDelete = async () => {
  if (selectedRowKeys.value.length === 0) {
    showWarning('請至少選擇一筆收費')
    return
  }

  try {
    const result = await batchDeleteBillingSchedules(selectedRowKeys.value)
    showSuccess(`已刪除 ${result.ok} 筆${result.fail > 0 ? `，失敗 ${result.fail} 筆` : ''}`)

    // 清空選擇
    selectedRowKeys.value = []

    // 刷新收費計劃列表
    await loadBillingSchedules()
  } catch (error) {
    console.error('批量刪除失敗:', error)
    showError('批量刪除失敗，請稍後再試')
  }
}
</script>

<style scoped>
/* 可以添加自定義樣式 */
</style>

