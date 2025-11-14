<template>
  <a-card title="任務配置" style="margin: 16px 0">
    <div style="margin-bottom: 24px">
      <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280">
        正在配置: <strong>{{ tempService.name }}</strong>
      </h4>
    </div>

    <!-- 使用統一的任務配置組件 -->
    <TaskConfiguration
      v-model:tasks="tempService.tasks"
      v-model:sops="tempService.service_sops"
      :service-id="tempService.service_id"
      :is-new-client="true"
    />
  </a-card>
</template>

<script setup>
import { watch } from 'vue'
import { useClientAddStore } from '@/stores/clientAdd'
import TaskConfiguration from '@/components/clients/TaskConfiguration.vue'

const props = defineProps({
  tempService: {
    type: Object,
    required: true
  }
})

const store = useClientAddStore()

// 監聽任務配置變化，確保同步到 store
watch(() => props.tempService.tasks, (newTasks) => {
  store.updateTempServiceTasks(props.tempService.id, newTasks)
}, { deep: true })

watch(() => props.tempService.service_sops, (newSops) => {
  store.updateTempServiceSOPs(props.tempService.id, newSops)
}, { deep: true })
</script>

<style scoped>
</style>
