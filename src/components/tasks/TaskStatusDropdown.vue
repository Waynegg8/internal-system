<template>
  <a-dropdown :trigger="['click']">
    <a-button :type="buttonType" :size="size" style="padding: 0 12px">
      {{ statusText }}
      <DownOutlined />
    </a-button>
    <template #overlay>
      <a-menu @click="handleMenuClick">
        <a-menu-item key="pending">
          <span>待處理</span>
        </a-menu-item>
        <a-menu-item key="in_progress">
          <span>進行中</span>
        </a-menu-item>
        <a-menu-item key="completed">
          <span>已完成</span>
        </a-menu-item>
        <a-menu-item key="cancelled">
          <span>已取消</span>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup>
import { computed } from 'vue'
import { DownOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  size: {
    type: String,
    default: 'small'
  }
})

const emit = defineEmits(['status-change'])

const status = computed(() => {
  return props.task.status || props.task.task_status || 'pending'
})

const statusText = computed(() => {
  const statusMap = {
    pending: '待處理',
    in_progress: '進行中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status.value] || status.value
})

const buttonType = computed(() => {
  const typeMap = {
    pending: 'default',
    in_progress: 'primary',
    completed: 'default',
    cancelled: 'default'
  }
  return typeMap[status.value] || 'default'
})

const handleMenuClick = ({ key }) => {
  const taskId = props.task.task_id || props.task.taskId || props.task.id
  if (key !== status.value) {
    emit('status-change', taskId, key)
  }
}
</script>


