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
        <template v-if="column.key === 'service_type'">
          <a-tag :color="record.service_type === 'recurring' ? 'blue' : 'orange'">
            {{ record.service_type === 'recurring' ? '定期服務' : '一次性服務' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'execution_months'">
          <span v-if="record.service_type === 'recurring' && record.execution_months && record.execution_months.length > 0">
            {{ formatExecutionMonths(record.execution_months) }}
          </span>
          <span v-else style="color: #9ca3af">-</span>
        </template>
        <template v-if="column.key === 'use_for_auto_generate'">
          <a-tag :color="record.use_for_auto_generate ? 'green' : 'default'">
            {{ record.use_for_auto_generate ? '是' : '否' }}
          </a-tag>
        </template>
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

    <!-- 保存按鈕 -->
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 12px">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="store.loading" @click="handleSave">
        保存服務設定
      </a-button>
    </div>

    <!-- 新增服務 Modal -->
    <AddServiceModal
      v-model:visible="isModalVisible"
      @service-selected="handleServiceSelected"
    />

    <!-- 收費計劃建立提示 Modal -->
    <CreateBillingPromptModal
      v-model:visible="billingPromptVisible"
      @confirm="handleCreateBilling"
      @cancel="handleSkipBilling"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useClientAddStore } from '@/stores/clientAdd'
import { usePageAlert } from '@/composables/usePageAlert'
import AddServiceModal from '@/components/clients/AddServiceModal.vue'
import TaskConfiguration from '@/components/clients/TaskConfiguration.vue'
import CreateBillingPromptModal from '@/components/clients/CreateBillingPromptModal.vue'

const router = useRouter()
const store = useClientAddStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// Modal 顯示狀態
const isModalVisible = ref(false)
const billingPromptVisible = ref(false)

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
    title: '服務類型',
    key: 'service_type',
    width: 100
  },
  {
    title: '執行頻率',
    key: 'execution_months',
    width: 150
  },
  {
    title: '自動生成',
    key: 'use_for_auto_generate',
    width: 100
  },
  {
    title: '狀態',
    dataIndex: 'status',
    key: 'status',
    width: 100
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

// 處理保存服務設定
const handleSave = async () => {
  try {
    // 檢查客戶是否已存在
    if (!store.createdClientId) {
      showError('請先保存基本資訊，客戶必須已存在才能保存服務設定')
      return
    }
    
    // 保存服務設定
    await store.saveServices()
    
    // 檢查是否有定期服務需要建立收費計劃
    const recurringServices = store.tempServices.filter(s => s.service_type === 'recurring')
    if (recurringServices.length > 0) {
      // 顯示收費計劃建立提示 Modal
      billingPromptVisible.value = true
    } else {
      showSuccess('服務設定保存成功！')
    }
    
    // 保存成功後，可以選擇繼續編輯其他分頁或離開
  } catch (error) {
    showError(error.message || '保存失敗')
  }
}

// 處理取消
const handleCancel = () => {
  window.history.back()
}

// 格式化執行月份顯示
const formatExecutionMonths = (months) => {
  if (!months || !Array.isArray(months) || months.length === 0) {
    return '-'
  }
  if (months.length === 12) {
    return '全年'
  }
  return months.sort((a, b) => a - b).join('、') + '月'
}

// 處理建立收費計劃
const handleCreateBilling = () => {
  // 跳轉到帳務設定分頁
  router.push('/clients/add/billing')
  showSuccess('請在帳務設定分頁建立收費計劃')
}

// 處理跳過建立收費計劃
const handleSkipBilling = () => {
  showSuccess('服務設定保存成功！您可以稍後在帳務設定分頁建立收費計劃')
}
</script>

<style scoped>
.client-add-services {
  padding: 0;
}
</style>
