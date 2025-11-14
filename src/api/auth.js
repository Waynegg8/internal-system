import request from './request'

/**
 * 認證相關 API
 */
export function useAuthApi() {
  // 登入
  const login = async (username, password) => {
    try {
      const response = await request.post('/auth/login', {
        username,
        password
      })
      // API 返回格式：{ ok: true/false, data: ..., message: ..., code: ... }
      return response
    } catch (error) {
      // 處理 HTTP 錯誤（如 401, 403, 429 等）
      const errorResponse = error.response?.data || {}
      return {
        ok: false,
        message: errorResponse.message || error.message || '登入失敗，請稍後再試',
        code: errorResponse.code || error.response?.status === 429 ? 'TOO_MANY_REQUESTS' : null
      }
    }
  }

  // 檢查 Session / 獲取當前用戶（主要函數）
  const checkSession = async () => {
    try {
      const response = await request.get('/auth/me')
      // response已经是response.data，需要检查格式
      if (response && response.ok) {
        return { ok: true, data: response.data }
      }
      return { ok: false, data: null }
    } catch (error) {
      return { ok: false, data: null }
    }
  }

  // 別名，方便使用
  const fetchCurrentUser = checkSession
  const getCurrentUser = checkSession

  // 登出
  const logout = async () => {
    try {
      await request.post('/auth/logout')
    } catch (error) {
      // 即使登出失敗，也清除本地狀態
    }
  }

  // 修改密碼
  const changePassword = async (data) => {
    const response = await request.post('/auth/change-password', data)
    return response
  }

  // 獲取重定向目標（工具函數）
  const getRedirectTarget = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const redirect = urlParams.get('redirect')
    
    if (!redirect) return null
    
    // 驗證重定向路徑的安全性（防止開放重定向攻擊）
    if (redirect.startsWith('/') || redirect.startsWith(window.location.origin)) {
      return redirect
    }
    
    return null
  }

  // 權限檢查輔助函數
  const checkAdminPermission = async () => {
    const response = await checkSession()
    if (response.ok && response.data?.isAdmin) {
      return response.data
    }
    throw new Error('需要管理員權限')
  }

  return {
    login,
    checkSession,
    fetchCurrentUser,
    getCurrentUser,
    logout,
    changePassword,
    getRedirectTarget,
    checkAdminPermission
  }
}

// 導出常用函數供其他模組使用
export async function checkAdminPermission() {
  const { checkAdminPermission: check } = useAuthApi()
  return await check()
}

export async function checkSession() {
  const { checkSession: check } = useAuthApi()
  return await check()
}

