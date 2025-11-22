<template>
  <div class="cost-records-list">
    <div class="page-header">
      <h1>月度管理費用記錄</h1>
      <a-button type="primary" @click="showCreateModal">
        <template #icon><PlusOutlined /></template>
        新增記錄
      </a-button>
    </div>

    <div class="content">
      <CostRecordTable
        :records="records"
        :loading="loading"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>

    <CostRecordForm
      v-model:visible="formVisible"
      :record="editingRecord"
      :cost-types="costTypes"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useCostApi } from '@/api/costs'
import CostRecordTable from '@/components/costs/CostRecordTable.vue'
import CostRecordForm from '@/components/costs/CostRecordForm.vue'

const { fetchCostRecords, createCostRecord, updateCostRecord, deleteCostRecord, fetchCostTypes } = useCostApi()

// 響應式數據
const records = ref([])
const costTypes = ref([])
const loading = ref(false)
const formVisible = ref(false)
const editingRecord = ref(null)

// 獲取數據
const loadRecords = async () => {
  try {
    loading.value = true
    const response = await fetchCostRecords()
    if (response.success) {
      records.value = response.data.items || []
    } else {
      message.error(response.message || '獲取記錄失敗')
    }
  } catch (error) {
    console.error('載入記錄失敗:', error)
    message.error('載入記錄失敗')
  } finally {
    loading.value = false
  }
}

const loadCostTypes = async () => {
  try {
    const response = await fetchCostTypes()
    if (response.success) {
      costTypes.value = response.data || []
    }
  } catch (error) {
    console.error('載入成本類型失敗:', error)
  }
}

// 事件處理
const showCreateModal = () => {
  editingRecord.value = null
  formVisible.value = true
}

const handleEdit = (record) => {
  editingRecord.value = record
  formVisible.value = true
}

const handleDelete = async (recordId) => {
  try {
    const response = await deleteCostRecord(recordId)
    if (response.success) {
      message.success('刪除成功')
      await loadRecords()
    } else {
      message.error(response.message || '刪除失敗')
    }
  } catch (error) {
    console.error('刪除記錄失敗:', error)
    message.error('刪除記錄失敗')
  }
}

const handleSubmit = async (formData) => {
  try {
    const isEdit = !!editingRecord.value
    const response = isEdit
      ? await updateCostRecord(editingRecord.value.id, formData)
      : await createCostRecord(formData)

    if (response.success) {
      message.success(isEdit ? '更新成功' : '新增成功')
      formVisible.value = false
      await loadRecords()
    } else {
      message.error(response.message || (isEdit ? '更新失敗' : '新增失敗'))
    }
  } catch (error) {
    console.error('提交表單失敗:', error)
    message.error('操作失敗')
  }
}

const handleCancel = () => {
  formVisible.value = false
  editingRecord.value = null
}

// 組件掛載時載入數據
onMounted(async () => {
  await Promise.all([
    loadRecords(),
    loadCostTypes()
  ])
})
</script>

<style scoped>
.cost-records-list {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  color: #262626;
  font-size: 24px;
  font-weight: 600;
}

.content {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>


