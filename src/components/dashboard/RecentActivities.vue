<template>
  <a-card class="recent-activities-card">
    <template #title>
      <div class="card-title-row">
        <span>最近動態</span>
      </div>
    </template>
    
    <!-- 篩選器區域 -->
    <div class="filters-container" style="margin-bottom: 12px">
      <a-space direction="vertical" style="width: 100%" :size="6">
        <a-select
          v-model:value="localFilters.type"
          style="width: 100%"
          placeholder="全部類型"
          @change="handleFilterChange"
        >
          <a-select-option value="">全部類型</a-select-option>
          <a-select-option value="status_update">任務更新</a-select-option>
          <a-select-option value="due_date_adjustment">期限調整</a-select-option>
          <a-select-option value="leave_application">假期申請</a-select-option>
          <a-select-option value="timesheet_reminder">工時提醒</a-select-option>
        </a-select>
        <a-select
          v-model:value="localFilters.userId"
          style="width: 100%"
          placeholder="全部員工"
          @change="handleFilterChange"
        >
          <a-select-option value="">全部員工</a-select-option>
          <a-select-option
            v-for="user in teamMembers"
            :key="user.userId"
            :value="user.userId"
          >
            {{ user.name }}
          </a-select-option>
        </a-select>
        <a-select
          v-model:value="localFilters.days"
          style="width: 100%"
          @change="handleFilterChange"
        >
          <a-select-option :value="3">3天內</a-select-option>
          <a-select-option :value="7">7天內</a-select-option>
          <a-select-option :value="14">14天內</a-select-option>
          <a-select-option :value="30">30天內</a-select-option>
        </a-select>
      </a-space>
    </div>
    
    <a-list
      :data-source="activities"
      :loading="false"
      class="activities-list"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <router-link
            v-if="item.link"
            :to="item.link"
            class="activity-link"
          >
            <ActivityItem :activity="item" />
          </router-link>
          <div v-else>
            <ActivityItem :activity="item" />
          </div>
        </a-list-item>
      </template>
      <template #empty>
        <div style="padding: 16px 0; text-align: center; color: #999; font-size: 12px;">
          最近 {{ localFilters.days }} 天沒有動態記錄
        </div>
      </template>
    </a-list>
  </a-card>
</template>

<script setup>
import { ref, watch } from 'vue'
import ActivityItem from './ActivityItem.vue'

const props = defineProps({
  activities: {
    type: Array,
    default: () => []
  },
  teamMembers: {
    type: Array,
    default: () => []
  },
  filters: {
    type: Object,
    default: () => ({
      type: '',
      userId: '',
      days: 7
    })
  }
})

const emit = defineEmits(['filter-change'])

const localFilters = ref({
  type: props.filters.type || '',
  userId: props.filters.userId || '',
  days: props.filters.days || 7
})

watch(() => props.filters, (newFilters) => {
  localFilters.value = {
    type: newFilters.type || '',
    userId: newFilters.userId || '',
    days: newFilters.days || 7
  }
}, { deep: true })

const handleFilterChange = () => {
  emit('filter-change', { ...localFilters.value })
}
</script>

<style scoped>
.recent-activities-card {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.recent-activities-card :deep(.ant-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.recent-activities-card :deep(.ant-card-head) {
  padding: 0 12px;
  min-height: 40px;
  flex-shrink: 0;
  border-bottom: 1px solid #f0f0f0;
}

.recent-activities-card :deep(.ant-card-head-title) {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.recent-activities-card :deep(.ant-card-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  padding: 12px;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filters-container {
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.activities-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  width: 100%;
  max-height: none;
}

.activities-list::-webkit-scrollbar {
  width: 6px;
}

.activities-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.activities-list::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.activities-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.activities-list :deep(.ant-list-item) {
  padding: 8px 0;
}

.activities-list :deep(.ant-empty) {
  width: 100%;
}

.activity-link {
  display: block;
  width: 100%;
  text-decoration: none;
  color: inherit;
}

.activity-link:hover {
  color: inherit;
}
</style>

