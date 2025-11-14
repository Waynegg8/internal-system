<template>
  <a-card>
    <template #title>
      <div class="card-title-row">
        <span>各員工任務狀態 <span class="subtitle">(已完成僅顯示選定月份)</span></span>
        <a-select
          v-model:value="selectedMonth"
          style="width: 150px;"
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
      </div>
    </template>
    <a-list
      :data-source="employeeTasks"
      :loading="false"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <router-link
            :to="`/tasks?assignee=${item.userId}`"
            class="employee-task-link"
          >
            <div class="employee-task-item">
              <span class="employee-name">{{ item.name || '未命名' }}</span>
              <div class="task-badges">
                <template v-if="overdueTotal(item) > 0">
                  <a-tag color="red" class="task-badge">
                    逾期 {{ overdueTotal(item) }}{{ formatMonthDetails(item.overdue) }}
                  </a-tag>
                </template>
                <template v-if="inProgressTotal(item) > 0">
                  <a-tag color="blue" class="task-badge">
                    進行中 {{ inProgressTotal(item) }}{{ formatMonthDetails(item.inProgress) }}
                  </a-tag>
                </template>
                <template v-if="item.completed > 0">
                  <a-tag color="green" class="task-badge">
                    已完成 {{ item.completed }}
                  </a-tag>
                </template>
                <template v-if="!hasTasks(item)">
                  <span class="no-tasks">無任務</span>
                </template>
              </div>
            </div>
          </router-link>
        </a-list-item>
      </template>
      <template #empty>
        <div style="padding: 8px 0; text-align: center; color: #999; font-size: 12px;">尚無任務</div>
      </template>
    </a-list>
  </a-card>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { formatYm, getCurrentYm } from '@/utils/formatters'

const props = defineProps({
  employeeTasks: {
    type: Array,
    default: () => []
  },
  currentYm: {
    type: String,
    default: () => getCurrentYm()
  }
})

const emit = defineEmits(['month-change'])

const selectedMonth = ref(props.currentYm)

watch(() => props.currentYm, (newYm) => {
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

const overdueTotal = (item) => {
  if (!item.overdue) return 0
  if (typeof item.overdue === 'number') {
    return item.overdue
  }
  return Object.values(item.overdue).reduce((sum, n) => sum + (n || 0), 0)
}

const inProgressTotal = (item) => {
  if (!item.inProgress) return 0
  if (typeof item.inProgress === 'number') {
    return item.inProgress
  }
  return Object.values(item.inProgress).reduce((sum, n) => sum + (n || 0), 0)
}

const hasTasks = (item) => {
  return overdueTotal(item) > 0 || inProgressTotal(item) > 0 || (item.completed || 0) > 0
}

const formatMonthDetails = (monthObj) => {
  if (!monthObj || typeof monthObj !== 'object' || Object.keys(monthObj).length === 0) {
    return ''
  }
  
  // 計算總月份數
  const monthCount = Object.keys(monthObj).length
  
  // 如果只有一個月份，不顯示詳細資訊（因為前面已經有總數了）
  if (monthCount === 1) {
    return ''
  }
  
  // 如果有多個月份，顯示月份分布
  const details = Object.entries(monthObj)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, count]) => {
      const parts = month.split('-')
      if (parts.length === 2) {
        const m = parseInt(parts[1])
        if (!isNaN(m)) {
          return `${m}月${count}件`
        }
      }
      return null
    })
    .filter(Boolean)
    .join('、')
  
  return details ? ` (${details})` : ''
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

.subtitle {
  font-size: 12px;
  color: #6b7280;
  font-weight: 400;
}

.employee-task-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  text-decoration: none;
  color: inherit;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}

.employee-task-link:hover {
  background: #f9fafb;
  color: inherit;
}

.employee-task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
  gap: 6px;
}

.employee-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.task-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.task-badge {
  font-size: 12px;
  font-weight: 500;
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

:deep(.ant-empty) {
  padding: 8px 0;
  margin: 0;
}

:deep(.ant-list-item) {
  padding: 0;
}

.no-tasks {
  color: #9ca3af;
}
</style>

