<template>
  <a-modal
    v-model:visible="modalVisible"
    title="批量分配負責人"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form :model="form" :rules="rules" ref="formRef" layout="vertical">
      <a-form-item label="已選擇任務數量">
        <div style="padding: 8px 12px; background: #f5f5f5; border-radius: 4px">
          已選擇 <strong>{{ selectedTaskIds.length }}</strong> 個任務
        </div>
      </a-form-item>
      
      <a-form-item label="選擇負責人" name="assigneeUserId">
        <a-select
          v-model:value="form.assigneeUserId"
          placeholder="請選擇負責人"
          show-search
          :filter-option="filterUserOption"
          allow-clear
        >
          <a-select-option
            v-for="user in users"
            :key="getUserId(user)"
            :value="getUserId(user)"
          >
            {{ getUserName(user) }}
          </a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { getId, getField } from '@/utils/fieldHelper'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  selectedTaskIds: {
    type: Array,
    default: () => []
  },
  users: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'success'])

const { warningMessage, showWarning } = usePageAlert()

const formRef = ref(null)
const loading = ref(false)
const form = ref({
  assigneeUserId: null
})

// 表單驗證規則
const rules = {
  assigneeUserId: [
    { required: true, message: '請選擇負責人', trigger: 'change' }
  ]
}

// 計算 modal 顯示狀態
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 監聽 visible 變化，重置表單
watch(() => props.visible, (newVal) => {
  if (newVal) {
    form.value.assigneeUserId = null
    formRef.value?.resetFields()
  }
})

// 處理提交
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    if (props.selectedTaskIds.length === 0) {
      showWarning('請先選擇要分配的任務')
      return
    }
    
    loading.value = true
    
    // 調用 store 的批量分配方法（將在父組件中調用）
    emit('success', form.value.assigneeUserId)
  } catch (error) {
    console.error('表單驗證失敗:', error)
  } finally {
    loading.value = false
  }
}

// 處理取消
const handleCancel = () => {
  modalVisible.value = false
}

// 用戶過濾函數
const filterUserOption = (input, option) => {
  const userName = option.children?.[0]?.children || option.children || ''
  return userName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 獲取用戶ID（處理不同字段名）
const getUserId = (user) => {
  return getId(user, 'userId', 'user_id', 'id')
}

// 獲取用戶名稱（處理不同字段名）
const getUserName = (user) => {
  return getField(user, 'name', null, '') || getField(user, 'userName', 'user_name', '未命名')
}
</script>

