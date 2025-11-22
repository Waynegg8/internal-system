<template>
  <div class="directors-supervisors-editor">
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center">
      <span style="font-weight: 600">董監事資訊</span>
      <a-button type="primary" size="small" @click="handleAdd">
        + 新增董監事
      </a-button>
    </div>

    <div v-if="items.length === 0" style="text-align: center; color: #999; padding: 20px; border: 1px dashed #e5e7eb; border-radius: 6px; background: #f9fafb">
      暫無董監事資訊，點擊上方按鈕新增
    </div>

    <div v-else style="display: flex; flex-direction: column; gap: 12px">
      <div
        v-for="(item, index) in items"
        :key="item.id"
        style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px"
      >
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
          <span style="font-weight: 600; font-size: 14px">董監事 {{ index + 1 }}</span>
          <a-button type="text" danger size="small" @click="handleRemove(index)">
            刪除
          </a-button>
        </div>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="姓名" :required="true">
              <a-input
                v-model:value="item.name"
                placeholder="請輸入姓名"
                @blur="handleChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="職務">
              <a-select
                v-model:value="item.position"
                placeholder="請選擇職務"
                allow-clear
                @change="handleChange"
              >
                <a-select-option value="董事">董事</a-select-option>
                <a-select-option value="監事">監事</a-select-option>
                <a-select-option value="董事長">董事長</a-select-option>
                <a-select-option value="副董事長">副董事長</a-select-option>
                <a-select-option value="常務董事">常務董事</a-select-option>
                <a-select-option value="獨立董事">獨立董事</a-select-option>
                <a-select-option value="常務監事">常務監事</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="任期開始日期">
              <a-date-picker
                v-model:value="item.term_start"
                placeholder="選擇日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                @change="handleChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="任期結束日期">
              <a-date-picker
                v-model:value="item.term_end"
                placeholder="選擇日期"
                style="width: 100%"
                format="YYYY-MM-DD"
                @change="handleChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="是否為現任">
              <a-switch
                v-model:checked="item.is_current"
                checked-children="是"
                un-checked-children="否"
                @change="handleChange"
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
import dayjs from 'dayjs'

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
      position: item.position || '',
      term_start: item.term_start ? dayjs(item.term_start) : null,
      term_end: item.term_end ? dayjs(item.term_end) : null,
      is_current: item.is_current !== undefined ? item.is_current : true
    }))
  } else {
    items.value = []
  }
}

// 監聽 props 變化
watch(() => props.modelValue, () => {
  initItems()
}, { immediate: true, deep: true })

// 新增董監事
const handleAdd = () => {
  items.value.push({
    id: nextId++,
    name: '',
    position: '',
    term_start: null,
    term_end: null,
    is_current: true
  })
  handleChange()
}

// 刪除董監事
const handleRemove = (index) => {
  items.value.splice(index, 1)
  handleChange()
}

// 處理變化
const handleChange = () => {
  // 過濾掉空項目（沒有任何輸入的）
  const validItems = items.value.filter(item => {
    return item.name || item.position || item.term_start || item.term_end
  })

  // 轉換為 JSON 格式
  const result = validItems.length > 0 ? validItems.map(item => {
    // 確保 term_start 和 term_end 是 dayjs 對象
    const termStart = item.term_start ? (typeof item.term_start === 'string' ? dayjs(item.term_start) : item.term_start) : null
    const termEnd = item.term_end ? (typeof item.term_end === 'string' ? dayjs(item.term_end) : item.term_end) : null
    
    return {
      name: item.name || '',
      position: item.position || '',
      term_start: termStart ? termStart.format('YYYY-MM-DD') : null,
      term_end: termEnd ? termEnd.format('YYYY-MM-DD') : null,
      is_current: item.is_current !== undefined ? item.is_current : true
    }
  }) : null

  emit('update:modelValue', result)
}
</script>

<style scoped>
.directors-supervisors-editor {
  width: 100%;
}
</style>







