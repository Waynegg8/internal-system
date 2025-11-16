<template>
  <div class="shareholders-editor">
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center">
      <span style="font-weight: 600">股東持股資訊</span>
      <a-button type="primary" size="small" @click="handleAdd">
        + 新增股東
      </a-button>
    </div>

    <div v-if="items.length === 0" style="text-align: center; color: #999; padding: 20px; border: 1px dashed #e5e7eb; border-radius: 6px; background: #f9fafb">
      暫無股東資訊，點擊上方按鈕新增
    </div>

    <div v-else style="display: flex; flex-direction: column; gap: 12px">
      <div
        v-for="(item, index) in items"
        :key="item.id"
        style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px"
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
          <span style="font-weight: 600; font-size: 14px">股東 {{ index + 1 }}</span>
          <a-button type="text" danger size="small" @click="handleRemove(index)">
            刪除
          </a-button>
        </div>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="股東姓名" :required="true">
              <a-input
                v-model:value="item.name"
                placeholder="請輸入股東姓名"
                @blur="handleChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="持股類型">
              <a-select
                v-model:value="item.share_type"
                placeholder="請選擇持股類型"
                allow-clear
                @change="handleChange"
              >
                <a-select-option value="普通股">普通股</a-select-option>
                <a-select-option value="特別股">特別股</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="持股比例（%）">
              <a-input-number
                v-model:value="item.share_percentage"
                :min="0"
                :max="100"
                :precision="2"
                placeholder="0.00"
                style="width: 100%"
                @blur="handleChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="持股數（股）">
              <a-input-number
                v-model:value="item.share_count"
                :min="0"
                :precision="0"
                placeholder="0"
                style="width: 100%"
                @blur="handleChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="持股金額（新台幣元）">
              <a-input-number
                v-model:value="item.share_amount"
                :min="0"
                :precision="0"
                placeholder="0"
                style="width: 100%"
                @blur="handleChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => null
  }
})

const emit = defineEmits(['update:modelValue'])

const items = ref([])
let nextId = 1

// 初始化 items
const initItems = () => {
  if (props.modelValue && Array.isArray(props.modelValue) && props.modelValue.length > 0) {
    items.value = props.modelValue.map(item => ({
      id: nextId++,
      name: item.name || '',
      share_percentage: item.share_percentage || null,
      share_count: item.share_count || null,
      share_amount: item.share_amount || null,
      share_type: item.share_type || ''
    }))
  } else {
    items.value = []
  }
}

// 監聽 props 變化
watch(() => props.modelValue, () => {
  initItems()
}, { immediate: true, deep: true })

// 新增股東
const handleAdd = () => {
  items.value.push({
    id: nextId++,
    name: '',
    share_percentage: null,
    share_count: null,
    share_amount: null,
    share_type: ''
  })
  handleChange()
}

// 刪除股東
const handleRemove = (index) => {
  items.value.splice(index, 1)
  handleChange()
}

// 處理變化
const handleChange = () => {
  // 過濾掉空項目（沒有任何輸入的）
  const validItems = items.value.filter(item => {
    return item.name || item.share_percentage || item.share_count || item.share_amount || item.share_type
  })

  // 轉換為 JSON 格式
  const result = validItems.length > 0 ? validItems.map(item => ({
    name: item.name || '',
    share_percentage: item.share_percentage !== null ? Number(item.share_percentage) : null,
    share_count: item.share_count !== null ? Number(item.share_count) : null,
    share_amount: item.share_amount !== null ? Number(item.share_amount) : null,
    share_type: item.share_type || ''
  })) : null

  emit('update:modelValue', result)
}
</script>

<style scoped>
.shareholders-editor {
  width: 100%;
}
</style>

