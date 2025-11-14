<template>
  <a-card title="我的任務（待辦/進行中）">
    <a-list
      :data-source="tasks"
      :loading="false"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <router-link :to="`/tasks/${item.id}`" class="task-link">
            <div class="task-item">
              <div class="task-header">
                <span class="task-name">{{ item.name || '未命名任務' }}</span>
                <span class="task-due">到期：{{ item.dueDate || '—' }}</span>
                <a-tag
                  v-if="item.urgency === 'overdue'"
                  color="red"
                  class="urgency-tag"
                >
                  逾期
                </a-tag>
                <a-tag
                  v-else-if="item.urgency === 'urgent'"
                  color="orange"
                  class="urgency-tag"
                >
                  急
                </a-tag>
              </div>
              <div
                v-if="item.blockerReason"
                class="status-info blocker"
              >
                🚫 {{ item.blockerReason }}
              </div>
              <div
                v-else-if="item.overdueReason"
                class="status-info overdue"
              >
                ⏰ {{ item.overdueReason }}
              </div>
              <div
                v-else-if="item.statusNote"
                class="status-info note"
              >
                💬 {{ item.statusNote }}
              </div>
            </div>
          </router-link>
        </a-list-item>
      </template>
      <template #empty>
        <div style="padding: 8px 0; text-align: center; color: #999; font-size: 12px;">目前沒有待辦任務</div>
      </template>
    </a-list>
  </a-card>
</template>

<script setup>
const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
:deep(.ant-card) {
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

:deep(.ant-card-head) {
  padding: 0 12px;
  min-height: 40px;
  flex-shrink: 0;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.ant-card-head-title) {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

:deep(.ant-card-body) {
  padding: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

:deep(.ant-list) {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

:deep(.ant-list-item) {
  padding: 8px 0;
}

.task-link {
  display: block;
  width: 100%;
  text-decoration: none;
  color: inherit;
}

.task-link:hover {
  color: inherit;
}

.task-item {
  width: 100%;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.task-name {
  font-weight: 500;
  color: #333;
  font-size: 13px;
}

.task-due {
  font-size: 12px;
  color: #999;
}

.urgency-tag {
  margin-left: auto;
}

.status-info {
  margin-top: 6px;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  border-left: 3px solid;
}

.status-info.blocker {
  background: #fef2f2;
  border-left-color: #dc2626;
  color: #991b1b;
}

.status-info.overdue {
  background: #fef2f2;
  border-left-color: #dc2626;
  color: #991b1b;
}

.status-info.note {
  background: #f0fdf4;
  border-left-color: #16a34a;
  color: #166534;
}
</style>



