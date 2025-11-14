import { defineStore } from 'pinia'
import {
  fetchLeaveBalances,
  fetchLeaves,
  createLeave,
  updateLeave,
  deleteLeave,
  fetchLifeEvents,
  createLifeEvent,
  deleteLifeEvent,
  recalculateLeaveBalances
} from '@/api/leaves'
import { useAuthStore } from '@/stores/auth'

export const useLeavesStore = defineStore('leaves', {
  state: () => ({
    balances: [],
    leaves: [],
    lifeEvents: [],
    filters: {
      year: null,
      month: null,
      type: null,
      userId: null
    },
    loading: false,
    error: null
  }),

  getters: {
    /**
     * 是否為管理員
     */
    isAdmin() {
      const authStore = useAuthStore()
      return authStore.isAdmin
    },

    /**
     * 當前用戶
     */
    currentUser() {
      const authStore = useAuthStore()
      return authStore.user
    }
  },

  actions: {
    /**
     * 獲取假期餘額
     * @param {number} year - 年份
     * @param {number|null} userId - 用戶ID（可選）
     */
    async fetchBalances(year, userId = null) {
      this.loading = true
      this.error = null
      try {
        const data = await fetchLeaveBalances(year, userId)
        this.balances = Array.isArray(data) ? data : []
        return this.balances
      } catch (error) {
        this.error = error.message || '獲取假期餘額失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 獲取假期記錄列表
     * @param {Object} params - 查詢參數（可選）
     */
    async fetchLeaves(params = {}) {
      this.loading = true
      this.error = null
      try {
        const queryParams = {
          page: params.page || 1,
          perPage: params.perPage || 1000,
          ...this.filters,
          ...params
        }
        // 移除 null 值
        Object.keys(queryParams).forEach(key => {
          if (queryParams[key] === null || queryParams[key] === undefined) {
            delete queryParams[key]
          }
        })
        const result = await fetchLeaves(queryParams)
        this.leaves = Array.isArray(result.items) ? result.items : []
        return result
      } catch (error) {
        this.error = error.message || '獲取假期記錄失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 創建假期申請
     * @param {Object} payload - 假期申請數據
     */
    async createLeave(payload) {
      this.loading = true
      this.error = null
      try {
        const result = await createLeave(payload)
        // 創建成功後重新載入列表
        await this.fetchLeaves()
        await this.fetchBalances(this.filters.year || new Date().getFullYear())
        return result
      } catch (error) {
        this.error = error.message || '創建假期申請失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 更新假期申請
     * @param {number} leaveId - 假期ID
     * @param {Object} payload - 假期申請數據
     */
    async updateLeave(leaveId, payload) {
      this.loading = true
      this.error = null
      try {
        const result = await updateLeave(leaveId, payload)
        // 更新成功後重新載入列表
        await this.fetchLeaves()
        await this.fetchBalances(this.filters.year || new Date().getFullYear())
        return result
      } catch (error) {
        this.error = error.message || '更新假期申請失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 刪除假期申請
     * @param {number} leaveId - 假期ID
     */
    async deleteLeave(leaveId) {
      this.loading = true
      this.error = null
      try {
        await deleteLeave(leaveId)
        // 刪除成功後重新載入列表
        await this.fetchLeaves()
        await this.fetchBalances(this.filters.year || new Date().getFullYear())
      } catch (error) {
        this.error = error.message || '刪除假期申請失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 獲取生活事件列表
     * @param {number|null} userId - 用戶ID（可選）
     */
    async fetchLifeEvents(userId = null) {
      this.loading = true
      this.error = null
      try {
        const data = await fetchLifeEvents(userId)
        this.lifeEvents = Array.isArray(data) ? data : []
        return this.lifeEvents
      } catch (error) {
        this.error = error.message || '獲取生活事件失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 登記生活事件
     * @param {Object} payload - 生活事件數據
     */
    async createLifeEvent(payload) {
      this.loading = true
      this.error = null
      try {
        const result = await createLifeEvent(payload)
        // 創建成功後重新載入列表和餘額
        await this.fetchLifeEvents(this.filters.userId || null)
        await this.fetchBalances(this.filters.year || new Date().getFullYear())
        return result
      } catch (error) {
        this.error = error.message || '登記生活事件失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 刪除生活事件
     * @param {number} eventId - 生活事件ID
     */
    async deleteLifeEvent(eventId) {
      this.loading = true
      this.error = null
      try {
        // 獲取要刪除的事件，以便知道影響的用戶
        const event = this.lifeEvents.find(e => (e.eventId || e.event_id || e.id) === eventId)
        const affectedUserId = event ? (event.userId || event.user_id) : (this.filters.userId || null)
        
        await deleteLifeEvent(eventId)
        
        // 刪除成功後重新計算假期餘額（收回給予的假期）
        if (affectedUserId) {
          await recalculateLeaveBalances(affectedUserId)
        }
        
        // 重新載入列表和餘額
        await this.fetchLifeEvents(this.filters.userId || null)
        await this.fetchBalances(this.filters.year || new Date().getFullYear())
      } catch (error) {
        this.error = error.message || '刪除生活事件失敗'
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * 設置篩選條件
     * @param {Object} filters - 篩選條件
     */
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },

    /**
     * 清除錯誤
     */
    clearError() {
      this.error = null
    }
  }
})

