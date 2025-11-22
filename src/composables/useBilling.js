import { ref, computed, watch } from 'vue'
import {
  fetchBillingPlans,
  createBillingPlan,
  updateBillingPlan,
  deleteBillingPlan,
  fetchAccruedRevenue
} from '@/api/billing'
import { extractApiData, extractApiArray } from '@/utils/apiHelpers'

/**
 * 收費管理 Composable
 * 提供統一的收費計劃和應計收入管理介面
 * 
 * @param {Object} options - 配置選項
 * @param {string|Ref<string>} options.clientId - 客戶 ID
 * @param {number|Ref<number>} options.year - 年度
 * @param {boolean} options.autoLoad - 是否自動載入（預設：true）
 * @param {boolean} options.autoCreate - 是否自動建立年度計劃（預設：true）
 * @returns {Object} 收費管理相關的狀態和方法
 */
export function useBilling(options = {}) {
  const {
    clientId: clientIdOption,
    year: yearOption,
    autoLoad = true,
    autoCreate = true
  } = options

  // ========== 響應式狀態 ==========
  
  // 客戶 ID 和年度（支援 ref 或普通值）
  const clientId = computed(() => {
    return typeof clientIdOption === 'object' && clientIdOption?.value !== undefined
      ? clientIdOption.value
      : clientIdOption
  })
  
  const year = computed(() => {
    return typeof yearOption === 'object' && yearOption?.value !== undefined
      ? yearOption.value
      : yearOption
  })

  // 收費計劃狀態
  const billingPlans = ref([])
  const billingStatus = ref(null)
  const isLoadingPlans = ref(false)
  const plansError = ref(null)

  // 應計收入狀態
  const accruedRevenue = ref(null)
  const isLoadingRevenue = ref(false)
  const revenueError = ref(null)

  // 操作狀態
  const isCreating = ref(false)
  const isUpdating = ref(false)
  const isDeleting = ref(false)

  // 快取控制
  const lastFetchTime = ref(null)
  const cacheTimeout = 5 * 60 * 1000 // 5 分鐘快取

  // ========== 計算屬性 ==========

  /**
   * 定期服務收費計劃
   */
  const recurringPlans = computed(() => {
    return billingPlans.value.filter(plan => plan.billingType === 'recurring')
  })

  /**
   * 一次性服務收費計劃
   */
  const oneTimePlans = computed(() => {
    return billingPlans.value.filter(plan => plan.billingType === 'one-time')
  })

  /**
   * 年度總計
   */
  const yearTotal = computed(() => {
    return billingPlans.value.reduce((sum, plan) => sum + (plan.yearTotal || 0), 0)
  })

  /**
   * 定期服務總計
   */
  const recurringTotal = computed(() => {
    return recurringPlans.value.reduce((sum, plan) => sum + (plan.yearTotal || 0), 0)
  })

  /**
   * 一次性服務總計
   */
  const oneTimeTotal = computed(() => {
    return oneTimePlans.value.reduce((sum, plan) => sum + (plan.yearTotal || 0), 0)
  })

  /**
   * 是否可以自動建立年度計劃
   */
  const canAutoCreate = computed(() => {
    return billingStatus.value?.canAutoCreate === true
  })

  /**
   * 是否有定期服務計劃
   */
  const hasRecurringPlan = computed(() => {
    return billingStatus.value?.hasRecurringPlan === true
  })

  /**
   * 是否有一性服務計劃
   */
  const hasOneTimePlans = computed(() => {
    return billingStatus.value?.hasOneTimePlans === true
  })

  /**
   * 是否需要重新載入（快取過期）
   */
  const needsRefresh = computed(() => {
    if (!lastFetchTime.value) return true
    return Date.now() - lastFetchTime.value > cacheTimeout
  })

  // ========== 核心方法 ==========

  /**
   * 載入收費計劃列表
   * @param {Object} options - 載入選項
   * @param {string} options.billingType - 收費類型篩選（'recurring' | 'one-time' | null）
   * @param {boolean} options.forceRefresh - 強制重新載入（忽略快取）
   * @param {boolean} options.silent - 靜默載入（不顯示錯誤）
   * @returns {Promise<Array>} 收費計劃列表
   */
  const loadBillingPlans = async (options = {}) => {
    const {
      billingType = null,
      forceRefresh = false,
      silent = false
    } = options

    if (!clientId.value || !year.value) {
      billingPlans.value = []
      billingStatus.value = null
      return []
    }

    // 檢查快取
    if (!forceRefresh && !needsRefresh.value && billingPlans.value.length > 0) {
      return billingPlans.value
    }

    isLoadingPlans.value = true
    plansError.value = null

    try {
      const response = await fetchBillingPlans(
        clientId.value,
        year.value,
        billingType
      )

      const data = extractApiData(response, {})
      billingPlans.value = data.plans || []
      billingStatus.value = data.status || null
      lastFetchTime.value = Date.now()

      // 自動建立年度計劃（如果需要）
      if (autoCreate && canAutoCreate.value && !hasRecurringPlan.value) {
        await autoCreateAnnualPlans({ silent: true })
      }

      return billingPlans.value
    } catch (error) {
      console.error('[useBilling] 載入收費計劃失敗:', error)
      plansError.value = error
      billingPlans.value = []
      billingStatus.value = null

      if (!silent) {
        throw error
      }

      return []
    } finally {
      isLoadingPlans.value = false
    }
  }

  /**
   * 自動建立年度收費計劃
   * @param {Object} options - 選項
   * @param {boolean} options.silent - 靜默建立（不顯示錯誤）
   * @returns {Promise<boolean>} 是否成功建立
   */
  const autoCreateAnnualPlans = async (options = {}) => {
    const { silent = false } = options

    if (!clientId.value || !year.value) {
      return false
    }

    if (!canAutoCreate.value) {
      return false
    }

    try {
      // 觸發自動建立：重新載入計劃（後端會自動建立）
      await loadBillingPlans({ forceRefresh: true, silent: true })
      return true
    } catch (error) {
      console.error('[useBilling] 自動建立年度計劃失敗:', error)
      if (!silent) {
        throw error
      }
      return false
    }
  }

  /**
   * 建立收費計劃
   * @param {Object} planData - 收費計劃資料
   * @param {Object} options - 選項
   * @param {boolean} options.refresh - 建立後是否重新載入列表（預設：true）
   * @returns {Promise<Object>} 建立的收費計劃
   */
  const createPlan = async (planData, options = {}) => {
    const { refresh = true } = options

    if (!clientId.value || !year.value) {
      throw new Error('客戶 ID 和年度不能為空')
    }

    isCreating.value = true
    plansError.value = null

    try {
      const response = await createBillingPlan(clientId.value, {
        ...planData,
        billingYear: year.value
      })

      const newPlan = extractApiData(response, {})

      // 更新本地狀態
      if (refresh) {
        await loadBillingPlans({ forceRefresh: true, silent: true })
      } else {
        billingPlans.value.push(newPlan)
      }

      // 清除應計收入快取
      clearRevenueCache()

      return newPlan
    } catch (error) {
      console.error('[useBilling] 建立收費計劃失敗:', error)
      plansError.value = error
      throw error
    } finally {
      isCreating.value = false
    }
  }

  /**
   * 更新收費計劃
   * @param {number} planId - 收費計劃 ID
   * @param {Object} planData - 更新資料
   * @param {Object} options - 選項
   * @param {boolean} options.refresh - 更新後是否重新載入列表（預設：true）
   * @returns {Promise<Object>} 更新後的收費計劃
   */
  const updatePlan = async (planId, planData, options = {}) => {
    const { refresh = true } = options

    if (!clientId.value) {
      throw new Error('客戶 ID 不能為空')
    }

    isUpdating.value = true
    plansError.value = null

    try {
      const response = await updateBillingPlan(clientId.value, planId, planData)
      const updatedPlan = extractApiData(response, {})

      // 更新本地狀態
      if (refresh) {
        await loadBillingPlans({ forceRefresh: true, silent: true })
      } else {
        const index = billingPlans.value.findIndex(p => p.billingPlanId === planId)
        if (index >= 0) {
          billingPlans.value[index] = updatedPlan
        }
      }

      // 清除應計收入快取
      clearRevenueCache()

      return updatedPlan
    } catch (error) {
      console.error('[useBilling] 更新收費計劃失敗:', error)
      plansError.value = error
      throw error
    } finally {
      isUpdating.value = false
    }
  }

  /**
   * 刪除收費計劃
   * @param {number|Array<number>} planIds - 收費計劃 ID 或 ID 陣列
   * @param {Object} options - 選項
   * @param {boolean} options.refresh - 刪除後是否重新載入列表（預設：true）
   * @returns {Promise<Object>} 刪除結果
   */
  const deletePlan = async (planIds, options = {}) => {
    const { refresh = true } = options

    if (!clientId.value) {
      throw new Error('客戶 ID 不能為空')
    }

    isDeleting.value = true
    plansError.value = null

    try {
      const response = await deleteBillingPlan(clientId.value, planIds)
      const result = extractApiData(response, {})

      // 更新本地狀態
      if (refresh) {
        await loadBillingPlans({ forceRefresh: true, silent: true })
      } else {
        const ids = Array.isArray(planIds) ? planIds : [planIds]
        billingPlans.value = billingPlans.value.filter(
          p => !ids.includes(p.billingPlanId)
        )
      }

      // 清除應計收入快取
      clearRevenueCache()

      return result
    } catch (error) {
      console.error('[useBilling] 刪除收費計劃失敗:', error)
      plansError.value = error
      throw error
    } finally {
      isDeleting.value = false
    }
  }

  /**
   * 載入應計收入
   * @param {Object} options - 載入選項
   * @param {number} options.month - 月份（可選）
   * @param {boolean} options.validate - 是否驗證計算準確性
   * @param {boolean} options.forceRefresh - 強制重新載入（忽略快取）
   * @param {boolean} options.silent - 靜默載入（不顯示錯誤）
   * @returns {Promise<Object>} 應計收入資料
   */
  const loadAccruedRevenue = async (options = {}) => {
    const {
      month = null,
      validate = false,
      forceRefresh = false,
      silent = false
    } = options

    if (!clientId.value || !year.value) {
      accruedRevenue.value = null
      return null
    }

    // 檢查快取（簡單的快取策略）
    if (!forceRefresh && accruedRevenue.value && !needsRefresh.value) {
      return accruedRevenue.value
    }

    isLoadingRevenue.value = true
    revenueError.value = null

    try {
      const response = await fetchAccruedRevenue(
        clientId.value,
        year.value,
        month,
        validate
      )

      const data = extractApiData(response, {})
      accruedRevenue.value = data
      lastFetchTime.value = Date.now()

      return data
    } catch (error) {
      console.error('[useBilling] 載入應計收入失敗:', error)
      revenueError.value = error
      accruedRevenue.value = null

      if (!silent) {
        throw error
      }

      return null
    } finally {
      isLoadingRevenue.value = false
    }
  }

  /**
   * 清除應計收入快取
   */
  const clearRevenueCache = () => {
    accruedRevenue.value = null
    lastFetchTime.value = null
  }

  /**
   * 清除所有快取
   */
  const clearCache = () => {
    billingPlans.value = []
    billingStatus.value = null
    accruedRevenue.value = null
    lastFetchTime.value = null
    plansError.value = null
    revenueError.value = null
  }

  /**
   * 重新載入所有資料
   * @param {Object} options - 選項
   * @returns {Promise<void>}
   */
  const refresh = async (options = {}) => {
    await Promise.all([
      loadBillingPlans({ ...options, forceRefresh: true }),
      loadAccruedRevenue({ ...options, forceRefresh: true })
    ])
  }

  // ========== 自動載入 ==========

  // 監聽客戶 ID 和年度變化，自動載入
  if (autoLoad) {
    watch(
      [clientId, year],
      ([newClientId, newYear], [oldClientId, oldYear]) => {
        // 只有在客戶 ID 或年度真正改變時才載入
        if (newClientId && newYear && (newClientId !== oldClientId || newYear !== oldYear)) {
          loadBillingPlans({ silent: true })
        }
      },
      { immediate: true }
    )
  }

  // ========== 返回介面 ==========

  return {
    // 狀態
    billingPlans,
    billingStatus,
    accruedRevenue,
    isLoadingPlans,
    isLoadingRevenue,
    isCreating,
    isUpdating,
    isDeleting,
    plansError,
    revenueError,

    // 計算屬性
    recurringPlans,
    oneTimePlans,
    yearTotal,
    recurringTotal,
    oneTimeTotal,
    canAutoCreate,
    hasRecurringPlan,
    hasOneTimePlans,
    needsRefresh,

    // 方法
    loadBillingPlans,
    autoCreateAnnualPlans,
    createPlan,
    updatePlan,
    deletePlan,
    loadAccruedRevenue,
    clearRevenueCache,
    clearCache,
    refresh
  }
}



