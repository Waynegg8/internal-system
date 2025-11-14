<template>
  <a-modal
    :open="visible"
    :title="modalTitle"
    width="900px"
    :footer="null"
    @cancel="handleClose"
  >
    <div v-if="tasks.length === 0" style="text-align: center; padding: 40px; color: #999">
      下個月不會生成任何任務
    </div>
    
    <div v-else>
      <div style="margin-bottom: 16px; font-size: 14px; color: #666">
        共 {{ tasks.length }} 個任務
      </div>
      
      <a-collapse v-model:activeKey="activeKeys" :bordered="false">
        <a-collapse-panel
          v-for="(group, index) in groupedTasks"
          :key="index"
          :header="`${group.clientName}（${group.tasks.length} 個任務）`"
        >
          <a-list :data-source="group.tasks" :bordered="false">
            <template #renderItem="{ item }">
              <a-list-item>
                <div class="preview-task-item">
                  <div class="task-name">{{ getTaskName(item) }}</div>
                  <div class="task-meta">
                    <span class="meta-item">
                      <span class="label">到期日期：</span>
                      <span>{{ getDueDate(item) }}</span>
                    </span>
                    <span class="meta-item">
                      <span class="label">負責人：</span>
                      <span>{{ getAssigneeName(item) || '未指派' }}</span>
                    </span>
                  </div>
                </div>
              </a-list-item>
            </template>
          </a-list>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  targetMonth: {
    type: String,
    default: ''
  },
  tasks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close'])

const activeKeys = ref([])

// 模態框標題
const modalTitle = computed(() => {
  if (props.targetMonth) {
    return `${props.targetMonth} 預計生成任務預覽`
  }
  return '預計生成任務預覽'
})

// 按客戶分組任務
const groupedTasks = computed(() => {
  const groups = {}
  
  props.tasks.forEach(task => {
    const clientId = getClientId(task)
    const clientName = getClientName(task) || '未知客戶'
    
    if (!groups[clientId]) {
      groups[clientId] = {
        clientId,
        clientName,
        tasks: []
      }
    }
    
    groups[clientId].tasks.push(task)
  })
  
  const result = Object.values(groups)
  // 自動展開所有分組
  activeKeys.value = result.map((_, index) => index)
  
  return result
})

// 監聽 visible 變化，重置 activeKeys
watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      // 延遲設置，確保 groupedTasks 已計算
      setTimeout(() => {
        activeKeys.value = groupedTasks.value.map((_, index) => index)
      }, 0)
    }
  }
)

// 處理關閉
const handleClose = () => {
  emit('close')
}

// 獲取客戶 ID（處理字段名差異）
const getClientId = (task) => {
  return task.client_id || task.clientId || 'unknown'
}

// 獲取客戶名稱
const getClientName = (task) => {
  return task.client_name || task.clientName || null
}

// 獲取任務名稱
const getTaskName = (task) => {
  return task.task_name || task.taskName || '—'
}

// 獲取到期日期
const getDueDate = (task) => {
  const dueDate = task.due_date || task.dueDate
  if (dueDate) {
    return dueDate
  }
  return '—'
}

// 獲取負責人姓名
const getAssigneeName = (task) => {
  return task.assignee_name || task.assigneeName || null
}
</script>

<style scoped>
.preview-task-item {
  width: 100%;
  padding: 8px 0;
}

.task-name {
  font-weight: 500;
  margin-bottom: 8px;
}

.task-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
}

.meta-item .label {
  font-weight: 500;
  margin-right: 4px;
}
</style>

