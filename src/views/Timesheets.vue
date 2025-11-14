<template>
  <div style="padding: 24px">
    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage || store.error"
      type="error"
      :message="errorMessage || store.error"
      show-icon
      closable
      @close="errorMessage = ''; handleCloseError()"
      style="margin-bottom: 16px"
    />
    
    <!-- 信息提示 -->
    <a-alert
      v-if="infoMessage"
      type="info"
      :message="infoMessage"
      show-icon
      closable
      @close="infoMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 週導航（包含員工篩選器） -->
    <WeekNavigation
      :current-week-start="store.currentWeekStart"
      :pending-count="store.pendingChangesCount"
      @prev-week="handlePrevWeek"
      @next-week="handleNextWeek"
      @this-week="handleThisWeek"
      @add-row="handleAddRow"
      @save-all="handleSaveAll"
    >
      <!-- 員工篩選器（僅管理員可見） -->
      <template #employee-filter>
        <a-select
          v-if="store.isAdmin"
          v-model:value="selectedUserId"
          placeholder="選擇員工"
          style="width: 180px"
          show-search
          :filter-option="filterUserOption"
          @change="handleUserIdChange"
        >
          <a-select-option
            v-for="user in store.users"
            :key="getUserId(user)"
            :value="getUserId(user)"
          >
            {{ getUserName(user) }}
          </a-select-option>
        </a-select>
      </template>
    </WeekNavigation>
    
    <!-- 工時表格 -->
    <TimesheetTable
      :week-days="store.weekDays"
      :clients="store.clients"
      :work-types="store.workTypes"
      :holidays="store.holidays"
      :leaves="store.leaves"
      :loading="store.loading"
    />
    
    <!-- 工時統計 -->
    <TimesheetSummary
      :weekly-summary="store.weeklySummary"
      :monthly-summary="store.monthlySummary"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { useTimesheetStore } from '@/stores/timesheets'
const { successMessage, errorMessage, infoMessage, showSuccess, showError, showInfo } = usePageAlert()
import { getMonday } from '@/utils/date'
import WeekNavigation from '@/components/timesheets/WeekNavigation.vue'
import TimesheetTable from '@/components/timesheets/TimesheetTable.vue'
import TimesheetSummary from '@/components/timesheets/TimesheetSummary.vue'

const store = useTimesheetStore()

// 從 store 獲取響應式狀態
const { error } = storeToRefs(store)

// 選中的員工 ID（本地狀態，用於雙向綁定）
const selectedUserId = ref(store.selectedUserId)

// 監聽 store 的 selectedUserId 變化
watch(() => store.selectedUserId, (val) => {
  selectedUserId.value = val
})

// 處理員工篩選變化
const handleUserIdChange = (userId) => {
  selectedUserId.value = userId
  store.setSelectedUserId(userId)
  // 重新載入數據
  loadData()
}

// 用戶過濾函數
const filterUserOption = (input, option) => {
  const userName = option.children?.[0]?.children || option.children || ''
  return String(userName).toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 獲取用戶ID（處理不同字段名）
const getUserId = (user) => {
  return user.userId || user.user_id || user.id
}

// 獲取用戶名稱（處理不同字段名）
const getUserName = (user) => {
  return user.name || user.userName || user.user_name || '未命名'
}

// 載入數據
const loadData = async () => {
  try {
    await store.loadAllData()
  } catch (err) {
    console.error('載入數據失敗:', err)
  }
}

// 處理上一週
const handlePrevWeek = () => {
  const prevWeek = new Date(store.currentWeekStart)
  prevWeek.setDate(prevWeek.getDate() - 7)
  store.setCurrentWeekStart(prevWeek)
  loadData()
}

// 處理下一週
const handleNextWeek = () => {
  const nextWeek = new Date(store.currentWeekStart)
  nextWeek.setDate(nextWeek.getDate() + 7)
  store.setCurrentWeekStart(nextWeek)
  loadData()
}

// 處理本週
const handleThisWeek = () => {
  store.setCurrentWeekStart(new Date())
  loadData()
}

// 處理新增列
const handleAddRow = () => {
  store.addNewRow()
  showInfo('已添加新列')
}

// 處理儲存所有變更
const handleSaveAll = async () => {
  if (store.pendingChangesCount === 0) {
    showInfo('沒有待儲存的變更')
    return
  }
  
  // 批量驗證
  const errors = store.validateBeforeSave()
  if (errors.length > 0) {
    const errorMessages = errors.map(e => e.error).join('\n')
    showError(`驗證失敗：\n${errorMessages}`)
    return
  }
  
  // 構建 payload
  const updates = []
  const creates = []
  const deletes = []
  
  store.pendingChanges.forEach((change, key) => {
    const { rowIndex, dayIndex, value } = change
    const row = store.rows[rowIndex]
    const day = store.weekDays[dayIndex]
    
    if (!row || !day) return
    
    const workDate = day.date
    const timesheetId = row.timesheetIds[dayIndex]
    
    // 如果清空工時（value 為 null），且存在 timesheetId，則標記為刪除
    if ((value === null || value === undefined || value === 0) && timesheetId) {
      deletes.push(timesheetId)
      return
    }
    
    // 如果有值，構建工時記錄
    if (value !== null && value !== undefined && value > 0) {
      const record = {
        work_date: workDate,
        client_id: row.clientId || row.client_id,
        service_id: row.serviceId || row.service_id,
        service_item_id: row.serviceItemId || row.service_item_id,
        work_type_id: row.workTypeId || row.work_type_id,
        hours: value
      }
      
      // 如果存在 timesheetId，則為更新；否則為新增
      if (timesheetId) {
        record.timesheet_id = timesheetId
        updates.push(record)
      } else {
        creates.push(record)
      }
    }
  })
  
  // 如果有刪除的記錄，先刪除
  if (deletes.length > 0) {
    try {
      await Promise.all(deletes.map(id => store.deleteTimesheet(id)))
    } catch (error) {
      showError('刪除失敗：' + (error.message || '未知錯誤'))
      return
    }
  }
  
  // 如果有更新或新增的記錄，批量保存
  if (updates.length > 0 || creates.length > 0) {
    try {
      const payload = {
        updates: updates,
        creates: creates
      }
      await store.saveTimesheets(payload)
      showSuccess(`成功儲存 ${updates.length + creates.length} 筆工時記錄`)
    } catch (error) {
      showError('儲存失敗：' + (error.message || '未知錯誤'))
    }
  } else if (deletes.length > 0) {
    showSuccess(`成功刪除 ${deletes.length} 筆工時記錄`)
  }
}

// 處理關閉錯誤提示
const handleCloseError = () => {
  store.error = null
}

// 生命週期
onMounted(() => {
  // 初始化當前週為本週
  store.setCurrentWeekStart(new Date())
  loadData()
})
</script>

<style scoped>
/* 樣式可以根據需要添加 */
</style>

