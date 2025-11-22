<template>
  <div class="task-generation-time-rule">
    <a-form
      ref="formRef"
      :model="formData"
      :rules="validationRules"
      layout="vertical"
      @validate="handleValidate"
    >
      <a-form-item label="生成時間規則" name="rule" :required="required">
        <a-select
          v-model:value="selectedRule"
          placeholder="請選擇生成時間規則"
          @change="handleRuleChange"
          style="width: 100%"
          :status="validationStatus.rule"
        >
          <a-select-option
            v-for="rule in ruleOptions"
            :key="rule.value"
            :value="rule.value"
          >
            <div>
              <div style="font-weight: 500">{{ rule.label }}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px">
                {{ rule.description }}
              </div>
            </div>
          </a-select-option>
        </a-select>
        <template #help>
          <span style="color: #6b7280; font-size: 12px">
            選擇任務的生成時間規則，系統將根據規則自動計算生成日期
          </span>
        </template>
      </a-form-item>

      <!-- 參數輸入區域 -->
      <a-form-item
        v-if="selectedRule && needsParams"
        :label="paramLabel"
        name="paramValue"
        :required="needsParams"
      >
        <a-input-number
          v-if="paramType === 'days'"
          v-model:value="paramValue"
          :min="1"
          :max="31"
          :precision="0"
          placeholder="請輸入天數"
          style="width: 100%"
          @change="handleParamChange"
          :status="validationStatus.paramValue"
        />
        <a-input-number
          v-else-if="paramType === 'day'"
          v-model:value="paramValue"
          :min="1"
          :max="31"
          :precision="0"
          placeholder="請輸入日期（1-31）"
          style="width: 100%"
          @change="handleParamChange"
          :status="validationStatus.paramValue"
        />
        <template #help>
          <span style="color: #6b7280; font-size: 12px">
            {{ paramHelpText }}
          </span>
        </template>
      </a-form-item>
    </a-form>

    <!-- 即時預覽 -->
    <a-form-item v-if="selectedRule && previewDate" label="預覽">
      <div style="padding: 12px; background: #f0f9ff; border-radius: 4px; border-left: 3px solid #3b82f6">
        <div style="font-size: 13px; color: #1e40af; font-weight: 500; margin-bottom: 4px">
          <CalendarOutlined style="margin-right: 6px" />
          生成時間預覽
        </div>
        <div style="font-size: 14px; color: #1e3a8a">
          {{ previewText }}
        </div>
        <div v-if="previewDate" style="font-size: 12px; color: #3b82f6; margin-top: 4px">
          實際生成日期：{{ formatDateChinese(previewDate) }}
        </div>
      </div>
    </a-form-item>

    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-top: 8px"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Form as AForm, FormItem as AFormItem } from 'ant-design-vue'
import { CalendarOutlined } from '@ant-design/icons-vue'
import { calculateGenerationTime, formatDateChinese } from '@/utils/dateCalculators'
import { createGenerationTimeRuleRules } from '@/utils/validation'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      rule: null,
      params: {}
    })
  },
  serviceYear: {
    type: Number,
    default: null
  },
  serviceMonth: {
    type: Number,
    default: null
  },
  required: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'validate'])

// 表單引用
const formRef = ref(null)

// 驗證狀態
const validationStatus = ref({
  rule: '',
  paramValue: ''
})

// 表單數據（用於驗證）
const formData = computed(() => ({
  rule: selectedRule.value,
  paramValue: paramValue.value,
  needsParams: needsParams.value,
  paramType: paramType.value
}))

// 驗證規則
const validationRules = computed(() => {
  const baseRules = createGenerationTimeRuleRules()
  
  // 自定義驗證器，可以訪問 formData
  const customRules = {
    rule: baseRules.rule.map(rule => {
      if (rule.required && !props.required) {
        return null
      }
      return rule
    }).filter(Boolean),
    paramValue: [
      {
        validator: (rule, value, callback) => {
          // 如果規則需要參數，則參數必填
          const needsParams = formData.value.needsParams || false
          if (needsParams) {
            if (value === null || value === undefined || value === '') {
              callback(new Error('請輸入參數值'))
              return
            }
            
            const numValue = Number(value)
            if (isNaN(numValue)) {
              callback(new Error('參數值必須為數字'))
              return
            }
            
            // 根據參數類型驗證範圍
            const paramType = formData.value.paramType
            if (paramType === 'days' || paramType === 'day') {
              if (numValue < 1 || numValue > 31) {
                callback(new Error('參數值必須在 1-31 之間'))
                return
              }
            }
          }
          
          callback()
        },
        trigger: 'blur'
      }
    ]
  }
  
  return customRules
})

// 處理驗證
const handleValidate = (name, status, errorMsgs) => {
  if (status) {
    validationStatus.value[name] = 'error'
  } else {
    validationStatus.value[name] = ''
  }
  
  // 觸發驗證事件
  emit('validate', {
    valid: !status,
    errors: errorMsgs || []
  })
}

// 驗證表單
const validate = async () => {
  try {
    await formRef.value?.validate()
    return { valid: true, errors: [] }
  } catch (errorInfo) {
    const errors = []
    if (errorInfo.errorFields) {
      errorInfo.errorFields.forEach(field => {
        field.errors.forEach(err => {
          errors.push({ field: field.name[0], message: err })
        })
      })
    }
    return { valid: false, errors }
  }
}

// 暴露驗證方法
defineExpose({
  validate
})

// 規則選項
const ruleOptions = [
  {
    value: 'service_month_start',
    label: '服務月份開始時',
    description: '任務在服務月份的第1天生成',
    paramType: null
  },
  {
    value: 'prev_month_last_x_days',
    label: '服務月份前一個月的最後X天',
    description: '任務在服務月份前一個月的最後X天生成',
    paramType: 'days'
  },
  {
    value: 'prev_month_x_day',
    label: '服務月份前一個月的第X天',
    description: '任務在服務月份前一個月的第X天生成（如果該月沒有X日，則為該月最後一天）',
    paramType: 'day'
  },
  {
    value: 'next_month_start',
    label: '服務月份後一個月開始時',
    description: '任務在服務月份後一個月的第1天生成',
    paramType: null
  },
  {
    value: 'monthly_x_day',
    label: '每月X日',
    description: '任務在服務月份的第X日生成（如果該月沒有X日，則為該月最後一天）',
    paramType: 'day'
  }
]

// 選中的規則
const selectedRule = ref(props.modelValue?.rule || null)

// 參數值
const paramValue = ref(
  props.modelValue?.params?.days || 
  props.modelValue?.params?.day || 
  null
)

// 錯誤訊息
const errorMessage = ref('')

// 預覽日期
const previewDate = ref(null)

// 是否需要參數
const needsParams = computed(() => {
  if (!selectedRule.value) return false
  const rule = ruleOptions.find(r => r.value === selectedRule.value)
  return rule?.paramType !== null
})

// 參數類型
const paramType = computed(() => {
  if (!selectedRule.value) return null
  const rule = ruleOptions.find(r => r.value === selectedRule.value)
  return rule?.paramType || null
})

// 參數標籤
const paramLabel = computed(() => {
  if (paramType.value === 'days') {
    return '天數（X）'
  } else if (paramType.value === 'day') {
    return '日期（X）'
  }
  return '參數'
})

// 參數幫助文字
const paramHelpText = computed(() => {
  if (paramType.value === 'days') {
    return '請輸入天數（1-31），例如：輸入 3 表示前一個月的最後3天'
  } else if (paramType.value === 'day') {
    return '請輸入日期（1-31），例如：輸入 25 表示每月25日。如果該月沒有該日期（如2月沒有31日），則為該月最後一天'
  }
  return ''
})

// 預覽文字
const previewText = computed(() => {
  if (!selectedRule.value || !previewDate.value) {
    return '請選擇規則並輸入參數以查看預覽'
  }

  const rule = ruleOptions.find(r => r.value === selectedRule.value)
  if (!rule) return ''

  const serviceMonthText = props.serviceMonth 
    ? `${props.serviceMonth}月` 
    : '服務月份'

  switch (selectedRule.value) {
    case 'service_month_start':
      return `${serviceMonthText}的任務在${serviceMonthText}1日生成`
    
    case 'prev_month_last_x_days':
      if (paramValue.value) {
        const prevMonth = props.serviceMonth === 1 ? 12 : props.serviceMonth - 1
        const prevMonthText = prevMonth ? `${prevMonth}月` : '前一個月'
        return `${serviceMonthText}的任務在${prevMonthText}的最後${paramValue.value}天生成`
      }
      return '請輸入天數以查看預覽'
    
    case 'prev_month_x_day':
      if (paramValue.value) {
        const prevMonth = props.serviceMonth === 1 ? 12 : props.serviceMonth - 1
        const prevMonthText = prevMonth ? `${prevMonth}月` : '前一個月'
        return `${serviceMonthText}的任務在${prevMonthText}${paramValue.value}日生成`
      }
      return '請輸入日期以查看預覽'
    
    case 'next_month_start':
      {
        const nextMonth = props.serviceMonth === 12 ? 1 : props.serviceMonth + 1
        const nextMonthText = nextMonth ? `${nextMonth}月` : '後一個月'
        return `${serviceMonthText}的任務在${nextMonthText}1日生成`
      }
    
    case 'monthly_x_day':
      if (paramValue.value) {
        return `${serviceMonthText}的任務在${serviceMonthText}${paramValue.value}日生成`
      }
      return '請輸入日期以查看預覽'
    
    default:
      return ''
  }
})

// 計算預覽
const calculatePreview = () => {
  if (!selectedRule.value) {
    previewDate.value = null
    return
  }

  // 如果需要參數但參數未填寫，不顯示預覽
  if (needsParams.value && !paramValue.value) {
    previewDate.value = null
    return
  }

  // 如果沒有服務年月，使用當前年月作為示例
  const year = props.serviceYear || new Date().getFullYear()
  const month = props.serviceMonth || new Date().getMonth() + 1

  // 構建參數對象
  const params = {}
  if (paramType.value === 'days') {
    params.days = paramValue.value
  } else if (paramType.value === 'day') {
    params.day = paramValue.value
  }

  // 計算生成時間
  const date = calculateGenerationTime(selectedRule.value, params, year, month)
  
  if (date) {
    previewDate.value = date
    errorMessage.value = ''
  } else {
    previewDate.value = null
    errorMessage.value = '計算生成時間失敗，請檢查參數是否正確'
  }
}

// 處理規則變更
const handleRuleChange = async (value) => {
  selectedRule.value = value
  
  // 如果新規則不需要參數，清空參數值
  const rule = ruleOptions.find(r => r.value === value)
  if (!rule || !rule.paramType) {
    paramValue.value = null
  }

  // 更新值並觸發計算
  updateValue()
  calculatePreview()
  
  // 觸發驗證
  try {
    await formRef.value?.validateFields(['rule', 'paramValue'])
  } catch (error) {
    // 驗證失敗，錯誤已由表單處理
  }
}

// 處理參數變更
const handleParamChange = async () => {
  updateValue()
  calculatePreview()
  
  // 觸發驗證
  try {
    await formRef.value?.validateFields(['paramValue'])
  } catch (error) {
    // 驗證失敗，錯誤已由表單處理
  }
}

// 更新值
const updateValue = () => {
  const value = {
    rule: selectedRule.value,
    params: {}
  }

  if (paramType.value === 'days' && paramValue.value) {
    value.params.days = paramValue.value
  } else if (paramType.value === 'day' && paramValue.value) {
    value.params.day = paramValue.value
  }

  emit('update:modelValue', value)
  emit('change', value)
}

// 監聽外部值變化
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      selectedRule.value = newValue.rule || null
      paramValue.value = newValue.params?.days || newValue.params?.day || null
      calculatePreview()
    }
  },
  { deep: true, immediate: true }
)

// 監聽服務年月變化，重新計算預覽
watch(
  () => [props.serviceYear, props.serviceMonth],
  () => {
    calculatePreview()
  }
)

// 初始化時計算預覽
calculatePreview()
</script>

<style scoped>
.task-generation-time-rule {
  width: 100%;
}

:deep(.ant-select-item-option-content) {
  padding: 4px 0;
}
</style>

