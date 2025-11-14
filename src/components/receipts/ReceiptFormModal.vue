<template>
  <a-modal
    v-model:open="modalVisible"
    title="新增收據"
    width="900px"
    :confirm-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <!-- 頁面提示 -->
    <PageAlerts
      v-model:success="successMessage"
      v-model:error="errorMessage"
    />
    
    <a-form :model="form" :rules="rules" ref="formRef" layout="vertical">
      <!-- 使用說明 -->
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #message>
          <div style="font-size: 13px; line-height: 1.6">
            <div style="font-weight: 600; margin-bottom: 8px">💼 收據與請款單使用說明</div>
            <div>
              <strong>1️⃣ 創建收據</strong>：選擇客戶、填寫日期和金額（必填），明細項目為選填<br>
              <strong>2️⃣ 列印請款單</strong>：向客戶請款時使用，會顯示「代辦費、規費、雜費」三欄明細<br>
              <strong>3️⃣ 列印收據</strong>：收到款項後使用，顯示總金額（兩聯：收稅聯、存查聯）<br>
              <strong>4️⃣ 記錄收款</strong>：到收據詳情頁點擊「新增收款」登記實際收款
            </div>
          </div>
        </template>
      </a-alert>
      
      <!-- 收據類型 -->
      <a-form-item label="收據類型" name="receiptType">
        <a-select v-model:value="form.receiptType" placeholder="請選擇收據類型">
          <a-select-option value="normal">正常收據</a-select-option>
          <a-select-option value="prepayment">預收款（訂金）</a-select-option>
          <a-select-option value="deposit">押金</a-select-option>
        </a-select>
      </a-form-item>
      
      <!-- 客戶選擇 -->
      <a-form-item label="選擇客戶（必填）" name="clientId">
        <a-select
          v-model:value="form.clientId"
          placeholder="請選擇客戶"
          show-search
          :filter-option="filterClientOption"
        >
          <a-select-option
            v-for="client in clients"
            :key="getClientId(client)"
            :value="getClientId(client)"
          >
            {{ getClientName(client) }}
            <span v-if="getClientTaxId(client)" style="color: #999">
              （{{ getClientTaxId(client) }}）
            </span>
          </a-select-option>
        </a-select>
      </a-form-item>
      
      <!-- 收據日期 -->
      <a-form-item label="開立日期" name="receiptDate">
        <a-date-picker
          v-model:value="form.receiptDate"
          placeholder="請選擇開立日期"
          style="width: 100%"
          format="YYYY-MM-DD"
        />
      </a-form-item>
      
      <!-- 到期日期 -->
      <a-form-item label="到期日（自動計算）">
        <a-date-picker
          v-model:value="form.dueDate"
          placeholder="請選擇到期日期"
          style="width: 100%"
          format="YYYY-MM-DD"
        />
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px">
          根據服務收費明細或預設30天
        </div>
      </a-form-item>
      
      <!-- 服務期間 -->
      <a-alert
        type="warning"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #message>
          <div>
            <div style="font-weight: 600; margin-bottom: 8px">📅 服務期間（必填）</div>
            <a-row :gutter="12">
              <a-col :span="12">
                <a-form-item label="服務開始月份" name="serviceStartMonth" style="margin-bottom: 0">
                  <a-date-picker
                    v-model:value="form.serviceStartMonth"
                    picker="month"
                    placeholder="請選擇開始月份"
                    style="width: 100%"
                    format="YYYY-MM"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="服務結束月份" name="serviceEndMonth" style="margin-bottom: 0">
                  <a-date-picker
                    v-model:value="form.serviceEndMonth"
                    picker="month"
                    placeholder="請選擇結束月份"
                    style="width: 100%"
                    format="YYYY-MM"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <div style="font-size: 12px; color: #6b7280; margin-top: 8px">
              💡 單月服務：兩個月份選擇相同；季度服務：選擇季度範圍；年度服務：選擇全年
            </div>
          </div>
        </template>
      </a-alert>
      
      <!-- 服務類型選擇 -->
      <a-form-item label="服務類型（選填）">
        <a-spin :spinning="servicesLoading">
          <a-checkbox-group v-model:value="form.selectedServiceTypes" style="width: 100%">
            <a-row :gutter="[8, 8]">
              <a-col :span="8" v-for="service in services" :key="getServiceId(service)">
                <a-checkbox :value="getServiceId(service)">
                  {{ getServiceName(service) }}
                </a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-spin>
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px">
          💡 如果是套餐收據，請勾選包含的服務類型（可多選）
        </div>
      </a-form-item>
      
      <!-- 明細項目 -->
      <a-form-item label="收據明細（選填）">
        <a-alert
          type="info"
          show-icon
          style="margin-bottom: 12px"
        >
          <template #message>
            <div style="font-size: 12px">
              <strong>📝 填寫說明：</strong>
              <ul style="margin: 4px 0 0 20px; line-height: 1.6">
                <li><strong>項目名稱</strong>：服務項目或費用名稱</li>
                <li><strong>代辦費</strong>：會計師或事務所的服務費用</li>
                <li><strong>規費</strong>：需繳交給政府機關的費用</li>
                <li><strong>雜費</strong>：其他相關費用</li>
              </ul>
            </div>
          </template>
        </a-alert>
        
        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #f9fafb">
          <div v-if="form.items.length === 0" style="text-align: center; color: #999; padding: 20px">
            暫無明細項目，點擊下方按鈕添加
          </div>
          <div v-else style="display: flex; flex-direction: column; gap: 12px">
            <div
              v-for="(item, index) in form.items"
              :key="item.id"
              style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
                <span style="font-weight: 600; font-size: 14px">📋 項目 {{ index + 1 }}</span>
                <a-button type="text" danger size="small" @click="removeItem(index)">
                  刪除
                </a-button>
              </div>
              <a-row :gutter="12">
                <a-col :span="24">
                  <a-form-item :label="`項目名稱`" style="margin-bottom: 12px">
                    <a-input
                      v-model:value="item.service_name"
                      placeholder="例如：公司登記、稅務申報"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="代辦費 (NT$)" style="margin-bottom: 0">
                    <a-input-number
                      v-model:value="item.service_fee"
                      :min="0"
                      :precision="0"
                      style="width: 100%"
                      placeholder="0"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="規費 (NT$)" style="margin-bottom: 0">
                    <a-input-number
                      v-model:value="item.government_fee"
                      :min="0"
                      :precision="0"
                      style="width: 100%"
                      placeholder="0"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="8">
                  <a-form-item label="雜費 (NT$)" style="margin-bottom: 0">
                    <a-input-number
                      v-model:value="item.miscellaneous_fee"
                      :min="0"
                      :precision="0"
                      style="width: 100%"
                      placeholder="0"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="備註" style="margin-bottom: 0">
                    <a-input
                      v-model:value="item.notes"
                      placeholder="選填，例如：含證書費用"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
              <div style="text-align: right; margin-top: 8px; padding: 8px; background: #f0fdf4; border-radius: 4px">
                <span style="color: #10b981; font-weight: 600">
                  小計：NT$ {{ formatCurrency(getItemTotal(item)) }}
                </span>
              </div>
            </div>
          </div>
          <a-button
            type="dashed"
            block
            style="margin-top: 12px"
            @click="addItem"
          >
            + 新增明細項目
          </a-button>
          <div style="color: #6b7280; font-size: 12px; margin-top: 8px">
            💡 如不填寫明細，將使用下方總金額（所有金額會顯示在「代辦費」欄位）
          </div>
        </div>
      </a-form-item>
      
      <!-- 總金額 -->
      <a-form-item label="總金額（必填）" name="totalAmount">
        <a-input-number
          v-model:value="form.totalAmount"
          :min="1"
          :precision="0"
          style="width: 100%"
          placeholder="例如 10000"
        />
        <div v-if="computedTotalAmount > 0" style="color: #6b7280; font-size: 12px; margin-top: 4px">
          明細項目總計：${{ formatCurrency(computedTotalAmount) }} （總金額將使用此數值）
        </div>
      </a-form-item>
      
      <!-- 扣繳金額 -->
      <a-form-item label="扣繳金額（選填）">
        <a-input-number
          v-model:value="form.withholdingAmount"
          :min="0"
          :precision="0"
          style="width: 100%"
          placeholder="預設為 0"
        />
        <div style="color: #6b7280; font-size: 12px; margin-top: 4px">
          💡 如有扣繳稅額請填寫，否則保持為 0
        </div>
      </a-form-item>
      
      <!-- 備註 -->
      <a-form-item label="備註">
        <a-textarea
          v-model:value="form.notes"
          placeholder="可留空"
          :rows="3"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import dayjs from 'dayjs'
import { formatCurrency } from '@/utils/formatters'
import { getId, getField } from '@/utils/fieldHelper'
import PageAlerts from '@/components/shared/PageAlerts.vue'
import { useSettingsApi } from '@/api/settings'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  clients: {
    type: Array,
    default: () => []
  },
  services: {
    type: Array,
    default: () => []
  },
  initialData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 表單引用
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

const formRef = ref(null)

// 提交狀態
const submitting = ref(false)

// 服務類型列表（從系統設置動態獲取）
const services = ref([])
const servicesLoading = ref(false)

// 從系統設置獲取服務類型
const loadServices = async () => {
  if (services.value.length > 0) return // 已載入則不重複載入
  
  servicesLoading.value = true
  try {
    const settingsApi = useSettingsApi()
    const response = await settingsApi.getServices()
    if (response.ok && Array.isArray(response.data)) {
      services.value = response.data
    }
  } catch (err) {
    console.error('載入服務類型失敗:', err)
    showError('載入服務類型失敗，請稍後再試')
  } finally {
    servicesLoading.value = false
  }
}

// 彈窗顯示狀態
const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 表單數據
const form = ref({
  receiptType: 'normal',
  clientId: null,
  receiptDate: dayjs(),
  dueDate: null,
  // 不再需要 serviceMonth
  serviceStartMonth: null,
  serviceEndMonth: null,
  selectedServiceTypes: [],
  items: [],
  totalAmount: null,
  withholdingAmount: 0,
  notes: ''
})

// 表單驗證規則
const rules = {
  clientId: [
    { required: true, message: '請選擇客戶', trigger: 'change' }
  ],
  receiptDate: [
    { required: true, message: '請選擇開立日期', trigger: 'change' }
  ],
  serviceStartMonth: [
    { required: true, message: '請選擇服務開始月份', trigger: 'change' }
  ],
  serviceEndMonth: [
    { required: true, message: '請選擇服務結束月份', trigger: 'change' }
  ],
  // 不再需要 serviceMonth，改用 service_start_month
  totalAmount: [
    { required: true, message: '請輸入總金額', trigger: 'blur' },
    { type: 'number', min: 1, message: '金額需大於 0', trigger: 'blur' }
  ]
}

// 計算總金額
const computedTotalAmount = computed(() => {
  return form.value.items.reduce((sum, item) => {
    return sum + (item.service_fee || 0) + (item.government_fee || 0) + (item.miscellaneous_fee || 0)
  }, 0)
})

// 監聽計算總金額變化，自動更新總金額
watch(computedTotalAmount, (val) => {
  if (val > 0) {
    form.value.totalAmount = val
  }
})

// 監聽初始數據變化
watch(() => props.initialData, (val) => {
  if (val) {
    // 預填充表單
    const clientId = getId(val, 'clientId', 'client_id', 'id')
    if (clientId) {
      form.value.clientId = clientId
    }
    // 使用 service_start_month 和 service_end_month
    const startMonth = getField(val, 'serviceStartMonth', 'service_start_month', null)
    const endMonth = getField(val, 'serviceEndMonth', 'service_end_month', null)
    if (startMonth) {
      form.value.serviceStartMonth = dayjs(startMonth)
    }
    if (endMonth) {
      form.value.serviceEndMonth = dayjs(endMonth)
    } else if (startMonth) {
      // 如果只有開始月份，結束月份設為相同
      form.value.serviceEndMonth = dayjs(startMonth)
    }
    if (val.amount) {
      form.value.totalAmount = val.amount
    }
    const serviceTypeIds = getField(val, 'serviceTypeIds', 'service_type_ids', null)
    if (serviceTypeIds) {
      form.value.selectedServiceTypes = Array.isArray(serviceTypeIds) ? serviceTypeIds : []
    }
  }
}, { immediate: true })

// 監聽彈窗顯示狀態，重置表單
watch(modalVisible, async (val) => {
  if (!val) {
    resetForm()
  } else {
    // 載入服務類型
    await loadServices()
    
    // 設置默認值
    const today = dayjs()
    form.value.receiptDate = today
    form.value.dueDate = today.add(30, 'day')
    // 不再需要 serviceMonth
    
    // 如果有初始數據，重新應用
    if (props.initialData) {
      const val = props.initialData
      const clientId = getId(val, 'clientId', 'client_id', 'id')
      if (clientId) {
        form.value.clientId = clientId
      }
      const month = getField(val, 'serviceMonth', 'service_month', null) || 
                    getField(val, 'billingMonth', 'billing_month', null) ||
                    getField(val, 'billingMonth', null, null)
      if (month) {
        const now = new Date()
        const year = now.getFullYear()
        const monthStr = String(month).padStart(2, '0')
        form.value.serviceStartMonth = dayjs(`${year}-${monthStr}`)
        form.value.serviceEndMonth = dayjs(`${year}-${monthStr}`)
        form.value.serviceMonth = dayjs(`${year}-${monthStr}`)
      }
      if (val.amount) {
        form.value.totalAmount = val.amount
      }
      const serviceTypeIds = getField(val, 'serviceTypeIds', 'service_type_ids', null)
      if (serviceTypeIds) {
        form.value.selectedServiceTypes = Array.isArray(serviceTypeIds) ? serviceTypeIds : []
      }
    }
  }
})

// 組件掛載時載入服務類型
onMounted(() => {
  loadServices()
})

// 添加明細項目
const addItem = () => {
  form.value.items.push({
    id: Date.now(),
    service_name: '',
    service_fee: 0,
    government_fee: 0,
    miscellaneous_fee: 0,
    notes: ''
  })
}

// 刪除明細項目
const removeItem = (index) => {
  form.value.items.splice(index, 1)
}

// 獲取項目總額
const getItemTotal = (item) => {
  return (item.service_fee || 0) + (item.government_fee || 0) + (item.miscellaneous_fee || 0)
}

// 客戶過濾函數
const filterClientOption = (input, option) => {
  const clientName = option.children?.[0]?.children || option.children || ''
  return clientName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 獲取客戶ID
const getClientId = (client) => {
  return getId(client, 'clientId', 'client_id', 'id')
}

// 獲取客戶名稱
const getClientName = (client) => {
  return getField(client, 'companyName', 'company_name', '') || getField(client, 'name', null, '')
}

// 獲取客戶統編
const getClientTaxId = (client) => {
  return getField(client, 'taxId', 'tax_id', '')
}

// 獲取服務ID
const getServiceId = (service) => {
  return getId(service, 'serviceId', 'service_id', 'id')
}

// 獲取服務名稱
const getServiceName = (service) => {
  return getField(service, 'serviceName', 'service_name', '') || getField(service, 'name', null, '')
}

// 提交表單
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    
    // 驗證服務期間
    if (form.value.serviceStartMonth && form.value.serviceEndMonth) {
      if (form.value.serviceStartMonth.isAfter(form.value.serviceEndMonth)) {
        showError('服務結束月份不能早於開始月份')
        return
      }
    }
    
    submitting.value = true
    
    // 構建 payload
    const payload = {
      receipt_type: form.value.receiptType,
      client_id: form.value.clientId,
      receipt_date: form.value.receiptDate.format('YYYY-MM-DD'),
      due_date: form.value.dueDate ? form.value.dueDate.format('YYYY-MM-DD') : null,
      // 不再需要 service_month
      service_start_month: form.value.serviceStartMonth ? form.value.serviceStartMonth.format('YYYY-MM') : null,
      service_end_month: form.value.serviceEndMonth ? form.value.serviceEndMonth.format('YYYY-MM') : null,
      total_amount: form.value.totalAmount,
      withholding_amount: form.value.withholdingAmount || 0,
      notes: form.value.notes || '',
      status: 'unpaid'
    }
    
    // 添加服務類型
    if (form.value.selectedServiceTypes.length > 0) {
      payload.service_type_ids = form.value.selectedServiceTypes
    }
    
    // 添加明細項目
    if (form.value.items.length > 0) {
      const validItems = form.value.items.filter(item => item.service_name && item.service_name.trim())
      if (validItems.length > 0) {
        payload.items = validItems.map(item => ({
          service_name: item.service_name.trim(),
          service_fee: item.service_fee || 0,
          government_fee: item.government_fee || 0,
          miscellaneous_fee: item.miscellaneous_fee || 0,
          notes: item.notes ? item.notes.trim() : ''
        }))
      }
    }
    
    emit('success', payload)
    
    showSuccess('收據建立成功')
    modalVisible.value = false
  } catch (error) {
    if (error.errorFields) {
      // 表單驗證錯誤
      return
    }
    console.error('提交表單失敗:', error)
    showError(error.message || '建立失敗，請稍後再試')
  } finally {
    submitting.value = false
  }
}

// 取消
const handleCancel = () => {
  modalVisible.value = false
}

// 重置表單
const resetForm = () => {
  form.value = {
    receiptType: 'normal',
    clientId: null,
    receiptDate: dayjs(),
    dueDate: dayjs().add(30, 'day'),
    // 不再需要 serviceMonth
    serviceStartMonth: null,
    serviceEndMonth: null,
    selectedServiceTypes: [],
    items: [],
    totalAmount: null,
    withholdingAmount: 0,
    notes: ''
  }
  formRef.value?.resetFields()
}
</script>

