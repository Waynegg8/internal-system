<template>
  <a-modal
    v-model:open="modalVisible"
    :title="isEdit ? '編輯月度成本' : '新增月度成本'"
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
          @change="handleCostTypeChange"
        >
          <a-select-option
            v-for="costType in costTypes"
            :key="costType.cost_type_id || costType.id"
            :value="costType.cost_type_id || costType.id"
          >
            {{ costType.cost_name || costType.name }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="金額" name="amount">
        <a-input-number
          v-model:value="formData.amount"
          :min="0"
          :precision="2"
          :step="1000"
          placeholder="請輸入金額"
          style="width: 100%"
          :formatter="value => `NT$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
          :parser="value => value.replace(/NT\$\s?|(,*)/g, '')"
        />
      </a-form-item>

      <a-form-item label="年份" name="year">
        <a-input-number
          v-model:value="formData.year"
          :min="2020"
          :max="2030"
          placeholder="請輸入年份"
          style="width: 100%"
          :disabled="true"
        />
      </a-form-item>

      <a-form-item label="月份" name="month">
        <a-input-number
          v-model:value="formData.month"
          :min="1"
          :max="12"
          placeholder="請輸入月份"
          style="width: 100%"
          :disabled="true"
        />
      </a-form-item>

      <a-form-item v-if="selectedCostType" label="分攤方式">
        <a-tag :color="getAllocationMethodColor(selectedCostType.allocation_method)">
          {{ getAllocationMethodName(selectedCostType.allocation_method) }}
        </a-tag>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'

// Props
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
    required: true
  },
  month: {
    type: Number,
    required: true
  }
})

// Emits
const emit = defineEmits(['update:visible', 'submit', 'cancel'])

// Reactive data
const formRef = ref(null)
const loading = ref(false)
const selectedCostType = ref(null)

// Form data
const formData = ref({
  costTypeId: null,
  amount: null,
  year: props.year,
  month: props.month
})

// Form validation rules
const rules = {
  costTypeId: [
    { required: true, message: '請選擇成本項目', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '請輸入金額', trigger: 'blur' },
    { type: 'number', min: 0, message: '金額必須大於等於0', trigger: 'blur' }
  ]
}

// Computed properties
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isEdit = computed(() => !!props.editingCost)

// Watch for editing cost changes
watch(() => props.editingCost, (newCost) => {
  if (newCost) {
    formData.value = {
      costTypeId: newCost.cost_type_id || newCost.costTypeId,
      amount: newCost.amount,
      year: newCost.year || props.year,
      month: newCost.month || props.month
    }
    handleCostTypeChange(formData.value.costTypeId)
  } else {
    resetForm()
  }
}, { immediate: true })

// Watch for year/month props changes
watch(() => props.year, (newYear) => {
  formData.value.year = newYear
})

watch(() => props.month, (newMonth) => {
  formData.value.month = newMonth
})

// Methods
const handleCostTypeChange = (costTypeId) => {
  selectedCostType.value = props.costTypes.find(ct =>
    (ct.cost_type_id || ct.id) === costTypeId
  )
}

const getAllocationMethodName = (method) => {
  const methodNames = {
    per_employee: '按員工數分攤',
    per_hour: '按工時分攤',
    per_revenue: '按收入分攤'
  }
  return methodNames[method] || method
}

const getAllocationMethodColor = (method) => {
  const colors = {
    per_employee: 'blue',
    per_hour: 'green',
    per_revenue: 'orange'
  }
  return colors[method] || 'default'
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    const submitData = {
      ...formData.value,
      cost_type_id: formData.value.costTypeId,
      year: props.year,
      month: props.month
    }

    emit('submit', submitData)
    modalVisible.value = false
  } catch (error) {
    console.error('表單驗證失敗:', error)
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  modalVisible.value = false
}

const resetForm = () => {
  formData.value = {
    costTypeId: null,
    amount: null,
    year: props.year,
    month: props.month
  }
  selectedCostType.value = null
  formRef.value?.resetFields()
}
</script>

<style scoped>
.form-item-extra {
  color: #666;
  font-size: 12px;
  margin-top: 4px;
}
</style>