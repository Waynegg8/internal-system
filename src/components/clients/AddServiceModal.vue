<template>
  <a-modal
    v-model:open="modalVisible"
    title="新增客戶服務"
    @cancel="handleCancel"
    @ok="handleOk"
  >
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
    
    <a-form layout="vertical" :model="formData" ref="formRef">
      <a-form-item label="選擇服務" name="service_id" :rules="[{ required: true, message: '請選擇服務' }]">
        <a-select
          v-model:value="formData.service_id"
          placeholder="請選擇要添加的服務"
          :options="normalizedServices"
          :field-names="{ label: 'name', value: 'id' }"
          style="width: 100%"
          @change="handleServiceChange"
        />
      </a-form-item>

      <a-form-item label="服務類型" name="service_type" :rules="[{ required: true, message: '請選擇服務類型' }]">
        <a-radio-group v-model:value="formData.service_type" @change="handleServiceTypeChange">
          <a-radio value="recurring">定期服務</a-radio>
          <a-radio value="one-time">一次性服務</a-radio>
        </a-radio-group>
        <div style="margin-top: 4px; color: #6b7280; font-size: 12px;">
          <span v-if="formData.service_type === 'recurring'">定期服務有固定執行頻率，通常用於自動生成任務</span>
          <span v-else>一次性服務執行時間不固定，需要手動執行</span>
        </div>
      </a-form-item>

      <a-form-item 
        v-if="formData.service_type === 'recurring'"
        label="執行頻率（勾選執行月份）" 
        name="execution_months"
        :rules="[{ 
          validator: (rule, value) => {
            if (formData.service_type === 'recurring' && (!value || value.length === 0)) {
              return Promise.reject('定期服務必須至少勾選一個月份')
            }
            return Promise.resolve()
          }
        }]"
      >
        <a-checkbox-group v-model:value="formData.execution_months">
          <a-row>
            <a-col :span="8" v-for="month in 12" :key="month">
              <a-checkbox :value="month">{{ month }}月</a-checkbox>
            </a-col>
          </a-row>
        </a-checkbox-group>
      </a-form-item>

      <a-form-item label="是否用於自動生成任務">
        <a-switch 
          v-model:checked="formData.use_for_auto_generate"
          checked-children="是"
          un-checked-children="否"
        />
        <div style="margin-top: 4px; color: #6b7280; font-size: 12px;">
          定期服務通常設為「是」，系統會根據執行頻率自動生成任務
        </div>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useClientAddStore } from '@/stores/clientAdd'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible', 'service-selected'])

// Store
const store = useClientAddStore()
const { errorMessage, warningMessage, showError, showWarning } = usePageAlert()

// Form data
const formData = reactive({
  service_id: null,
  service_type: 'recurring',
  execution_months: [],
  use_for_auto_generate: true
})

const formRef = ref(null)

// Normalized services for select (handle both API format and normalized format)
const normalizedServices = computed(() => {
  return store.supportData.services.map(service => ({
    id: service.id || service.service_id,
    name: service.name || service.service_name,
    ...service // Keep all other properties
  }))
})

// Modal visibility (computed for v-model:open)
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
  }
})

// 處理服務選擇變化，自動帶入預設值
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
  formRef.value?.resetFields()
  emit('update:visible', false)
}

// Handle OK
const handleOk = async () => {
  try {
    // 驗證表單
    await formRef.value?.validate()
  } catch (error) {
    if (error.errorFields) {
      showWarning('請檢查表單輸入')
    }
    return
  }

  if (!formData.service_id) {
    showWarning('請選擇一個服務')
    return
  }

  // Find the full master service object from normalized services
  const masterService = normalizedServices.value.find(s => s.id === formData.service_id)

  if (!masterService) {
    showError('找不到選中的服務')
    return
  }

  // Create a new client service object based on the master service
  const newClientService = {
    id: `temp_${Date.now()}`, // Temporary ID
    service_id: masterService.id, // Use normalized id
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

  // Reset and close
  formData.service_id = null
  formData.service_type = 'recurring'
  formData.execution_months = []
  formData.use_for_auto_generate = true
  formRef.value?.resetFields()
  emit('update:visible', false)
}

// 監聽 visible 變化，重置表單
watch(() => props.visible, (visible) => {
  if (!visible) {
    formData.service_id = null
    formData.service_type = 'recurring'
    formData.execution_months = []
    formData.use_for_auto_generate = true
    formRef.value?.resetFields()
  }
})
</script>

<style scoped>
</style>

