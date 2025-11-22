<template>
  <div class="task-generation-preview">
    <a-card title="任務生成預覽" :bordered="true" size="small">
      <template #extra>
        <a-space>
          <span style="font-size: 12px; color: #6b7280;">服務月份：</span>
          <a-select
            v-model:value="previewMonth"
            :options="monthOptions"
            style="width: 120px"
            size="small"
          />
        </a-space>
      </template>

      <a-empty
        v-if="!tasks || tasks.length === 0"
        description="暫無任務配置"
        :image="false"
        style="padding: 20px 0"
      />

      <div v-else>
        <!-- 預覽說明 -->
        <a-alert
          type="info"
          message="預覽說明"
          description="以下顯示所有任務在指定服務月份的生成時間和到期日。當您修改任務配置時，預覽會自動更新。"
          show-icon
          style="margin-bottom: 16px"
          size="small"
        />

        <!-- 任務預覽列表 -->
        <div class="preview-list">
          <div
            v-for="(preview, index) in previewData"
            :key="index"
            class="preview-item"
            :class="{ 'has-error': preview.hasError }"
          >
            <div class="preview-header">
              <div class="preview-title">
                <a-tag color="blue" size="small">階段 {{ preview.stage_order }}</a-tag>
                <span class="task-name">{{ preview.task_name || '未命名任務' }}</span>
              </div>
              <a-tag
                :color="preview.hasError ? 'error' : 'success'"
                size="small"
              >
                {{ preview.hasError ? '配置不完整' : '正常' }}
              </a-tag>
            </div>

            <div class="preview-content">
              <div class="preview-row">
                <span class="label">生成時間：</span>
                <div class="value-container">
                  <span v-if="preview.generation_time" class="value success">
                    {{ formatDateChinese(preview.generation_time) }}
                  </span>
                  <span v-else class="value error">
                    <ExclamationCircleOutlined style="margin-right: 4px" />
                    {{ preview.generation_time_error || '未設置' }}
                  </span>
                  <div v-if="preview.generation_time && preview.generation_time_description" class="value-description">
                    {{ preview.generation_time_description }}
                  </div>
                </div>
              </div>

              <div class="preview-row">
                <span class="label">到期日：</span>
                <div class="value-container">
                  <span v-if="preview.due_date" class="value warning">
                    {{ formatDateChinese(preview.due_date) }}
                  </span>
                  <span v-else class="value error">
                    <ExclamationCircleOutlined style="margin-right: 4px" />
                    {{ preview.due_date_error || '未設置' }}
                  </span>
                  <div v-if="preview.due_date && preview.due_date_description" class="value-description">
                    {{ preview.due_date_description }}
                  </div>
                  <a-tag
                    v-if="preview.is_fixed_deadline"
                    color="red"
                    size="small"
                    style="margin-left: 8px"
                  >
                    固定期限
                  </a-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { calculateGenerationTime, calculateDueDate, formatDateChinese } from '@/utils/dateCalculators'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  serviceYear: {
    type: Number,
    default: null
  },
  serviceMonth: {
    type: Number,
    default: null
  }
})

// 預覽月份選擇
const previewMonth = ref(props.serviceMonth || new Date().getMonth() + 1)

// 月份選項
const monthOptions = computed(() => {
  return Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    value: i + 1
  }))
})

// 預覽數據
const previewData = computed(() => {
  if (!props.tasks || props.tasks.length === 0) {
    return []
  }

  const year = props.serviceYear || new Date().getFullYear()
  const month = previewMonth.value

  return props.tasks.map((task, index) => {
    // 訪問所有可能變化的屬性，確保深度響應式追蹤
    const generationTimeRule = task.generation_time_rule
    const generationTimeParams = task.generation_time_params || {}
    const dueDateRule = task.due_date_rule
    const dueDateParams = task.due_date_params || {}
    const daysDue = task.days_due
    const isFixedDeadline = task.is_fixed_deadline

    // 訪問規則對象的內部屬性
    const ruleType = generationTimeRule?.rule || generationTimeRule
    const ruleParams = generationTimeRule?.params || generationTimeParams
    const dueRuleType = dueDateRule?.rule || dueDateRule
    const dueRuleParams = dueDateRule?.params || dueDateParams

    let generationTime = null
    let generationTimeError = null
    let dueDate = null
    let dueDateError = null

    // 計算生成時間
    if (ruleType) {
      try {
        generationTime = calculateGenerationTime(ruleType, ruleParams, year, month)
        if (generationTime && (!(generationTime instanceof Date) || isNaN(generationTime.getTime()))) {
          generationTime = null
          generationTimeError = '計算結果無效'
        }
      } catch (error) {
        generationTime = null
        generationTimeError = error.message || '計算失敗'
      }
    } else {
      generationTimeError = '未設置生成時間規則'
    }

    // 計算到期日
    try {
      if (daysDue !== null && daysDue !== undefined) {
        // 新規則優先
        dueDate = calculateDueDate(null, {}, year, month, daysDue)
      } else if (dueRuleType) {
        // 舊規則
        dueDate = calculateDueDate(dueRuleType, dueRuleParams, year, month, null)
      } else {
        dueDateError = '未設置到期日規則'
      }

      if (dueDate && (!(dueDate instanceof Date) || isNaN(dueDate.getTime()))) {
        dueDate = null
        dueDateError = '計算結果無效'
      }
    } catch (error) {
      dueDate = null
      dueDateError = error.message || '計算失敗'
    }

    // 生成描述文字
    const generationTimeDescription = getGenerationTimeDescription(task, ruleType, ruleParams, month)
    const dueDateDescription = getDueDateDescription(task, dueRuleType, dueRuleParams, daysDue, month)

    return {
      index,
      stage_order: task.stage_order || index + 1,
      task_name: task.name || task.task_name || '未命名任務',
      generation_time: generationTime,
      generation_time_error: generationTimeError,
      generation_time_description: generationTimeDescription,
      due_date: dueDate,
      due_date_error: dueDateError,
      due_date_description: dueDateDescription,
      is_fixed_deadline: isFixedDeadline || false,
      hasError: !generationTime || !dueDate
    }
  })
})

// 獲取生成時間描述
const getGenerationTimeDescription = (task, ruleType, ruleParams, month) => {
  if (!ruleType) return null

  const monthText = `${month}月`

  switch (ruleType) {
    case 'service_month_start':
      return `${monthText}的任務在${monthText}1日生成`
    
    case 'prev_month_last_x_days':
      if (ruleParams?.days) {
        const prevMonth = month === 1 ? 12 : month - 1
        return `${monthText}的任務在${prevMonth}月的最後${ruleParams.days}天生成`
      }
      return `${monthText}的任務在前一個月的最後X天生成`
    
    case 'prev_month_x_day':
      if (ruleParams?.day) {
        const prevMonth = month === 1 ? 12 : month - 1
        return `${monthText}的任務在${prevMonth}月${ruleParams.day}日生成`
      }
      return `${monthText}的任務在前一個月第X天生成`
    
    case 'next_month_start':
      {
        const nextMonth = month === 12 ? 1 : month + 1
        return `${monthText}的任務在${nextMonth}月1日生成`
      }
    
    case 'monthly_x_day':
      if (ruleParams?.day) {
        return `${monthText}的任務在${monthText}${ruleParams.day}日生成`
      }
      return `${monthText}的任務在${monthText}X日生成`
    
    default:
      return null
  }
}

// 獲取到期日描述
const getDueDateDescription = (task, dueRuleType, dueRuleParams, daysDue, month) => {
  const monthText = `${month}月`

  // 新規則優先
  if (daysDue !== null && daysDue !== undefined) {
    return `${monthText}的任務到期日是${monthText}${1 + daysDue}日`
  }

  // 舊規則
  if (!dueRuleType) return null

  switch (dueRuleType) {
    case 'service_month_end':
      return `${monthText}的任務到期日是${monthText}的最後一天`
    
    case 'next_month_end':
      {
        const nextMonth = month === 12 ? 1 : month + 1
        return `${monthText}的任務到期日是${nextMonth}月的最後一天`
      }
    
    case 'n_months_end':
      if (dueRuleParams?.months) {
        return `${monthText}的任務到期日是${monthText}後${dueRuleParams.months}個月的最後一天`
      }
      return `${monthText}的任務到期日是${monthText}後N個月的最後一天`
    
    case 'fixed_date':
      if (dueRuleParams?.day) {
        return `${monthText}的任務到期日是${monthText}${dueRuleParams.day}日`
      }
      return `${monthText}的任務到期日是${monthText}X日`
    
    case 'fixed_deadline':
      if (dueRuleParams?.year && dueRuleParams?.month && dueRuleParams?.day) {
        return `${monthText}的任務到期日是${dueRuleParams.year}年${dueRuleParams.month}月${dueRuleParams.day}日（固定期限）`
      }
      return `${monthText}的任務到期日是固定期限`
    
    case 'days_after_start':
      if (dueRuleParams?.days) {
        return `${monthText}的任務到期日是${monthText}開始後${dueRuleParams.days}天`
      }
      return `${monthText}的任務到期日是${monthText}開始後N天`
    
    default:
      return null
  }
}

// 監聽 serviceMonth 變化，同步預覽月份
watch(
  () => props.serviceMonth,
  (newMonth) => {
    if (newMonth) {
      previewMonth.value = newMonth
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.task-generation-preview {
  width: 100%;
  margin-top: 16px;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-item {
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s;
}

.preview-item.has-error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 14px;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-row {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.label {
  color: #6b7280;
  min-width: 80px;
  font-weight: 500;
}

.value {
  flex: 1;
  font-weight: 500;
}

.value.success {
  color: #059669;
}

.value.warning {
  color: #dc2626;
}

.value.error {
  color: #ef4444;
  display: flex;
  align-items: center;
}

.value-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.value-description {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
  margin-top: 2px;
}

:deep(.ant-card-head-title) {
  font-size: 15px;
  font-weight: 600;
}

:deep(.ant-alert) {
  font-size: 12px;
}
</style>

