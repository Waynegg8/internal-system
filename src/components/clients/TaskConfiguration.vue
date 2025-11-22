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

    <!-- SOP 選擇器組件 -->
    <TaskSOPSelector
      :service-id="serviceId"
      :client-id="clientId"
      :selected-task-s-o-p-ids="taskSOPIds"
      @update:selectedTaskSOPIds="handleTaskSOPIdsUpdate"
    />

    <!-- 任務配置區域 -->
    <div class="tasks-config-section">
      <div class="tasks-header">
        <div>
          <strong style="color: #1e40af; font-size: 15px;">任務配置</strong>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #3b82f6;">
            配置每月自動生成的任務
          </p>
        </div>
        <a-button type="primary" @click="handleAddTaskClick">
          <template #icon>
            <PlusOutlined />
          </template>
          新增任務
        </a-button>
      </div>

      <!-- 批量設置負責人 -->
      <div class="batch-assignee-section">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px;">
            <a-checkbox
              :indeterminate="isIndeterminate"
              :checked="isAllSelected"
              @change="handleSelectAll"
            >
              全選
            </a-checkbox>
            <span v-if="selectedTaskIndices.length > 0" style="color: #3b82f6; font-weight: 500; font-size: 13px;">
              已選擇 {{ selectedTaskIndices.length }} 個任務
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
            <label style="font-size: 13px; font-weight: 500; color: #1e40af; white-space: nowrap;">
              批量設置負責人：
            </label>
            <a-select
              v-model:value="batchAssignee"
              placeholder="請選擇員工"
              style="flex: 1; max-width: 200px;"
              :options="userOptions"
              allow-clear
              :disabled="selectedTaskIndices.length === 0"
            />
            <a-button 
              type="primary" 
              size="small" 
              @click="applyBatchAssignee"
              :disabled="selectedTaskIndices.length === 0 || !batchAssignee"
              :loading="batchAssigneeLoading"
            >
              套用到選中任務
            </a-button>
          </div>
        </div>
        <div v-if="selectedTaskIndices.length === 0" style="margin-top: 8px;">
          <small style="color: #6b7280; font-size: 12px;">
            請先選擇要批量設置的任務
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
              <a-checkbox
                :checked="isTaskSelected(index)"
                @change="(e) => handleTaskSelect(index, e.target.checked)"
                style="margin-right: 4px;"
              />
              <div class="task-number-badge" :class="{ 'from-template': task.fromTemplate }">
                {{ task.stage_order || (index + 1) }}
              </div>
              <span class="task-number">
                <span style="font-weight: 600; color: #1e40af;">階段 {{ task.stage_order || (index + 1) }}</span>
                <span style="margin: 0 8px; color: #d1d5db;">|</span>
                <span>任務 #{{ index + 1 }}</span>
              </span>
              <a-tag v-if="task.fromTemplate" color="blue" size="small">來自模板</a-tag>
              <a-tag 
                v-if="task._optionType === 'current_month'" 
                color="blue" 
                size="small"
              >
                僅當前月份生成
              </a-tag>
              <a-tag 
                v-else-if="task._optionType === 'save_template' || (task.use_for_auto_generate && !task._optionType)" 
                color="green" 
                size="small"
              >
                自動生成
              </a-tag>
              <a-tag 
                v-else-if="task._optionType === 'retain_settings' || (!task.use_for_auto_generate && !task._optionType && serviceType === 'recurring')" 
                color="purple" 
                size="small"
              >
                手動添加
              </a-tag>
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

          <a-form 
            layout="vertical"
            :ref="(el) => setFormRef(el, index)"
            :model="task"
            :rules="getTaskRules(index)"
          >
            <!-- 任務名稱 -->
            <a-form-item label="任務名稱" name="name" required>
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
            <a-form-item label="所屬階段" name="stage_order" required>
              <a-input-number
                v-model:value="task.stage_order"
                :min="1"
                placeholder="請輸入階段編號"
                @change="() => { handleStageChange(index); emitTasks(); }"
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
                <a-form-item label="預估工時（小時）" name="estimated_hours">
                  <a-input-number
                    v-model:value="task.estimated_hours"
                    :min="0"
                    :step="0.5"
                    placeholder="例如：2"
                    style="width: 100%"
                    @change="emitTasks"
                  />
                </a-form-item>
              </a-col>
            </a-row>

            <!-- 任務生成時間規則 -->
            <a-form-item label="任務生成時間規則">
              <TaskGenerationTimeRule
                v-model="task.generation_time_rule"
                :service-year="serviceYear"
                :service-month="serviceMonth"
                @update:modelValue="handleGenerationTimeRuleChange(index, $event)"
                @change="emitTasks"
              />
            </a-form-item>

            <!-- 任務到期日規則 -->
            <a-form-item label="任務到期日規則">
              <TaskDueDateRule
                :model-value="task.due_date_rule && typeof task.due_date_rule === 'object' ? task.due_date_rule : { rule: null, params: {}, days_due: null, is_fixed_deadline: false }"
                :service-year="serviceYear"
                :service-month="serviceMonth"
                @update:modelValue="handleDueDateRuleChange(index, $event)"
                @change="emitTasks"
              />
            </a-form-item>

            <!-- 任務 SOP（內聯選擇） -->
            <a-form-item label="任務 SOP（可選）">
              <TaskSOPSelector
                :service-id="serviceId"
                :client-id="clientId"
                :selected-task-s-o-p-ids="task.sop_ids || []"
                @update:selectedTaskSOPIds="(ids) => handleTaskSOPUpdate(index, ids)"
              />
            </a-form-item>


            <!-- 執行頻率設置 -->
            <a-divider style="margin: 16px 0 12px 0; font-size: 13px; color: #3b82f6;">
              執行頻率設置
            </a-divider>

            <a-form-item label="執行頻率" name="execution_frequency">
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
              name="execution_months"
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

            <!-- 任務配置選項（僅定期服務顯示） -->
            <a-form-item 
              v-if="serviceType !== 'one-time'"
              label="任務配置選項"
            >
              <a-radio-group 
                v-model:value="task._optionType"
                @change="handleTaskOptionChange(index)"
                style="width: 100%"
              >
                <a-radio 
                  value="save_template"
                  style="display: block; margin-bottom: 12px; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; transition: all 0.3s;"
                  :class="{ 'option-selected': task._optionType === 'save_template' || (task.use_for_auto_generate && !task._optionType) }"
                >
                  <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span style="font-weight: 600; font-size: 14px; color: #059669;">保存為模板，用於未來自動生成</span>
                    <a-tag color="green" size="small" style="margin-left: 8px;">自動生成</a-tag>
                  </div>
                  <div style="font-size: 12px; color: #6b7280; line-height: 1.5;">
                    保存任務配置並設置為自動生成，系統會根據執行頻率自動生成任務。適合定期重複執行的任務。
                  </div>
                </a-radio>
                <a-radio 
                  value="retain_settings"
                  style="display: block; margin-bottom: 12px; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; transition: all 0.3s;"
                  :class="{ 'option-selected': task._optionType === 'retain_settings' || (!task.use_for_auto_generate && !task._optionType) }"
                >
                  <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span style="font-weight: 600; font-size: 14px; color: #7c3aed;">保留設定，未來可手動加入</span>
                    <a-tag color="purple" size="small" style="margin-left: 8px;">手動添加</a-tag>
                  </div>
                  <div style="font-size: 12px; color: #6b7280; line-height: 1.5;">
                    保存任務配置但不自動生成，未來需要手動添加任務。適合需要靈活控制的任務。
                  </div>
                </a-radio>
                <a-radio 
                  value="current_month"
                  style="display: block; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; transition: all 0.3s;"
                  :class="{ 'option-selected': task._optionType === 'current_month' }"
                >
                  <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <span style="font-weight: 600; font-size: 14px; color: #1e40af;">僅為當前月份生成</span>
                    <a-tag color="blue" size="small" style="margin-left: 8px;">立即生成</a-tag>
                  </div>
                  <div style="font-size: 12px; color: #6b7280; line-height: 1.5;">
                    立即為當前月份生成任務，但不保存為模板。適合臨時性任務或一次性需求。
                  </div>
                </a-radio>
              </a-radio-group>
              <template #help>
                <span style="color: #6b7280; font-size: 12px;">
                  選擇任務的配置方式，不同的方式會影響任務的生成和保存行為
                </span>
              </template>
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

    <!-- 新增任務選項 Modal（僅定期服務） -->
    <a-modal
      v-model:open="addTaskOptionModalVisible"
      title="選擇任務配置方式"
      @ok="handleAddTaskOptionConfirm"
      @cancel="handleAddTaskOptionCancel"
      :mask-closable="false"
      :width="600"
    >
      <a-alert
        type="info"
        message="請選擇此任務的配置方式"
        description="不同的配置方式會影響任務的生成和保存行為"
        show-icon
        style="margin-bottom: 24px;"
      />
      <a-radio-group v-model:value="selectedAddTaskOption" style="width: 100%;">
        <a-radio :value="'current_month'" style="display: block; margin-bottom: 16px; padding: 16px; border: 2px solid #e5e7eb; border-radius: 8px; transition: all 0.3s;" :class="{ 'option-selected': selectedAddTaskOption === 'current_month' }">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 600; font-size: 15px; color: #1e40af;">僅為當前月份生成</span>
            <a-tag color="blue" style="margin-left: 8px;">立即生成</a-tag>
          </div>
          <div style="font-size: 13px; color: #6b7280; line-height: 1.6;">
            立即為當前月份生成任務，但不保存為模板。適合臨時性任務或一次性需求。
          </div>
        </a-radio>
        <a-radio :value="'save_template'" style="display: block; margin-bottom: 16px; padding: 16px; border: 2px solid #e5e7eb; border-radius: 8px; transition: all 0.3s;" :class="{ 'option-selected': selectedAddTaskOption === 'save_template' }">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 600; font-size: 15px; color: #059669;">保存為模板，用於未來自動生成</span>
            <a-tag color="green" style="margin-left: 8px;">自動生成</a-tag>
          </div>
          <div style="font-size: 13px; color: #6b7280; line-height: 1.6;">
            保存任務配置並設置為自動生成，系統會根據執行頻率自動生成任務。適合定期重複執行的任務。
          </div>
        </a-radio>
        <a-radio :value="'retain_settings'" style="display: block; padding: 16px; border: 2px solid #e5e7eb; border-radius: 8px; transition: all 0.3s;" :class="{ 'option-selected': selectedAddTaskOption === 'retain_settings' }">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 600; font-size: 15px; color: #7c3aed;">保留設定，未來可手動加入</span>
            <a-tag color="purple" style="margin-left: 8px;">手動添加</a-tag>
          </div>
          <div style="font-size: 13px; color: #6b7280; line-height: 1.6;">
            保存任務配置但不自動生成，未來需要手動添加任務。適合需要靈活控制的任務。
          </div>
        </a-radio>
      </a-radio-group>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { fetchTaskTemplates } from '@/api/task-templates'
import { fetchAllUsers } from '@/api/users'
import { fetchAllSOPs } from '@/api/sop'
import { fetchAllServices, fetchServiceItems } from '@/api/services'
import { extractApiArray } from '@/utils/apiHelpers'
import { getId, getField } from '@/utils/fieldHelper'
import { handleError, getErrorMessage } from '@/utils/errorHandler'
import { createTaskConfigRules } from '@/utils/validation'
import TaskSOPSelector from './TaskSOPSelector.vue'
import TaskGenerationTimeRule from './TaskGenerationTimeRule.vue'
import TaskDueDateRule from './TaskDueDateRule.vue'

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
  },
  // 服務類型（'recurring' | 'one-time'）
  serviceType: {
    type: String,
    default: 'recurring'
  },
  // 客戶服務 ID（用於生成任務）
  clientServiceId: {
    type: [Number, String],
    required: false
  },
  // 服務年份（用於規則組件計算）
  serviceYear: {
    type: Number,
    default: null
  },
  // 服務月份（用於規則組件計算）
  serviceMonth: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:tasks', 'update:sops', 'task-option-selected'])

// Page Alert
const { showWarning, showError, showInfo } = usePageAlert()

// 狀態
const selectedTemplate = ref(null)
const batchAssignee = ref(null)
const batchAssigneeLoading = ref(false)
const selectedTaskIndices = ref([]) // 選中的任務索引
const taskSopSearchText = ref('')
const taskSopModalVisible = ref(false)
const currentTaskIndex = ref(null)
const loadingTemplates = ref(false)

// 新增任務選項 Modal
const addTaskOptionModalVisible = ref(false)
const selectedAddTaskOption = ref('save_template') // 默認選項
const pendingNewTask = ref(null) // 待添加的任務（臨時存儲）

// 任務 SOP IDs（用於服務層級顯示）
const taskSOPIds = ref([])

// 表單引用（每個任務一個表單）
const taskFormRefs = ref([])

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
     sop.category === serviceCode.toUpperCase()) &&
    // 如果指定了客戶 ID，只顯示通用 SOP 或該客戶的專屬 SOP
    (!props.clientId || !sop.client_id || String(sop.client_id) === String(props.clientId))
  )
})

// 自動選擇的服務層級 SOP（優先客戶專屬，否則通用）
const autoSelectedServiceSops = computed(() => {
  const sops = serviceSops.value || []
  if (!sops.length) return []
  
  // 優先客戶專屬 SOP，然後是通用 SOP
  const clientSpecificSops = sops.filter(sop => 
    sop.client_id !== null && 
    sop.client_id !== undefined && 
    String(sop.client_id) === String(props.clientId)
  )
  
  const generalSops = sops.filter(sop => 
    !sop.client_id || sop.client_id === null || sop.client_id === undefined
  )
  
  // 如果有客戶專屬 SOP，優先返回客戶專屬的；否則返回通用的
  const selectedSops = clientSpecificSops.length > 0 ? clientSpecificSops : generalSops
  
  // 返回 SOP IDs
  return selectedSops.map(sop => getId(sop, 'sop_id', 'id'))
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

// 判斷是否為客戶專屬模板
const isClientSpecificTemplate = (template) => {
  return template.client_id !== null && template.client_id !== undefined
}

// 選項 - 根據 service_code 篩選模板，優先顯示客戶專屬模板
const templateOptions = computed(() => {
  // 如果 serviceId 是臨時ID，無法匹配模板，返回空數組
  if (!props.serviceId || String(props.serviceId).startsWith('temp_')) {
    console.warn('[TaskConfiguration] serviceId 是臨時ID，無法匹配模板:', props.serviceId)
    return []
  }
  
  const currentService = allServices.value.find(s => getId(s, 'service_id', 'id') == props.serviceId)
  const currentServiceCode = currentService?.service_code || ''
  
  let templates = []
  
  if (!currentServiceCode) {
    // 如果無法獲取 service_code，回退到只匹配 service_id
    templates = allTemplates.value.filter(t => t.service_id == props.serviceId)
  } else {
    // 根據 service_code 篩選模板
    templates = allTemplates.value.filter(t => {
      // 必須有 service_id
      if (!t.service_id) return false
      
      // 獲取模板對應的服務
      const templateService = allServices.value.find(s => getId(s, 'service_id', 'id') == t.service_id)
      if (!templateService) return false
      
      // 比較 service_code
      return templateService.service_code === currentServiceCode
    })
  }
  
  // 根據 client_id 過濾模板
  if (props.clientId) {
    // 如果有 clientId，只顯示統一模板或當前客戶的專屬模板
    templates = templates.filter(t => 
      !t.client_id || String(t.client_id) === String(props.clientId)
    )
  } else {
    // 如果沒有 clientId，只顯示統一模板
    templates = templates.filter(t => !t.client_id)
  }
  
  // 排序：客戶專屬優先，統一模板其次，然後按模板名稱排序
  templates.sort((a, b) => {
    const aIsClientSpecific = isClientSpecificTemplate(a)
    const bIsClientSpecific = isClientSpecificTemplate(b)
    
    // 客戶專屬優先
    if (aIsClientSpecific && !bIsClientSpecific) return -1
    if (!aIsClientSpecific && bIsClientSpecific) return 1
    
    // 否則按模板名稱排序
    return (a.template_name || '').localeCompare(b.template_name || '', 'zh-TW')
  })
  
  // 構建選項，在 label 中標註模板類型
  return templates.map(t => ({
    label: `${t.template_name || '未命名模板'}${isClientSpecificTemplate(t) ? ' (客戶專屬)' : ' (統一模板)'}`,
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
  // 如果 serviceId 是臨時ID，無法匹配任務類型，返回空數組
  if (!props.serviceId || String(props.serviceId).startsWith('temp_')) {
    console.warn('[TaskConfiguration] serviceId 是臨時ID，無法匹配任務類型:', props.serviceId)
    return []
  }
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
    
    if (!template) {
      showError('找不到選中的模板，請重新選擇')
      return
    }
    
    if (!template.tasks || template.tasks.length === 0) {
      showWarning('該模板沒有包含任何任務配置')
      return
    }

    // 將模板的任務加載到本地任務列表
    try {
      // 自動綁定服務層級 SOP
      const autoSopIds = autoSelectedServiceSops.value || []
      const autoSops = serviceSops.value.filter(sop => 
        autoSopIds.includes(getId(sop, 'sop_id', 'id'))
      )
      
      const templateTasks = template.tasks.map(task => {
        // 根據 use_for_auto_generate 推斷選項類型
        let optionType = null
        if (task.use_for_auto_generate !== false) {
          optionType = 'save_template'
        } else {
          optionType = 'retain_settings'
        }
        
        // 合併模板中的 SOP 和自動選擇的服務層級 SOP
        const templateSopIds = (task.sops || []).map(s => getId(s, 'sop_id', 'id'))
        const mergedSopIds = [...new Set([...autoSopIds, ...templateSopIds])]
        const mergedSops = [...autoSops, ...(task.sops || [])].filter((sop, index, self) => 
          index === self.findIndex(s => getId(s, 'sop_id', 'id') === getId(sop, 'sop_id', 'id'))
        )
        
        return {
          name: task.task_name,
          assignee_user_id: task.assignee_user_id || null,
          estimated_hours: task.estimated_hours || null,
          advance_days: task.advance_days || 7,
          // 生成時間規則
          generation_time_rule: task.generation_time_rule || {
            rule: task.generation_time_rule?.rule || null,
            params: task.generation_time_rule?.params || task.generation_time_params || {}
          },
          // 到期日規則
          due_date_rule: task.due_date_rule || {
            rule: task.due_date_rule?.rule || task.due_rule || 'end_of_month',
            params: task.due_date_rule?.params || task.due_date_params || task.due_value || {},
            days_due: task.due_date_rule?.days_due ?? task.days_due ?? null,
            is_fixed_deadline: (task.due_date_rule?.is_fixed_deadline ?? task.is_fixed_deadline) || false
          },
          due_rule: task.due_rule || 'end_of_month',
          due_value: task.due_value || null,
          days_due: task.days_due ?? null,
          is_fixed_deadline: task.is_fixed_deadline || false, // 固定期限任務選項
          execution_frequency: task.execution_frequency || 'monthly',
          execution_months: task.execution_months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          notes: task.notes || null,
          sops: mergedSops, // 合併後的 SOP 列表
          sop_ids: mergedSopIds, // 合併後的 SOP IDs
          stage_order: task.stage_order,
          description: task.description || null,
          fromTemplate: true,
          use_for_auto_generate: task.use_for_auto_generate !== false,
          _optionType: optionType, // 任務配置選項類型
          _generateCurrentMonth: false // 是否僅為當前月份生成
        }
      })

      localTasks.value = [...localTasks.value, ...templateTasks]
      emitTasks()
      showInfo(`已成功載入 ${templateTasks.length} 個任務配置`)
    } catch (error) {
      const errorInfo = handleError(error, {
        defaultMessage: '載入模板任務時發生錯誤',
        context: 'TemplateChange'
      })
      showError(errorInfo.message)
    }
  } catch (error) {
    const errorInfo = handleError(error, {
      defaultMessage: '載入模板失敗，請稍後再試',
      context: 'TemplateChange'
    })
    showError(errorInfo.message)
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

// 處理新增任務按鈕點擊
const handleAddTaskClick = () => {
  // 如果是一次性服務，直接添加任務（不需要選項）
  if (props.serviceType === 'one-time') {
    addTask()
    return
  }

  // 如果是定期服務，顯示選項 Modal
  pendingNewTask.value = {
    name: '',
    stage_order: 1,
    assignee_user_id: null,
    estimated_hours: null,
    advance_days: 7,
    // 生成時間規則
    generation_time_rule: {
      rule: null,
      params: {}
    },
    // 到期日規則
    due_date_rule: {
      rule: null,
      params: {},
      days_due: null,
      is_fixed_deadline: false
    },
    days_due: null,
    due_rule: 'end_of_month',
    due_value: null,
    is_fixed_deadline: false, // 固定期限任務選項
    execution_frequency: 'monthly',
    execution_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    notes: null,
    sops: [],
    sop_ids: [],
    fromTemplate: false,
    use_for_auto_generate: true, // 默認值
    _optionType: null, // 將在 Modal 中選擇
    _generateCurrentMonth: false // 是否僅為當前月份生成
  }
  selectedAddTaskOption.value = 'save_template' // 重置為默認選項
  addTaskOptionModalVisible.value = true
}

// 處理新增任務選項確認
const handleAddTaskOptionConfirm = () => {
  if (!pendingNewTask.value) {
    showWarning('請先配置任務信息')
    return
  }

  // 驗證選項是否已選擇
  if (!selectedAddTaskOption.value) {
    showWarning('請選擇一個任務配置方式')
    return
  }

  const option = selectedAddTaskOption.value

  // 根據選項設置 use_for_auto_generate
  if (option === 'current_month') {
    // 僅當前月份生成：不保存為模板，但需要標記以便後續處理
    pendingNewTask.value.use_for_auto_generate = false
    pendingNewTask.value._generateCurrentMonth = true // 標記需要立即生成
    pendingNewTask.value._optionType = 'current_month' // 記錄選項類型，用於顯示
  } else if (option === 'save_template') {
    // 保存為模板：設置為自動生成
    pendingNewTask.value.use_for_auto_generate = true
    pendingNewTask.value._generateCurrentMonth = false
    pendingNewTask.value._optionType = 'save_template' // 記錄選項類型，用於顯示
  } else if (option === 'retain_settings') {
    // 保留設定：不自動生成
    pendingNewTask.value.use_for_auto_generate = false
    pendingNewTask.value._generateCurrentMonth = false
    pendingNewTask.value._optionType = 'retain_settings' // 記錄選項類型，用於顯示
  }

  // 自動綁定服務層級 SOP（如果還沒有綁定）
  if (!pendingNewTask.value.sop_ids || pendingNewTask.value.sop_ids.length === 0) {
    const autoSopIds = autoSelectedServiceSops.value || []
    const autoSops = serviceSops.value.filter(sop => 
      autoSopIds.includes(getId(sop, 'sop_id', 'id'))
    )
    pendingNewTask.value.sop_ids = autoSopIds
    pendingNewTask.value.sops = autoSops
  }

  // 添加任務到列表
  localTasks.value.push(pendingNewTask.value)
  emitTasks()

  // 如果選擇了"僅當前月份生成"，觸發事件通知父組件
  if (option === 'current_month') {
    emit('task-option-selected', {
      option: 'current_month',
      task: pendingNewTask.value
    })
  }

  // 關閉 Modal 並重置
  addTaskOptionModalVisible.value = false
  pendingNewTask.value = null
  selectedAddTaskOption.value = 'save_template' // 重置為默認選項
}

// 處理新增任務選項取消
const handleAddTaskOptionCancel = () => {
  addTaskOptionModalVisible.value = false
  pendingNewTask.value = null
}

// 新增任務（直接添加，不顯示選項）
const addTask = () => {
  // 默認設置為階段 1，用戶可以手動選擇其他階段
  const defaultOptionType = props.serviceType === 'one-time' ? null : 'save_template'
  const defaultUseForAutoGenerate = props.serviceType === 'one-time' ? false : true
  
  // 自動綁定服務層級 SOP
  const autoSopIds = autoSelectedServiceSops.value || []
  const autoSops = serviceSops.value.filter(sop => 
    autoSopIds.includes(getId(sop, 'sop_id', 'id'))
  )
  
  localTasks.value.push({
    name: '',
    stage_order: 1,
    assignee_user_id: null,
    estimated_hours: null,
    advance_days: 7,
    // 生成時間規則
    generation_time_rule: {
      rule: null,
      params: {}
    },
    // 到期日規則
    due_date_rule: {
      rule: null,
      params: {},
      days_due: null,
      is_fixed_deadline: false
    },
    // 新規：預設不填，沿用舊規則；使用者可填 days_due 啟用新規
    days_due: null,
    due_rule: 'end_of_month', // 相容保留
    due_value: null,          // 相容保留
    is_fixed_deadline: false, // 固定期限任務選項
    execution_frequency: 'monthly',
    execution_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    notes: null,
    sops: autoSops, // 自動綁定服務層級 SOP
    sop_ids: autoSopIds, // 自動綁定服務層級 SOP IDs
    fromTemplate: false,
    use_for_auto_generate: defaultUseForAutoGenerate,
    _optionType: defaultOptionType, // 任務配置選項類型
    _generateCurrentMonth: false // 是否僅為當前月份生成
  })
  
  // 確保表單引用數組長度正確
  taskFormRefs.value = new Array(localTasks.value.length).fill(null)
  
  emitTasks()
}

// 移除任務
const removeTask = (index) => {
  try {
    // 驗證索引有效性
    if (index < 0 || index >= localTasks.value.length) {
      showError('無效的任務索引')
      return
    }
    
    // 如果任務被選中，從選中列表中移除
    const selectedIdx = selectedTaskIndices.value.indexOf(index)
    if (selectedIdx > -1) {
      selectedTaskIndices.value.splice(selectedIdx, 1)
    }
    
    // 調整選中索引（移除的任務後面的索引需要減1）
    selectedTaskIndices.value = selectedTaskIndices.value
      .map(idx => idx > index ? idx - 1 : idx)
      .filter(idx => idx >= 0)
    
    localTasks.value.splice(index, 1)
    taskFormRefs.value.splice(index, 1)
    emitTasks()
  } catch (error) {
    const errorInfo = handleError(error, {
      defaultMessage: '刪除任務失敗，請稍後再試',
      context: 'RemoveTask'
    })
    showError(errorInfo.message)
  }
}

// 期限規則變更
const handleDueRuleChange = (index) => {
  const task = localTasks.value[index]
  if (task.due_rule === 'end_of_month') {
    task.due_value = null
  }
  // 觸發響應式更新
  emitTasks()
}

// 期限值變更
const handleDueValueChange = (index) => {
  // 觸發響應式更新
  emitTasks()
}

// 檢查任務是否被選中
const isTaskSelected = (index) => {
  return selectedTaskIndices.value.includes(index)
}

// 處理任務選擇
const handleTaskSelect = (index, checked) => {
  if (checked) {
    if (!selectedTaskIndices.value.includes(index)) {
      selectedTaskIndices.value.push(index)
    }
  } else {
    const idx = selectedTaskIndices.value.indexOf(index)
    if (idx > -1) {
      selectedTaskIndices.value.splice(idx, 1)
    }
  }
}

// 全選狀態
const isAllSelected = computed(() => {
  return localTasks.value.length > 0 && selectedTaskIndices.value.length === localTasks.value.length
})

// 半選狀態
const isIndeterminate = computed(() => {
  return selectedTaskIndices.value.length > 0 && selectedTaskIndices.value.length < localTasks.value.length
})

// 處理全選/取消全選
const handleSelectAll = (e) => {
  if (e.target.checked) {
    // 全選
    selectedTaskIndices.value = localTasks.value.map((_, index) => index)
  } else {
    // 取消全選
    selectedTaskIndices.value = []
  }
}

// 批量設置負責人
const applyBatchAssignee = async () => {
  if (!batchAssignee.value || selectedTaskIndices.value.length === 0) {
    showWarning('請先選擇要設置的任務和負責人')
    return
  }

  batchAssigneeLoading.value = true
  
  try {
    // 驗證選中的任務索引是否有效
    const validIndices = selectedTaskIndices.value.filter(index => {
      return index >= 0 && index < localTasks.value.length && localTasks.value[index]
    })
    
    if (validIndices.length === 0) {
      showError('選中的任務無效，請重新選擇')
      selectedTaskIndices.value = []
      return
    }
    
    if (validIndices.length !== selectedTaskIndices.value.length) {
      showWarning(`部分選中的任務無效，將只更新 ${validIndices.length} 個任務`)
    }
    
    // 更新選中任務的負責人
    const updatedCount = validIndices.length
    let successCount = 0
    const errors = []
    
    validIndices.forEach(index => {
      try {
        if (localTasks.value[index]) {
          localTasks.value[index].assignee_user_id = batchAssignee.value
          successCount++
        }
      } catch (error) {
        errors.push({ index, error })
      }
    })
    
    if (successCount > 0) {
      emitTasks()
      
      // 顯示成功消息
      const assigneeName = userOptions.value.find(u => u.value === batchAssignee.value)?.label || '負責人'
      message.success(`已成功為 ${successCount} 個任務設置負責人：${assigneeName}`)
      
      // 如果有部分失敗，顯示警告
      if (errors.length > 0) {
        showWarning(`${errors.length} 個任務設置失敗，請檢查後重試`)
      }
    } else {
      showError('設置失敗，請稍後再試')
    }
  } catch (error) {
    const errorInfo = handleError(error, {
      defaultMessage: '批量設置負責人失敗，請稍後再試',
      context: 'BatchAssignee'
    })
    showError(errorInfo.message)
    message.error(errorInfo.message)
  } finally {
    batchAssigneeLoading.value = false
  }
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
  try {
    if (currentTaskIndex.value === null) {
      showWarning('未選擇任務')
      return
    }
    
    if (currentTaskIndex.value < 0 || currentTaskIndex.value >= localTasks.value.length) {
      showError('無效的任務索引')
      taskSopModalVisible.value = false
      currentTaskIndex.value = null
      return
    }

    const task = localTasks.value[currentTaskIndex.value]
    if (!task) {
      showError('找不到對應的任務')
      taskSopModalVisible.value = false
      currentTaskIndex.value = null
      return
    }
    
    task.sops = taskSops.value.filter(sop =>
      taskSopSelectedIds.value.includes(getId(sop, 'sop_id', 'id'))
    )
    task.sop_ids = taskSopSelectedIds.value

    taskSopModalVisible.value = false
    currentTaskIndex.value = null
    emitTasks()
  } catch (error) {
    const errorInfo = handleError(error, {
      defaultMessage: '保存任務SOP失敗，請稍後再試',
      context: 'TaskSopOk'
    })
    showError(errorInfo.message)
  }
}

// 處理任務生成時間規則變更
const handleGenerationTimeRuleChange = (taskIndex, ruleData) => {
  const task = localTasks.value[taskIndex]
  if (!task) return
  
  // 更新任務的生成時間規則數據
  if (ruleData) {
    task.generation_time_rule = {
      rule: ruleData.rule || null,
      params: ruleData.params || {}
    }
    task.generation_time_params = ruleData.params || {}
    
    // 為了向後兼容，保留 advance_days（如果規則組件沒有提供，使用默認值）
    if (ruleData.params?.days !== undefined) {
      task.advance_days = ruleData.params.days
    }
  } else {
    // 如果 ruleData 為空，初始化為默認值
    task.generation_time_rule = {
      rule: null,
      params: {}
    }
  }
  
  emitTasks()
}

// 處理任務到期日規則變更
const handleDueDateRuleChange = (taskIndex, ruleData) => {
  const task = localTasks.value[taskIndex]
  if (!task) return
  
  // 更新任務的到期日規則數據
  if (ruleData) {
    task.due_date_rule = {
      rule: ruleData.rule || null,
      params: ruleData.params || {},
      days_due: ruleData.days_due ?? null,
      is_fixed_deadline: ruleData.is_fixed_deadline || false
    }
    task.due_date_params = ruleData.params || {}
    task.days_due = ruleData.days_due ?? null
    task.is_fixed_deadline = ruleData.is_fixed_deadline || false
    
    // 為了向後兼容，同步設置舊字段
    // due_rule: 如果使用高級規則，使用 rule；否則為 null
    task.due_rule = ruleData.days_due !== null && ruleData.days_due !== undefined 
      ? null  // 使用新規則時，清空舊規則
      : (ruleData.rule || 'end_of_month')
    
    // due_value: 從 params 中提取對應的值
    if (ruleData.params) {
      if (ruleData.params.day !== undefined) {
        task.due_value = ruleData.params.day
      } else if (ruleData.params.days !== undefined) {
        task.due_value = ruleData.params.days
      } else if (ruleData.params.months !== undefined) {
        task.due_value = ruleData.params.months
      } else {
        task.due_value = null
      }
    } else {
      task.due_value = null
    }
  } else {
    // 如果 ruleData 為空，初始化為默認值
    task.due_date_rule = {
      rule: null,
      params: {},
      days_due: null,
      is_fixed_deadline: false
    }
    task.due_rule = 'end_of_month'
    task.due_value = null
    task.days_due = null
    task.is_fixed_deadline = false
  }
  
  emitTasks()
}

// 處理任務配置選項變更
const handleTaskOptionChange = (taskIndex) => {
  const task = localTasks.value[taskIndex]
  if (!task) return
  
  // 根據選項設置 use_for_auto_generate 和相關標記
  if (task._optionType === 'current_month') {
    // 僅當前月份生成：不保存為模板，但需要標記以便後續處理
    task.use_for_auto_generate = false
    task._generateCurrentMonth = true // 標記需要立即生成
  } else if (task._optionType === 'save_template') {
    // 保存為模板：設置為自動生成
    task.use_for_auto_generate = true
    task._generateCurrentMonth = false
  } else if (task._optionType === 'retain_settings') {
    // 保留設定：不自動生成
    task.use_for_auto_generate = false
    task._generateCurrentMonth = false
  } else {
    // 如果沒有明確選項，根據 use_for_auto_generate 推斷
    if (task.use_for_auto_generate) {
      task._optionType = 'save_template'
    } else {
      task._optionType = 'retain_settings'
    }
  }
  
  emitTasks()
}

// 處理任務 SOP 更新
const handleTaskSOPUpdate = (taskIndex, sopIds) => {
  const task = localTasks.value[taskIndex]
  if (!task) return
  
  // 更新任務的 SOP IDs
  task.sop_ids = sopIds
  
  // 更新任務的 SOP 對象列表
  task.sops = taskSops.value.filter(sop =>
    sopIds.includes(getId(sop, 'sop_id', 'id'))
  )
  
  emitTasks()
}

// 處理任務 SOP IDs 更新（服務層級）
const handleTaskSOPIdsUpdate = (sopIds) => {
  taskSOPIds.value = sopIds
  // 這裡可以根據需要更新服務層級的 SOP
  emitSops()
}

// 移除任務 SOP（保留以向後兼容）
const removeTaskSop = (taskIndex, sop) => {
  const task = localTasks.value[taskIndex]
  const sopId = getId(sop, 'sop_id', 'id')
  task.sops = (task.sops || []).filter(s => getId(s, 'sop_id', 'id') !== sopId)
  task.sop_ids = (task.sop_ids || []).filter(id => id !== sopId)
  emitTasks()
}

// 設置表單引用
const setFormRef = (el, index) => {
  if (el) {
    taskFormRefs.value[index] = el
  }
}

// 獲取任務驗證規則
const getTaskRules = (index) => {
  return createTaskConfigRules(localTasks.value, index)
}

// 驗證所有任務表單
const validateAllTasks = async () => {
  try {
    if (localTasks.value.length === 0) {
      return { valid: true }
    }
    
    const validationPromises = taskFormRefs.value.map((formRef, index) => {
      if (!formRef) {
        return Promise.resolve({ 
          valid: false, 
          index, 
          error: '表單引用不存在',
          errors: { form: ['任務表單未正確初始化'] }
        })
      }
      
      return formRef.validate().then(() => {
        return { valid: true, index }
      }).catch((errorInfo) => {
        // Ant Design Vue 的 validate 方法在失敗時會 reject，並傳遞 errorInfo
        // errorInfo 的格式為 { values, errorFields, outOfDate }
        // errorFields 是一個數組，每個元素包含 name 和 errors
        try {
          const errorFields = errorInfo?.errorFields || []
          const formattedErrors = {}
          
          errorFields.forEach(field => {
            if (field.name && field.errors && field.errors.length > 0) {
              // 將字段名（可能是數組）轉換為字符串
              const fieldName = Array.isArray(field.name) ? field.name.join('.') : field.name
              formattedErrors[fieldName] = field.errors.map(err => ({
                message: typeof err === 'string' ? err : err.message || '驗證失敗'
              }))
            }
          })
          
          return { 
            valid: false, 
            index, 
            errors: formattedErrors,
            errorFields 
          }
        } catch (error) {
          // 如果處理驗證錯誤時發生異常，返回通用錯誤
          return {
            valid: false,
            index,
            errors: { general: ['驗證過程中發生錯誤'] },
            errorFields: []
          }
        }
      })
    })
    
    const results = await Promise.all(validationPromises)
    const invalidTasks = results.filter(r => !r.valid)
    
    if (invalidTasks.length > 0) {
      // 找到第一個無效任務並滾動到該位置
      try {
        const firstInvalidIndex = invalidTasks[0].index
        const invalidTaskElement = document.querySelector(`.task-item-config:nth-child(${firstInvalidIndex + 1})`)
        if (invalidTaskElement) {
          invalidTaskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      } catch (error) {
        // 滾動失敗不影響驗證結果
        console.warn('無法滾動到無效任務:', error)
      }
      
      return {
        valid: false,
        invalidTasks: invalidTasks.map(t => ({
          index: t.index + 1,
          taskIndex: t.index,
          errors: t.errors || {},
          errorFields: t.errorFields || []
        }))
      }
    }
    
    return { valid: true }
  } catch (error) {
    const errorInfo = handleError(error, {
      defaultMessage: '驗證任務時發生錯誤',
      context: 'ValidateAllTasks'
    })
    showError(errorInfo.message)
    
    // 即使發生錯誤，也返回驗證失敗的結果，讓調用者知道驗證未完成
    return {
      valid: false,
      error: errorInfo.message,
      invalidTasks: []
    }
  }
}

// 暴露方法給父組件（必須在所有函數定義之後）
defineExpose({
  validateAllTasks
})

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
    // 確保 serviceId 不是臨時ID
    const actualServiceId = props.serviceId && !String(props.serviceId).startsWith('temp_') 
      ? props.serviceId 
      : null
    
    const [templatesRes, usersRes, sopsRes, servicesRes, serviceItemsRes] = await Promise.allSettled([
      // 如果 serviceId 有效，傳遞給 fetchTaskTemplates 以過濾模板
      fetchTaskTemplates(actualServiceId ? { service_id: actualServiceId } : {}),
      fetchAllUsers(),
      fetchAllSOPs(),
      fetchAllServices(),
      fetchServiceItems()
    ])

    // 處理每個請求的結果
    const errors = []
    
    if (templatesRes.status === 'fulfilled') {
      try {
        allTemplates.value = extractApiArray(templatesRes.value, [])
      } catch (error) {
        errors.push({ type: 'templates', error })
      }
    } else {
      errors.push({ type: 'templates', error: templatesRes.reason })
    }
    
    if (usersRes.status === 'fulfilled') {
      try {
        allUsers.value = extractApiArray(usersRes.value, [])
      } catch (error) {
        errors.push({ type: 'users', error })
      }
    } else {
      errors.push({ type: 'users', error: usersRes.reason })
    }
    
    if (sopsRes.status === 'fulfilled') {
      try {
        allSops.value = extractApiArray(sopsRes.value, [])
      } catch (error) {
        errors.push({ type: 'sops', error })
      }
    } else {
      errors.push({ type: 'sops', error: sopsRes.reason })
    }
    
    if (servicesRes.status === 'fulfilled') {
      try {
        allServices.value = extractApiArray(servicesRes.value, [])
        // 獲取當前服務的 service_code
        const service = allServices.value.find(s => getId(s, 'service_id', 'id') == props.serviceId)
        currentServiceCode.value = service?.service_code || ''
      } catch (error) {
        errors.push({ type: 'services', error })
      }
    } else {
      errors.push({ type: 'services', error: servicesRes.reason })
    }
    
    if (serviceItemsRes.status === 'fulfilled') {
      try {
        allServiceItems.value = extractApiArray(serviceItemsRes.value, [])
      } catch (error) {
        errors.push({ type: 'serviceItems', error })
      }
    } else {
      errors.push({ type: 'serviceItems', error: serviceItemsRes.reason })
    }
    
    // 如果有錯誤，顯示警告（但不阻止使用）
    if (errors.length > 0) {
      const errorMessages = {
        templates: '任務模板',
        users: '用戶列表',
        sops: 'SOP列表',
        services: '服務列表',
        serviceItems: '任務類型列表'
      }
      
      const failedItems = errors.map(e => errorMessages[e.type] || e.type).join('、')
      const errorInfo = handleError(errors[0].error, {
        defaultMessage: '部分數據載入失敗',
        context: 'LoadData'
      })
      
      showWarning(`${failedItems}載入失敗：${errorInfo.message}。部分功能可能無法正常使用。`)
    }
  } catch (error) {
    const errorInfo = handleError(error, {
      defaultMessage: '載入數據失敗，請刷新頁面重試',
      context: 'LoadData'
    })
    showError(errorInfo.message)
  }
}

// 初始化任務數據，確保規則數據格式正確
const initializeTaskRules = (task) => {
  // 確保生成時間規則格式正確
  if (!task.generation_time_rule || typeof task.generation_time_rule !== 'object') {
    task.generation_time_rule = {
      rule: task.generation_time_rule || null,
      params: task.generation_time_params || {}
    }
  }
  
  // 確保到期日規則格式正確
  if (!task.due_date_rule || typeof task.due_date_rule !== 'object') {
    // 構建 params 對象
    const params = task.due_date_params || {}
    if (task.due_value !== null && task.due_value !== undefined) {
      // 根據 due_rule 判斷參數類型
      if (task.due_rule === 'specific_day' || task.due_rule === 'fixed_date') {
        params.day = task.due_value
      } else if (task.due_rule === 'days_after_start') {
        params.days = task.due_value
      } else if (task.due_rule === 'n_months_end') {
        params.months = task.due_value
      }
    }
    
    task.due_date_rule = {
      rule: task.due_date_rule?.rule || task.due_rule || null,
      params: params,
      days_due: task.due_date_rule?.days_due ?? task.days_due ?? null,
      is_fixed_deadline: (task.due_date_rule?.is_fixed_deadline ?? task.is_fixed_deadline) || false
    }
  }
  
  // 同步固定期限選項到任務對象
  task.is_fixed_deadline = task.due_date_rule.is_fixed_deadline || false
  
  // 確保向後兼容字段存在
  if (task.due_rule === undefined || task.due_rule === null) {
    task.due_rule = task.due_date_rule?.rule || 'end_of_month'
  }
  if (task.due_value === undefined) {
    const params = task.due_date_rule?.params || {}
    task.due_value = params.day || params.days || params.months || null
  }
  if (task.days_due === undefined) {
    task.days_due = task.due_date_rule?.days_due ?? null
  }
  
  // 初始化任務配置選項類型（如果沒有明確設置）
  if (!task._optionType && props.serviceType === 'recurring') {
    if (task.use_for_auto_generate) {
      task._optionType = 'save_template'
    } else {
      task._optionType = 'retain_settings'
    }
  }
  
  // 確保 _generateCurrentMonth 標記存在
  if (task._generateCurrentMonth === undefined) {
    task._generateCurrentMonth = false
  }
  
  return task
}

// 初始化時從 props 加載數據（只執行一次）
onMounted(() => {
  // 只在初始化時從 props 加載
  if (props.tasks && props.tasks.length > 0) {
    localTasks.value = props.tasks.map(task => initializeTaskRules(JSON.parse(JSON.stringify(task))))
  }
  if (props.sops && props.sops.length > 0) {
    localSops.value = JSON.parse(JSON.stringify(props.sops))
    selectedSopIds.value = localSops.value.map(sop => getId(sop, 'sop_id', 'id'))
  }
  
  // 初始化表單引用數組
  taskFormRefs.value = new Array(localTasks.value.length).fill(null)
  
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

/* 任務選項 Modal 樣式 */
:deep(.ant-radio-wrapper.option-selected) {
  border-color: #3b82f6 !important;
  background: #eff6ff !important;
}
</style>
