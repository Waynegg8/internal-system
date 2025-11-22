<template>
  <div class="client-add-services">
    <!-- 新增服務按鈕 -->
    <div style="margin-bottom: 16px">
      <a-button type="primary" @click="isModalVisible = true">
        + 新增服務
      </a-button>
    </div>

    <!-- 服務表格 -->
    <a-table
      :dataSource="store.tempServices"
      :columns="columns"
      :pagination="false"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'service_type'">
          <a-tag :color="record.service_type === 'recurring' ? 'blue' : 'orange'">
            {{ record.service_type === 'recurring' ? '定期服務' : '一次性服務' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'execution_months'">
          <span v-if="record.service_type === 'recurring' && record.execution_months && record.execution_months.length > 0">
            {{ formatExecutionMonths(record.execution_months) }}
          </span>
          <span v-else style="color: #9ca3af">-</span>
        </template>
        <template v-if="column.key === 'use_for_auto_generate'">
          <a-tag :color="record.use_for_auto_generate ? 'green' : 'default'">
            {{ record.use_for_auto_generate ? '是' : '否' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'status'">
          <a-tag color="blue">{{ record.status || 'Pending' }}</a-tag>
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" @click="handleConfigureService(record)">
              配置任務
            </a-button>
            <a-button
              type="link"
              danger
              @click="store.removeTempService(record.id)"
            >
              刪除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 任務配置表單（點擊配置任務後顯示） -->
    <a-card v-if="configuringService" style="margin-top: 24px">
      <template #title>
        <a-space>
          <span>配置任務 - {{ configuringService.name }}</span>
          <a-tag color="blue">配置中</a-tag>
        </a-space>
      </template>
      <template #extra>
        <a-button @click="handleCloseConfig">關閉</a-button>
      </template>

      <TaskConfiguration
        v-model:tasks="configuringService.tasks"
        v-model:sops="configuringService.service_sops"
        :service-id="actualServiceId"
        :is-new-client="true"
      />
    </a-card>

    <!-- 空狀態提示 -->
    <div v-if="store.tempServices.length === 0" style="text-align: center; padding: 40px; color: #9ca3af">
      尚未添加服務
    </div>

    <!-- 保存按鈕 -->
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 12px">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="store.loading" @click="handleSave">
        保存服務設定
      </a-button>
    </div>

    <!-- 任務生成進度 Modal -->
    <a-modal
      v-model:open="generationModalVisible"
      title="正在生成任務"
      :footer="null"
      :closable="false"
      :mask-closable="false"
    >
      <div style="text-align: center; padding: 24px;">
        <a-spin size="large" />
        <p style="margin-top: 16px; color: #6b7280;">
          {{ generationStatus }}
        </p>
        <a-progress
          v-if="generationProgress >= 0"
          :percent="generationProgress"
          :status="generationProgress === 100 ? 'success' : 'active'"
          style="margin-top: 16px;"
        />
      </div>
    </a-modal>

    <!-- 新增服務 Modal -->
    <AddServiceModal
      v-model:visible="isModalVisible"
      @service-selected="handleServiceSelected"
      @generate-tasks="handleGenerateTasksEvent"
    />

    <!-- 收費計劃建立提示 Modal -->
    <CreateBillingPromptModal
      v-model:visible="billingPromptVisible"
      @confirm="handleCreateBilling"
      @cancel="handleSkipBilling"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClientAddStore } from '@/stores/clientAdd'
import { usePageAlert } from '@/composables/usePageAlert'
import { useTaskApi } from '@/api/tasks'
import AddServiceModal from '@/components/clients/AddServiceModal.vue'
import TaskConfiguration from '@/components/clients/TaskConfiguration.vue'
import CreateBillingPromptModal from '@/components/clients/CreateBillingPromptModal.vue'

const router = useRouter()
const store = useClientAddStore()
const { successMessage, errorMessage, showSuccess, showError, showWarning } = usePageAlert()
const taskApi = useTaskApi()

// 任務生成相關狀態
const generationModalVisible = ref(false)
const generationStatus = ref('正在生成任務...')
const generationProgress = ref(-1)

// 確保支持數據已載入
onMounted(async () => {
  // 強制載入支持數據，確保服務列表可用
  try {
    await store.fetchSupportData()
  } catch (error) {
    console.error('載入支持數據失敗:', error)
  }
})

// Modal 顯示狀態
const isModalVisible = ref(false)
const billingPromptVisible = ref(false)

// 當前正在配置的服務
const configuringService = ref(null)

// 計算實際的服務ID（確保不是臨時ID）
const actualServiceId = computed(() => {
  if (!configuringService.value) return null
  const serviceId = configuringService.value.service_id
  // 如果 service_id 是臨時ID，嘗試從 store.supportData.services 中查找真正的服務ID
  if (!serviceId || String(serviceId).startsWith('temp_')) {
    const serviceName = configuringService.value.name
    console.log('[ClientAddServices] 查找真正的服務ID，serviceName:', serviceName, 'store.services:', store.supportData.services)
    const masterService = store.supportData.services.find(s => {
      const sName = s.name || s.service_name
      return sName === serviceName
    })
    if (masterService) {
      const realServiceId = masterService.service_id || masterService.id
      console.log('[ClientAddServices] 找到真正的服務ID:', realServiceId, 'masterService:', masterService)
      return realServiceId
    }
    console.warn('[ClientAddServices] 無法找到真正的服務ID，service:', configuringService.value, 'available services:', store.supportData.services.map(s => ({ name: s.name || s.service_name, service_id: s.service_id || s.id })))
    return null
  }
  return serviceId
})

// 表格列定義
const columns = [
  {
    title: '服務名稱',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '服務類型',
    key: 'service_type',
    width: 100
  },
  {
    title: '執行頻率',
    key: 'execution_months',
    width: 150
  },
  {
    title: '自動生成',
    key: 'use_for_auto_generate',
    width: 100
  },
  {
    title: '狀態',
    dataIndex: 'status',
    key: 'status',
    width: 100
  },
  {
    title: '操作',
    key: 'action',
    width: 200
  }
]

// 處理服務選擇事件
const handleServiceSelected = (newService) => {
  store.addTempService(newService)
  isModalVisible.value = false
}

// 處理配置服務
const handleConfigureService = (service) => {
  console.log('[ClientAddServices] handleConfigureService - service:', service)
  console.log('[ClientAddServices] service.service_id:', service.service_id)
  configuringService.value = service
  
  // 等待下一個 tick 後檢查 actualServiceId
  nextTick(() => {
    console.log('[ClientAddServices] actualServiceId computed value:', actualServiceId.value)
    console.log('[ClientAddServices] configuringService.value.service_id:', configuringService.value?.service_id)
  })
  
  // 滾動到配置區域
  setTimeout(() => {
    const element = document.querySelector('.client-add-services a-card')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

// 關閉配置
const handleCloseConfig = () => {
  configuringService.value = null
}

// 監聽任務配置變化，同步到 store
watch(() => configuringService.value?.tasks, (newTasks) => {
  if (configuringService.value) {
    store.updateTempServiceTasks(configuringService.value.id, newTasks)
  }
}, { deep: true })

watch(() => configuringService.value?.service_sops, (newSops) => {
  if (configuringService.value) {
    store.updateTempServiceSOPs(configuringService.value.id, newSops)
  }
}, { deep: true })

// 處理保存服務設定
const handleSave = async () => {
  try {
    // 檢查客戶是否已存在
    if (!store.createdClientId) {
      showError('請先保存基本資訊，客戶必須已存在才能保存服務設定')
      return
    }
    
    // 保存服務設定
    await store.saveServices()
    
    // 檢查是否有一次性服務需要生成任務
    const oneTimeServices = store.tempServices.filter(s => 
      s.service_type === 'one-time' && 
      s.client_service_id && 
      s.tasks && 
      s.tasks.length > 0
    )
    
    // 為每個一次性服務生成任務
    if (oneTimeServices.length > 0) {
      for (const service of oneTimeServices) {
        await handleGenerateTasksForService(service.client_service_id, service.name)
      }
    }
    
    // 檢查是否有定期服務需要建立收費計劃
    const recurringServices = store.tempServices.filter(s => s.service_type === 'recurring')
    if (recurringServices.length > 0) {
      // 顯示收費計劃建立提示 Modal
      billingPromptVisible.value = true
    } else {
      showSuccess('服務設定保存成功！')
    }
    
    // 保存成功後，可以選擇繼續編輯其他分頁或離開
  } catch (error) {
    showError(error.message || '保存失敗')
  }
}

// 處理任務生成（一次性服務）
const handleGenerateTasksForService = async (clientServiceId, serviceName) => {
  try {
    // 顯示生成進度 Modal
    generationModalVisible.value = true
    generationStatus.value = `正在為服務「${serviceName}」生成任務...`
    generationProgress.value = 0

    // 計算服務月份（使用當前月份）
    const now = new Date()
    const serviceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // 更新進度
    generationProgress.value = 30
    generationStatus.value = '正在調用任務生成 API...'

    // 調用任務生成 API
    const result = await taskApi.generateTasksForOneTimeService(clientServiceId, serviceMonth)

    // 更新進度
    generationProgress.value = 100
    generationStatus.value = `任務生成完成！已生成 ${result.generated || 0} 個任務`

    // 顯示成功消息
    if (result.generated > 0) {
      showSuccess(`服務「${serviceName}」任務生成成功！已生成 ${result.generated} 個任務`)
    } else if (result.skipped > 0) {
      showWarning(`服務「${serviceName}」任務已存在，跳過 ${result.skipped} 個任務`)
    } else {
      showWarning(`服務「${serviceName}」沒有生成新任務`)
    }

    // 如果有錯誤，顯示警告
    if (result.errors && result.errors.length > 0) {
      console.warn('任務生成部分失敗:', result.errors)
      showWarning(`服務「${serviceName}」部分任務生成失敗：${result.errors.length} 個錯誤`)
    }

    // 延遲後關閉 Modal
    setTimeout(() => {
      generationModalVisible.value = false
    }, 2000)
  } catch (error) {
    console.error('任務生成失敗:', error)
    generationModalVisible.value = false
    showError(`服務「${serviceName}」任務生成失敗：${error.message || '請稍後重試'}`)
  } finally {
    generationProgress.value = -1
    generationStatus.value = '正在生成任務...'
  }
}

// 處理 AddServiceModal 的任務生成事件
const handleGenerateTasksEvent = (event) => {
  if (event.success) {
    // 任務生成成功，已在 AddServiceModal 中顯示消息
    console.log('任務生成成功:', event.result)
  } else {
    // 任務生成失敗，已在 AddServiceModal 中顯示錯誤
    console.error('任務生成失敗:', event.error)
  }
}

// 處理取消
const handleCancel = () => {
  window.history.back()
}

// 格式化執行月份顯示
const formatExecutionMonths = (months) => {
  if (!months || !Array.isArray(months) || months.length === 0) {
    return '-'
  }
  if (months.length === 12) {
    return '全年'
  }
  return months.sort((a, b) => a - b).join('、') + '月'
}

// 處理建立收費計劃
const handleCreateBilling = () => {
  // 跳轉到帳務設定分頁
  router.push('/clients/add/billing')
  showSuccess('請在帳務設定分頁建立收費計劃')
}

// 處理跳過建立收費計劃
const handleSkipBilling = () => {
  showSuccess('服務設定保存成功！您可以稍後在帳務設定分頁建立收費計劃')
}
</script>

<style scoped>
.client-add-services {
  padding: 0;
}
</style>
