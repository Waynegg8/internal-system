<template>
  <a-modal
    v-model:open="modalVisible"
    :title="isEdit ? '編輯月度記錄' : '新增月度記錄'"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    width="600px"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
    >
      <a-form-item label="成本項目" name="costTypeId">
        <a-select
          v-model:value="formData.costTypeId"
          placeholder="請選擇成本項目"
        >
          <a-select-option
            v-for="costType in enabledCostTypes"
            :key="getCostTypeId(costType)"
            :value="getCostTypeId(costType)"
          >
            {{ getCostTypeName(costType) }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="年份" name="year">
            <a-input-number
              v-model:value="formData.year"
              :min="1900"
              :max="2100"
              style="width: 100%"
              placeholder="請輸入年份"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="月份" name="month">
            <a-select
              v-model:value="formData.month"
              placeholder="請選擇月份"
            >
              <a-select-option
                v-for="m in 12"
                :key="m"
                :value="m"
              >
                {{ m }}月
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="金額" name="amount">
        <a-input-number
          v-model:value="formData.amount"
          :min="1"
          :precision="0"
          style="width: 100%"
          placeholder="請輸入金額"
        />
      </a-form-item>

      <a-form-item label="備註" name="notes">
        <a-input
          v-model:value="formData.notes"
          placeholder="請輸入備註（可選）"
          :maxlength="500"
          show-count
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  record: {
    type: Object,
    default: null
  },
  costTypes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const formRef = ref(null)
const loading = ref(false)

// 表單數據
const formData = ref({
  costTypeId: undefined,
  year: undefined,
  month: undefined,
  amount: undefined,
  notes: ''
})

// 控制彈窗顯示
const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 是否為編輯模式
const isEdit = computed(() => !!props.record)

// 過濾出啟用的成本項目類型
const enabledCostTypes = computed(() => {
  return props.costTypes.filter(costType => {
    const isActive = costType.isActive !== undefined ? costType.isActive : costType.is_active
    return isActive !== false
  })
})

// 表單驗證規則
const rules = {
  costTypeId: [
    { required: true, message: '請選擇成本項目', trigger: 'change' }
  ],
  year: [
    { required: true, message: '請輸入年份', trigger: 'blur' },
    { type: 'number', min: 1900, max: 2100, message: '年份必須在1900-2100之間', trigger: 'blur' }
  ],
  month: [
    { required: true, message: '請選擇月份', trigger: 'change' },
    { type: 'number', min: 1, max: 12, message: '月份必須在1-12之間', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '請輸入金額', trigger: 'blur' },
    { type: 'number', min: 1, message: '金額必須大於0', trigger: 'blur' }
  ],
  notes: [
    { max: 500, message: '備註不能超過500個字符', trigger: 'blur' }
  ]
}

// 獲取成本項目 ID
const getCostTypeId = (costType) => {
  return costType.id || costType.costTypeId || costType.cost_type_id || costType.costType_id
}

// 獲取成本項目名稱
const getCostTypeName = (costType) => {
  return costType.costName || costType.cost_name || ''
}

// 監聽 record 變化，填充表單
watch(() => props.record, (record) => {
  if (record) {
    formData.value = {
      costTypeId: record.costTypeId || record.cost_type_id || record.costType_id || undefined,
      year: record.year || undefined,
      month: record.month || undefined,
      amount: record.amount || undefined,
      notes: record.notes || ''
    }
  }
}, { immediate: true })

// 監聽 visible 變化，重置表單
watch(() => props.visible, (val) => {
  if (val) {
    if (props.record) {
      // 編輯模式：填充表單
      const record = props.record
      formData.value = {
        costTypeId: record.costTypeId || record.cost_type_id || record.costType_id || undefined,
        year: record.year || undefined,
        month: record.month || undefined,
        amount: record.amount || undefined,
        notes: record.notes || ''
      }
    } else {
      // 新增模式：重置表單
      formData.value = {
        costTypeId: undefined,
        year: undefined,
        month: undefined,
        amount: undefined,
        notes: ''
      }
    }
    // 清除驗證狀態
    formRef.value?.clearValidate()
  }
})

// 提交表單
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true
    
    // 構建 payload
    const payload = {
      cost_type_id: formData.value.costTypeId,
      year: formData.value.year,
      month: formData.value.month,
      amount: formData.value.amount,
      notes: formData.value.notes || undefined
    }
    
    // 觸發 submit 事件
    emit('submit', payload)
    
    // 關閉彈窗
    modalVisible.value = false
  } catch (error) {
    console.error('表單驗證失敗:', error)
  } finally {
    loading.value = false
  }
}

// 取消
const handleCancel = () => {
  modalVisible.value = false
  emit('cancel')
}
</script>










