<template>
  <div class="settings-services">

    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 8px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage || error"
      type="error"
      :message="errorMessage || error"
      show-icon
      closable
      @close="errorMessage = ''; handleCloseError()"
      style="margin-bottom: 8px"
    />
    
    <!-- 操作欄 -->
    <div class="action-bar" style="margin-bottom: 12px">
      <a-button type="primary" @click="handleAddService">
        <template #icon>
          <plus-outlined />
        </template>
        新增服務項目
      </a-button>
    </div>

    <!-- 服務表單（條件顯示） -->
    <ServiceForm
      v-if="formVisible"
      ref="serviceFormRef"
      :editing-service="editingService"
      :service-sops="serviceSOPs"
      :loading="store.loading"
      @submit="handleFormSubmit"
      @cancel="handleFormCancel"
    />

    <!-- 服務列表表格 -->
    <a-card>
      <ServicesTable
        :services="store.services"
        :service-sops="serviceSOPs"
        :loading="store.loading"
        @edit="handleEditService"
        @delete="handleDeleteService"
        @refresh-items="loadData"
      />
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import ServiceForm from '@/components/settings/ServiceForm.vue'
import ServicesTable from '@/components/settings/ServicesTable.vue'

const store = useSettingsStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { error, serviceSOPs } = storeToRefs(store)

// 本地狀態
const formVisible = ref(false)
const editingService = ref(null)
const serviceFormRef = ref(null)

// 載入數據
const loadData = async () => {
  try {
    // 並行載入服務列表和服務層級 SOP 列表
    await Promise.all([
      store.getServices(),
      store.getServiceSOPs()
    ])
  } catch (err) {
    console.error('載入數據失敗:', err)
    // 錯誤已由 store 處理
  }
}

// 處理新增服務
const handleAddService = () => {
  editingService.value = null
  formVisible.value = true
  // 等待下一個 tick 確保表單已渲染
  setTimeout(() => {
    serviceFormRef.value?.resetForm()
  }, 0)
}

// 處理編輯服務
const handleEditService = (service) => {
  editingService.value = service
  formVisible.value = true
}

// 處理刪除服務
const handleDeleteService = async (serviceId) => {
  try {
    const response = await store.deleteService(serviceId)
    if (response.ok) {
      showSuccess('刪除成功')
    } else {
      showError(response.message || '刪除失敗')
    }
  } catch (err) {
    console.error('刪除服務失敗:', err)
    showError(err.message || '刪除失敗')
  }
}

// 處理表單提交
const handleFormSubmit = async (data, isEdit) => {
  try {
    let response
    if (isEdit) {
      // 編輯模式
      response = await store.updateService(editingService.value.service_id, data)
      if (response.ok) {
        showSuccess('更新成功')
        formVisible.value = false
        editingService.value = null
      } else {
        showError(response.message || '更新失敗')
      }
    } else {
      // 新增模式
      response = await store.createService(data)
      if (response.ok) {
        showSuccess('新增成功')
        formVisible.value = false
        editingService.value = null
      } else {
        showError(response.message || '新增失敗')
      }
    }
  } catch (err) {
    console.error('提交表單失敗:', err)
    showError(err.message || '操作失敗')
  }
}

// 處理表單取消
const handleFormCancel = () => {
  formVisible.value = false
  editingService.value = null
}

// 處理關閉錯誤
const handleCloseError = () => {
  store.clearError()
}

// 初始化
onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.settings-services {
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
</style>
