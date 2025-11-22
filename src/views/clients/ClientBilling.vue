<template>
  <a-card title="收費設定">
    <!-- 頁面提示 -->
    <PageAlerts
      v-model:success="successMessage"
      v-model:error="errorMessage"
      v-model:warning="warningMessage"
    />
    
    <!-- 頂部操作區：年度選擇器 -->
    <template #extra>
      <BillingYearSelector
        :client-id="clientId"
        v-model="selectedYear"
        @change="handleYearChange"
        @status-change="handleStatusChange"
        ref="yearSelectorRef"
      />
    </template>

    <!-- 分頁內容 -->
    <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
      <!-- 收費計劃分頁 -->
      <a-tab-pane key="plans" tab="收費計劃">
        <BillingPlanList
          :plans="billingPlans"
          :loading="isLoading"
          :billing-type-filter="billingTypeFilter"
          :show-actions="true"
          :show-statistics="true"
          :enable-pagination="true"
          @edit="showEditModal"
          @delete="handleDelete"
          @batch-delete="handleBatchDelete"
          @add="showAddModal"
          @filter-change="handleFilterChange"
        />
      </a-tab-pane>

      <!-- 應計收入分頁 -->
      <a-tab-pane key="revenue" tab="應計收入">
        <AccruedRevenueDisplay
          :client-id="clientId"
          :year="selectedYear"
          :loading="isLoadingRevenue"
        />
      </a-tab-pane>
    </a-tabs>

    <!-- 新增/編輯收費計劃 Modal -->
    <BillingPlanFormModal
      v-model:open="isModalVisible"
      :client-id="clientId"
      :year="selectedYear"
      :plan="editingPlan"
      :is-editing="isEditing"
      @success="handlePlanSuccess"
      @error="handlePlanError"
    />
  </a-card>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePageAlert } from '@/composables/usePageAlert'
import { PlusOutlined } from '@ant-design/icons-vue'
import { useClientStore } from '@/stores/clients'
import { extractApiArray, extractApiData } from '@/utils/apiHelpers'
import {
  fetchBillingPlans,
  deleteBillingPlan
} from '@/api/billing'
import { formatCurrency } from '@/utils/formatters'
import PageAlerts from '@/components/shared/PageAlerts.vue'
import BillingYearSelector from '@/components/clients/BillingYearSelector.vue'
import AccruedRevenueDisplay from '@/components/clients/AccruedRevenueDisplay.vue'
import BillingPlanFormModal from '@/components/clients/BillingPlanFormModal.vue'
import BillingPlanList from '@/components/clients/BillingPlanList.vue'

const route = useRoute()
const clientStore = useClientStore()
const { successMessage, errorMessage, warningMessage, showSuccess, showError, showWarning } = usePageAlert()

// 從 store 獲取響應式狀態
const { currentClient } = storeToRefs(clientStore)

// 客戶 ID
const clientId = computed(() => {
  return route.params.id || currentClient.value?.clientId || currentClient.value?.client_id
})

// 年度選擇
const selectedYear = ref(new Date().getFullYear())
const yearSelectorRef = ref(null)

// 分頁
const activeTab = ref('plans')

// 收費類型篩選
const billingTypeFilter = ref('')

// 收費計劃列表
const billingPlans = ref([])
const isLoading = ref(false)
const isLoadingRevenue = ref(false)

// Modal 狀態
const isModalVisible = ref(false)
const isEditing = ref(false)
const editingPlan = ref(null)

// 年度狀態
const billingStatus = ref(null)

// 載入收費計劃
const loadBillingPlans = async () => {
  if (!clientId.value || !selectedYear.value) {
    billingPlans.value = []
    return
  }

  isLoading.value = true
  try {
    const response = await fetchBillingPlans(
      clientId.value,
      selectedYear.value,
      billingTypeFilter.value || null
    )
    
    const data = extractApiData(response, {})
    billingPlans.value = data.plans || []
    
    // 更新狀態
    if (data.status) {
      billingStatus.value = data.status
    }
  } catch (error) {
    console.error('載入收費計劃失敗:', error)
    
    // 檢查是否為表不存在的錯誤
    const errorMessage = error?.message || error?.response?.data?.message || String(error)
    const errorCode = error?.response?.data?.code
    
    if (errorCode === 'SERVICE_UNAVAILABLE' || errorMessage.includes('尚未初始化') || errorMessage.includes('資料庫遷移')) {
      showWarning('收費計劃功能尚未初始化，請聯繫管理員執行資料庫遷移')
    } else if (errorMessage.includes('no such table') && errorMessage.includes('BillingPlans')) {
      showWarning('收費計劃功能尚未初始化，請聯繫管理員執行資料庫遷移')
    } else {
      showError('載入收費計劃失敗，請稍後再試')
    }
    
    billingPlans.value = []
  } finally {
    isLoading.value = false
  }
}

// 年度變化處理
const handleYearChange = (year) => {
  selectedYear.value = year
  loadBillingPlans()
}

// 篩選變化處理
const handleFilterChange = (value) => {
  billingTypeFilter.value = value
  // 不需要重新載入，組件內部會處理篩選
}

// 狀態變化處理
const handleStatusChange = (status) => {
  billingStatus.value = status
}

// 分頁變化處理
const handleTabChange = (key) => {
  activeTab.value = key
  if (key === 'revenue') {
    isLoadingRevenue.value = true
    // AccruedRevenueDisplay 組件會自動載入
    setTimeout(() => {
      isLoadingRevenue.value = false
    }, 100)
  }
}

// 顯示新增 Modal
const showAddModal = () => {
  isEditing.value = false
  editingPlan.value = null
  isModalVisible.value = true
}

// 顯示編輯 Modal
const showEditModal = (plan) => {
  isEditing.value = true
  editingPlan.value = plan
  isModalVisible.value = true
}

// 計劃操作成功處理
const handlePlanSuccess = () => {
  showSuccess('收費計劃操作成功')
  loadBillingPlans()
  yearSelectorRef.value?.refresh()
}

// 計劃操作錯誤處理
const handlePlanError = (error) => {
  console.error('收費計劃操作失敗:', error)
  showError(error.message || '操作失敗，請稍後再試')
}

// 刪除收費計劃
const handleDelete = async (planId) => {
  try {
    await deleteBillingPlan(clientId.value, planId)
    showSuccess('收費計劃已刪除')
    await loadBillingPlans()
    yearSelectorRef.value?.refresh()
  } catch (error) {
    console.error('刪除收費計劃失敗:', error)
    showError(error.message || '刪除失敗，請稍後再試')
  }
}

// 批量刪除
const handleBatchDelete = async (planIds) => {
  if (!planIds || planIds.length === 0) {
    showWarning('請至少選擇一筆收費計劃')
    return
  }

  try {
    const result = await deleteBillingPlan(clientId.value, planIds)
    const data = extractApiData(result, {})
    showSuccess(`已刪除 ${data.deleted || planIds.length} 筆收費計劃`)

    // 刷新列表
    await loadBillingPlans()
    yearSelectorRef.value?.refresh()
  } catch (error) {
    console.error('批量刪除失敗:', error)
    showError('批量刪除失敗，請稍後再試')
  }
}


// 初始化
onMounted(() => {
  if (clientId.value && selectedYear.value) {
    loadBillingPlans()
  }
})

// 監聽客戶 ID 變化
watch(clientId, (newId) => {
  if (newId && selectedYear.value) {
    loadBillingPlans()
  }
})
</script>

<style scoped>
/* 可以添加自定義樣式 */
</style>
