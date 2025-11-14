<template>
  <a-modal
    v-model:open="modalVisible"
    title="編輯收據"
    width="900px"
    :confirm-loading="submitting"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="客戶" name="clientId">
              <a-select
                v-model:value="form.clientId"
                placeholder="請選擇客戶"
                show-search
                :filter-option="filterClientOption"
                :disabled="loading"
              >
                <a-select-option
                  v-for="client in clients"
                  :key="getClientId(client)"
                  :value="getClientId(client)"
                >
                  {{ getClientName(client) }}
                  <span v-if="getClientTaxId(client)" style="color: #94a3b8">（{{ getClientTaxId(client) }}）</span>
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="收據類型" name="receiptType">
              <a-select v-model:value="form.receiptType">
                <a-select-option value="normal">一般收據</a-select-option>
                <a-select-option value="prepayment">預收款</a-select-option>
                <a-select-option value="deposit">押金</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="開立日期" name="receiptDate">
              <a-date-picker v-model:value="form.receiptDate" format="YYYY-MM-DD" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="到期日期" name="dueDate">
              <a-date-picker v-model:value="form.dueDate" format="YYYY-MM-DD" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="應計月份" name="serviceMonth">
              <a-date-picker
                v-model:value="form.serviceMonth"
                picker="month"
                format="YYYY-MM"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="服務開始月份" name="serviceStartMonth">
              <a-date-picker
                v-model:value="form.serviceStartMonth"
                picker="month"
                format="YYYY-MM"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="服務結束月份" name="serviceEndMonth">
              <a-date-picker
                v-model:value="form.serviceEndMonth"
                picker="month"
                format="YYYY-MM"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="服務類型">
          <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #f8fafc">
            <a-spin :spinning="loading">
              <a-checkbox-group v-model:value="form.selectedServiceTypes" style="width: 100%">
                <a-row :gutter="[8, 8]">
                  <a-col v-for="service in services" :key="getServiceId(service)" :span="8">
                    <a-checkbox :value="getServiceId(service)">
                      {{ getServiceName(service) }}
                    </a-checkbox>
                  </a-col>
                </a-row>
              </a-checkbox-group>
            </a-spin>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 8px">
              未勾選則表示此收據未綁定特定服務類型。
            </div>
          </div>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="收據狀態" name="status">
              <a-select v-model:value="form.status">
                <a-select-option value="unpaid">未付款</a-select-option>
                <a-select-option value="partial">部分付款</a-select-option>
                <a-select-option value="paid">已付款</a-select-option>
                <a-select-option value="overdue">逾期</a-select-option>
                <a-select-option value="cancelled">已作廢</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="總金額" name="totalAmount">
              <a-input-number
                v-model:value="form.totalAmount"
                :min="1"
                :precision="0"
                style="width: 100%"
              />
              <div v-if="computedTotalAmount > 0" style="font-size: 12px; color: #64748b; margin-top: 4px">
                明細總計：NT$ {{ formatCurrency(computedTotalAmount) }}
              </div>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="收據明細">
          <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #f8fafc">
            <div v-if="form.items.length === 0" style="text-align: center; color: #94a3b8; padding: 16px">
              尚未新增明細項目
            </div>
            <div v-else style="display: flex; flex-direction: column; gap: 12px">
              <div
                v-for="(item, index) in form.items"
                :key="item.localId"
                style="background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px"
              >
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
                  <span style="font-weight: 600">項目 {{ index + 1 }}</span>
                  <a-button type="text" danger @click="removeItem(index)">刪除</a-button>
                </div>
                <a-row :gutter="12">
                  <a-col :span="24">
                    <a-form-item :label="`項目名稱`" :name="['items', index, 'service_name']">
                      <a-input v-model:value="item.service_name" placeholder="例如：帳務服務" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="服務費" :name="['items', index, 'service_fee']">
                      <a-input-number v-model:value="item.service_fee" :min="0" :precision="0" style="width: 100%" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="規費" :name="['items', index, 'government_fee']">
                      <a-input-number v-model:value="item.government_fee" :min="0" :precision="0" style="width: 100%" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="8">
                    <a-form-item label="雜費" :name="['items', index, 'miscellaneous_fee']">
                      <a-input-number v-model:value="item.miscellaneous_fee" :min="0" :precision="0" style="width: 100%" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="24">
                    <a-form-item label="備註" :name="['items', index, 'notes']">
                      <a-input v-model:value="item.notes" />
                    </a-form-item>
                  </a-col>
                </a-row>
                <div style="text-align: right; color: #0f172a; font-weight: 600">
                  小計：NT$ {{ formatCurrency(getItemTotal(item)) }}
                </div>
              </div>
            </div>
            <a-button type="dashed" block style="margin-top: 12px" @click="addItem">
              + 新增明細項目
            </a-button>
          </div>
        </a-form-item>

        <a-form-item label="備註">
          <a-textarea v-model:value="form.notes" :rows="3" />
        </a-form-item>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import dayjs from 'dayjs'
import { useClientApi } from '@/api/clients'
import { useSettingsApi } from '@/api/settings'
import { formatCurrency } from '@/utils/formatters'
import { getField, getId } from '@/utils/fieldHelper'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  receipt: {
    type: Object,
    default: null
  },
  receiptId: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['update:visible', 'success'])

const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const formRef = ref(null)
const submitting = ref(false)
const loading = ref(false)

const clients = ref([])
const services = ref([])

const form = ref(createDefaultForm())

const rules = {
  clientId: [{ required: true, message: '請選擇客戶', trigger: 'change' }],
  receiptDate: [{ required: true, message: '請選擇開立日期', trigger: 'change' }],
  serviceMonth: [{ required: true, message: '請選擇應計月份', trigger: 'change' }],
  totalAmount: [{ required: true, message: '請輸入總金額', trigger: 'blur' }]
}

function createDefaultForm() {
  return {
    clientId: null,
    receiptType: 'normal',
    receiptDate: dayjs(),
    dueDate: dayjs(),
    serviceMonth: dayjs(),
    serviceStartMonth: null,
    serviceEndMonth: null,
    status: 'unpaid',
    totalAmount: 0,
    notes: '',
    selectedServiceTypes: [],
    items: []
  }
}

const computedTotalAmount = computed(() => {
  return form.value.items.reduce((sum, item) => sum + getItemTotal(item), 0)
})

watch(computedTotalAmount, (val) => {
  if (val > 0) {
    form.value.totalAmount = val
  }
})

watch(
  () => props.receipt,
  (receipt) => {
    if (!receipt) return
    populateForm(receipt)
  },
  { immediate: true }
)

watch(modalVisible, async (val) => {
  if (val) {
    if (!props.receipt) return
    loading.value = true
    try {
      if (clients.value.length === 0) {
        await loadClients()
      }
      if (services.value.length === 0) {
        await loadServices()
      }
      populateForm(props.receipt)
      formRef.value?.clearValidate()
    } finally {
      loading.value = false
    }
  }
})

function populateForm(receipt) {
  const clone = createDefaultForm()
  clone.clientId = getId(receipt, 'clientId', 'client_id', 'clientId')
  clone.receiptType = receipt.receipt_type || receipt.receiptType || 'normal'
  clone.status = receipt.status || 'unpaid'
  clone.notes = receipt.notes || ''
  clone.totalAmount = Number(receipt.total_amount || receipt.totalAmount || 0)
  const selectedServiceTypeIds = receipt.service_type_ids || receipt.serviceTypeIds || []
  clone.selectedServiceTypes = Array.isArray(selectedServiceTypeIds) ? selectedServiceTypeIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : []

  const receiptDate = receipt.receipt_date || receipt.receiptDate
  if (receiptDate) clone.receiptDate = dayjs(receiptDate)
  const dueDate = receipt.due_date || receipt.dueDate
  if (dueDate) clone.dueDate = dayjs(dueDate)
  const serviceMonth = receipt.service_month || receipt.serviceMonth
  if (serviceMonth) clone.serviceMonth = dayjs(serviceMonth)
  const serviceStartMonth = receipt.service_start_month || receipt.serviceStartMonth
  if (serviceStartMonth) clone.serviceStartMonth = dayjs(serviceStartMonth)
  const serviceEndMonth = receipt.service_end_month || receipt.serviceEndMonth
  if (serviceEndMonth) clone.serviceEndMonth = dayjs(serviceEndMonth)

  const receiptItems = receipt.items || receipt.receipt_items || []
  clone.items = receiptItems.map((item) => ({
    localId: `${item.item_id || Date.now()}-${Math.random()}`,
    service_name: item.service_name || item.serviceName || '',
    service_fee: Number(item.service_fee || item.serviceFee || item.subtotal || 0),
    government_fee: Number(item.government_fee || item.governmentFee || 0),
    miscellaneous_fee: Number(item.miscellaneous_fee || item.miscellaneousFee || 0),
    notes: item.notes || '',
    quantity: Number(item.quantity || 1)
  }))

  if (clone.items.length === 0) {
    clone.items.push(createEmptyItem())
  }

  form.value = clone
}

function createEmptyItem() {
  return {
    localId: `${Date.now()}-${Math.random()}`,
    service_name: '',
    service_fee: 0,
    government_fee: 0,
    miscellaneous_fee: 0,
    notes: '',
    quantity: 1
  }
}

async function loadClients() {
  const response = await useClientApi().fetchClients({ perPage: 1000 })
  if (response.data && Array.isArray(response.data)) {
    clients.value = response.data
  }
}

async function loadServices() {
  try {
    const settingsApi = useSettingsApi()
    const response = await settingsApi.getServices()
    if (response.ok && Array.isArray(response.data)) {
      services.value = response.data
    }
  } catch (err) {
    console.error('載入服務類型失敗:', err)
  }
}

function addItem() {
  form.value.items.push(createEmptyItem())
}

function removeItem(index) {
  form.value.items.splice(index, 1)
  if (form.value.items.length === 0) {
    addItem()
  }
}

function getItemTotal(item) {
  return (item.service_fee || 0) + (item.government_fee || 0) + (item.miscellaneous_fee || 0)
}

function filterClientOption(input, option) {
  const label = option.children?.[0]?.children || option.children || ''
  return String(label).toLowerCase().includes(input.toLowerCase())
}

const getClientId = (client) => getId(client, 'clientId', 'client_id', 'id')
const getClientName = (client) => getField(client, 'companyName', 'company_name', '') || getField(client, 'name', null, '')
const getClientTaxId = (client) => getField(client, 'taxId', 'tax_id', '')
const getServiceId = (service) => getId(service, 'serviceId', 'service_id', 'id')
const getServiceName = (service) => getField(service, 'serviceName', 'service_name', '') || getField(service, 'name', null, '')

async function handleSubmit() {
  try {
    await formRef.value.validate()

    if (form.value.serviceStartMonth && form.value.serviceEndMonth && form.value.serviceStartMonth.isAfter(form.value.serviceEndMonth)) {
      throw new Error('服務結束月份不能早於開始月份')
    }

    submitting.value = true

    const payload = {
      client_id: form.value.clientId,
      receipt_type: form.value.receiptType,
      receipt_date: form.value.receiptDate.format('YYYY-MM-DD'),
      due_date: form.value.dueDate ? form.value.dueDate.format('YYYY-MM-DD') : null,
      service_month: form.value.serviceMonth ? form.value.serviceMonth.format('YYYY-MM') : null,
      service_start_month: form.value.serviceStartMonth ? form.value.serviceStartMonth.format('YYYY-MM') : null,
      service_end_month: form.value.serviceEndMonth ? form.value.serviceEndMonth.format('YYYY-MM') : null,
      status: form.value.status,
      notes: form.value.notes,
      total_amount: form.value.totalAmount,
      items: form.value.items
        .filter((item) => item.service_name && getItemTotal(item) > 0)
        .map((item) => ({
          service_name: item.service_name,
          service_fee: item.service_fee || 0,
          government_fee: item.government_fee || 0,
          miscellaneous_fee: item.miscellaneous_fee || 0,
          quantity: item.quantity || 1,
          notes: item.notes || ''
        })),
      service_type_ids: form.value.selectedServiceTypes
    }

    emit('success', payload)
    modalVisible.value = false
  } catch (err) {
    if (err?.errorFields) return
    console.error('[EditReceiptModal] submit failed:', err)
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  modalVisible.value = false
}
</script>

