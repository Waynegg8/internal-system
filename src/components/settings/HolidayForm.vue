<template>
  <a-card :title="formTitle" class="holiday-form-card">
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="日期" name="holiday_date">
        <a-date-picker
          v-model:value="formData.holiday_date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          placeholder="請選擇日期"
          :disabled="!!editingHoliday"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item label="假日名稱" name="name">
        <a-input
          v-model:value="formData.name"
          placeholder="請輸入假日名稱"
          :maxlength="100"
          show-count
        />
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
import dayjs from 'dayjs'

const props = defineProps({
  editingHoliday: {
    type: Object,
    default: null
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
  return props.editingHoliday ? '編輯國定假日' : '新增國定假日'
})

// 表單數據
const formData = ref({
  holiday_date: null,
  name: ''
})

// 表單驗證規則
const formRules = {
  holiday_date: [
    { required: true, message: '請選擇日期', trigger: 'change' },
    {
      validator: (rule, value) => {
        if (!value) {
          return Promise.reject(new Error('請選擇日期'))
        }
        // 驗證日期格式
        if (!dayjs(value, 'YYYY-MM-DD', true).isValid()) {
          return Promise.reject(new Error('日期格式不正確'))
        }
        return Promise.resolve()
      },
      trigger: 'change'
    }
  ],
  name: [
    { required: true, message: '請輸入假日名稱', trigger: 'blur' },
    { max: 100, message: '假日名稱不能超過 100 個字符', trigger: 'blur' }
  ]
}

// 監聽 editingHoliday 變化，預填充表單
watch(
  () => props.editingHoliday,
  (newHoliday) => {
    if (newHoliday) {
      formData.value = {
        holiday_date: newHoliday.holiday_date || null,
        name: newHoliday.name || ''
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
    holiday_date: null,
    name: ''
  }
  formRef.value?.resetFields()
}

// 提交表單
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    // 準備提交數據
    const submitData = {
      holiday_date: formData.value.holiday_date,
      name: formData.value.name.trim(),
      is_national_holiday: true
    }
    
    emit('submit', submitData, !!props.editingHoliday)
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
.holiday-form-card {
  margin-bottom: 24px;
}
</style>





