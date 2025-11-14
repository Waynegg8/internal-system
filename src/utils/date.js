import { formatDate } from './formatters'

/**
 * 日期處理工具
 */

// 格式化本地日期
export function formatLocalDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('zh-TW')
}

// 格式化年月（YYYY-MM）
export function formatYm(ym) {
  if (!ym) return ''
  return ym
}

// 獲取當前年月（YYYY-MM）
export function getCurrentYm() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// 月份加減
export function addMonth(ym, delta) {
  const [year, month] = ym.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  const newYear = date.getFullYear()
  const newMonth = String(date.getMonth() + 1).padStart(2, '0')
  return `${newYear}-${newMonth}`
}

// 獲取週一日期（與舊專案保持一致）
export function getMonday(date) {
  const d = new Date(date)
  // 設置為中午，避免時區邊界問題
  d.setHours(12, 0, 0, 0)
  const day = d.getDay() // 0=週日, 1=週一, ..., 6=週六
  // 計算到週一的偏移量
  // 如果 day === 0（週日），需要減 6 天回到上週一
  // 如果 day !== 0，需要減 (day - 1) 天回到本週一
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  // 確保時間為 00:00:00（本地時間）
  monday.setHours(0, 0, 0, 0)
  
  // 驗證結果
  const mondayDay = monday.getDay()
  if (mondayDay !== 1) {
    console.error('[getMonday] 錯誤：計算結果不是週一，dayOfWeek =', mondayDay, 'input =', date, 'output =', monday)
  }
  
  return monday
}

// 格式化週範圍
export function formatWeekRange(monday) {
  if (!monday) return ''
  const mondayDate = monday instanceof Date ? monday : new Date(monday)
  const sunday = new Date(mondayDate)
  sunday.setDate(mondayDate.getDate() + 6)
  return `${formatDate(mondayDate)} - ${formatDate(sunday)}`
}

// 判定日期類型（工作日、休息日、例假日、國定假日）
export function getDateType(dateStr, holidays) {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  const isoDate = dateStr.split('T')[0]
  
  // 優先檢查是否為國定假日
  if (holidays && holidays.has(isoDate)) {
    const holiday = holidays.get(isoDate)
    // 檢查 is_national_holiday 欄位
    if (holiday.is_national_holiday === true || holiday.is_national_holiday === 1) {
      return 'national_holiday'
    }
  }
  
  // 判斷週六週日
  if (dayOfWeek === 0) {
    // 週日：例假日
    return 'weekly_restday'
  } else if (dayOfWeek === 6) {
    // 週六：休息日
    return 'restday'
  }
  
  // 其他為工作日
  return 'workday'
}

// 建立週日期模型（從週一開始，與舊專案保持一致）
export function buildWeekDays(currentWeekStart, holidays) {
  const weekDays = []
  // 假設 currentWeekStart 已經是週一（由調用者確保）
  // 與舊專案保持一致：直接從 currentWeekStart 開始建立 7 天
  // 確保使用本地時間，避免時區問題
  const monday = new Date(currentWeekStart)
  monday.setHours(12, 0, 0, 0) // 設置為中午，避免時區邊界問題
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    // 使用本地日期字符串，避免時區問題
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const dayOfWeek = date.getDay() // 0=週日, 1=週一, ..., 6=週六
    
    // 獲取日期類型（會正確判斷國定假日、例假日、休息日）
    const dateType = getDateType(dateStr, holidays)
    
    // 獲取假日名稱（如果有）
    let holidayName = null
    if (holidays && holidays.has(dateStr)) {
      const holiday = holidays.get(dateStr)
      holidayName = holiday.name || holiday.holiday_name || null
    }
    
    weekDays.push({
      date: dateStr,
      dayOfWeek: dayOfWeek,
      type: dateType,
      label: date.toLocaleDateString('zh-TW', { weekday: 'short' }),
      holidayName: holidayName
    })
  }
  
  // 驗證：第一個日期應該是週一（dayOfWeek === 1）
  if (weekDays.length > 0 && weekDays[0].dayOfWeek !== 1) {
    console.warn('[buildWeekDays] 警告：第一個日期不是週一，dayOfWeek =', weekDays[0].dayOfWeek, 'date =', weekDays[0].date, 'currentWeekStart =', currentWeekStart)
  }
  
  return weekDays
}

// 計算逾期天數
export function calculateOverdueDays(dueDate) {
  if (!dueDate) return 0
  const due = new Date(dueDate)
  const now = new Date()
  // 設置為當天的 00:00:00，只比較日期
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diffTime = now - due
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

// 格式化月份為民國年月格式（用於薪資等場景）
export function formatMonth(month) {
  if (!month) return ''
  // 如果已經是 YYYY-MM 格式，轉換為民國年月
  if (typeof month === 'string' && month.includes('-')) {
    const [year, monthNum] = month.split('-')
    const rocYear = parseInt(year) - 1911
    return `${rocYear}年${parseInt(monthNum)}月`
  }
  return month
}

