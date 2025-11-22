<template>
  <div class="allocation-result">
    <!-- 計算摘要 -->
    <a-card
      v-if="result && result.summary"
      size="small"
      title="計算摘要"
      :head-style="{ padding: '8px 16px', minHeight: '44px', fontSize: '14px' }"
      :body-style="{ padding: '12px 16px' }"
      style="margin-bottom: 16px"
    >
      <a-row :gutter="16">
        <a-col :span="6">
          <a-statistic
            title="總成本"
            :value="result.summary.totalCost || 0"
            :precision="0"
            suffix="元"
            :value-style="{ color: '#3f8600' }"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="分攤方式"
            :value="getAllocationMethodName(result.summary.allocationMethod)"
            :value-style="{ fontSize: '14px' }"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="員工數量"
            :value="result.employees?.length || 0"
            :value-style="{ fontSize: '14px' }"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="客戶數量"
            :value="result.clients?.length || 0"
            :value-style="{ fontSize: '14px' }"
          />
        </a-col>
      </a-row>
    </a-card>

    <!-- 員工分攤明細 -->
    <a-card
      v-if="result && result.employees"
      size="small"
      title="員工分攤明細"
      :head-style="{ padding: '8px 16px', minHeight: '44px', fontSize: '14px' }"
      :body-style="{ padding: '12px 16px' }"
      style="margin-bottom: 16px"
    >
      <a-table
        :columns="employeeColumns"
        :data-source="result.employees"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
        :scroll="{ x: 800 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'baseSalary'">
            {{ formatCurrency(record.baseSalary) }}
          </template>
          <template v-if="column.key === 'laborCost'">
            {{ formatCurrency(record.laborCost) }}
          </template>
          <template v-if="column.key === 'overheadAllocation'">
            {{ formatCurrency(record.overheadAllocation) }}
          </template>
          <template v-if="column.key === 'totalCost'">
            {{ formatCurrency(record.totalCost) }}
          </template>
          <template v-if="column.key === 'hourlyRate'">
            {{ formatCurrency(record.hourlyRate) }}
          </template>
          <template v-if="column.key === 'monthHours'">
            {{ formatHours(record.monthHours) }}
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 客戶任務成本 -->
    <a-card
      v-if="result && result.clients"
      size="small"
      title="客戶任務成本"
      :head-style="{ padding: '8px 16px', minHeight: '44px', fontSize: '14px' }"
      :body-style="{ padding: '12px 16px' }"
    >
      <a-table
        :columns="clientColumns"
        :data-source="result.clients"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
        :scroll="{ x: 1000 }"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'totalCost'">
            {{ formatCurrency(record.totalCost) }}
          </template>
          <template v-if="column.key === 'totalHours'">
            {{ formatHours(record.totalHours) }}
          </template>
          <template v-if="column.key === 'avgHourlyRate'">
            {{ formatCurrency(record.avgHourlyRate) }}
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 空狀態 -->
    <a-empty
      v-if="!result || (!result.employees && !result.clients)"
      description="尚未進行計算，請先選擇參數並點擊計算"
      :image="false"
    >
      <template #image>
        <calculator-outlined style="font-size: 48px; color: #d9d9d9;" />
      </template>
    </a-empty>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { CalculatorOutlined } from '@ant-design/icons-vue'

// Props
const props = defineProps({
  result: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// 員工分攤明細表格列定義
const employeeColumns = [
  {
    title: '員工姓名',
    dataIndex: 'name',
    key: 'name',
    width: 120,
    fixed: 'left'
  },
  {
    title: '底薪',
    dataIndex: 'baseSalary',
    key: 'baseSalary',
    width: 100,
    align: 'right'
  },
  {
    title: '勞動成本',
    dataIndex: 'laborCost',
    key: 'laborCost',
    width: 100,
    align: 'right'
  },
  {
    title: '管理費分攤',
    dataIndex: 'overheadAllocation',
    key: 'overheadAllocation',
    width: 120,
    align: 'right'
  },
  {
    title: '總成本',
    dataIndex: 'totalCost',
    key: 'totalCost',
    width: 100,
    align: 'right'
  },
  {
    title: '實際工時',
    dataIndex: 'monthHours',
    key: 'monthHours',
    width: 100,
    align: 'right'
  },
  {
    title: '實際時薪',
    dataIndex: 'hourlyRate',
    key: 'hourlyRate',
    width: 100,
    align: 'right'
  }
]

// 客戶任務成本表格列定義
const clientColumns = [
  {
    title: '客戶名稱',
    dataIndex: 'clientName',
    key: 'clientName',
    width: 150,
    fixed: 'left'
  },
  {
    title: '總工時',
    dataIndex: 'totalHours',
    key: 'totalHours',
    width: 100,
    align: 'right'
  },
  {
    title: '平均時薪',
    dataIndex: 'avgHourlyRate',
    key: 'avgHourlyRate',
    width: 100,
    align: 'right'
  },
  {
    title: '總成本',
    dataIndex: 'totalCost',
    key: 'totalCost',
    width: 100,
    align: 'right'
  },
  {
    title: '利潤',
    dataIndex: 'profit',
    key: 'profit',
    width: 100,
    align: 'right'
  },
  {
    title: '利潤率',
    dataIndex: 'margin',
    key: 'margin',
    width: 100,
    align: 'right',
    customRender: ({ record }) => `${record.margin}%`
  }
]

// 格式化貨幣
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// 格式化工時
const formatHours = (value) => {
  if (value === null || value === undefined) return '0.0'
  return `${parseFloat(value).toFixed(1)} 小時`
}

// 獲取分攤方式名稱
const getAllocationMethodName = (method) => {
  const methodNames = {
    per_employee: '按員工數分攤',
    per_hour: '按工時分攤',
    per_revenue: '按收入分攤'
  }
  return methodNames[method] || method
}
</script>

<style scoped>
.allocation-result {
  width: 100%;
}

.allocation-result :deep(.ant-table-tbody > tr > td) {
  padding: 8px;
}

.allocation-result :deep(.ant-statistic-title) {
  font-size: 12px;
  color: #666;
}

.allocation-result :deep(.ant-statistic-content) {
  font-size: 16px;
}
</style>
