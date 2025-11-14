<template>
  <a-spin :spinning="loading">
    <div class="employee-list">
      <template v-if="employees.length === 0">
        <a-empty description="無符合條件的員工" />
      </template>
      <template v-else>
        <div
          v-for="employee in employees"
          :key="employee.id || employee.userId || employee.user_id"
          :class="['employee-item', { active: isSelected(employee) }]"
          @click="handleSelect(employee)"
        >
          <div class="employee-name">
            <strong>{{ employee.name || employee.userName || '-' }}</strong>
          </div>
          <div class="employee-salary">
            底薪: {{ formatBaseSalary(employee) }}
          </div>
        </div>
      </template>
    </div>
  </a-spin>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  employees: {
    type: Array,
    default: () => []
  },
  selectedId: {
    type: [Number, String],
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

// 檢查是否選中
const isSelected = (employee) => {
  const employeeId = employee.id || employee.userId || employee.user_id
  return employeeId === props.selectedId
}

// 格式化底薪
const formatBaseSalary = (employee) => {
  // 從 base_salary 字段獲取底薪（以元為單位）
  const baseSalary = employee.base_salary || 0
  if (baseSalary === 0) return '-'
  return formatCurrency(baseSalary) + ' 元'
}

// 處理選擇
const handleSelect = (employee) => {
  const employeeId = employee.id || employee.userId || employee.user_id
  emit('select', employeeId)
}
</script>

<style scoped>
.employee-list {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.employee-item {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background-color 0.2s;
}

.employee-item:hover {
  background-color: #f9fafb;
}

.employee-item.active {
  background-color: #e0f2fe;
  border-left: 3px solid #0ea5e9;
}

.employee-item:last-child {
  border-bottom: none;
}

.employee-name {
  margin-bottom: 4px;
  font-size: 14px;
}

.employee-salary {
  font-size: 12px;
  color: #6b7280;
}
</style>

