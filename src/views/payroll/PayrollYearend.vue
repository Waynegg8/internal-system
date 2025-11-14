<template>
  <div class="payroll-yearend-content">
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
    
    <!-- 警告提示 -->
    <a-alert
      v-if="warningMessage"
      type="warning"
      :message="warningMessage"
      show-icon
      closable
      @close="warningMessage = ''"
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
    
    <!-- 頂部操作欄 -->
    <div class="payroll-yearend-toolbar">
      <div class="toolbar-left">
        <label style="margin-right: 8px; font-weight: 500;">年度</label>
        <a-input-number
          v-model:value="selectedYear"
          :min="2000"
          :max="2100"
          style="width: 100px"
          @change="handleYearChange"
        />
      </div>
      
      <div class="toolbar-center">
        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-label">總額</span>
            <span class="stat-value">{{ formatNumber(summary.total) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">人數</span>
            <span class="stat-value">{{ summary.count }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">平均</span>
            <span class="stat-value">{{ formatNumber(summary.average) }}</span>
          </div>
        </div>
      </div>
      
      <div class="toolbar-right">
        <a-button
          type="primary"
          :loading="saving"
          @click="handleSave"
        >
          <template #icon>
            <SaveOutlined />
          </template>
          儲存
        </a-button>
      </div>
    </div>

    <!-- 表格 -->
    <YearEndBonusTable
      :employees="employees"
      :loading="loading"
      @change="handleBonusChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { usePayrollStore } from '@/stores/payroll'
import { usePageAlert } from '@/composables/usePageAlert'
import { SaveOutlined } from '@ant-design/icons-vue'
import { formatNumber } from '@/utils/formatters'
import YearEndBonusTable from '@/components/payroll/YearEndBonusTable.vue'

const payrollStore = usePayrollStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 選中的年度
const selectedYear = ref(new Date().getFullYear())

// 保存狀態
const saving = ref(false)

// 從 store 獲取數據
const yearEndBonusData = computed(() => payrollStore.yearEndBonusData)
const loading = computed(() => payrollStore.loading)

// 員工列表
const employees = computed(() => {
  if (!yearEndBonusData.value || !yearEndBonusData.value.employees) {
    return []
  }
  return yearEndBonusData.value.employees
})

// 統計摘要
const summary = computed(() => {
  if (!yearEndBonusData.value || !yearEndBonusData.value.summary) {
    return {
      total: 0,
      count: 0,
      average: 0
    }
  }
  
  const s = yearEndBonusData.value.summary
  return {
    total: s.total || 0,
    count: s.count || 0,
    average: s.average || 0
  }
})

// 監聽員工列表變化，更新統計摘要
watch(employees, () => {
  payrollStore.updateYearEndBonusSummary()
}, { deep: true })

// 處理年度變化
const handleYearChange = async (year) => {
  if (!year || year < 2000 || year > 2100) {
    return
  }
  
  try {
    await payrollStore.loadYearEndBonus(year)
  } catch (error) {
    showError(error.message || '載入年終獎金數據失敗')
  }
}

// 處理年終獎金數據變化
const handleBonusChange = (empIndex, field, value) => {
  if (!employees.value || empIndex < 0 || empIndex >= employees.value.length) {
    return
  }
  
  const employee = employees.value[empIndex]
  
  if (field === 'amount') {
    // 處理金額變化（轉換為分）
    if (value === null || value === undefined || value === '') {
      employee.amountCents = 0
      employee.amount_cents = 0
    } else {
      const amountCents = Math.round(Number(value) * 100)
      if (!isNaN(amountCents) && amountCents >= 0) {
        employee.amountCents = amountCents
        employee.amount_cents = amountCents
      }
    }
  } else if (field === 'paymentMonth') {
    // 處理發放月份變化
    employee.paymentMonth = value
    employee.payment_month = value
  } else if (field === 'notes') {
    // 處理備註變化
    employee.notes = value || ''
    employee.remark = value || ''
  }
  
  // 更新統計摘要
  payrollStore.updateYearEndBonusSummary()
}

// 處理保存
const handleSave = async () => {
  if (!employees.value || employees.value.length === 0) {
    showWarning('沒有員工資料')
    return
  }
  
  saving.value = true
  
  try {
    // 收集所有年終獎金數據（只保存金額大於 0 的記錄）
    const bonuses = []
    
    employees.value.forEach((employee) => {
      const amountCents = employee.amountCents || employee.amount_cents || 0
      if (amountCents > 0) {
        const userId = employee.userId || employee.user_id
        if (!userId) return
        
        bonuses.push({
          userId: userId,
          user_id: userId,
          amountCents: amountCents,
          amount_cents: amountCents,
          paymentMonth: employee.paymentMonth || employee.payment_month || null,
          payment_month: employee.paymentMonth || employee.payment_month || null,
          notes: employee.notes || employee.remark || null,
          remark: employee.notes || employee.remark || null
        })
      }
    })
    
    // 提交年終獎金數據
    await payrollStore.updateYearEndBonus(selectedYear.value, bonuses)
    showSuccess('儲存成功')
  } catch (error) {
    showError(error.message || '儲存失敗')
  } finally {
    saving.value = false
  }
}

// 載入數據
onMounted(async () => {
  try {
    const currentYear = new Date().getFullYear()
    selectedYear.value = currentYear
    await payrollStore.loadYearEndBonus(currentYear)
  } catch (error) {
    showError(error.message || '載入年終獎金數據失敗')
  }
})
</script>

<style scoped>
.payroll-yearend-content {
  padding: 0;
}

.payroll-yearend-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.summary-stats {
  display: flex;
  gap: 48px;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.45);
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.toolbar-right {
  display: flex;
  align-items: center;
}
</style>

