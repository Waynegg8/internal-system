<template>
  <div class="settings-holidays">

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
      <a-space>
        <a-button type="primary" @click="handleAddHoliday">
          <template #icon>
            <plus-outlined />
          </template>
          新增假日
        </a-button>
        <a-button @click="handleBatchUpload">
          <template #icon>
            <upload-outlined />
          </template>
          批量上傳
        </a-button>
        <a-button @click="handleDownloadSample">
          <template #icon>
            <download-outlined />
          </template>
          下載範本
        </a-button>
      </a-space>
    </div>

    <!-- 假日表單（條件顯示） -->
    <HolidayForm
      v-if="formVisible"
      ref="holidayFormRef"
      :editing-holiday="editingHoliday"
      :loading="store.loading"
      @submit="handleFormSubmit"
      @cancel="handleFormCancel"
    />

    <!-- 批量上傳表單（條件顯示） -->
    <BatchUploadForm
      v-if="batchUploadVisible"
      ref="batchUploadFormRef"
      :loading="store.loading"
      @submit="handleBatchUploadSubmit"
      @cancel="handleBatchUploadCancel"
    />

    <!-- 假日列表表格 -->
    <a-card>
      <HolidaysTable
        :holidays="store.holidays"
        :loading="store.loading"
        @edit="handleEditHoliday"
        @delete="handleDeleteHoliday"
      />
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined
} from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'
import { useSettingsStore } from '@/stores/settings'
import HolidayForm from '@/components/settings/HolidayForm.vue'
import HolidaysTable from '@/components/settings/HolidaysTable.vue'
import BatchUploadForm from '@/components/settings/BatchUploadForm.vue'

const store = useSettingsStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { error } = storeToRefs(store)

// 本地狀態
const formVisible = ref(false)
const batchUploadVisible = ref(false)
const editingHoliday = ref(null)
const holidayFormRef = ref(null)
const batchUploadFormRef = ref(null)

// 載入數據
const loadData = async () => {
  try {
    await store.getHolidays()
  } catch (err) {
    console.error('載入數據失敗:', err)
    // 錯誤已由 store 處理
  }
}

// 處理新增假日
const handleAddHoliday = () => {
  editingHoliday.value = null
  formVisible.value = true
  batchUploadVisible.value = false
  // 等待下一個 tick 確保表單已渲染
  setTimeout(() => {
    holidayFormRef.value?.resetForm()
  }, 0)
}

// 處理編輯假日
const handleEditHoliday = (holiday) => {
  editingHoliday.value = holiday
  formVisible.value = true
  batchUploadVisible.value = false
}

// 處理刪除假日
const handleDeleteHoliday = async (date) => {
  try {
    const response = await store.deleteHoliday(date)
    if (response.ok) {
      showSuccess('刪除成功')
    } else {
      showError(response.message || '刪除失敗')
    }
  } catch (err) {
    console.error('刪除假日失敗:', err)
    showError(err.message || '刪除失敗')
  }
}

// 處理表單提交
const handleFormSubmit = async (data, isEdit) => {
  try {
    let response
    if (isEdit) {
      // 編輯模式
      response = await store.updateHoliday(editingHoliday.value.holiday_date, data)
      if (response.ok) {
        showSuccess('更新成功')
        formVisible.value = false
        editingHoliday.value = null
      } else {
        showError(response.message || '更新失敗')
      }
    } else {
      // 新增模式
      response = await store.createHoliday(data)
      if (response.ok) {
        showSuccess('新增成功')
        formVisible.value = false
        editingHoliday.value = null
      } else {
        showError(response.message || '新增失敗')
      }
    }
  } catch (err) {
    console.error('提交表單失敗:', err)
    showError(err.message || '新增失敗')
  }
}

// 處理表單取消
const handleFormCancel = () => {
  formVisible.value = false
  editingHoliday.value = null
}

// 處理批量上傳
const handleBatchUpload = () => {
  formVisible.value = false
  batchUploadVisible.value = true
  editingHoliday.value = null
}

// ?��??��?上傳?�交
const handleBatchUploadSubmit = async (holidays, errors) => {
  try {
    const response = await store.batchCreateHolidays(holidays)
    
    if (response.ok) {
      const data = response.data || {}
      const successCount = data.successCount || 0
      const skipCount = data.skipCount || 0
      const failedCount = (data.failCount || 0) + errors.length
      
      let messageText = `批量導入完成：成功 ${successCount} 筆`
      if (skipCount > 0) {
        messageText += `，跳過 ${skipCount} 筆（已存在）`
      }
      if (failedCount > 0) {
        messageText += `，失敗 ${failedCount} 筆`
      }
      
      showSuccess(messageText)
      
      // 如果有錯誤，顯示詳細信息
      if (errors.length > 0) {
        const errorList = errors.slice(0, 10).map(err => `${err}`).join('\n')
        const moreErrors = errors.length > 10 ? `\n...還有 ${errors.length - 10} 個錯誤` : ''
        const errorContent = `以下假日導入失敗：\n\n${errorList}${moreErrors}`
        
        Modal.warning({
          title: '部分假日導入失敗',
          content: errorContent,
          width: 600,
          style: { whiteSpace: 'pre-line' }
        })
      }
      
      batchUploadVisible.value = false
    } else {
      showError(response.message || '批量上傳失敗')
    }
  } catch (err) {
    console.error('批量上傳失敗:', err)
    showError(err.message || '批量上傳失敗')
  }
}

// 處理批量上傳取消
const handleBatchUploadCancel = () => {
  batchUploadVisible.value = false
}

// 處理下載範本
const handleDownloadSample = () => {
  if (batchUploadFormRef.value) {
    batchUploadFormRef.value.downloadSample()
  } else {
    // 如果組件未渲染，直接創建下載
    const sampleData = [
      ['日期', '名稱'],
      ['2024-01-01', '元旦'],
      ['2024-02-10', '春節'],
      ['2024-02-11', '春節'],
      ['2024-02-12', '春節'],
      ['2024-04-04', '清明節'],
      ['2024-05-01', '勞動節'],
      ['2024-06-10', '端午節'],
      ['2024-09-17', '中秋節'],
      ['2024-10-10', '國慶日']
    ]
    
    const csvContent = sampleData.map(row => row.join(',')).join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', '國定假日範本.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    // 釋放 Blob URL
    URL.revokeObjectURL(url)
  }
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
.settings-holidays {
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

