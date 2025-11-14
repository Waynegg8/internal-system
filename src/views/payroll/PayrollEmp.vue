<template>
  <div class="payroll-emp-content">
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
    
    <a-row :gutter="16">
      <!-- 左側：員工列表 -->
      <a-col :span="6">
        <div class="employee-list-section">
          <!-- 搜索輸入框 -->
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="搜索員工姓名或帳號"
            style="margin-bottom: 16px"
            @search="handleSearch"
            @change="handleSearchChange"
            allow-clear
          />
          
          <!-- 員工列表 -->
          <EmployeeList
            :employees="filteredEmployees"
            :selected-id="selectedEmployeeId"
            :loading="loading"
            @select="handleSelectEmployee"
          />
        </div>
      </a-col>

      <!-- 右側：薪資表單 -->
      <a-col :span="18">
        <template v-if="selectedEmployee">
          <EmployeeSalaryForm
            :employee="selectedEmployee"
            :salary-data="currentEmployeeSalary"
            :salary-item-types="salaryItemTypes"
            @save="handleSave"
            @cancel="handleCancel"
            @add-item="handleAddItem"
          />
        </template>
        <template v-else>
          <a-empty description="請選擇員工以查看或編輯薪資設定" />
        </template>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePayrollStore } from '@/stores/payroll'
import { usePageAlert } from '@/composables/usePageAlert'
import EmployeeList from '@/components/payroll/EmployeeList.vue'
import EmployeeSalaryForm from '@/components/payroll/EmployeeSalaryForm.vue'

const payrollStore = usePayrollStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 搜索關鍵詞
const searchKeyword = ref('')

// 從 store 獲取數據
const filteredEmployees = computed(() => payrollStore.filteredEmployees)
const selectedEmployeeId = computed(() => payrollStore.selectedEmployeeId)
const currentEmployeeSalary = computed(() => payrollStore.currentEmployeeSalary)
const salaryItemTypes = computed(() => payrollStore.salaryItemTypes)
const loading = computed(() => payrollStore.loading)

// 選中的員工
const selectedEmployee = computed(() => {
  if (!selectedEmployeeId.value) return null
  return filteredEmployees.value.find(emp => {
    const empId = emp.id || emp.userId || emp.user_id
    return empId === selectedEmployeeId.value
  })
})

// 處理搜索
const handleSearch = (keyword) => {
  payrollStore.setEmployeeSearchKeyword(keyword)
}

// 處理搜索變化（實時搜索）
const handleSearchChange = (e) => {
  const keyword = e.target.value
  payrollStore.setEmployeeSearchKeyword(keyword)
}

// 處理選擇員工
const handleSelectEmployee = async (userId) => {
  try {
    payrollStore.setSelectedEmployeeId(userId)
    await payrollStore.loadUserSalary(userId)
  } catch (error) {
    showError(error.message || '載入員工薪資失敗')
  }
}

// 處理保存
const handleSave = async (data) => {
  if (!selectedEmployeeId.value) return
  
  try {
    // 轉換數據格式（確保字段名正確）
    const payload = {
      base_salary_cents: data.baseSalaryCents || data.base_salary_cents || 0,
      notes: data.notes || data.remark || '',
      items: (data.items || []).map(item => ({
        item_type_id: item.itemTypeId || item.item_type_id,
        amount_cents: item.amountCents || item.amount_cents || 0,
        period: item.period || item.payment_period || 'monthly',
        effective_date: item.effectiveDate || item.effective_date,
        expiry_date: item.expiryDate || item.expiry_date || null,
        months: item.months || item.selected_months || '[]'
      }))
    }
    
    await payrollStore.updateUserSalary(selectedEmployeeId.value, payload)
    showSuccess('儲存成功')
  } catch (error) {
    showError(error.message || '儲存失敗')
  }
}

// 處理取消
const handleCancel = () => {
  payrollStore.setSelectedEmployeeId(null)
}

// 處理新增項目
const handleAddItem = () => {
  // 這個事件由 EmployeeSalaryForm 內部處理
  // 這裡可以添加額外的邏輯
}

// 載入數據
onMounted(async () => {
  try {
    // 並行載入員工列表和薪資項目類型列表
    await Promise.all([
      payrollStore.loadAllUsers(),
      payrollStore.loadSalaryItemTypes()
    ])
  } catch (error) {
    showError(error.message || '載入數據失敗')
  }
})
</script>

<style scoped>
.payroll-emp-content {
  padding: 0;
}

.employee-list-section {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
}
</style>

