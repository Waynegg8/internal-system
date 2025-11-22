<template>
  <div class="settings-templates">

    <!-- 提示說明 -->
    <a-alert
      type="info"
      message="任務模板說明"
      description="任務模板可選定服務或客戶，用於自動生成任務。如果服務已設定 SOP，模板會自動繼承該 SOP。您可以為每個模板設定多個任務配置，每個配置也可設定多個任務。"
      show-icon
      closable
      style="margin-bottom: 12px"
    />

    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 8px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage || error"
      type="error"
      :message="errorMessage || error"
      show-icon
      closable
      @close="errorMessage = ''; handleCloseError()"
      style="margin-bottom: 8px"
    />
    
    <!-- 操作欄和搜索過濾 -->
    <div class="action-bar" style="margin-bottom: 12px">
      <a-row :gutter="[16, 12]" align="middle">
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-input-search
            v-model:value="searchKeyword"
            placeholder="搜尋模板名稱/服務/客戶…"
            allow-clear
            @search="handleSearch"
            @press-enter="handleSearch"
            @input="handleSearchInput"
          >
            <template #prefix>
              <search-outlined />
            </template>
          </a-input-search>
        </a-col>
        
        <a-col :xs="12" :sm="8" :md="6" :lg="4">
          <a-select
            v-model:value="selectedServiceId"
            placeholder="選擇服務"
            allow-clear
            show-search
            :filter-option="filterServiceOption"
            style="width: 100%"
            @change="handleFilterChange"
          >
            <a-select-option
              v-for="service in supportData.services"
              :key="service.service_id"
              :value="service.service_id"
            >
              {{ service.service_name }}
            </a-select-option>
          </a-select>
        </a-col>
        
        <a-col :xs="12" :sm="8" :md="6" :lg="4">
          <a-select
            v-model:value="selectedClientType"
            placeholder="客戶類型"
            allow-clear
            style="width: 100%"
            @change="handleFilterChange"
          >
            <a-select-option value="unified">統一模板</a-select-option>
            <a-select-option value="specific">客戶專屬</a-select-option>
          </a-select>
        </a-col>
        
        <a-col :xs="24" :sm="24" :md="4" :lg="10" style="text-align: right">
          <a-button type="primary" @click="handleAddTemplate">
            <template #icon>
              <plus-outlined />
            </template>
            新增模板
          </a-button>
        </a-col>
      </a-row>
    </div>

    <!-- 查看模板（只讀模式） -->
    <a-card v-if="viewMode" style="margin-bottom: 12px">
      <template #title>
        <a-space>
          <span>查看模板</span>
          <a-tag color="blue">{{ viewingTemplate?.template_name }}</a-tag>
        </a-space>
      </template>
      <template #extra>
        <a-space>
          <a-button @click="handleViewToEdit">編輯模板</a-button>
          <a-button @click="handleCancelView">返回列表</a-button>
        </a-space>
      </template>

      <!-- 基本信息 -->
      <a-descriptions :bordered="true" :column="2" size="small" style="margin-bottom: 16px">
        <a-descriptions-item label="模板名稱">
          {{ viewingTemplate?.template_name }}
        </a-descriptions-item>
        <a-descriptions-item label="服務名稱">
          {{ viewingTemplate?.service_name || '未指定' }}
        </a-descriptions-item>
        <a-descriptions-item label="客戶名稱">
          {{ viewingTemplate?.client_name || '通用模板' }}
        </a-descriptions-item>
        <a-descriptions-item label="任務配置">
          <a-space>
            <a-tag color="blue">{{ stageCount }} 個階段</a-tag>
            <a-tag color="green">{{ viewingTasks.length }} 個任務</a-tag>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="服務層級 SOP" v-if="serviceLevelSOP">
          <a-tag 
            color="purple" 
            style="cursor: pointer;"
            @click="handleSOPClick(serviceLevelSOP)"
          >
            {{ serviceLevelSOP.title }}
          </a-tag>
        </a-descriptions-item>
      </a-descriptions>

      <!-- 任務列表（按階段分組） -->
      <a-divider orientation="left">
        <strong>任務配置（按階段分組）</strong>
      </a-divider>

      <a-empty v-if="viewingTasks.length === 0" description="此模板尚未設定任務" />

      <div v-else v-for="(stageTasks, stageOrder) in tasksByStage" :key="stageOrder" style="margin-bottom: 16px">
        <a-alert
          :message="`階段 ${stageOrder} - ${stageTasks.length} 個任務`"
          type="info"
          show-icon
          style="margin-bottom: 12px"
        />
        
        <a-table
          :data-source="stageTasks"
          :columns="taskColumns"
          :pagination="false"
          size="small"
          :bordered="true"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <strong>{{ record.name }}</strong>
            </template>
            <template v-else-if="column.key === 'estimated_hours'">
              {{ record.estimated_hours || '-' }} 小時
            </template>
            <template v-else-if="column.key === 'execution_frequency'">
              <a-tag :color="getFrequencyColor(record.execution_frequency)">
                {{ getFrequencyText(record.execution_frequency) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'sops'">
              <div v-if="record.sops && record.sops.length > 0">
                <a-tag 
                  v-for="sop in record.sops" 
                  :key="sop.sop_id"
                  color="purple"
                  style="cursor: pointer; margin: 2px;"
                  @click="handleSOPClick(sop)"
                >
                  {{ sop.title }}
                </a-tag>
              </div>
              <span v-else style="color: #999;">-</span>
            </template>
            <template v-else-if="column.key === 'notes'">
              {{ record.notes || '-' }}
            </template>
          </template>
        </a-table>
      </div>
    </a-card>

    <!-- 任務模板表單（編輯模式） -->
    <TaskTemplateForm
      v-if="formVisible"
      ref="templateFormRef"
      :visible="formVisible"
      :editing-template="editingTemplate"
      :services="supportData.services"
      :clients="supportData.clients"
      :service-sops="serviceSOPs"
      :loading="store.loading"
      @submit="handleFormSubmit"
      @cancel="handleFormCancel"
    />

    <!-- 任務模板列表 -->
    <a-card v-if="!viewMode && !formVisible">
      <TemplatesTable
        :templates="store.taskTemplates"
        :loading="store.loading"
        @view="handleViewTemplate"
        @edit="handleEditTemplate"
        @delete="handleDeleteClick"
      />
    </a-card>

    <!-- 刪除確認對話框 -->
    <a-modal
      v-model:open="deleteConfirmVisible"
      :title="deleteErrorData ? '無法刪除模板' : '確認刪除模板'"
      :confirm-loading="deleting"
      :width="600"
      :ok-text="deleteErrorData ? '關閉' : '確認刪除'"
      :ok-button-props="deleteErrorData ? {} : { danger: true }"
      @ok="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    >
      <div v-if="deleteErrorData">
        <!-- 模板被使用的情況 -->
        <a-alert
          type="error"
          :message="deleteErrorData.message || '無法刪除模板'"
          show-icon
          style="margin-bottom: 16px"
        />

        <div style="margin-bottom: 16px">
          <p style="margin-bottom: 8px; font-weight: 500;">
            模板「<strong>{{ deleteErrorData.template_name || '未知模板' }}</strong>」正在被 <strong>{{ deleteErrorData.used_by_count || 0 }}</strong> 個服務使用，無法刪除：
          </p>
          <p style="color: #6b7280; font-size: 12px; margin-bottom: 12px;">
            請先解除這些服務對該模板的綁定，然後再嘗試刪除。
          </p>
        </div>

        <div v-if="deleteErrorData.used_by_services && deleteErrorData.used_by_services.length > 0" style="max-height: 300px; overflow-y: auto;">
          <a-list
            :data-source="deleteErrorData.used_by_services"
            size="small"
            bordered
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>
                    <a-space>
                      <span>{{ item.client_name || '未知客戶' }}</span>
                      <a-divider type="vertical" />
                      <span>{{ item.service_name || '未知服務' }}</span>
                    </a-space>
                  </template>
                  <template #description>
                    <span style="color: #8c8c8c; font-size: 12px;">
                      服務 ID: {{ item.client_service_id }}
                    </span>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </div>
      </div>

      <div v-else>
        <!-- 正常確認刪除的情況 -->
        <a-alert
          type="warning"
          message="確認刪除模板"
          :description="`確定要刪除模板「${deletingTemplateName || '未知模板'}」嗎？此操作無法撤銷。`"
          show-icon
          style="margin-bottom: 16px"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { useSettingsStore } from '@/stores/settings'
import { usePageAlert } from '@/composables/usePageAlert'
import TaskTemplateForm from '@/components/settings/TaskTemplateFormNew.vue'
import TemplatesTable from '@/components/settings/TemplatesTable.vue'

const router = useRouter()
const store = useSettingsStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 從 store 獲取響應式狀態
const { error, serviceSOPs, supportData } = storeToRefs(store)

// 本地狀態
const formVisible = ref(false)
const editingTemplate = ref(null)
const templateFormRef = ref(null)

// 搜索和過濾狀態
const searchKeyword = ref('')
const selectedServiceId = ref(undefined)
const selectedClientType = ref(undefined)

// 防抖計時器
let debounceTimer = null
const DEBOUNCE_DELAY = 500 // 500ms 防抖延遲

// 刪除確認對話框狀態
const deleteConfirmVisible = ref(false)
const deletingTemplateId = ref(null)
const deletingTemplateName = ref('')
const deleting = ref(false)
const deleteErrorData = ref(null)

// 查看模板狀態
const viewMode = ref(false)
const viewingTemplate = ref(null)
const viewingTasks = computed(() => viewingTemplate.value?.tasks || [])

// 獲取模板 ID（處理路由參數）
const getTemplateId = (template) => {
  return template?.template_id || template?.templateId
}


// 構建查詢選項
const buildQueryOptions = () => {
  const options = {}
  
  // 搜索關鍵詞
  if (searchKeyword.value && searchKeyword.value.trim()) {
    options.search = searchKeyword.value.trim()
  }
  
  // 服務 ID 過濾
  if (selectedServiceId.value !== undefined && selectedServiceId.value !== null) {
    options.service_id = selectedServiceId.value
  }
  
  // 客戶類型過濾
  if (selectedClientType.value) {
    options.client_type = selectedClientType.value
  }
  
  return options
}

// 載入模板列表（帶查詢選項）
const loadTemplates = async () => {
  try {
    const options = buildQueryOptions()
    await store.getTaskTemplates(options)
  } catch (err) {
    console.error('載入模板列表失敗:', err)
    // 錯誤已由 store 處理
  }
}

// 載入數據
const loadData = async () => {
  try {
    // 並行載入模板列表和支援數據
    await Promise.all([
      loadTemplates(),
      store.fetchSupportData(),
      store.getServiceSOPs()
    ])
  } catch (err) {
    console.error('載入數據失敗:', err)
    // 錯誤已由 store 處理
  }
}

// 處理搜索輸入（帶防抖）
const handleSearchInput = () => {
  // 清除之前的計時器
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  
  // 設置新的防抖計時器
  debounceTimer = setTimeout(() => {
    loadTemplates()
    debounceTimer = null
  }, DEBOUNCE_DELAY)
}

// 處理搜索（立即執行，不防抖）
const handleSearch = () => {
  // 清除防抖計時器
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  
  // 立即執行搜索
  loadTemplates()
}

// 處理過濾變化
const handleFilterChange = () => {
  // 過濾變化時立即執行，不防抖
  loadTemplates()
}

// 服務選項過濾函數
const filterServiceOption = (input, option) => {
  const serviceName = option.children || ''
  return serviceName.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 處理新增模板
const handleAddTemplate = () => {
  editingTemplate.value = null
  formVisible.value = true
  // 等待下一個 tick 確保表單已渲染
  setTimeout(() => {
    templateFormRef.value?.resetForm()
  }, 0)
}

// 處理查看模板（只讀模式）
const handleViewTemplate = async (template) => {
  try {
    // 載入模板的階段列表
    const templateId = getTemplateId(template)
    const stagesResponse = await store.getTaskTemplateStages(templateId)
    
    // 轉換階段數據為查看模式需要的格式
    const stages = (stagesResponse?.data || []).map((stage, index) => ({
      key: index,
      name: stage.stage_name || stage.name || '',
      estimated_hours: stage.estimated_hours || null,
      execution_frequency: stage.execution_frequency || 'monthly',
      execution_months: stage.execution_months || [1,2,3,4,5,6,7,8,9,10,11,12],
      notes: stage.description || null,
      stage_order: stage.stage_order
    }))
    
    // 設置查看模板
    viewingTemplate.value = {
      ...template,
      tasks: stages
    }
    
    // 顯示查看模式，隱藏表單
    viewMode.value = true
    formVisible.value = false
  } catch (err) {
    console.error('載入模板階段失敗:', err)
    showError('載入模板階段失敗，請重試')
  }
}

// 取消查看模板
const handleCancelView = () => {
  viewMode.value = false
  viewingTemplate.value = null
}

// 從查看模板切換到編輯模板
const handleViewToEdit = () => {
  const template = viewingTemplate.value
  viewMode.value = false
  handleEditTemplate(template)
}

// 按階段分組任務
const tasksByStage = computed(() => {
  const grouped = {}
  
  viewingTasks.value.forEach((task) => {
    const stage = task.stage_order || 1
    if (!grouped[stage]) {
      grouped[stage] = []
    }
    grouped[stage].push(task)
  })
  
  // 按階段順序排序
  const sortedStages = Object.keys(grouped).sort((a, b) => Number(a) - Number(b))
  const result = {}
  sortedStages.forEach(stage => {
    result[stage] = grouped[stage]
  })
  
  return result
})

// 計算階段數量
const stageCount = computed(() => {
  return Object.keys(tasksByStage.value).length
})

// 任務表格列定義
const taskColumns = [
  {
    title: '任務名稱',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '預估工時',
    dataIndex: 'estimated_hours',
    key: 'estimated_hours',
    width: 120
  },
  {
    title: '執行頻率',
    dataIndex: 'execution_frequency',
    key: 'execution_frequency',
    width: 120
  },
  {
    title: 'SOP',
    dataIndex: 'sops',
    key: 'sops',
    width: 200
  },
  {
    title: '備註',
    dataIndex: 'notes',
    key: 'notes'
  }
]

// 獲取執行頻率文字
const getFrequencyText = (frequency) => {
  const map = {
    'monthly': '每月執行',
    'bi-monthly': '每兩月執行',
    'quarterly': '每季執行',
    'semi-annual': '每半年執行',
    'annual': '每年執行',
    'custom': '自定義'
  }
  return map[frequency] || '每月執行'
}

// 獲取執行頻率顏色
const getFrequencyColor = (frequency) => {
  const map = {
    'monthly': 'blue',
    'bi-monthly': 'green',
    'quarterly': 'orange',
    'semi-annual': 'purple',
    'annual': 'red',
    'custom': 'cyan'
  }
  return map[frequency] || 'blue'
}

// 處理 SOP 點擊 - 跳轉到知識庫頁面
const handleSOPClick = (sop) => {
  router.push(`/knowledge?sop_id=${sop.sop_id}`)
}

// 計算服務層級 SOP
const serviceLevelSOP = computed(() => {
  if (!viewingTemplate.value) return null
  
  const serviceId = viewingTemplate.value.service_id
  if (!serviceId) return null
  
  const service = supportData.value.services?.find(s => s.service_id === serviceId)
  if (!service || !service.service_sop_id) return null
  
  const sop = serviceSOPs.value?.find(s => s.sop_id === service.service_sop_id)
  return sop || null
})

// 處理編輯模板
const handleEditTemplate = async (template) => {
  try {
    // 載入模板的階段列表
    const templateId = getTemplateId(template)
    const stagesResponse = await store.getTaskTemplateStages(templateId)
    
    // 轉換階段數據為 TaskConfiguration 組件需要的格式
    const stages = (stagesResponse?.data || []).map(stage => ({
      name: stage.stage_name || stage.name || '',
      assignee_user_id: null, // 模板階段不指定負責人
      estimated_hours: stage.estimated_hours || null,
      advance_days: 7, // 預設值
      due_rule: 'end_of_month', // 預設值
      due_value: null,
      execution_frequency: stage.execution_frequency || 'monthly',
      execution_months: stage.execution_months || [1,2,3,4,5,6,7,8,9,10,11,12],
      notes: stage.description || null,
      sops: [],
      sop_ids: [],
      stage_order: stage.stage_order,
      fromTemplate: true
    }))
    
    // 設置編輯數據（包含轉換的階段列表）
    const templateWithStages = {
      ...template,
      tasks: stages
    }
    
    editingTemplate.value = templateWithStages
    formVisible.value = true
    viewMode.value = false
    
    // 等待表單渲染後滾動到表單位置
    setTimeout(() => {
      const formElement = templateFormRef.value?.$el
      if (formElement) {
        formElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
        // 再向上滾動一點距離，避免被導航欄遮擋
        setTimeout(() => {
          window.scrollBy({ 
            top: -80, 
            behavior: 'smooth' 
          })
        }, 300)
      }
    }, 100)
  } catch (err) {
    console.error('載入模板階段失敗:', err)
    // 如果載入失敗，直接顯示模板但不包含階段列表
    editingTemplate.value = template
    formVisible.value = true
    showError('載入模板階段失敗，請重試')
  }
}

// 處理刪除點擊（顯示確認對話框）
const handleDeleteClick = (templateId) => {
  // 查找模板信息
  const template = store.taskTemplates.find(
    t => (t.template_id || t.templateId) === templateId
  )
  
  deletingTemplateId.value = templateId
  deletingTemplateName.value = template?.template_name || template?.templateName || '未知模板'
  deleteErrorData.value = null
  deleteConfirmVisible.value = true
}

// 確認刪除
const handleDeleteConfirm = async () => {
  // 如果模板被使用，不執行刪除，只關閉對話框
  if (deleteErrorData.value) {
    handleDeleteCancel()
    return
  }
  
  if (!deletingTemplateId.value) return
  
  deleting.value = true
  
  try {
    const response = await store.deleteTaskTemplate(deletingTemplateId.value)
    
    if (response.ok || response.data !== undefined) {
      showSuccess('刪除成功')
      
      // 關閉對話框
      handleDeleteCancel()
      
      // 重新載入模板列表（保持當前搜索和過濾條件）
      await loadTemplates()
    } else {
      throw new Error(response.message || '刪除失敗')
    }
  } catch (err) {
    console.error('刪除模板失敗:', err)
    
    // 如果是 409 錯誤（模板被使用），更新錯誤數據並顯示服務列表
    if (err?.response?.status === 409) {
      const errorData = err?.response?.data?.data || err?.response?.data || {}
      deleteErrorData.value = {
        template_id: errorData.template_id || deletingTemplateId.value,
        template_name: errorData.template_name || deletingTemplateName.value,
        used_by_count: errorData.used_by_count || 0,
        used_by_services: errorData.used_by_services || [],
        message: errorData.message || err?.response?.data?.message || '無法刪除模板'
      }
      // 不關閉對話框，讓用戶看到服務列表
    } else {
      // 其他錯誤，顯示錯誤信息並關閉對話框
      showError(err?.response?.data?.message || err?.message || '刪除失敗')
      handleDeleteCancel()
    }
  } finally {
    deleting.value = false
  }
}

// 取消刪除
const handleDeleteCancel = () => {
  deleteConfirmVisible.value = false
  deleteErrorData.value = null
  deletingTemplateId.value = null
  deletingTemplateName.value = ''
}

// 處理表單提交
const handleFormSubmit = async (data, isEdit) => {
  try {
    let response
    if (isEdit) {
      // 編輯模式
      const templateId = getTemplateId(editingTemplate.value)
      response = await store.updateTaskTemplate(templateId, data)
      if (response.ok || response.data) {
        showSuccess('更新成功')
        formVisible.value = false
        editingTemplate.value = null
        await loadTemplates()
      } else {
        showError(response.message || '更新失敗')
      }
    } else {
      // 新增模式
      response = await store.createTaskTemplate(data)
      if (response.ok || response.data) {
        showSuccess('新增成功')
        formVisible.value = false
        editingTemplate.value = null
        await loadTemplates()
      } else {
        showError(response.message || '新增失敗')
      }
    }
  } catch (err) {
    console.error('提交表單失敗:', err)
    showError(err.message || '操作失敗')
  }
}

// 處理表單取消
const handleFormCancel = () => {
  formVisible.value = false
  editingTemplate.value = null
}

// 處理關閉錯誤
const handleCloseError = () => {
  store.clearError()
}

// 載入
onMounted(async () => {
  await loadData()
})

// 組件卸載前清理防抖計時器
onBeforeUnmount(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
})
</script>

<style scoped>
.settings-templates {
  padding: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.action-bar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
</style>

