<template>
  <a-modal
    v-model:open="modalVisible"
    :title="editingPlan ? '編輯收費計劃' : '新增收費計劃'"
    width="900px"
    :confirm-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form :model="formData" layout="vertical" ref="formRef">
      <!-- 選擇年度 -->
      <a-form-item label="年度" name="billing_year" :rules="[{ required: true, message: '請選擇年度' }]">
        <a-select
          v-model:value="formData.billing_year"
          placeholder="請選擇年度"
          style="width: 200px"
        >
          <a-select-option
            v-for="year in availableYears"
            :key="year"
            :value="year"
          >
            {{ year }}年
          </a-select-option>
        </a-select>
      </a-form-item>

      <!-- 關聯服務（多選） -->
      <a-form-item 
        label="關聯服務" 
        name="service_ids"
        :rules="[{ required: true, message: '請至少選擇一個定期服務' }]"
      >
        <a-select
          v-model:value="formData.service_ids"
          mode="multiple"
          placeholder="請選擇定期服務（可多選）"
          :options="recurringServiceOptions"
          :field-names="{ label: 'name', value: 'client_service_id' }"
          style="width: 100%"
        />
        <div style="margin-top: 4px; color: #6b7280; font-size: 12px">
          只顯示已保存的定期服務（service_type = 'recurring'）
        </div>
      </a-form-item>

      <!-- 勾選月份並填寫金額 -->
      <a-form-item 
        label="收費月份及金額" 
        name="month_amounts"
      >
        <div style="border: 1px solid #d9d9d9; border-radius: 4px; padding: 16px">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
            <span style="font-weight: 500">勾選月份並填寫金額：</span>
            <a-space>
              <a-button size="small" @click="selectAllMonths(true)">全選</a-button>
              <a-button size="small" @click="selectAllMonths(false)">全不選</a-button>
              <a-button size="small" @click="fillSameAmount">統一金額</a-button>
            </a-space>
          </div>
          <a-row :gutter="[12, 12]">
            <a-col :span="6" v-for="month in 12" :key="month">
              <div style="display: flex; align-items: center; gap: 8px">
                <a-checkbox
                  :checked="isMonthSelected(month)"
                  @change="(e) => handleMonthCheck(month, e.target.checked)"
                />
                <span style="width: 40px">{{ month }}月</span>
                <a-input-number
                  v-if="isMonthSelected(month)"
                  v-model:value="formData.month_amounts[month]"
                  :min="0"
                  :precision="2"
                  :placeholder="`${month}月金額`"
                  style="flex: 1"
                  size="small"
                />
              </div>
            </a-col>
          </a-row>
        </div>
      </a-form-item>

      <!-- 付款期限 -->
      <a-form-item label="付款期限（天）" name="payment_due_days">
        <a-input-number
          v-model:value="formData.payment_due_days"
          :min="1"
          :default-value="30"
          style="width: 200px"
        />
        <div style="margin-top: 4px; color: #6b7280; font-size: 12px">
          收費日期後多少天內需付款
        </div>
      </a-form-item>

      <!-- 備註 -->
      <a-form-item label="備註" name="notes">
        <a-textarea
          v-model:value="formData.notes"
          :rows="3"
          placeholder="選填：補充說明"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useClientAddStore } from '@/stores/clientAdd'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  editingPlan: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

const store = useClientAddStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

const formRef = ref(null)
const submitting = ref(false)

// 可用年度（當前年度及前後各2年）
const currentYear = new Date().getFullYear()
const availableYears = computed(() => {
  const years = []
  for (let i = -2; i <= 2; i++) {
    years.push(currentYear + i)
  }
  return years
})

// 表單數據
const formData = reactive({
  billing_year: currentYear,
  service_ids: [],
  month_amounts: {}, // { 1: 2000, 2: 2000, ... }
  payment_due_days: 30,
  notes: ''
})

// 只顯示已保存的定期服務（或在新增流程中的臨時定期服務）
const recurringServiceOptions = computed(() => {
  return store.tempServices
    .filter(service => {
      // 顯示定期服務（service_type = 'recurring' 或未設置 service_type）
      // 支持已保存的服務（有 client_service_id）和臨時服務（有 id）
      const isRecurring = service.service_type === 'recurring' || !service.service_type
      const hasId = service.client_service_id || service.id
      return isRecurring && hasId
    })
    .map(service => ({
      client_service_id: service.client_service_id || service.id, // 使用 client_service_id 或臨時 id
      name: service.name || service.service_name,
      service_id: service.service_id
    }))
})

// Modal visibility
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 檢查月份是否已選中
const isMonthSelected = (month) => {
  return formData.month_amounts.hasOwnProperty(month)
}

// 處理月份勾選
const handleMonthCheck = (month, checked) => {
  if (checked) {
    // 如果沒有金額，預設為 0
    if (!formData.month_amounts[month]) {
      formData.month_amounts[month] = 0
    }
  } else {
    // 取消勾選時移除該月份
    delete formData.month_amounts[month]
  }
}

// 全選/全不選月份
const selectAllMonths = (selectAll) => {
  if (selectAll) {
    for (let month = 1; month <= 12; month++) {
      if (!formData.month_amounts[month]) {
        formData.month_amounts[month] = 0
      }
    }
  } else {
    formData.month_amounts = {}
  }
}

// 統一金額
const fillSameAmount = () => {
  const selectedMonths = Object.keys(formData.month_amounts).map(Number)
  if (selectedMonths.length === 0) {
    showError('請先勾選至少一個月份')
    return
  }
  
  // 使用第一個月份的金額，如果為0則提示輸入
  const firstAmount = formData.month_amounts[selectedMonths[0]]
  if (!firstAmount || firstAmount <= 0) {
    showError('請先為第一個月份填寫金額')
    return
  }
  
  // 為所有選中的月份填寫相同金額
  selectedMonths.forEach(month => {
    formData.month_amounts[month] = firstAmount
  })
  showSuccess('已統一所有月份金額')
}

// 重置表單
const resetForm = () => {
  formData.billing_year = currentYear
  formData.service_ids = []
  formData.month_amounts = {}
  formData.payment_due_days = 30
  formData.notes = ''
  formRef.value?.resetFields()
}

// 監聽 visible 變化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (props.editingPlan) {
      // 編輯模式：填充現有數據
      formData.billing_year = props.editingPlan.billing_year || currentYear
      formData.service_ids = props.editingPlan.service_ids || []
      formData.month_amounts = props.editingPlan.month_amounts || {}
      formData.payment_due_days = props.editingPlan.payment_due_days || 30
      formData.notes = props.editingPlan.notes || ''
    } else {
      resetForm()
    }
  }
})

// 處理提交
const handleSubmit = async (e) => {
  // 阻止默認行為
  if (e) {
    e.preventDefault()
    e.stopPropagation()
  }

  // 手動驗證：檢查服務是否已選擇
  if (!formData.service_ids || formData.service_ids.length === 0) {
    showError('請至少選擇一個定期服務')
    return
  }

  // 手動驗證：檢查月份和金額
  const selectedMonths = Object.keys(formData.month_amounts).map(Number)
  if (selectedMonths.length === 0) {
    showError('請至少勾選一個月份並填寫金額')
    return
  }

  // 驗證每個月份的金額
  for (const [month, amount] of Object.entries(formData.month_amounts)) {
    if (!amount || amount <= 0) {
      showError(`請為 ${month}月 填寫有效的金額`)
      return
    }
  }

  submitting.value = true

  try {

    // 為每個服務和月份創建收費記錄
    for (const clientServiceId of formData.service_ids) {
      // 支持臨時服務（使用 id）和已保存的服務（使用 client_service_id）
      const service = store.tempServices.find(s => 
        s.client_service_id === clientServiceId || s.id === clientServiceId
      )
      if (!service) continue

      for (const month of selectedMonths) {
        const amount = formData.month_amounts[month]
        if (!amount || amount <= 0) continue

        const billingData = {
          id: `temp_${Date.now()}_${Math.random()}`,
          temp_service_id: service.id, // 臨時服務 ID
          client_service_id: service.client_service_id || service.id, // 已保存的服務 ID 或臨時 ID
          service_id: service.service_id,
          service_name: service.name || service.service_name,
          billing_type: 'recurring',
          billing_year: formData.billing_year,
          billing_month: month,
          billing_amount: amount,
          payment_due_days: formData.payment_due_days || 30,
          notes: formData.notes || ''
        }

        // 檢查是否已存在相同的收費記錄
        const existing = store.tempBillings.find(b => 
          (b.client_service_id === clientServiceId || b.temp_service_id === service.id) &&
          b.billing_year === formData.billing_year &&
          b.billing_month === month &&
          b.billing_type === 'recurring'
        )

        if (existing) {
          // 更新現有記錄
          store.updateTempBilling(existing.id, billingData)
        } else {
          // 添加新記錄
          store.addTempBilling(billingData)
        }
      }
    }

    showSuccess(props.editingPlan ? '收費計劃已更新' : '收費計劃已創建')
    emit('success')
    handleCancel()
  } catch (error) {
    showError(error.message || '操作失敗')
  } finally {
    submitting.value = false
  }
}

// 處理取消
const handleCancel = () => {
  emit('update:visible', false)
  resetForm()
}
</script>

<style scoped>
</style>

