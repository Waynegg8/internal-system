<template>
  <a-modal
    v-model:open="modalVisible"
    :title="isEdit ? '編輯薪資項目' : '新增薪資項目'"
    :width="520"
    :centered="true"
    @cancel="handleCancel"
    @ok="handleSubmit"
    :confirm-loading="loading"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
    >
      <!-- 項目名稱 -->
      <a-form-item
        label="項目名稱"
        name="itemName"
      >
        <a-input
          v-model:value="formData.itemName"
          placeholder="輸入清楚易懂的名稱，方便員工識別"
          :maxlength="50"
          show-count
        />
        <template #extra>
          <a-typography-text type="secondary" style="font-size: 12px">
            輸入清楚易懂的名稱，方便員工識別
          </a-typography-text>
        </template>
      </a-form-item>

      <!-- 類別 -->
      <a-form-item
        label="類別"
        name="category"
      >
        <a-select
          v-model:value="formData.category"
          placeholder="請選擇類別"
        >
          <a-select-option value="regular_allowance">
            加給（固定每月發放，如：組長加給）
          </a-select-option>
          <a-select-option value="irregular_allowance">
            津貼（特定月份發放，如：交通保險補助）
          </a-select-option>
          <a-select-option value="bonus">
            月度獎金（如：全勤獎金）
          </a-select-option>
          <a-select-option value="year_end_bonus">
            年終獎金
          </a-select-option>
          <a-select-option value="deduction">
            扣款（如：勞保、健保）
          </a-select-option>
        </a-select>
        <template #extra>
          <a-typography-text type="secondary" style="font-size: 12px">
            <div>加給：固定每月發放</div>
            <div>津貼：特定月份發放</div>
            <div>月度獎金：如全勤獎金</div>
            <div>年終獎金：年度發放</div>
            <div>扣款：如勞保、健保</div>
          </a-typography-text>
        </template>
      </a-form-item>

      <!-- 用於績效獎金調整功能 -->
      <a-form-item name="forPerformanceBonus">
        <a-alert type="info" :show-icon="false">
          <template #message>
            <a-checkbox v-model:checked="formData.forPerformanceBonus">
              <strong>用於績效獎金調整功能</strong>
            </a-checkbox>
            <div style="margin-top: 8px; font-size: 12px; color: #666">
              說明：勾選後，此項目會在「績效獎金調整」頁面顯示為預設值<br>
              建議用途：每月變動的績效獎金<br>
              只能有一個項目勾選此選項
            </div>
          </template>
        </a-alert>
      </a-form-item>

      <!-- 說明 -->
      <a-form-item
        label="說明"
        name="description"
      >
        <a-textarea
          v-model:value="formData.description"
          placeholder="可說明發放條件、計算方式等"
          :rows="3"
          :maxlength="200"
          show-count
        />
      </a-form-item>

      <!-- 顯示順序 -->
      <a-form-item
        label="顯示順序"
        name="displayOrder"
      >
        <a-input-number
          v-model:value="formData.displayOrder"
          :min="0"
          :default-value="99"
          style="width: 100%"
        />
        <template #extra>
          <a-typography-text type="secondary" style="font-size: 12px">
            數字越小越靠前顯示，預設為 99
          </a-typography-text>
        </template>
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
  editingItem: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

const formRef = ref(null)
const modalVisible = ref(props.visible)

// 是否為編輯模式
const isEdit = computed(() => !!props.editingItem)

// 表單數據
const formData = ref({
  itemCode: '',
  itemName: '',
  category: undefined,
  forPerformanceBonus: false,
  description: '',
  displayOrder: 99
})

// 表單驗證規則
const rules = {
  itemName: [
    { required: true, message: '請輸入項目名稱', trigger: 'blur' },
    { max: 50, message: '項目名稱不能超過 50 個字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '請選擇類別', trigger: 'change' }
  ]
}

// 重置表單（定義在 watch 之前）
const resetForm = () => {
  formRef.value?.resetFields()
  formData.value = {
    itemCode: '',
    itemName: '',
    category: undefined,
    forPerformanceBonus: false,
    description: '',
    displayOrder: 99
  }
}

// 初始化表單數據（定義在 watch 之前）
const initFormData = () => {
  if (isEdit.value && props.editingItem) {
    // 編輯模式：預填充數據
    const item = props.editingItem
    const itemCode = item.itemCode || item.item_code || ''
    formData.value = {
      itemCode: itemCode,
      itemName: item.itemName || item.item_name || '',
      category: item.category || undefined,
      forPerformanceBonus: itemCode === 'PERFORMANCE',
      description: item.description || '',
      displayOrder: item.displayOrder !== undefined ? item.displayOrder : (item.display_order !== undefined ? item.display_order : 99)
    }
  } else {
    // 新增模式：重置為默認值
    formData.value = {
      itemCode: '',
      itemName: '',
      category: undefined,
      forPerformanceBonus: false,
      description: '',
      displayOrder: 99
    }
  }
}

// 監聽 visible 變化
watch(() => props.visible, (newVal) => {
  modalVisible.value = newVal
  if (newVal) {
    initFormData()
  } else {
    resetForm()
  }
}, { immediate: true })

// 監聽 editingItem 變化
watch(() => props.editingItem, () => {
  if (props.visible) {
    initFormData()
  }
})

// 處理提交
const handleSubmit = async () => {
  try {
    // 驗證表單
    await formRef.value.validate()
    
    // 構建提交數據（不傳遞 itemCode，由後端自動生成）
    const submitData = {
      item_name: formData.value.itemName,
      category: formData.value.category,
      description: formData.value.description || '',
      sort_order: formData.value.displayOrder || 99
    }
    
    // 注意：item_code 由後端根據 item_name 自動生成
    // 如果勾選「用於績效獎金調整」，後端會根據特殊邏輯處理
    
    emit('submit', submitData, isEdit.value)
  } catch (error) {
    console.error('表單驗證失敗:', error)
  }
}

// 處理取消
const handleCancel = () => {
  resetForm()
  emit('cancel')
}
</script>

<style scoped>
:deep(.ant-alert) {
  padding: 12px;
}

:deep(.ant-alert-message) {
  margin-bottom: 0;
}
</style>

