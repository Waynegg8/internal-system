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
          :disabled="isEdit"
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
  editingCost: {
    type: Object,
    default: null
  },
  costTypes: {
    type: Array,
    default: () => []
  },
  year: {
    type: Number,
    default: null
  },
  month: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const formRef = ref(null)
const loading = ref(false)

// 表單數據
const formData = ref({
  costTypeId: undefined,
  amount: undefined,
  notes: ''
})

// 控制彈窗顯示
const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 是否為編輯模式
const isEdit = computed(() => !!props.editingCost)

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

// 監聽 editingCost 變化，填充表單
watch(() => props.editingCost, (cost) => {
  if (cost) {
    formData.value = {
      costTypeId: cost.costTypeId || cost.cost_type_id || cost.costType_id || undefined,
      amount: cost.amount || undefined,
      notes: cost.notes || ''
    }
  }
}, { immediate: true })

// 監聽 visible 變化，重置表單
watch(() => props.visible, (val) => {
  if (val) {
    if (props.editingCost) {
      // 編輯模式：填充表單
      const cost = props.editingCost
      formData.value = {
        costTypeId: cost.costTypeId || cost.cost_type_id || cost.costType_id || undefined,
        amount: cost.amount || undefined,
        notes: cost.notes || ''
      }
    } else {
      // 新增模式：重置表單
      formData.value = {
        costTypeId: undefined,
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
      amount: formData.value.amount,
      notes: formData.value.notes || undefined,
      year: props.year,
      month: props.month
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






