<template>
  <a-modal
    v-model:open="modalVisible"
    title="新增客戶服務"
    @cancel="handleCancel"
    :auto-focus="false"
  >
    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">確定</a-button>
    </template>
    <!-- 警告提示 -->
    <a-alert
      v-if="warningMessage"
      type="warning"
      :message="warningMessage"
      show-icon
      closable
      @close="warningMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-bottom: 16px"
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

    <div class="service-form">
      <div class="form-item">
        <label class="form-label">選擇服務 <span style="color: red">*</span></label>
        <a-select
          v-model:value="formData.service_id"
          placeholder="請選擇要添加的服務"
          :options="normalizedServices"
          :field-names="{ label: 'name', value: 'id' }"
          style="width: 100%"
          show-search
          :filter-option="filterOption"
          @change="handleServiceChange"
        />
      </div>

      <div class="form-item">
        <label class="form-label">服務類型 <span style="color: red">*</span></label>
        <a-radio-group v-model:value="formData.service_type" @change="handleServiceTypeChange">
          <a-radio value="recurring">定期服務</a-radio>
          <a-radio value="one-time">一次性服務</a-radio>
        </a-radio-group>
        <div style="margin-top: 4px; color: #6b7280; font-size: 12px;">
          <span v-if="formData.service_type === 'recurring'">定期服務有固定執行頻率，通常用於自動生成任務</span>
          <span v-else>一次性服務執行時間不固定，需要手動執行</span>
        </div>
      </div>

      <div class="form-item" v-if="formData.service_type === 'recurring'">
        <label class="form-label">執行頻率（勾選執行月份）</label>
        <a-checkbox-group v-model:value="formData.execution_months">
          <a-row>
            <a-col :span="8" v-for="month in 12" :key="month">
              <a-checkbox :value="month">{{ month }}月</a-checkbox>
            </a-col>
          </a-row>
        </a-checkbox-group>
      </div>

      <div class="form-item">
        <label class="form-label">是否用於自動生成任務</label>
        <a-switch 
          v-model:checked="formData.use_for_auto_generate"
          checked-children="是"
          un-checked-children="否"
        />
        <div style="margin-top: 4px; color: #6b7280; font-size: 12px;">
          定期服務通常設為「是」，系統會根據執行頻率自動生成任務
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePageAlert } from '@/composables/usePageAlert'
import { useClientAddStore } from '@/stores/clientAdd'
import { fetchAllServices } from '@/api/services'
import { extractApiArray } from '@/utils/apiHelpers'
import { useTaskApi } from '@/api/tasks'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  // 已保存的服務 ID（如果服務已保存，可用於觸發任務生成）
  clientServiceId: {
    type: [Number, String],
    default: null
  },
  // 任務配置（如果服務已保存且有任務配置，可用於觸發任務生成）
  tasks: {
    type: Array,
    default: () => []
  }
})

// Emits
const emit = defineEmits(['update:visible', 'service-selected', 'generate-tasks'])

// Store & Router
const store = useClientAddStore()
const router = useRouter()
const { errorMessage, warningMessage, showError, showWarning, showSuccess } = usePageAlert()

// Task API
const taskApi = useTaskApi()

// 任務生成相關狀態
const generationModalVisible = ref(false)
const generationStatus = ref('正在生成任務...')
const generationProgress = ref(-1)

// Form data
const formData = reactive({
  service_id: null,
  service_type: 'recurring',
  execution_months: [],
  use_for_auto_generate: true
})

// 完全移除表單驗證，改用普通 div 和手動驗證

// Normalized services for select (handle both API format and normalized format)
const normalizedServices = computed(() => {
  return store.supportData.services
    .filter(service => {
      // 過濾掉沒有 service_id 或 service_id 是臨時ID的服務
      const serviceId = service.service_id || service.id
      return serviceId && !String(serviceId).startsWith('temp_')
    })
    .map(service => {
      const serviceId = service.service_id || service.id
      // 確保 service_id 不是臨時ID
      if (!serviceId || String(serviceId).startsWith('temp_')) {
        console.warn('[AddServiceModal] 跳過無效服務:', service)
        return null
      }
      // 創建新的對象，確保 id 和 service_id 都是真正的服務ID
      // 注意：必須先設置 id 和 service_id，然後再展開 service，避免被覆蓋
      const normalized = {
        ...service, // 先展開所有屬性
        id: serviceId, // 覆蓋 id 為真正的服務ID（確保不被臨時ID覆蓋）
        service_id: serviceId, // 覆蓋 service_id 為真正的服務ID（確保不被臨時ID覆蓋）
        name: service.name || service.service_name // 確保 name 字段存在
      }
      // 移除可能存在的臨時 id（如果原對象有臨時 id）
      if (normalized.id && String(normalized.id).startsWith('temp_')) {
        normalized.id = serviceId
      }
      return normalized
    })
    .filter(Boolean) // 過濾掉 null 值
})

// Modal visibility (computed for v-model:open)
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
  }
})

// 處理服務選擇變化，自動帶入預設值
// 過濾選項函數（用於 show-search）
const filterOption = (input, option) => {
  const label = option.name || option.label || ''
  return label.toLowerCase().includes(input.toLowerCase())
}

const handleServiceChange = (serviceId) => {
  const masterService = normalizedServices.value.find(s => s.id === serviceId)
  if (!masterService) return

  // 從服務類型帶入預設值
  const defaultServiceType = masterService.default_service_type || 'recurring'
  const defaultExecutionMonths = masterService.default_execution_months
    ? (typeof masterService.default_execution_months === 'string' 
        ? JSON.parse(masterService.default_execution_months) 
        : masterService.default_execution_months)
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const defaultUseForAutoGenerate = masterService.default_use_for_auto_generate !== undefined
    ? masterService.default_use_for_auto_generate
    : (defaultServiceType === 'recurring' ? 1 : 0)

  formData.service_type = defaultServiceType
  formData.execution_months = defaultExecutionMonths
  formData.use_for_auto_generate = defaultUseForAutoGenerate === 1
}

// 處理服務類型變化
const handleServiceTypeChange = () => {
  if (formData.service_type === 'one-time') {
    // 一次性服務不需要執行頻率
    formData.execution_months = []
    formData.use_for_auto_generate = false
  } else {
    // 定期服務預設為全年
    if (formData.execution_months.length === 0) {
      formData.execution_months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    }
    formData.use_for_auto_generate = true
  }
}

// Handle cancel
const handleCancel = () => {
  formData.service_id = null
  formData.service_type = 'recurring'
  formData.execution_months = []
  formData.use_for_auto_generate = true
  emit('update:visible', false)
}

// Handle OK
const handleOk = async (e) => {
  // 阻止默認行為
  if (e) {
    e.preventDefault()
    e.stopPropagation()
  }

  // 手動驗證：檢查服務是否已選擇
  if (!formData.service_id) {
    showWarning('請選擇一個服務')
    return
  }

  // 手動驗證：檢查定期服務是否至少勾選一個月份
  if (formData.service_type === 'recurring' && (!formData.execution_months || formData.execution_months.length === 0)) {
    showWarning('定期服務必須至少勾選一個月份')
    return
  }

  // Find the full master service object from normalized services
  // formData.service_id 實際上是 normalizedServices 中的 id（即真正的 service_id）
  const masterService = normalizedServices.value.find(s => s.id === formData.service_id)

  if (!masterService) {
    showError('找不到選中的服務')
    return
  }

  // Create a new client service object based on the master service
  // 確保使用真正的 service_id（normalizedServices 中的 id 就是 service_id）
  const actualServiceId = masterService.service_id || masterService.id
  if (!actualServiceId || String(actualServiceId).startsWith('temp_')) {
    showError('服務ID無效，請重新選擇服務')
    return
  }

  const newClientService = {
    id: `temp_${Date.now()}`, // Temporary ID
    service_id: actualServiceId, // 使用真正的服務ID（確保不是臨時ID）
    name: masterService.name, // Use normalized name
    status: 'active',
    service_type: formData.service_type,
    execution_months: formData.execution_months,
    use_for_auto_generate: formData.use_for_auto_generate ? 1 : 0,
    start_date: null,
    tasks: [], // 任務配置列表（將自動建立）
    service_sops: [] // 服務層級 SOP
  }

  // Emit the new object
  emit('service-selected', newClientService)

  // 如果是一次性服務且服務已保存且有任務配置，觸發任務生成
  if (formData.service_type === 'one-time' && props.clientServiceId && props.tasks && props.tasks.length > 0) {
    await handleGenerateTasks(props.clientServiceId)
  } else {
    // Reset and close
    formData.service_id = null
    formData.service_type = 'recurring'
    formData.execution_months = []
    formData.use_for_auto_generate = true
    emit('update:visible', false)
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
      showSuccess(`任務生成成功！已生成 ${result.generated} 個任務`)
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

    // 觸發事件通知父組件任務生成完成
    emit('generate-tasks', {
      success: true,
      result
    })

    // 延遲後關閉 Modal 並重置表單
    setTimeout(() => {
      generationModalVisible.value = false
      formData.service_id = null
      formData.service_type = 'recurring'
      formData.execution_months = []
      formData.use_for_auto_generate = true
      emit('update:visible', false)
    }, 2000)
  } catch (error) {
    console.error('任務生成失敗:', error)
    generationModalVisible.value = false
    showError(error.message || '任務生成失敗，請稍後重試')
    
    // 觸發事件通知父組件任務生成失敗
    emit('generate-tasks', {
      success: false,
      error: error.message || '任務生成失敗'
    })
    
    // 即使生成失敗，也允許用戶繼續
    setTimeout(() => {
      formData.service_id = null
      formData.service_type = 'recurring'
      formData.execution_months = []
      formData.use_for_auto_generate = true
      emit('update:visible', false)
    }, 2000)
  } finally {
    generationProgress.value = -1
    generationStatus.value = '正在生成任務...'
  }
}

// 載入服務數據的函數
const loadServices = async () => {
  console.log('[AddServiceModal] loadServices 開始執行')
  try {
    // 先嘗試從 store 載入
    if (store.supportData.services.length === 0) {
      console.log('[AddServiceModal] Store 服務數據為空，調用 fetchSupportData...')
      await store.fetchSupportData()
      console.log('[AddServiceModal] fetchSupportData 完成，服務數量:', store.supportData.services.length)
    }
    // 如果 store 載入失敗或為空，直接調用 API
    if (store.supportData.services.length === 0) {
      console.log('[AddServiceModal] Store 服務數據仍為空，直接調用 API...')
      const response = await fetchAllServices()
      console.log('[AddServiceModal] API 響應:', response)
      const services = extractApiArray(response, [])
      console.log('[AddServiceModal] 提取的服務數據:', services)
      if (services.length > 0) {
        // 使用 splice 方法確保響應式更新
        store.supportData.services.splice(0, store.supportData.services.length, ...services)
        console.log('[AddServiceModal] 直接 API 調用成功，載入服務數量:', services.length)
        console.log('[AddServiceModal] Store 服務數據更新後:', store.supportData.services.length)
        console.log('[AddServiceModal] normalizedServices 計算結果:', normalizedServices.value.length)
      } else {
        console.warn('[AddServiceModal] API 返回的服務數據為空')
      }
    } else {
      console.log('[AddServiceModal] Store 已有服務數據，數量:', store.supportData.services.length)
      console.log('[AddServiceModal] normalizedServices 計算結果:', normalizedServices.value.length)
    }
  } catch (error) {
    console.error('[AddServiceModal] 載入服務數據失敗:', error)
    showError('載入服務列表失敗，請稍後再試')
  }
}

// 組件掛載時預載入服務數據
onMounted(async () => {
  console.log('[AddServiceModal] onMounted 執行')
  await loadServices()
})

// 監聽 visible 變化，重置表單並確保服務數據已載入
watch(() => props.visible, async (visible) => {
  console.log('[AddServiceModal] watch visible 變化:', visible)
  if (visible) {
    // Modal 打開時，強制載入服務數據
    await loadServices()
  } else {
    formData.service_id = null
    formData.service_type = 'recurring'
    formData.execution_months = []
    formData.use_for_auto_generate = true
  }
}, { immediate: true })
</script>

<style scoped>
.service-form {
  padding: 0;
}

.form-item {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}
</style>

