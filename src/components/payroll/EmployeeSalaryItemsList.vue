<template>
  <div class="salary-items-list">
    <template v-if="items.length === 0">
      <a-empty description="尚無薪資項目" />
    </template>
    <template v-else>
      <div
        v-for="(item, index) in items"
        :key="index"
        class="salary-item-card"
      >
        <a-row :gutter="16">
          <!-- 項目類型 -->
          <a-col :span="8">
            <a-form-item
              label="項目類型"
              :validate-status="getFieldError(item, 'itemTypeId') ? 'error' : ''"
              :help="getFieldError(item, 'itemTypeId')"
            >
              <a-select
                :value="item.itemTypeId || item.item_type_id"
                placeholder="請選擇項目類型"
                @change="(value) => handleItemChange(index, 'itemTypeId', value)"
              >
                <a-select-option
                  v-for="type in enabledSalaryItemTypes"
                  :key="type.itemTypeId || type.item_type_id"
                  :value="type.itemTypeId || type.item_type_id"
                >
                  {{ getItemTypeLabel(type) }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>

          <!-- 金額 -->
          <a-col :span="6">
            <a-form-item
              label="金額（元）"
              :validate-status="getFieldError(item, 'amount') ? 'error' : ''"
              :help="getFieldError(item, 'amount')"
            >
              <a-input-number
                :value="getAmountInYuan(item)"
                :min="0"
                :step="1"
                :precision="0"
                placeholder="0"
                style="width: 100%"
                @change="(value) => handleAmountChange(index, value)"
              />
            </a-form-item>
          </a-col>

          <!-- 發放週期 -->
          <a-col :span="6">
            <a-form-item label="發放週期">
              <a-select
                :value="item.period || item.payment_period || item.recurringType || item.recurring_type || 'monthly'"
                @change="(value) => handleItemChange(index, 'period', value)"
              >
                <a-select-option value="monthly">每月發放</a-select-option>
                <a-select-option value="yearly">每年指定月份</a-select-option>
                <a-select-option value="once">僅發放一次</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>

          <!-- 刪除按鈕 -->
          <a-col :span="4" style="display: flex; align-items: flex-end; padding-bottom: 24px;">
            <a-button
              type="text"
              danger
              @click="handleRemove(index)"
              >
                刪除
              </a-button>
          </a-col>
        </a-row>

        <!-- 月份選擇器（條件顯示：發放週期為「每年指定月份」時） -->
        <a-row v-if="(item.period || item.payment_period || item.recurringType || item.recurring_type) === 'yearly'" :gutter="16">
          <a-col :span="24">
            <a-form-item label="發放月份">
              <a-checkbox-group
                :value="getSelectedMonths(item)"
                @change="(values) => handleMonthsChange(index, values)"
              >
                <a-row>
                  <a-col
                    v-for="month in 12"
                    :key="month"
                    :span="4"
                    style="margin-bottom: 8px"
                  >
                    <a-checkbox :value="month">{{ month }}月</a-checkbox>
                  </a-col>
                </a-row>
              </a-checkbox-group>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 生效日期和失效日期 -->
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="生效月份">
              <a-month-picker
                v-model:value="effectiveDates[index]"
                format="YYYY-MM"
                placeholder="選擇生效月份"
                style="width: 100%"
                @change="(date) => handleDateChange(index, 'effectiveDate', date)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="失效月份（可選）">
              <a-month-picker
                v-model:value="expiryDates[index]"
                format="YYYY-MM"
                placeholder="選擇失效月份"
                style="width: 100%"
                @change="(date) => handleDateChange(index, 'expiryDate', date)"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { getCategoryLabel } from '@/utils/payrollUtils'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  },
  salaryItemTypes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update', 'add', 'remove'])

// 獲取啟用的薪資項目類型
const enabledSalaryItemTypes = computed(() => {
  return props.salaryItemTypes.filter(type => {
    const isActive = type.isActive !== undefined ? type.isActive : type.is_active
    return isActive !== false
  })
})

// 獲取項目類型標籤
const getItemTypeLabel = (type) => {
  const name = type.itemName || type.item_name || '-'
  const category = type.category || ''
  const categoryLabel = getCategoryLabel(category)
  return `${name} (${categoryLabel})`
}

// 獲取金額（轉換為元）
const getAmountInYuan = (item) => {
  const amountCents = item.amountCents || item.amount_cents || 0
  return amountCents / 100
}

// 處理金額變化
const handleAmountChange = (index, value) => {
  const newItems = [...props.items]
  newItems[index] = {
    ...newItems[index],
    amountCents: value ? Math.round(value * 100) : 0,
    amount_cents: value ? Math.round(value * 100) : 0
  }
  emit('update', newItems)
}

// 處理項目變化
const handleItemChange = (index, field, value) => {
  const newItems = [...props.items]
  const updatedItem = {
    ...newItems[index],
    [field]: value,
    // 同時設置 snake_case 格式
    [toSnakeCase(field)]: value
  }
  if (field === 'period') {
    updatedItem.payment_period = value
    updatedItem.recurringType = value
    updatedItem.recurring_type = value

    if (value !== 'yearly') {
      const emptyMonths = JSON.stringify([])
      updatedItem.months = emptyMonths
      updatedItem.selected_months = emptyMonths
      updatedItem.recurringMonths = emptyMonths
      updatedItem.recurring_months = emptyMonths
    }
  }
  newItems[index] = updatedItem
  emit('update', newItems)
}

// 轉換為 snake_case
const toSnakeCase = (str) => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}

// 獲取選中的月份
const getSelectedMonths = (item) => {
  const monthsStr =
    item.months ||
    item.selected_months ||
    item.recurringMonths ||
    item.recurring_months ||
    '[]'
  try {
    const months = JSON.parse(monthsStr)
    return Array.isArray(months) ? months : []
  } catch {
    return []
  }
}

// 處理月份變化
const handleMonthsChange = (index, values) => {
  const newItems = [...props.items]
  const serialized = JSON.stringify(values)
  newItems[index] = {
    ...newItems[index],
    months: serialized,
    selected_months: serialized,
    recurringMonths: serialized,
    recurring_months: serialized
  }
  emit('update', newItems)
}

// 日期值（用於 v-model，月份選擇器）
const effectiveDates = ref([])
const expiryDates = ref([])

// 監聽 items 變化，更新日期值
watch(() => props.items, (newItems) => {
  effectiveDates.value = newItems.map(item => {
    const dateStr = item.effectiveDate || item.effective_date
    if (!dateStr) return dayjs()
    // 如果是 YYYY-MM-DD 格式，轉換為月份；如果是 YYYY-MM 格式，直接使用
    const monthStr = dateStr.substring(0, 7) // 取前7個字符 YYYY-MM
    return dayjs(monthStr, 'YYYY-MM')
  })
  expiryDates.value = newItems.map(item => {
    const dateStr = item.expiryDate || item.expiry_date
    if (!dateStr) return null
    // 如果是 YYYY-MM-DD 格式，轉換為月份；如果是 YYYY-MM 格式，直接使用
    const monthStr = dateStr.substring(0, 7) // 取前7個字符 YYYY-MM
    return dayjs(monthStr, 'YYYY-MM')
  })
}, { immediate: true, deep: true })

// 處理日期變化
const handleDateChange = (index, field, date) => {
  if (!date) {
    // 如果清空，設置為空字符串
    handleItemChange(index, field, '')
    return
  }
  
  // 將月份轉換為日期字符串
  if (field === 'effectiveDate') {
    // 生效日期：該月第一天（例如 2025-11 -> 2025-11-01）
    const dateStr = dayjs(date).format('YYYY-MM-01')
    handleItemChange(index, field, dateStr)
  } else if (field === 'expiryDate') {
    // 失效日期：該月最後一天（例如 2025-11 -> 2025-11-30）
    const dateStr = dayjs(date).endOf('month').format('YYYY-MM-DD')
    handleItemChange(index, field, dateStr)
  }
}

// 處理刪除
const handleRemove = (index) => {
  emit('remove', index)
}

// 獲取字段錯誤
const getFieldError = (item, field) => {
  // 簡單驗證
  if (field === 'itemTypeId' && !item.itemTypeId && !item.item_type_id) {
    return '請選擇項目類型'
  }
  if (field === 'amount') {
    const amount = getAmountInYuan(item)
    if (!amount || amount <= 0) {
      return '金額必須大於 0'
    }
  }
  return ''
}
</script>

<style scoped>
.salary-items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.salary-item-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background-color: #f9fafb;
}
</style>

