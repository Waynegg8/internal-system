<template>
  <a-card :title="formTitle" class="user-form-card">
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="姓名" name="name">
        <a-input
          v-model:value="formData.name"
          placeholder="請輸入姓名"
          :maxlength="100"
          show-count
        />
      </a-form-item>

      <a-form-item label="帳號" name="username">
        <a-input
          v-model:value="formData.username"
          placeholder="請輸入帳號"
          :maxlength="50"
          show-count
        />
      </a-form-item>

      <a-form-item
        v-if="!editingUser"
        label="密碼"
        name="password"
      >
        <a-input-password
          v-model:value="formData.password"
          placeholder="請輸入密碼（至少 6 個字符）"
        />
      </a-form-item>

      <a-form-item label="性別" name="gender">
        <a-select
          v-model:value="formData.gender"
          placeholder="請選擇性別"
        >
          <a-select-option value="male">男性</a-select-option>
          <a-select-option value="female">女性</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="到職日" name="hire_date">
        <a-date-picker
          v-model:value="formData.hire_date"
          placeholder="請選擇到職日期"
          format="YYYY-MM-DD"
          valueFormat="YYYY-MM-DD"
          style="width: 100%"
        />
      </a-form-item>

      <a-form-item label="角色" name="is_admin">
        <a-select
          v-model:value="formData.is_admin"
          placeholder="請選擇角色"
        >
          <a-select-option :value="false">員工</a-select-option>
          <a-select-option :value="true">管理員</a-select-option>
        </a-select>
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
import { ref, computed, watch, reactive } from 'vue'

const props = defineProps({
  editingUser: {
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
  return props.editingUser ? '編輯用戶' : '新增用戶'
})

// 表單數據
const formData = reactive({
  name: '',
  username: '',
  password: '',
  gender: '',
  hire_date: '',
  is_admin: false
})

// 表單驗證規則
const formRules = {
  name: [
    { required: true, message: '請輸入姓名', trigger: 'blur' },
    { max: 100, message: '姓名不能超過 100 個字符', trigger: 'blur' }
  ],
  username: [
    { required: true, message: '請輸入帳號', trigger: 'blur' },
    { max: 50, message: '帳號不能超過 50 個字符', trigger: 'blur' }
  ],
  password: [
    {
      validator: (rule, value) => {
        // 新增模式下密碼為必填
        if (!props.editingUser && !value) {
          return Promise.reject(new Error('請輸入密碼'))
        }
        // 如果提供了密碼，至少需要 6 個字符
        if (value && value.length < 6) {
          return Promise.reject(new Error('密碼至少需要 6 個字符'))
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
  gender: [
    { required: true, message: '請選擇性別', trigger: 'change' }
  ],
  hire_date: [
    { required: true, message: '請選擇到職日期', trigger: 'change' }
  ],
  is_admin: [
    { required: true, message: '請選擇角色', trigger: 'change' }
  ]
}

// 監聽 editingUser 變化，預填充表單
watch(
  () => props.editingUser,
  (newUser) => {
    if (newUser) {
      formData.name = newUser.name || ''
      formData.username = newUser.username || ''
      formData.password = '' // 編輯時不顯示密碼
      formData.gender = newUser.gender || ''
      formData.hire_date = newUser.hire_date || newUser.start_date || ''
      // 處理字段名差異
      formData.is_admin = newUser.is_admin !== undefined ? newUser.is_admin : (newUser.isAdmin !== undefined ? newUser.isAdmin : false)
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// 重置表單
const resetForm = () => {
  formData.name = ''
  formData.username = ''
  formData.password = ''
  formData.gender = ''
  formData.hire_date = ''
  formData.is_admin = false
  formRef.value?.resetFields()
}

// 提交表單
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    // 準備提交數據
    const submitData = {
      name: formData.name.trim(),
      username: formData.username.trim(),
      gender: formData.gender,
      hire_date: formData.hire_date,
      is_admin: formData.is_admin
    }
    
    // 新增模式下才包含密碼
    if (!props.editingUser && formData.password) {
      submitData.password = formData.password
    }
    
    emit('submit', submitData, !!props.editingUser)
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
.user-form-card {
  margin-bottom: 24px;
}
</style>

