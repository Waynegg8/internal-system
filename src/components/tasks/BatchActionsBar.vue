<template>
  <a-alert
    v-if="selectedCount > 0"
    type="info"
    :message="`已選擇 ${selectedCount} 個任務`"
    show-icon
    closable
    style="margin-bottom: 16px"
  >
    <template #action>
      <a-space>
        <a-button 
          type="primary" 
          size="small" 
          :disabled="selectedCount === 0"
          @click="handleBatchStatus"
        >
          批量變更狀態
        </a-button>
        <a-button 
          type="primary" 
          size="small" 
          :disabled="selectedCount === 0"
          @click="handleBatchDueDate"
        >
          批量調整到期日
        </a-button>
        <a-button 
          type="primary" 
          size="small" 
          :disabled="selectedCount === 0"
          @click="handleBatchAssignee"
        >
          批量分配負責人
        </a-button>
        <a-button 
          size="small" 
          :disabled="selectedCount === 0"
          @click="handleClear"
        >
          清除選擇
        </a-button>
      </a-space>
    </template>
  </a-alert>
</template>

<script setup>
const props = defineProps({
  selectedCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['batch-status', 'batch-due-date', 'batch-assignee', 'clear'])

const handleBatchStatus = () => {
  emit('batch-status')
}

const handleBatchDueDate = () => {
  emit('batch-due-date')
}

const handleBatchAssignee = () => {
  emit('batch-assignee')
}

const handleClear = () => {
  emit('clear')
}
</script>










