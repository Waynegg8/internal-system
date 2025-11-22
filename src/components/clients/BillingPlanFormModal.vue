<template>
  <a-modal
    v-model:open="isOpen"
    :title="isEditing ? '編輯收費計劃' : '新增收費計劃'"
    :width="900"
    :confirm-loading="isSubmitting"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-form :model="formState" layout="vertical" ref="formRef">
      <!-- 收費類型選擇（編輯模式下禁用） -->
      <a-form-item
        label="收費類型"
        name="billingType"
        :rules="[{ required: true, message: '請選擇收費類型' }]"
      >
        <a-radio-group
          v-model:value="formState.billingType"
          @change="handleBillingTypeChange"
          :disabled="isEditing"
          aria-label="選擇收費類型"
        >
          <a-radio-button value="recurring">
            <div style="text-align: left">
              <div style="font-weight: 500">定期服務</div>
              <div style="font-size: 12px; color: #6b7280">每月固定金額</div>
            </div>
          </a-radio-button>
          <a-radio-button value="one-time">
            <div style="text-align: left">
              <div style="font-weight: 500">一次性服務</div>
              <div style="font-size: 12px; color: #6b7280">設立費、顧問費等</div>
            </div>
          </a-radio-button>
        </a-radio-group>
      </a-form-item>

      <!-- 定期服務表單 -->
      <template v-if="formState.billingType === 'recurring'">
        <!-- 關聯服務（多選） -->
        <a-form-item
          label="關聯服務"
          name="clientServiceIds"
          :rules="[{ required: true, message: '請至少選擇一個服務' }]"
        >
          <a-select
            v-model:value="formState.clientServiceIds"
            mode="multiple"
            placeholder="請選擇定期服務"
            :options="recurringServiceOptions"
            :disabled="recurringServiceOptions.length === 0"
            aria-label="選擇定期服務"
          >
            <template #notFoundContent>
              <span v-if="recurringServiceOptions.length === 0">
                該客戶尚無定期服務，請先在服務管理中新增
              </span>
              <span v-else>無可用服務</span>
            </template>
          </a-select>
          <template #help>
            <span style="color: #8c8c8c; font-size: 12px" v-if="recurringServiceOptions.length === 0">
              該客戶尚無定期服務
            </span>
          </template>
        </a-form-item>

        <!-- 付款期限 -->
        <a-form-item label="付款期限（天）" name="paymentDueDays">
          <a-input-number
            v-model:value="formState.paymentDueDays"
            placeholder="30"
            :min="1"
            style="width: 100%"
          />
        </a-form-item>

        <!-- 月份明細 -->
        <a-form-item
          label="月份明細"
          name="months"
          :rules="[{ required: true, message: '請至少選擇一個月份' }]"
        >
          <div style="margin-bottom: 8px">
            <a-space>
              <a-button size="small" @click="selectAllMonths(true)">全選</a-button>
              <a-button size="small" @click="selectAllMonths(false)">全不選</a-button>
            </a-space>
          </div>
          <a-checkbox-group 
            v-model:value="selectedMonths" 
            @change="handleMonthsChange"
            aria-label="選擇收費月份"
          >
            <a-row :gutter="[8, 8]">
              <a-col :span="6" v-for="month in 12" :key="month">
                <a-checkbox 
                  :value="month"
                  :aria-label="`選擇 ${month} 月`"
                >
                  {{ month }}月
                </a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>

        <!-- 月份金額輸入 -->
        <a-form-item
          v-if="selectedMonths.length > 0"
          label="月份金額"
          name="monthAmounts"
          :rules="[
            {
              validator: validateMonthAmounts,
              trigger: 'change'
            }
          ]"
        >
          <div style="margin-bottom: 8px">
            <a-space>
              <a-button size="small" @click="fillAllMonthsWithSameAmount">統一金額</a-button>
              <a-button size="small" @click="clearAllMonthAmounts">清空金額</a-button>
            </a-space>
          </div>
          <a-table
            :dataSource="monthAmountsData"
            :columns="monthAmountColumns"
            :pagination="false"
            size="small"
            :scroll="{ y: 300 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'amount'">
                <a-input-number
                  v-model:value="record.amount"
                  :min="0"
                  :precision="2"
                  :step="1000"
                  style="width: 100%"
                  placeholder="請輸入金額"
                  :aria-label="`${record.month}月金額`"
                  @change="updateMonthAmount(record.month, $event)"
                />
              </template>
              <template v-else-if="column.key === 'paymentDueDays'">
                <a-input-number
                  v-model:value="record.paymentDueDays"
                  :min="1"
                  :max="365"
                  style="width: 100%"
                  placeholder="預設"
                  :aria-label="`${record.month}月付款期限`"
                  @change="updateMonthPaymentDueDays(record.month, $event)"
                />
              </template>
            </template>
          </a-table>
          <div style="margin-top: 8px; font-size: 12px; color: #8c8c8c">
            <span>年度總計：<strong>{{ formatCurrency(calculateYearTotal) }}</strong></span>
          </div>
        </a-form-item>
      </template>

      <!-- 一次性服務表單 -->
      <template v-if="formState.billingType === 'one-time'">
        <!-- 關聯服務（單選） -->
        <a-form-item
          label="關聯服務"
          name="clientServiceIds"
          :rules="[{ required: true, message: '請選擇一個服務' }]"
        >
          <a-select
            v-model:value="formState.clientServiceIds"
            placeholder="請選擇一次性服務"
            :options="oneTimeServiceOptions"
            :disabled="oneTimeServiceOptions.length === 0"
            aria-label="選擇一次性服務"
          >
            <template #notFoundContent>
              <span v-if="oneTimeServiceOptions.length === 0">
                該客戶尚無一次性服務，請先在服務管理中新增
              </span>
              <span v-else>無可用服務</span>
            </template>
          </a-select>
          <template #help>
            <span style="color: #8c8c8c; font-size: 12px" v-if="oneTimeServiceOptions.length === 0">
              該客戶尚無一次性服務
            </span>
          </template>
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="項目名稱"
              name="description"
              :rules="[{ required: true, message: '請輸入項目名稱' }]"
            >
              <a-input
                v-model:value="formState.description"
                placeholder="例如：設立費"
                :maxlength="100"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item
              label="收費金額"
              name="billingAmount"
              :rules="[{ required: true, message: '請輸入金額' }]"
            >
              <a-input-number
                v-model:value="formState.billingAmount"
                placeholder="請輸入金額"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item
              label="收費日期"
              name="billingDate"
              :rules="[{ required: true, message: '請選擇收費日期' }]"
            >
              <a-date-picker
                v-model:value="formState.billingDate"
                placeholder="請選擇日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
                :disabled-date="(date) => {
                  const dateYear = date.year()
                  return dateYear !== props.year
                }"
                :picker="'date'"
                :format="'YYYY-MM-DD'"
                aria-label="收費日期選擇器"
              />
              <template #help>
                <span style="color: #8c8c8c; font-size: 12px">必須在 {{ props.year }} 年度內</span>
              </template>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="付款期限（天）" name="paymentDueDays">
              <a-input-number
                v-model:value="formState.paymentDueDays"
                placeholder="30"
                :min="1"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </template>

      <!-- 備註 -->
      <a-form-item label="備註" name="notes">
        <a-textarea
          v-model:value="formState.notes"
          placeholder="選填：補充說明"
          :rows="3"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useClientStore } from '@/stores/clients'
import { createBillingPlan, updateBillingPlan } from '@/api/billing'
import { getId, getField } from '@/utils/fieldHelper'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  },
  clientId: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  plan: {
    type: Object,
    default: null
  },
  isEditing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open', 'success', 'error'])

const clientStore = useClientStore()
const { currentClient } = storeToRefs(clientStore)

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const formRef = ref(null)
const isSubmitting = ref(false)

// 服務列表
const services = computed(() => {
  return currentClient.value?.services || []
})

// 定期服務選項
const recurringServiceOptions = computed(() => {
  return services.value
    .filter(s => getField(s, 'serviceType', 'service_type', '') === 'recurring')
    .map(s => ({
      label: getField(s, 'serviceName', 'service_name', '') || getField(s, 'name', null, ''),
      value: getId(s, 'clientServiceId', 'client_service_id', 'id')
    }))
})

// 一次性服務選項
const oneTimeServiceOptions = computed(() => {
  return services.value
    .filter(s => getField(s, 'serviceType', 'service_type', '') === 'one-time')
    .map(s => ({
      label: getField(s, 'serviceName', 'service_name', '') || getField(s, 'name', null, ''),
      value: getId(s, 'clientServiceId', 'client_service_id', 'id')
    }))
})

// 表單狀態
const formState = reactive({
  billingType: 'recurring',
  clientServiceIds: [],
  paymentDueDays: 30,
  months: [],
  description: '',
  billingDate: null,
  billingAmount: null,
  notes: ''
})

// 選中的月份
const selectedMonths = ref([])

// 月份金額資料
const monthAmountsData = computed(() => {
  return selectedMonths.value.map(month => {
    const existing = formState.months.find(m => m.month === month)
    return {
      month,
      amount: existing?.amount || 0,
      paymentDueDays: existing?.paymentDueDays || formState.paymentDueDays || 30
    }
  })
})

// 計算年度總計
const calculateYearTotal = computed(() => {
  return formState.months.reduce((sum, m) => sum + (m.amount || 0), 0)
})

// 月份金額表格列
const monthAmountColumns = [
  {
    title: '月份',
    dataIndex: 'month',
    key: 'month',
    width: 100,
    customRender: ({ text }) => `${text}月`
  },
  {
    title: '金額',
    key: 'amount',
    width: 200,
    align: 'right'
  },
  {
    title: '付款期限（天）',
    key: 'paymentDueDays',
    width: 150,
    align: 'center'
  }
]

// 處理收費類型變化
const handleBillingTypeChange = () => {
  // 重置表單字段
  if (formState.billingType === 'recurring') {
    formState.clientServiceIds = []
    formState.months = []
    selectedMonths.value = []
  } else {
    formState.clientServiceIds = null
    formState.description = ''
    formState.billingDate = null
    formState.billingAmount = null
  }
}

// 處理月份變化
const handleMonthsChange = (months) => {
  selectedMonths.value = months
  // 更新 formState.months：保留已選中的月份，移除未選中的月份
  const newMonths = months.map(month => {
    const existing = formState.months.find(m => m.month === month)
    return existing || { 
      month, 
      amount: 0, 
      paymentDueDays: formState.paymentDueDays || 30 
    }
  })
  formState.months = newMonths
}

// 更新月份金額
const updateMonthAmount = (month, amount) => {
  const index = formState.months.findIndex(m => m.month === month)
  if (index >= 0) {
    formState.months[index].amount = amount || 0
  } else {
    // 如果不存在，添加新的月份明細
    formState.months.push({
      month,
      amount: amount || 0,
      paymentDueDays: formState.paymentDueDays || 30
    })
  }
}

// 更新月份付款期限
const updateMonthPaymentDueDays = (month, days) => {
  const index = formState.months.findIndex(m => m.month === month)
  if (index >= 0) {
    formState.months[index].paymentDueDays = days || formState.paymentDueDays || 30
  } else {
    // 如果不存在，添加新的月份明細
    const existing = formState.months.find(m => m.month === month)
    if (existing) {
      existing.paymentDueDays = days || formState.paymentDueDays || 30
    }
  }
}

// 統一所有月份金額
const fillAllMonthsWithSameAmount = () => {
  const firstAmount = formState.months[0]?.amount || 0
  if (firstAmount > 0) {
    formState.months.forEach(m => {
      m.amount = firstAmount
    })
  }
}

// 清空所有月份金額
const clearAllMonthAmounts = () => {
  formState.months.forEach(m => {
    m.amount = 0
  })
}

// 驗證月份金額
const validateMonthAmounts = async () => {
  if (formState.billingType !== 'recurring') {
    return Promise.resolve()
  }
  
  if (formState.months.length === 0) {
    return Promise.reject(new Error('請至少選擇一個月份'))
  }
  
  const hasInvalidAmount = formState.months.some(m => !m.amount || m.amount <= 0)
  if (hasInvalidAmount) {
    return Promise.reject(new Error('請為所有選中的月份填寫金額'))
  }
  
  return Promise.resolve()
}

// 全選/全不選月份
const selectAllMonths = (selectAll) => {
  if (selectAll) {
    selectedMonths.value = Array.from({ length: 12 }, (_, i) => i + 1)
  } else {
    selectedMonths.value = []
  }
  handleMonthsChange(selectedMonths.value)
}

// 初始化表單（編輯模式）
const initForm = () => {
  if (props.isEditing && props.plan) {
    formState.billingType = props.plan.billingType || 'recurring'
    formState.paymentDueDays = props.plan.paymentDueDays || 30
    formState.notes = props.plan.notes || ''
    
    if (props.plan.billingType === 'recurring') {
      formState.clientServiceIds = props.plan.services?.map(s => s.clientServiceId) || []
      formState.months = props.plan.months?.map(m => ({
        month: m.month,
        amount: m.amount,
        paymentDueDays: m.paymentDueDays || formState.paymentDueDays
      })) || []
      selectedMonths.value = formState.months.map(m => m.month)
    } else {
      formState.clientServiceIds = props.plan.services?.[0]?.clientServiceId || null
      formState.description = props.plan.description || ''
      formState.billingDate = props.plan.billingDate || null
      formState.billingAmount = props.plan.yearTotal || null
    }
  } else {
    // 新增模式：重置表單
    formState.billingType = 'recurring'
    formState.clientServiceIds = []
    formState.paymentDueDays = 30
    formState.months = []
    formState.description = ''
    formState.billingDate = null
    formState.billingAmount = null
    formState.notes = ''
    selectedMonths.value = []
  }
}

// 監聽 Modal 打開
watch(() => props.open, (open) => {
  if (open) {
    initForm()
  }
})

// 確認提交
const handleOk = async () => {
  try {
    await formRef.value.validate()
    
    isSubmitting.value = true

    const payload = {
      billingYear: props.year,
      billingType: formState.billingType,
      paymentDueDays: formState.paymentDueDays || 30,
      notes: formState.notes || null
    }

    if (formState.billingType === 'recurring') {
      // 定期服務
      if (!Array.isArray(formState.clientServiceIds) || formState.clientServiceIds.length === 0) {
        await formRef.value.validateFields(['clientServiceIds'])
        throw new Error('請至少選擇一個服務')
      }
      if (formState.months.length === 0) {
        await formRef.value.validateFields(['months'])
        throw new Error('請至少選擇一個月份')
      }
      
      // 驗證所有月份都有金額
      const invalidMonths = formState.months.filter(m => !m.amount || m.amount <= 0)
      if (invalidMonths.length > 0) {
        await formRef.value.validateFields(['monthAmounts'])
        throw new Error(`請為 ${invalidMonths.map(m => `${m.month}月`).join('、')} 填寫金額`)
      }
      
      payload.clientServiceIds = formState.clientServiceIds
      payload.months = formState.months.map(m => ({
        month: m.month,
        amount: Number(m.amount) || 0,
        paymentDueDays: m.paymentDueDays || payload.paymentDueDays
      }))
    } else {
      // 一次性服務
      if (!formState.clientServiceIds) {
        await formRef.value.validateFields(['clientServiceIds'])
        throw new Error('請選擇一個服務')
      }
      if (!formState.description || formState.description.trim() === '') {
        await formRef.value.validateFields(['description'])
        throw new Error('請輸入項目名稱')
      }
      if (!formState.billingDate) {
        await formRef.value.validateFields(['billingDate'])
        throw new Error('請選擇收費日期')
      }
      if (!formState.billingAmount || formState.billingAmount <= 0) {
        await formRef.value.validateFields(['billingAmount'])
        throw new Error('請輸入有效的金額')
      }
      
      // 驗證收費日期是否在指定年度內
      const billingDateYear = new Date(formState.billingDate).getFullYear()
      if (billingDateYear !== props.year) {
        await formRef.value.validateFields(['billingDate'])
        throw new Error(`收費日期必須在 ${props.year} 年度內`)
      }
      
      payload.clientServiceIds = [formState.clientServiceIds]
      payload.billingDate = formState.billingDate
      payload.description = formState.description.trim()
      payload.months = [{
        month: new Date(formState.billingDate).getMonth() + 1,
        amount: Number(formState.billingAmount) || 0
      }]
    }

    if (props.isEditing) {
      await updateBillingPlan(props.clientId, props.plan.billingPlanId, payload)
    } else {
      await createBillingPlan(props.clientId, payload)
    }

    emit('success')
    isOpen.value = false
  } catch (error) {
    console.error('提交失敗:', error)
    if (error.errorFields) {
      // 表單驗證錯誤，Ant Design Form 會自動顯示
      return
    }
    // 發送錯誤事件給父組件
    if (error.message) {
      emit('error', error)
    }
    // 不關閉 Modal，讓用戶修正錯誤
  } finally {
    isSubmitting.value = false
  }
}

// 取消
const handleCancel = () => {
  isOpen.value = false
  formRef.value?.resetFields()
}
</script>

<style scoped>
/* 可以添加自定義樣式 */
</style>

