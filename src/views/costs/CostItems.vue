<template>
  <div class="cost-items-content">
    <a-space direction="vertical" size="large" class="cost-items-stack">
      <a-space
        v-if="successMessage || errorMessage || infoMessage"
        direction="vertical"
        size="small"
        class="cost-items-alerts"
      >
        <a-alert
          v-if="successMessage"
          type="success"
          :message="successMessage"
          show-icon
          closable
          @close="successMessage = ''"
        />
        <a-alert
          v-if="errorMessage"
          type="error"
          :message="errorMessage"
          show-icon
          closable
          @close="errorMessage = ''"
        />
        <a-alert
          v-if="infoMessage"
          type="info"
          :message="infoMessage"
          show-icon
          closable
          @close="infoMessage = ''"
        />
      </a-space>

      <a-space direction="vertical" size="large" style="width: 100%">
        <a-card
          size="small"
          title="成本項目類型"
          :head-style="compactHeadStyle"
          :body-style="compactBodyStyle"
        >
          <template #extra>
            <a-button type="primary" size="small" @click="handleAddCostType">
              新增項目
            </a-button>
          </template>
          <CostTypesTable
            :cost-types="store.costTypes"
            :loading="store.loading"
            @edit="handleEditCostType"
            @template="handleTemplate"
            @remove="handleRemoveCostType"
          />
        </a-card>

        <a-card
          size="small"
          title="月度管理費用"
          :head-style="compactHeadStyle"
          :body-style="compactBodyStyle"
          class="cost-items-monthly-card"
        >
          <template #extra>
            <a-space :size="8" align="center" wrap class="cost-items-monthly-actions">
              <a-date-picker
                v-model:value="selectedMonthValue"
                picker="month"
                format="YYYY-MM"
                placeholder="選擇月份"
                size="small"
                @change="handleMonthChange"
              />
              <a-button size="small" @click="handleGenerateCurrentMonth">
                本月自動生成
              </a-button>
              <a-button type="primary" size="small" @click="handleAddOverheadCost">
                新增記錄
              </a-button>
            </a-space>
          </template>

          <a-space direction="vertical" size="small" style="width: 100%">
            <OverheadCostsSummary :summary="store.overheadCostsSummary" />
            <OverheadCostsTable
              :costs="store.overheadCosts"
              :loading="store.loading"
              @edit="handleEditOverheadCost"
              @delete="handleDeleteOverheadCost"
            />
          </a-space>
        </a-card>
      </a-space>
    </a-space>

    <!-- 成本項目表單彈窗 -->
    <CostTypeFormModal
      v-model:visible="costTypeFormVisible"
      :editing-cost-type="editingCostType"
      @submit="handleCostTypeFormSubmit"
      @cancel="handleCostTypeFormCancel"
    />
    
    <!-- 自動生成模板彈窗 -->
    <OverheadTemplateModal
      v-model:visible="templateModalVisible"
      :cost-type-id="selectedCostTypeId"
      :template="currentTemplate"
      @submit="handleTemplateSubmit"
      @cancel="handleTemplateCancel"
    />
    
    <!-- 月度記錄表單彈窗 -->
    <OverheadCostFormModal
      v-model:visible="overheadCostFormVisible"
      :editing-cost="editingOverheadCost"
      :cost-types="store.costTypes"
      :year="year"
      :month="month"
      @submit="handleOverheadCostFormSubmit"
      @cancel="handleOverheadCostFormCancel"
    />
    
    <!-- 生成預覽彈窗 -->
    <GenerateOverheadCostsModal
      v-model:visible="generateModalVisible"
      :preview-data="previewData"
      :cost-types="store.costTypes"
      @submit="handleGenerateSubmit"
      @cancel="handleGenerateCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { useCostStore } from '@/stores/costs'
import { usePageAlert } from '@/composables/usePageAlert'
import { getCurrentYm } from '@/utils/formatters'
import CostTypesTable from '@/components/costs/CostTypesTable.vue'
import CostTypeFormModal from '@/components/costs/CostTypeFormModal.vue'
import OverheadTemplateModal from '@/components/costs/OverheadTemplateModal.vue'
import OverheadCostFormModal from '@/components/costs/OverheadCostFormModal.vue'
import OverheadCostsTable from '@/components/costs/OverheadCostsTable.vue'
import OverheadCostsSummary from '@/components/costs/OverheadCostsSummary.vue'
import GenerateOverheadCostsModal from '@/components/costs/GenerateOverheadCostsModal.vue'

const store = useCostStore()
const { successMessage, errorMessage, infoMessage, showSuccess, showError, showInfo } = usePageAlert()

const compactHeadStyle = {
  padding: '8px 16px',
  minHeight: '44px',
  fontSize: '14px'
}

const compactBodyStyle = {
  padding: '12px 16px'
}

// 選中的月份（格式：YYYY-MM）
const selectedMonth = ref(getCurrentYm())
const selectedMonthValue = ref(dayjs(selectedMonth.value))

// 成本項目表單相關狀態
const costTypeFormVisible = ref(false)
const editingCostType = ref(null)

// 自動生成模板相關狀態
const templateModalVisible = ref(false)
const selectedCostTypeId = ref(null)
const currentTemplate = ref(null)

// 月度記錄表單相關狀態
const overheadCostFormVisible = ref(false)
const editingOverheadCost = ref(null)

// 生成預覽相關狀態
const generateModalVisible = ref(false)
const previewData = ref([])

// 從 selectedMonth 解析年份和月份
const year = computed(() => {
  const [y] = selectedMonth.value.split('-')
  return parseInt(y, 10)
})

const month = computed(() => {
  const [, m] = selectedMonth.value.split('-')
  return parseInt(m, 10)
})

// 載入數據
const loadData = async () => {
  try {
    // 載入成本項目類型列表
    await store.fetchCostTypes()
    
    // 載入月度管理費用記錄和統計摘要
    await store.fetchOverheadCosts(year.value, month.value)
  } catch (error) {
    console.error('載入數據失敗:', error)
    showError('載入數據失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理新增成本項目
const handleAddCostType = () => {
  editingCostType.value = null
  costTypeFormVisible.value = true
}

// 處理編輯成本項目
const handleEditCostType = (costType) => {
  editingCostType.value = costType
  costTypeFormVisible.value = true
}

// 處理刪除成本項目
const handleRemoveCostType = async (costTypeId) => {
  try {
    await store.deleteCostType(costTypeId)
    showSuccess('項目已刪除')
    await loadData()
  } catch (error) {
    showError('刪除失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理成本項目表單提交
const handleCostTypeFormSubmit = async (data) => {
  try {
    const isEdit = !!editingCostType.value
    if (isEdit) {
      const costTypeId = editingCostType.value.id || editingCostType.value.costTypeId || editingCostType.value.cost_type_id
      await store.updateCostType(costTypeId, data)
      showSuccess('更新成功')
    } else {
      await store.createCostType(data)
      showSuccess('新增成功')
    }
    costTypeFormVisible.value = false
    editingCostType.value = null
    await loadData()
  } catch (error) {
    showError((editingCostType.value ? '更新' : '新增') + '失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理成本項目表單取消
const handleCostTypeFormCancel = () => {
  editingCostType.value = null
}

// 處理設定自動生成模板
const handleTemplate = async (costTypeId) => {
  selectedCostTypeId.value = costTypeId
  try {
    const template = await store.fetchOverheadTemplate(costTypeId, { force: true })
    currentTemplate.value = template
    templateModalVisible.value = true
  } catch (error) {
    console.error('獲取模板失敗:', error)
    // 即使獲取失敗，也顯示彈窗（可能是模板不存在）
    currentTemplate.value = null
    templateModalVisible.value = true
  }
}

// 處理模板設定提交
const handleTemplateSubmit = async (data, resolve, reject) => {
  try {
    // 確保 selectedCostTypeId 不為 null
    if (!selectedCostTypeId.value) {
      const error = new Error('成本類型ID無效')
      showError('設定失敗：' + error.message)
      if (reject) reject(error)
      return
    }
    
    await store.updateOverheadTemplate(selectedCostTypeId.value, data)
    showSuccess('設定成功')
    templateModalVisible.value = false
    selectedCostTypeId.value = null
    currentTemplate.value = null
    
    // 調用 resolve 以允許彈窗關閉
    if (resolve) resolve()
  } catch (error) {
    showError('設定失敗：' + (error.message || '未知錯誤'))
    // 調用 reject 以阻止彈窗關閉
    if (reject) reject(error)
  }
}

// 處理模板設定取消
const handleTemplateCancel = () => {
  selectedCostTypeId.value = null
  currentTemplate.value = null
}

// 處理月份變化
const handleMonthChange = (date) => {
  if (date) {
    const monthStr = dayjs(date).format('YYYY-MM')
    selectedMonth.value = monthStr
    selectedMonthValue.value = dayjs(date)
    // 重新載入月度記錄和統計摘要
    loadData()
  }
}

// 處理新增月度記錄
const handleAddOverheadCost = () => {
  editingOverheadCost.value = null
  overheadCostFormVisible.value = true
}

// 處理編輯月度記錄
const handleEditOverheadCost = (cost) => {
  editingOverheadCost.value = cost
  overheadCostFormVisible.value = true
}

// 處理刪除月度記錄
const handleDeleteOverheadCost = async (costId) => {
  try {
    await store.deleteOverheadCost(costId)
    showSuccess('刪除成功')
    await loadData()
  } catch (error) {
    showError('刪除失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理月度記錄表單提交
const handleOverheadCostFormSubmit = async (data) => {
  try {
    const isEdit = !!editingOverheadCost.value
    if (isEdit) {
      const costId = editingOverheadCost.value.id || editingOverheadCost.value.costId || editingOverheadCost.value.cost_id
      await store.updateOverheadCost(costId, data)
      showSuccess('更新成功')
    } else {
      await store.createOverheadCost(data)
      showSuccess('新增成功')
    }
    overheadCostFormVisible.value = false
    editingOverheadCost.value = null
    await loadData()
  } catch (error) {
    showError((editingOverheadCost.value ? '更新' : '新增') + '失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理月度記錄表單取消
const handleOverheadCostFormCancel = () => {
  editingOverheadCost.value = null
}

// 處理本月自動生成
const handleGenerateCurrentMonth = async () => {
  try {
    const preview = await store.previewOverheadCostsGeneration(year.value, month.value)
    if (!preview || preview.length === 0) {
      showInfo('沒有可生成的項目')
      return
    }
    previewData.value = preview
    generateModalVisible.value = true
  } catch (error) {
    showError('獲取預覽失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理執行生成
const handleGenerateSubmit = async (templateIds) => {
  try {
    await store.generateOverheadCosts(year.value, month.value, templateIds)
    showSuccess('生成成功')
    generateModalVisible.value = false
    previewData.value = []
    // 重新載入月度記錄和統計摘要
    await store.fetchOverheadCosts(year.value, month.value)
  } catch (error) {
    showError('生成失敗：' + (error.message || '未知錯誤'))
  }
}

// 處理生成取消
const handleGenerateCancel = () => {
  previewData.value = []
}

// 初始化
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.cost-items-content {
  padding: 16px;
}

.cost-items-stack {
  width: 100%;
}

.cost-items-alerts .ant-alert {
  margin: 0;
}

.cost-items-monthly-actions {
  justify-content: flex-end;
}

@media (max-width: 991px) {
  .cost-items-content {
    padding: 12px;
  }

  .cost-items-monthly-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>

