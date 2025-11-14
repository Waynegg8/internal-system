<template>
  <a-card
    v-if="receipts && receipts.length > 0"
    title="收據已開但任務未完成"
  >
    <a-list
      :data-source="receipts"
      :loading="false"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <div class="receipt-item">
            <div class="receipt-header">
              <span class="receipt-title">{{ item.client_name }} - {{ item.service_name }}</span>
            </div>
            <div class="receipt-meta">
              收據 #{{ item.receipt_number }} | 到期：{{ item.receipt_due_date || '—' }}
            </div>
            <div class="receipt-tasks">
              待完成任務：{{ item.pending_tasks }} / {{ item.total_tasks }}
            </div>
          </div>
        </a-list-item>
      </template>
      <template #empty>
        <div style="padding: 8px 0; text-align: center; color: #999; font-size: 12px;">無待處理項目</div>
      </template>
    </a-list>
  </a-card>
</template>

<script setup>
const props = defineProps({
  receipts: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
:deep(.ant-card) {
  height: 100%;
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
}

:deep(.ant-empty) {
  padding: 8px 0;
  margin: 0;
}

:deep(.ant-list-item) {
  padding: 8px 0;
}

.receipt-item {
  width: 100%;
}

.receipt-header {
  margin-bottom: 2px;
}

.receipt-title {
  font-weight: 500;
  color: #333;
  font-size: 13px;
}

.receipt-meta {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.receipt-tasks {
  font-size: 12px;
  color: #d97706;
  font-weight: 500;
}
</style>


