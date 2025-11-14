<template>
  <FilterCard>
    <a-row :gutter="[12, 12]" align="middle" style="width: 100%">
      <!-- 搜索框 -->
      <a-col :xs="24" :sm="12" :md="8" :lg="7" :xl="6">
        <a-input-search
          v-model:value="localSearchKeyword"
          placeholder="搜尋公司名稱或統編"
          allow-clear
          @search="handleSearch"
          @press-enter="handleSearch"
          style="width: 100%"
        />
      </a-col>
      
      <!-- 標籤篩選 -->
      <a-col :xs="24" :sm="12" :md="6" :lg="5" :xl="4">
        <a-select
          v-model:value="localSelectedTagId"
          placeholder="全部標籤"
          allow-clear
          show-search
          :filter-option="filterTagOption"
          style="width: 100%"
          @change="handleTagFilterChange"
        >
          <template #suffixIcon>
            <TagOutlined />
          </template>
          <a-select-option value="">全部標籤</a-select-option>
          <a-select-option
            v-for="tag in tags"
            :key="tag.tag_id || tag.id"
            :value="tag.tag_id || tag.id"
          >
            {{ tag.tag_name || tag.name }}
          </a-select-option>
        </a-select>
      </a-col>
      
      <!-- 操作按鈕：右對齊 -->
      <a-col :xs="24" :sm="24" :md="10" :lg="12" :xl="14" style="display: flex; justify-content: flex-end; gap: 8px">
        <!-- 批量操作按鈕組 -->
        <template v-if="selectedClientIds.length > 0">
          <a-button :icon="h(UserAddOutlined)" @click="handleBatchAssign">
            批量分配 ({{ selectedClientIds.length }})
          </a-button>
          <a-button :icon="h(CloseOutlined)" @click="handleCancelSelect">
            取消
          </a-button>
        </template>
        
        <!-- 快速移轉按鈕 -->
        <a-button :icon="h(SwapOutlined)" @click="handleQuickMigrate">
          快速移轉
        </a-button>
        
        <!-- 新增客戶按鈕 -->
        <a-button type="primary" :icon="h(PlusOutlined)" @click="handleAddClient">
          新增客戶
        </a-button>
      </a-col>
    </a-row>
  </FilterCard>
</template>

<script setup>
import { ref, watch, h } from 'vue'
import { SearchOutlined, TagOutlined, UserAddOutlined, CloseOutlined, SwapOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FilterCard from '@/components/shared/FilterCard.vue'

const props = defineProps({
  searchKeyword: {
    type: String,
    default: ''
  },
  selectedTagId: {
    type: [String, Number],
    default: null
  },
  tags: {
    type: Array,
    default: () => []
  },
  selectedClientIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update:searchKeyword',
  'update:selectedTagId',
  'search',
  'tag-filter-change',
  'batch-assign',
  'quick-migrate',
  'add-client',
  'cancel-select'
])

// 本地狀態
const localSearchKeyword = ref(props.searchKeyword)
const localSelectedTagId = ref(props.selectedTagId)

// 同步 props 變化
watch(() => props.searchKeyword, (val) => {
  localSearchKeyword.value = val
})

watch(() => props.selectedTagId, (val) => {
  localSelectedTagId.value = val
})

// 標籤過濾函數
const filterTagOption = (input, option) => {
  const tagName = option.children?.[0]?.children || option.children || ''
  return tagName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 處理搜索
const handleSearch = () => {
  emit('update:searchKeyword', localSearchKeyword.value)
  emit('search', localSearchKeyword.value)
}

// 處理標籤篩選變化
const handleTagFilterChange = (value) => {
  emit('update:selectedTagId', value)
  emit('tag-filter-change', value)
}

// 處理批量分配
const handleBatchAssign = () => {
  emit('batch-assign')
}

// 處理快速移轉
const handleQuickMigrate = () => {
  emit('quick-migrate')
}

// 處理新增客戶
const handleAddClient = () => {
  emit('add-client')
}

// 處理取消選擇
const handleCancelSelect = () => {
  emit('cancel-select')
}
</script>

