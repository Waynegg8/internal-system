<template>
  <div>

    <a-card title="客戶服務">
    <!-- 頁面提示 -->
    <PageAlerts
      v-model:success="successMessage"
      v-model:error="errorMessage"
    />
    
    <!-- 工具列（避免 #extra 在某些情況重複渲染，改為內部工具列） -->
    <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
      <a-button type="primary" @click="showAddModal">
        <template #icon>
          <PlusOutlined />
        </template>
        新增服務
      </a-button>
    </div>

    <!-- 服務列表表格 -->

    <!-- 服務列表表格 -->
    <a-table
      :dataSource="services"
      :columns="columns"
      :loading="loading"
      :pagination="false"
      row-key="client_service_id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'service_name'">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 500;">{{ record.service_name }}</span>
            <a-tag v-if="record.task_configs_count > 0" color="blue" size="small">
              {{ record.task_configs_count }} 個任務配置
            </a-tag>
          </div>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="getStatusColor(record.status)">
            {{ getStatusText(record.status) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'year_total'">
          <span>{{ formatCurrency(record.year_total || 0) }}</span>
        </template>
        <template v-else-if="column.key === 'task_configs_count'">
          <a-tag color="blue">
            {{ Number(record.task_configs_count || 0) }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'executions_count'">
          <span>
            {{ getExecutionsCount(record) }}
          </span>
        </template>
        <template v-else-if="column.key === 'service_type'">
          <a-tag :color="record.service_type === 'recurring' ? 'blue' : 'orange'">
            {{ record.service_type === 'recurring' ? '定期服務' : '一次性服務' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'execution_months'">
          <span v-if="record.service_type === 'recurring' && record.execution_months && record.execution_months.length">
            {{ formatExecutionMonths(record.execution_months) }}
          </span>
          <span v-else style="color: #9ca3af">-</span>
        </template>
        <template v-else-if="column.key === 'use_for_auto_generate'">
          <a-tag :color="record.use_for_auto_generate ? 'green' : 'default'">
            {{ record.use_for_auto_generate ? '是' : '否' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="showEditModal(record)">編輯</a-button>
            <a-button type="link" size="small" @click="handleConfigureTasks(record)">
              配置任務
            </a-button>
            <a-button
              v-if="record.service_type === 'one-time'"
              type="link"
              size="small"
              data-testid="execute-once-btn"
              @click="openExecuteOnceModal(record)"
            >
              執行服務
            </a-button>
            <a-button type="link" danger size="small" @click="handleDelete(record.client_service_id)">刪除</a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 空狀態 -->
    <a-empty v-if="!loading && services.length === 0" description="尚無服務" />

    <!-- 新增/編輯服務 Modal -->
    <a-modal
      v-model:open="isModalVisible"
      :title="isEditing ? '編輯服務' : '新增服務'"
      :width="600"
      :confirm-loading="isSubmitting"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :model="formState" layout="vertical" ref="formRef">
        <a-form-item
          label="服務類型"
          name="service_id"
          :rules="[{ required: true, message: '請選擇服務類型' }]"
        >
          <a-select
            v-model:value="formState.service_id"
            placeholder="請選擇服務類型"
            :loading="isLoadingData"
            :options="serviceOptions"
          />
        </a-form-item>

        <a-form-item label="服務型態" name="service_type" :rules="[{ required: true, message: '請選擇服務型態' }]">
          <a-radio-group v-model:value="formState.service_type">
            <a-radio value="recurring">定期服務</a-radio>
            <a-radio value="one-time">一次性服務</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item v-if="formState.service_type === 'recurring'" label="執行月份" name="execution_months" :rules="[{ required: true, type: 'array', min: 1, message: '請至少選擇一個月份' }]">
          <a-checkbox-group v-model:value="formState.execution_months">
            <a-row :gutter="[8,8]">
              <a-col v-for="m in 12" :key="m" :span="6">
                <a-checkbox :value="m">{{ m }} 月</a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>

        <a-form-item label="用於自動生成任務" name="use_for_auto_generate">
          <a-switch v-model:checked="formState.use_for_auto_generate" />
        </a-form-item>

        <a-form-item
          label="狀態"
          name="status"
          :rules="[{ required: true, message: '請選擇狀態' }]"
        >
          <a-select v-model:value="formState.status" placeholder="請選擇狀態">
            <a-select-option value="active">使用中</a-select-option>
            <a-select-option value="suspended">暫停</a-select-option>
            <a-select-option value="expired">已到期</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="開始日期" name="start_date">
          <a-date-picker
            v-model:value="formState.start_date"
            placeholder="請選擇開始日期"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 一次性服務執行 Modal -->
    <a-modal
      v-model:open="isExecuteOnceVisible"
      title="執行一次性服務"
      :width="600"
      :confirm-loading="isExecuting"
      @ok="handleExecuteOnceOk"
      @cancel="handleExecuteOnceCancel"
    >
      <a-form :model="executeForm" layout="vertical" ref="executeFormRef">
        <a-form-item label="日期" name="billing_date" :rules="[{required:true,message:'請選擇日期'}]">
          <a-date-picker
            v-model:value="executeForm.billing_date"
            style="width:100%"
            value-format="YYYY-MM-DD"
            placeholder="選擇日期"
          />
        </a-form-item>
        <a-form-item label="說明" name="description" :rules="[{required:true,message:'請輸入說明'}]">
          <a-input v-model:value="executeForm.description" placeholder="請輸入一次性服務說明"/>
        </a-form-item>
        <a-form-item label="金額" name="billing_amount" :rules="[{required:true,message:'請輸入金額'}]">
          <a-input-number v-model:value="executeForm.billing_amount" :min="0" style="width:100%" placeholder="請輸入金額"/>
        </a-form-item>
        <a-form-item label="收款期限（天）" name="payment_due_days" :rules="[{required:true,message:'請輸入收款期限'}]">
          <a-input-number v-model:value="executeForm.payment_due_days" :min="1" style="width:100%" placeholder="預設30"/>
        </a-form-item>
        <a-form-item label="備註" name="notes">
          <a-textarea v-model:value="executeForm.notes" :rows="3" placeholder="可選填"/>
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useClientStore } from '@/stores/clients'
import {
  createClientService,
  updateClientService,
  deleteClientService
} from '@/api/clients'
import { fetchAllServices } from '@/api/services'
import { extractApiArray } from '@/utils/apiHelpers'
import { formatCurrency } from '@/utils/formatters'
import { createBillingSchedule } from '@/api/billing'
import PageAlerts from '@/components/shared/PageAlerts.vue'

const route = useRoute()
const router = useRouter()
const clientStore = useClientStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { currentClient, loading } = storeToRefs(clientStore)

// 服務列表
const services = computed(() => {
  console.log('Computing services - currentClient:', currentClient.value)
  console.log('Services array:', currentClient.value?.services)
  const result = currentClient.value?.services || []
  console.log('Final services result:', result, 'Length:', result.length)
  return result
})

// 表格列定義
const columns = [
  {
    title: '服務名稱',
    key: 'service_name',
    width: 300
  },
  {
    title: '任務配置數量',
    key: 'task_configs_count',
    width: 140,
    align: 'center'
  },
  {
    title: '類型',
    key: 'service_type',
    width: 120
  },
  {
    title: '執行次數',
    key: 'executions_count',
    width: 120,
    align: 'center'
  },
  {
    title: '執行月份',
    key: 'execution_months',
    width: 200
  },
  {
    title: '自動生成任務',
    key: 'use_for_auto_generate',
    width: 140
  },
  {
    title: '狀態',
    key: 'status',
    width: 120
  },
  {
    title: '年度總額',
    key: 'year_total',
    width: 150,
    align: 'right'
  },
  {
    title: '操作',
    key: 'action',
    width: 280,
    align: 'center'
  }
]

// Modal 狀態
const isModalVisible = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const isLoadingData = ref(false)
const formRef = ref(null)

// 表單狀態
const formState = reactive({
  service_id: null,
  service_type: 'recurring',
  execution_months: [],
  use_for_auto_generate: true,
  status: 'active',
  start_date: null,
  client_service_id: null
})

// 一次性執行狀態
const isExecuteOnceVisible = ref(false)
const isExecuting = ref(false)
const executeFormRef = ref(null)
const executeForm = reactive({
  client_service_id: null,
  billing_date: null,
  description: '',
  billing_amount: null,
  payment_due_days: 30,
  notes: ''
})

const openExecuteOnceModal = (record) => {
  executeForm.client_service_id = record.client_service_id
  executeForm.billing_date = null
  executeForm.description = ''
  executeForm.billing_amount = null
  executeForm.payment_due_days = 30
  executeForm.notes = ''
  isExecuteOnceVisible.value = true
}

const handleExecuteOnceOk = async () => {
  try {
    await executeFormRef.value.validate()
    isExecuting.value = true
    const payload = {
      client_service_id: parseInt(executeForm.client_service_id),
      billing_type: 'one-time',
      billing_month: 0,
      billing_amount: parseFloat(executeForm.billing_amount),
      payment_due_days: executeForm.payment_due_days || 30,
      billing_date: executeForm.billing_date,
      description: executeForm.description,
      notes: executeForm.notes || null
    }
    await createBillingSchedule(payload)
    showSuccess('一次性服務已執行並建立收費')
    isExecuteOnceVisible.value = false
    // 刷新詳情（年總額等）- 強制刷新以獲取最新數據
    await clientStore.fetchClientDetail(route.params.id, { forceRefresh: true })
  } catch (error) {
    console.error('執行一次性服務失敗:', error)
    showError(error.message || '執行一次性服務失敗')
  } finally {
    isExecuting.value = false
  }
}

const handleExecuteOnceCancel = () => {
  isExecuteOnceVisible.value = false
}

const formatExecutionMonths = (months) => {
  if (!Array.isArray(months) || months.length === 0) return '-'
  return months.sort((a,b)=>a-b).join(', ')
}

// 所有服務列表
const allServices = ref([])
const serviceOptions = computed(() => {
  return allServices.value.map(s => ({
    label: s.service_name,
    value: s.service_id
  }))
})

// 狀態顏色
const getStatusColor = (status) => {
  const colors = {
    active: 'green',
    suspended: 'orange',
    expired: 'red',
    cancelled: 'default'
  }
  return colors[status] || 'default'
}

// 狀態文字
const getStatusText = (status) => {
  const texts = {
    active: '使用中',
    suspended: '暫停',
    expired: '已到期',
    cancelled: '已取消'
  }
  return texts[status] || status
}

// 衍生：執行次數
const getExecutionsCount = (record) => {
  // 定期：以已選月份數量作為年度執行次數
  if (record.service_type === 'recurring') {
    const months = Array.isArray(record.execution_months) ? record.execution_months : []
    return months.length
  }
  // 一次性：以已建立的收費排程筆數作為執行次數（若不可用則顯示 0）
  const billingSchedule = Array.isArray(record.billing_schedule) ? record.billing_schedule : []
  return billingSchedule.length || 0
}

// 加載所有服務
const loadAllServices = async () => {
  try {
    isLoadingData.value = true
    const response = await fetchAllServices()
    allServices.value = extractApiArray(response, [])
  } catch (error) {
    console.error('載入服務列表失敗:', error)
  } finally {
    isLoadingData.value = false
  }
}

// 顯示新增 Modal
const showAddModal = () => {
  isEditing.value = false
  formState.service_id = null
  formState.service_type = 'recurring'
  formState.execution_months = [1,2,3,4,5,6,7,8,9,10,11,12]
  formState.use_for_auto_generate = true
  formState.status = 'active'
  formState.start_date = null
  formState.client_service_id = null
  isModalVisible.value = true
}

// 顯示編輯 Modal
const showEditModal = (record) => {
  isEditing.value = true
  formState.service_id = record.service_id
  formState.service_type = record.service_type || 'recurring'
  formState.execution_months = Array.isArray(record.execution_months) ? [...record.execution_months] : []
  formState.use_for_auto_generate = !!record.use_for_auto_generate
  formState.status = record.status
  formState.start_date = record.start_date
  formState.client_service_id = record.client_service_id
  isModalVisible.value = true
}

// Modal 確認
const handleModalOk = async () => {
  try {
    await formRef.value.validate()
    isSubmitting.value = true
    
    const clientId = route.params.id
    const payload = {
      service_id: formState.service_id,
      service_type: formState.service_type,
      execution_months: formState.service_type === 'recurring' ? formState.execution_months : null,
      use_for_auto_generate: formState.use_for_auto_generate ? 1 : 0,
      status: formState.status,
      start_date: formState.start_date
    }
    
    if (isEditing.value) {
      if (!formState.client_service_id) {
        showError('服務ID不存在')
        return
      }
      
      // 使用 client_service_id 而不是 service_id
      await updateClientService(clientId, formState.client_service_id, payload)
      showSuccess('服務已更新')
    } else {
      await createClientService(clientId, payload)
      showSuccess('服務已新增')
    }
    
    isModalVisible.value = false
    // 強制刷新以獲取最新服務列表
    await clientStore.fetchClientDetail(clientId, { forceRefresh: true })
  } catch (error) {
    console.error('操作失敗:', error)
    showError(error.message || '操作失敗')
  } finally {
    isSubmitting.value = false
  }
}

// Modal 取消
const handleModalCancel = () => {
  isModalVisible.value = false
}

// 配置任務 - 跳轉到獨立頁面
const handleConfigureTasks = (record) => {
  router.push(`/clients/${route.params.id}/services/${record.client_service_id}/config`)
}

// 刪除服務
const handleDelete = async (clientServiceId) => {
  try {
    const clientId = route.params.id
    await deleteClientService(clientId, clientServiceId)
    showSuccess('服務已刪除')
    // 強制刷新以獲取最新服務列表
    await clientStore.fetchClientDetail(clientId, { forceRefresh: true })
  } catch (error) {
    console.error('刪除失敗:', error)
    showError(error.message || '刪除失敗')
  }
}

onMounted(async () => {
  // 確保客戶詳情已加載（使用 skipCache 避免重複請求，但允許重用進行中的請求）
  const clientId = route.params.id
  const isLoaded = clientStore.isCurrentClientLoaded(clientId)
  
  if (!isLoaded) {
    await clientStore.fetchClientDetail(clientId, { skipCache: true })
  }
  
  // 移除自動建立服務的邏輯，這會導致不必要的 API 調用和數據變更
  // 如果客戶沒有服務，應該由用戶手動添加，而不是自動創建
  
  await loadAllServices()
})
</script>

<style scoped>
</style>

