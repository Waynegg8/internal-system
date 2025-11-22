<template>
  <a-card style="margin-bottom: 24px">
    <template #title>
      <a-space>
        <span>{{ formTitle }}</span>
        <a-tag v-if="editingTemplate" color="blue">編輯模式</a-tag>
        <a-tag v-else color="green">新增模式</a-tag>
      </a-space>
    </template>
    <template #extra>
      <a-space>
        <a-button type="primary" :loading="loading" @click="handleSubmit">
          儲存模板
        </a-button>
        <a-button @click="handleCancel">返回列表</a-button>
      </a-space>
    </template>

    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
    >
      <!-- 基本信息 -->
      <a-divider orientation="left">
        <strong>📝 基本信息</strong>
      </a-divider>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="模板名稱" name="template_name">
            <a-input
              v-model:value="formData.template_name"
              placeholder="請輸入模板名稱"
              :maxlength="100"
              show-count
            />
          </a-form-item>
        </a-col>

        <a-col :span="12">
          <a-form-item label="服務項目" name="service_id">
            <a-select
              v-model:value="formData.service_id"
              placeholder="請選擇服務項目"
              allow-clear
              @change="handleServiceChange"
            >
              <a-select-option
                v-for="service in services"
                :key="service.service_id || service.id"
                :value="service.service_id || service.id"
              >
                {{ service.service_name || service.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="綁定客戶（可選）" name="client_id">
            <a-select
              v-model:value="formData.client_id"
              placeholder="通用模板（不綁定客戶）"
              allow-clear
              @change="handleClientChange"
            >
              <a-select-option
                v-for="client in clients"
                :key="client.client_id || client.id"
                :value="client.client_id || client.id"
              >
                {{ client.company_name || client.name }}
              </a-select-option>
            </a-select>
            <template #help>
              <span style="color: #6b7280; font-size: 12px">
                💡 不選擇表示此模板適用於所有客戶
              </span>
            </template>
          </a-form-item>
        </a-col>

        <a-col :span="12">
          <a-form-item
            v-if="selectedServiceSOP"
            label="📖 服務層級 SOP（自動配置）"
          >
            <a-input
              :value="selectedServiceSOP.title || selectedServiceSOP.name"
              readonly
              disabled
            />
            <template #help>
              <span style="color: #3b82f6; font-size: 12px">
                ✅ 系統自動繼承
              </span>
            </template>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="說明" name="description">
        <a-textarea
          v-model:value="formData.description"
          placeholder="請輸入說明（可選）"
          :rows="2"
          :maxlength="500"
          show-count
        />
      </a-form-item>

      <!-- 任務配置 - 使用TaskConfiguration組件 -->
      <a-divider orientation="left">
        <strong>🎯 任務配置（按階段編輯）</strong>
      </a-divider>

      <TaskConfiguration
        v-model:tasks="formData.tasks"
        v-model:sops="formData.service_sops"
        :service-id="formData.service_id"
        :hide-template-select="true"
      />
    </a-form>
  </a-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import TaskConfiguration from '@/components/clients/TaskConfiguration.vue'
import { fetchTaskTemplates } from '@/api/task-templates'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  editingTemplate: {
    type: Object,
    default: null
  },
  services: {
    type: Array,
    default: () => []
  },
  clients: {
    type: Array,
    default: () => []
  },
  serviceSops: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

const formRef = ref(null)

// 表單標題
const formTitle = computed(() => {
  return props.editingTemplate ? '編輯任務模板' : '新增任務模板'
})

// 表單數據
const formData = ref({
  template_name: '',
  service_id: null,
  client_id: null,
  description: '',
  tasks: [],
  service_sops: []
})

// 選中的服務的服務層級 SOP
const selectedServiceSOP = computed(() => {
  if (!formData.value.service_id) return null
  const service = props.services.find(
    s => (s.service_id || s.id) === formData.value.service_id
  )
  if (!service) return null
  
  const serviceSopId = service.service_sop_id
  if (serviceSopId) {
    const sop = props.serviceSops.find(
      s => (s.id || s.sop_id) === serviceSopId
    )
    if (sop) {
      return {
        id: sop.id || sop.sop_id,
        title: sop.title || sop.name
      }
    }
  }
  return null
})

// 檢查統一模板唯一性（異步驗證）
const validateUnifiedTemplateUniqueness = async (rule, value) => {
  // 如果沒有選擇服務，不進行唯一性檢查
  if (!formData.value.service_id) {
    return Promise.resolve()
  }
  
  // 如果選擇了客戶（客戶專屬模板），不需要檢查統一模板唯一性
  if (formData.value.client_id !== null && formData.value.client_id !== undefined) {
    return Promise.resolve()
  }
  
  // 統一模板（client_id 為 null），需要檢查唯一性
  try {
    // 獲取該服務的所有模板
    const response = await fetchTaskTemplates({
      service_id: formData.value.service_id,
      client_type: 'unified'
    })
    
    const templates = response?.data || []
    
    // 編輯模式下，排除當前模板
    const currentTemplateId = props.editingTemplate?.template_id || props.editingTemplate?.templateId
    
    // 過濾掉當前編輯的模板
    const existingTemplates = templates.filter(
      t => (t.template_id || t.templateId) !== currentTemplateId
    )
    
    // 如果已存在統一模板，返回錯誤
    if (existingTemplates.length > 0) {
      const existingTemplate = existingTemplates[0]
      const templateName = existingTemplate.template_name || existingTemplate.templateName || '未知模板'
      return Promise.reject(
        new Error(`該服務已存在統一模板「${templateName}」，每個服務只能有一個統一模板`)
      )
    }
    
    return Promise.resolve()
  } catch (error) {
    console.error('檢查統一模板唯一性失敗:', error)
    // 如果檢查失敗，不阻止提交（由後端驗證）
    return Promise.resolve()
  }
}

// 表單驗證規則
const formRules = computed(() => {
  return {
    template_name: [
      { required: true, message: '請輸入模板名稱', trigger: 'blur' },
      { max: 100, message: '模板名稱不能超過 100 個字符', trigger: 'blur' }
    ],
    service_id: [
      { required: true, message: '請選擇服務項目', trigger: 'change' },
      {
        validator: validateUnifiedTemplateUniqueness,
        trigger: ['change', 'blur']
      }
    ],
    client_id: [
      {
        validator: validateUnifiedTemplateUniqueness,
        trigger: ['change', 'blur']
      }
    ]
  }
})

// 處理服務變更
const handleServiceChange = () => {
  // 清空任務配置（因為服務變更了）
  formData.value.tasks = []
  formData.value.service_sops = []
  
  // 觸發統一模板唯一性驗證
  if (formRef.value) {
    formRef.value.validateFields(['service_id', 'client_id']).catch(() => {
      // 驗證失敗時不處理，錯誤會顯示在表單上
    })
  }
}

// 處理客戶變更
const handleClientChange = () => {
  // 觸發統一模板唯一性驗證
  if (formRef.value) {
    formRef.value.validateFields(['service_id', 'client_id']).catch(() => {
      // 驗證失敗時不處理，錯誤會顯示在表單上
    })
  }
}

// 監聽 editingTemplate 變化，預填充表單
watch(
  () => props.editingTemplate,
  async (newTemplate) => {
    if (newTemplate) {
      formData.value = {
        template_name: newTemplate.template_name || newTemplate.templateName || '',
        service_id: newTemplate.service_id || newTemplate.serviceId || null,
        client_id: newTemplate.client_id || newTemplate.clientId || null,
        description: newTemplate.description || '',
        tasks: newTemplate.tasks || [],
        service_sops: newTemplate.service_sops || []
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// 監聽 visible 變化，當表單關閉時重置
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      resetForm()
    }
  }
)

// 重置表單
const resetForm = () => {
  formData.value = {
    template_name: '',
    service_id: null,
    client_id: null,
    description: '',
    tasks: [],
    service_sops: []
  }
  formRef.value?.resetFields()
}

// 提交表單
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    // 驗證任務配置
    if (!formData.value.tasks || formData.value.tasks.length === 0) {
      // 可以警告但不阻止提交
      console.warn('任務模板沒有配置任務')
    }
    
    // 準備提交數據
    const submitData = {
      template_name: formData.value.template_name.trim(),
      service_id: formData.value.service_id,
      client_id: formData.value.client_id || null,
      description: formData.value.description.trim() || null,
      tasks: formData.value.tasks || [],
      service_sops: formData.value.service_sops || []
    }
    
    emit('submit', submitData, !!props.editingTemplate)
  } catch (error) {
    console.error('表單驗證失敗:', error)
  }
}

// 取消操作
const handleCancel = () => {
  resetForm()
  emit('cancel')
}

// 暴露重置方法供父組件調用
defineExpose({
  resetForm
})
</script>

<style scoped>
.task-template-form-card {
  margin-bottom: 24px;
}
</style>

