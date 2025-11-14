<template>
  <a-modal
    v-model:open="modalVisible"
    title="本月自動生成"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    width="600px"
  >
    <div v-if="previewData.length === 0" style="text-align: center; padding: 40px 0;">
      <a-empty description="沒有可生成的項目" />
    </div>
    
    <div v-else>
      <a-alert
        message="將生成以下記錄"
        :description="`共 ${previewData.length} 筆記錄，${selectableCount} 筆可新增`"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />
      
      <a-checkbox-group v-model:value="selectedTemplateIds" style="width: 100%">
        <div
          v-for="item in previewData"
          :key="getTemplateId(item)"
          class="generate-item"
        >
          <a-checkbox
            :value="getTemplateId(item)"
            :disabled="isDisabled(item)"
          >
            <div class="generate-item__content">
              <div class="generate-item__title">
                <strong>{{ getCostName(item) }}</strong>
                <a-tag v-if="isDisabled(item)" color="default" style="margin-left: 8px">
                  本月已存在
                </a-tag>
              </div>
              <div class="generate-item__meta">
                <span v-if="getDefaultAmount(item)" class="generate-item__amount">
                  預設金額：{{ formatCurrency(getDefaultAmount(item)) }}
                </span>
                <span v-if="item.notes" class="generate-item__notes">
                  備註：{{ item.notes }}
                </span>
              </div>
            </div>
          </a-checkbox>
        </div>
      </a-checkbox-group>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { formatCurrency } from '@/utils/formatters'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  previewData: {
    type: Array,
    default: () => []
  },
  costTypes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:visible', 'submit', 'cancel'])

const loading = ref(false)
const selectedTemplateIds = ref([])

// 控制彈窗顯示
const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 獲取模板 ID
const getTemplateId = (item) => {
  return item.templateId || item.template_id || item.costTypeId || item.cost_type_id || item.id
}

// 判斷項目是否不可選（已存在）
const isDisabled = (item) => {
  return item.already_exists || item.alreadyExists
}

// 可勾選項目數量
const selectableCount = computed(() => {
  return props.previewData.filter(item => !isDisabled(item)).length
})

const computeSelectableIds = (items) => {
  return items
    .filter(item => !isDisabled(item))
    .map(item => getTemplateId(item))
    .filter((id) => id !== undefined && id !== null)
}

// 監聽 visible 變化，重置選中狀態
watch(() => props.visible, (val) => {
  if (val) {
    selectedTemplateIds.value = computeSelectableIds(props.previewData)
  } else {
    selectedTemplateIds.value = []
  }
})

// 監聽 previewData 變化，更新選中狀態
watch(() => props.previewData, (newData) => {
  if (modalVisible.value && newData.length > 0) {
    selectedTemplateIds.value = computeSelectableIds(newData)
  }
}, { immediate: true })

// 獲取成本名稱
const getCostName = (item) => {
  // 先從預覽數據中獲取
  if (item.costName || item.cost_name) {
    return item.costName || item.cost_name
  }
  // 如果沒有，從 costTypes 中查找
  const costTypeId = item.costTypeId || item.cost_type_id
  if (costTypeId && props.costTypes.length > 0) {
    const costType = props.costTypes.find(ct => {
      const id = ct.id || ct.costTypeId || ct.cost_type_id
      return id === costTypeId
    })
    if (costType) {
      return costType.costName || costType.cost_name || ''
    }
  }
  return '—'
}

// 獲取預設金額
const getDefaultAmount = (item) => {
  return item.defaultAmount || item.default_amount || undefined
}

// 提交
const handleSubmit = async () => {
  if (selectedTemplateIds.value.length === 0) {
    return
  }
  
  loading.value = true
  try {
    const payloadIds = selectedTemplateIds.value
      .map(id => parseInt(id, 10))
      .filter(id => !Number.isNaN(id))
    emit('submit', payloadIds)
    modalVisible.value = false
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

<style scoped>
.generate-item {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: #ffffff;
}

.generate-item:last-of-type {
  margin-bottom: 0;
}

.generate-item__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.generate-item__title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.generate-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #6b7280;
}

.generate-item__amount {
  font-size: 13px;
}

.generate-item__notes {
  font-size: 13px;
}
</style>



