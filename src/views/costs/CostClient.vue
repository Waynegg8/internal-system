<template>
  <div class="cost-client-content">
    <a-space direction="vertical" size="large" class="cost-client-stack">
      <EmployeeHourlySummaryCompact
        :employees="store.employeeCosts"
        :loading="employeeSummaryLoading"
        :head-style="compactHeadStyle"
        :body-style="compactBodyStyle"
      />

      <a-alert
        v-if="errorMessage || store.error"
        type="error"
        :message="errorMessage || store.error"
        show-icon
        closable
        @close="store.clearError()"
      />

      <a-card
        size="small"
        title="客戶任務成本分析"
        :head-style="compactHeadStyle"
        :body-style="compactBodyStyle"
      >
        <template #extra>
          <a-space :size="8" align="center" class="cost-client-controls" wrap>
            <a-date-picker
              v-model:value="selectedMonthValue"
              picker="month"
              format="YYYY-MM"
              placeholder="選擇月份"
              size="small"
              @change="handleMonthChange"
            />
            <a-radio-group
              v-model:value="viewType"
              @change="handleViewTypeChange"
              button-style="solid"
              size="small"
            >
              <a-radio-button value="client">按客戶</a-radio-button>
              <a-radio-button value="task">按任務</a-radio-button>
            </a-radio-group>
            <a-button size="small" @click="handleRefresh" :loading="store.loading">
              刷新
            </a-button>
          </a-space>
        </template>

        <a-space direction="vertical" size="small" style="width: 100%">
          <ClientCostsSummaryTable
            v-if="viewType === 'client'"
            :clients="store.clientCostsData"
            :loading="store.loading"
            @expand="handleClientExpand"
          />
          <TaskCostsTable
            v-else
            :tasks="store.taskCosts"
            :loading="store.loading"
            :service-items-map="serviceItemsMap"
          />
          <ClientCostsSummaryRow :summary="store.clientCostsSummary" />
        </a-space>
      </a-card>
    </a-space>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePageAlert } from '@/composables/usePageAlert'
import dayjs from 'dayjs'
import { useCostStore } from '@/stores/costs'
import { getCurrentYm } from '@/utils/formatters'
import ClientCostsSummaryTable from '@/components/costs/ClientCostsSummaryTable.vue'
import TaskCostsTable from '@/components/costs/TaskCostsTable.vue'
import ClientCostsSummaryRow from '@/components/costs/ClientCostsSummaryRow.vue'
import EmployeeHourlySummaryCompact from '@/components/costs/EmployeeHourlySummaryCompact.vue'

const store = useCostStore()
const { showError } = usePageAlert()

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

// 視圖類型
const viewType = ref('client')

// 服務項目映射表
const serviceItemsMap = ref(new Map())

// 員工成本載入指示
const employeeSummaryLoading = ref(false)

// 從 selectedMonth 解析年份和月份
const year = computed(() => {
  const [y] = selectedMonth.value.split('-')
  return parseInt(y, 10)
})

const month = computed(() => {
  const [, m] = selectedMonth.value.split('-')
  return parseInt(m, 10)
})

// 錯誤消息
const errorMessage = computed(() => {
  if (store.error) {
    // 檢查是否為 501 狀態碼
    if (store.error.includes('501') || store.error.includes('Not Implemented')) {
      return '功能尚未實作'
    }
    return '載入失敗'
  }
  return ''
})

// 構建服務項目映射表
const buildServiceItemsMap = () => {
  const map = new Map()
  store.serviceItems.forEach(item => {
    const serviceItemId = item.id || item.serviceItemId || item.service_item_id || item.serviceId || item.service_id
    if (serviceItemId) {
      map.set(serviceItemId, {
        serviceName: item.serviceName || item.service_name || item.name || '',
        serviceId: item.serviceId || item.service_id || serviceItemId
      })
    }
  })
  serviceItemsMap.value = map
}

// 載入服務項目
const loadServiceItems = async () => {
  try {
    await store.fetchServiceItems()
    buildServiceItemsMap()
  } catch (error) {
    console.error('載入服務項目失敗:', error)
    // 服務項目獲取失敗不影響主功能
  }
}

// 載入員工成本資料
const loadEmployeeCosts = async () => {
  employeeSummaryLoading.value = true
  try {
    await store.fetchEmployeeCosts(year.value, month.value)
  } catch (error) {
    console.error('載入員工成本失敗:', error)
    if (error.response && error.response.status === 501) {
      // ignore
    } else if (store.error && (store.error.includes('501') || store.error.includes('Not Implemented'))) {
      // ignore
    } else {
      showError('載入員工成本失敗：' + (error.message || '未知錯誤'))
    }
  } finally {
    employeeSummaryLoading.value = false
  }
}

// 載入客戶成本彙總數據
const loadClientCostsSummary = async () => {
  try {
    await store.fetchClientCostsSummary(year.value, month.value)
  } catch (error) {
    console.error('載入客戶成本彙總失敗:', error)
    // 檢查是否為 501 狀態碼
    if (error.response && error.response.status === 501) {
      // 不顯示 message，因為已經在 error alert 中顯示了
    } else if (store.error && (store.error.includes('501') || store.error.includes('Not Implemented'))) {
      // 不顯示 message，因為已經在 error alert 中顯示了
    } else {
      showError('載入客戶成本彙總失敗：' + (error.message || '未知錯誤'))
    }
  }
}

// 載入任務成本明細數據
const loadTaskCosts = async () => {
  try {
    await store.fetchTaskCosts(year.value, month.value)
  } catch (error) {
    console.error('載入任務成本明細失敗:', error)
    // 檢查是否為 501 狀態碼
    if (error.response && error.response.status === 501) {
      // 不顯示 message，因為已經在 error alert 中顯示了
    } else if (store.error && (store.error.includes('501') || store.error.includes('Not Implemented'))) {
      // 不顯示 message，因為已經在 error alert 中顯示了
    } else {
      showError('載入任務成本明細失敗：' + (error.message || '未知錯誤'))
    }
  }
}

// 根據視圖類型載入數據
const loadData = async () => {
  if (viewType.value === 'client') {
    await loadClientCostsSummary()
  } else {
    await loadTaskCosts()
  }
}

// 處理月份變化
const handleMonthChange = (date) => {
  if (date) {
    const monthStr = dayjs(date).format('YYYY-MM')
    selectedMonth.value = monthStr
    selectedMonthValue.value = dayjs(date)
    // 重新載入員工成本與當前視圖數據
    loadEmployeeCosts().finally(() => {
      loadData()
    })
  }
}

// 處理視圖類型變化
const handleViewTypeChange = () => {
  // 根據新的視圖類型載入對應數據
  loadData()
}

// 處理刷新
const handleRefresh = () => {
  // 根據當前視圖類型重新載入對應數據
  loadData()
}

// 處理客戶展開
const handleClientExpand = (clientId) => {
  // 如果需要，可以在這裡處理展開邏輯
  console.log('展開客戶:', clientId)
}

// 初始化
onMounted(async () => {
  // 並行載入服務項目列表和客戶成本彙總數據
  await Promise.all([
    loadServiceItems(),
    loadEmployeeCosts(),
    loadClientCostsSummary()
  ])
})
</script>

<style scoped>
.cost-client-content {
  padding: 16px;
}

.cost-client-stack {
  width: 100%;
}

.cost-client-controls {
  justify-content: flex-end;
}

@media (max-width: 991px) {
  .cost-client-content {
    padding: 12px;
  }

  .cost-client-controls {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
