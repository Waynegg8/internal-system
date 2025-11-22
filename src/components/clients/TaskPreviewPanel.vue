<template>
  <div class="task-preview-panel">
    <a-card title="任務預覽" :bordered="true">
      <template #extra>
        <a-tag color="blue">
          {{ serviceYear }}年{{ serviceMonth }}月
        </a-tag>
      </template>

      <a-empty
        v-if="!tasks || tasks.length === 0"
        description="暫無任務配置，請先添加任務"
        style="padding: 40px 0"
      />

      <div v-else>
        <!-- 預覽說明 -->
        <a-alert
          type="info"
          message="預覽說明"
          description="以下顯示所有任務在指定服務月份的生成時間和到期日。當您修改任務配置時，預覽會自動更新。"
          show-icon
          style="margin-bottom: 16px"
        />

        <!-- 任務列表 -->
        <a-table
          :data-source="previewData"
          :columns="columns"
          :pagination="false"
          :row-key="(record, index) => record.index || index"
          size="middle"
          :scroll="{ x: 'max-content' }"
        >
          <template #bodyCell="{ column, record, index }">
            <!-- 階段編號 - 使用 rowSpan 實現分組顯示 -->
            <template v-if="column.key === 'stage_order'">
              <template v-if="record.isFirstInStage">
                <a-tag color="blue" style="font-weight: 500">
                  階段 {{ record.stage_order }}
                </a-tag>
              </template>
            </template>

            <!-- 任務名稱 -->
            <template v-if="column.key === 'task_name'">
              <div>
                <div style="font-weight: 500; color: #1e40af">
                  {{ record.task_name || '未命名任務' }}
                </div>
                <div v-if="record.assignee_name" style="font-size: 12px; color: #6b7280; margin-top: 2px">
                  <UserOutlined style="margin-right: 4px" />
                  負責人：{{ record.assignee_name }}
                </div>
              </div>
            </template>

            <!-- 生成時間 -->
            <template v-if="column.key === 'generation_time'">
              <div v-if="record.generation_time">
                <div style="font-weight: 500; color: #059669">
                  {{ formatDateChinese(record.generation_time) }}
                </div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 2px">
                  <CalendarOutlined style="margin-right: 4px" />
                  {{ getGenerationTimeDescription(record) }}
                </div>
              </div>
              <div v-else style="color: #9ca3af">
                <ExclamationCircleOutlined style="margin-right: 4px" />
                <span v-if="record.generation_time_error">
                  {{ record.generation_time_error }}
                </span>
                <span v-else>無法計算</span>
              </div>
            </template>

            <!-- 到期日 -->
            <template v-if="column.key === 'due_date'">
              <div v-if="record.due_date">
                <div style="font-weight: 500; color: #dc2626">
                  {{ formatDateChinese(record.due_date) }}
                </div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 2px">
                  <ClockCircleOutlined style="margin-right: 4px" />
                  {{ getDueDateDescription(record) }}
                </div>
                <div v-if="record.is_fixed_deadline" style="margin-top: 4px">
                  <a-tag color="red" size="small">
                    <ExclamationCircleOutlined style="margin-right: 4px" />
                    固定期限
                  </a-tag>
                </div>
              </div>
              <div v-else style="color: #9ca3af">
                <ExclamationCircleOutlined style="margin-right: 4px" />
                <span v-if="record.due_date_error">
                  {{ record.due_date_error }}
                </span>
                <span v-else>無法計算</span>
              </div>
            </template>

            <!-- 預估工時 -->
            <template v-if="column.key === 'estimated_hours'">
              <div v-if="record.estimated_hours">
                <a-tag color="orange">
                  {{ record.estimated_hours }} 小時
                </a-tag>
              </div>
              <span v-else style="color: #9ca3af">-</span>
            </template>

            <!-- 狀態 -->
            <template v-if="column.key === 'status'">
              <a-tag
                :color="record.hasCalculationError ? 'error' : (record.hasError ? 'warning' : 'success')"
                v-if="record.generation_time && record.due_date && !record.hasCalculationError"
              >
                <CheckCircleOutlined style="margin-right: 4px" />
                正常
              </a-tag>
              <a-tag color="error" v-else-if="record.hasCalculationError">
                <ExclamationCircleOutlined style="margin-right: 4px" />
                計算錯誤
              </a-tag>
              <a-tag color="warning" v-else>
                <ExclamationCircleOutlined style="margin-right: 4px" />
                配置不完整
              </a-tag>
            </template>
          </template>
        </a-table>

        <!-- 統計摘要 -->
        <a-divider style="margin: 16px 0" />
        <div class="preview-summary">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic
                title="任務總數"
                :value="previewData.length"
                :value-style="{ color: '#3b82f6' }"
              >
                <template #prefix>
                  <FileTextOutlined />
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="最早生成時間"
                :value="earliestGenerationTime"
                :value-style="{ color: '#059669' }"
              >
                <template #prefix>
                  <CalendarOutlined />
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="最晚到期日"
                :value="latestDueDate"
                :value-style="{ color: '#dc2626' }"
              >
                <template #prefix>
                  <ClockCircleOutlined />
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="固定期限任務"
                :value="fixedDeadlineCount"
                :value-style="{ color: '#f59e0b' }"
              >
                <template #prefix>
                  <ExclamationCircleOutlined />
                </template>
              </a-statistic>
            </a-col>
          </a-row>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons-vue'
import { calculateGenerationTime, calculateDueDate, formatDateChinese } from '@/utils/dateCalculators'

const props = defineProps({
  tasks: {
    type: Array,
    required: true,
    default: () => []
  },
  serviceYear: {
    type: Number,
    required: true
  },
  serviceMonth: {
    type: Number,
    required: true
  }
})

// 表格列定義
const columns = [
  {
    title: '階段',
    key: 'stage_order',
    width: 100,
    align: 'center',
    fixed: 'left',
    customCell: (record, index) => {
      // 為階段列設置 rowSpan
      if (record.isFirstInStage) {
        return { rowSpan: record.stageTaskCount }
      } else {
        return { rowSpan: 0 }
      }
    }
  },
  {
    title: '任務名稱',
    key: 'task_name',
    width: 220,
    ellipsis: true
  },
  {
    title: '生成時間',
    key: 'generation_time',
    width: 200
  },
  {
    title: '到期日',
    key: 'due_date',
    width: 200
  },
  {
    title: '預估工時',
    key: 'estimated_hours',
    width: 120,
    align: 'center'
  },
  {
    title: '狀態',
    key: 'status',
    width: 120,
    align: 'center',
    fixed: 'right'
  }
]

// 使用 computed 實現響應式預覽數據，自動在任務規則變化時重新計算
// 這樣可以充分利用 Vue 3 的響應式系統，避免不必要的重新計算
// 為了確保深度響應式追蹤，我們需要明確訪問所有嵌套屬性
const previewData = computed(() => {
  // 驗證輸入
  if (!props.tasks || props.tasks.length === 0) {
    return []
  }

  if (!props.serviceYear || !props.serviceMonth) {
    return []
  }

  // 先按階段分組任務
  const tasksByStage = {}
  props.tasks.forEach((task, index) => {
    const stageOrder = task.stage_order || index + 1
    if (!tasksByStage[stageOrder]) {
      tasksByStage[stageOrder] = []
    }
    tasksByStage[stageOrder].push({ task, originalIndex: index })
  })

  // 計算所有任務的日期，並添加分組信息
  const result = []
  Object.keys(tasksByStage).sort((a, b) => Number(a) - Number(b)).forEach(stageOrder => {
    const stageTasks = tasksByStage[stageOrder]
    stageTasks.forEach(({ task, originalIndex }, taskIndexInStage) => {
      const index = originalIndex
    // 明確訪問所有可能變化的屬性，確保 Vue 3 能夠追蹤到深度變化
    const generationTimeRule = task.generation_time_rule
    const generationTimeParams = task.generation_time_params || {}
    const dueDateRule = task.due_date_rule
    const dueDateParams = task.due_date_params || {}
    const daysDue = task.days_due
    const isFixedDeadline = task.is_fixed_deadline
    
    // 訪問規則對象的內部屬性，確保深度追蹤
    const ruleType = generationTimeRule?.rule || generationTimeRule
    const ruleParams = generationTimeRule?.params || generationTimeParams
    const dueRuleType = dueDateRule?.rule || dueDateRule
    const dueRuleParams = dueDateRule?.params || dueDateParams
    let generationTime = null
    let generationTimeError = null
    let dueDate = null
    let dueDateError = null

    // 計算生成時間（帶錯誤處理）
    // 使用明確訪問的變量，確保響應式追蹤
    if (ruleType) {
      try {
        generationTime = calculateGenerationTime(
          ruleType,
          ruleParams,
          props.serviceYear,
          props.serviceMonth
        )
        // 驗證計算結果是否為有效的 Date 對象
        if (generationTime && (!(generationTime instanceof Date) || isNaN(generationTime.getTime()))) {
          generationTime = null
          generationTimeError = '計算結果無效'
        }
      } catch (error) {
        console.warn(`[TaskPreviewPanel] 生成時間計算失敗 (任務 #${index + 1}):`, error)
        generationTime = null
        generationTimeError = error.message || '計算失敗'
      }
    }

    // 計算到期日（帶錯誤處理）
    // 使用明確訪問的變量，確保響應式追蹤
    try {
      if (daysDue !== null && daysDue !== undefined) {
        // 新規則優先
        dueDate = calculateDueDate(
          null,
          {},
          props.serviceYear,
          props.serviceMonth,
          daysDue
        )
      } else if (dueRuleType) {
        // 舊規則
        dueDate = calculateDueDate(
          dueRuleType,
          dueRuleParams,
          props.serviceYear,
          props.serviceMonth,
          null
        )
      }
      
      // 驗證計算結果是否為有效的 Date 對象
      if (dueDate && (!(dueDate instanceof Date) || isNaN(dueDate.getTime()))) {
        dueDate = null
        dueDateError = '計算結果無效'
      }
    } catch (error) {
      console.warn(`[TaskPreviewPanel] 到期日計算失敗 (任務 #${index + 1}):`, error)
      dueDate = null
      dueDateError = error.message || '計算失敗'
    }

      result.push({
        index,
        stage_order: task.stage_order || index + 1,
        task_name: task.task_name || '未命名任務',
        assignee_name: task.assignee_name || null,
        generation_time: generationTime,
        generation_time_error: generationTimeError,
        due_date: dueDate,
        due_date_error: dueDateError,
        estimated_hours: task.estimated_hours || null,
        is_fixed_deadline: isFixedDeadline || false,
        generation_time_rule: generationTimeRule,
        generation_time_params: generationTimeParams,
        due_date_rule: dueDateRule,
        due_date_params: dueDateParams,
        days_due: daysDue,
        hasError: !generationTime || !dueDate,
        hasCalculationError: !!generationTimeError || !!dueDateError,
        // 分組相關屬性
        isFirstInStage: taskIndexInStage === 0,
        stageTaskCount: stageTasks.length
      })
    })
  })

  return result
})

// 獲取生成時間描述
const getGenerationTimeDescription = (record) => {
  if (!record.generation_time_rule) {
    return '未設置生成時間規則'
  }

  const rule = record.generation_time_rule
  const params = record.generation_time_params || {}
  const month = props.serviceMonth

  switch (rule) {
    case 'service_month_start':
      return `${month}月1日生成`
    
    case 'prev_month_last_x_days':
      if (params.days) {
        const prevMonth = month === 1 ? 12 : month - 1
        return `${prevMonth}月最後${params.days}天生成`
      }
      return '前一個月最後X天生成'
    
    case 'prev_month_x_day':
      if (params.day) {
        const prevMonth = month === 1 ? 12 : month - 1
        return `${prevMonth}月${params.day}日生成`
      }
      return '前一個月第X天生成'
    
    case 'next_month_start':
      {
        const nextMonth = month === 12 ? 1 : month + 1
        return `${nextMonth}月1日生成`
      }
    
    case 'monthly_x_day':
      if (params.day) {
        return `${month}月${params.day}日生成`
      }
      return '每月X日生成'
    
    default:
      return '生成時間規則'
  }
}

// 獲取到期日描述
const getDueDateDescription = (record) => {
  const month = props.serviceMonth

  // 新規則優先
  if (record.days_due !== null && record.days_due !== undefined) {
    return `當月1日 + ${record.days_due}天`
  }

  // 舊規則
  if (!record.due_date_rule) {
    return '未設置到期日規則'
  }

  const rule = record.due_date_rule
  const params = record.due_date_params || {}

  switch (rule) {
    case 'service_month_end':
      return `${month}月最後一天`
    
    case 'next_month_end':
      {
        const nextMonth = month === 12 ? 1 : month + 1
        return `${nextMonth}月最後一天`
      }
    
    case 'n_months_end':
      if (params.months) {
        return `${month}月後${params.months}個月的最後一天`
      }
      return 'N個月後結束'
    
    case 'fixed_date':
      if (params.day) {
        return `每月${params.day}日`
      }
      return '固定日期'
    
    case 'fixed_deadline':
      if (params.year && params.month && params.day) {
        return `${params.year}年${params.month}月${params.day}日（固定期限）`
      }
      return '固定期限'
    
    case 'days_after_start':
      if (params.days) {
        return `當月開始後${params.days}天`
      }
      return '開始後N天'
    
    default:
      return '到期日規則'
  }
}

// 最早生成時間（computed 自動依賴 previewData，使用高效算法）
const earliestGenerationTime = computed(() => {
  const data = previewData.value
  if (data.length === 0) return '-'
  
  // 使用單次遍歷找到最小值，避免排序開銷
  let earliest = null
  let earliestTime = Infinity
  
  for (let i = 0; i < data.length; i++) {
    const time = data[i].generation_time
    if (time && time instanceof Date && !isNaN(time.getTime())) {
      const timeValue = time.getTime()
      if (timeValue < earliestTime) {
        earliestTime = timeValue
        earliest = time
      }
    }
  }
  
  if (!earliest) return '-'
  return formatDateChinese(earliest)
})

// 最晚到期日（computed 自動依賴 previewData，使用高效算法）
const latestDueDate = computed(() => {
  const data = previewData.value
  if (data.length === 0) return '-'
  
  // 使用單次遍歷找到最大值，避免排序開銷
  let latest = null
  let latestTime = -Infinity
  
  for (let i = 0; i < data.length; i++) {
    const date = data[i].due_date
    if (date && date instanceof Date && !isNaN(date.getTime())) {
      const dateValue = date.getTime()
      if (dateValue > latestTime) {
        latestTime = dateValue
        latest = date
      }
    }
  }
  
  if (!latest) return '-'
  return formatDateChinese(latest)
})

// 固定期限任務數量（computed 自動依賴 previewData）
const fixedDeadlineCount = computed(() => {
  return previewData.value.filter(t => t.is_fixed_deadline).length
})

// 響應式更新說明：
// 1. previewData 使用 computed 實現，會自動響應 props.tasks、props.serviceYear 和 props.serviceMonth 的變化
// 2. 為了確保深度響應式追蹤，我們明確訪問了所有嵌套屬性（generation_time_rule, generation_time_params, due_date_rule, due_date_params, days_due）
// 3. 當任務規則變化時，Vue 3 的響應式系統會自動檢測到這些變化並重新計算 previewData
// 4. 計算結果會自動更新到表格中，實現實時預覽更新
// 5. 錯誤處理確保計算失敗時不會崩潰，而是顯示友好的錯誤訊息
// 6. 使用 dateCalculators 的記憶化緩存來優化性能，避免重複計算相同參數的日期
</script>

<style scoped>
.task-preview-panel {
  width: 100%;
}

.preview-summary {
  padding: 16px;
  background: #f9fafb;
  border-radius: 4px;
}

:deep(.ant-table-tbody > tr > td) {
  vertical-align: top;
  padding: 12px 8px;
}

:deep(.ant-statistic-title) {
  font-size: 13px;
  color: #6b7280;
}

:deep(.ant-statistic-content) {
  font-size: 18px;
}
</style>

