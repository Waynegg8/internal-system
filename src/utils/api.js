/**
 * API 工具函數
 */

// 獲取 API 基礎路徑
export function getApiBase() {
  const hostname = window.location.hostname

  // 新系統使用 v2 子域名，API 路徑為 /api/v2
  if (hostname.startsWith('v2.') || hostname === 'v2.horgoscpa.com' || hostname === 'v2.www.horgoscpa.com') {
    return '/api/v2'
  }

  // Pages 部署環境（horgoscpa-internal-v2.pages.dev）使用新的 API 端點
  if (hostname.includes('pages.dev') || hostname.includes('pages.cloudflare.com')) {
    return 'https://v2.horgoscpa.com/api/v2'
  }

  // 本地開發環境
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8787/api/v2'
  }

  // 原系統使用 /internal/api/v1
  const onProdHost = hostname.endsWith('horgoscpa.com')
  return onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1'
}

// 構建 API URL
export function buildApiUrl(endpoint) {
  const base = getApiBase()
  return `${base}${endpoint}`
}

// 統一錯誤處理
export function handleApiError(error) {
  if (error.response) {
    // 服務器響應錯誤
    return {
      status: error.response.status,
      message: error.response.data?.message || '請求失敗',
      data: error.response.data
    }
  } else if (error.request) {
    // 請求發送但無響應
    return {
      status: 0,
      message: '網絡錯誤，請檢查網絡連接',
      data: null
    }
  } else {
    // 其他錯誤
    return {
      status: -1,
      message: error.message || '未知錯誤',
      data: null
    }
  }
}

