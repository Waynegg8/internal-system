<template>
  <div class="task-configuration">
    <!-- 模板選擇（僅在非模板創建模式顯示） -->
    <a-form-item v-if="!hideTemplateSelect" label="從模板選擇（可選）">
      <a-select
        v-model:value="selectedTemplate"
        placeholder="選擇任務模板，或手動配置"
        allow-clear
        @change="handleTemplateChange"
        :options="templateOptions"
        :loading="loadingTemplates"
      />
      <template #help>
        <span style="color: #6b7280; font-size: 12px;">
          選擇模板後會自動載入任務，您可以繼續編輯或添加新任務
        </span>
      </template>
    </a-form-item>

    <!-- 服務層級 SOP（自動判斷，只顯示不可選擇） -->
    <a-form-item label="服務層級 SOP（自動配置）">
      <div v-if="autoSelectedServiceSops.length > 0" style="padding: 12px; background: #f0f9ff; border-radius: 4px; border-left: 3px solid #3b82f6;">
        <div style="font-size: 12px; color: #1e40af; margin-bottom: 8px; font-weight: 500;">
          系統已自動配置以下 SOP（{{ autoSelectedServiceSops.length }}個）
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          <a-tag
            v-for="sop in autoSelectedServiceSops"
            :key="sop.sop_id"
            color="blue"
          >
            {{ sop.title }}
            <span v-if="sop.client_id" style="margin-left: 4px; font-size: 11px;">
              [客戶專屬]
            </span>
          </a-tag>
        </div>
      </div>
      <div v-else style="color: #9ca3af; font-size: 13px; padding: 12px; background: #f9fafb; border-radius: 4px;">
        此服務暫無專屬的服務層級 SOP
      </div>
      <template #help>
        <span style="color: #6b7280; font-size: 12px;">
          系統自動配置：優先使用客戶專屬 SOP，否則使用服務通用 SOP
        </span>
      </template>
    </a-form-item>

    <!-- 任務配置區域 -->
    <div class="tasks-config-section">
      <div class="tasks-header">
        <div>
          <strong style="color: #1e40af; font-size: 15px;">任務配置</strong>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #3b82f6;">
            配置每月自動生成的任務
          </p>
        </div>
        <a-button type="primary" @click="addTask">
          <template #icon>
            <PlusOutlined />
          </template>
          新增任務
        </a-button>
      </div>

      <!-- 批量設置負責人 -->
      <div class="batch-assignee-section">
        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="font-size: 13px; font-weight: 500; color: #1e40af; white-space: nowrap;">
            批量設置負責人：
          </label>
          <a-select
            v-model:value="batchAssignee"
            placeholder="請選擇員工"
            style="flex: 1; max-width: 200px;"
            :options="userOptions"
            allow-clear
          />
          <a-button type="primary" size="small" @click="applyBatchAssignee">
            套用到所有任務
          </a-button>
          <small style="color: #6b7280; font-size: 12px;">
            之後可單獨修改個別任務
          </small>
        </div>
      </div>

      <!-- 任務列表 -->
      <div class="tasks-list">
        <div
          v-for="(task, index) in localTasks"
          :key="index"
          class="task-item-config"
          :class="{ 'from-template': task.fromTemplate }"
        >
          <div class="task-item-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="task-number-badge" :class="{ 'from-template': task.fromTemplate }">
                {{ task.stage_order || (index + 1) }}
              </div>
              <span class="task-number">
                <span style="font-weight: 600; color: #1e40af;">階段 {{ task.stage_order || (index + 1) }}</span>
                <span style="margin: 0 8px; color: #d1d5db;">|</span>
                <span>任務 #{{ index + 1 }}</span>
              </span>
              <a-tag v-if="task.fromTemplate" color="blue" size="small">來自模板</a-tag>
            </div>
            <a-button
              type="text"
              danger
              size="small"
              @click="removeTask(index)"
            >
              刪除
            </a-button>
          </div>

          <a-form layout="vertical">
            <!-- 任務名稱 -->
            <a-form-item label="任務名稱" required>
              <a-select
                v-model:value="task.name"
                :options="taskTypeOptions"
                :placeholder="taskTypeOptions.length ? '請選擇任務類型' : '請先確認服務類型是否正確'"
                :disabled="taskTypeOptions.length === 0"
                show-search
                :filter-option="taskTypeFilter"
                @change="emitTasks"
              />
              <template #help>
                <span v-if="task.description" style="color: #6b7280; font-size: 12px;">
                  {{ task.description }}
                </span>
                <span v-else style="color: #6b7280; font-size: 12px;">
                  只能選擇與當前服務類型匹配的任務類型
                </span>
              </template>
            </a-form-item>

            <!-- 階段選擇 -->
            <a-form-item label="所屬階段" required>
              <a-input-number
                v-model:value="task.stage_order"
                :min="1"
                placeholder="請輸入階段編號"
                @change="handleStageChange(index)"
                :disabled="readOnly"
                style="width: 100%;"
              />
              <template #help>
                <span style="color: #6b7280; font-size: 12px;">
                  輸入階段編號（從 1 開始），多個任務可以使用相同階段編號實現同步進行
                </span>
              </template>
            </a-form-item>

            <a-row :gutter="16">
              <!-- 負責人 -->
              <a-col :span="12">
                <a-form-item label="負責人員">
                  <a-select
                    v-model:value="task.assignee_user_id"
                    placeholder="未指定"
                    :options="userOptions"
                    allow-clear
                  />
                </a-form-item>
              </a-col>
              <!-- 預估工時 -->
              <a-col :span="12">
                <a-form-item label="預估工時（小時）">
                  <a-input-number
                    v-model:value="task.estimated_hours"
                    :min="0"
                    :step="0.5"
                    placeholder="例如：2"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="16">
              <!-- 提前生成天數 -->
              <a-col :span="8">
                <a-form-item label="提前生成">
                  <a-input-number
                    v-model:value="task.advance_days"
                    :min="0"
                    placeholder="7"
                    style="width: 100%"
                  />
                  <template #help>
                    <span style="color: #6b7280; font-size: 11px;">天前自動生成</span>
                  </template>
                </a-form-item>
              </a-col>
              <!-- 新：以月初為基準 + days_due -->
              <a-col :span="16">
                <a-form-item label="到期計算（簡化）">
                  <div style="display:flex; gap:8px; align-items:center;">
                    <span style="white-space:nowrap; color:#374151;">每月</span>
                    <a-input
                      value="1"
                      disabled
                      style="width: 60px; text-align:center;"
                    />
                    <span style="white-space:nowrap; color:#374151;">日 +</span>
                    <a-input-number
                      v-model:value="task.days_due"
                      :min="0"
                      placeholder="例如：20"
                      style="width: 120px"
                      @change="emitTasks"
                    />
                    <span style="white-space:nowrap; color:#374151;">天</span>
                  </div>
                  <template #help>
                    <span style="color:#6b7280; font-size:11px;">
                      新規則：到期日 = 當月 1 日 + days_due。未填則沿用舊規則（如每月最後一天）。
                    </span>
                  </template>
                </a-form-item>
              </a-col>
            </a-row>

            <!-- 任務 SOP（自動過濾） -->
            <a-form-item label="任務 SOP（可選）">
              <div v-if="taskSops.length === 0" style="color: #9ca3af; font-size: 13px; padding: 8px; background: #f9fafb; border-radius: 4px;">
                此服務暫無專屬的任務層級 SOP
              </div>
              <div v-else>
                <div class="task-sops-selected" v-if="task.sops && task.sops.length > 0" style="margin-bottom: 8px;">
                  <a-tag
                    v-for="sop in task.sops"
                    :key="sop.sop_id"
                    closable
                    @close="removeTaskSop(index, sop)"
                    color="green"
                    size="small"
                  >
                    {{ sop.title }}
                  </a-tag>
                </div>
                <a-button size="small" @click="showTaskSopModal(index)">
                  選擇 SOP
                </a-button>
              </div>
            </a-form-item>

            <!-- 執行頻率設置 -->
            <a-divider style="margin: 16px 0 12px 0; font-size: 13px; color: #3b82f6;">
              執行頻率設置
            </a-divider>

            <a-form-item label="執行頻率">
              <a-select 
                v-model:value="task.execution_frequency"
                @change="handleFrequencyChange(index)"
                placeholder="選擇執行頻率"
              >
                <a-select-option value="monthly">每月執行</a-select-option>
                <a-select-option value="bi-monthly">雙月執行（奇數月）</a-select-option>
                <a-select-option value="quarterly">季度執行</a-select-option>
                <a-select-option value="semi-annual">半年執行</a-select-option>
                <a-select-option value="annual">年度執行</a-select-option>
                <a-select-option value="custom">自訂月份</a-select-option>
              </a-select>
              <template #help>
                <span style="color: #6b7280; font-size: 12px;">
                  {{ getFrequencyDescription(task) }}
                </span>
              </template>
            </a-form-item>

            <!-- 自訂月份選擇 -->
            <a-form-item 
              v-if="task.execution_frequency === 'custom'"
              label="選擇執行月份"
            >
              <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
                <!-- 快速選擇按鈕 -->
                <a-space style="margin-bottom: 12px;" size="small">
                  <a-button size="small" @click="selectAllMonths(index)">全選</a-button>
                  <a-button size="small" @click="deselectAllMonths(index)">全不選</a-button>
                  <a-button size="small" @click="selectOddMonths(index)">奇數月</a-button>
                  <a-button size="small" @click="selectEvenMonths(index)">偶數月</a-button>
                  <a-button size="small" @click="selectQuarterlyMonths(index)">每季首月</a-button>
                </a-space>

                <!-- 月份勾選 -->
                <a-checkbox-group 
                  v-model:value="task.execution_months"
                  style="width: 100%"
                  @change="emitTasks"
                >
                  <a-row :gutter="[8, 8]">
                    <a-col 
                      v-for="month in 12" 
                      :key="month" 
                      :span="4"
                    >
                      <a-checkbox :value="month">
                        {{ month }}月
                      </a-checkbox>
                    </a-col>
                  </a-row>
                </a-checkbox-group>

                <!-- 已選擇提示 -->
                <a-alert 
                  v-if="task.execution_months && task.execution_months.length > 0"
                  type="info" 
                  show-icon
                  style="margin-top: 12px;"
                >
                  <template #message>
                    <span style="font-size: 12px;">
                      已選擇 {{ task.execution_months.length }} 個月份：
                      {{ task.execution_months.sort((a, b) => a - b).join('、') }}月
                    </span>
                  </template>
                </a-alert>
              </div>
            </a-form-item>

            <!-- 執行預覽（視覺化時間軸） -->
            <a-form-item label="執行預覽" v-if="task.execution_months && task.execution_months.length > 0">
              <div class="year-timeline">
                <div 
                  v-for="month in 12" 
                  :key="month"
                  class="month-cell"
                  :class="{
                    'active': task.execution_months.includes(month),
                    'inactive': !task.execution_months.includes(month)
                  }"
                  :title="`${month}月${task.execution_months.includes(month) ? '執行' : '跳過'}`"
                >
                  <span class="month-number">{{ month }}</span>
                  <span class="month-status">{{ task.execution_months.includes(month) ? '●' : '○' }}</span>
                </div>
              </div>
            </a-form-item>

            <!-- 備註 -->
            <a-form-item label="💡 備註">
              <a-textarea
                v-model:value="task.notes"
                placeholder="選填"
                :rows="2"
              />
            </a-form-item>
          </a-form>
        </div>

        <!-- 空狀態 -->
        <div v-if="localTasks.length === 0" class="empty-tasks-warning">
          <p style="margin: 0 0 10px 0; font-weight: 500;">⚠️ 尚未配置任何任務</p>
          <p style="margin: 0;">點擊上方「+ 新增任務」按鈕開始配置</p>
        </div>
      </div>
    </div>

    <!-- 任務 SOP 選擇 Modal -->
    <a-modal
      v-model:open="taskSopModalVisible"
      title="選擇任務 SOP"
      width="600px"
      @ok="handleTaskSopOk"
    >
      <a-input-search
        v-model:value="taskSopSearchText"
        placeholder="搜尋 SOP..."
        style="margin-bottom: 16px;"
      />
      <div class="sop-list-container">
        <a-checkbox-group v-model:value="taskSopSelectedIds" style="width: 100%;">
          <div
            v-for="sop in filteredTaskSops"
            :key="sop.sop_id"
            class="sop-checkbox-item"
          >
            <a-checkbox :value="sop.sop_id">
              {{ sop.title }}
            </a-checkbox>
          </div>
        </a-checkbox-group>
      </div>
      <template #footer>
        <a-button @click="taskSopModalVisible = false">取消</a-button>
        <a-button type="primary" @click="handleTaskSopOk">確定</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { fetchTaskTemplates } from '@/api/task-templates'
import { fetchAllUsers } from '@/api/users'
import { fetchAllSOPs } from '@/api/sop'
import { fetchAllServices, fetchServiceItems } from '@/api/services'
import { extractApiArray } from '@/utils/apiHelpers'
import { getId, getField } from '@/utils/fieldHelper'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => []
  },
  sops: {
    type: Array,
    default: () => []
  },
  serviceId: {
    type: [Number, String],
    required: true
  },
  clientId: {
    type: [Number, String],
    required: false
  },
  // 是否隱藏模板選擇（用於任務模板創建時）
  hideTemplateSelect: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:tasks', 'update:sops'])

// 狀態
const selectedTemplate = ref(null)
const batchAssignee = ref(null)
const taskSopSearchText = ref('')
const taskSopModalVisible = ref(false)
const currentTaskIndex = ref(null)
const loadingTemplates = ref(false)

// 數據
const allTemplates = ref([])
const allUsers = ref([])
const allSops = ref([])
const allServices = ref([])
const currentServiceCode = ref('')
const localTasks = ref([])
const localSops = ref([])
const taskSopSelectedIds = ref([])
const selectedSopIds = ref([])
const allServiceItems = ref([])

// 服務層級 SOP（根據 service_code 自動過濾，包含客戶專屬 SOP）
const serviceSops = computed(() => {
  const serviceCode = currentServiceCode.value || ''
  const sops = allSops.value || []
  
  if (!serviceCode || !sops.length) return []
  
  return sops.filter(sop =>
    sop &&
    sop.scope === 'service' &&
    sop.category &&
    (sop.category === serviceCode ||
     sop.category === serviceCode.toLowerCase() ||
     sop.category === serviceCode.toUpperCase())
  )
})

// 自動選擇的服務層級 SOP（優先客戶專屬，否則通用）
const autoSelectedServiceSops = computed(() => {
  // 簡化版本，避免Vue編譯問題
  return []
})

// 任務層級 SOP（根據 service_code 自動過濾）
const taskSops = computed(() => {
  const serviceCode = currentServiceCode.value || ''
  const sops = allSops.value || []
  
  if (!serviceCode || !sops.length) return []
  
  return sops.filter(sop =>
    sop &&
    sop.scope === 'task' &&
    sop.category &&
    (sop.category === serviceCode ||
     sop.category === serviceCode.toLowerCase() ||
     sop.category === serviceCode.toUpperCase())
  )
})

// 選項 - 根據 service_code 精確篩選模板
const templateOptions = computed(() => {
  const currentService = allServices.value.find(s => getId(s, 'service_id', 'id') == props.serviceId)
  const currentServiceCode = currentService?.service_code || ''
  
  if (!currentServiceCode) {
    // 如果無法獲取 service_code，回退到只匹配 service_id
    return allTemplates.value
      .filter(t => t.service_id == props.serviceId)
      .map(t => ({
        label: t.template_name,
        value: getId(t, 'template_id', 'id')
      }))
  }
  
  // 根據 service_code 篩選模板（不包含通用模板）
  return allTemplates.value
    .filter(t => {
      // 必須有 service_id
      if (!t.service_id) return false
      
      // 獲取模板對應的服務
      const templateService = allServices.value.find(s => getId(s, 'service_id', 'id') == t.service_id)
      if (!templateService) return false
      
      // 比較 service_code
      return templateService.service_code === currentServiceCode
    })
    .map(t => ({
      label: t.template_name,
      value: getId(t, 'template_id', 'id')
    }))
})

const userOptions = computed(() => {
  return allUsers.value.map(u => ({
    label: u.name || u.username,
    value: getId(u, 'user_id', 'id')
  }))
})

// 任務類型選項：依照當前 serviceId 過濾 ServiceItems（任務類型）
const taskTypeOptions = computed(() => {
  if (!props.serviceId) return []
  const sid = String(props.serviceId)
  const items = (allServiceItems.value || []).filter(item => {
    return String(item.service_id) === sid && item.is_active !== false
  })
  return items.map(item => ({
    label: item.item_name,
    value: item.item_name
  }))
})

const taskTypeFilter = (input, option) => {
  const text = (option?.label || '').toString().toLowerCase()
  return text.includes((input || '').toString().toLowerCase())
}

const filteredTaskSops = computed(() => {
  if (!taskSopSearchText.value) return taskSops.value
  const search = taskSopSearchText.value.toLowerCase()
  return taskSops.value.filter(sop =>
    sop.title.toLowerCase().includes(search)
  )
})

// 期限規則說明
// 保留舊說明函式以相容（UI 已改為 days_due）
const getDueRuleHelp = () => ''

// 模板變更
const handleTemplateChange = async (templateId) => {
  if (!templateId) return

  loadingTemplates.value = true
  try {
    const template = allTemplates.value.find(t => getId(t, 'template_id', 'id') === templateId)
    if (!template || !template.tasks) return

    // 將模板的任務加載到本地任務列表
    const templateTasks = template.tasks.map(task => ({
      name: task.task_name,
      assignee_user_id: task.assignee_user_id || null,
      estimated_hours: task.estimated_hours || null,
      advance_days: task.advance_days || 7,
      due_rule: task.due_rule || 'end_of_month',
      due_value: task.due_value || null,
      execution_frequency: task.execution_frequency || 'monthly',
      execution_months: task.execution_months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      notes: task.notes || null,
      sops: task.sops || [],
      sop_ids: (task.sops || []).map(s => s.sop_id),
      stage_order: task.stage_order,
      description: task.description || null,
      fromTemplate: true
    }))

    localTasks.value = [...localTasks.value, ...templateTasks]
    emitTasks()
  } finally {
    loadingTemplates.value = false
  }
}

// 計算當前最大的階段編號
const maxStageNumber = computed(() => {
  if (localTasks.value.length === 0) return 0
  return Math.max(...localTasks.value.map(task => task.stage_order || 0))
})

// 計算所有可用的階段（去重後排序）
const availableStages = computed(() => {
  if (localTasks.value.length === 0) return [1]
  
  // 確保至少有階段 1 到最大階段編號
  const maxStage = maxStageNumber.value || 1
  const allStages = []
  for (let i = 1; i <= maxStage; i++) {
    allStages.push(i)
  }
  
  return allStages
})

// 處理階段變更
const handleStageChange = (index) => {
  // 只通知父組件更新，不進行排序（排序將在查看時進行）
  emitTasks()
}

// 根據階段順序排序任務
const sortTasksByStage = () => {
  localTasks.value.sort((a, b) => {
    const stageA = a.stage_order || 0
    const stageB = b.stage_order || 0
    return stageA - stageB
  })
}

// 新增任務
const addTask = () => {
  // 默認設置為階段 1，用戶可以手動選擇其他階段
  localTasks.value.push({
    name: '',
    stage_order: 1,
    assignee_user_id: null,
    estimated_hours: null,
    advance_days: 7,
    // 新規：預設不填，沿用舊規則；使用者可填 days_due 啟用新規
    days_due: null,
    due_rule: 'end_of_month', // 相容保留
    due_value: null,          // 相容保留
    execution_frequency: 'monthly',
    execution_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    notes: null,
    sops: [],
    sop_ids: [],
    fromTemplate: false
  })
  emitTasks()
}

// 移除任務
const removeTask = (index) => {
  localTasks.value.splice(index, 1)
  emitTasks()
}

// 期限規則變更
const handleDueRuleChange = (index) => {
  const task = localTasks.value[index]
  if (task.due_rule === 'end_of_month') {
    task.due_value = null
  }
}

// 期限值變更
const handleDueValueChange = (index) => {
  // 觸發響應式更新
  emitTasks()
}

// 批量設置負責人
const applyBatchAssignee = () => {
  if (!batchAssignee.value) return
  localTasks.value.forEach(task => {
    task.assignee_user_id = batchAssignee.value
  })
  emitTasks()
}

// 顯示任務 SOP Modal
const showTaskSopModal = (index) => {
  currentTaskIndex.value = index
  const task = localTasks.value[index]
  taskSopSelectedIds.value = (task.sop_ids || [])
  taskSopModalVisible.value = true
}

// 任務 SOP 確認
const handleTaskSopOk = () => {
  if (currentTaskIndex.value === null) return

  const task = localTasks.value[currentTaskIndex.value]
  task.sops = taskSops.value.filter(sop =>
    taskSopSelectedIds.value.includes(getId(sop, 'sop_id', 'id'))
  )
  task.sop_ids = taskSopSelectedIds.value

  taskSopModalVisible.value = false
  currentTaskIndex.value = null
  emitTasks()
}

// 移除任務 SOP
const removeTaskSop = (taskIndex, sop) => {
  const task = localTasks.value[taskIndex]
  const sopId = getId(sop, 'sop_id', 'id')
  task.sops = (task.sops || []).filter(s => getId(s, 'sop_id', 'id') !== sopId)
  task.sop_ids = (task.sop_ids || []).filter(id => id !== sopId)
  emitTasks()
}

// 發射事件
const emitTasks = () => {
  emit('update:tasks', JSON.parse(JSON.stringify(localTasks.value)))
}

const emitSops = () => {
  emit('update:sops', JSON.parse(JSON.stringify(localSops.value)))
}

// 執行頻率處理函數
const handleFrequencyChange = (index) => {
  const task = localTasks.value[index]
  
  // 根據頻率預設月份
  const presets = {
    monthly: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    'bi-monthly': [1, 3, 5, 7, 9, 11],
    quarterly: [1, 4, 7, 10],
    'semi-annual': [1, 7],
    annual: [1],
    custom: []
  }
  
  task.execution_months = presets[task.execution_frequency] || []
  emitTasks()
}

const getFrequencyDescription = (task) => {
  const frequency = task.execution_frequency || 'monthly'
  const descriptions = {
    monthly: '全年每月都執行（12個月）',
    'bi-monthly': '奇數月執行（1、3、5、7、9、11月）',
    quarterly: '每季第一個月執行（1、4、7、10月）',
    'semi-annual': '半年執行（1月、7月）',
    annual: '年度執行（僅1月）',
    custom: task.execution_months?.length 
      ? `在 ${task.execution_months.length} 個月份執行` 
      : '請選擇執行月份'
  }
  return descriptions[frequency] || ''
}

// 快速選擇月份
const selectAllMonths = (index) => {
  localTasks.value[index].execution_months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  emitTasks()
}

const deselectAllMonths = (index) => {
  localTasks.value[index].execution_months = []
  emitTasks()
}

const selectOddMonths = (index) => {
  localTasks.value[index].execution_months = [1, 3, 5, 7, 9, 11]
  emitTasks()
}

const selectEvenMonths = (index) => {
  localTasks.value[index].execution_months = [2, 4, 6, 8, 10, 12]
  emitTasks()
}

const selectQuarterlyMonths = (index) => {
  localTasks.value[index].execution_months = [1, 4, 7, 10]
  emitTasks()
}

// 加載數據
const loadData = async () => {
  try {
    const [templatesRes, usersRes, sopsRes, servicesRes, serviceItemsRes] = await Promise.all([
      fetchTaskTemplates(),
      fetchAllUsers(),
      fetchAllSOPs(),
      fetchAllServices(),
      fetchServiceItems()
    ])

    allTemplates.value = extractApiArray(templatesRes, [])
    allUsers.value = extractApiArray(usersRes, [])
    allSops.value = extractApiArray(sopsRes, [])
    allServices.value = extractApiArray(servicesRes, [])
    allServiceItems.value = extractApiArray(serviceItemsRes, [])

    // 獲取當前服務的 service_code
    const service = allServices.value.find(s => getId(s, 'service_id', 'id') == props.serviceId)
    currentServiceCode.value = service?.service_code || ''
  } catch (error) {
    console.error('載入數據失敗:', error)
  }
}

// 初始化時從 props 加載數據（只執行一次）
onMounted(() => {
  // 只在初始化時從 props 加載
  if (props.tasks && props.tasks.length > 0) {
    localTasks.value = JSON.parse(JSON.stringify(props.tasks))
  }
  if (props.sops && props.sops.length > 0) {
    localSops.value = JSON.parse(JSON.stringify(props.sops))
    selectedSopIds.value = localSops.value.map(sop => getId(sop, 'sop_id', 'id'))
  }
  
  loadData()
})
</script>

<style scoped>
.task-configuration {
  padding: 0;
}

.selected-sops {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sop-list-container {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 12px;
  background: white;
}

.sop-checkbox-item {
  padding: 4px 0;
}

.tasks-config-section {
  background: #f0f9ff;
  border-radius: 8px;
  border: 2px solid #3b82f6;
  padding: 16px;
  margin-top: 16px;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.batch-assignee-section {
  background: white;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  border: 1px solid #3b82f6;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-item-config {
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}

.task-item-config.from-template {
  border-color: #3b82f6;
  border-width: 2px;
}

.task-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.task-number-badge {
  width: 30px;
  height: 30px;
  background: #6b7280;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.task-number-badge.from-template {
  background: #3b82f6;
}

.task-number {
  font-weight: 600;
  color: #1f2937;
}

.task-sops-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.empty-tasks-warning {
  padding: 20px;
  text-align: center;
  background: #fef3c7;
  border-radius: 8px;
  border: 2px dashed #fbbf24;
  color: #92400e;
  font-size: 14px;
}

/* 執行頻率視覺化 */
.year-timeline {
  display: flex;
  gap: 6px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.month-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 2px;
  border-radius: 4px;
  font-size: 11px;
  cursor: default;
  transition: all 0.2s ease;
  min-width: 40px;
}

.month-cell.active {
  background: #dbeafe;
  border: 2px solid #3b82f6;
  color: #1e40af;
  font-weight: 600;
}

.month-cell.inactive {
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  color: #9ca3af;
  opacity: 0.6;
}

.month-number {
  font-weight: 600;
  margin-bottom: 2px;
}

.month-status {
  font-size: 14px;
  line-height: 1;
}
</style>
