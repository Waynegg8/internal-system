<template>
  <a-card title="修改密碼" class="change-password-card">
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="目前密碼" name="current_password">
        <a-input-password
          v-model:value="formData.current_password"
          placeholder="請輸入目前密碼"
        />
      </a-form-item>

      <a-form-item label="新密碼" name="new_password">
        <a-input-password
          v-model:value="formData.new_password"
          placeholder="請輸入新密碼（至少 6 個字符）"
        />
        <template #help>
          <span style="color: #666; font-size: 12px">
            密碼長度至少 6 個字元
          </span>
        </template>
      </a-form-item>

      <a-form-item label="確認新密碼" name="confirm_password">
        <a-input-password
          v-model:value="formData.confirm_password"
          placeholder="請再次輸入新密碼"
        />
      </a-form-item>

      <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
        <a-button type="primary" :loading="loading" @click="handleSubmit">
          修改密碼
        </a-button>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script setup>
import { ref, reactive } from 'vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit'])

const formRef = ref(null)

// 表單數據
const formData = reactive({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

// 表單驗證規則
const formRules = {
  current_password: [
    { required: true, message: '請輸入目前密碼', trigger: 'blur' }
  ],
  new_password: [
    { required: true, message: '請輸入新密碼', trigger: 'blur' },
    { min: 6, message: '新密碼至少需要 6 個字符', trigger: 'blur' }
  ],
  confirm_password: [
    { required: true, message: '請確認新密碼', trigger: 'blur' },
    {
      validator: (rule, value) => {
        if (!value) {
          return Promise.reject(new Error('請確認新密碼'))
        }
        if (value !== formData.new_password) {
          return Promise.reject(new Error('確認密碼與新密碼不一致'))
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ]
}

// 重置表單
const resetForm = () => {
  formData.current_password = ''
  formData.new_password = ''
  formData.confirm_password = ''
  formRef.value?.resetFields()
}

// 提交表單
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    const submitData = {
      current_password: formData.current_password,
      new_password: formData.new_password
    }
    
    emit('submit', submitData)
  } catch (error) {
    console.error('表單驗證失敗:', error)
  }
}

// 暴露重置方法供父組件調用
defineExpose({
  resetForm
})
</script>

<style scoped>
.change-password-card {
  margin-bottom: 24px;
}
</style>






