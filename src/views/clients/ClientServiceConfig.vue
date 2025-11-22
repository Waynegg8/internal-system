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

    <!-- 任務配置表單 -->
    <a-card :loading="loading">
      <TaskConfiguration
        v-if="!loading && currentService"
        ref="taskConfigRef"
        v-model:tasks="taskConfigData.tasks"
        v-model:sops="taskConfigData.sops"
        :service-id="currentService.service_id"
        :client-id="route.params.clientId"
        :service-type="currentService.service_type"
        :client-service-id="route.params.clientServiceId"
        :service-year="currentServiceYear"
        :service-month="currentServiceMonth"
        @task-option-selected="handleTaskOptionSelected"
      />
    </a-card>

    <!-- 任務預覽面板 -->
    <TaskPreviewPanel
      v-if="!loading && currentService && taskConfigData.tasks.length > 0"
      :tasks="previewTasks"
      :service-year="currentServiceYear"
      :service-month="currentServiceMonth"
      style="margin-top: 24px;"
    />

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
import { useTaskApi } from '@/api/tasks'
import PageAlerts from '@/components/shared/PageAlerts.vue'
import TaskConfiguration from '@/components/clients/TaskConfiguration.vue'
import TaskPreviewPanel from '@/components/clients/TaskPreviewPanel.vue'

const route = useRoute()
const router = useRouter()
const clientStore = useClientStore()
const { successMessage, errorMessage, showSuccess, showError, showWarning } = usePageAlert()

// 從 store 獲取響應式狀態
const { currentClient, loading } = storeToRefs(clientStore)

// 當前服務
const currentService = ref(null)
const isSaving = ref(false)
const taskConfigRef = ref(null)

// 任務生成相關狀態
const generationModalVisible = ref(false)
const generationStatus = ref('正在生成任務...')
const generationProgress = ref(-1)

// API
const taskApi = useTaskApi()

// 任務配置數據
const taskConfigData = reactive({
  tasks: [],
  sops: []
})

// 服務名稱
const serviceName = computed(() => {
  return currentService.value?.service_name || ''
})

// 當前服務年月（用於預覽，使用當前年月）
const currentServiceYear = computed(() => {
  const now = new Date()
  return now.getFullYear()
})

const currentServiceMonth = computed(() => {
  const now = new Date()
  return now.getMonth() + 1
})

// 轉換任務數據格式以適配 TaskPreviewPanel
// TaskPreviewPanel 期望的格式：
// - task_name (而不是 name)
// - generation_time_rule, generation_time_params
// - due_date_rule (而不是 due_rule), due_date_params (而不是 due_value)
// - days_due, is_fixed_deadline, assignee_name
const previewTasks = computed(() => {
  if (!taskConfigData.tasks || taskConfigData.tasks.length === 0) {
    return []
  }

  return taskConfigData.tasks.map(task => {
    // 轉換數據格式以適配 TaskPreviewPanel
    // 確保所有規則相關的屬性都被正確傳遞，以支持實時預覽更新
    return {
      task_name: task.name || '未命名任務',
      task_description: task.description || null,
      stage_order: task.stage_order || 0,
      assignee_user_id: task.assignee_user_id || null,
      assignee_name: null, // TODO: 如果需要顯示負責人姓名，需要從 store 或 API 獲取用戶列表
      estimated_hours: task.estimated_hours || null,
      // 生成時間規則：優先使用新的結構，如果沒有則使用舊的結構
      generation_time_rule: task.generation_time_rule?.rule || task.generation_time_rule || null,
      generation_time_params: task.generation_time_rule?.params || task.generation_time_params || {},
      // 到期日規則：優先使用新的結構，如果沒有則使用舊的結構
      due_date_rule: task.due_date_rule?.rule || task.due_date_rule || task.due_rule || null,
      due_date_params: task.due_date_rule?.params || task.due_date_params || (task.due_value ? { day: task.due_value } : {}),
      // 新規則：days_due（優先於舊規則）
      days_due: task.due_date_rule?.days_due ?? task.days_due ?? null,
      // 固定期限標記
      is_fixed_deadline: task.due_date_rule?.is_fixed_deadline ?? task.is_fixed_deadline ?? false
    }
  })
})

// 載入任務配置
const loadTaskConfigs = async () => {
  try {
    const clientId = route.params.clientId
    const clientServiceId = route.params.clientServiceId
    
    // 從客戶詳情中找到對應的服務（使用 skipCache 避免重複請求）
    const isLoaded = clientStore.isCurrentClientLoaded(clientId)
    if (!isLoaded) {
      await clientStore.fetchClientDetail(clientId, { skipCache: true })
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
    
    // 將後端規則名稱轉換為前端規則名稱的輔助函數
    const convertBackendRuleToFrontendRule = (backendRule) => {
      // 後端規則名稱到前端規則名稱的映射
      const ruleMap = {
        'end_of_month': 'service_month_end',
        'specific_day': 'fixed_date',
        'next_month_day': 'next_month_end',
        'days_after_start': 'days_after_start'
      }
      // 如果映射存在則返回映射值，否則返回原值（可能是前端規則名稱）
      return ruleMap[backendRule] || backendRule
    }
    
    // 轉換為 TaskConfiguration 需要的格式
    taskConfigData.tasks = configs.map(config => {
      // 將後端規則轉換為前端規則
      const frontendDueRule = convertBackendRuleToFrontendRule(config.due_rule || 'end_of_month')
      
      return {
        config_id: config.config_id,
        name: config.task_name,
        description: config.task_description,
        assignee_user_id: config.assignee_user_id,
        estimated_hours: config.estimated_hours,
        advance_days: config.advance_days || 7,
        // 新格式：due_date_rule（優先使用）
        due_date_rule: {
          rule: config.days_due !== null && config.days_due !== undefined ? null : frontendDueRule,
          params: config.due_value ? (typeof config.due_value === 'object' ? config.due_value : { day: config.due_value }) : {},
          days_due: config.days_due ?? null,
          is_fixed_deadline: config.is_fixed_deadline || false
        },
        // 舊格式：due_rule（向後兼容保留）
        due_rule: frontendDueRule,
        due_value: config.due_value,
        days_due: config.days_due,
        stage_order: config.stage_order || 0,
        execution_frequency: config.execution_frequency || 'monthly',
        execution_months: config.execution_months || [1,2,3,4,5,6,7,8,9,10,11,12],
        notes: config.notes,
        sops: config.sops || [],
        sop_ids: (config.sops || []).map(s => s.sop_id || s.id),
        use_for_auto_generate: config.auto_generate !== undefined ? (config.auto_generate === 1 || config.auto_generate === true) : (currentService.value?.service_type === 'recurring' ? true : false)
      }
    })
    
    // 載入服務層級 SOP（如果有的話）
    taskConfigData.sops = [] // TODO: 從 API 獲取
  } catch (error) {
    console.error('載入任務配置失敗:', error)
    showError('載入任務配置失敗')
  }
}

// 處理任務驗證
const handleTaskValidation = async (validateFn) => {
  if (typeof validateFn === 'function') {
    return await validateFn()
  }
  return { valid: true }
}

// 輔助函數：將字段名轉換為中文標籤
const getFieldLabel = (fieldName) => {
  const labelMap = {
    'name': '任務名稱',
    'stage_order': '階段編號',
    'estimated_hours': '預估工時',
    'advance_days': '提前生成',
    'days_due': '到期天數',
    'execution_frequency': '執行頻率',
    'execution_months': '執行月份'
  }
  return labelMap[fieldName] || fieldName
}

// 保存任務配置
const handleSave = async () => {
  if (!currentService.value) return
  
  try {
    isSaving.value = true
    
    // 驗證所有任務表單
    if (taskConfigRef.value && typeof taskConfigRef.value.validateAllTasks === 'function') {
      const validationResult = await taskConfigRef.value.validateAllTasks()
      if (!validationResult.valid) {
        // 格式化錯誤訊息，使其更清晰易讀
        const errorMessages = validationResult.invalidTasks.map(t => {
          const taskNum = t.index
          const errorList = []
          
          if (t.errors) {
            Object.entries(t.errors).forEach(([fieldName, errors]) => {
              const fieldLabel = getFieldLabel(fieldName)
              const messages = errors.map(e => e.message || e).join('、')
              errorList.push(`  • ${fieldLabel}: ${messages}`)
            })
          } else if (t.errorFields) {
            t.errorFields.forEach(field => {
              const fieldName = Array.isArray(field.name) ? field.name.join('.') : field.name
              const fieldLabel = getFieldLabel(fieldName)
              const messages = field.errors.map(e => e.message || e).join('、')
              errorList.push(`  • ${fieldLabel}: ${messages}`)
            })
          } else {
            errorList.push('  • 驗證失敗')
          }
          
          return `任務 #${taskNum}:\n${errorList.join('\n')}`
        }).join('\n\n')
        
        showError(`請修正以下錯誤：\n\n${errorMessages}`)
        return
      }
    }
    
    // 分離需要立即生成的任務和需要保存的任務
    const tasksToGenerate = []
    const tasksToSave = []

    taskConfigData.tasks.forEach(task => {
      // 根據任務配置選項分類
      if (task._optionType === 'current_month' || task._generateCurrentMonth) {
        // 僅當前月份生成：需要立即生成但不保存為模板
        tasksToGenerate.push(task)
      } else {
        // 其他任務需要保存（save_template 或 retain_settings）
        tasksToSave.push(task)
      }
    })

    // 如果沒有需要保存或生成的任務，直接返回
    if (tasksToSave.length === 0 && tasksToGenerate.length === 0) {
      showWarning('沒有需要保存的任務配置')
      setTimeout(() => {
        handleBack()
      }, 1000)
      return
    }

    // 轉換格式並批量保存（僅保存非"僅當前月份生成"的任務）
    if (tasksToSave.length > 0) {
      const payload = {
        tasks: tasksToSave.map(task => ({
          config_id: task.config_id, // 包含 config_id 以便後端更新現有配置
          task_name: task.name,
          task_description: task.description,
          assignee_user_id: task.assignee_user_id,
          estimated_hours: task.estimated_hours,
          advance_days: task.advance_days || 7,
          // 從 due_date_rule 中提取字段，確保向後兼容
          due_rule: task.due_date_rule?.rule || task.due_rule || (task.due_date_rule?.days_due !== null && task.due_date_rule?.days_due !== undefined ? null : 'end_of_month'),
          due_value: (() => {
            // 優先從 due_date_rule.params 中提取
            const params = task.due_date_rule?.params || {}
            return params.day || params.days || params.months || task.due_value || null
          })(),
          days_due: task.due_date_rule?.days_due ?? task.days_due ?? null,
          stage_order: task.stage_order || 0,
          execution_frequency: task.execution_frequency || 'monthly',
          execution_months: task.execution_months || [1,2,3,4,5,6,7,8,9,10,11,12],
          notes: task.notes,
          sop_ids: task.sop_ids || [],
          use_for_auto_generate: (() => {
            // 根據任務配置選項確定 use_for_auto_generate
            if (task._optionType === 'save_template') {
              return 1 // 保存為模板，用於自動生成
            } else if (task._optionType === 'retain_settings') {
              return 0 // 保留設定，不自動生成
            } else if (task._optionType === 'current_month') {
              return 0 // 僅當前月份生成，不自動生成
            } else {
              // 如果沒有明確選項，使用現有值或默認值
              return task.use_for_auto_generate !== undefined ? (task.use_for_auto_generate ? 1 : 0) : (currentService.value.service_type === 'recurring' ? 1 : 0)
            }
          })()
        })),
        service_sops: taskConfigData.sops.map(s => s.sop_id || s.id)
      }
      
      const clientServiceId = route.params.clientServiceId
      await batchSaveTaskConfigs(route.params.clientId, clientServiceId, payload)
      showSuccess('任務配置已保存')
    }

    // 如果有需要立即生成的任務，先保存配置（臨時），然後生成任務
    if (tasksToGenerate.length > 0) {
      const clientServiceId = route.params.clientServiceId
      
      // 先保存這些任務配置（臨時保存，use_for_auto_generate = false）
      const tempPayload = {
        tasks: tasksToGenerate.map(task => ({
          task_name: task.name,
          task_description: task.description,
          assignee_user_id: task.assignee_user_id,
          estimated_hours: task.estimated_hours,
          advance_days: task.advance_days || 7,
          // 從 due_date_rule 中提取字段，確保向後兼容
          due_rule: task.due_date_rule?.rule || task.due_rule || (task.due_date_rule?.days_due !== null && task.due_date_rule?.days_due !== undefined ? null : 'end_of_month'),
          due_value: (() => {
            // 優先從 due_date_rule.params 中提取
            const params = task.due_date_rule?.params || {}
            return params.day || params.days || params.months || task.due_value || null
          })(),
          days_due: task.due_date_rule?.days_due ?? task.days_due ?? null,
          stage_order: task.stage_order || 0,
          execution_frequency: task.execution_frequency || 'monthly',
          execution_months: task.execution_months || [1,2,3,4,5,6,7,8,9,10,11,12],
          notes: task.notes,
          sop_ids: task.sop_ids || [],
          use_for_auto_generate: 0 // 不自動生成
        })),
        service_sops: []
      }
      
      await batchSaveTaskConfigs(route.params.clientId, clientServiceId, tempPayload)
      
      // 然後立即生成任務
      await handleGenerateTasksForCurrentMonth(clientServiceId, tasksToGenerate)
      return // handleGenerateTasksForCurrentMonth 會處理導航
    }

    // 如果是一次性服務且有任務配置，觸發任務生成
    if (currentService.value.service_type === 'one-time' && taskConfigData.tasks.length > 0) {
      const clientServiceId = route.params.clientServiceId
      await handleGenerateTasks(clientServiceId)
    } else {
      // 延遲後返回
      setTimeout(() => {
        handleBack()
      }, 1000)
    }
  } catch (error) {
    console.error('保存任務配置失敗:', error)
    showError(error.message || '保存任務配置失敗')
  } finally {
    isSaving.value = false
  }
}

// 處理任務選項選擇事件
const handleTaskOptionSelected = async (event) => {
  if (event.option === 'current_month' && event.task) {
    // 用戶選擇了"僅當前月份生成"，立即生成任務
    const clientServiceId = route.params.clientServiceId
    await handleGenerateTasksForCurrentMonth(clientServiceId, [event.task])
  }
}

// 處理當前月份任務生成
const handleGenerateTasksForCurrentMonth = async (clientServiceId, tasks) => {
  try {
    // 顯示生成進度 Modal
    generationModalVisible.value = true
    generationStatus.value = '正在為當前月份生成任務...'
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
      showSuccess(`任務生成成功！已為當前月份生成 ${result.generated} 個任務`)
    } else if (result.skipped > 0) {
      showWarning(`任務已存在，跳過 ${result.skipped} 個任務`)
    } else {
      showWarning('沒有生成新任務')
    }

    // 如果有錯誤，顯示警告
    if (result.errors && result.errors.length > 0) {
      console.warn('任務生成部分失敗:', result.errors)
      showWarning(`部分任務生成失敗：${result.errors.length} 個錯誤`)
    }

    // 延遲後關閉 Modal 並返回
    setTimeout(() => {
      generationModalVisible.value = false
      handleBack()
    }, 2000)
  } catch (error) {
    console.error('任務生成失敗:', error)
    generationModalVisible.value = false
    showError(error.message || '任務生成失敗，請稍後重試')
    
    // 即使生成失敗，也允許用戶返回
    setTimeout(() => {
      handleBack()
    }, 2000)
  } finally {
    generationProgress.value = -1
    generationStatus.value = '正在生成任務...'
  }
}

// 處理任務生成（一次性服務）
const handleGenerateTasks = async (clientServiceId) => {
  try {
    // 顯示生成進度 Modal
    generationModalVisible.value = true
    generationStatus.value = '正在生成任務...'
    generationProgress.value = 0

    // 計算服務月份（使用當前月份）
    const now = new Date()
    const serviceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // 更新進度：準備階段
    generationProgress.value = 10
    generationStatus.value = '正在準備任務生成...'

    // 短暫延遲以顯示進度
    await new Promise(resolve => setTimeout(resolve, 300))

    // 更新進度：調用 API
    generationProgress.value = 30
    generationStatus.value = '正在調用任務生成 API...'

    // 調用任務生成 API
    const result = await taskApi.generateTasksForOneTimeService(clientServiceId, serviceMonth)

    // 更新進度：處理結果
    generationProgress.value = 80
    generationStatus.value = '正在處理生成結果...'

    // 短暫延遲以顯示進度
    await new Promise(resolve => setTimeout(resolve, 300))

    // 更新進度：完成
    generationProgress.value = 100
    generationStatus.value = `任務生成完成！已生成 ${result.generated || 0} 個任務`

    // 顯示成功消息
    if (result.generated > 0) {
      showSuccess(`任務生成成功！已生成 ${result.generated} 個任務`)
    } else if (result.skipped > 0) {
      showWarning(`任務已存在，跳過 ${result.skipped} 個任務`)
    } else {
      showWarning('沒有生成新任務，請檢查任務配置')
    }

    // 如果有錯誤，顯示警告
    if (result.errors && result.errors.length > 0) {
      console.warn('任務生成部分失敗:', result.errors)
      const errorDetails = result.errors.slice(0, 3).map(e => e.message || e).join('、')
      const moreErrors = result.errors.length > 3 ? `等 ${result.errors.length} 個錯誤` : ''
      showWarning(`部分任務生成失敗：${errorDetails}${moreErrors}`)
    }

    // 延遲後關閉 Modal 並返回
    setTimeout(() => {
      generationModalVisible.value = false
      handleBack()
    }, 2000)
  } catch (error) {
    console.error('任務生成失敗:', error)
    
    // 更新進度：錯誤狀態
    generationProgress.value = 100
    generationStatus.value = '任務生成失敗'
    
    // 關閉 Modal 並顯示錯誤
    setTimeout(() => {
      generationModalVisible.value = false
    }, 500)
    
    // 提取錯誤訊息
    let errorMessage = '任務生成失敗，請稍後重試'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    showError(errorMessage)
    
    // 即使生成失敗，也允許用戶返回
    setTimeout(() => {
      handleBack()
    }, 2000)
  } finally {
    // 重置進度狀態
    setTimeout(() => {
      generationProgress.value = -1
      generationStatus.value = '正在生成任務...'
    }, 2500)
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

