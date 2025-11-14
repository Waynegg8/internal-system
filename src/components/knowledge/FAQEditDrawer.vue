<template>
  <a-drawer
    v-model:open="drawerVisible"
    :title="isEditMode ? '編輯 FAQ' : '新增 FAQ'"
    :width="800"
    @close="handleClose"
  >
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
    
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      layout="vertical"
      @finish="handleSubmit"
    >
      <!-- 問題 -->
      <a-form-item label="問題" name="question">
        <a-input
          v-model:value="formData.question"
          placeholder="請輸入 FAQ 問題"
          :maxlength="200"
          show-count
        />
      </a-form-item>

      <!-- 服務類型分類 -->
      <a-form-item label="服務類型分類" name="category">
        <a-select
          v-model:value="formData.category"
          placeholder="請選擇服務類型"
          :filter-option="filterOption"
          style="width: 100%"
        >
          <a-select-option
            v-for="service in services"
            :key="getServiceId(service)"
            :value="getServiceId(service)"
          >
            {{ getServiceName(service) }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- 客戶 -->
      <a-form-item label="客戶" name="client_id">
        <a-select
          v-model:value="formData.client_id"
          placeholder="請選擇客戶（可選）"
          allow-clear
          show-search
          :filter-option="filterOption"
          style="width: 100%"
        >
          <a-select-option
            v-for="client in clients"
            :key="getClientId(client)"
            :value="getClientId(client)"
          >
            {{ getClientName(client) }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- FAQ 適用層級 -->
      <a-form-item label="FAQ 適用層級" name="scope">
        <a-select
          v-model:value="formData.scope"
          placeholder="請選擇適用層級"
          style="width: 100%"
        >
          <a-select-option value="service">服務層級</a-select-option>
          <a-select-option value="task">任務層級</a-select-option>
        </a-select>
      </a-form-item>

      <!-- 標籤 -->
      <a-form-item label="標籤" name="tags">
        <a-checkbox-group v-model:value="formData.tags" style="width: 100%">
          <a-row>
            <a-col
              v-for="tag in tags"
              :key="tag"
              :span="8"
              style="margin-bottom: 8px"
            >
              <a-checkbox :value="tag">{{ tag }}</a-checkbox>
            </a-col>
          </a-row>
        </a-checkbox-group>
        <div v-if="tags.length === 0" style="color: #999; margin-top: 8px">
          暫無標籤，請先在「管理標籤」中新增標籤
        </div>
      </a-form-item>

      <!-- 回答 -->
      <a-form-item label="回答" name="answer">
        <RichTextEditor
          v-model="formData.answer"
          placeholder="請輸入 FAQ 回答..."
        />
      </a-form-item>

      <!-- 表單操作按鈕 -->
      <a-form-item>
        <a-space>
          <a-button type="primary" html-type="submit" :loading="loading">
            {{ isEditMode ? '保存' : '創建' }}
          </a-button>
          <a-button @click="handleClose">取消</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useKnowledgeStore } from '@/stores/knowledge'
import { storeToRefs } from 'pinia'
import RichTextEditor from './RichTextEditor.vue'

// Props
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  faq: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['close', 'success', 'update:visible'])

// Store
const knowledgeStore = useKnowledgeStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()
const { services, clients, tags, faqLoading } = storeToRefs(knowledgeStore)

// Form ref
const formRef = ref(null)

// Loading state
const loading = computed(() => faqLoading.value)

// Drawer visibility
const drawerVisible = computed({
  get: () => props.visible,
  set: (value) => {
    emit('update:visible', value)
  }
})

// 是否為編輯模式
const isEditMode = computed(() => !!props.faq)

// Form data
const formData = ref({
  question: '',
  category: undefined,
  client_id: undefined,
  scope: undefined,
  tags: [],
  answer: ''
})

// Form rules
const formRules = {
  question: [
    { required: true, message: '請輸入 FAQ 問題', trigger: 'blur' },
    { max: 200, message: '問題長度不能超過 200 個字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '請選擇服務類型', trigger: 'change' }
  ],
  scope: [
    { required: true, message: '請選擇適用層級', trigger: 'change' }
  ],
  answer: [
    { required: true, message: '請輸入 FAQ 回答', trigger: 'blur' },
    {
      validator: (rule, value) => {
        if (!value || value.trim() === '' || value === '<p><br></p>') {
          return Promise.reject('請輸入 FAQ 回答')
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ]
}

// 獲取服務 ID（支持多種字段名格式）
const getServiceId = (service) => {
  return service.id || service.serviceId || service.service_id || service
}

// 獲取服務名稱（支持多種字段名格式）
const getServiceName = (service) => {
  if (typeof service === 'string') return service
  return service.name || service.serviceName || service.service_name || service.title || service.service_title || String(service)
}

// 獲取客戶 ID（支持多種字段名格式）
const getClientId = (client) => {
  return client.id || client.clientId || client.client_id
}

// 獲取客戶名稱（支持多種字段名格式）
const getClientName = (client) => {
  return client.name || client.clientName || client.client_name || client.companyName || client.company_name || String(client)
}

// 下拉選項過濾函數
const filterOption = (input, option) => {
  const children = option.children || option.label || ''
  return children.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 初始化表單數據
const initFormData = () => {
  if (props.faq) {
    // 編輯模式：填充現有數據
    const faq = props.faq
    formData.value = {
      question: faq.question || faq.faq_question || '',
      category: faq.category || faq.category_id || faq.service_id || undefined,
      client_id: faq.client_id || faq.clientId || undefined,
      scope: faq.scope || faq.faq_scope || undefined,
      tags: Array.isArray(faq.tags) ? faq.tags : (faq.tags ? faq.tags.split(',') : []),
      answer: faq.answer || faq.faq_answer || ''
    }
  } else {
    // 新增模式：重置表單
    formData.value = {
      question: '',
      category: undefined,
      client_id: undefined,
      scope: undefined,
      tags: [],
      answer: ''
    }
  }
}

// 重置表單
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  initFormData()
}

// 提交表單
const handleSubmit = async () => {
  try {
    // 驗證表單
    await formRef.value.validate()

    // 準備提交數據
    const submitData = {
      question: formData.value.question.trim(),
      category: formData.value.category,
      scope: formData.value.scope,
      answer: formData.value.answer
    }

    // 可選字段
    if (formData.value.client_id) {
      submitData.client_id = formData.value.client_id
    }

    if (formData.value.tags && formData.value.tags.length > 0) {
      submitData.tags = formData.value.tags
    }

    // 提交
    if (isEditMode.value) {
      const faqId = props.faq.id || props.faq.faqId || props.faq.faq_id
      await knowledgeStore.updateFAQ(faqId, submitData)
      showSuccess('FAQ 已更新')
    } else {
      await knowledgeStore.createFAQ(submitData)
      showSuccess('FAQ 已創建')
    }

    // 觸發成功事件
    emit('success')
    handleClose()
  } catch (error) {
    if (error.errorFields) {
      // 表單驗證錯誤
      showError('請檢查表單輸入')
    } else {
      // API 錯誤已在 store 中處理
      console.error('保存 FAQ 失敗:', error)
    }
  }
}

// 關閉抽屜
const handleClose = () => {
  resetForm()
  emit('close')
}

// 監聽 visible 變化，初始化表單
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      initFormData()
    }
  },
  { immediate: true }
)

// 監聽 faq 變化，更新表單
watch(
  () => props.faq,
  () => {
    if (props.visible) {
      initFormData()
    }
  }
)
</script>

<style scoped>
</style>

