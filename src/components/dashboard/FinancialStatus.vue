<template>
  <a-card>
    <template #title>
      <div class="card-title-row">
        <span>財務狀況</span>
        <div class="title-controls">
          <a-select
            v-if="financeMode === 'month'"
            v-model:value="selectedMonth"
            style="width: 150px; margin-right: 8px;"
            @change="handleMonthChange"
          >
            <a-select-option
              v-for="option in monthOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
          <a-radio-group
            v-model:value="localMode"
            @change="handleModeChange"
          >
            <a-radio-button value="month">月度</a-radio-button>
            <a-radio-button value="ytd">本年累計</a-radio-button>
          </a-radio-group>
        </div>
      </div>
    </template>
    <div class="financial-content">
      <!-- 帳面數據 -->
      <div class="financial-section">
        <a-row :gutter="[8, 8]">
          <a-col :xs="12" :sm="12" :md="12" :lg="12">
            <div class="stat-card">
              <div class="stat-label">營收</div>
              <div class="stat-value">{{ formattedRevenue }}</div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="12" :md="12" :lg="12">
            <div class="stat-card">
              <div class="stat-label">成本</div>
              <div class="stat-value">{{ formattedCost }}</div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="12" :md="12" :lg="12">
            <div class="stat-card profit">
              <div class="stat-label">毛利</div>
              <div class="stat-value profit-value">{{ formattedProfit }}</div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="12" :md="12" :lg="12">
            <div class="stat-card profit">
              <div class="stat-label">毛利率</div>
              <div class="stat-value profit-value">{{ formattedMargin }}</div>
            </div>
          </a-col>
        </a-row>
      </div>
      
      <!-- 現金流數據 -->
      <div class="financial-section">
        <a-row :gutter="[8, 8]">
          <a-col :xs="12" :sm="12" :md="12" :lg="12">
            <div class="stat-card receivable">
              <div class="stat-label">應收</div>
              <div class="stat-value receivable-value">{{ formattedAr }}</div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="12" :md="12" :lg="12">
            <div class="stat-card paid">
              <div class="stat-label">收款</div>
              <div class="stat-value paid-value">{{ formattedPaid }}</div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="12" :md="12" :lg="12">
            <div class="stat-card overdue">
              <div class="stat-label">逾期</div>
              <div class="stat-value overdue-value">{{ formattedOverdue }}</div>
            </div>
          </a-col>
          <a-col :xs="12" :sm="12" :md="12" :lg="12">
            <div class="stat-card">
              <div class="stat-label">收款率</div>
              <div class="stat-value">{{ formattedCollectionRate }}</div>
            </div>
          </a-col>
        </a-row>
      </div>
    </div>
  </a-card>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { fmtTwd, fmtPct } from '@/utils/formatters'
import { formatYm, getCurrentYm } from '@/utils/formatters'

const props = defineProps({
  financialStatus: {
    type: Object,
    default: () => ({ month: {}, ytd: {} })
  },
  financeMode: {
    type: String,
    default: 'month'
  },
  financeYm: {
    type: String,
    default: () => getCurrentYm()
  }
})

const emit = defineEmits(['mode-change', 'month-change'])

const localMode = ref(props.financeMode)
const selectedMonth = ref(props.financeYm)

watch(() => props.financeMode, (newMode) => {
  localMode.value = newMode
})

watch(() => props.financeYm, (newYm) => {
  selectedMonth.value = newYm
})

// 生成最近12个月的选项
const monthOptions = computed(() => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = formatYm(ym)
    options.push({ value: ym, label })
  }
  return options
})

// 获取当前财务数据
const currentFinData = computed(() => {
  const emptyData = {
    period: '',
    revenue: 0,
    cost: 0,
    profit: 0,
    margin: 0,
    ar: 0,
    paid: 0,
    overdue: 0,
    collectionRate: 0
  }
  
  if (localMode.value === 'ytd') {
    return props.financialStatus?.ytd || emptyData
  }
  return props.financialStatus?.month || emptyData
})

const formattedRevenue = computed(() => {
  return fmtTwd(currentFinData.value.revenue || 0)
})

const formattedCost = computed(() => {
  return fmtTwd(currentFinData.value.cost || 0)
})

const formattedProfit = computed(() => {
  return fmtTwd(currentFinData.value.profit || 0)
})

const formattedMargin = computed(() => {
  return fmtPct(currentFinData.value.margin || 0)
})

const formattedAr = computed(() => {
  return fmtTwd(currentFinData.value.ar || 0)
})

const formattedPaid = computed(() => {
  return fmtTwd(currentFinData.value.paid || 0)
})

const formattedOverdue = computed(() => {
  return fmtTwd(currentFinData.value.overdue || 0)
})

const formattedCollectionRate = computed(() => {
  return fmtPct(currentFinData.value.collectionRate || 0)
})

const handleModeChange = (e) => {
  localMode.value = e.target.value
  emit('mode-change', e.target.value)
}

const handleMonthChange = (value) => {
  selectedMonth.value = value
  emit('month-change', value)
}
</script>

<style scoped>
.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.title-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.ant-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.ant-card-head) {
  padding: 0 12px;
  min-height: 40px;
  flex-shrink: 0;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.ant-card-head-title) {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

:deep(.ant-card-body) {
  padding: 12px;
}

.financial-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.financial-section {
  width: 100%;
}

.stat-card {
  padding: 8px;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-card.profit {
  background: #f0fdf4;
}

.stat-card.receivable {
  background: #fefce8;
}

.stat-card.paid {
  background: #dbeafe;
}

.stat-card.overdue {
  background: #fee2e2;
}

.stat-label {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 2px;
}

.stat-card.profit .stat-label {
  color: #059669;
}

.stat-card.receivable .stat-label {
  color: #ca8a04;
}

.stat-card.paid .stat-label {
  color: #2563eb;
}

.stat-card.overdue .stat-label {
  color: #dc2626;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.profit-value {
  color: #059669;
}

.receivable-value {
  color: #ca8a04;
}

.paid-value {
  color: #2563eb;
}

.overdue-value {
  color: #dc2626;
}
</style>



