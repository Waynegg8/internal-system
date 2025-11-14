<template>
  <div class="payroll-items-content">
    <!-- 成功提示 -->
    <a-alert
      v-if="successMessage"
      type="success"
      :message="successMessage"
      show-icon
      closable
      @close="successMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 錯誤提示 -->
    <a-alert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      show-icon
      closable
      @close="errorMessage = ''"
      style="margin-bottom: 16px"
    />
    
    <!-- 頂部操作欄 -->
    <div class="payroll-items-toolbar">
      <a-input-search
        v-model:value="searchKeyword"
        placeholder="搜索項目代碼或名稱"
        style="width: 300px"
        @search="handleSearch"
        @change="handleSearchChange"
        allow-clear
      />
      <a-button type="primary" @click="handleAdd">
        <template #icon>
          <PlusOutlined />
        </template>
        新增項目
      </a-button>
    </div>

    <!-- 表格 -->
    <PayrollItemsTable
      :data-source="filteredSalaryItemTypes"
      :loading="loading"
      @edit="handleEdit"
      @delete="handleDelete"
    />

    <!-- 新增/編輯表單模態框 -->
    <SalaryItemModal
      :visible="modalVisible"
      :editing-item="editingItem"
      :loading="submitting"
      @submit="handleModalSubmit"
      @cancel="handleModalCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePayrollStore } from '@/stores/payroll'
import { usePageAlert } from '@/composables/usePageAlert'
import { PlusOutlined } from '@ant-design/icons-vue'
import PayrollItemsTable from '@/components/payroll/PayrollItemsTable.vue'
import SalaryItemModal from '@/components/payroll/SalaryItemModal.vue'

const payrollStore = usePayrollStore()
const { successMessage, errorMessage, showSuccess, showError } = usePageAlert()

// 搜索關鍵詞
const searchKeyword = ref('')

// 模態框顯示狀態
const modalVisible = ref(false)

// 編輯的項目
const editingItem = ref(null)

// 提交狀態
const submitting = ref(false)

// 從 store 獲取數據
const filteredSalaryItemTypes = computed(() => payrollStore.filteredSalaryItemTypes)
const loading = computed(() => payrollStore.loading)

// 處理搜索
const handleSearch = (keyword) => {
  payrollStore.setSearchKeyword(keyword)
}

// 處理搜索變化（實時搜索）
const handleSearchChange = (e) => {
  const keyword = e.target.value
  payrollStore.setSearchKeyword(keyword)
}

// 處理新增
const handleAdd = () => {
  editingItem.value = null
  modalVisible.value = true
}

// 處理編輯
const handleEdit = (item) => {
  editingItem.value = item
  modalVisible.value = true
}

// 處理刪除
const handleDelete = async (itemTypeId) => {
  try {
    await payrollStore.deleteSalaryItemType(itemTypeId)
    showSuccess('已刪除薪資項目')
  } catch (error) {
    showError(error.message || '刪除失敗')
  }
}

// 處理表單提交
const handleModalSubmit = async (data, isEdit) => {
  submitting.value = true
  
  try {
    // 轉換字段名為 snake_case（不傳遞 item_code，由後端自動生成）
    const payload = {
      item_name: data.item_name || data.itemName,
      category: data.category,
      description: data.description || '',
      sort_order: data.sort_order || data.displayOrder || 99
    }
    
    if (isEdit) {
      // 更新 - 需要從 editingItem 獲取 itemTypeId
      const itemTypeId = editingItem.value?.itemTypeId || editingItem.value?.item_type_id
      if (!itemTypeId) {
        showError('無法獲取項目 ID')
        return
      }
      await payrollStore.updateSalaryItemType(itemTypeId, payload)
      showSuccess('更新成功')
    } else {
      // 創建
      await payrollStore.createSalaryItemType(payload)
      showSuccess('創建成功')
    }
    
    // 關閉模態框
    modalVisible.value = false
    editingItem.value = null
  } catch (error) {
    showError(error.message || (isEdit ? '更新失敗' : '創建失敗'))
  } finally {
    submitting.value = false
  }
}

// 處理表單取消
const handleModalCancel = () => {
  modalVisible.value = false
  editingItem.value = null
}

// 載入數據
onMounted(async () => {
  try {
    await payrollStore.loadSalaryItemTypes()
  } catch (error) {
    showError(error.message || '載入薪資項目列表失敗')
  }
})
</script>

<style scoped>
.payroll-items-content {
  padding: 0;
}

.payroll-items-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}
</style>

