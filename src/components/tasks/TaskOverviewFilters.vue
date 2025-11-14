<template>
  <FilterCard title="篩選條件">
    <!-- 月份篩選區域 -->
    <div class="filter-section">
      <div class="filter-section-title">
        <CalendarOutlined class="filter-section-icon" />
        <span>服務月份</span>
      </div>
      <a-space :size="8" wrap class="mb-md">
        <a-tag
          v-for="month in monthTags"
          :key="month.value"
          :color="isMonthSelected(month.value) ? 'blue' : 'default'"
          class="month-tag"
          @click="toggleMonth(month.value)"
        >
          {{ month.label }}
        </a-tag>
        <a-date-picker
          v-model:value="customMonth"
          picker="month"
          placeholder="選擇其他月份"
          style="width: 160px"
          format="YYYY-MM"
          @change="handleCustomMonthChange"
        >
          <template #suffixIcon>
            <CalendarOutlined />
          </template>
        </a-date-picker>
      </a-space>
      <a-space :size="8" wrap>
        <a-button size="small" :icon="h(CalendarOutlined)" @click="selectQuickMonths('current')">本月</a-button>
        <a-button size="small" :icon="h(LeftOutlined)" @click="selectQuickMonths('last')">上月</a-button>
        <a-button size="small" @click="selectQuickMonths('recent3')">最近3個月</a-button>
        <a-button size="small" @click="selectQuickMonths('currentAndLast')">本月+上月</a-button>
        <a-button size="small" :icon="h(CloseOutlined)" @click="selectQuickMonths('clear')">清除</a-button>
      </a-space>
    </div>

    <a-divider style="margin: 16px 0" />

    <!-- 搜索 + 狀態 + 來源 -->
    <a-row :gutter="[16, 16]" class="mb-md">
      <a-col :xs="24" :sm="8">
        <div class="filter-section-title mb-sm">
          <SearchOutlined class="filter-section-icon" />
          <span>搜索客戶</span>
        </div>
        <a-input-search
          v-model:value="localFilters.search"
          placeholder="輸入客戶名稱..."
          allow-clear
          @search="handleSearch"
        />
      </a-col>

      <a-col :xs="24" :sm="8">
        <div class="filter-section-title mb-sm">
          <CheckCircleOutlined class="filter-section-icon" />
          <span>任務狀態</span>
        </div>
        <a-checkbox-group v-model:value="localFilters.statuses" style="width: 100%">
          <a-checkbox value="pending">待處理</a-checkbox>
          <a-checkbox value="in_progress">進行中</a-checkbox>
          <a-checkbox value="completed">已完成</a-checkbox>
          <a-checkbox value="cancelled">已取消</a-checkbox>
        </a-checkbox-group>
        <a-space :size="8" wrap class="mt-sm">
          <a-button size="small" @click="quickSelectStatus('unfinished')">未完成的</a-button>
          <a-button size="small" @click="quickSelectStatus('all')">全部</a-button>
          <a-button size="small" @click="quickSelectStatus('overdue')">只看逾期</a-button>
        </a-space>
      </a-col>

      <a-col :xs="24" :sm="8">
        <div class="filter-section-title mb-sm">
          <TagOutlined class="filter-section-icon" />
          <span>任務來源</span>
        </div>
        <a-checkbox-group v-model:value="localFilters.sources" style="width: 100%">
          <a-checkbox value="auto">自動生成</a-checkbox>
          <a-checkbox value="manual">手動建立</a-checkbox>
        </a-checkbox-group>
      </a-col>
    </a-row>

    <a-divider style="margin: 16px 0" />

    <!-- 操作按鈕 -->
    <div class="filter-actions">
      <a-space :size="8" wrap>
        <a-button type="primary" :icon="h(SearchOutlined)" @click="handleApply">套用篩選</a-button>
        <a-button :icon="h(ExpandOutlined)" @click="handleExpandAll">全部展開</a-button>
        <a-button :icon="h(MenuFoldOutlined)" @click="handleCollapseAll">全部折疊</a-button>
        <a-button :icon="h(ExclamationCircleOutlined)" @click="handleExpandOverdue">只展開逾期</a-button>
      </a-space>
      <a-checkbox v-model:checked="batchMode" @change="handleToggleBatchMode">
        批量操作模式
      </a-checkbox>
    </div>
  </FilterCard>
</template>

<script setup>
import { ref, computed, watch, onMounted, h } from 'vue'
import { CalendarOutlined, SearchOutlined, CheckCircleOutlined, TagOutlined, LeftOutlined, CloseOutlined, ExpandOutlined, MenuFoldOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { usePageAlert } from '@/composables/usePageAlert'
import FilterCard from '@/components/shared/FilterCard.vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  selectedMonths: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update:filters',
  'update:selected-months',
  'apply',
  'expand-all',
  'collapse-all',
  'expand-overdue',
  'toggle-batch-mode'
])

// 本地狀態
const { warningMessage, showWarning } = usePageAlert()

const localFilters = ref({
  months: [],
  statuses: ['pending', 'in_progress'],
  sources: ['auto', 'manual'],
  search: ''
})

const selectedMonths = ref([])
const customMonth = ref(null)
const batchMode = ref(false)

// 月份標籤列表
const monthTags = computed(() => {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentText = `${now.getFullYear()}年${now.getMonth() + 1}月`
  
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
  const lastText = `${lastMonthDate.getFullYear()}年${lastMonthDate.getMonth() + 1}月`
  
  const tags = [
    { value: lastMonth, label: lastText },
    { value: currentMonth, label: currentText }
  ]
  
  // 添加已選擇的自定義月份（如果不在列表中）
  selectedMonths.value.forEach(month => {
    if (!tags.find(t => t.value === month)) {
      const [year, monthNum] = month.split('-')
      tags.push({
        value: month,
        label: `${year}年${parseInt(monthNum)}月`
      })
    }
  })
  
  return tags
})

// 初始化
onMounted(() => {
  localFilters.value = { ...props.filters }
  selectedMonths.value = [...props.selectedMonths]
})

// 監聽 props 變化
watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
}, { deep: true })

watch(() => props.selectedMonths, (newMonths) => {
  selectedMonths.value = [...newMonths]
}, { deep: true })

// 判斷月份是否被選中
const isMonthSelected = (month) => {
  return selectedMonths.value.includes(month)
}

// 切換月份選擇
const toggleMonth = (month) => {
  const index = selectedMonths.value.indexOf(month)
  if (index > -1) {
    selectedMonths.value.splice(index, 1)
  } else {
    selectedMonths.value.push(month)
  }
  updateFilters()
}

// 處理自定義月份選擇
const handleCustomMonthChange = (date) => {
  if (!date) return
  
  // date 可能是 dayjs 對象或 Date 對象
  let yearMonth
  if (date.format) {
    // dayjs 對象
    yearMonth = date.format('YYYY-MM')
  } else if (date instanceof Date) {
    // Date 對象
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    yearMonth = `${year}-${month}`
  } else if (typeof date === 'string') {
    // 字符串格式 YYYY-MM
    yearMonth = date
  } else {
    return
  }
  
  if (!selectedMonths.value.includes(yearMonth)) {
    selectedMonths.value.push(yearMonth)
    updateFilters()
  }
  customMonth.value = null
}

// 快速選擇月份
const selectQuickMonths = (type) => {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`
  
  selectedMonths.value = []
  
  if (type === 'current') {
    selectedMonths.value = [currentMonth]
  } else if (type === 'last') {
    selectedMonths.value = [lastMonth]
  } else if (type === 'currentAndLast') {
    selectedMonths.value = [lastMonth, currentMonth]
  } else if (type === 'recent3') {
    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      selectedMonths.value.push(month)
    }
  } else if (type === 'clear') {
    selectedMonths.value = []
  }
  
  updateFilters()
}

// 快速選擇狀態
const quickSelectStatus = (type) => {
  if (type === 'unfinished') {
    localFilters.value.statuses = ['pending', 'in_progress']
  } else if (type === 'all') {
    localFilters.value.statuses = ['pending', 'in_progress', 'completed', 'cancelled']
  } else if (type === 'overdue') {
    localFilters.value.statuses = ['pending', 'in_progress']
  }
  updateFilters()
}

// 處理搜索
const handleSearch = () => {
  updateFilters()
}

// 更新篩選條件
const updateFilters = () => {
  localFilters.value.months = [...selectedMonths.value]
  emit('update:filters', { ...localFilters.value })
  emit('update:selected-months', [...selectedMonths.value])
}

// 套用篩選
const handleApply = () => {
  if (selectedMonths.value.length === 0) {
    showWarning('請至少選擇一個月份')
    return
  }
  updateFilters()
  emit('apply')
}

// 全部展開
const handleExpandAll = () => {
  emit('expand-all')
}

// 全部折疊
const handleCollapseAll = () => {
  emit('collapse-all')
}

// 只展開逾期
const handleExpandOverdue = () => {
  emit('expand-overdue')
}

// 切換批量操作模式
const handleToggleBatchMode = () => {
  emit('toggle-batch-mode', batchMode.value)
}
</script>

<style scoped>
.filter-section {
  margin-bottom: 16px;
}

.filter-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.filter-section-icon {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.month-tag {
  cursor: pointer;
  padding: 4px 12px;
  transition: var(--transition-base);
}

.month-tag:hover {
  opacity: 0.8;
}

.filter-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.ant-tag) {
  margin: 0;
}

:deep(.ant-divider) {
  border-color: var(--color-border-divider);
}
</style>

