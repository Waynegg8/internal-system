<template>
  <div class="payroll-calc-table">
    <!-- 月份選擇和刷新按鈕 -->
    <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
      <a-date-picker
        v-model:value="selectedMonth"
        picker="month"
        format="YYYY-MM"
        placeholder="選擇月份"
        style="width: 150px"
        :disabled="store.isForbidden"
        @change="handleMonthChange"
      />
      <a-button @click="handleRefresh" :loading="store.loading" :disabled="store.isForbidden">
        刷新數據
      </a-button>
    </div>

    <!-- 薪資計算表格 -->
    <a-spin :spinning="store.loading">
      <a-table
        :columns="columns"
        :data-source="tableData"
        :pagination="false"
        :row-key="getRowKey"
        :expandable="expandableConfig"
        size="small"
        :locale="tableLocale"
      >
        <template #bodyCell="{ column, record }">
          <!-- 員工名稱 -->
          <template v-if="column.key === 'name'">
            <strong>{{ record.name || record.userName || record.user_name || '-' }}</strong>
          </template>

          <!-- 底薪 -->
          <template v-else-if="column.key === 'baseSalary'">
            {{ formatCurrency(getField(record, 'baseSalaryCents', 'base_salary_cents') / 100) }}
          </template>

          <!-- 加班費 -->
          <template v-else-if="column.key === 'overtime'">
            {{ formatCurrency(getField(record, 'overtimeCents', 'overtime_cents') / 100) }}
          </template>

          <!-- 誤餐費 -->
          <template v-else-if="column.key === 'mealAllowance'">
            {{ formatCurrency(getField(record, 'mealAllowanceCents', 'meal_allowance_cents') / 100) }}
          </template>

          <!-- 加給 -->
          <template v-else-if="column.key === 'regularAllowance'">
            {{ formatCurrency(getRegularAllowanceTotal(record) / 100) }}
          </template>

          <!-- 津貼 -->
          <template v-else-if="column.key === 'irregularAllowance'">
            {{ formatCurrency(getIrregularAllowanceTotal(record) / 100) }}
          </template>

          <!-- 全勤狀態 -->
          <template v-else-if="column.key === 'fullAttendance'">
            <span v-if="getField(record, 'isFullAttendance', 'is_full_attendance') === true" style="color: #16a34a; font-size: 1.2em;">✓</span>
            <span v-else-if="getField(record, 'isFullAttendance', 'is_full_attendance') === false" style="color: #dc2626;">✗</span>
            <span v-else style="color: #9ca3af; font-size: 0.85em;">—</span>
          </template>

          <!-- 全勤獎金 -->
          <template v-else-if="column.key === 'fullAttendanceBonus'">
            {{ formatCurrency(getFullAttendanceBonusTotal(record) / 100) }}
          </template>

          <!-- 交通補貼 -->
          <template v-else-if="column.key === 'transport'">
            {{ formatCurrency(getField(record, 'transportCents', 'transport_cents') / 100) }}
          </template>

          <!-- 績效獎金 -->
          <template v-else-if="column.key === 'performance'">
            {{ formatCurrency(getField(record, 'performanceBonusCents', 'performance_bonus_cents') / 100) }}
          </template>

          <!-- 請假扣款 -->
          <template v-else-if="column.key === 'leaveDeduction'">
            {{ formatCurrency(getField(record, 'leaveDeductionCents', 'leave_deduction_cents') / 100) }}
          </template>

          <!-- 固定扣款 -->
          <template v-else-if="column.key === 'fixedDeduction'">
            {{ formatCurrency(getField(record, 'deductionCents', 'deduction_cents') / 100) }}
          </template>

          <!-- 年終獎金 -->
          <template v-else-if="column.key === 'yearEndBonus'">
            {{ formatCurrency(getYearEndBonusTotal(record) / 100) }}
          </template>

          <!-- 列印按鈕 -->
          <template v-else-if="column.key === 'print'">
            <a-button
              size="small"
              type="link"
              :disabled="store.isForbidden"
              @click="handlePrint(record)"
            >
              列印
            </a-button>
          </template>

          <!-- 實發金額 -->
          <template v-else-if="column.key === 'netSalary'">
            <strong style="color: #059669; font-size: 1.1em;">
              {{ formatCurrency(getField(record, 'netSalaryCents', 'net_salary_cents') / 100) }}
            </strong>
          </template>
        </template>

        <!-- 展開的行 -->
        <template #expandedRowRender="{ record }">
          <PayrollDetailRow :record="record" />
        </template>
      </a-table>
    </a-spin>

    <!-- 列印組件 -->
    <PayslipPrint
      v-if="selectedRecord"
      :userId="getUserId(selectedRecord)"
      :month="selectedMonthDisplay"
      :visible="printVisible && !!selectedRecord"
      @cancel="printVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { PrinterOutlined } from '@ant-design/icons-vue'
import { usePayrollStore } from '@/stores/payroll'
import { formatCurrency } from '@/utils/formatters'
import PayrollDetailRow from './PayrollDetailRow.vue'
import PayslipPrint from './PayslipPrint.vue'
import dayjs from 'dayjs'

const store = usePayrollStore()

// 選中的月份
const selectedMonth = ref(dayjs(store.selectedMonth || dayjs().format('YYYY-MM'), 'YYYY-MM'))
const selectedRecord = ref(null)
const printVisible = ref(false)

// 數據源
const dataSource = computed(() => {
  const preview = store.payrollPreview || []
  // 確保是數組
  if (!Array.isArray(preview)) {
    console.warn('[PayrollCalcTable] payrollPreview 不是數組:', preview)
    return []
  }
  return preview
})

const tableData = computed(() => (store.isForbidden ? [] : dataSource.value))

const tableLocale = computed(() => (store.isForbidden ? { emptyText: '您沒有權限查看薪資預覽' } : undefined))

// 展開的行 keys
const expandedRowKeys = computed(() => {
  return Array.from(store.expandedRows)
})

// 展開配置
const expandableConfig = computed(() => ({
  expandedRowKeys: expandedRowKeys.value,
  onExpand: async (expanded, record) => {
    const rowId = getRowKey(record)
    const userId = getUserId(record)
    const month = selectedMonthDisplay.value
    
    if (expanded) {
      if (store.isForbidden) {
        return
      }
      store.expandedRows.add(rowId)
      
      // 檢查是否已載入完整數據，避免重複請求
      if (userId && month) {
        // 如果已有完整數據，直接返回
        if (store.hasFullEmployeeData(userId)) {
          console.log(`[PayrollCalcTable] ⚡ 使用快取的完整數據 (userId: ${userId})`)
          return
        }
        
        // 檢查是否正在載入中，避免重複請求
        if (store.isLoadingDetails(userId)) {
          console.log(`[PayrollCalcTable] ⏳ 正在載入中，跳過重複請求 (userId: ${userId})`)
          return
        }
        
        // 設置載入狀態
        store.setLoadingDetails(userId, true)
        
        try {
          console.log(`[PayrollCalcTable] 🔄 載入完整數據 (userId: ${userId}, month: ${month})`)
          const { usePayrollApi } = await import('@/api/payroll')
          const response = await usePayrollApi().calculateEmployeePayroll(userId, month)
          
          if (response.ok && response.data) {
            // 更新 store 中的數據
            store.updateEmployeePayrollData(userId, response.data)
            
            // 強制觸發響應式更新
            await nextTick()
            
            console.log(`[PayrollCalcTable] ✓ 載入完成 (userId: ${userId})`)
          } else {
            console.warn(`[PayrollCalcTable] ⚠ API 返回異常 (userId: ${userId}):`, response)
          }
        } catch (error) {
          console.error(`[PayrollCalcTable] ✗ 載入完整數據失敗 (userId: ${userId}):`, error)
          // 可以顯示錯誤提示給用戶
        } finally {
          // 清除載入狀態
          store.setLoadingDetails(userId, false)
        }
      }
    } else {
      store.expandedRows.delete(rowId)
    }
  }
}))

// 月份顯示
const selectedMonthDisplay = computed(() => {
  if (!selectedMonth.value) return ''
  return selectedMonth.value.format('YYYY-MM')
})

// 獲取行的 key
const getRowKey = (record) => {
  return record.userId || record.user_id || record.id || String(Math.random())
}

// 獲取用戶 ID
const getUserId = (record) => {
  return record.userId || record.user_id || record.id || null
}

// 獲取字段值（支持 snake_case 和 camelCase）
const getField = (record, camelKey, snakeKey) => {
  return record[camelKey] ?? record[snakeKey] ?? null
}

// 計算年終獎金總和
const getYearEndBonusTotal = (record) => {
  // 優先檢查 totalYearEndBonusCents（總計字段）
  const totalCents = getField(record, 'totalYearEndBonusCents', 'total_year_end_bonus_cents')
  if (totalCents != null && totalCents !== 0) {
    return Number(totalCents)
  }
  
  // 其次檢查 yearEndBonusCents（單個字段）
  const directCents = getField(record, 'yearEndBonusCents', 'year_end_bonus_cents')
  if (directCents != null && directCents !== 0) {
    return Number(directCents)
  }
  
  // 最後從 yearEndBonusItems 計算
  const items = getField(record, 'yearEndBonusItems', 'year_end_bonus_items') || []
  if (!Array.isArray(items) || items.length === 0) {
    return 0
  }
  
  const total = items
    .filter(item => {
      // 只累加 shouldPay 為 true 的項目
      const shouldPay = item.shouldPay ?? item.should_pay
      return shouldPay === true
    })
    .reduce((sum, item) => {
      const amount = item.amountCents ?? item.amount_cents ?? 0
      return sum + Number(amount)
    }, 0)
  
  return total
}

// 計算加給總額
const getRegularAllowanceTotal = (record) => {
  const totalCents = getField(record, 'totalRegularAllowanceCents', 'total_regular_allowance_cents')
  if (totalCents != null && totalCents !== 0) {
    return Number(totalCents)
  }
  const items = getField(record, 'regularAllowanceItems', 'regular_allowance_items') || []
  if (!Array.isArray(items) || items.length === 0) {
    return 0
  }
  return items.reduce((sum, item) => {
    const amount = item.amountCents ?? item.amount_cents ?? 0
    return sum + Number(amount)
  }, 0)
}

// 計算津貼總額
const getIrregularAllowanceTotal = (record) => {
  const totalCents = getField(record, 'totalIrregularAllowanceCents', 'total_irregular_allowance_cents')
  if (totalCents != null && totalCents !== 0) {
    return Number(totalCents)
  }
  const items = getField(record, 'irregularAllowanceItems', 'irregular_allowance_items') || []
  if (!Array.isArray(items) || items.length === 0) {
    return 0
  }
  return items.reduce((sum, item) => {
    const amount = item.amountCents ?? item.amount_cents ?? 0
    return sum + Number(amount)
  }, 0)
}

// 計算月度獎金總額（不含全勤）
const getRegularBonusTotal = (record) => {
  const totalCents = getField(record, 'totalRegularBonusCents', 'total_regular_bonus_cents')
  if (totalCents != null && totalCents !== 0) {
    return Number(totalCents)
  }
  const items = getField(record, 'regularBonusItems', 'regular_bonus_items') || []
  if (!Array.isArray(items) || items.length === 0) {
    return 0
  }
  return items
    .filter(item => {
      // 只累加 shouldPay 為 true 且不是全勤獎金的項目
      const shouldPay = item.shouldPay ?? item.should_pay
      const isFullAttendance = item.isFullAttendanceBonus ?? item.is_full_attendance_bonus
      return shouldPay === true && !isFullAttendance
    })
    .reduce((sum, item) => {
      const amount = item.amountCents ?? item.amount_cents ?? 0
      return sum + Number(amount)
    }, 0)
}

// 計算全勤獎金
const getFullAttendanceBonusTotal = (record) => {
  const items = getField(record, 'regularBonusItems', 'regular_bonus_items') || []
  if (!Array.isArray(items) || items.length === 0) {
    return 0
  }
  const isFullAttendance = getField(record, 'isFullAttendance', 'is_full_attendance')
  if (!isFullAttendance) {
    return 0
  }
  return items
    .filter(item => {
      const shouldPay = item.shouldPay ?? item.should_pay
      const isFullAttendanceBonus = item.isFullAttendanceBonus ?? item.is_full_attendance_bonus
      return shouldPay === true && isFullAttendanceBonus === true
    })
    .reduce((sum, item) => {
      const amount = item.amountCents ?? item.amount_cents ?? 0
      return sum + Number(amount)
    }, 0)
}

// 表格列定義
const columns = [
  {
    title: '員工',
    key: 'name',
    width: 120,
    fixed: 'left'
  },
  {
    title: '底薪',
    key: 'baseSalary',
    width: 100,
    align: 'right'
  },
  {
    title: '加給',
    key: 'regularAllowance',
    width: 100,
    align: 'right'
  },
  {
    title: '津貼',
    key: 'irregularAllowance',
    width: 100,
    align: 'right'
  },
  {
    title: '全勤',
    key: 'fullAttendance',
    width: 80,
    align: 'center'
  },
  {
    title: '全勤獎金',
    key: 'fullAttendanceBonus',
    width: 90,
    align: 'right'
  },
  {
    title: '加班費',
    key: 'overtime',
    width: 90,
    align: 'right'
  },
  {
    title: '誤餐費',
    key: 'mealAllowance',
    width: 90,
    align: 'right'
  },
  {
    title: '交通補貼',
    key: 'transport',
    width: 90,
    align: 'right'
  },
  {
    title: '績效獎金',
    key: 'performance',
    width: 90,
    align: 'right'
  },
  {
    title: '年終獎金',
    key: 'yearEndBonus',
    width: 90,
    align: 'right'
  },
  {
    title: '請假扣款',
    key: 'leaveDeduction',
    width: 100,
    align: 'right'
  },
  {
    title: '固定扣款',
    key: 'fixedDeduction',
    width: 100,
    align: 'right'
  },
  {
    title: '實發金額',
    key: 'netSalary',
    width: 120,
    align: 'right'
  },
  {
    title: '列印',
    key: 'print',
    width: 80,
    fixed: 'right',
    align: 'center'
  }
]

// 處理月份變化
const handleMonthChange = async (date) => {
  if (!date) return
  const month = date.format('YYYY-MM')
  store.setSelectedMonth(month)
  const result = await store.loadPayrollPreview(month)
  console.log('[PayrollCalcTable] 月份變化完成:', {
    month,
    dataLength: result?.data?.length || store.payrollPreview?.length || 0
  })
}

// 處理刷新
const handleRefresh = async () => {
  const month = selectedMonthDisplay.value || dayjs().format('YYYY-MM')
  const result = await store.loadPayrollPreview(month, true)
  console.log('[PayrollCalcTable] 刷新完成:', {
    month,
    dataLength: result?.data?.length || store.payrollPreview?.length || 0
  })
}

// 處理列印
const handlePrint = (record) => {
  if (!record) {
    console.warn('[PayrollCalcTable] 沒有記錄，無法列印')
    return
  }
  selectedRecord.value = { ...record }
  printVisible.value = true
}

// 監聽展開狀態變化
watch(expandedRowKeys, (newKeys) => {
  // 確保展開狀態同步
}, { deep: true })

// 監聽月份變化
watch(() => store.selectedMonth, (newMonth) => {
  if (newMonth) {
    selectedMonth.value = dayjs(newMonth, 'YYYY-MM')
  }
}, { immediate: true })

// 初始化
nextTick(async () => {
  const month = store.selectedMonth || dayjs().format('YYYY-MM')
  store.setSelectedMonth(month)
  selectedMonth.value = dayjs(month, 'YYYY-MM')
  const result = await store.loadPayrollPreview(month)
  // 調試：檢查數據載入
  console.log('[PayrollCalcTable] 初始化完成:', {
    month,
    result,
    dataLength: result?.data?.length || store.payrollPreview?.length || 0,
    previewData: store.payrollPreview
  })
})
</script>

<style scoped>
.payroll-calc-table {
  padding: 12px;
}

:deep(.ant-table) {
  font-size: 0.9em;
}

:deep(.ant-table-thead > tr > th) {
  background: #f5f5f5;
  font-weight: 600;
  padding: 8px 12px;
  white-space: nowrap;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 8px 12px;
}
</style>
