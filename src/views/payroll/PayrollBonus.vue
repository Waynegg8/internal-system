<template>
  <div class="payroll-bonus-content">
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
    <div class="payroll-bonus-toolbar">
      <div class="toolbar-left">
        <label style="margin-right: 8px; font-weight: 500;">年度</label>
        <a-select
          v-model:value="selectedYear"
          style="width: 100px"
          @change="handleYearChange"
        >
          <a-select-option
            v-for="year in yearOptions"
            :key="year"
            :value="year"
          >
            {{ year }}
          </a-select-option>
        </a-select>
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
    <PerformanceBonusTable
      :employees="employees"
      :loading="loading"
      @adjustment-change="handleAdjustmentChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePayrollStore } from '@/stores/payroll'
import { usePageAlert } from '@/composables/usePageAlert'
import { SaveOutlined } from '@ant-design/icons-vue'
import PerformanceBonusTable from '@/components/payroll/PerformanceBonusTable.vue'

const payrollStore = usePayrollStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 選中的年度
const selectedYear = ref(new Date().getFullYear())

// 保存狀態
const saving = ref(false)

// 從 store 獲取數據
const yearlyBonusData = computed(() => payrollStore.yearlyBonusData)
const loading = computed(() => payrollStore.loading)

// 員工列表
const employees = computed(() => {
  if (!yearlyBonusData.value || !yearlyBonusData.value.employees) {
    return []
  }
  return yearlyBonusData.value.employees
})

// 年度選項（當前年份及前後各 5 年，共 11 年）
const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = -5; i <= 5; i++) {
    years.push(currentYear + i)
  }
  return years
})

// 處理年度變化
const handleYearChange = async (year) => {
  try {
    await payrollStore.loadYearlyBonus(year)
  } catch (error) {
    showError(error.message || '載入年度績效獎金數據失敗')
  }
}

// 處理調整金額變化
const handleAdjustmentChange = (empIndex, month, amount) => {
  // 驗證輸入：只接受有效數字（非負數），無效值跳過不保存
  if (amount !== null && amount !== undefined && amount !== '') {
    const numValue = Number(amount)
    if (isNaN(numValue) || numValue < 0) {
      // 無效值，不保存
      return
    }
  }
  payrollStore.updateMonthlyAdjustment(empIndex, month, amount)
}

// 處理保存
const handleSave = async () => {
  if (!employees.value || employees.value.length === 0) {
    showWarning('沒有員工資料')
    return
  }
  
  saving.value = true
  
  try {
    // 收集所有調整數據
    const adjustments = []
    
    employees.value.forEach((employee, empIndex) => {
      const monthlyAdjustments = employee.monthlyAdjustments || employee.monthly_adjustments || {}
      const userId = employee.userId || employee.user_id
      
      if (!userId) return
      
      // 遍歷 12 個月
      for (let month = 1; month <= 12; month++) {
        const adjustment = monthlyAdjustments[month]
        if (adjustment) {
          const amountCents = adjustment.bonusAmountCents || adjustment.bonus_amount_cents || 0
          if (amountCents > 0) {
            adjustments.push({
              userId: userId,
              user_id: userId,
              month: month,
              bonusAmountCents: amountCents,
              bonus_amount_cents: amountCents,
              notes: adjustment.notes || adjustment.remark || ''
            })
          }
        }
      }
    })
    
    // 提交調整數據（updateYearlyBonus 內部會自動重新載入）
    await payrollStore.updateYearlyBonus(selectedYear.value, adjustments)
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
    await payrollStore.loadYearlyBonus(currentYear)
  } catch (error) {
    showError(error.message || '載入年度績效獎金數據失敗')
  }
})
</script>

<style scoped>
.payroll-bonus-content {
  padding: 0;
}

.payroll-bonus-toolbar {
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

.toolbar-right {
  display: flex;
  align-items: center;
}
</style>

