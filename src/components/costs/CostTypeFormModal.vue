<template>
  <a-modal
    v-model:open="modalVisible"
    :title="isEdit ? '編輯成本項目' : '新增成本項目'"
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
      <a-form-item label="成本名稱" name="costName">
        <a-input
          v-model:value="formData.costName"
          placeholder="請輸入成本名稱"
          :maxlength="100"
          show-count
        />
      </a-form-item>
      
      <a-form-item label="類別" name="category">
        <a-select
          v-model:value="formData.category"
          placeholder="請選擇類別"
        >
          <a-select-option value="fixed">固定</a-select-option>
          <a-select-option value="variable">變動</a-select-option>
        </a-select>
      </a-form-item>
      
      <a-form-item label="分攤方式" name="allocationMethod">
        <a-select
          v-model:value="formData.allocationMethod"
          placeholder="請選擇分攤方式"
        >
          <a-select-option value="per_employee">按員工數</a-select-option>
          <a-select-option value="per_hour">按工時</a-select-option>
          <a-select-option value="per_revenue">按收入</a-select-option>
        </a-select>
      </a-form-item>
      
      <a-form-item label="描述" name="description">
        <a-input
          v-model:value="formData.description"
          placeholder="請輸入描述（可選）"
          :maxlength="500"
          show-count
        />
      </a-form-item>
      
      <a-form-item label="啟用狀態" name="isActive">
        <a-switch v-model:checked="formData.isActive" />
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
  editingCostType: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const formRef = ref(null)
const loading = ref(false)

// 表單數據
const formData = ref({
  costName: '',
  category: undefined,
  allocationMethod: undefined,
  description: '',
  isActive: true
})

// 控制彈窗顯示
const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 是否為編輯模式
const isEdit = computed(() => !!props.editingCostType)

// 表單驗證規則
const rules = {
  costName: [
    { required: true, message: '請輸入成本名稱', trigger: 'blur' },
    { max: 100, message: '成本名稱不能超過100個字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '請選擇類別', trigger: 'change' }
  ],
  allocationMethod: [
    { required: true, message: '請選擇分攤方式', trigger: 'change' }
  ],
  description: [
    { max: 500, message: '描述不能超過500個字符', trigger: 'blur' }
  ]
}

// 監聽 editingCostType 變化，填充表單
watch(() => props.editingCostType, (costType) => {
  if (costType) {
    formData.value = {
      costName: costType.costName || costType.cost_name || '',
      category: costType.category || costType.cost_type || undefined,
      allocationMethod: costType.allocationMethod || costType.allocation_method || undefined,
      description: costType.description || '',
      isActive: costType.isActive !== undefined ? costType.isActive : (costType.is_active !== undefined ? costType.is_active : true)
    }
  }
}, { immediate: true })

// 監聽 visible 變化，重置表單
watch(() => props.visible, (val) => {
  if (val) {
    if (props.editingCostType) {
      // 編輯模式：填充表單
      const costType = props.editingCostType
      formData.value = {
        costName: costType.costName || costType.cost_name || '',
        category: costType.category || costType.cost_type || undefined,
        allocationMethod: costType.allocationMethod || costType.allocation_method || undefined,
        description: costType.description || '',
        isActive: costType.isActive !== undefined ? costType.isActive : (costType.is_active !== undefined ? costType.is_active : true)
      }
    } else {
      // 新增模式：重置表單
      formData.value = {
        costName: '',
        category: undefined,
        allocationMethod: undefined,
        description: '',
        isActive: true
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
      cost_name: formData.value.costName,
      category: formData.value.category,
      allocation_method: formData.value.allocationMethod,
      description: formData.value.description || undefined,
      is_active: formData.value.isActive
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





