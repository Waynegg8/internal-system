<template>
  <a-row :gutter="16" style="margin-bottom: 16px">
    <a-col :flex="1" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap">
      <!-- 搜索框 -->
      <a-input-search
        v-model:value="localFilters.q"
        placeholder="搜尋客戶/統編/收據號…"
        style="max-width: 300px"
        @search="handleFiltersChange"
        @press-enter="handleFiltersChange"
      />
      
      <!-- 日期範圍選擇器 -->
      <a-range-picker
        v-model:value="dateRange"
        format="YYYY-MM-DD"
        placeholder="['開始日期', '結束日期']"
        style="width: 240px"
        @change="handleDateRangeChange"
      />
      
      <!-- 狀態下拉 -->
      <a-select
        v-model:value="localFilters.status"
        placeholder="全部狀態"
        style="width: 150px"
        @change="handleFiltersChange"
      >
        <a-select-option value="all">全部狀態</a-select-option>
        <a-select-option value="unpaid">未付款</a-select-option>
        <a-select-option value="partial">部分付款</a-select-option>
        <a-select-option value="paid">已付款</a-select-option>
        <a-select-option value="cancelled">已取消</a-select-option>
        <a-select-option value="overdue">已逾期</a-select-option>
      </a-select>
      
      <!-- 收據類型下拉 -->
      <a-select
        v-model:value="localFilters.receipt_type"
        placeholder="全部類型"
        style="width: 150px"
        @change="handleFiltersChange"
      >
        <a-select-option value="all">全部類型</a-select-option>
        <a-select-option value="normal">一般收據</a-select-option>
        <a-select-option value="prepayment">預收款</a-select-option>
        <a-select-option value="deposit">押金</a-select-option>
      </a-select>
    </a-col>
    
    <a-col>
      <a-button type="primary" @click="handleAddReceipt">+ 新增收據</a-button>
    </a-col>
  </a-row>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  filters: {
    type: Object,
    required: true,
    default: () => ({
      q: '',
      status: 'all',
      receipt_type: 'all',
      dateFrom: '',
      dateTo: ''
    })
  }
})

const emit = defineEmits(['filters-change', 'add-receipt'])

// 本地狀態
const localFilters = ref({ ...props.filters })

// 日期範圍（用於 RangePicker）
const dateRange = computed({
  get: () => {
    if (props.filters.dateFrom && props.filters.dateTo) {
      return [dayjs(props.filters.dateFrom), dayjs(props.filters.dateTo)]
    }
    return null
  },
  set: (val) => {
    // 這個 setter 不會被直接使用，因為我們使用 @change 事件
  }
})

// 同步 props 變化
watch(() => props.filters, (val) => {
  localFilters.value = { ...val }
}, { deep: true })

// 處理篩選條件變化
const handleFiltersChange = () => {
  emit('filters-change', { ...localFilters.value })
}

// 處理日期範圍變化
const handleDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    localFilters.value.dateFrom = dates[0].format('YYYY-MM-DD')
    localFilters.value.dateTo = dates[1].format('YYYY-MM-DD')
  } else {
    localFilters.value.dateFrom = ''
    localFilters.value.dateTo = ''
  }
  handleFiltersChange()
}

// 處理新增收據
const handleAddReceipt = () => {
  emit('add-receipt')
}
</script>






