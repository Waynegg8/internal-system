<template>
  <div class="page-container">

    <a-space direction="vertical" :size="24" style="width: 100%">
      <a-card :bordered="false">
      
      <!-- 頁面提示 -->
      <PageAlerts
        v-model:success="successMessage"
        v-model:error="errorMessage"
        v-model:warning="warningMessage"
      />
      <!-- 額外的錯誤提示（來自 store） -->
      <a-alert
        v-if="error && !errorMessage"
        type="error"
        :message="error"
        show-icon
        closable
        @close="handleCloseError()"
        style="margin-bottom: 16px"
      />
      
      <!-- 搜索欄 -->
      <ClientSearchBar
        v-model:search-keyword="searchKeyword"
        v-model:selected-tag-id="selectedTagId"
        :tags="tags"
        :selected-client-ids="store.selectedClientIds"
        @search="handleSearch"
        @tag-filter-change="handleTagFilterChange"
        @batch-assign="handleBatchAssign"
        @quick-migrate="handleQuickMigrate"
        @add-client="handleAddClient"
        @cancel-select="handleCancelSelect"
      />
      
      <!-- 客戶列表表格 -->
      <ClientListTable
        :clients="store.clients"
        :loading="store.loading"
        :pagination="store.pagination"
        :selected-client-ids="store.selectedClientIds"
        @selection-change="handleSelectionChange"
        @page-change="handlePageChange"
        @view-client="handleViewClient"
        @delete-client="handleDeleteClient"
      />
      </a-card>
    </a-space>
    
    <!-- 批量分配彈窗 -->
    <BatchAssignModal
      v-model:visible="batchAssignModalVisible"
      :selected-clients="selectedClients"
      @success="handleBatchAssignSuccess"
    />
    
    <!-- 快速移轉彈窗 -->
    <QuickMigrateModal
      v-model:visible="quickMigrateModalVisible"
      :users="users"
      :tags="tags"
      @success="handleQuickMigrateSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { PlusOutlined } from '@ant-design/icons-vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useClientStore } from '@/stores/clients'
import { fetchAllTags } from '@/api/tags'
import { fetchAllUsers } from '@/api/users'
import { getId, getField } from '@/utils/fieldHelper'
import PageAlerts from '@/components/shared/PageAlerts.vue'
import ClientSearchBar from '@/components/clients/ClientSearchBar.vue'
import ClientListTable from '@/components/clients/ClientListTable.vue'
import BatchAssignModal from '@/components/clients/BatchAssignModal.vue'
import QuickMigrateModal from '@/components/clients/QuickMigrateModal.vue'

const router = useRouter()
const store = useClientStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 從 store 獲取響應式狀態
const { error } = storeToRefs(store)

// 本地狀態
const searchKeyword = ref('')
const selectedTagId = ref(null)
const tags = ref([])
const users = ref([])
const batchAssignModalVisible = ref(false)
const quickMigrateModalVisible = ref(false)

// 載入標籤列表
const loadTags = async () => {
  try {
    const response = await fetchAllTags()
    if (response.data && Array.isArray(response.data)) {
      tags.value = response.data
    }
  } catch (err) {
    console.error('載入標籤列表失敗:', err)
  }
}

// 載入用戶列表
const loadUsers = async () => {
  try {
    const response = await fetchAllUsers()
    if (response.data && Array.isArray(response.data)) {
      users.value = response.data
    }
  } catch (err) {
    console.error('載入用戶列表失敗:', err)
  }
}

// 載入客戶列表
const loadClients = async () => {
  try {
    await store.fetchClients()
  } catch (err) {
    console.error('[ClientsList] 載入客戶列表失敗:', err)
    showError('載入客戶列表失敗：' + (err.message || '未知錯誤'))
  }
}

// 處理搜索
const handleSearch = (keyword) => {
  searchKeyword.value = keyword
  store.setFilters({
    q: keyword,
    tag_id: selectedTagId.value
  })
  store.setPagination({ current: 1 })
  loadClients()
}

// 處理標籤篩選變化
const handleTagFilterChange = (tagId) => {
  selectedTagId.value = tagId
  store.setFilters({
    q: searchKeyword.value,
    tag_id: tagId
  })
  store.setPagination({ current: 1 })
  loadClients()
}

// 處理選擇變化
const handleSelectionChange = (selectedIds) => {
  store.setSelectedClientIds(selectedIds)
}

// 處理分頁變化
const handlePageChange = (page, pageSize) => {
  store.setPagination({ current: page, pageSize })
  loadClients()
}

// 處理查看客戶
const handleViewClient = (clientId) => {
  router.push(`/clients/${clientId}`)
}

// 處理刪除客戶
const handleDeleteClient = async (clientId) => {
  try {
    await store.deleteClient(clientId)
    showSuccess('已刪除')
    
    // 如果當前頁沒有數據，回到上一頁
    if (store.clients.length === 0 && store.pagination.current > 1) {
      const newPage = store.pagination.current - 1
      store.setPagination({ current: newPage })
      await loadClients()
    } else {
      // 刷新當前頁
      await loadClients()
    }
  } catch (err) {
    showError(err.message || '刪除失敗，請稍後再試')
  }
}

// 計算已選擇的客戶對象
const selectedClients = computed(() => {
  const selectedIds = store.selectedClientIds
  if (!selectedIds || selectedIds.length === 0) {
    return []
  }
  
  return store.clients
    .filter(client => {
      const clientId = getId(client, 'clientId', 'client_id', 'id')
      return clientId && selectedIds.includes(clientId)
    })
    .map(client => ({
      clientId: getId(client, 'clientId', 'client_id', 'id'),
      companyName: getField(client, 'companyName', 'company_name', ''),
      assigneeName: getField(client, 'assigneeName', 'assignee_name', '未分配')
    }))
})

// 處理批量分配
const handleBatchAssign = () => {
  if (store.selectedClientIds.length === 0) {
    showWarning('請先選擇要分配的客戶')
    return
  }
  batchAssignModalVisible.value = true
}

// 處理批量分配成功
const handleBatchAssignSuccess = async () => {
  // 清除選中的客戶
  store.clearSelectedClientIds()
  
  // 刷新客戶列表
  await loadClients()
}

// 處理快速移轉
const handleQuickMigrate = () => {
  quickMigrateModalVisible.value = true
}

// 處理快速移轉成功
const handleQuickMigrateSuccess = async () => {
  // 刷新客戶列表
  await loadClients()
}

// 處理新增客戶
const handleAddClient = () => {
  router.push('/clients/add')
}

// 處理取消選擇
const handleCancelSelect = () => {
  store.clearSelectedClientIds()
}

// 處理關閉錯誤提示
const handleCloseError = () => {
  store.error = null
}

// 生命週期
onMounted(async () => {
  await Promise.all([
    loadTags(),
    loadUsers()
  ])
  
  // 首次載入時繞過緩存，確保獲取最新數據
  try {
    await store.fetchClients({ no_cache: '1' })
  } catch (err) {
    console.error('[ClientsList] 首次載入失敗:', err)
    showError('載入客戶列表失敗：' + (err.message || '未知錯誤'))
  }
})
</script>

<style scoped>
.page-container {
  padding: 24px;
  background-color: var(--color-bg-page);
  min-height: calc(100vh - 64px);
}
</style>

