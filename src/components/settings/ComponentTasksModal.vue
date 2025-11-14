<template>
  <a-modal
    :open="visible"
    :title="modalTitle"
    width="800px"
    :footer="null"
    @cancel="handleClose"
  >
    <div v-if="tasks.length === 0" style="text-align: center; padding: 40px; color: #999">
      此服務組成部分使用預設任務生成
    </div>
    
    <div v-else>
      <a-list :data-source="tasks" :bordered="false">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-card :bordered="true" style="width: 100%">
              <div class="task-card">
                <div class="task-header">
                  <h4 style="margin: 0">{{ getTaskName(item) }}</h4>
                </div>
                <div class="task-details">
                  <div class="task-detail-item">
                    <span class="label">到期規則：</span>
                    <span>{{ getDueRuleText(item) }}</span>
                  </div>
                  <div class="task-detail-item">
                    <span class="label">負責人：</span>
                    <span>{{ getAssigneeName(item) || '未指派' }}</span>
                  </div>
                  <div v-if="getEstimatedHours(item)" class="task-detail-item">
                    <span class="label">預估時數：</span>
                    <span>{{ getEstimatedHours(item) }} 小時</span>
                  </div>
                  <div v-if="getNotes(item)" class="task-detail-item">
                    <span class="label">備註：</span>
                    <span>{{ getNotes(item) }}</span>
                  </div>
                </div>
              </div>
            </a-card>
          </a-list-item>
        </template>
      </a-list>
    </div>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  componentId: {
    type: [Number, String],
    default: null
  },
  componentName: {
    type: String,
    default: ''
  },
  companyName: {
    type: String,
    default: ''
  },
  tasks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close'])

// 模態框標題
const modalTitle = computed(() => {
  if (props.companyName && props.componentName) {
    return `${props.companyName} - ${props.componentName}`
  }
  return '任務配置'
})

// 處理關閉
const handleClose = () => {
  emit('close')
}

// 獲取任務名稱
const getTaskName = (task) => {
  return task.task_name || task.taskName || '—'
}

// 獲取到期規則文字
const getDueRuleText = (task) => {
  const rule = task.due_rule || task.dueRule
  const value = task.due_value || task.dueValue
  
  if (rule === 'end_of_month') {
    return '月底'
  } else if (rule === 'day_of_month') {
    return `每月 ${value} 號`
  } else if (rule === 'days_from_start') {
    return `服務開始後 ${value} 天`
  }
  return '—'
}

// 獲取負責人姓名
const getAssigneeName = (task) => {
  return task.assignee_name || task.assigneeName || null
}

// 獲取預估時數
const getEstimatedHours = (task) => {
  return task.estimated_hours || task.estimatedHours || null
}

// 獲取備註
const getNotes = (task) => {
  return task.notes || null
}
</script>

<style scoped>
.task-card {
  padding: 8px 0;
}

.task-header {
  margin-bottom: 12px;
}

.task-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-detail-item {
  font-size: 14px;
}

.task-detail-item .label {
  font-weight: 500;
  color: #666;
  margin-right: 8px;
}
</style>

