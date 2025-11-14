import { defineStore } from 'pinia'
import { useTripApi } from '@/api/trips'
import { extractApiArray, extractApiObject } from '@/utils/apiHelpers'

export const useTripStore = defineStore('trips', {
  state: () => ({
    trips: [],
    tripsSummary: null,
    users: [],
    clients: [],
    loading: false,
    error: null
  }),
  
  actions: {
    // 獲取外出登記列表
    async getTrips(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await useTripApi().getTrips(params)
        // 處理多種 API 響應格式
        this.trips = extractApiArray(response, [])
        return response
      } catch (error) {
        this.error = error.message || '獲取外出登記列表失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取外出登記摘要
    async getTripsSummary(params = {}) {
      try {
        const response = await useTripApi().getTripsSummary(params)
        // 處理多種 API 響應格式
        const data = extractApiObject(response, null)
        this.tripsSummary = data || (response.trip_count !== undefined ? response : null)
        return response
      } catch (error) {
        this.error = error.message || '獲取外出登記摘要失敗'
        throw error
      }
    },
    
    // 獲取用戶列表（管理員用）
    async fetchUsers() {
      try {
        const response = await useTripApi().getUsers()
        // 處理多種 API 響應格式
        this.users = extractApiArray(response, [])
        return response
      } catch (error) {
        this.error = error.message || '獲取用戶列表失敗'
        throw error
      }
    },
    
    // 獲取客戶列表
    async fetchClients() {
      try {
        const response = await useTripApi().getClients()
        // 處理多種 API 響應格式
        this.clients = extractApiArray(response, [])
        return response
      } catch (error) {
        this.error = error.message || '獲取客戶列表失敗'
        throw error
      }
    },
    
    // 創建外出登記
    async createTrip(data) {
      this.loading = true
      this.error = null
      try {
        const response = await useTripApi().createTrip(data)
        return response
      } catch (error) {
        this.error = error.message || '創建外出登記失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新外出登記
    async updateTrip(tripId, data) {
      this.loading = true
      this.error = null
      try {
        const response = await useTripApi().updateTrip(tripId, data)
        return response
      } catch (error) {
        this.error = error.message || '更新外出登記失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除外出登記
    async deleteTrip(tripId) {
      this.loading = true
      this.error = null
      try {
        const response = await useTripApi().deleteTrip(tripId)
        // 從列表中移除已刪除的項目
        this.trips = this.trips.filter(trip => {
          const id = trip.trip_id || trip.tripId || trip.id
          return id !== tripId
        })
        return response
      } catch (error) {
        this.error = error.message || '刪除外出登記失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 清除錯誤狀態
    clearError() {
      this.error = null
    }
  }
})

