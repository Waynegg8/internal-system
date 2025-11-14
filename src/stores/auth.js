import { defineStore } from 'pinia'
import { useAuthApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null
  }),
  
  getters: {
    isAdmin: (state) => state.user?.isAdmin || state.user?.is_admin || false,
    userId: (state) => state.user?.id || state.user?.userId || state.user?.user_id || null,
    userName: (state) => state.user?.name || state.user?.username || ''
  },
  
  actions: {
    // 登入
    async login(username, password) {
      this.loading = true
      this.error = null
      try {
        const response = await useAuthApi().login(username, password)
        if (response.ok) {
          // 确保用户数据格式统一
          const userData = response.data || {}
          this.user = {
            ...userData,
            id: userData.id || userData.userId || userData.user_id,
            isAdmin: userData.isAdmin || userData.is_admin || false
          }
          this.isAuthenticated = true
          return { ok: true }
        } else {
          // API 返回 ok: false 的情況
          const errorMsg = response.message || '登入失敗，請稍後再試'
          this.error = errorMsg
          return { 
            ok: false, 
            message: errorMsg,
            code: response.code
          }
        }
      } catch (error) {
        // 處理未預期的錯誤
        const errorMsg = error.message || '網路或伺服器異常，請稍後再試'
        this.error = errorMsg
        return { ok: false, message: errorMsg }
      } finally {
        this.loading = false
      }
    },
    
    // 登出
    async logout() {
      try {
        await useAuthApi().logout()
      } catch (error) {
        // 即使登出失敗，也清除本地狀態
      } finally {
        this.user = null
        this.isAuthenticated = false
        this.error = null
      }
    },
    
    // 檢查 Session
    async checkSession() {
      try {
        const response = await useAuthApi().checkSession()
        if (response && response.ok) {
          // 确保用户数据格式统一
          const userData = response.data || {}
          this.user = {
            ...userData,
            id: userData.id || userData.userId || userData.user_id,
            isAdmin: userData.isAdmin || userData.is_admin || false
          }
          this.isAuthenticated = true
          return true
        }
      } catch (error) {
        // 靜默處理錯誤
      }
      this.user = null
      this.isAuthenticated = false
      return false
    },
    
    // 清除錯誤
    clearError() {
      this.error = null
    }
  }
})

