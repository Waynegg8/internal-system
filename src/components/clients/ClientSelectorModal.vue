<template>
  <a-modal
    v-model:open="modalVisible"
    title="選擇要複製的客戶"
    :width="800"
    :confirm-loading="loading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <!-- 搜索欄 -->
    <div style="margin-bottom: 16px">
      <a-input-search
        v-model:value="searchKeyword"
        placeholder="搜尋公司名稱或統編"
        allow-clear
        @search="handleSearch"
        @press-enter="handleSearch"
      />
    </div>

    <!-- 客戶列表表格 -->
    <a-table
      :dataSource="clients"
      :columns="columns"
      :pagination="pagination"
      :loading="loading"
      :row-key="(record) => record.clientId || record.client_id || record.id"
      :row-selection="{
        type: 'radio',
        selectedRowKeys: selectedClientId ? [selectedClientId] : [],
        onChange: handleSelectionChange
      }"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'taxId'">
          <span style="font-family: monospace">
            {{ formatTaxRegistrationNumber(record.taxId || record.tax_registration_number || record.clientId || record.client_id) }}
          </span>
        </template>
      </template>
    </a-table>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useClientStore } from '@/stores/clients'
import { formatTaxRegistrationNumber } from '@/utils/formatters'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'select'])

const clientStore = useClientStore()

// 本地狀態
const searchKeyword = ref('')
const selectedClientId = ref(null)
const loading = ref(false)
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0
})

// Modal 顯示狀態
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 客戶列表
const clients = computed(() => clientStore.clients)

// 表格列定義
const columns = [
  {
    title: '統一編號',
    key: 'taxId',
    width: 120
  },
  {
    title: '公司名稱',
    dataIndex: 'companyName',
    key: 'companyName'
  },
  {
    title: '負責人員',
    dataIndex: 'assigneeName',
    key: 'assigneeName'
  }
]

// 處理搜索
const handleSearch = async () => {
  pagination.value.current = 1
  await loadClients()
}

// 處理表格變化（分頁、排序等）
const handleTableChange = (pag) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  loadClients()
}

// 載入客戶列表
const loadClients = async () => {
  loading.value = true
  try {
    await clientStore.fetchClients({
      q: searchKeyword.value,
      page: pagination.value.current,
      perPage: pagination.value.pageSize
    })
    pagination.value.total = clientStore.pagination.total
  } catch (error) {
    console.error('載入客戶列表失敗:', error)
  } finally {
    loading.value = false
  }
}

// 處理選擇變化
const handleSelectionChange = (selectedRowKeys) => {
  selectedClientId.value = selectedRowKeys.length > 0 ? selectedRowKeys[0] : null
}

// 處理確認
const handleOk = () => {
  if (!selectedClientId.value) {
    return
  }
  emit('select', selectedClientId.value)
  handleCancel()
}

// 處理取消
const handleCancel = () => {
  selectedClientId.value = null
  searchKeyword.value = ''
  pagination.value.current = 1
  modalVisible.value = false
}

// 監聽 visible 變化，載入客戶列表
watch(() => props.visible, (visible) => {
  if (visible) {
    loadClients()
  }
})
</script>

