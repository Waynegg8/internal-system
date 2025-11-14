<template>
  <div class="settings-automation">

    <!-- 說明提示 -->
    <a-alert
      type="info"
      message="自動化規則說明"
      description="此頁顯示所有已設定自動生成任務的組件。您可以檢視任務配置、瀏覽任務列表，或前往客戶詳情進行設定。"
      show-icon
      closable
      style="margin-bottom: 12px"
    />

    <!-- 錯誤提示 -->
    <a-alert
      v-if="error"
      type="error"
      :message="error"
      show-icon
      closable
      @close="handleCloseError"
      style="margin-bottom: 12px"
    />

    <!-- 操作欄 -->
    <div class="action-bar" style="margin-bottom: 12px">
      <a-space>
        <a-input
          v-model:value="searchQuery"
          placeholder="搜尋客戶名稱"
          style="width: 300px"
          allow-clear
          @change="handleSearch"
        >
          <template #prefix>
            <search-outlined />
          </template>
        </a-input>
        <a-button @click="handleRefresh">
          <template #icon>
            <reload-outlined />
          </template>
          刷新列表
        </a-button>
        <a-button type="primary" @click="handlePreviewNextMonth">
          <template #icon>
            <eye-outlined />
          </template>
          預覽下月任務
        </a-button>
      </a-space>
    </div>

    <!-- 組件列表表格 -->
    <a-card>
      <AutomationOverviewTable
        :components="filteredComponents"
        :loading="store.loading"
        @view-tasks="handleViewTasks"
      />
    </a-card>

    <!-- 底部提示說明 -->
    <div class="footer-tip" style="margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px">
      <span style="color: #666">查看所有客戶的所有組件任務總覽：</span>
      <router-link to="/tasks/overview" style="margin-left: 8px">
        <a-button type="link" size="small">前往任務總覽</a-button>
      </router-link>
    </div>

    <!-- 任務配置彈窗 -->
    <ComponentTasksModal
      :visible="componentTasksModalVisible"
      :component-id="selectedComponent?.componentId"
      :component-name="selectedComponent?.componentName"
      :company-name="selectedComponent?.companyName"
      :tasks="componentTasks"
      @close="handleCloseComponentTasksModal"
    />

    <!-- 預覽任務彈窗 -->
    <PreviewTasksModal
      :visible="previewTasksModalVisible"
      :target-month="previewTargetMonth"
      :tasks="store.previewTasks"
      @close="handleClosePreviewTasksModal"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import AutomationOverviewTable from '@/components/settings/AutomationOverviewTable.vue'
import ComponentTasksModal from '@/components/settings/ComponentTasksModal.vue'
import PreviewTasksModal from '@/components/settings/PreviewTasksModal.vue'
import dayjs from 'dayjs'

const store = useSettingsStore()

// 從 store 獲取響應式狀態
const { error, automationComponents } = storeToRefs(store)

// 本地狀態
const searchQuery = ref('')
const componentTasksModalVisible = ref(false)
const previewTasksModalVisible = ref(false)
const selectedComponent = ref(null)
const componentTasks = ref([])
const previewTargetMonth = ref('')

// 過濾後組件列表
const filteredComponents = computed(() => {
  if (!searchQuery.value.trim()) {
    return automationComponents.value
  }
  
  const query = searchQuery.value.trim().toLowerCase()
  return automationComponents.value.filter(component => {
    const clientName = (component.client_name || component.clientName || '').toLowerCase()
    return clientName.includes(query)
  })
})

// 載入數據
const loadData = async () => {
  try {
    await store.getAutoGenerateComponents()
  } catch (err) {
    console.error('載入數據失敗:', err)
    // 錯誤已由 store 處理
  }
}

// 處理搜尋
const handleSearch = () => {
  // 搜尋邏輯已通過 computed 實現
}

// 處理刷新列表
const handleRefresh = async () => {
  await loadData()
}

// 處理檢視任務配置
const handleViewTasks = async (componentId, componentName, companyName) => {
  selectedComponent.value = {
    componentId,
    componentName,
    companyName
  }
  
  try {
    const response = await store.getComponentTasks(componentId)
    if (response.ok && response.tasks) {
      componentTasks.value = response.tasks
      componentTasksModalVisible.value = true
    } else {
      // 如果獲取失敗，顯示空列表
      componentTasks.value = []
      componentTasksModalVisible.value = true
    }
  } catch (err) {
    console.error('獲取任務配置失敗:', err)
    componentTasks.value = []
    componentTasksModalVisible.value = true
  }
}

// 處理預覽下月任務
const handlePreviewNextMonth = async () => {
  // 計算下個月
  const now = dayjs()
  const nextMonth = now.add(1, 'month')
  const targetMonth = nextMonth.format('YYYY-MM')
  previewTargetMonth.value = targetMonth
  
  try {
    await store.previewNextMonthTasks(targetMonth)
    previewTasksModalVisible.value = true
  } catch (err) {
    console.error('預覽任務失敗:', err)
    // 錯誤已由 store 處理
  }
}

// 處理關閉任務配置彈窗
const handleCloseComponentTasksModal = () => {
  componentTasksModalVisible.value = false
  selectedComponent.value = null
  componentTasks.value = []
}

// 處理關閉預覽任務彈窗
const handleClosePreviewTasksModal = () => {
  previewTasksModalVisible.value = false
  previewTargetMonth.value = ''
}

// 清除錯誤
const handleCloseError = () => {
  store.clearError()
}

// 載入
onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.settings-automation {
  padding: 12px 0;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.action-bar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.footer-tip {
  display: flex;
  align-items: center;
}
</style>

