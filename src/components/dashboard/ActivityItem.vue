<template>
  <div
    class="activity-item"
    :class="activityClass"
  >
    <div class="activity-header">
      <div class="activity-title">
        {{ activityTitle }}
      </div>
      <div class="activity-time">{{ activity.time }}</div>
    </div>
    <div
      v-if="activity.clientName && activity.serviceName"
      class="activity-meta"
    >
      {{ activity.clientName }} · {{ activity.serviceName }}
    </div>
    <div
      v-if="activity.change || activity.assigneeName"
      class="activity-change"
    >
      <span
        v-if="activity.change"
        :class="changeClass"
      >
        {{ activity.change }}
      </span>
      <span
        v-if="activity.assigneeName"
        class="activity-assignee"
      >
        {{ activity.assigneeName }}
      </span>
    </div>
    <div
      v-if="activity.period || activity.leaveDays"
      class="activity-period"
    >
      <span
        v-if="activity.period"
        class="period-text"
      >
        {{ activity.period }}
      </span>
      <a-tag
        v-if="activity.leaveDays"
        color="blue"
        class="leave-tag"
      >
        {{ activity.leaveDays }}{{ leaveUnit }}
      </a-tag>
    </div>
    <div
      v-if="activity.missingCount"
      class="activity-missing"
    >
      <a-tag color="red">
        {{ activity.missingCount }}天未填
      </a-tag>
      <span class="missing-dates">{{ activity.missingDates }}</span>
    </div>
    <div
      v-if="activity.reason"
      class="activity-reason"
    >
      {{ activity.reason }}
    </div>
    <div
      v-if="activity.note"
      class="activity-note"
      :class="noteClass"
    >
      {{ activity.note }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activity: {
    type: Object,
    required: true
  }
})

const activityIcon = computed(() => {
  // 移除 emoji，使用空字符串或簡短文字標記
  return ''
})

const activityTitle = computed(() => {
  if (props.activity.activity_type === 'leave_application') {
    return props.activity.text || '假期申請'
  }
  if (props.activity.activity_type === 'timesheet_reminder') {
    return props.activity.text || '工時提醒'
  }
  return props.activity.taskName || '任務'
})

const activityClass = computed(() => {
  if (props.activity.activity_type === 'timesheet_reminder') {
    return 'activity-reminder'
  }
  return ''
})

const changeClass = computed(() => {
  if (props.activity.activity_type === 'due_date_adjustment') {
    return 'change-blue'
  }
  if (props.activity.activity_type === 'status_update') {
    return 'change-green'
  }
  return ''
})

const noteClass = computed(() => {
  const note = props.activity.note || ''
  if (note.startsWith('🚫') || note.startsWith('⏰')) {
    return 'note-danger'
  }
  return 'note-success'
})

const leaveUnit = computed(() => {
  if (props.activity.leaveUnit === 'hour') {
    return '小時'
  }
  if (props.activity.leaveUnit === 'half') {
    return '半天'
  }
  return '天'
})
</script>

<style scoped>
.activity-item {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.15s;
  width: 100%;
}

.activity-item:hover {
  background: #fafafa;
}

.activity-item.activity-reminder {
  background: #fff7f0;
}

.activity-item.activity-reminder:hover {
  background: #ffe7d6;
}

.activity-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}

.activity-title {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.5;
  word-break: keep-all;
  overflow-wrap: normal;
}

.activity-icon {
  margin-right: 6px;
  font-size: 16px;
}

.activity-time {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}

.activity-meta {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
  line-height: 1.4;
}

.activity-change {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.change-blue {
  color: #3b82f6;
  font-weight: 500;
}

.change-green {
  color: #10b981;
  font-weight: 500;
}

.activity-assignee {
  color: #6b7280;
}

.activity-period {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.period-text {
  color: #6b7280;
}

.leave-tag {
  font-weight: 500;
}

.activity-missing {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.missing-dates {
  color: #6b7280;
  font-size: 12px;
}

.activity-reason {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  line-height: 1.4;
  padding: 6px 8px;
  background: #fffbeb;
  border-radius: 4px;
}

.activity-note {
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
  padding: 6px 8px;
  border-radius: 4px;
}

.activity-note.note-danger {
  color: #4b5563;
  background: #fef2f2;
}

.activity-note.note-success {
  color: #4b5563;
  background: #f0fdf4;
}
</style>

