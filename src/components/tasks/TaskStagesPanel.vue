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

const emit = defineEmits(['edit-stage'])

const ATag = resolveComponent('a-tag')
const AButton = resolveComponent('a-button')
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
      triggeredBy: stage.triggeredBy || stage.triggered_by || null
    }
  }).sort((a, b) => a.stageOrder - b.stageOrder)
})

const renderStageItem = ({ item }) => {
  const stage = item
  const children = []

  children.push(
    h('div', { class: 'stage-header' }, [
      h('div', { class: 'stage-title' }, [
        h('span', { class: 'stage-order' }, `階段 ${stage.stageOrder}`),
        h('span', { class: 'stage-name' }, stage.stageName || '未命名階段')
      ]),
        h(
          'div',
          { class: 'stage-tags' },
          [
            h(
              ATag,
              { color: statusColorMap[stage.status] || 'default' },
              statusLabelMap[stage.status] || stage.status
            ),
            stage.delayDays > 0
              ? h(
                  ATag,
                  { color: 'volcano' },
                  `已延遲 ${stage.delayDays} 天`
                )
              : null
          ].filter(Boolean)
        )
    ])
  )

  children.push(
    h(
      'div',
      { class: 'stage-meta' },
      [
        stage.startedAt
          ? h('div', { class: 'meta-item' }, [
            h('span', { class: 'label' }, '開始於'),
            h('span', { class: 'value' }, formatDateTime(stage.startedAt))
          ])
          : null,
        stage.completedAt
          ? h('div', { class: 'meta-item' }, [
            h('span', { class: 'label' }, '完成於'),
            h('span', { class: 'value' }, formatDateTime(stage.completedAt))
          ])
          : null,
        stage.triggeredAt
          ? h('div', { class: 'meta-item' }, [
            h('span', { class: 'label' }, '最近更新'),
            h('span', { class: 'value' }, formatDateTime(stage.triggeredAt))
          ])
          : null
      ].filter(Boolean)
    )
  )

  const actionButtons = []
  if (stage.status !== 'completed') {
    actionButtons.push(
      h(
        AButton,
        {
          type: 'primary',
          size: 'small',
          onClick: () => emit('edit-stage', stage.raw ?? stage)
        },
        '更新階段'
      )
    )
  } else {
    actionButtons.push(
      h(
        AButton,
        {
          size: 'small',
          onClick: () => emit('edit-stage', stage.raw ?? stage)
        },
        '檢視'
      )
    )
  }

  children.push(
    h('div', { class: 'stage-actions' }, actionButtons)
  )

  return h(
    AListItem,
    { class: ['stage-item', stage.status] },
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

.stage-item {
  padding: 16px;
}

.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.stage-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stage-order {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stage-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.stage-tags {
  display: flex;
  gap: 8px;
}

.stage-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 12px 0;
}

.meta-item {
  display: flex;
  gap: 6px;
  font-size: 12px;
  color: #4b5563;
}

.meta-item .label {
  color: #6b7280;
}

.stage-actions {
  display: flex;
  gap: 8px;
}

.skeleton-wrapper {
  padding: 16px 0;
}
</style>


