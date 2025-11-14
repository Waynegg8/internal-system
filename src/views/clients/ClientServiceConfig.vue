<template>
  <div class="client-service-config-page">
    <!-- 返回按鈕和頁面標題 -->
    <div style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <a-button type="link" @click="handleBack">
          <template #icon>
            <ArrowLeftOutlined />
          </template>
          返回
        </a-button>
        <a-divider type="vertical" />
        <h2 style="margin: 0;">配置任務 - {{ serviceName }}</h2>
      </div>
    </div>

    <!-- 頁面提示 -->
    <PageAlerts
      v-model:success="successMessage"
      v-model:error="errorMessage"
    />

    <!-- 任務配置表單 -->
    <a-card :loading="loading">
      <TaskConfiguration
        v-if="!loading && currentService"
        v-model:tasks="taskConfigData.tasks"
        v-model:sops="taskConfigData.sops"
        :service-id="currentService.service_id"
        :client-id="route.params.clientId"
      />
    </a-card>

    <!-- 操作按鈕 -->
    <div style="margin-top: 24px; display: flex; justify-content: space-between;">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="isSaving" @click="handleSave">
        保存配置
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useClientStore } from '@/stores/clients'
import { storeToRefs } from 'pinia'
import { fetchTaskConfigs, batchSaveTaskConfigs } from '@/api/task-configs'
import { extractApiArray } from '@/utils/apiHelpers'
import PageAlerts from '@/components/shared/PageAlerts.vue'
import TaskConfiguration from '@/components/clients/TaskConfiguration.vue'

const route = useRoute()
const router = useRouter()
const clientStore = useClientStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { currentClient, loading } = storeToRefs(clientStore)

// 當前服務
const currentService = ref(null)
const isSaving = ref(false)

// 任務配置數據
const taskConfigData = reactive({
  tasks: [],
  sops: []
})

// 服務名稱
const serviceName = computed(() => {
  return currentService.value?.service_name || ''
})

// 載入任務配置
const loadTaskConfigs = async () => {
  try {
    const clientId = route.params.clientId
    const clientServiceId = route.params.clientServiceId
    
    // 從客戶詳情中找到對應的服務
    if (!currentClient.value || currentClient.value.clientId !== clientId) {
      await clientStore.fetchClientDetail(clientId)
    }
    
    const service = currentClient.value?.services?.find(
      s => s.client_service_id == clientServiceId || s.clientServiceId == clientServiceId
    )
    
    if (!service) {
      showError('找不到對應的服務')
      return
    }
    
    currentService.value = service
    
    // 載入現有的任務配置 - 使用 client_service_id 而非 service_id
    const response = await fetchTaskConfigs(clientId, clientServiceId)
    const configs = extractApiArray(response, [])
    
    // 轉換為 TaskConfiguration 需要的格式
    taskConfigData.tasks = configs.map(config => ({
      config_id: config.config_id,
      name: config.task_name,
      description: config.task_description,
      assignee_user_id: config.assignee_user_id,
      estimated_hours: config.estimated_hours,
      advance_days: config.advance_days || 7,
      due_rule: config.due_rule || 'end_of_month',
      due_value: config.due_value,
      stage_order: config.stage_order || 0,
      execution_frequency: config.execution_frequency || 'monthly',
      execution_months: config.execution_months || [1,2,3,4,5,6,7,8,9,10,11,12],
      notes: config.notes,
      sops: config.sops || [],
      sop_ids: (config.sops || []).map(s => s.sop_id || s.id)
    }))
    
    // 載入服務層級 SOP（如果有的話）
    taskConfigData.sops = [] // TODO: 從 API 獲取
  } catch (error) {
    console.error('載入任務配置失敗:', error)
    showError('載入任務配置失敗')
  }
}

// 保存任務配置
const handleSave = async () => {
  if (!currentService.value) return
  
  try {
    isSaving.value = true
    
    // 轉換格式並批量保存
    const payload = {
      tasks: taskConfigData.tasks.map(task => ({
        task_name: task.name,
        task_description: task.description,
        assignee_user_id: task.assignee_user_id,
        estimated_hours: task.estimated_hours,
        advance_days: task.advance_days || 7,
        due_rule: task.due_rule || 'end_of_month',
        due_value: task.due_value,
        stage_order: task.stage_order || 0,
        execution_frequency: task.execution_frequency || 'monthly',
        execution_months: task.execution_months || [1,2,3,4,5,6,7,8,9,10,11,12],
        notes: task.notes,
        sop_ids: task.sop_ids || []
      })),
      service_sops: taskConfigData.sops.map(s => s.sop_id || s.id)
    }
    
    // 使用 client_service_id 而非 service_id
    const clientServiceId = route.params.clientServiceId
    await batchSaveTaskConfigs(route.params.clientId, clientServiceId, payload)
    
    showSuccess('任務配置已保存')
    
    // 延遲後返回
    setTimeout(() => {
      handleBack()
    }, 1000)
  } catch (error) {
    console.error('保存任務配置失敗:', error)
    showError(error.message || '保存任務配置失敗')
  } finally {
    isSaving.value = false
  }
}

// 取消
const handleCancel = () => {
  handleBack()
}

// 返回
const handleBack = () => {
  router.push(`/clients/${route.params.clientId}/services`)
}

// 初始化
onMounted(() => {
  loadTaskConfigs()
})
</script>

<style scoped>
.client-service-config-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
</style>

