<template>
  <a-modal
    v-model:open="modalVisible"
    :title="editingLeave ? '編輯假期' : '申請假期'"
    width="600px"
    :confirm-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <!-- 餘額不足警告 -->
    <a-alert
      v-if="balanceWarning"
      type="warning"
      :message="balanceWarning"
      show-icon
      closable
      @close="balanceWarning = ''"
      style="margin-bottom: 16px"
    />
    
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
    >
      <!-- 假別選擇 -->
      <a-form-item label="假別" name="leave_type">
        <a-select
          v-model:value="form.leave_type"
          placeholder="請選擇假別"
          :options="leaveTypeOptions"
          @change="handleLeaveTypeChange"
        />
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px">
          假別會依您的性別和已登記的生活事件自動過濾
        </div>
      </a-form-item>

      <!-- 請假日期 -->
      <a-form-item label="請假日期" name="start_date">
        <a-date-picker
          v-model:value="form.start_date"
          placeholder="請選擇日期"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </a-form-item>

      <!-- 開始時間 -->
      <a-form-item label="開始時間" name="start_time">
        <a-select
          v-model:value="form.start_time"
          placeholder="請選擇開始時間"
          :options="timeOptions"
          @change="handleTimeChange"
        />
      </a-form-item>

      <!-- 結束時間 -->
      <a-form-item label="結束時間" name="end_time">
        <a-select
          v-model:value="form.end_time"
          placeholder="請選擇結束時間"
          :options="timeOptions"
          @change="handleTimeChange"
        />
      </a-form-item>

      <!-- 請假時數（只讀顯示） -->
      <a-form-item label="請假時數">
        <a-input
          :value="calculatedHours > 0 ? `${calculatedHours} 小時` : ''"
          placeholder="自動計算"
          readonly
          style="background: #f1f5f9; cursor: not-allowed"
        />
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px">
          時數將根據開始和結束時間自動計算（扣除午休）
        </div>
      </a-form-item>

      <!-- 備註 -->
      <a-form-item label="備註（選填）" name="notes">
        <a-textarea
          v-model:value="form.notes"
          placeholder="請輸入備註"
          :rows="3"
          :maxlength="200"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import dayjs from 'dayjs'
import { usePageAlert } from '@/composables/usePageAlert'
import { generateTimeOptions } from '@/utils/timeOptions'
import { calculateHours } from '@/utils/leaveCalculator'
import { getLeaveTypeOptions } from '@/utils/leaveTypeFilter'
import { getLeaveTypeText } from '@/constants/leaveTypes'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  editingLeave: {
    type: Object,
    default: null
  },
  gender: {
    type: String,
    default: null
  },
  balances: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const formRef = ref(null)
const submitting = ref(false)
const balanceWarning = ref('')
const form = ref({
  leave_type: null,
  start_date: null,
  start_time: null,
  end_time: null,
  notes: ''
})

// 時間選項
const timeOptions = computed(() => generateTimeOptions())

// 假別選項（根據性別和餘額動態生成）
const leaveTypeOptions = computed(() => {
  return getLeaveTypeOptions(props.gender, props.balances)
})

// 計算的時數
const calculatedHours = computed(() => {
  if (!form.value.start_time || !form.value.end_time) {
    return 0
  }
  return calculateHours(form.value.start_time, form.value.end_time)
})

// 表單驗證規則
const rules = {
  leave_type: [
    { required: true, message: '請選擇假別', trigger: 'change' }
  ],
  start_date: [
    { required: true, message: '請選擇請假日期', trigger: 'change' }
  ],
  start_time: [
    { required: true, message: '請選擇開始時間', trigger: 'change' }
  ],
  end_time: [
    { required: true, message: '請選擇結束時間', trigger: 'change' },
    {
      validator: (rule, value) => {
        if (!value) return Promise.resolve()
        if (!form.value.start_time) return Promise.resolve()
        
        const [sh, sm] = form.value.start_time.split(':').map(Number)
        const [eh, em] = value.split(':').map(Number)
        const startMinutes = sh * 60 + sm
        const endMinutes = eh * 60 + em
        
        if (endMinutes <= startMinutes) {
          return Promise.reject('結束時間必須晚於開始時間')
        }
        return Promise.resolve()
      },
      trigger: 'change'
    }
  ]
}

// 模態框顯示狀態
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 監聽編輯數據變化
watch(() => props.editingLeave, (newVal) => {
  if (newVal && props.visible) {
    nextTick(() => {
      form.value = {
        leave_type: newVal.type || newVal.leave_type,
        start_date: newVal.start || newVal.start_date ? dayjs(newVal.start || newVal.start_date) : null,
        start_time: newVal.startTime || newVal.start_time || null,
        end_time: newVal.endTime || newVal.end_time || null,
        notes: newVal.notes || ''
      }
    })
  }
}, { immediate: true })

// 監聽模態框打開
watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (props.editingLeave) {
      // 編輯模式：預填充數據
      form.value = {
        leave_type: props.editingLeave.type || props.editingLeave.leave_type,
        start_date: props.editingLeave.start || props.editingLeave.start_date ? dayjs(props.editingLeave.start || props.editingLeave.start_date) : null,
        start_time: props.editingLeave.startTime || props.editingLeave.start_time || null,
        end_time: props.editingLeave.endTime || props.editingLeave.end_time || null,
        notes: props.editingLeave.notes || ''
      }
    } else {
      // 新增模式：重置表單
      resetForm()
    }
  }
})

// 處理假別變化
const handleLeaveTypeChange = () => {
  // 假別變化時可以做一些額外處理
}

// 處理時間變化
const handleTimeChange = () => {
  // 時間變化時自動計算時數
  if (form.value.start_time && form.value.end_time) {
    formRef.value?.validateFields(['end_time'])
  }
}

// 檢查餘額
const checkBalance = async () => {
  const leaveType = form.value.leave_type
  const hours = calculatedHours.value
  
  if (!leaveType || hours <= 0) {
    return true
  }

  // 查找對應的餘額
  const balance = props.balances.find(b => b.type === leaveType)
  if (!balance) {
    return true
  }

  // 補休使用小時，其他使用天數（1天 = 8小時）
  const remainHours = leaveType === 'comp' 
    ? balance.remain 
    : balance.remain * 8

  if (hours > remainHours) {
    const typeName = getLeaveTypeText(leaveType)
    const unit = leaveType === 'comp' ? '小時' : '天'
    const remain = leaveType === 'comp' ? balance.remain : balance.remain
    
    // 顯示警告，但允許提交
    balanceWarning.value = `${typeName}餘額不足！剩餘：${remain} ${unit}，申請：${hours} 小時。仍可送出申請，但可能無法通過審核。`
    return true
  }

  // 清除警告
  balanceWarning.value = ''
  return true
}

// 處理提交
const handleSubmit = async () => {
  try {
    // 驗證表單
    await formRef.value.validate()
    
    // 檢查時數
    if (calculatedHours.value <= 0) {
      balanceWarning.value = '請選擇有效的開始和結束時間'
      return
    }

    // 檢查餘額
    const canProceed = await checkBalance()
    if (!canProceed) {
      return
    }

    submitting.value = true

    // 準備提交數據
    const payload = {
      leave_type: form.value.leave_type,
      start_date: form.value.start_date ? dayjs(form.value.start_date).format('YYYY-MM-DD') : null,
      start_time: form.value.start_time,
      end_time: form.value.end_time,
      amount: calculatedHours.value,
      notes: form.value.notes || undefined
    }

    emit('submit', payload, !!props.editingLeave)
  } catch (error) {
    console.error('表單驗證失敗:', error)
  } finally {
    submitting.value = false
  }
}

// 處理取消
const handleCancel = () => {
  resetForm()
  emit('cancel')
}

// 重置表單
const resetForm = () => {
  form.value = {
    leave_type: null,
    start_date: null,
    start_time: null,
    end_time: null,
    notes: ''
  }
  formRef.value?.resetFields()
}
</script>

