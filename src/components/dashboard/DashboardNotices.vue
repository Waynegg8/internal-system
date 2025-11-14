<template>
  <div v-if="notices && notices.length > 0" class="dashboard-notices">
    <a-alert
      v-for="(notice, index) in notices"
      :key="index"
      :type="getAlertType(notice.level)"
      :message="notice.text"
      :show-icon="true"
      :closable="false"
      class="notice-item"
    >
      <template v-if="notice.link" #action>
        <router-link :to="notice.link" class="notice-link">
          查看
        </router-link>
      </template>
    </a-alert>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  notices: {
    type: Array,
    default: () => []
  }
})

// 將通知級別轉換為 Ant Design 的 Alert 類型
const getAlertType = (level) => {
  const typeMap = {
    'info': 'info',
    'warning': 'warning',
    'error': 'error'
  }
  return typeMap[level] || 'info'
}
</script>

<style scoped>
.dashboard-notices {
  margin-bottom: 12px;
}

.notice-item {
  margin-bottom: 8px;
}

.notice-item:last-child {
  margin-bottom: 0;
}

.notice-item :deep(.ant-alert) {
  padding: 8px 12px;
}

.notice-link {
  color: inherit;
  text-decoration: underline;
  font-weight: 500;
}

.notice-link:hover {
  opacity: 0.8;
}
</style>



