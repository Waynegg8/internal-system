<template>
  <a-card
    size="small"
    title="員工實際時薪概覽"
    :head-style="resolvedHeadStyle"
    :body-style="resolvedBodyStyle"
    class="employee-hourly-summary-card"
  >
    <a-table
      :columns="columns"
      :data-source="employees"
      :loading="loading"
      :row-key="getRowKey"
      :pagination="false"
      size="small"
      class="employee-hourly-summary-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          {{ getName(record) }}
        </template>
        <template v-else-if="column.key === 'laborCost'">
          <span class="number-cell bold primary">
            {{ formatCurrencySafe(getLaborCost(record)) }}
          </span>
        </template>
        <template v-else-if="column.key === 'overheadAllocation'">
          <span class="number-cell">
            {{ formatCurrencySafe(getOverheadAllocation(record)) }}
          </span>
        </template>
        <template v-else-if="column.key === 'totalCost'">
          <span class="number-cell bold success">
            {{ formatCurrencySafe(getTotalCost(record)) }}
          </span>
        </template>
        <template v-else-if="column.key === 'actualHourlyRate'">
          <span class="number-cell bold info">
            {{ formatHourlyRate(getActualHourlyRate(record)) }}
          </span>
        </template>
      </template>

      <template #expandedRowRender="{ record }">
        <div class="employee-hourly-expanded">
          <a-descriptions :column="2" size="small" bordered class="employee-hourly-descriptions">
            <a-descriptions-item label="底薪">
              {{ formatCurrencySafe(getBaseSalary(record)) }}
            </a-descriptions-item>
            <a-descriptions-item label="津貼 / 獎金">
              {{ formatCurrencySafe(getSalaryItems(record)) }}
            </a-descriptions-item>
            <a-descriptions-item label="補休轉加班費">
              {{ formatCurrencySafe(getExpiredCompPay(record)) }}
            </a-descriptions-item>
            <a-descriptions-item label="請假扣款">
              {{ formatCurrencySigned(getLeaveDeduction(record) * -1) }}
            </a-descriptions-item>
            <a-descriptions-item label="薪資成本（應發）" :span="2">
              {{ formatCurrencySafe(getLaborCost(record)) }}
            </a-descriptions-item>
            <a-descriptions-item label="分攤管理費" :span="2">
              {{ formatCurrencySafe(getOverheadAllocation(record)) }}
            </a-descriptions-item>
            <a-descriptions-item label="本月總工時">
              {{ formatHours(getMonthHours(record)) }}
            </a-descriptions-item>
            <a-descriptions-item label="未使用補休">
              {{ formatHours(getUnusedCompHours(record)) }}
            </a-descriptions-item>
          </a-descriptions>
          <div class="employee-hourly-formula">
            實際時薪 = 本月總成本 {{ formatCurrencySafe(getTotalCost(record)) }}
            ÷ 本月工時 {{ formatHours(getMonthHours(record)) }} =
            <strong>{{ formatHourlyRate(getActualHourlyRate(record)) }}</strong>
          </div>
        </div>
      </template>
    </a-table>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  employees: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  headStyle: {
    type: Object,
    default: null
  },
  bodyStyle: {
    type: Object,
    default: null
  }
})

const resolvedHeadStyle = computed(() => props.headStyle || {
  padding: '8px 16px',
  minHeight: '44px',
  fontSize: '14px'
})

const resolvedBodyStyle = computed(() => props.bodyStyle || {
  padding: '12px 16px'
})

const columns = [
  {
    title: '員工',
    key: 'name',
    dataIndex: 'name',
    width: 140,
    ellipsis: {
      showTitle: true
    }
  },
  {
    title: '應發薪資（薪資成本）',
    key: 'laborCost',
    width: 160,
    align: 'right'
  },
  {
    title: '管理費分攤',
    key: 'overheadAllocation',
    width: 140,
    align: 'right'
  },
  {
    title: '本月總成本',
    key: 'totalCost',
    width: 140,
    align: 'right'
  },
  {
    title: '實際時薪',
    key: 'actualHourlyRate',
    width: 140,
    align: 'right'
  }
]

const normalizeNumber = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const findNumber = (record, keys, fallback = null) => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      const normalized = normalizeNumber(record[key]);
      if (normalized !== null) {
        return normalized;
      }
    }
  }
  return fallback;
};

const intlCurrency = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const formatCurrencyValue = (num) => intlCurrency.format(num);

const isZero = (num) => num === 0 || Math.abs(num) < 1e-6;

const formatCurrencySafe = (value) => {
  const num = normalizeNumber(value);
  if (num === null || isZero(num)) {
    return '-';
  }
  return formatCurrencyValue(num);
};

const formatCurrencySigned = (value) => {
  const num = normalizeNumber(value);
  if (num === null || isZero(num)) {
    return '-';
  }
  const currency = formatCurrencyValue(Math.abs(num));
  return num < 0 ? `-${currency}` : currency;
};

const formatHourlyRate = (value) => {
  const num = normalizeNumber(value);
  if (num === null || num <= 0) {
    return '-';
  }
  return `${formatCurrencyValue(num)} / 時`;
};

const formatHours = (value) => {
  const num = normalizeNumber(value);
  if (num === null || isZero(num)) {
    return '-';
  }
  return `${num.toFixed(1)} 小時`;
};

const computeActualHourlyRate = (record) => {
  const explicitRate = findNumber(record, ['actualHourlyRate', 'actual_hourly_rate']);
  if (explicitRate !== null) {
    return explicitRate;
  }
  const totalCost = getTotalCost(record);
  const hours = getMonthHours(record);
  if (hours > 0) {
    return Math.round(totalCost / hours);
  }
  return 0;
};

const getRowKey = (record) => {
  return (
    record.userId ||
    record.user_id ||
    record.employeeId ||
    record.employee_id ||
    record.id ||
    record.name
  );
};

const getName = (record) =>
  record.name ||
  record.userName ||
  record.user_name ||
  record.employeeName ||
  record.employee_name ||
  '—';

const getLaborCost = (record) =>
  findNumber(record, ['laborCost', 'labor_cost'], 0) || 0;

const getOverheadAllocation = (record) =>
  findNumber(record, ['overheadAllocation', 'overhead_allocation'], 0) || 0;

const getTotalCost = (record) =>
  findNumber(record, ['totalCost', 'total_cost'], 0) || 0;

const getActualHourlyRate = (record) => computeActualHourlyRate(record);

const getBaseSalary = (record) =>
  findNumber(record, ['baseSalary', 'base_salary'], null);

const getSalaryItems = (record) =>
  findNumber(record, ['salaryItemsAmount', 'salary_items_amount'], null);

const getExpiredCompPay = (record) =>
  findNumber(record, ['expiredCompPay', 'expired_comp_pay'], null);

const getLeaveDeduction = (record) =>
  findNumber(record, ['leaveDeduction', 'leave_deduction'], null);

const getMonthHours = (record) =>
  findNumber(record, ['monthHours', 'month_hours'], 0) || 0;

const getUnusedCompHours = (record) =>
  findNumber(record, ['unusedCompHours', 'unused_comp_hours'], 0) || 0;
</script>

<style scoped>
.employee-hourly-summary-card {
  width: 100%;
}

.employee-hourly-summary-table {
  width: 100%;
}

.number-cell {
  display: block;
  text-align: right;
}

.number-cell.bold {
  font-weight: 600;
}

.number-cell.primary {
  color: #595959;
}

.number-cell.success {
  color: #52c41a;
}

.number-cell.info {
  color: #1890ff;
}

.employee-hourly-expanded {
  padding: 8px 0;
}

.employee-hourly-descriptions {
  background: #fafafa;
}

.employee-hourly-formula {
  margin-top: 8px;
  font-size: 13px;
  color: #595959;
}

.employee-hourly-formula strong {
  color: #1890ff;
  font-weight: 600;
}
</style>

