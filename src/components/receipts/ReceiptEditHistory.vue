<template>
  <div class="edit-history-section">
    <h3 style="margin-bottom: 16px; font-size: 16px; font-weight: 600">編輯歷史</h3>

    <div v-if="editHistory.length === 0" style="text-align: center; padding: 24px; color: #94a3b8">
      尚未有編輯記錄
    </div>

    <div v-else>
      <a-timeline>
        <a-timeline-item
          v-for="(item, index) in editHistory"
          :key="index"
          :color="getItemColor(item)"
        >
          <template #dot>
            <EditOutlined />
          </template>

          <div class="history-item">
            <div class="history-header">
              <span class="field-name">{{ formatFieldName(item.field_name) }}</span>
              <span class="modified-time">{{ formatDateTime(item.modified_at) }}</span>
            </div>

            <div class="history-content">
              <div class="value-change">
                <div class="old-value">
                  <span class="label">修改前：</span>
                  <span class="value">{{ formatValue(item.old_value) }}</span>
                </div>
                <div class="new-value">
                  <span class="label">修改後：</span>
                  <span class="value">{{ formatValue(item.new_value) }}</span>
                </div>
              </div>

              <div class="modifier-info" v-if="item.modified_by_name">
                <span class="label">操作人：</span>
                <span class="value">{{ item.modified_by_name }}</span>
              </div>
            </div>
          </div>
        </a-timeline-item>
      </a-timeline>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { EditOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

const props = defineProps({
  editHistory: {
    type: Array,
    default: () => []
  }
})

// 格式化欄位名稱
function formatFieldName(fieldName) {
  const fieldNameMap = {
    'total_amount': '總金額',
    'receipt_date': '開立日期',
    'due_date': '到期日期',
    'status': '狀態',
    'receipt_type': '收據類型',
    'notes': '備註',
    'service_start_month': '服務開始月份',
    'service_end_month': '服務結束月份'
  }

  return fieldNameMap[fieldName] || fieldName
}

// 格式化數值
function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '無'
  }

  try {
    // 嘗試解析 JSON
    const parsed = JSON.parse(value)

    // 處理不同類型的數值
    if (typeof parsed === 'number') {
      // 金額欄位特殊處理
      if (parsed.toString().includes('.') || Math.abs(parsed) >= 1000) {
        return `NT$ ${parsed.toLocaleString()}`
      }
      return parsed.toString()
    }

    if (typeof parsed === 'boolean') {
      return parsed ? '是' : '否'
    }

    if (typeof parsed === 'string') {
      // 日期格式檢查
      if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
        return dayjs(parsed).format('YYYY-MM-DD')
      }
      // 月份格式檢查
      if (/^\d{4}-\d{2}$/.test(parsed)) {
        return dayjs(parsed).format('YYYY-MM')
      }
      return parsed
    }

    return JSON.stringify(parsed)
  } catch {
    // 如果不是 JSON，直接返回原值
    return value
  }
}

// 格式化日期時間
function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return ''
  return dayjs(dateTimeStr).format('YYYY-MM-DD HH:mm:ss')
}

// 獲取時間線項目顏色
function getItemColor(item) {
  // 可以根據操作類型返回不同顏色
  return 'blue'
}
</script>

<style scoped>
.edit-history-section {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 16px;
  background: #f8fafc;
}

.history-item {
  margin-top: 8px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.field-name {
  font-weight: 600;
  color: #1f2937;
}

.modified-time {
  font-size: 12px;
  color: #6b7280;
}

.history-content {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12px;
}

.value-change {
  margin-bottom: 8px;
}

.old-value,
.new-value {
  display: flex;
  margin-bottom: 4px;
}

.old-value .label {
  color: #dc2626;
  font-weight: 500;
  min-width: 60px;
}

.new-value .label {
  color: #059669;
  font-weight: 500;
  min-width: 60px;
}

.value {
  flex: 1;
  word-break: break-word;
}

.modifier-info {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.modifier-info .label {
  color: #6b7280;
  font-size: 12px;
}

.modifier-info .value {
  color: #374151;
  font-size: 12px;
}
</style>


