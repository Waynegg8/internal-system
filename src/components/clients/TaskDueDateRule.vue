<template>
  <div class="task-due-date-rule">
    <a-form
      ref="formRef"
      :model="formData"
      :rules="validationRules"
      layout="vertical"
      @validate="handleValidate"
    >
      <!-- 統一的到期日規則選擇 -->
      <a-form-item label="到期日計算方式" name="selectedRuleType">
        <a-select
          v-model:value="selectedRuleType"
          placeholder="請選擇到期日計算方式"
          @change="handleRuleTypeChange"
          style="width: 100%"
          :status="validationStatus.selectedRuleType"
        >
          <a-select-option
            v-for="option in allRuleOptions"
            :key="option.value"
            :value="option.value"
          >
            <div>
              <div style="font-weight: 500">
                <span v-if="option.isRecommended" style="color: #10b981; margin-right: 4px;">✓</span>
                {{ option.label }}
              </div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px">
                {{ option.description }}
              </div>
            </div>
          </a-select-option>
        </a-select>
        <template #help>
          <div style="color: #6b7280; font-size: 12px; line-height: 1.6;">
            {{ currentRuleHelpText }}
          </div>
        </template>
      </a-form-item>

      <!-- 推薦方式：每月1日 + 天數 -->
      <div v-if="selectedRuleType === 'days_due'" style="padding: 16px; background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; margin-bottom: 16px;">
        <a-form-item label="到期天數" name="daysDue" style="margin-bottom: 0;">
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 4px; background: #ffffff; padding: 10px 14px; border-radius: 6px; border: 1px solid #d1fae5;">
              <span style="white-space: nowrap; color: #059669; font-weight: 600; font-size: 14px;">每月 1 日</span>
            </div>
            <span style="white-space: nowrap; color: #6b7280; font-size: 18px; font-weight: 500;">+</span>
            <a-input-number
              v-model:value="daysDue"
              :min="0"
              placeholder="輸入天數，例如：20"
              style="width: 150px"
              @change="handleDaysDueChange"
              :status="validationStatus.daysDue"
              :controls="false"
            />
            <span style="white-space: nowrap; color: #374151; font-weight: 600;">天</span>
          </div>
          <template #help>
            <div style="color: #059669; font-size: 12px; margin-top: 8px; padding: 8px 12px; background: #ffffff; border-radius: 4px; border-left: 3px solid #10b981;">
              <strong>計算公式：</strong>到期日 = 當月 1 日 + 輸入的天數
              <br />
              <strong>範例：</strong>輸入 20 表示每月 21 日到期，輸入 0 表示每月 1 日到期
            </div>
          </template>
        </a-form-item>
      </div>

      <!-- 其他規則的參數輸入 -->
      <a-form-item
        v-if="selectedRuleType && selectedRuleType !== 'days_due' && needsParams"
        :label="paramLabel"
        name="paramValue"
        :required="needsParams"
      >
        <!-- 固定期限：需要年月日 -->
        <template v-if="selectedRuleType === 'fixed_deadline'">
          <a-date-picker
            v-model:value="fixedDeadlineDate"
            placeholder="選擇固定期限日期"
            style="width: 100%"
            @change="handleFixedDeadlineChange"
            :status="validationStatus.fixedDeadlineDate"
            :show-time="false"
            format="YYYY-MM-DD"
            input-read-only
          />
        </template>

        <!-- 其他規則：數字輸入 -->
        <template v-else>
          <a-input-number
            v-if="paramType === 'days'"
            v-model:value="paramValue"
            :min="0"
            :precision="0"
            placeholder="請輸入天數"
            style="width: 100%"
            @change="handleParamChange"
            :status="validationStatus.paramValue"
            :controls="false"
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
            :controls="false"
          />
          <a-input-number
            v-else-if="paramType === 'months'"
            v-model:value="paramValue"
            :min="1"
            :precision="0"
            placeholder="請輸入月數"
            style="width: 100%"
            @change="handleParamChange"
            :status="validationStatus.paramValue"
            :controls="false"
          />
        </template>
        <template #help>
          <span style="color: #6b7280; font-size: 12px">
            {{ paramHelpText }}
          </span>
        </template>
      </a-form-item>

      <!-- 固定期限日期驗證（當選擇 fixed_deadline 規則時） -->
      <a-form-item
        v-if="selectedRuleType === 'fixed_deadline' && needsParams"
        name="fixedDeadlineDate"
        :required="needsParams"
        style="display: none;"
      >
        <!-- 隱藏表單項，僅用於驗證 -->
      </a-form-item>
    </a-form>

    <!-- 固定期限任務選項 -->
    <a-form-item>
      <a-checkbox
        v-model:checked="isFixedDeadline"
        @change="handleFixedDeadlineOptionChange"
      >
        <span style="font-weight: 500">固定期限任務</span>
      </a-checkbox>
      <template #help>
        <span style="color: #6b7280; font-size: 12px">
          固定期限任務的到期日不受前置任務延後影響。如果前置任務延誤導致無法在固定期限前完成，系統會自動調整中間任務的到期日並發送通知。
        </span>
      </template>
    </a-form-item>

    <!-- 即時預覽 -->
    <a-form-item v-if="previewDate" label="預覽">
      <div style="padding: 12px; background: #f0fdf4; border-radius: 4px; border-left: 3px solid #10b981">
        <div style="font-size: 13px; color: #059669; font-weight: 500; margin-bottom: 4px">
          <CalendarOutlined style="margin-right: 6px" />
          到期日預覽
        </div>
        <div style="font-size: 14px; color: #047857">
          {{ previewText }}
        </div>
        <div v-if="previewDate" style="font-size: 12px; color: #10b981; margin-top: 4px">
          實際到期日期：{{ formatDateChinese(previewDate) }}
        </div>
        <div v-if="isFixedDeadline" style="font-size: 12px; color: #dc2626; margin-top: 4px; font-weight: 500">
          ⚠️ 固定期限任務：不受前置任務延後影響
        </div>
      </div>
    </a-form-item>

    <!-- 錯誤訊息 -->
    <a-form-item v-if="errorMessage">
      <a-alert type="error" :message="errorMessage" show-icon />
    </a-form-item>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { CalendarOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { calculateDueDate } from '@/utils/dateCalculators'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ rule: null, params: {}, days_due: null, is_fixed_deadline: false })
  },
  serviceYear: {
    type: Number,
    required: true
  },
  serviceMonth: {
    type: Number,
    required: true
  },
  required: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'validate'])

const formRef = ref(null)

// 表單字段
const formFields = ref({
  selectedRuleType: '',
  daysDue: '',
  paramValue: '',
  fixedDeadlineDate: ''
})

// 所有規則選項（包含推薦方式）
const allRuleOptions = [
  {
    value: 'days_due',
    label: '每月1日 + N天',
    description: '從每月1日開始計算，加上指定天數',
    paramType: 'days_due',
    isRecommended: true
  },
  {
    value: 'service_month_end',
    label: '服務月份結束時',
    description: '任務到期日為服務月份的最後一天',
    paramType: null
  },
  {
    value: 'next_month_end',
    label: '下個月結束時',
    description: '任務到期日為服務月份後一個月的最後一天',
    paramType: null
  },
  {
    value: 'n_months_end',
    label: 'N個月後結束',
    description: '任務到期日為服務月份後N個月的最後一天',
    paramType: 'months'
  },
  {
    value: 'fixed_date',
    label: '固定日期',
    description: '任務到期日為服務月份的固定日期（如果該月沒有該日期，則為該月最後一天）',
    paramType: 'day'
  },
  {
    value: 'fixed_deadline',
    label: '固定期限',
    description: '任務到期日為指定的固定日期（年月日）',
    paramType: 'date'
  },
  {
    value: 'days_after_start',
    label: '服務月份開始後N天',
    description: '任務到期日為服務月份開始後N天',
    paramType: 'days'
  }
]

// 選中的規則類型
const selectedRuleType = ref(null)

// 表單數據（用於驗證）
const formData = computed(() => ({
  selectedRuleType: selectedRuleType.value,
  daysDue: daysDue.value,
  paramValue: paramValue.value,
  fixedDeadlineDate: fixedDeadlineDate.value,
  needsParams: needsParams.value,
  paramType: paramType.value
}))

// 驗證狀態
const validationStatus = ref({
  selectedRuleType: '',
  daysDue: '',
  paramValue: '',
  fixedDeadlineDate: ''
})

// 當前規則的幫助文字
const currentRuleHelpText = computed(() => {
  if (!selectedRuleType.value) {
    return '請選擇到期日計算方式，系統將根據選擇的規則自動計算到期日期'
  }
  const option = allRuleOptions.find(opt => opt.value === selectedRuleType.value)
  if (!option) return ''
  
  if (option.value === 'days_due') {
    return '✓ 推薦方式：從每月1日開始計算，只需輸入天數即可，適合大多數情況'
  }
  return `選擇了「${option.label}」，${option.description}`
})

// 驗證規則
const validationRules = computed(() => {
  const baseRules = createDueDateRuleRules()
  
  const customRules = {
    selectedRuleType: [
      {
        validator: (rule, value, callback) => {
          if (props.required && !value) {
            callback(new Error('請選擇到期日計算方式'))
            return
          }
          callback()
        },
        trigger: 'change'
      }
    ],
    daysDue: [
      {
        validator: (rule, value, callback) => {
          // 只在選擇 days_due 時驗證
          if (selectedRuleType.value !== 'days_due') {
            callback()
            return
          }
          
          if (props.required && (value === null || value === undefined || value === '')) {
            callback(new Error('請輸入到期天數'))
            return
          }
          
          if (value !== null && value !== undefined && value !== '') {
            const numValue = Number(value)
            if (isNaN(numValue) || !Number.isFinite(numValue) || numValue < 0) {
              callback(new Error('到期天數必須大於等於 0'))
              return
            }
          }
          
          callback()
        },
        trigger: 'blur'
      }
    ],
    paramValue: [
      {
        validator: (rule, value, callback) => {
          // 只在選擇需要參數的規則時驗證
          if (!selectedRuleType.value || selectedRuleType.value === 'days_due') {
            callback()
            return
          }
          
          const currentNeedsParams = needsParams.value
          const selectedRule = selectedRuleType.value
          
          // fixed_deadline 規則需要特殊處理（使用日期選擇器）
          if (selectedRule === 'fixed_deadline') {
            callback()
            return
          }
          
          if (currentNeedsParams) {
            if (value === null || value === undefined || value === '') {
              callback(new Error('請輸入參數值'))
              return
            }
            
            const numValue = Number(value)
            if (isNaN(numValue) || !Number.isFinite(numValue)) {
              callback(new Error('參數值必須是有效的數字'))
              return
            }
            
            const currentParamType = paramType.value
            if (currentParamType === 'days') {
              if (numValue < 0) {
                callback(new Error('天數必須大於等於 0'))
                return
              }
            } else if (currentParamType === 'day') {
              if (numValue < 1 || numValue > 31) {
                callback(new Error('日期必須在 1-31 之間'))
                return
              }
            } else if (currentParamType === 'months') {
              if (numValue < 1) {
                callback(new Error('月數必須大於等於 1'))
                return
              }
            }
          }
          
          callback()
        },
        trigger: 'blur'
      }
    ],
    fixedDeadlineDate: [
      {
        validator: (rule, value, callback) => {
          if (selectedRuleType.value !== 'fixed_deadline') {
            callback()
            return
          }
          
          const currentNeedsParams = needsParams.value
          if (currentNeedsParams && !value) {
            callback(new Error('請選擇固定期限日期'))
            return
          }
          
          callback()
        },
        trigger: 'change'
      }
    ]
  }
  
  return { ...baseRules, ...customRules }
})

// 處理驗證
const handleValidate = (name, status, errorMsgs) => {
  if (name) {
    validationStatus.value[name] = status ? '' : 'error'
  } else {
    Object.keys(validationStatus.value).forEach(key => {
      validationStatus.value[key] = ''
    })
  }
  
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

defineExpose({ validate })

// 確保 modelValue 是對象的輔助函數
const getSafeModelValue = () => {
  const mv = props.modelValue
  if (mv === null || mv === undefined) {
    return { rule: null, params: {}, days_due: null, is_fixed_deadline: false }
  }
  if (typeof mv !== 'object' || Array.isArray(mv)) {
    console.warn('TaskDueDateRule: modelValue is not an object, using default', mv, typeof mv)
    return { rule: null, params: {}, days_due: null, is_fixed_deadline: false }
  }
  return mv
}

const safeModelValue = computed(() => getSafeModelValue())

const initialModelValue = (() => {
  const mv = props.modelValue
  if (mv === null || mv === undefined) {
    return { rule: null, params: {}, days_due: null, is_fixed_deadline: false }
  }
  if (typeof mv !== 'object' || Array.isArray(mv)) {
    console.warn('TaskDueDateRule: initial modelValue is not an object, using default', mv, typeof mv)
    return { rule: null, params: {}, days_due: null, is_fixed_deadline: false }
  }
  let params = {}
  if (mv.params && typeof mv.params === 'object' && !Array.isArray(mv.params)) {
    params = mv.params
  }
  return {
    rule: mv.rule || null,
    params: params,
    days_due: mv.days_due ?? null,
    is_fixed_deadline: mv.is_fixed_deadline || false
  }
})()

// 新規則：days_due
const daysDue = ref(initialModelValue.days_due ?? null)

// 參數值
const paramValue = ref(
  (initialModelValue.params && typeof initialModelValue.params === 'object' && (initialModelValue.params.days || initialModelValue.params.day || initialModelValue.params.months)) || null
)

// 固定期限日期選擇器值
const fixedDeadlineDate = ref(
  (initialModelValue.params && typeof initialModelValue.params === 'object' && initialModelValue.params.year && initialModelValue.params.month && initialModelValue.params.day)
    ? dayjs(`${initialModelValue.params.year}-${String(initialModelValue.params.month).padStart(2, '0')}-${String(initialModelValue.params.day).padStart(2, '0')}`)
    : null
)

// 固定期限任務選項
const isFixedDeadline = ref(initialModelValue.is_fixed_deadline || false)

// 錯誤訊息
const errorMessage = ref('')

// 預覽日期
const previewDate = ref(null)

// 根據現有數據初始化規則類型
const initializeRuleType = () => {
  const modelValue = safeModelValue.value
  
  if (!modelValue || typeof modelValue !== 'object') {
    selectedRuleType.value = 'days_due' // 默認使用推薦方式
    return
  }
  
  const hasDaysDue = modelValue.days_due !== null && modelValue.days_due !== undefined && Number.isFinite(modelValue.days_due)
  const hasOldRule = modelValue.rule && modelValue.rule !== null
  const hasFixedDeadlineParams = modelValue.params && modelValue.params.year && modelValue.params.month && modelValue.params.day
  
  // 將後端規則名稱轉換為前端規則名稱的輔助函數
  const convertBackendRuleToFrontendRule = (backendRule) => {
    // 後端規則名稱到前端規則名稱的映射
    const ruleMap = {
      'end_of_month': 'service_month_end',
      'specific_day': 'fixed_date',
      'next_month_day': 'next_month_end',
      'days_after_start': 'days_after_start'
    }
    // 如果映射存在則返回映射值，否則返回原值（可能是前端規則名稱）
    return ruleMap[backendRule] || backendRule
  }
  
  // 優先使用 days_due
  if (hasDaysDue) {
    selectedRuleType.value = 'days_due'
  } else if (hasOldRule) {
    // 使用舊規則，並將後端規則名稱轉換為前端規則名稱
    const convertedRule = convertBackendRuleToFrontendRule(modelValue.rule)
    // 檢查轉換後的規則是否在前端選項列表中
    const ruleExists = allRuleOptions.some(opt => opt.value === convertedRule)
    selectedRuleType.value = ruleExists ? convertedRule : 'service_month_end' // 如果規則不存在，默認使用服務月份結束時
  } else if (hasFixedDeadlineParams) {
    selectedRuleType.value = 'fixed_deadline'
  } else {
    selectedRuleType.value = 'days_due' // 默認使用推薦方式
  }
}

// 是否需要參數
const needsParams = computed(() => {
  if (!selectedRuleType.value || selectedRuleType.value === 'days_due') return false
  const rule = allRuleOptions.find(r => r.value === selectedRuleType.value)
  return rule?.paramType !== null
})

// 參數類型
const paramType = computed(() => {
  if (!selectedRuleType.value) return null
  const rule = allRuleOptions.find(r => r.value === selectedRuleType.value)
  return rule?.paramType || null
})

// 參數標籤
const paramLabel = computed(() => {
  if (paramType.value === 'days') {
    return '天數'
  } else if (paramType.value === 'day') {
    return '日期'
  } else if (paramType.value === 'months') {
    return '月數'
  } else if (paramType.value === 'date') {
    return '固定期限日期'
  }
  return '參數值'
})

// 參數幫助文字
const paramHelpText = computed(() => {
  if (paramType.value === 'days') {
    return '輸入服務月份開始後的天數，例如：7 表示服務月份開始後7天到期'
  } else if (paramType.value === 'day') {
    return '輸入每月固定的日期（1-31），例如：15 表示每月15日到期'
  } else if (paramType.value === 'months') {
    return '輸入月數，例如：2 表示服務月份後2個月的最後一天到期'
  } else if (paramType.value === 'date') {
    return '選擇固定的到期日期（年月日）'
  }
  return ''
})

// 預覽文字
const previewText = computed(() => {
  if (!previewDate.value) return ''
  
  if (selectedRuleType.value === 'days_due' && daysDue.value !== null && daysDue.value !== undefined) {
    return `從服務月份 1 日開始，加上 ${daysDue.value} 天後到期`
  } else if (selectedRuleType.value) {
    const rule = allRuleOptions.find(r => r.value === selectedRuleType.value)
    if (rule) {
      return rule.description
    }
  }
  return ''
})

// 計算預覽
const calculatePreview = () => {
  errorMessage.value = ''
  previewDate.value = null
  
  if (!props.serviceYear || !props.serviceMonth) {
    return
  }
  
  try {
    let date = null
    
    if (selectedRuleType.value === 'days_due' && daysDue.value !== null && daysDue.value !== undefined) {
      date = calculateDueDate(null, {}, props.serviceYear, props.serviceMonth, daysDue.value)
    } else if (selectedRuleType.value && selectedRuleType.value !== 'days_due') {
      const params = {}
      
      if (paramType.value === 'days') {
        params.days = paramValue.value
      } else if (paramType.value === 'day') {
        params.day = paramValue.value
      } else if (paramType.value === 'months') {
        params.months = paramValue.value
      } else if (paramType.value === 'date' && fixedDeadlineDate.value) {
        params.year = fixedDeadlineDate.value.year()
        params.month = fixedDeadlineDate.value.month() + 1
        params.day = fixedDeadlineDate.value.date()
      }
      
      date = calculateDueDate(selectedRuleType.value, params, props.serviceYear, props.serviceMonth)
    }
    
    if (date) {
      previewDate.value = date
      errorMessage.value = ''
    } else {
      previewDate.value = null
      errorMessage.value = '計算到期日失敗，請檢查參數是否正確'
    }
  } catch (error) {
    console.error('計算到期日預覽失敗:', error)
    previewDate.value = null
    errorMessage.value = '計算到期日失敗，請檢查參數是否正確'
  }
}

// 處理規則類型變更
const handleRuleTypeChange = async (value) => {
  console.log('handleRuleTypeChange called with value:', value)
  
  selectedRuleType.value = value
  
  // 根據選擇的規則類型清空不相關的字段
  if (value === 'days_due') {
    // 選擇推薦方式，清空舊規則
    paramValue.value = null
    fixedDeadlineDate.value = null
  } else {
    // 選擇其他規則，清空 days_due
    daysDue.value = null
  }
  
  updateValue()
  calculatePreview()
  
  // 觸發驗證
  try {
    await formRef.value?.validateFields(['selectedRuleType', 'daysDue', 'paramValue', 'fixedDeadlineDate'])
  } catch (error) {
    // 驗證失敗，錯誤已由表單處理
  }
}

// 處理 days_due 變更
const handleDaysDueChange = async () => {
  updateValue()
  calculatePreview()
  
  try {
    await formRef.value?.validateFields(['daysDue'])
  } catch (error) {
    // 驗證失敗，錯誤已由表單處理
  }
}

// 處理參數變更
const handleParamChange = async () => {
  updateValue()
  calculatePreview()
  
  try {
    await formRef.value?.validateFields(['paramValue'])
  } catch (error) {
    // 驗證失敗，錯誤已由表單處理
  }
}

// 處理固定期限日期變更
const handleFixedDeadlineChange = async () => {
  updateValue()
  calculatePreview()
  
  try {
    await formRef.value?.validateFields(['fixedDeadlineDate'])
  } catch (error) {
    // 驗證失敗，錯誤已由表單處理
  }
}

// 處理固定期限任務選項變更
const handleFixedDeadlineOptionChange = () => {
  updateValue()
}

// 更新值
const updateValue = () => {
  const value = {
    rule: null,
    params: {},
    days_due: null,
    is_fixed_deadline: isFixedDeadline.value
  }

  if (selectedRuleType.value === 'days_due') {
    // 推薦方式：使用 days_due
    value.days_due = daysDue.value
    value.rule = null
    value.params = {}
  } else if (selectedRuleType.value) {
    // 其他規則：使用 rule
    value.rule = selectedRuleType.value
    value.days_due = null
    
    // 設置參數
    if (paramType.value === 'days' && paramValue.value !== null) {
      value.params.days = paramValue.value
    } else if (paramType.value === 'day' && paramValue.value !== null) {
      value.params.day = paramValue.value
    } else if (paramType.value === 'months' && paramValue.value !== null) {
      value.params.months = paramValue.value
    } else if (paramType.value === 'date' && fixedDeadlineDate.value) {
      value.params.year = fixedDeadlineDate.value.year()
      value.params.month = fixedDeadlineDate.value.month() + 1
      value.params.day = fixedDeadlineDate.value.date()
    }
  }

  emit('update:modelValue', value)
  emit('change', value)
}

// 格式化日期為中文
const formatDateChinese = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${year}年${month}月${day}日`
}

// 創建驗證規則的基礎函數
const createDueDateRuleRules = () => ({
  selectedRuleType: [],
  daysDue: [],
  paramValue: [],
  fixedDeadlineDate: []
})

// 監聽外部值變化
watch(
  () => props.modelValue,
  (newValue) => {
    let safeValue = { rule: null, params: {}, days_due: null, is_fixed_deadline: false }
    
    if (newValue !== null && newValue !== undefined && typeof newValue === 'object' && !Array.isArray(newValue)) {
      safeValue = {
        rule: newValue.rule || null,
        params: newValue.params || {},
        days_due: newValue.days_due ?? null,
        is_fixed_deadline: newValue.is_fixed_deadline || false
      }
    } else if (newValue !== null && newValue !== undefined) {
      console.warn('TaskDueDateRule: modelValue changed to non-object, using default', newValue, typeof newValue)
    }
    
    // 更新數據
    daysDue.value = safeValue.days_due
    paramValue.value = safeValue.params.days || safeValue.params.day || safeValue.params.months || null
    isFixedDeadline.value = safeValue.is_fixed_deadline
    
    // 更新固定期限日期
    if (safeValue.params.year && safeValue.params.month && safeValue.params.day) {
      fixedDeadlineDate.value = dayjs(`${safeValue.params.year}-${String(safeValue.params.month).padStart(2, '0')}-${String(safeValue.params.day).padStart(2, '0')}`)
    } else {
      fixedDeadlineDate.value = null
    }
    
    // 根據數據初始化規則類型
    initializeRuleType()
    
    calculatePreview()
  },
  { deep: true, immediate: false }
)

// 監聽服務年月變化，重新計算預覽
watch(
  () => [props.serviceYear, props.serviceMonth],
  () => {
    calculatePreview()
  }
)

// 初始化
onMounted(() => {
  initializeRuleType()
  calculatePreview()
  updateValue()
})
</script>

<style scoped>
.task-due-date-rule {
  width: 100%;
}

:deep(.ant-select-item-option-content) {
  padding: 4px 0;
}
</style>