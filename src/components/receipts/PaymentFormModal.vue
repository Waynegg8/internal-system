<template>
  <a-modal
    v-model:open="modalVisible"
    title="新增收款"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    width="600px"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="收款日期" name="paymentDate">
        <a-date-picker
          v-model:value="formData.paymentDate"
          style="width: 100%"
          format="YYYY-MM-DD"
          placeholder="請選擇收款日期"
        />
      </a-form-item>
      
      <a-form-item label="收款金額" name="paymentAmount">
        <a-input-number
          v-model:value="formData.paymentAmount"
          style="width: 100%"
          :min="0.01"
          :max="outstandingAmount"
          :precision="2"
          :formatter="(value) => value ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''"
          :parser="(value) => value.replace(/\$\s?|(,*)/g, '')"
          placeholder="請輸入收款金額"
        />
        <div style="margin-top: 4px; color: #64748b; font-size: 13px">
          未收金額：<span style="font-weight: 600">{{ formatCurrency(outstandingAmount) }}</span>
        </div>
      </a-form-item>
      
      <a-form-item label="收款方式" name="paymentMethod">
        <a-select
          v-model:value="formData.paymentMethod"
          placeholder="請選擇收款方式"
        >
          <a-select-option value="cash">現金</a-select-option>
          <a-select-option value="transfer">轉帳</a-select-option>
          <a-select-option value="check">支票</a-select-option>
          <a-select-option value="other">其他</a-select-option>
        </a-select>
      </a-form-item>
      
      <a-form-item label="參考號碼" name="referenceNumber">
        <a-input
          v-model:value="formData.referenceNumber"
          placeholder="交易序號、支票號碼等"
        />
      </a-form-item>
      
      <a-form-item label="備註" name="notes">
        <a-textarea
          v-model:value="formData.notes"
          :rows="3"
          placeholder="其他說明"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import dayjs from 'dayjs'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  outstandingAmount: {
    type: Number,
    default: 0
  },
  receiptId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['update:visible', 'success'])

const formRef = ref(null)
const loading = ref(false)

// 表單數據
const formData = ref({
  paymentDate: dayjs(),
  paymentAmount: null,
  paymentMethod: 'transfer',
  referenceNumber: '',
  notes: ''
})

// 表單驗證規則
const rules = {
  paymentDate: [
    { required: true, message: '請選擇收款日期', trigger: 'change' }
  ],
  paymentAmount: [
    { required: true, message: '請輸入收款金額', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '收款金額必須大於 0', trigger: 'blur' },
    {
      validator: (rule, value) => {
        if (value && value > props.outstandingAmount) {
          return Promise.reject(`收款金額不可超過未收金額（${formatCurrency(props.outstandingAmount)}）`)
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
  paymentMethod: [
    { required: true, message: '請選擇收款方式', trigger: 'change' }
  ]
}

// 控制彈窗顯示
const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 監聽 visible 變化，重置表單
watch(() => props.visible, (val) => {
  if (val) {
    // 打開彈窗時重置表單
    formData.value = {
      paymentDate: dayjs(),
      paymentAmount: null,
      paymentMethod: 'transfer',
      referenceNumber: '',
      notes: ''
    }
    // 清除驗證狀態
    formRef.value?.clearValidate()
  }
})

// 提交表單
const handleSubmit = async () => {
  try {
    // 驗證表單
    await formRef.value.validate()
    
    loading.value = true
    
    // 構建 payload
    const payload = {
      payment_date: formData.value.paymentDate ? dayjs(formData.value.paymentDate).format('YYYY-MM-DD') : null,
      payment_amount: formData.value.paymentAmount,
      payment_method: formData.value.paymentMethod,
      reference_number: formData.value.referenceNumber || undefined,
      notes: formData.value.notes || undefined
    }
    
    // 觸發 success 事件，由父組件處理 API 調用
    emit('success', payload)
    
    // 關閉彈窗
    modalVisible.value = false
  } catch (error) {
    console.error('表單驗證失敗:', error)
  } finally {
    loading.value = false
  }
}

// 取消
const handleCancel = () => {
  modalVisible.value = false
}
</script>

