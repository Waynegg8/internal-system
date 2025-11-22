<template>
  <a-card>
    <template #title>
      <a-space>
        <span>階段管理</span>
        <a-tag v-if="hasChanges" color="orange">有未保存的變更</a-tag>
      </a-space>
    </template>
    <template #extra>
      <a-space>
        <a-button 
          :disabled="!hasChanges || saving" 
          :loading="saving"
          @click="handleSave"
        >
          保存變更
        </a-button>
        <a-button 
          :disabled="!hasChanges || saving"
          @click="handleReset"
        >
          重置
        </a-button>
      </a-space>
    </template>

    <a-alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-bottom: 16px"
    />

    <a-spin :spinning="loading">
      <a-empty v-if="!loading && localStages.length === 0" description="尚無階段配置" />

      <div v-else class="stage-list">
        <div
          v-for="(stage, index) in localStages"
          :key="stage.stage_id || index"
          :draggable="true"
          class="stage-item"
          :class="{ 'dragging': draggingIndex === index }"
          @dragstart="handleDragStart(index, $event)"
          @dragover.prevent="handleDragOver(index, $event)"
          @drop="handleDrop(index, $event)"
          @dragend="handleDragEnd"
        >
          <div class="stage-item-content">
            <div class="stage-drag-handle">
              <DragOutlined />
            </div>
            
            <div class="stage-order">
              <a-tag color="blue">{{ index + 1 }}</a-tag>
            </div>

            <div class="stage-name-input">
              <a-input
                v-if="editingIndex === index"
                v-model:value="editingName"
                :maxlength="100"
                placeholder="請輸入階段名稱"
                @press-enter="handleSaveEdit(index)"
                @blur="handleSaveEdit(index)"
                @keydown.esc="handleCancelEdit"
                ref="editInputRef"
                autofocus
              />
              <div
                v-else
                class="stage-name-display"
                @click="handleStartEdit(index)"
              >
                {{ stage.stage_name || `階段 ${index + 1}` }}
              </div>
            </div>

            <div class="stage-actions">
              <a-button
                v-if="editingIndex === index"
                type="link"
                size="small"
                @click="handleSaveEdit(index)"
              >
                保存
              </a-button>
              <a-button
                v-else
                type="link"
                size="small"
                @click="handleStartEdit(index)"
              >
                編輯
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </a-card>

  <!-- 階段同步確認對話框 -->
  <a-modal
    v-model:open="syncConfirmVisible"
    title="確認階段同步"
    :confirm-loading="syncing"
    :width="600"
    @ok="handleSyncConfirm"
    @cancel="handleSyncCancel"
  >
    <a-alert
      type="warning"
      :message="syncConfirmData?.message || '同步階段變更'"
      show-icon
      style="margin-bottom: 16px"
    />

    <div style="margin-bottom: 16px">
      <p style="margin-bottom: 8px; font-weight: 500;">
        此操作將更新 <strong>{{ syncConfirmData?.affected_services_count || 0 }}</strong> 個服務的任務配置：
      </p>
      <p style="color: #6b7280; font-size: 12px; margin-bottom: 12px;">
        同步將替換這些服務的現有任務配置，請確認是否繼續。
      </p>
    </div>

    <div v-if="syncConfirmData?.affected_services && syncConfirmData.affected_services.length > 0" style="max-height: 300px; overflow-y: auto;">
      <a-list
        :data-source="syncConfirmData.affected_services"
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

    <div v-else style="text-align: center; padding: 24px; color: #8c8c8c;">
      <a-empty description="沒有服務使用此模板" :image="false" />
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { DragOutlined } from '@ant-design/icons-vue'
import { fetchStages, updateStageNames, syncStages } from '@/api/task-templates'
import { usePageAlert } from '@/composables/usePageAlert'

const props = defineProps({
  templateId: {
    type: [Number, String],
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['stages-updated', 'sync-required'])

const { showSuccess, showError } = usePageAlert()

// 本地狀態
const localStages = ref([])
const originalStages = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const editingIndex = ref(-1)
const editingName = ref('')
const editInputRef = ref(null)

// 拖拽狀態
const draggingIndex = ref(-1)
const dragOverIndex = ref(-1)

// 同步確認對話框狀態
const syncConfirmVisible = ref(false)
const syncConfirmData = ref(null)
const syncing = ref(false)

// 是否有未保存的變更
const hasChanges = computed(() => {
  if (localStages.value.length !== originalStages.value.length) {
    return true
  }
  
  for (let i = 0; i < localStages.value.length; i++) {
    const local = localStages.value[i]
    const original = originalStages.value[i]
    
    if (!original) return true
    
    if (local.stage_id !== original.stage_id) return true
    if (local.stage_name !== original.stage_name) return true
    if (local.stage_order !== original.stage_order) return true
  }
  
  return false
})

// 載入階段列表
const loadStages = async () => {
  if (!props.templateId) return
  
  loading.value = true
  errorMessage.value = ''
  
  try {
    const response = await fetchStages(props.templateId)
    const stages = response?.data || []
    
    // 按 stage_order 排序
    const sortedStages = [...stages].sort((a, b) => {
      const orderA = a.stage_order || 0
      const orderB = b.stage_order || 0
      return orderA - orderB
    })
    
    localStages.value = sortedStages.map((stage, index) => ({
      ...stage,
      stage_order: index + 1 // 確保順序從 1 開始
    }))
    
    // 保存原始數據用於比較
    originalStages.value = JSON.parse(JSON.stringify(localStages.value))
  } catch (error) {
    console.error('載入階段列表失敗:', error)
    errorMessage.value = error?.response?.data?.message || error?.message || '載入階段列表失敗'
  } finally {
    loading.value = false
  }
}

// 開始編輯
const handleStartEdit = (index) => {
  editingIndex.value = index
  editingName.value = localStages.value[index].stage_name || ''
  
  nextTick(() => {
    if (editInputRef.value) {
      editInputRef.value.focus()
      editInputRef.value.select()
    }
  })
}

// 保存編輯
const savingEdit = ref(false)
const handleSaveEdit = (index) => {
  if (editingIndex.value !== index || savingEdit.value) return
  
  savingEdit.value = true
  
  // 使用 setTimeout 避免 blur 和 click 事件冲突
  setTimeout(() => {
    const trimmedName = editingName.value.trim()
    if (trimmedName) {
      localStages.value[index].stage_name = trimmedName
    }
    
    editingIndex.value = -1
    editingName.value = ''
    savingEdit.value = false
  }, 100)
}

// 取消編輯
const handleCancelEdit = () => {
  editingIndex.value = -1
  editingName.value = ''
}

// 拖拽開始
const handleDragStart = (index, event) => {
  draggingIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/html', event.target.outerHTML)
  
  // 添加拖拽樣式
  event.target.style.opacity = '0.5'
}

// 拖拽經過
const handleDragOver = (index, event) => {
  event.preventDefault()
  dragOverIndex.value = index
  event.dataTransfer.dropEffect = 'move'
}

// 拖拽放下
const handleDrop = (index, event) => {
  event.preventDefault()
  
  if (draggingIndex.value === -1 || draggingIndex.value === index) {
    return
  }
  
  // 移動項目
  const draggedItem = localStages.value[draggingIndex.value]
  localStages.value.splice(draggingIndex.value, 1)
  localStages.value.splice(index, 0, draggedItem)
  
  // 更新 stage_order
  localStages.value.forEach((stage, idx) => {
    stage.stage_order = idx + 1
  })
  
  dragOverIndex.value = -1
}

// 拖拽結束
const handleDragEnd = (event) => {
  event.target.style.opacity = ''
  draggingIndex.value = -1
  dragOverIndex.value = -1
}

// 保存變更
const handleSave = async () => {
  if (!hasChanges.value) return
  
  saving.value = true
  errorMessage.value = ''
  
  try {
    // 構建更新數據
    const stages = localStages.value.map((stage, index) => ({
      stage_id: stage.stage_id,
      stage_name: stage.stage_name || `階段 ${index + 1}`,
      stage_order: index + 1
    }))
    
    const response = await updateStageNames(props.templateId, { stages })
    
    if (response?.ok || response?.data) {
      showSuccess('階段變更已保存')
      
      // 更新原始數據
      originalStages.value = JSON.parse(JSON.stringify(localStages.value))
      
      // 觸發更新事件
      emit('stages-updated', localStages.value)
      
      // 嘗試同步階段變更（不傳 confirm，讓後端返回需要確認的響應）
      await handleSyncStages()
    } else {
      throw new Error(response?.message || '保存失敗')
    }
  } catch (error) {
    console.error('保存階段變更失敗:', error)
    errorMessage.value = error?.response?.data?.message || error?.message || '保存階段變更失敗'
    showError(errorMessage.value)
  } finally {
    saving.value = false
  }
}

// 處理階段同步
const handleSyncStages = async () => {
  try {
    // 先不傳 confirm，讓後端返回需要確認的響應（包含受影響的服務列表）
    await syncStages(props.templateId, { confirm: false })
    
    // 如果沒有返回 428 錯誤，說明沒有服務使用此模板，不需要同步
    // 這種情況下 syncStages 會成功返回，不需要顯示確認對話框
    // 顯示提示信息
    showSuccess('階段變更已保存，沒有服務需要同步')
  } catch (error) {
    // 如果是 428 錯誤（需要確認），顯示確認對話框
    if (error?.response?.status === 428) {
      const errorData = error?.response?.data?.data || error?.response?.data || {}
      syncConfirmData.value = {
        template_id: errorData.template_id,
        template_name: errorData.template_name,
        affected_services_count: errorData.affected_services_count || 0,
        affected_services: errorData.affected_services || [],
        stages_count: errorData.stages_count || 0,
        stages: errorData.stages || [],
        message: errorData.message || error?.response?.data?.message || '需要確認階段同步'
      }
      syncConfirmVisible.value = true
    } else {
      // 其他錯誤（如 404、403 等），只記錄不阻止
      console.warn('同步階段變更時發生錯誤:', error)
      // 不顯示錯誤，因為階段變更已經保存成功
    }
  }
}

// 確認同步
const handleSyncConfirm = async () => {
  syncing.value = true
  errorMessage.value = ''
  
  try {
    const response = await syncStages(props.templateId, { confirm: true })
    
    if (response?.ok || response?.data) {
      const data = response?.data || {}
      const syncedCount = data.synced_count || 0
      const failedCount = data.failed_count || 0
      
      if (failedCount === 0) {
        showSuccess(`階段同步成功！已更新 ${syncedCount} 個服務的任務配置`)
      } else {
        showError(`階段同步部分成功：已更新 ${syncedCount} 個服務，${failedCount} 個服務同步失敗`)
      }
      
      // 關閉確認對話框
      syncConfirmVisible.value = false
      syncConfirmData.value = null
      
      // 觸發同步完成事件
      emit('sync-required', {
        templateId: props.templateId,
        stages: localStages.value,
        synced: true
      })
    } else {
      throw new Error(response?.message || '同步失敗')
    }
  } catch (error) {
    console.error('同步階段變更失敗:', error)
    errorMessage.value = error?.response?.data?.message || error?.message || '同步階段變更失敗'
    showError(errorMessage.value)
  } finally {
    syncing.value = false
  }
}

// 取消同步
const handleSyncCancel = () => {
  syncConfirmVisible.value = false
  syncConfirmData.value = null
  
  // 觸發取消同步事件
  emit('sync-required', {
    templateId: props.templateId,
    stages: localStages.value,
    synced: false,
    cancelled: true
  })
}

// 重置變更
const handleReset = () => {
  if (!hasChanges.value) return
  
  localStages.value = JSON.parse(JSON.stringify(originalStages.value))
  editingIndex.value = -1
  editingName.value = ''
  errorMessage.value = ''
}

// 監聽 templateId 變化
watch(() => props.templateId, (newId) => {
  if (newId) {
    loadStages()
  } else {
    localStages.value = []
    originalStages.value = []
  }
}, { immediate: true })

// 暴露方法供父組件調用
defineExpose({
  loadStages,
  hasChanges
})
</script>

<style scoped>
.stage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stage-item {
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: move;
  transition: all 0.2s;
}

.stage-item:hover {
  border-color: #40a9ff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stage-item.dragging {
  opacity: 0.5;
}

.stage-item-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stage-drag-handle {
  color: #8c8c8c;
  cursor: grab;
  font-size: 16px;
  display: flex;
  align-items: center;
}

.stage-drag-handle:active {
  cursor: grabbing;
}

.stage-order {
  min-width: 50px;
}

.stage-name-input {
  flex: 1;
}

.stage-name-display {
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.stage-name-display:hover {
  background-color: #f5f5f5;
}

.stage-actions {
  min-width: 60px;
  text-align: right;
}
</style>

