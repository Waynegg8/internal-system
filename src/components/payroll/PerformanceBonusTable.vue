<template>
  <a-spin :spinning="loading">
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :pagination="false"
      :row-key="(record, index) => record.userId || record.user_id || index"
      size="middle"
      class="responsive-table"
    >
      <template #bodyCell="{ column, record, index }">
        <!-- 姓名列 -->
        <template v-if="column.key === 'name'">
          <strong>{{ record.name || record.userName || '-' }}</strong>
        </template>

        <!-- 月份列（1-12月） -->
        <template v-else-if="column.key && column.key.startsWith('month')">
          <a-input-number
            :value="getAdjustmentValue(record, getMonthFromKey(column.key))"
            :min="0"
            :step="1"
            :precision="0"
            :controls="false"
            :formatter="(value) => formatNumber(value)"
            :parser="(value) => (value == null ? '' : String(value).replace(/\D/g, ''))"
            :class="{ 'adjusted-cell': isAdjusted(record, getMonthFromKey(column.key)) }"
            style="width: 100%; text-align: right"
            @change="(value) => handleInputChange(index, getMonthFromKey(column.key), value)"
          />
        </template>
      </template>

      <!-- 空狀態 -->
      <template #emptyText>
        <a-empty description="無員工資料" />
      </template>
    </a-table>
  </a-spin>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber } from '@/utils/formatters'

const props = defineProps({
  employees: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['adjustment-change'])

// 表格數據源
const dataSource = computed(() => props.employees || [])

// 獲取預設值（轉換為元，整數）
const getDefaultValue = (record, month) => {
  const monthlyDefaults = record.monthlyDefaults || record.monthly_defaults || {}
  // 嘗試數字鍵和字符串鍵
  const defaultValueCents = monthlyDefaults[month] || monthlyDefaults[String(month)] || monthlyDefaults[`${month}`] || 0
  if (defaultValueCents === 0) return 0
  return Math.round(defaultValueCents / 100)
}

// 獲取調整值或預設值（轉換為元，整數）
const getAdjustmentValue = (record, month) => {
  const monthlyAdjustments = record.monthlyAdjustments || record.monthly_adjustments || {}
  // 嘗試數字鍵和字符串鍵
  const adjustment = monthlyAdjustments[month] || monthlyAdjustments[String(month)] || monthlyAdjustments[`${month}`]
  
  // 如果有調整值，使用調整值
  if (adjustment) {
    const amountCents = adjustment.bonusAmountCents || adjustment.bonus_amount_cents || 0
    if (amountCents > 0) {
      return Math.round(amountCents / 100)
    }
  }
  
  // 沒有調整值時，返回預設值
  const defaultValue = getDefaultValue(record, month)
  
  return defaultValue
}

// 判斷某個月是否已被調整（用於顯示不同顏色）
const isAdjusted = (record, month) => {
  const monthlyAdjustments = record.monthlyAdjustments || record.monthly_adjustments || {}
  // 嘗試數字鍵和字符串鍵
  return !!(monthlyAdjustments[month] || monthlyAdjustments[String(month)] || monthlyAdjustments[`${month}`])
}

// 從列 key 獲取月份
const getMonthFromKey = (key) => {
  if (key && key.startsWith('month')) {
    return parseInt(key.replace('month', ''))
  }
  return 0
}

const sanitizeInputValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null
  }

  if (typeof rawValue === 'number') {
    if (Number.isNaN(rawValue)) return null
    return Math.max(0, Math.round(rawValue))
  }

  const cleaned = String(rawValue).replace(/\D/g, '')
  if (!cleaned) return null

  const parsed = Number(cleaned)
  if (Number.isNaN(parsed)) {
    return null
  }

  return Math.max(0, Math.round(parsed))
}

// 處理調整金額變化
const handleInputChange = (empIndex, month, rawValue) => {
  const sanitized = sanitizeInputValue(rawValue)
  emit('adjustment-change', empIndex, month, sanitized)
}

// 表格列定義
const columns = computed(() => {
  const cols = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 80
    }
  ]
  
  // 添加 12 個月份列
  for (let month = 1; month <= 12; month++) {
    cols.push({
      title: `${month}月`,
      key: `month${month}`,
      dataIndex: `month${month}`,
      width: 80,
      align: 'right',
      className: 'month-column'
    })
  }
  
  return cols
})
</script>

<style scoped>
:deep(.month-column) {
  background-color: #f0f9ff;
}

:deep(.ant-table-cell) {
  padding: 8px;
}

/* 已調整的格子樣式 */
:deep(.adjusted-cell) {
  background-color: #dbeafe !important;
  border: 2px solid #3b82f6 !important;
  font-weight: 600;
}

:deep(.adjusted-cell .ant-input-number-input) {
  color: #1e40af;
  font-weight: 600;
}
</style>

