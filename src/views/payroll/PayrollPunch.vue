<template>
  <div class="payroll-punch-page">
    <!-- 年月篩選 -->
    <a-card size="small" style="margin-bottom: 16px;">
      <a-space>
        <label>篩選月份</label>
        <a-date-picker
          v-model:value="filterMonth"
          picker="month"
          format="YYYY-MM"
          value-format="YYYY-MM"
          placeholder="全部月份"
          allow-clear
          @change="handleFilterChange"
        />
      </a-space>
    </a-card>

    <a-row :gutter="16">
      <!-- 左側：上傳和記錄列表 -->
      <a-col :span="8">
        <PunchRecordUpload
          :is-admin="isAdmin"
          :employees="employees"
          :selected-user-id="selectedUserId"
          @upload="handleUpload"
          @user-change="handleUserChange"
        />
        
        <div style="margin-top: 16px;">
          <PunchRecordList
            :records="filteredRecords"
            :loading="loading"
            @preview="handlePreview"
            @download="handleDownload"
            @delete="handleDelete"
            @refresh="loadRecords"
          />
        </div>
      </a-col>

      <!-- 右側：預覽區域 -->
      <a-col :span="16">
        <PunchRecordPreview
          :record="previewRecord"
          @download="handleDownload"
        />
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePayrollStore } from '@/stores/payroll'
import { usePayrollApi } from '@/api/payroll'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import PunchRecordUpload from '@/components/payroll/PunchRecordUpload.vue'
import PunchRecordList from '@/components/payroll/PunchRecordList.vue'
import PunchRecordPreview from '@/components/payroll/PunchRecordPreview.vue'

const authStore = useAuthStore()
const payrollStore = usePayrollStore()
const payrollApi = usePayrollApi()

// 是否為管理員
const isAdmin = computed(() => authStore.isAdmin)

// 篩選月份
const filterMonth = ref(null)

// 載入狀態
const loading = ref(false)

// 所有打卡記錄
const records = ref([])

// 根據年月篩選的記錄
const filteredRecords = computed(() => {
  if (!filterMonth.value) return records.value
  return records.value.filter(record => 
    record.month === filterMonth.value
  )
})

// 員工列表
const employees = ref([])

// 選中的用戶 ID
const selectedUserId = ref(null)

// 預覽相關
const previewRecord = ref(null)

// 處理篩選變化
const handleFilterChange = (value) => {
  filterMonth.value = value
}

// 載入打卡記錄
const loadRecords = async () => {
  loading.value = true
  try {
    const userId = isAdmin.value ? selectedUserId.value : null
    const response = await payrollApi.loadPunchRecords(userId)
    records.value = response.data || []
  } catch (error) {
    message.error('載入打卡記錄失敗')
    records.value = []
  } finally {
    loading.value = false
  }
}

// 處理上傳
const handleUpload = async (formData) => {
  try {
    await payrollApi.uploadPunchRecord(formData)
    message.success('上傳成功')
    await loadRecords()
  } catch (error) {
    message.error(error.message || '上傳失敗')
  }
}

// 處理員工變化
const handleUserChange = async (userId) => {
  selectedUserId.value = userId
  // 重新載入該員工的打卡記錄
  await loadRecords()
}

// 處理預覽（點擊記錄時）
const handlePreview = (record) => {
  previewRecord.value = record
}

// 處理下載
const handleDownload = async (recordId, fileName) => {
  try {
    const blob = await payrollApi.downloadPunchRecord(recordId)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName || '打卡記錄'
    link.click()
    window.URL.revokeObjectURL(url)
    message.success('下載成功')
  } catch (error) {
    message.error('下載失敗')
  }
}

// 處理刪除
const handleDelete = async (recordId) => {
  try {
    await payrollApi.deletePunchRecord(recordId)
    message.success('刪除成功')
    await loadRecords()
  } catch (error) {
    message.error('刪除失敗')
  }
}

// 載入員工列表（僅基本信息，不載入薪資數據）
const loadEmployees = async () => {
  try {
    const response = await payrollApi.loadAllUsers()
    // 只提取基本員工信息
    if (response && typeof response === 'object') {
      if (response.data && response.data.users) {
        employees.value = response.data.users
      } else if (Array.isArray(response.data)) {
        employees.value = response.data
      } else if (Array.isArray(response)) {
        employees.value = response
      }
    }
  } catch (error) {
    message.error('載入員工列表失敗')
    employees.value = []
  }
}

// 載入初始數據
onMounted(async () => {
  if (isAdmin.value) {
    await loadEmployees()
  }
  await loadRecords()
})
</script>

<style scoped>
.payroll-punch-page {
  padding: 0;
}
</style>
