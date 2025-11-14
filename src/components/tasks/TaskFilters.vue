<template>
  <FilterCard>
    <a-form :layout="'inline'" :label-col="{ span: 0 }">
      <a-row :gutter="[16, 12]">
        <!-- 搜索框 -->
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-input-search
            v-model:value="localFilters.q"
            placeholder="搜尋任務/客戶/統編…"
            allow-clear
            @search="handleSearch"
            @press-enter="handleSearch"
          />
        </a-col>
        
        <!-- 年份下拉 -->
        <a-col :xs="12" :sm="8" :md="4" :lg="3">
          <a-select
            v-model:value="localFilters.service_year"
            placeholder="全部年份"
            allow-clear
            style="width: 100%"
            @change="handleFilterChange"
          >
            <template #suffixIcon>
              <CalendarOutlined />
            </template>
            <a-select-option :value="null">全部年份</a-select-option>
            <a-select-option
              v-for="year in yearOptions"
              :key="year"
              :value="year"
            >
              {{ year }}年
            </a-select-option>
          </a-select>
        </a-col>
        
        <!-- 月份下拉 -->
        <a-col :xs="12" :sm="8" :md="4" :lg="3">
          <a-select
            v-model:value="localFilters.service_month"
            placeholder="全部月份"
            allow-clear
            style="width: 100%"
            @change="handleFilterChange"
          >
            <a-select-option :value="null">全部月份</a-select-option>
            <a-select-option
              v-for="month in 12"
              :key="month"
              :value="month"
            >
              {{ month }}月
            </a-select-option>
          </a-select>
        </a-col>
        
        <!-- 負責人下拉 -->
        <a-col :xs="12" :sm="8" :md="4" :lg="3">
          <a-select
            v-model:value="localFilters.assignee"
            placeholder="全部負責人"
            allow-clear
            style="width: 100%"
            show-search
            :filter-option="filterUserOption"
            @change="handleFilterChange"
          >
            <template #suffixIcon>
              <UserOutlined />
            </template>
            <a-select-option :value="null">全部負責人</a-select-option>
            <a-select-option
              v-for="user in users"
              :key="getUserId(user)"
              :value="getUserId(user)"
            >
              {{ getUserName(user) }}
            </a-select-option>
          </a-select>
        </a-col>
        
        <!-- 標籤下拉 -->
        <a-col :xs="12" :sm="8" :md="4" :lg="3">
          <a-select
            v-model:value="localFilters.tags"
            placeholder="全部標籤"
            allow-clear
            style="width: 100%"
            show-search
            :filter-option="filterTagOption"
            @change="handleFilterChange"
          >
            <template #suffixIcon>
              <TagOutlined />
            </template>
            <a-select-option :value="null">全部標籤</a-select-option>
            <a-select-option
              v-for="tag in tags"
              :key="getTagId(tag)"
              :value="getTagId(tag)"
            >
              {{ getTagName(tag) }}
            </a-select-option>
          </a-select>
        </a-col>
        
        <!-- 狀態下拉 -->
        <a-col :xs="12" :sm="8" :md="4" :lg="3">
          <a-select
            v-model:value="localFilters.status"
            placeholder="全部狀態"
            allow-clear
            style="width: 100%"
            @change="handleFilterChange"
          >
            <template #suffixIcon>
              <CheckCircleOutlined />
            </template>
            <a-select-option :value="null">全部狀態</a-select-option>
            <a-select-option value="pending">待處理</a-select-option>
            <a-select-option value="in_progress">進行中</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
          </a-select>
        </a-col>
        
        <!-- 到期狀態下拉 -->
        <a-col :xs="12" :sm="8" :md="4" :lg="3">
          <a-select
            v-model:value="localFilters.due"
            placeholder="全部到期狀態"
            allow-clear
            style="width: 100%"
            @change="handleFilterChange"
          >
            <template #suffixIcon>
              <ClockCircleOutlined />
            </template>
            <a-select-option :value="null">全部到期狀態</a-select-option>
            <a-select-option value="overdue">已逾期</a-select-option>
            <a-select-option value="soon">即將到期（≤3天）</a-select-option>
          </a-select>
        </a-col>
        
        <!-- 隱藏已完成複選框 -->
        <a-col :xs="12" :sm="8" :md="4" :lg="3">
          <a-checkbox
            v-model:checked="localFilters.hide_completed"
            @change="handleFilterChange"
          >
            隱藏已完成
          </a-checkbox>
        </a-col>
        
        <!-- 操作按钮：右对齐 -->
        <a-col :xs="24" :sm="24" :md="24" :lg="24">
          <a-space style="width: 100%; justify-content: flex-end; flex-wrap: wrap">
            <!-- 批量分配按鈕 -->
            <a-button
              v-if="selectedTaskIds.length > 0"
              :icon="h(UserAddOutlined)"
              @click="handleBatchAssign"
            >
              批量分配 ({{ selectedTaskIds.length }})
            </a-button>
            
            <!-- 新增任務按鈕 -->
            <a-button
              type="primary"
              :icon="h(PlusOutlined)"
              @click="handleAddTask"
            >
              新增任務
            </a-button>
          </a-space>
        </a-col>
      </a-row>
    </a-form>
  </FilterCard>
</template>

<script setup>
import { ref, computed, watch, h } from 'vue'
import { SearchOutlined, CalendarOutlined, UserOutlined, TagOutlined, CheckCircleOutlined, ClockCircleOutlined, UserAddOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FilterCard from '@/components/shared/FilterCard.vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  users: {
    type: Array,
    default: () => []
  },
  tags: {
    type: Array,
    default: () => []
  },
  selectedTaskIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['filters-change', 'batch-assign', 'add-task'])

// 本地篩選狀態
const localFilters = ref({ ...props.filters })

// 監聽 props 變化
watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
}, { deep: true })

// 生成年份選項（當前年份及前4年，共5年）
const currentYear = new Date().getFullYear()
const yearOptions = computed(() => {
  const years = []
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i)
  }
  return years
})

// 處理搜索
const handleSearch = () => {
  handleFilterChange()
}

// 處理篩選變化
const handleFilterChange = () => {
  emit('filters-change', { ...localFilters.value })
}

// 處理批量分配
const handleBatchAssign = () => {
  emit('batch-assign')
}

// 處理新增任務
const handleAddTask = () => {
  emit('add-task')
}

// 用戶過濾函數
const filterUserOption = (input, option) => {
  const userName = option.children?.[0]?.children || option.children || ''
  return userName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 標籤過濾函數
const filterTagOption = (input, option) => {
  const tagName = option.children?.[0]?.children || option.children || ''
  return tagName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 獲取用戶ID（處理不同字段名）
const getUserId = (user) => {
  return user.userId || user.user_id || user.id
}

// 獲取用戶名稱（處理不同字段名）
const getUserName = (user) => {
  return user.name || user.userName || user.user_name || '未命名'
}

// 獲取標籤ID（處理不同字段名）
const getTagId = (tag) => {
  return tag.tagId || tag.tag_id || tag.id
}

// 獲取標籤名稱（處理不同字段名）
const getTagName = (tag) => {
  return tag.tagName || tag.tag_name || tag.name || '未命名'
}
</script>

