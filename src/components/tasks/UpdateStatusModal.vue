<template>
  <a-modal
    v-model:visible="modalVisible"
    title="更新狀態說明"
    :width="600"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <!-- 逾期警告 -->
      <a-alert
        v-if="isOverdue"
        type="warning"
        style="margin-bottom: 16px"
      >
        <template #message>
          <span>此任務已逾期</span>
        </template>
        <template #description>
          到期日期：{{ formatDate(task.due_date || task.dueDate) }}
        </template>
      </a-alert>

      <!-- 狀態選擇 -->
      <a-form-item label="狀態" name="status">
        <a-select v-model:value="formData.status" placeholder="選擇狀態">
          <a-select-option value="pending">待處理</a-select-option>
          <a-select-option value="in_progress">進行中</a-select-option>
          <a-select-option value="completed">已完成</a-select-option>
          <a-select-option value="cancelled">已取消</a-select-option>
          <a-select-option value="blocked">已阻塞</a-select-option>
        </a-select>
      </a-form-item>

      <!-- 進度說明 -->
      <a-form-item label="進度說明" name="progressNote">
        <a-textarea
          v-model:value="formData.progressNote"
          :rows="3"
          placeholder="例如：已完成 80%，預計明天完成..."
        />
      </a-form-item>

      <!-- 逾期原因 -->
      <a-form-item
        v-if="isOverdue"
        label="逾期原因"
        name="overdueReason"
      >
        <a-textarea
          v-model:value="formData.overdueReason"
          :rows="2"
          placeholder="說明為何無法在原定期限內完成..."
          :status="isOverdue && !formData.overdueReason ? 'error' : ''"
        />
      </a-form-item>

      <!-- 阻礙原因 -->
      <a-form-item label="阻礙原因" name="blockerReason">
        <a-textarea
          v-model:value="formData.blockerReason"
          :rows="2"
          placeholder="例如：等待客戶回覆文件、系統問題等..."
        />
        <template #help>
          <span style="font-size: 12px; color: #6b7280">
            如果任務被外部因素阻塞，請在此說明
          </span>
        </template>
      </a-form-item>

      <!-- 正式到期日 -->
      <a-card
        :bordered="false"
        style="background: #fafafa; margin-bottom: 16px"
      >
        <template #title>
          <span>正式到期日</span>
        </template>

        <div style="margin-bottom: 12px">
          <a-typography-text type="secondary" style="font-size: 13px; display: block; margin-bottom: 6px">
            當前到期日
          </a-typography-text>
          <div style="padding: 8px 12px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-weight: 500">
            {{ currentDueDate || '未設定' }}
          </div>
        </div>

        <a-form-item label="調整到期日" name="newDueDate">
          <a-date-picker
            v-model:value="formData.newDueDate"
            style="width: 100%"
            format="YYYY-MM-DD"
            @change="handleDueDateChange"
          />
          <template #help>
            <span style="font-size: 11px; color: #6b7280">
              這是正式承諾的完成期限
            </span>
          </template>
        </a-form-item>

        <!-- 到期日變更原因 -->
        <a-form-item
          v-if="showDueDateChangeReason"
          label="調整原因"
          name="dueDateChangeReason"
        >
          <a-textarea
            v-model:value="formData.dueDateChangeReason"
            :rows="2"
            placeholder="必須說明為何需要調整正式到期日..."
            :status="showDueDateChangeReason && !formData.dueDateChangeReason ? 'error' : ''"
          />
          <template #help>
            <span style="font-size: 11px; color: #991b1b">
              檢測到到期日變更，此欄位為必填
            </span>
          </template>
        </a-form-item>
      </a-card>

      <!-- 預計完成日期 -->
      <a-form-item label="個人預計完成日期" name="expectedCompletionDate">
        <a-date-picker
          v-model:value="formData.expectedCompletionDate"
          style="width: 100%"
          format="YYYY-MM-DD"
          @change="handleExpectedDateChange"
        />
        <template #help>
          <div>
            <div v-if="currentExpectedDate" style="font-size: 12px; color: #6b7280; margin-top: 4px">
              目前預計：{{ formatDate(currentExpectedDate) }}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px">
              你自己內部估計的完成時間（不影響正式到期日）
            </div>
          </div>
        </template>
      </a-form-item>

      <!-- 預計日期變更原因 -->
      <a-form-item
        v-if="showExpectedDateChangeReason"
        label="變更原因"
        name="expectedDateChangeReason"
      >
        <a-textarea
          v-model:value="formData.expectedDateChangeReason"
          :rows="2"
          placeholder="說明為何調整預計完成日期..."
        />
        <template #help>
          <span style="font-size: 12px; color: #92400e">
            檢測到預計日期變更，建議說明原因
          </span>
        </template>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import dayjs from 'dayjs'
import { useTaskStore } from '@/stores/tasks'
import { formatDate } from '@/utils/formatters'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  task: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:visible', 'success'])

const store = useTaskStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()
const formRef = ref(null)

// 彈窗顯示狀態
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 表單數據
const formData = ref({
  status: '',
  progressNote: '',
  overdueReason: '',
  blockerReason: '',
  newDueDate: null,
  dueDateChangeReason: '',
  expectedCompletionDate: null,
  expectedDateChangeReason: ''
})

// 當前到期日
const currentDueDate = computed(() => {
  const dueDate = props.task.due_date || props.task.dueDate
  return dueDate ? formatDate(dueDate) : ''
})

// 當前預計完成日期
const currentExpectedDate = computed(() => {
  return props.task.expected_completion_date || props.task.expectedCompletionDate || null
})

// 是否已逾期
const isOverdue = computed(() => {
  const dueDate = props.task.due_date || props.task.dueDate
  if (!dueDate) return false
  
  const today = dayjs().startOf('day')
  const due = dayjs(dueDate).startOf('day')
  const status = props.task.status || ''
  
  return due.isBefore(today) && status !== 'completed' && status !== 'cancelled'
})

// 是否顯示到期日變更原因
const showDueDateChangeReason = computed(() => {
  if (!formData.value.newDueDate) return false
  
  const currentDue = props.task.due_date || props.task.dueDate
  if (!currentDue) return true
  
  const newDue = dayjs(formData.value.newDueDate).format('YYYY-MM-DD')
  const oldDue = dayjs(currentDue).format('YYYY-MM-DD')
  
  return newDue !== oldDue
})

// 是否顯示預計日期變更原因
const showExpectedDateChangeReason = computed(() => {
  if (!formData.value.expectedCompletionDate) return false
  
  const currentExpected = currentExpectedDate.value
  if (!currentExpected) return false
  
  const newExpected = dayjs(formData.value.expectedCompletionDate).format('YYYY-MM-DD')
  const oldExpected = dayjs(currentExpected).format('YYYY-MM-DD')
  
  return newExpected !== oldExpected
})

// 表單驗證規則
const formRules = computed(() => {
  const rules = {
    status: [{ required: true, message: '請選擇狀態', trigger: 'change' }]
  }
  
  // 如果已逾期，逾期原因為必填
  if (isOverdue.value) {
    rules.overdueReason = [{ required: true, message: '請填寫逾期原因', trigger: 'blur' }]
  }
  
  // 如果選擇了新的到期日且與當前到期日不同，變更原因為必填
  if (showDueDateChangeReason.value) {
    rules.dueDateChangeReason = [{ required: true, message: '請填寫調整原因', trigger: 'blur' }]
  }
  
  return rules
})

// 監聽 visible 變化，初始化表單
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      initializeForm()
    }
  }
)

// 監聽 task 變化，更新表單
watch(
  () => props.task,
  () => {
    if (props.visible) {
      initializeForm()
    }
  },
  { deep: true }
)

// 初始化表單
const initializeForm = () => {
  const task = props.task
  
  formData.value = {
    status: task.status || '',
    progressNote: task.status_note || task.statusNote || '',
    overdueReason: task.overdue_reason || task.overdueReason || '',
    blockerReason: task.blocker_reason || task.blockerReason || '',
    newDueDate: task.due_date || task.dueDate ? dayjs(task.due_date || task.dueDate) : null,
    dueDateChangeReason: '',
    expectedCompletionDate: currentExpectedDate.value ? dayjs(currentExpectedDate.value) : null,
    expectedDateChangeReason: ''
  }
  
  // 重置表單驗證
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 處理到期日變更
const handleDueDateChange = () => {
  // 觸發表單驗證
  if (formRef.value && showDueDateChangeReason.value) {
    formRef.value.validateFields(['dueDateChangeReason'])
  }
}

// 處理預計日期變更
const handleExpectedDateChange = () => {
  // 不需要驗證，只是顯示提示
}

// 處理提交
const handleSubmit = async () => {
  try {
    // 表單驗證
    await formRef.value.validate()
    
    const taskId = props.task.id || props.task.taskId || props.task.task_id
    
    // 如果選擇了新的到期日且與當前到期日不同，先調整到期日
    if (showDueDateChangeReason.value && formData.value.newDueDate) {
      const newDueDateStr = dayjs(formData.value.newDueDate).format('YYYY-MM-DD')
      const currentDue = props.task.due_date || props.task.dueDate
      const currentDueStr = currentDue ? dayjs(currentDue).format('YYYY-MM-DD') : ''
      
      if (!currentDue || newDueDateStr !== currentDueStr) {
        await store.adjustTaskDueDate(taskId, {
          due_date: newDueDateStr,
          reason: formData.value.dueDateChangeReason
        })
      }
    }
    
    // 構建更新狀態的 payload
    const payload = {
      status: formData.value.status,
      progress_note: formData.value.progressNote || null,
      overdue_reason: formData.value.overdueReason || null,
      blocker_reason: formData.value.blockerReason || null,
      expected_completion_date: formData.value.expectedCompletionDate
        ? dayjs(formData.value.expectedCompletionDate).format('YYYY-MM-DD')
        : null
    }
    
    // 更新任務狀態
    await store.updateTaskStatus(taskId, payload)
    
    showSuccess('狀態已成功更新' + (showDueDateChangeReason.value ? '，到期日已調整' : ''))
    emit('success')
    modalVisible.value = false
  } catch (err) {
    if (err.errorFields) {
      // 表單驗證錯誤
      return
    }
    showError(err.message || '更新失敗')
  }
}

// 處理取消
const handleCancel = () => {
  modalVisible.value = false
}
</script>

