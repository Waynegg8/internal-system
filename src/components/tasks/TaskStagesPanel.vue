<template>
  <a-card title="階段進度" style="margin-bottom: 24px">
    <div v-if="loading" class="skeleton-wrapper">
      <a-skeleton active :paragraph="{ rows: 4 }" />
    </div>
    <template v-else>
      <a-empty v-if="!normalizedStages.length" description="尚未設定階段" />
      <a-list
        v-else
        class="stage-list"
        :data-source="normalizedStages"
        :renderItem="renderStageItem"
        item-layout="horizontal"
        bordered
      />
    </template>
  </a-card>
</template>

<script setup>
import { computed, h, resolveComponent } from 'vue'
import { formatDateTime } from '@/utils/formatters'

const props = defineProps({
  stages: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const ATag = resolveComponent('a-tag')
const AListItem = resolveComponent('a-list-item')

const statusColorMap = {
  pending: 'default',
  in_progress: 'processing',
  completed: 'success',
  blocked: 'error',
  cancelled: 'default'
}

const statusLabelMap = {
  pending: '待處理',
  in_progress: '進行中',
  completed: '已完成',
  blocked: '已阻塞',
  cancelled: '已取消'
}

const normalizedStages = computed(() => {
  if (!Array.isArray(props.stages)) return []
  return props.stages.map((stage, index) => {
    const order =
      (typeof stage.stageOrder === 'number' && Number.isFinite(stage.stageOrder) && stage.stageOrder > 0
        ? stage.stageOrder
        : typeof stage.stage_order === 'number' && Number.isFinite(stage.stage_order) && stage.stage_order > 0
          ? stage.stage_order
          : index + 1)
    return {
      raw: stage,
      stageId: stage.stageId ?? stage.stage_id,
      stageName: stage.stageName || stage.stage_name || `階段 ${order}`,
      stageOrder: order,
      status: stage.status || 'pending',
      delayDays: Number(stage.delayDays ?? stage.delay_days ?? 0),
      startedAt: stage.startedAt || stage.started_at || null,
      completedAt: stage.completedAt || stage.completed_at || null,
      triggeredAt: stage.triggeredAt || stage.triggered_at || null,
      triggeredBy: stage.triggeredBy || stage.triggered_by || null,
      tasks: Array.isArray(stage.tasks) ? stage.tasks.map(task => ({
        task_id: task.task_id || task.taskId,
        task_name: task.task_name || task.taskName || '',
        task_status: task.task_status || task.taskStatus || 'pending',
        assignee_user_id: task.assignee_user_id || task.assigneeUserId || null,
        assignee_name: task.assignee_name || task.assigneeName || '',
      })) : []
    }
  }).sort((a, b) => a.stageOrder - b.stageOrder)
})

const renderStageItem = ({ item }) => {
  const stage = item
  const children = []

  // 階段標題和狀態 - 第一行
  children.push(
    h('div', { class: 'stage-header' }, [
      h('div', { class: 'stage-title-wrapper' }, [
        h('span', { class: 'stage-order' }, `階段 ${stage.stageOrder}`),
        h('span', { class: 'stage-name' }, stage.stageName || '未命名階段')
      ]),
      h(
        'div',
        { class: 'stage-tags' },
        [
          h(
            ATag,
            { color: statusColorMap[stage.status] || 'default', size: 'small' },
            statusLabelMap[stage.status] || stage.status
          ),
          stage.delayDays > 0
            ? h(
                ATag,
                { color: 'volcano', size: 'small' },
                `已延遲 ${stage.delayDays} 天`
              )
            : null
        ].filter(Boolean)
      )
    ])
  )

  // 時間資訊 - 第二行，緊湊顯示
  const metaItems = []
  if (stage.startedAt) {
    metaItems.push(
      h('span', { class: 'meta-item' }, [
        h('span', { class: 'meta-label' }, '開始於'),
        h('span', { class: 'meta-value' }, formatDateTime(stage.startedAt))
      ])
    )
  }
  if (stage.triggeredAt && stage.triggeredAt !== stage.startedAt) {
    metaItems.push(
      h('span', { class: 'meta-item' }, [
        h('span', { class: 'meta-label' }, '最近更新'),
        h('span', { class: 'meta-value' }, formatDateTime(stage.triggeredAt))
      ])
    )
  }
  if (stage.completedAt) {
    metaItems.push(
      h('span', { class: 'meta-item' }, [
        h('span', { class: 'meta-label' }, '完成於'),
        h('span', { class: 'meta-value' }, formatDateTime(stage.completedAt))
      ])
    )
  }

  if (metaItems.length > 0) {
    children.push(
      h('div', { class: 'stage-meta' }, metaItems)
    )
  }

  // 任務列表 - 第三行（如果有相關任務）
  if (stage.tasks && Array.isArray(stage.tasks) && stage.tasks.length > 0) {
    const taskItems = stage.tasks.map((task, idx) => {
      const taskStatus = task.task_status || task.taskStatus || 'pending'
      const taskStatusColor = {
        pending: 'default',
        in_progress: 'processing',
        completed: 'success',
        cancelled: 'default'
      }[taskStatus] || 'default'
      
      const taskStatusLabel = {
        pending: '待處理',
        in_progress: '進行中',
        completed: '已完成',
        cancelled: '已取消'
      }[taskStatus] || taskStatus

      const assigneeName = task.assignee_name || task.assigneeName
      // 檢查是否有有效的負責人名稱（不是 null、undefined 或空字符串）
      const hasAssignee = assigneeName != null && String(assigneeName).trim() !== ''
      
      // 簡單顯示：任務名稱 [ID: 任務ID]
      const taskDisplayName = task.task_name || task.taskName || `任務 ${task.task_id || task.taskId}`
      const taskId = task.task_id || task.taskId
      const displayText = `${taskDisplayName} [ID: ${taskId}]`
      
      return h('div', { class: 'stage-task-item', key: `task-${taskId}-${idx}` }, [
        h('span', { class: 'task-name' }, displayText),
        hasAssignee 
          ? h('span', { class: 'task-assignee' }, `負責人: ${assigneeName}`)
          : h('span', { class: 'task-assignee task-assignee-empty' }, '負責人: 未分配'),
        h(
          ATag,
          { color: taskStatusColor, size: 'small', style: 'margin-left: 8px' },
          taskStatusLabel
        )
      ])
    })
    
    children.push(
      h('div', { class: 'stage-tasks' }, [
        h('div', { class: 'stage-tasks-label' }, `相關任務 (${stage.tasks.length}):`),
        h('div', { class: 'stage-tasks-list' }, taskItems)
      ])
    )
  }

  // 移除操作按鈕 - 階段狀態由系統根據業務邏輯自動判斷和更新
  // 不再顯示手動"更新階段"按鈕，階段狀態應該由系統自動管理

  return h(
    AListItem,
    { class: ['stage-item', `stage-${stage.status}`] },
    {
      default: () => children
    }
  )
}
</script>

<style scoped>
.stage-list {
  border-radius: 8px;
  overflow: hidden;
}

/* 使用 :deep() 確保樣式能應用到 a-list-item 元素 */
:deep(.stage-item) {
  padding: 14px 16px !important;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
}

:deep(.stage-item:last-child) {
  border-bottom: none;
}

:deep(.stage-item:hover) {
  background-color: #fafafa;
}

/* 階段標題和狀態 - 第一行 */
:deep(.stage-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px !important;
  margin-top: 0 !important;
  gap: 12px;
}

:deep(.stage-title-wrapper) {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

:deep(.stage-order) {
  font-size: 13px;
  font-weight: 600;
  color: #1890ff;
  white-space: nowrap;
  flex-shrink: 0;
}

:deep(.stage-name) {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.stage-tags) {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* 時間資訊 - 第二行，緊湊顯示 */
:deep(.stage-meta) {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-bottom: 8px !important;
  margin-top: 0 !important;
  padding-left: 0;
}

:deep(.meta-item) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #595959;
  padding-right: 12px;
}

:deep(.meta-item::after) {
  content: '';
  display: inline-block;
  width: 1px;
  height: 12px;
  background-color: #d9d9d9;
  margin-left: 12px;
  margin-right: 0;
}

:deep(.meta-item:last-child) {
  padding-right: 0;
}

:deep(.meta-item:last-child::after) {
  display: none;
}

:deep(.meta-label) {
  color: #8c8c8c;
  white-space: nowrap;
}

:deep(.meta-value) {
  color: #262626;
  white-space: nowrap;
}

/* 任務列表 - 第三行 */
:deep(.stage-tasks) {
  margin-bottom: 8px !important;
  margin-top: 0 !important;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

:deep(.stage-tasks-label) {
  font-size: 12px;
  font-weight: 600;
  color: #595959;
  margin-bottom: 6px;
}

:deep(.stage-tasks-list) {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

:deep(.stage-task-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 4px 0;
}

:deep(.task-name) {
  color: #262626;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.task-assignee) {
  color: #8c8c8c;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

:deep(.task-assignee-empty) {
  color: #ff4d4f;
  font-style: italic;
}

/* 操作按鈕已移除 - 階段狀態由系統自動判斷和更新 */

.skeleton-wrapper {
  padding: 16px 0;
}

/* 根據狀態添加視覺區分 - 使用 :deep() 和 !important 確保樣式生效 */
:deep(.stage-item.stage-pending) {
  border-left: 3px solid #d9d9d9 !important;
  padding: 14px 16px !important;
}

:deep(.stage-item.stage-in_progress) {
  border-left: 3px solid #1890ff !important;
  padding: 14px 16px !important;
}

:deep(.stage-item.stage-completed) {
  border-left: 3px solid #52c41a !important;
  padding: 14px 16px !important;
}

:deep(.stage-item.stage-blocked) {
  border-left: 3px solid #ff4d4f !important;
  padding: 14px 16px !important;
}

:deep(.stage-item.stage-cancelled) {
  border-left: 3px solid #bfbfbf !important;
  padding: 14px 16px !important;
}
</style>


