<template>
  <a-card :title="`${employeeName} 的薪資設定`">
    <a-form
      ref="formRef"
      :model="formData"
      layout="vertical"
    >
      <!-- 底薪 -->
      <a-form-item label="底薪（元）">
        <a-input-number
          v-model:value="formData.baseSalary"
          :min="0"
          :step="1"
          placeholder="例如 40000"
          style="width: 100%"
        />
        <template #extra>
          <a-typography-text type="secondary" style="font-size: 12px">
            例如 40000
          </a-typography-text>
        </template>
      </a-form-item>

      <!-- 備註 -->
      <a-form-item label="備註">
        <a-textarea
          v-model:value="formData.notes"
          :rows="2"
          placeholder="薪資備註"
        />
        <template #extra>
          <a-typography-text type="secondary" style="font-size: 12px">
            薪資備註
          </a-typography-text>
        </template>
      </a-form-item>

      <!-- 分隔線 -->
      <a-divider />

      <!-- 薪資項目區域 -->
      <a-form-item label="薪資項目">
        <div style="margin-bottom: 12px">
          <a-button
            type="dashed"
            @click="handleAddItem"
            style="width: 100%"
          >
            <template #icon>
              <PlusOutlined />
            </template>
            新增項目
          </a-button>
        </div>
        <EmployeeSalaryItemsList
          :items="formData.items"
          :salaryItemTypes="salaryItemTypes"
          @update="handleItemsUpdate"
          @add="handleAddItem"
          @remove="handleRemoveItem"
        />
      </a-form-item>

      <!-- 操作按鈕 -->
      <a-form-item>
        <a-space>
          <a-button @click="handleCancel">
            取消
          </a-button>
          <a-button type="primary" @click="handleSave">
            <template #icon>
              <SaveOutlined />
            </template>
            儲存
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { PlusOutlined, SaveOutlined } from '@ant-design/icons-vue'
import { usePageAlert } from '@/composables/usePageAlert'
import dayjs from 'dayjs'
import EmployeeSalaryItemsList from './EmployeeSalaryItemsList.vue'

const props = defineProps({
  employee: {
    type: Object,
    default: null
  },
  salaryData: {
    type: Object,
    default: null
  },
  salaryItemTypes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['save', 'cancel', 'add-item'])

const { errorMessage, showError } = usePageAlert()

const formRef = ref(null)

// 員工姓名
const employeeName = computed(() => {
  if (!props.employee) return ''
  return props.employee.name || props.employee.userName || '-'
})

// 表單數據
const formData = ref({
  baseSalary: 0,
  notes: '',
  items: []
})

// 監聽 salaryData 變化，初始化表單
watch(() => props.salaryData, (newData) => {
  if (newData) {
    // 轉換底薪（可能是分，轉換為元）
    const baseSalaryCents = newData.baseSalaryCents || newData.base_salary_cents || 0
    // 如果 baseSalaryCents 存在且大於 0，則轉換為元；否則嘗試使用 baseSalary
    const baseSalary = baseSalaryCents > 0 ? baseSalaryCents / 100 : (newData.baseSalary || 0)
    
    formData.value = {
      baseSalary: baseSalary || 0,
      notes: newData.notes || newData.remark || '',
      items: (newData.items || newData.salaryItems || []).map(item => {
        const periodValue = item.period || item.payment_period || item.recurringType || item.recurring_type || 'monthly'
        const monthsValue = item.months || item.selected_months || item.recurringMonths || item.recurring_months || '[]'
        return {
          ...item,
          // 確保字段名統一
          itemTypeId: item.itemTypeId || item.item_type_id,
          item_type_id: item.itemTypeId || item.item_type_id,
          amountCents: item.amountCents || item.amount_cents || 0,
          amount_cents: item.amountCents || item.amount_cents || 0,
          period: periodValue,
          payment_period: periodValue,
          recurringType: periodValue,
          recurring_type: periodValue,
          effectiveDate: item.effectiveDate || item.effective_date || dayjs().format('YYYY-MM-01'),
          effective_date: item.effectiveDate || item.effective_date || dayjs().format('YYYY-MM-01'),
          expiryDate: item.expiryDate || item.expiry_date || '',
          expiry_date: item.expiryDate || item.expiry_date || '',
          months: monthsValue,
          selected_months: monthsValue,
          recurringMonths: monthsValue,
          recurring_months: monthsValue
        }
      })
    }
  } else {
    // 重置為默認值
    formData.value = {
      baseSalary: 0,
      notes: '',
      items: []
    }
  }
}, { immediate: true })

// 處理新增項目
const handleAddItem = () => {
  // 默認使用當前月份的第一天作為生效日期
  const currentMonth = dayjs().format('YYYY-MM-01')
  const newItem = {
    itemTypeId: undefined,
    item_type_id: undefined,
    amountCents: 0,
    amount_cents: 0,
    period: 'monthly',
    payment_period: 'monthly',
    recurringType: 'monthly',
    recurring_type: 'monthly',
    effectiveDate: currentMonth,
    effective_date: currentMonth,
    expiryDate: '',
    expiry_date: '',
    months: '[]',
    selected_months: '[]',
    recurringMonths: '[]',
    recurring_months: '[]'
  }
  formData.value.items.push(newItem)
  emit('add-item', newItem)
}

// 處理項目列表更新
const handleItemsUpdate = (newItems) => {
  formData.value.items = newItems
}

// 處理刪除項目
const handleRemoveItem = (index) => {
  formData.value.items.splice(index, 1)
}

// 處理保存
const handleSave = () => {
  // 驗證表單
  if (!formRef.value) return
  
  // 驗證薪資項目
  const invalidItems = formData.value.items.filter(item => {
    const itemTypeId = item.itemTypeId || item.item_type_id
    const amount = item.amountCents || item.amount_cents || 0
    return !itemTypeId || amount <= 0
  })
  
  if (invalidItems.length > 0) {
    showError('請填寫完整的薪資項目信息（項目類型和金額為必填，金額必須大於 0）')
    return
  }
  
  // 構建提交數據
  const submitData = {
    baseSalaryCents: Math.round((formData.value.baseSalary || 0) * 100),
    base_salary_cents: Math.round((formData.value.baseSalary || 0) * 100),
    notes: formData.value.notes || '',
    remark: formData.value.notes || '',
    items: formData.value.items.map(item => {
      const periodValue = item.period || item.payment_period || item.recurringType || item.recurring_type || 'monthly'
      const monthsValue = item.months || item.selected_months || item.recurringMonths || item.recurring_months || '[]'
      return {
        itemTypeId: item.itemTypeId || item.item_type_id,
        item_type_id: item.itemTypeId || item.item_type_id,
        amountCents: item.amountCents || item.amount_cents || 0,
        amount_cents: item.amountCents || item.amount_cents || 0,
        period: periodValue,
        payment_period: periodValue,
        recurringType: periodValue,
        recurring_type: periodValue,
        effectiveDate: item.effectiveDate || item.effective_date || dayjs().format('YYYY-MM-DD'),
        effective_date: item.effectiveDate || item.effective_date || dayjs().format('YYYY-MM-DD'),
        expiryDate: item.expiryDate || item.expiry_date || '',
        expiry_date: item.expiryDate || item.expiry_date || '',
        months: monthsValue,
        selected_months: monthsValue,
        recurringMonths: monthsValue,
        recurring_months: monthsValue
      }
    })
  }
  
  emit('save', submitData)
}

// 處理取消
const handleCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
:deep(.ant-card-head-title) {
  font-size: 16px;
  font-weight: 600;
}
</style>

