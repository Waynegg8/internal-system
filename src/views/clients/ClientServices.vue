<template>
  <a-card title="客戶服務">
    <!-- 頁面提示 -->
    <PageAlerts
      v-model:success="successMessage"
      v-model:error="errorMessage"
    />
    
    <template #extra>
      <a-button type="primary" @click="showAddModal">
        <template #icon>
          <PlusOutlined />
        </template>
        新增服務
      </a-button>
    </template>

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
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="showEditModal(record)">編輯</a-button>
            <a-button type="link" size="small" @click="handleConfigureTasks(record)">
              配置任務
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
  </a-card>
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
  status: 'active',
  start_date: null,
  client_service_id: null
})

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
  formState.status = 'active'
  formState.start_date = null
  formState.client_service_id = null
  isModalVisible.value = true
}

// 顯示編輯 Modal
const showEditModal = (record) => {
  isEditing.value = true
  formState.service_id = record.service_id
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
    await clientStore.fetchClientDetail(clientId)
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
    await clientStore.fetchClientDetail(clientId)
  } catch (error) {
    console.error('刪除失敗:', error)
    showError(error.message || '刪除失敗')
  }
}

onMounted(async () => {
  // 確保客戶詳情已加載
  const clientId = route.params.id
  if (!currentClient.value || currentClient.value.clientId !== clientId) {
    await clientStore.fetchClientDetail(clientId)
  }
  await loadAllServices()
})
</script>

<style scoped>
</style>

