/**
 * URL 處理工具
 */

// 獲取重定向目標（從 URL 參數）
export function getRedirectTarget() {
  const urlParams = new URLSearchParams(window.location.search)
  const redirect = urlParams.get('redirect')
  
  if (!redirect) return null
  
  // 驗證重定向路徑的安全性（防止開放重定向攻擊）
  if (redirect.startsWith('/') || redirect.startsWith(window.location.origin)) {
    return redirect
  }
  
  return null
}

// 構建 URL 參數
export function buildQueryString(params) {
  const query = new URLSearchParams()
  Object.keys(params).forEach(key => {
    if (params[key] != null) {
      query.append(key, params[key])
    }
  })
  return query.toString()
}

// 解析 URL 參數
export function parseQueryString(queryString) {
  const params = {}
  const query = new URLSearchParams(queryString)
  query.forEach((value, key) => {
    params[key] = value
  })
  return params
}

