import { calculateOverdueDays } from './date'

/**
 * 數據格式化工具
 * 注意: 此檔案包含所有數據格式化相關的工具函數。如需使用日期相關的格式化函數，請從 date.js 導入。
 */

// 格式化本地日期（例如：2024-01-15）
export function formatLocalDate(date) {
  if (!date) return ''
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (_) {
    return ''
  }
}

// 格式化年月顯示（例如：2024-01 → "2024年1月"）
export function formatYm(ym) {
  if (!ym) return ''
  try {
    const [y, m] = ym.split('-')
    if (!y || !m) return ym
    return `${y}年${parseInt(m)}月`
  } catch (_) {
    return ym
  }
}

// 獲取當前年月（格式：YYYY-MM）
export function getCurrentYm() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// 年月加減（例如：addMonth("2024-01", 1) → "2024-02"）
export function addMonth(ym, delta) {
  if (!ym) return getCurrentYm()
  try {
    const [y, m] = ym.split('-').map(Number)
    if (isNaN(y) || isNaN(m)) return getCurrentYm()
    const d = new Date(y, m - 1 + delta, 1)
    const newY = d.getFullYear()
    const newM = String(d.getMonth() + 1).padStart(2, '0')
    return `${newY}-${newM}`
  } catch (_) {
    return getCurrentYm()
  }
}

// 格式化貨幣（台幣，無$符號，有千分位逗號，0顯示為-）
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '—'
  const num = Number(amount)
  if (!Number.isFinite(num)) return '—'
  if (Math.abs(num) < 0.5) return '—'
  const rounded = Math.round(num)
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(rounded)
}

// 別名：fmtTwd（用於向後兼容）
export const fmtTwd = formatCurrency

// 格式化數字（有千分位逗號，0顯示為-，無小數點）
export function formatNumber(n) {
  if (n == null || isNaN(n)) return '—'
  const num = Number(n)
  if (!Number.isFinite(num)) return '—'
  if (Math.abs(num) < 0.5) return '—'
  const rounded = Math.round(num)
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(rounded)
}

// 格式化時數（保留1位小數，但0顯示為-）
export function formatHours(hours) {
  if (hours == null || isNaN(hours)) return '—'
  const num = Number(hours)
  if (!Number.isFinite(num)) return '—'
  if (Math.abs(num) < 0.0001) return '—'
  // 如果是整數，不顯示小數點
  if (Number.isInteger(num)) {
    return new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }
  // 有小數時，保留 2 位小數
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)
}

// 別名：fmtNum（用於向後兼容）
export const fmtNum = formatNumber

// 格式化百分比
export function formatPercentage(n) {
  if (n == null) return '0%'
  return `${(n * 100).toFixed(1)}%`
}

// 別名：fmtPct, formatPercent（用於向後兼容）
export const fmtPct = formatPercentage
export const formatPercent = formatPercentage

// 格式化文件大小
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化日期時間
export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// 格式化日期時間（用於歷史記錄等場景）
export function formatDateTimeForHistory(dt) {
  if (!dt) return ''
  const date = new Date(dt)
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

// 格式化日期
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

// 格式化日期顯示（用於工時表等場景）
export function formatDateDisplay(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit'
  })
}

// 格式化客戶標籤
export function formatClientTags(tags) {
  if (!tags || !Array.isArray(tags)) return []
  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    color: tag.color || 'blue'
  }))
}

// 格式化收據狀態
export function formatReceiptStatus(status, dueDate) {
  const statusMap = {
    'draft': '草稿',
    'issued': '已開立',
    'paid': '已收款',
    'overdue': '逾期',
    'cancelled': '已作廢'
  }
  
  if (status === 'issued' && dueDate) {
    const days = calculateOverdueDays(dueDate)
    if (days > 0) {
      return `逾期 ${days} 天`
    }
  }
  
  return statusMap[status] || status
}

// 格式化收據類型
export function formatReceiptType(type) {
  const typeMap = {
    'invoice': '請款單',
    'receipt': '收據'
  }
  return typeMap[type] || type
}

// 格式化收款方式
export function formatPaymentMethod(method) {
  const methodMap = {
    'cash': '現金',
    'transfer': '轉帳',
    'check': '支票'
  }
  return methodMap[method] || method
}

// 將分（cents）轉換為台幣顯示格式
export function centsToTwd(cents) {
  return formatCurrency(cents / 100)
}

// 獲取知識庫分類文字
export function getCategoryText(category) {
  const categoryMap = {
    'sop': 'SOP',
    'faq': 'FAQ',
    'resource': '資源',
    'attachment': '附件',
    'document': '文檔'
  }
  return categoryMap[category] || category
}

// 獲取任務狀態的中文描述
export function getTaskStatusText(status) {
  const statusMap = {
    'pending': '待處理',
    'in_progress': '進行中',
    'completed': '已完成',
    'cancelled': '已取消',
    'blocked': '受阻礙'
  }
  return statusMap[status] || status
}

// 獲取任務來源的中文描述
export function getTaskSourceText(source) {
  const sourceMap = {
    'manual': '手動創建',
    'template': '模板生成',
    'automation': '自動生成'
  }
  return sourceMap[source] || source
}

// 獲取任務到期狀態的中文描述
export function getTaskDueDateStatusText(status) {
  const statusMap = {
    'on_time': '準時',
    'overdue': '逾期',
    'upcoming': '即將到期'
  }
  return statusMap[status] || status
}

// 格式化統一編號顯示（10碼格式，企業客戶去掉前綴00顯示8碼）
export function formatTaxRegistrationNumber(taxId) {
  if (!taxId) return ''
  const str = String(taxId).trim()
  // 如果是10碼且以00開頭，去掉前綴00顯示8碼
  if (str.length === 10 && str.startsWith('00')) {
    return str.substring(2)
  }
  return str
}

