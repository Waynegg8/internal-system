<template>
  <a-card title="個人資料" class="employee-profile-card">
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="姓名">
        <a-input :value="user?.name || ''" disabled />
      </a-form-item>

      <a-form-item label="帳號">
        <a-input :value="user?.username || ''" disabled />
      </a-form-item>

      <a-form-item label="到職日" name="hire_date">
        <a-date-picker
          v-model:value="formData.hire_date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          placeholder="請選擇到職日"
          style="width: 100%"
        />
        <template #extra>
          <span style="color: #666; font-size: 12px">
            用於計算特休假額度
          </span>
        </template>
      </a-form-item>

      <a-form-item label="性別" name="gender">
        <a-select
          v-model:value="formData.gender"
          placeholder="請選擇性別"
          allow-clear
        >
          <a-select-option value="">請選擇</a-select-option>
          <a-select-option value="male">男</a-select-option>
          <a-select-option value="female">女</a-select-option>
          <a-select-option value="other">其他</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="Email" name="email">
        <a-input
          v-model:value="formData.email"
          type="email"
          placeholder="請輸入 Email（可選）"
          :maxlength="100"
        />
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  user: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:formData'])

const formRef = ref(null)

// 表單數據
const formData = reactive({
  hire_date: null,
  gender: '',
  email: ''
})

// 表單驗證規則
const formRules = {
  hire_date: [
    { required: true, message: '請選擇到職日', trigger: 'change' },
    {
      validator: (rule, value) => {
        if (!value) {
          return Promise.reject(new Error('請選擇到職日'))
        }
        if (!dayjs(value, 'YYYY-MM-DD', true).isValid()) {
          return Promise.reject(new Error('日期格式不正確'))
        }
        return Promise.resolve()
      },
      trigger: 'change'
    }
  ],
  email: [
    {
      type: 'email',
      message: '請輸入有效的 Email 地址',
      trigger: 'blur'
    },
    { max: 100, message: 'Email 不能超過 100 個字符', trigger: 'blur' }
  ]
}

// 監聽 user 變化，預填充表單
watch(
  () => props.user,
  (newUser) => {
    if (newUser) {
      formData.hire_date = newUser.hire_date || null
      formData.gender = newUser.gender || ''
      formData.email = newUser.email || ''
    } else {
      resetForm()
    }
  },
  { immediate: true, deep: true }
)

// 監聽表單數據變化，通知父組件
watch(
  () => formData,
  (newData) => {
    emit('update:formData', { ...newData })
  },
  { deep: true }
)

// 重置表單
const resetForm = () => {
  formData.hire_date = null
  formData.gender = ''
  formData.email = ''
  formRef.value?.resetFields()
}

// 驗證表單
const validate = async () => {
  try {
    await formRef.value.validate()
    return true
  } catch (error) {
    return false
  }
}

// 暴露方法供父組件調用
defineExpose({
  validate,
  resetFields: resetForm
})
</script>

<style scoped>
.employee-profile-card {
  margin-bottom: 24px;
}
</style>






