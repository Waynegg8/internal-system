<template>
  <div class="service-items-manager" style="padding: 16px; background: #fafafa; margin: 8px 0;">
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="font-size: 14px;">任務類型管理</strong>
        <span style="color: #999; margin-left: 8px; font-size: 12px;">{{ serviceName }}</span>
      </div>
      <a-button type="primary" size="small" @click="handleAddItem">
        <template #icon>
          <plus-outlined />
        </template>
        新增任務類型
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="items"
      :loading="loading"
      :pagination="false"
      row-key="item_id"
      size="small"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" @click="handleEditItem(record)">編輯</a-button>
            <a-button size="small" danger @click="handleDeleteItem(record.item_id)">刪除</a-button>
          </a-space>
        </template>
      </template>

      <template #emptyText>
        <a-empty description="暫無任務類型" :image="false" />
      </template>
    </a-table>

    <!-- 任務類型表單 Modal -->
    <a-modal
      v-model:visible="formVisible"
      :title="editingItem ? '編輯任務類型' : '新增任務類型'"
      :width="600"
      :confirm-loading="submitting"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form
        ref="formRef"
        :model="form"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="任務類型名稱" name="item_name">
          <a-input
            v-model:value="form.item_name"
            placeholder="請輸入任務類型名稱"
            :maxlength="100"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { usePageAlert } from '@/composables/usePageAlert'
import { useSettingsApi } from '@/api/settings'
import { extractApiData, extractApiArray } from '@/utils/apiHelpers'

const props = defineProps({
  serviceId: {
    type: [Number, String],
    required: true
  },
  serviceName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['refresh'])

const { showSuccess, showError } = usePageAlert()
const api = useSettingsApi()

// 狀態
const loading = ref(false)
const submitting = ref(false)
const items = ref([])
const formVisible = ref(false)
const editingItem = ref(null)
const formRef = ref(null)

// 表單數據
const form = ref({
  item_name: ''
})

// 表單驗證規則
const rules = {
  item_name: [
    { required: true, message: '請輸入任務類型名稱', trigger: 'blur' }
  ]
}

// 表格列定義 - 只顯示任務類型名稱
const columns = [
  {
    title: '任務類型名稱',
    dataIndex: 'item_name',
    key: 'item_name'
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    align: 'right'
  }
]

// 載入任務類型列表
const loadItems = async () => {
  loading.value = true
  try {
    const response = await api.getServiceItems(props.serviceId)
    const data = extractApiData(response, {})
    if (data.items && Array.isArray(data.items)) {
      items.value = data.items
    } else {
      items.value = extractApiArray(response, [])
    }
  } catch (error) {
    console.error('載入任務類型失敗:', error)
    showError('載入任務類型失敗')
    items.value = []
  } finally {
    loading.value = false
  }
}

// 處理新增
const handleAddItem = () => {
  editingItem.value = null
  form.value = {
    item_name: ''
  }
  formVisible.value = true
  setTimeout(() => {
    formRef.value?.resetFields()
  }, 0)
}

// 處理編輯
const handleEditItem = (item) => {
  editingItem.value = item
  form.value = {
    item_name: item.item_name || ''
  }
  formVisible.value = true
}

// 處理刪除
const handleDeleteItem = async (itemId) => {
  try {
    const response = await api.deleteServiceItem(props.serviceId, itemId)
    if (response.ok) {
      showSuccess('刪除成功')
      await loadItems()
      emit('refresh')
    } else {
      showError(response.message || '刪除失敗')
    }
  } catch (error) {
    console.error('刪除任務類型失敗:', error)
    showError(error.message || '刪除失敗')
  }
}

// 處理提交
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    const data = {
      item_name: form.value.item_name.trim()
    }

    let response
    if (editingItem.value) {
      // 編輯
      response = await api.updateServiceItem(props.serviceId, editingItem.value.item_id, data)
      if (response.ok) {
        showSuccess('更新成功')
        formVisible.value = false
        editingItem.value = null
        await loadItems()
        emit('refresh')
      } else {
        showError(response.message || '更新失敗')
      }
    } else {
      // 新增
      response = await api.createServiceItem(props.serviceId, data)
      if (response.ok) {
        showSuccess('新增成功')
        formVisible.value = false
        await loadItems()
        emit('refresh')
      } else {
        showError(response.message || '新增失敗')
      }
    }
  } catch (error) {
    if (error.errorFields) {
      // 表單驗證錯誤
      return
    }
    console.error('提交失敗:', error)
    showError(error.message || '操作失敗')
  } finally {
    submitting.value = false
  }
}

// 處理取消
const handleCancel = () => {
  formVisible.value = false
  editingItem.value = null
  formRef.value?.resetFields()
}

// 監聽 serviceId 變化
watch(() => props.serviceId, () => {
  if (props.serviceId) {
    loadItems()
  }
}, { immediate: true })

// 初始化
onMounted(() => {
  if (props.serviceId) {
    loadItems()
  }
})
</script>

<style scoped>
.service-items-manager {
  border-radius: 4px;
}
</style>

