<template>
  <div class="week-navigation-container">
    <a-space :size="16" style="width: 100%; justify-content: space-between">
      <!-- 左側：員工篩選器（可選）和週導航按鈕 -->
      <a-space :size="16" align="center">
        <!-- 員工篩選器插槽 -->
        <slot name="employee-filter"></slot>
        
        <a-space :size="8">
          <a-button @click="$emit('prev-week')">
            <template #icon>
              <LeftOutlined />
            </template>
            上一週
          </a-button>
          <a-button type="primary" @click="$emit('this-week')">
            本週
          </a-button>
          <a-button @click="$emit('next-week')">
            下一週
            <template #icon>
              <RightOutlined />
            </template>
          </a-button>
        </a-space>
      </a-space>
      
      <!-- 中間：週標題 -->
      <a-typography-title :level="4" style="margin: 0">
        {{ weekRangeText }}
      </a-typography-title>
      
      <!-- 右側：操作按鈕 -->
      <a-space :size="8">
        <a-button type="dashed" @click="$emit('add-row')">
          <template #icon>
            <PlusOutlined />
          </template>
          新增列
        </a-button>
        <a-button type="primary" @click="$emit('save-all')">
          <template #icon>
            <SaveOutlined />
          </template>
          儲存所有變更
          <a-badge v-if="pendingCount > 0" :count="pendingCount" :number-style="{ backgroundColor: '#ff4d4f' }" />
        </a-button>
      </a-space>
    </a-space>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { LeftOutlined, RightOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons-vue'

// 格式化日期為 YYYY-MM-DD 格式（用於週範圍顯示）
function formatDateISO(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const props = defineProps({
  currentWeekStart: {
    type: Date,
    required: true
  },
  pendingCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['prev-week', 'next-week', 'this-week', 'add-row', 'save-all'])

// 計算週範圍文字
const weekRangeText = computed(() => {
  if (!props.currentWeekStart) return '載入中...'
  
  const monday = props.currentWeekStart
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  const startDate = formatDateISO(monday)
  const endDate = formatDateISO(sunday)
  
  return `${startDate} 至 ${endDate}`
})
</script>

<style scoped>
.week-navigation-container {
  margin-bottom: 24px;
  padding: 16px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>

