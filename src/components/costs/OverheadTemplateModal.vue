<template>
  <a-modal
    v-model:open="modalVisible"
    title="自動生成模板設定"
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
      <a-form-item label="啟用每月自動生成" name="enabled">
        <a-switch v-model:checked="formData.enabled" />
      </a-form-item>
      
      <a-form-item label="預設金額" name="defaultAmount">
        <a-input-number
          v-model:value="formData.defaultAmount"
          :min="1"
          :precision="0"
          style="width: 100%"
          placeholder="請輸入預設金額（可選）"
        />
      </a-form-item>
      
      <a-form-item label="生效起始月" name="effectiveFrom">
        <a-date-picker
          v-model:value="formData.effectiveFrom"
          picker="month"
          format="YYYY-MM"
          style="width: 100%"
          placeholder="請選擇生效起始月（可選）"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  costTypeId: {
    type: Number,
    default: null
  },
  template: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const formRef = ref(null)
const loading = ref(false)

// 表單數據
const formData = ref({
  enabled: false,
  defaultAmount: undefined,
  effectiveFrom: null
})

// 控制彈窗顯示
const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 表單驗證規則
const rules = {
  defaultAmount: [
    {
      validator: (rule, value) => {
        if (value !== undefined && value !== null && value < 1) {
          return Promise.reject('預設金額必須大於0')
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ]
}

// 監聽 template 變化，填充表單
watch(() => props.template, (template) => {
  if (template) {
    const effectiveFrom = template.effectiveFrom || template.effective_from
    formData.value = {
      enabled: template.enabled !== undefined ? template.enabled : (template.is_enabled !== undefined ? template.is_enabled : (template.is_active !== undefined ? template.is_active : false)),
      defaultAmount: template.defaultAmount !== undefined ? template.defaultAmount : (template.default_amount !== undefined ? template.default_amount : (template.amount !== undefined ? template.amount : undefined)),
      effectiveFrom: effectiveFrom ? dayjs(effectiveFrom) : null
    }
  }
}, { immediate: true })

// 監聽 visible 變化，重置表單
watch(() => props.visible, (val) => {
  if (val) {
    if (props.template) {
      // 有模板數據：填充表單
      const template = props.template
      const effectiveFrom = template.effectiveFrom || template.effective_from
      formData.value = {
        enabled: template.enabled !== undefined ? template.enabled : (template.is_enabled !== undefined ? template.is_enabled : (template.is_active !== undefined ? template.is_active : false)),
        defaultAmount: template.defaultAmount !== undefined ? template.defaultAmount : (template.default_amount !== undefined ? template.default_amount : (template.amount !== undefined ? template.amount : undefined)),
        effectiveFrom: effectiveFrom ? dayjs(effectiveFrom) : null
      }
    } else {
      // 沒有模板數據：重置表單
      formData.value = {
        enabled: false,
        defaultAmount: undefined,
        effectiveFrom: null
      }
    }
    // 清除驗證狀態
    formRef.value?.clearValidate()
  }
})

// 提交表單
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true
    
    // 構建 payload（與舊系統格式一致）
    const payload = {
      is_active: formData.value.enabled,
      amount: formData.value.defaultAmount || undefined,
      effective_from: formData.value.effectiveFrom ? dayjs(formData.value.effectiveFrom).format('YYYY-MM') : undefined
    }
    
    // 創建一個 Promise，等待父組件處理完成
    return new Promise((resolve, reject) => {
      // 觸發 submit 事件，傳遞 resolve 和 reject
      emit('submit', payload, resolve, reject)
    })
  } catch (error) {
    console.error('表單驗證失敗:', error)
    // 驗證失敗時返回 rejected Promise，阻止彈窗關閉
    return Promise.reject(error)
  } finally {
    loading.value = false
  }
}

// 取消
const handleCancel = () => {
  modalVisible.value = false
  emit('cancel')
}
</script>

