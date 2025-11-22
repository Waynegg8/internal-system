<template>
  <div class="allocation-calculator">
    <a-card
      size="small"
      title="成本分攤計算參數"
      :head-style="{ padding: '8px 16px', minHeight: '44px', fontSize: '14px' }"
      :body-style="{ padding: '16px' }"
    >
      <a-form
        :model="formData"
        layout="vertical"
        @finish="handleCalculate"
      >
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="年份月份"
              name="yearMonth"
              :rules="[{ required: true, message: '請選擇年份月份' }]"
            >
              <a-date-picker
                v-model:value="selectedMonthValue"
                picker="month"
                format="YYYY-MM"
                placeholder="選擇年份月份"
                size="large"
                style="width: 100%"
                @change="handleMonthChange"
              />
            </a-form-item>
          </a-col>

          <a-col :span="12">
            <a-form-item
              label="分攤方式"
              name="allocationMethod"
              :rules="[{ required: true, message: '請選擇分攤方式' }]"
            >
              <a-select
                v-model:value="formData.allocationMethod"
                placeholder="選擇分攤方式"
                size="large"
                style="width: 100%"
              >
                <a-select-option value="per_employee">按員工數分攤</a-select-option>
                <a-select-option value="per_hour">按工時分攤</a-select-option>
                <a-select-option value="per_revenue">按收入分攤</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item>
          <a-space>
            <a-button
              type="primary"
              size="large"
              html-type="submit"
              :loading="loading"
            >
              開始計算
            </a-button>
            <a-button
              size="large"
              @click="handleReset"
            >
              重置
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>

      <!-- 分攤方式說明 -->
      <a-alert
        v-if="formData.allocationMethod"
        type="info"
        show-icon
        :message="getAllocationMethodDescription()"
        style="margin-top: 16px"
      />
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

// Props
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['calculate'])

// 表單數據
const formData = reactive({
  yearMonth: '',
  allocationMethod: ''
})

// 選中的月份值（DatePicker 使用）
const selectedMonthValue = ref(null)

// 當前年月
const currentYearMonth = dayjs().format('YYYY-MM')

// 處理月份變化
const handleMonthChange = (date) => {
  if (date) {
    formData.yearMonth = dayjs(date).format('YYYY-MM')
  } else {
    formData.yearMonth = ''
  }
}

// 處理計算
const handleCalculate = () => {
  if (!formData.yearMonth) {
    message.error('請選擇年份月份')
    return
  }

  if (!formData.allocationMethod) {
    message.error('請選擇分攤方式')
    return
  }

  const [year, month] = formData.yearMonth.split('-')

  emit('calculate', {
    year: parseInt(year),
    month: parseInt(month),
    allocationMethod: formData.allocationMethod
  })
}

// 處理重置
const handleReset = () => {
  formData.yearMonth = currentYearMonth
  formData.allocationMethod = ''
  selectedMonthValue.value = dayjs(currentYearMonth)
}

// 初始化
const initializeForm = () => {
  formData.yearMonth = currentYearMonth
  selectedMonthValue.value = dayjs(currentYearMonth)
}

// 獲取分攤方式說明
const getAllocationMethodDescription = () => {
  const descriptions = {
    per_employee: '按員工數分攤：將總管理費用平均分攤給所有員工',
    per_hour: '按工時分攤：根據員工實際工時比例分攤管理費用',
    per_revenue: '按收入分攤：根據員工所負責客戶的收入比例分攤管理費用'
  }

  return descriptions[formData.allocationMethod] || ''
}

// 初始化表單
initializeForm()
</script>

<style scoped>
.allocation-calculator {
  width: 100%;
}

.allocation-calculator :deep(.ant-card-body) {
  padding: 16px;
}
</style>
