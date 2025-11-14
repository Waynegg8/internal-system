<template>
  <div class="client-add-services">
    <!-- 新增服務按鈕 -->
    <div style="margin-bottom: 16px">
      <a-button type="primary" @click="isModalVisible = true">
        + 新增服務
      </a-button>
    </div>

    <!-- 服務表格 -->
    <a-table
      :dataSource="store.tempServices"
      :columns="columns"
      :pagination="false"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag color="blue">{{ record.status || 'Pending' }}</a-tag>
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" @click="handleConfigureService(record)">
              配置任務
            </a-button>
            <a-button
              type="link"
              danger
              @click="store.removeTempService(record.id)"
            >
              刪除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 任務配置表單（點擊配置任務後顯示） -->
    <a-card v-if="configuringService" style="margin-top: 24px">
      <template #title>
        <a-space>
          <span>配置任務 - {{ configuringService.name }}</span>
          <a-tag color="blue">配置中</a-tag>
        </a-space>
      </template>
      <template #extra>
        <a-button @click="handleCloseConfig">關閉</a-button>
      </template>

      <TaskConfiguration
        v-model:tasks="configuringService.tasks"
        v-model:sops="configuringService.service_sops"
        :service-id="configuringService.service_id"
        :is-new-client="true"
      />
    </a-card>

    <!-- 空狀態提示 -->
    <div v-if="store.tempServices.length === 0" style="text-align: center; padding: 40px; color: #9ca3af">
      尚未添加服務
    </div>

    <!-- 新增服務 Modal -->
    <AddServiceModal
      v-model:visible="isModalVisible"
      @service-selected="handleServiceSelected"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useClientAddStore } from '@/stores/clientAdd'
import AddServiceModal from '@/components/clients/AddServiceModal.vue'
import TaskConfiguration from '@/components/clients/TaskConfiguration.vue'

const store = useClientAddStore()

// Modal 顯示狀態
const isModalVisible = ref(false)

// 當前正在配置的服務
const configuringService = ref(null)

// 表格列定義
const columns = [
  {
    title: '服務名稱',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '狀態',
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: '操作',
    key: 'action',
    width: 200
  }
]

// 處理服務選擇事件
const handleServiceSelected = (newService) => {
  store.addTempService(newService)
  isModalVisible.value = false
}

// 處理配置服務
const handleConfigureService = (service) => {
  configuringService.value = service
  
  // 滾動到配置區域
  setTimeout(() => {
    const element = document.querySelector('.client-add-services a-card')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
}

// 關閉配置
const handleCloseConfig = () => {
  configuringService.value = null
}

// 監聽任務配置變化，同步到 store
watch(() => configuringService.value?.tasks, (newTasks) => {
  if (configuringService.value) {
    store.updateTempServiceTasks(configuringService.value.id, newTasks)
  }
}, { deep: true })

watch(() => configuringService.value?.service_sops, (newSops) => {
  if (configuringService.value) {
    store.updateTempServiceSOPs(configuringService.value.id, newSops)
  }
}, { deep: true })
</script>

<style scoped>
.client-add-services {
  padding: 0;
}
</style>
