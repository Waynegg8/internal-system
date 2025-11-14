<template>
  <div class="timesheet-table-container">
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
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :pagination="false"
      :locale="{ emptyText: '暫無工時記錄' }"
      :bordered="false"
      size="middle"
      class="responsive-table"
      :row-key="record => record.key"
    >
      <template #bodyCell="{ column, record, index }">
        <!-- 員工列（僅管理員可見） -->
        <template v-if="column.key === 'employee'">
          <span>{{ record.userName || '未知' }}</span>
        </template>
        
        <!-- 客戶列 -->
        <template v-if="column.key === 'client'">
          <a-select
            v-model:value="record.clientId"
            :placeholder="'請選擇客戶...'"
            style="width: 100%"
            :options="clientOptions"
            show-search
            :filter-option="filterOption"
            @change="(value) => handleClientChange(index, value, record)"
          />
        </template>
        
        <!-- 服務項目列 -->
        <template v-if="column.key === 'service'">
          <a-select
            v-model:value="record.serviceId"
            :placeholder="record.clientId ? '請選擇服務項目...' : '請先選擇客戶...'"
            style="width: 100%"
            :options="getServiceOptions(record.clientId)"
            :loading="serviceLoadingMap.get(record.clientId)"
            :disabled="!record.clientId"
            show-search
            :filter-option="filterOption"
            @change="(value) => handleServiceChange(index, value, record)"
          />
        </template>
        
        <!-- 任務列 -->
        <template v-if="column.key === 'serviceItem'">
          <a-select
            v-model:value="record.serviceItemId"
            :placeholder="record.serviceId ? '請選擇任務...' : '請先選擇服務項目...'"
            style="width: 100%"
            :options="getServiceItemOptions(record.clientId, record.serviceId)"
            :loading="serviceItemLoadingMap.get(`${record.clientId}_${record.serviceId}`)"
            :disabled="!record.clientId || !record.serviceId"
            show-search
            :filter-option="filterOption"
            @change="(value) => handleServiceItemChange(index, value, record)"
          />
        </template>
        
        <!-- 工時類型列 -->
        <template v-if="column.key === 'workType'">
          <a-select
            v-model:value="record.workTypeId"
            :placeholder="'請選擇工時類型...'"
            style="width: 100%"
            :options="workTypeOptions"
            show-search
            :filter-option="filterOption"
            @change="(value) => handleWorkTypeChange(index, value, record)"
          />
        </template>
        
        <!-- 日期列（工時輸入） -->
        <template v-if="column.key && column.key.startsWith('day_')">
          <a-input-number
            v-model:value="record.hours[parseInt(column.key.replace('day_', ''))]"
            :min="0"
            :max="24"
            :step="0.5"
            :precision="1"
            :controls="false"
            style="width: 55px"
            :placeholder="'-'"
            @change="(value) => handleHoursChange(index, parseInt(column.key.replace('day_', '')), value, record)"
            @blur="() => handleHoursBlur(index, parseInt(column.key.replace('day_', '')), record)"
          />
        </template>
        
        <!-- 操作列 -->
        <template v-if="column.key === 'action'">
          <a-button type="link" danger size="small" @click="() => handleDeleteRow(index, record)">
            刪除
          </a-button>
        </template>
      </template>
      
      <!-- 表尾：請假記錄行和工時完整性行 -->
      <template #footer>
        <div class="timesheet-footer">
          <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
            <colgroup>
              <!-- 根據主表格的欄位寬度設置對應的 col -->
              <col v-if="isAdmin" style="width: 80px">
              <col style="width: 180px">
              <col style="width: 120px">
              <col style="width: 120px">
              <col style="width: 140px">
              <col v-for="day in props.weekDays" :key="`col-${day.date}`" style="width: 60px">
              <col style="width: 80px">
            </colgroup>
            <tbody>
              <!-- 請假記錄行 -->
              <tr>
                <td :colspan="isAdmin ? 5 : 4" class="footer-label-cell">
                  請假記錄
                </td>
                <td 
                  v-for="(day, index) in props.weekDays" 
                  :key="`leave-${index}`"
                  class="footer-data-cell"
                >
                  {{ formatLeaveRecord(day) }}
                </td>
                <td class="footer-data-cell"></td>
              </tr>
              <!-- 工時完整性行 -->
              <tr>
                <td :colspan="isAdmin ? 5 : 4" class="footer-label-cell">
                  工時完整性
                </td>
                <td 
                  v-for="(status, index) in dailyCompleteness" 
                  :key="`completeness-${index}`"
                  class="footer-data-cell"
                  :class="{
                    'status-error': status.startsWith('✗'),
                    'status-success': status.startsWith('✓')
                  }"
                >
                  {{ status }}
                </td>
                <td class="footer-data-cell"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed, ref, watch, h } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { formatDateDisplay } from '@/utils/formatters'
import { useTimesheetStore } from '@/stores/timesheets'
import { useTimesheetValidation } from '@/composables/useTimesheetValidation'
import { useTimesheetApi } from '@/api/timesheets'
import { getLeaveTypeText } from '@/constants/leaveTypes'

const props = defineProps({
  weekDays: {
    type: Array,
    default: () => []
  },
  clients: {
    type: Array,
    default: () => []
  },
  workTypes: {
    type: Array,
    default: () => []
  },
  holidays: {
    type: Map,
    default: () => new Map()
  },
  leaves: {
    type: Map,
    default: () => new Map()
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const store = useTimesheetStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()
const { validateHoursInput, getAllowedWorkTypesForDate } = useTimesheetValidation()
const api = useTimesheetApi()

// 從 store 獲取 rows
const rows = computed(() => store.rows)

// 服務項目和任務類型的載入狀態
const serviceLoadingMap = ref(new Map())
const serviceItemLoadingMap = ref(new Map())

// 客戶選項
const clientOptions = computed(() => {
  return props.clients.map(client => ({
    value: client.id || client.client_id || client.clientId,
    label: client.name || client.company_name || client.companyName || ''
  }))
})

// 工時類型選項（根據日期類型過濾）
const workTypeOptions = computed(() => {
  return props.workTypes.map(wt => ({
    value: wt.id,
    label: wt.name
  }))
})

// 獲取服務項目選項
const getServiceOptions = (clientId) => {
  if (!clientId) return []
  
  const services = store.clientServices.get(clientId) || []
  return services.map(service => ({
    value: service.service_id || service.id,
    label: service.service_name || service.name || ''
  }))
}

// 獲取任務類型選項（只顯示該客戶服務項目已配置的任務類型）
const getServiceItemOptions = (clientId, serviceId) => {
  if (!clientId || !serviceId) return []
  
  const cacheKey = `${clientId}_${serviceId}`
  const items = store.serviceItems.get(cacheKey) || []
  return items.map(item => ({
    value: item.item_id || item.id,
    label: item.item_name || item.name || ''
  }))
}

// 格式化日期列標題（與原有系統一致）
const formatDateHeader = (day) => {
  if (!day || !day.date) return ''
  
  const date = new Date(day.date)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayNum = String(date.getDate()).padStart(2, '0')
  const dateStr = `${month}/${dayNum}`
  
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[date.getDay()]
  
  let label = `週${weekday}<br>${dateStr}`
  
  // 檢查是否為假日或休息日，並顯示標籤
  // 優先檢查國定假日（國定假日優先於週六週日）
  if (day.type === 'national_holiday') {
    // 國定假日：直接顯示節日名稱
    const holidayName = day.holidayName || props.holidays.get(day.date)?.name
    if (holidayName) {
      label += `<br><span style="color: #ff4d4f; font-size: 11px;">${holidayName}</span>`
    } else {
      label += '<br><span style="color: #ff4d4f;">國定</span>'
    }
  } else if (day.type === 'weekly_restday') {
    // 例假日（週日）：顯示「例假」標籤
    label += '<br><span style="color: #1890ff;">例假</span>'
  } else if (day.type === 'restday') {
    // 休息日（週六）：顯示「休息」標籤
    label += '<br><span style="color: #1890ff;">休息</span>'
  }
  
  return label
}

// 計算每日正常工時（用於完整性檢查）
const dailyNormalHours = computed(() => {
  const hoursMap = new Map()
  rows.value.forEach(row => {
    const workType = props.workTypes.find(wt => wt.id === row.workTypeId)
    if (workType && !workType.isOvertime) {
      row.hours.forEach((hours, dayIndex) => {
        if (hours !== null && hours !== undefined && hours > 0) {
          const day = props.weekDays[dayIndex]
          if (day) {
            const current = hoursMap.get(day.date) || 0
            hoursMap.set(day.date, current + hours)
          }
        }
      })
    }
  })
  return hoursMap
})

// 計算每日工時完整性（符合原有系統邏輯）
const dailyCompleteness = computed(() => {
  const completeness = []
  props.weekDays.forEach((day, dayIndex) => {
    const normalHours = dailyNormalHours.value.get(day.date) || 0
    const leaveHours = props.leaves.get(day.date)?.hours || 0
    const total = normalHours + leaveHours
    
    let status = '-'
    // 只檢查工作日（非休息日、例假日、國定假日）
    if (day.type === 'restday' || day.type === 'weekly_restday' || day.type === 'national_holiday') {
      status = '-'
    } else {
      // 原有系統邏輯：
      // - total >= 8：顯示 "✓ 完整" 或 "✓"
      // - total < 8：顯示 "✗ 缺X.Xh" 或 "✗X.Xh"
      // - 不顯示"超"的狀態
      if (total >= 8) {
        status = '✓'
      } else {
        const missing = 8 - total
        status = `✗${missing.toFixed(1)}h`
      }
    }
    
    completeness.push(status)
  })
  return completeness
})

// 格式化請假記錄顯示
const formatLeaveRecord = (day) => {
  const leave = props.leaves.get(day.date)
  if (!leave || !leave.types || leave.types.length === 0) {
    return '-'
  }
  
  return leave.types.map(t => {
    const typeKey = t.type || t.leave_type || ''
    const typeName = getLeaveTypeText(typeKey) // 轉換為中文名稱
    const hours = t.hours || 0
    return `${typeName} ${hours}h`
  }).join(', ')
}

// 檢查是否為管理員
const isAdmin = computed(() => store.isAdmin)

// 建立表格列定義
const columns = computed(() => {
  const cols = []
  
  // 管理員模式下添加員工列
  if (isAdmin.value) {
    cols.push({
      title: '員工',
      key: 'employee',
      width: 80,
      ellipsis: {
        showTitle: true
      }
    })
  }
  
  cols.push(
    {
      title: '客戶',
      key: 'client',
      width: 180,
      ellipsis: {
        showTitle: true
      }
    },
    {
      title: '服務項目',
      key: 'service',
      width: 120,
      ellipsis: {
        showTitle: true
      },
      responsive: ['lg']
    },
    {
      title: '任務',
      key: 'serviceItem',
      width: 120,
      ellipsis: {
        showTitle: true
      },
      responsive: ['xl']
    },
    {
      title: '工時類型',
      key: 'workType',
      width: 140,
      ellipsis: {
        showTitle: true
      },
      responsive: ['lg']
    }
  )
  
  // 添加日期列（週一到週日）- 更窄以節省空間
  props.weekDays.forEach((day, index) => {
    cols.push({
      title: () => h('div', { innerHTML: formatDateHeader(day) }),
      key: `day_${index}`,
      width: 60,
      align: 'center'
    })
  })
  
  // 添加操作列
  cols.push({
    title: '操作',
    key: 'action',
    width: 80,
    align: 'center'
  })
  
  return cols
})

// 處理客戶變更
const handleClientChange = async (rowIndex, clientId, record) => {
  store.updateRowField(rowIndex, 'clientId', clientId)
  
  // 更新客戶名稱
  const client = props.clients.find(c => {
    const id = c.id || c.client_id || c.clientId
    return id === clientId
  })
  if (client) {
    record.clientName = client.name || client.company_name || client.companyName || ''
  }
  
  // 載入服務項目
  if (clientId) {
    serviceLoadingMap.value.set(clientId, true)
    try {
      await store.fetchClientServices(clientId)
    } catch (error) {
      showError('載入服務項目失敗')
    } finally {
      serviceLoadingMap.value.set(clientId, false)
    }
  }
}

// 處理服務項目變更
const handleServiceChange = async (rowIndex, serviceId, record) => {
  store.updateRowField(rowIndex, 'serviceId', serviceId)
  
  // 更新服務項目名稱
  const services = store.clientServices.get(record.clientId) || []
  const service = services.find(s => (s.service_id || s.id) === serviceId)
  if (service) {
    record.serviceName = service.service_name || service.name || ''
  }
  
  // 載入任務類型（只載入該客戶服務項目已配置的任務類型）
  if (record.clientId && serviceId) {
    // 清除之前的任務類型選擇
    store.updateRowField(rowIndex, 'serviceItemId', null)
    record.serviceItemName = ''
    
    const cacheKey = `${record.clientId}_${serviceId}`
    serviceItemLoadingMap.value.set(cacheKey, true)
    try {
      await store.fetchServiceItems(record.clientId, serviceId)
    } catch (error) {
      showError('載入任務類型失敗')
    } finally {
      serviceItemLoadingMap.value.set(cacheKey, false)
    }
  }
}

// 處理任務類型變更
const handleServiceItemChange = (rowIndex, serviceItemId, record) => {
  store.updateRowField(rowIndex, 'serviceItemId', serviceItemId)
  
  // 更新任務類型名稱
  const cacheKey = `${record.clientId}_${record.serviceId}`
  const items = store.serviceItems.get(cacheKey) || []
  const item = items.find(i => (i.item_id || i.id) === serviceItemId)
  if (item) {
    record.serviceItemName = item.item_name || item.name || ''
  }
}

// 處理工時類型變更
const handleWorkTypeChange = (rowIndex, workTypeId, record) => {
  store.updateRowField(rowIndex, 'workTypeId', workTypeId)
  
  // 更新工時類型名稱
  const workType = props.workTypes.find(wt => wt.id === workTypeId)
  if (workType) {
    record.workTypeName = workType.name
  }
}

// 處理工時變更
const handleHoursChange = (rowIndex, dayIndex, value, record) => {
  if (value === null || value === undefined || value === '') {
    store.updateRowHours(rowIndex, dayIndex, null)
    return
  }
  
  const day = props.weekDays[dayIndex]
  if (!day) return
  
  // 驗證
  const result = validateHoursInput({
    rowIndex,
    dayIndex,
    value,
    row: record,
    day,
    workTypes: props.workTypes,
    rows: rows.value,
    leaves: props.leaves
  })
  
  if (!result.valid) {
    showError(result.error)
    // 恢復原值
    record.hours[dayIndex] = null
    return
  }
  
  // 四捨五入到 0.5
  const rounded = Math.round(value * 2) / 2
  store.updateRowHours(rowIndex, dayIndex, rounded)
}

// 處理工時輸入框失焦
const handleHoursBlur = (rowIndex, dayIndex, record) => {
  const value = record.hours[dayIndex]
  if (value !== null && value !== undefined) {
    // 四捨五入到 0.5
    const rounded = Math.round(value * 2) / 2
    if (rounded !== value) {
      record.hours[dayIndex] = rounded
      store.updateRowHours(rowIndex, dayIndex, rounded)
    }
  }
}

// 處理刪除行
const handleDeleteRow = async (rowIndex, record) => {
  // 檢查是否有已保存的工時記錄需要刪除
  const timesheetIdsToDelete = []
  record.timesheetIds.forEach((id, dayIndex) => {
    if (id) {
      timesheetIdsToDelete.push({ timesheetId: id, dayIndex })
    }
  })
  
  // 如果有需要刪除的記錄，調用 API
  if (timesheetIdsToDelete.length > 0) {
    try {
      await Promise.all(
        timesheetIdsToDelete.map(({ timesheetId }) => store.deleteTimesheet(timesheetId))
      )
      showSuccess('刪除成功')
    } catch (error) {
      showError('刪除失敗：' + (error.message || '未知錯誤'))
      return
    }
  }
  
  // 移除行
  store.removeRow(rowIndex)
  showSuccess('已刪除')
}

// 監聽 store.rows 變化，確保響應式更新
watch(() => store.rows, () => {
  // 表格會自動更新，因為 rows 是 computed
}, { deep: true })

// 下拉選單過濾函數
const filterOption = (input, option) => {
  const label = option.label || option.children?.[0]?.children || option.children || ''
  return String(label).toLowerCase().indexOf(input.toLowerCase()) >= 0
}
</script>

<style scoped>
.timesheet-table-container {
  margin-bottom: 24px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

:deep(.ant-table) {
  font-size: 12px;
}

:deep(.ant-table-thead > tr > th) {
  background: #fafafa;
  font-weight: 600;
  font-size: 12px;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 8px 16px;
  font-size: 12px;
}

:deep(.ant-select) {
  width: 100%;
  font-size: 12px;
}

:deep(.ant-select-selector) {
  font-size: 12px;
}

:deep(.ant-select-selection-item) {
  font-size: 12px;
  line-height: 1.5;
}

:deep(.ant-select-selection-placeholder) {
  font-size: 12px;
}

:deep(.ant-input-number) {
  width: 55px;
}

/* 表尾樣式 */
.timesheet-footer {
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.footer-label-cell {
  padding: 8px 16px;
  background: #fafafa;
  font-weight: 600;
  border: 1px solid #f0f0f0;
  text-align: left;
}

.footer-data-cell {
  padding: 8px;
  text-align: center;
  border: 1px solid #f0f0f0;
  vertical-align: middle;
  font-size: 13px;
}

.status-error {
  color: #ff4d4f;
  font-weight: 500;
}

.status-success {
  color: #52c41a;
  font-size: 16px;
}
</style>
