<template>
  <a-card :title="formTitle" class="service-form-card">
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="服務名稱" name="service_name">
        <a-input
          v-model:value="formData.service_name"
          placeholder="請輸入服務名稱"
          :maxlength="100"
          show-count
        />
      </a-form-item>

      <a-form-item label="服務層級 SOP" name="service_sop_id">
        <a-select
          v-model:value="formData.service_sop_id"
          placeholder="請選擇服務層級 SOP（可選）"
          allow-clear
        >
          <a-select-option :value="null">無</a-select-option>
          <a-select-option
            v-for="sop in serviceSops"
            :key="sop.id"
            :value="sop.id"
          >
            {{ sop.title }}
          </a-select-option>
        </a-select>
        <template #extra>
          <span style="color: #666; font-size: 12px">
            💡 服務層級 SOP 代表整個服務的通用流程，使用此服務的任務模板會自動繼承。
          </span>
        </template>
      </a-form-item>

      <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
        <a-space>
          <a-button type="primary" :loading="loading" @click="handleSubmit">
            儲存
          </a-button>
          <a-button @click="handleCancel">取消</a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  editingService: {
    type: Object,
    default: null
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
  return props.editingService ? '編輯服務項目' : '新增服務項目'
})

// 表單數據
const formData = ref({
  service_name: '',
  service_sop_id: null
})

// 表單驗證規則
const formRules = {
  service_name: [
    { required: true, message: '請輸入服務名稱', trigger: 'blur' },
    { max: 100, message: '服務名稱不能超過 100 個字符', trigger: 'blur' }
  ],
  service_sop_id: [
    {
      validator: (rule, value) => {
        // SOP ID 是可選的，如果選擇了則必須是有效的 ID
        if (value === null || value === '' || value === undefined) {
          return Promise.resolve()
        }
        const sopExists = props.serviceSops.some(sop => sop.id === value)
        if (!sopExists) {
          return Promise.reject(new Error('請選擇有效的服務層級 SOP'))
        }
        return Promise.resolve()
      },
      trigger: 'change'
    }
  ]
}

// 監聽 editingService 變化，預填充表單
watch(
  () => props.editingService,
  (newService) => {
    if (newService) {
      formData.value = {
        service_name: newService.service_name || '',
        service_sop_id: newService.service_sop_id || null
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// 重置表單
const resetForm = () => {
  formData.value = {
    service_name: '',
    service_sop_id: null
  }
  formRef.value?.resetFields()
}

// 提交表單
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    // 準備提交數據
    const submitData = {
      service_name: formData.value.service_name.trim(),
      service_sop_id: formData.value.service_sop_id || null
    }
    
    emit('submit', submitData, !!props.editingService)
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
.service-form-card {
  margin-bottom: 24px;
}
</style>

