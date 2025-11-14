import { formatCurrency } from './formatters'

/**
 * 薪資計算工具
 */

// 自動生成薪資項目代碼
export function generateItemCode() {
  // 生成基於時間戳的代碼，格式：ITEM_YYYYMMDDHHMMSS
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `ITEM_${year}${month}${day}${hours}${minutes}${seconds}`
}

// 獲取薪資項目類別標籤（帶圖標）
export function getCategoryLabel(category) {
  const categoryMap = {
    'regular_allowance': '加給',
    'irregular_allowance': '津貼',
    'bonus': '月度獎金',
    'year_end_bonus': '年終獎金',
    'deduction': '扣款',
    // 向下兼容舊數據
    'allowance': '津貼（舊）',
    'subsidy': '津貼（舊）'
  }
  return categoryMap[category] || category
}

// 獲取薪資項目類別顏色
export function getCategoryColor(category) {
  const colorMap = {
    'regular_allowance': 'blue',
    'irregular_allowance': 'green',
    'bonus': 'orange',
    'year_end_bonus': 'gold',
    'deduction': 'red',
    // 向下兼容舊數據
    'allowance': 'green',
    'subsidy': 'green'
  }
  return colorMap[category] || 'default'
}

// 計算時薪
export function calculateHourlyRate(baseSalaryCents, divisor = 240) {
  if (!baseSalaryCents || baseSalaryCents === 0) return 0
  if (!divisor || divisor === 0) return 0
  return baseSalaryCents / divisor
}

// 將分轉換為台幣顯示（無條件捨去，使用 toLocaleString，0顯示為-）
export function centsToTwd(cents) {
  if (cents == null || cents === 0) return '-'
  const amount = Math.floor(Number(cents) / 100)
  if (amount === 0) return '-'
  return amount.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

// 格式化月份為民國年格式（例如：2024-01 → 113年1月）
export function formatMonthToROC(month) {
  if (!month) return ''
  const [year, monthNum] = month.split('-')
  if (!year || !monthNum) return month
  const rocYear = parseInt(year) - 1911
  return `${rocYear}年${parseInt(monthNum)}月`
}

// 格式化薪資詳情數據
export function formatPayrollDetail(data) {
  if (!data) return null
  return {
    ...data,
    baseSalary: formatCurrency(data.baseSalaryCents / 100),
    totalEarnings: formatCurrency(data.totalEarningsCents / 100),
    totalDeductions: formatCurrency(data.totalDeductionsCents / 100),
    netSalary: formatCurrency(data.netSalaryCents / 100),
    items: (data.items || []).map(item => ({
      ...item,
      amount: formatCurrency(item.amountCents / 100)
    }))
  }
}

// 注意：formatMonth() 函數已移至 date.js，請從 date.js 導入使用

