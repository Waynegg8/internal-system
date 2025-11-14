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
    
    <!-- 操作欄 -->
    <div class="action-bar" style="margin-bottom: 12px">
      <a-button type="primary" @click="handleAddTemplate">
        <template #icon>
          <plus-outlined />
        </template>
        新增模板
      </a-button>
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
        @delete="handleDeleteTemplate"
      />
    </a-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { PlusOutlined } from '@ant-design/icons-vue'
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

// 查看模板狀態
const viewMode = ref(false)
const viewingTemplate = ref(null)
const viewingTasks = computed(() => viewingTemplate.value?.tasks || [])

// 獲取模板 ID（處理路由參數）
const getTemplateId = (template) => {
  return template?.template_id || template?.templateId
}


// 載入數據
const loadData = async () => {
  try {
    // 並行載入模板列表和支援數據
    await Promise.all([
      store.getTaskTemplates(),
      store.fetchSupportData(),
      store.getServiceSOPs()
    ])
  } catch (err) {
    console.error('載入數據失敗:', err)
    // 錯誤已由 store 處理
  }
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

// 處理刪除模板
const handleDeleteTemplate = async (templateId) => {
  try {
    const response = await store.deleteTaskTemplate(templateId)
    if (response.ok || response.data !== undefined) {
      showSuccess('刪除成功')
      // 重新載入模板列表
      await store.getTaskTemplates()
    } else {
      showError(response.message || '刪除失敗')
    }
  } catch (err) {
    console.error('刪除模板失敗:', err)
    showError(err.message || '刪除失敗')
  }
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
        await store.getTaskTemplates()
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
        await store.getTaskTemplates()
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

