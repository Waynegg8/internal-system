<template>
  <a-spin :spinning="loading">
    <a-table
      :columns="columns"
      :data-source="dataSource"
      :pagination="false"
      :row-key="(record, index) => record.userId || record.user_id || index"
    >
      <template #bodyCell="{ column, record, index }">
        <!-- 姓名 -->
        <template v-if="column.key === 'name'">
          <strong>{{ record.name || record.userName || '-' }}</strong>
        </template>

        <!-- 底薪 -->
        <template v-else-if="column.key === 'baseSalary'">
          {{ formatBaseSalary(record) }}
        </template>

        <!-- 年終金額 -->
        <template v-else-if="column.key === 'amount'">
          <a-input-number
            :value="getAmountInYuan(record)"
            :min="0"
            :step="1"
            :precision="0"
            :controls="false"
            :formatter="(value) => formatNumber(value)"
            :parser="(value) => (value == null ? '' : String(value).replace(/\D/g, ''))"
            style="width: 100%"
            @change="(value) => handleAmountInput(index, value)"
          />
        </template>

        <!-- 發放月份 -->
        <template v-else-if="column.key === 'paymentMonth'">
          <a-date-picker
            v-model:value="paymentMonths[index]"
            picker="month"
            format="YYYY-MM"
            style="width: 100%"
            @change="(date) => handleMonthChange(index, date)"
          />
        </template>

        <!-- 備註 -->
        <template v-else-if="column.key === 'notes'">
          <a-input
            :value="record.notes || record.remark || ''"
            placeholder="備註"
            @change="(e) => handleChange(index, 'notes', e.target.value)"
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
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { formatCurrency, formatNumber } from '@/utils/formatters'

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

const emit = defineEmits(['change'])

// 表格數據源
const dataSource = computed(() => props.employees || [])

// 發放月份值（用於 v-model）
const paymentMonths = ref([])

// 監聽 employees 變化，更新發放月份值
watch(() => props.employees, (newEmployees) => {
  paymentMonths.value = newEmployees.map(employee => {
    const monthStr = employee.paymentMonth || employee.payment_month
    if (!monthStr) return null
    return dayjs(monthStr, 'YYYY-MM')
  })
}, { immediate: true, deep: true })

// 格式化底薪
const formatBaseSalary = (record) => {
  const baseSalaryCents = record.baseSalaryCents || record.base_salary_cents || 0
  if (baseSalaryCents === 0) return '-'
  return formatCurrency(baseSalaryCents / 100)
}

// 獲取年終金額（轉換為元）
const getAmountInYuan = (record) => {
  const amountCents = record.amountCents || record.amount_cents || 0
  if (amountCents === 0) return undefined
  return amountCents / 100
}

// 處理變化
const sanitizeAmountValue = (rawValue) => {
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

const handleChange = (empIndex, field, value) => {
  emit('change', empIndex, field, value)
}

const handleAmountInput = (empIndex, rawValue) => {
  const sanitized = sanitizeAmountValue(rawValue)
  emit('change', empIndex, 'amount', sanitized)
}

// 處理月份變化
const handleMonthChange = (empIndex, date) => {
  const monthStr = date ? dayjs(date).format('YYYY-MM') : null
  emit('change', empIndex, 'paymentMonth', monthStr)
}

// 表格列定義
const columns = [
  {
    title: '姓名',
    dataIndex: 'name',
    key: 'name',
    width: 120
  },
  {
    title: '底薪',
    key: 'baseSalary',
    width: 120
  },
  {
    title: '年終金額（元）',
    key: 'amount',
    width: 150
  },
  {
    title: '發放月份',
    key: 'paymentMonth',
    width: 150
  },
  {
    title: '備註',
    key: 'notes',
    width: 200
  }
]
</script>

<style scoped>
:deep(.ant-table-cell) {
  padding: 8px;
}
</style>

