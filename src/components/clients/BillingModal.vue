<template>
  <a-modal
    v-model:open="modalVisible"
    :title="editingBilling ? '編輯收費' : '新增收費'"
    width="800px"
    :confirm-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
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
    
    <a-form :model="formData" layout="vertical">
      <!-- 選擇服務 -->
      <a-form-item label="選擇服務" required>
        <a-select
          v-model:value="formData.temp_service_id"
          placeholder="請選擇服務"
          :options="serviceOptions"
          :field-names="{ label: 'name', value: 'id' }"
          :disabled="editingBilling"
        />
      </a-form-item>

      <!-- 收費類型選擇 -->
      <a-form-item label="收費類型" required>
        <a-radio-group v-model:value="formData.billing_type" @change="handleBillingTypeChange">
          <a-radio-button value="monthly">
            <div style="text-align: left">
              <div style="font-weight: 500">按月收費</div>
              <div style="font-size: 12px; color: #6b7280">每月固定金額</div>
            </div>
          </a-radio-button>
          <a-radio-button value="one-time">
            <div style="text-align: left">
              <div style="font-weight: 500">一次性收費</div>
              <div style="font-size: 12px; color: #6b7280">設立費、顧問費等</div>
            </div>
          </a-radio-button>
        </a-radio-group>
      </a-form-item>

      <!-- 按月收費表單 -->
      <div v-if="formData.billing_type === 'monthly'">
        <a-divider orientation="left">批量設定收費</a-divider>
        <p style="margin-bottom: 16px; color: #6b7280; font-size: 13px">
          一次設定多個月份的收費金額
        </p>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="每月金額" required>
              <a-input-number
                v-model:value="formData.billing_amount"
                placeholder="2000"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="付款期限（天）">
              <a-input-number
                v-model:value="formData.payment_due_days"
                :min="1"
                :default-value="30"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="月份範圍">
              <a-select v-model:value="monthRange" @change="handleMonthRangeChange">
                <a-select-option value="all">全年（1-12月）</a-select-option>
                <a-select-option value="custom">自選月份</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 月份複選框 -->
        <div v-if="monthRange === 'custom'" style="margin-top: 16px">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
            <span style="font-weight: 500">選擇月份：</span>
            <a-space>
              <a-button size="small" @click="selectAllMonths(true)">全選</a-button>
              <a-button size="small" @click="selectAllMonths(false)">全不選</a-button>
            </a-space>
          </div>
          <a-checkbox-group v-model:value="selectedMonths" style="width: 100%">
            <a-row :gutter="[8, 8]">
              <a-col :span="4" v-for="month in 12" :key="month">
                <a-checkbox :value="month">{{ month }}月</a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </div>
      </div>

      <!-- 一次性收費表單 -->
      <div v-if="formData.billing_type === 'one-time'">
        <a-divider orientation="left">設定一次性收費</a-divider>
        <p style="margin-bottom: 16px; color: #6b7280; font-size: 13px">
          例如：設立費、顧問費、專案費用等
        </p>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="項目名稱" required>
              <a-input
                v-model:value="formData.description"
                placeholder="例如：設立費"
                :maxlength="100"
              />
              <div style="margin-top: 4px; color: #6b7280; font-size: 12px">
                用於識別這筆收費
              </div>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="收費金額" required>
              <a-input-number
                v-model:value="formData.billing_amount"
                placeholder="5000"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="收費日期" required>
              <a-date-picker
                v-model:value="billingDate"
                style="width: 100%"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="付款期限（天）">
              <a-input-number
                v-model:value="formData.payment_due_days"
                :min="1"
                :default-value="30"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="備註">
          <a-textarea
            v-model:value="formData.notes"
            :rows="3"
            placeholder="選填：補充說明"
          />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import dayjs from 'dayjs'
import { useClientAddStore } from '@/stores/clientAdd'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  editingBilling: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

const store = useClientAddStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// Modal visibility (computed for v-model:open)
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 本地狀態
const submitting = ref(false)
const monthRange = ref('all')
const selectedMonths = ref([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
const billingDate = ref(null)

const formData = ref({
  temp_service_id: null,
  billing_type: 'monthly',
  billing_amount: null,
  payment_due_days: 30,
  billing_month: null,
  billing_date: null,
  description: '',
  notes: ''
})

// 服務選項
const serviceOptions = computed(() => {
  return store.tempServices.map(service => ({
    id: service.id,
    name: service.name || service.service_name,
    service_id: service.service_id
  }))
})

// 監聽 visible 變化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (props.editingBilling) {
      // 編輯模式：填充現有數據
      formData.value = {
        temp_service_id: props.editingBilling.temp_service_id,
        billing_type: props.editingBilling.billing_type || 'monthly',
        billing_amount: props.editingBilling.billing_amount,
        payment_due_days: props.editingBilling.payment_due_days || 30,
        billing_month: props.editingBilling.billing_month,
        billing_date: props.editingBilling.billing_date,
        description: props.editingBilling.description || '',
        notes: props.editingBilling.notes || ''
      }
      if (props.editingBilling.billing_date) {
        billingDate.value = dayjs(props.editingBilling.billing_date)
      }
      if (props.editingBilling.billing_type === 'monthly') {
        monthRange.value = 'all'
        selectedMonths.value = props.editingBilling.billing_month
          ? [props.editingBilling.billing_month]
          : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      }
    } else {
      // 新增模式：重置表單
      resetForm()
    }
  }
})

// 監聽 billingDate 變化
watch(billingDate, (newVal) => {
  if (newVal) {
    formData.value.billing_date = dayjs(newVal).format('YYYY-MM-DD')
  } else {
    formData.value.billing_date = null
  }
})

// 重置表單
const resetForm = () => {
  formData.value = {
    temp_service_id: null,
    billing_type: 'monthly',
    billing_amount: null,
    payment_due_days: 30,
    billing_month: null,
    billing_date: null,
    description: '',
    notes: ''
  }
  monthRange.value = 'all'
  selectedMonths.value = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  billingDate.value = null
}

// 處理收費類型變化
const handleBillingTypeChange = () => {
  if (formData.value.billing_type === 'monthly') {
    monthRange.value = 'all'
    selectedMonths.value = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  }
}

// 處理月份範圍變化
const handleMonthRangeChange = (value) => {
  if (value === 'all') {
    selectedMonths.value = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  }
}

// 全選/全不選月份
const selectAllMonths = (selectAll) => {
  if (selectAll) {
    selectedMonths.value = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  } else {
    selectedMonths.value = []
  }
}

// 處理提交
const handleSubmit = async () => {
  // 驗證
  if (!formData.value.temp_service_id) {
    showError('請選擇服務')
    return
  }

  if (!formData.value.billing_amount || formData.value.billing_amount <= 0) {
    showError('請輸入有效的收費金額')
    return
  }

  if (formData.value.billing_type === 'monthly') {
    if (monthRange.value === 'custom' && selectedMonths.value.length === 0) {
      showError('請至少選擇一個月份')
      return
    }

    // 獲取服務信息
    const service = store.tempServices.find(s => s.id === formData.value.temp_service_id)
    if (!service) {
      showError('找不到服務信息')
      return
    }

    // 批量創建按月收費記錄
    const months = monthRange.value === 'all' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : selectedMonths.value

    for (const month of months) {
      const billingData = {
        temp_service_id: formData.value.temp_service_id,
        service_id: service.service_id,
        service_name: service.name || service.service_name,
        billing_type: 'monthly',
        billing_month: month,
        billing_amount: formData.value.billing_amount,
        payment_due_days: formData.value.payment_due_days || 30,
        notes: formData.value.notes || ''
      }

      if (props.editingBilling && props.editingBilling.billing_month === month) {
        // 更新現有記錄
        store.updateTempBilling(props.editingBilling.id, billingData)
      } else {
        // 添加新記錄
        store.addTempBilling(billingData)
      }
    }
  } else if (formData.value.billing_type === 'one-time') {
    if (!formData.value.description || formData.value.description.trim() === '') {
      showError('請輸入項目名稱')
      return
    }

    if (!formData.value.billing_date) {
      showError('請選擇收費日期')
      return
    }

    // 獲取服務信息
    const service = store.tempServices.find(s => s.id === formData.value.temp_service_id)
    if (!service) {
      showError('找不到服務信息')
      return
    }

    const billingData = {
      temp_service_id: formData.value.temp_service_id,
      service_id: service.service_id,
      service_name: service.name || service.service_name,
      billing_type: 'one-time',
      billing_date: formData.value.billing_date,
      description: formData.value.description,
      billing_amount: formData.value.billing_amount,
      payment_due_days: formData.value.payment_due_days || 30,
      notes: formData.value.notes || ''
    }

    if (props.editingBilling) {
      // 更新現有記錄
      store.updateTempBilling(props.editingBilling.id, billingData)
    } else {
      // 添加新記錄
      store.addTempBilling(billingData)
    }
  }

  showSuccess(props.editingBilling ? '收費記錄已更新' : '收費記錄已添加')
  emit('success')
  handleCancel()
}

// 處理取消
const handleCancel = () => {
  emit('update:visible', false)
  resetForm()
}
</script>

<style scoped>
</style>

