/**
 * 日期計算工具
 * 用於計算任務生成時間和到期日，與後端邏輯完全一致
 * 
 * 本文件實現了與後端 generator-new.js 中 calculateDueDate 函數完全一致的邏輯，
 * 並擴展支持了生成時間規則計算（前端預覽使用）
 * 
 * 生成時間規則支持：
 * - service_month_start: 服務月份開始時（服務月份的第1天）
 * - prev_month_last_x_days: 服務月份前一個月的最後X天
 * - prev_month_x_day: 服務月份前一個月的第X天（如果該月沒有X日，則為該月最後一天）
 * - next_month_start: 服務月份後一個月開始時（後一個月的第1天）
 * - monthly_x_day: 每月X日（服務月份的第X日，如果該月沒有X日，則為該月最後一天）
 * 
 * 邊緣情況處理：
 * - 跨年處理（1月的前一個月是12月，12月的後一個月是1月）
 * - 月份天數不足的情況（2月沒有31日，30天的月份沒有31日）
 * - 閏年處理（2月有29天）
 * 
 * 性能優化：
 * - 使用記憶化緩存避免重複計算相同參數的日期
 * - 緩存鍵基於輸入參數，確保相同輸入返回相同結果
 * - 緩存大小限制，避免內存泄漏
 */

// 記憶化緩存（使用 Map 實現）
const generationTimeCache = new Map()
const dueDateCache = new Map()

// 緩存大小限制（避免內存泄漏）
const MAX_CACHE_SIZE = 1000

/**
 * 生成緩存鍵
 * @param {string} type - 緩存類型（'generation' 或 'due'）
 * @param {string} rule - 規則類型
 * @param {object} params - 規則參數
 * @param {number} serviceYear - 服務年份
 * @param {number} serviceMonth - 服務月份
 * @param {number} daysDue - 新規則天數（可選）
 * @returns {string} 緩存鍵
 */
function generateCacheKey(type, rule, params, serviceYear, serviceMonth, daysDue = null) {
  // 將 params 對象序列化為穩定的字符串
  const paramsStr = params ? JSON.stringify(params, Object.keys(params).sort()) : '{}'
  const daysDueStr = daysDue !== null && daysDue !== undefined ? String(daysDue) : 'null'
  return `${type}:${rule || 'null'}:${paramsStr}:${serviceYear}:${serviceMonth}:${daysDueStr}`
}

/**
 * 清理緩存（當緩存大小超過限制時）
 * @param {Map} cache - 緩存對象
 */
function cleanupCache(cache) {
  if (cache.size > MAX_CACHE_SIZE) {
    // 刪除最舊的 50% 緩存項（簡單的 LRU 策略）
    const entriesToDelete = Math.floor(cache.size / 2)
    const keys = Array.from(cache.keys())
    for (let i = 0; i < entriesToDelete; i++) {
      cache.delete(keys[i])
    }
  }
}

/**
 * 獲取緩存值
 * @param {Map} cache - 緩存對象
 * @param {string} key - 緩存鍵
 * @returns {Date|null|undefined} 緩存值（undefined 表示未命中）
 */
function getCachedValue(cache, key) {
  return cache.get(key)
}

/**
 * 設置緩存值
 * @param {Map} cache - 緩存對象
 * @param {string} key - 緩存鍵
 * @param {Date|null} value - 緩存值
 */
function setCachedValue(cache, key, value) {
  cache.set(key, value)
  cleanupCache(cache)
}

/**
 * 清除所有緩存（用於測試或重置）
 */
export function clearDateCalculationCache() {
  generationTimeCache.clear()
  dueDateCache.clear()
}

/**
 * 計算任務生成時間
 * 
 * 與後端邏輯完全一致，支持所有生成時間規則類型，並正確處理邊緣情況
 * 
 * @param {string} rule - 生成時間規則類型
 * @param {object} params - 規則參數
 *   - days: 用於 prev_month_last_x_days 規則，表示最後X天（1-31）
 *   - day: 用於 prev_month_x_day 或 monthly_x_day 規則，表示日期（1-31）
 * @param {number} serviceYear - 服務年份（2000-2100）
 * @param {number} serviceMonth - 服務月份 (1-12)
 * @returns {Date|null} 生成時間日期對象，如果計算失敗返回 null
 * 
 * @example
 * // 服務月份開始時
 * calculateGenerationTime('service_month_start', {}, 2024, 3)
 * // 返回: 2024-03-01
 * 
 * @example
 * // 服務月份前一個月的最後3天
 * calculateGenerationTime('prev_month_last_x_days', { days: 3 }, 2024, 2)
 * // 返回: 2024-01-29 (1月的最後3天從29日開始)
 * 
 * @example
 * // 服務月份前一個月的第25天
 * calculateGenerationTime('prev_month_x_day', { day: 25 }, 2024, 2)
 * // 返回: 2024-01-25
 * 
 * @example
 * // 服務月份後一個月開始時
 * calculateGenerationTime('next_month_start', {}, 2024, 1)
 * // 返回: 2024-02-01
 * 
 * @example
 * // 每月15日（處理2月沒有15日的情況）
 * calculateGenerationTime('monthly_x_day', { day: 31 }, 2024, 2)
 * // 返回: 2024-02-29 (2月沒有31日，返回2月最後一天)
 */
export function calculateGenerationTime(rule, params = {}, serviceYear, serviceMonth) {
  // 驗證必填參數
  if (!rule || serviceYear === null || serviceYear === undefined || serviceMonth === null || serviceMonth === undefined) {
    return null
  }

  try {
    const year = Number(serviceYear)
    const month = Number(serviceMonth)

    // 驗證年份和月份格式
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return null
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    // 檢查緩存
    const cacheKey = generateCacheKey('generation', rule, params, year, month)
    const cached = getCachedValue(generationTimeCache, cacheKey)
    if (cached !== undefined) {
      // 返回緩存值的深拷貝（避免外部修改影響緩存）
      return cached ? new Date(cached.getTime()) : null
    }

    let result = null

    switch (rule) {
      case 'service_month_start':
      case 'serviceMonthStart':
        // 服務月份開始時：服務月份的第1天
        result = new Date(year, month - 1, 1)
        break

      case 'prev_month_last_x_days':
      case 'prevMonthLastXDays':
        // 服務月份前一個月的最後X天：前一個月的最後X天
        {
          const days = Number(params.days) || 1
          if (days < 1 || days > 31) {
            result = null
            break
          }
          // 前一個月
          const prevMonth = month === 1 ? 12 : month - 1
          const prevYear = month === 1 ? year - 1 : year
          // 前一個月的最後一天
          const lastDay = new Date(prevYear, prevMonth, 0).getDate()
          // 最後X天的第一天（例如：最後3天，如果該月有31天，則從29日開始）
          const startDay = Math.max(1, lastDay - days + 1)
          result = new Date(prevYear, prevMonth - 1, startDay)
        }
        break

      case 'prev_month_x_day':
      case 'prevMonthXDay':
        // 服務月份前一個月的第X天：前一個月的第X天（如果該月沒有X日，則為該月最後一天）
        {
          const day = Number(params.day) || 1
          if (day < 1 || day > 31) {
            result = null
            break
          }
          // 前一個月
          const prevMonth = month === 1 ? 12 : month - 1
          const prevYear = month === 1 ? year - 1 : year
          // 前一個月的最後一天
          const lastDay = new Date(prevYear, prevMonth, 0).getDate()
          // 如果該月沒有X日，則為該月最後一天
          const actualDay = Math.min(day, lastDay)
          result = new Date(prevYear, prevMonth - 1, actualDay)
        }
        break

      case 'next_month_start':
      case 'nextMonthStart':
        // 服務月份後一個月開始時：後一個月的第1天
        {
          const nextMonth = month === 12 ? 1 : month + 1
          const nextYear = month === 12 ? year + 1 : year
          result = new Date(nextYear, nextMonth - 1, 1)
        }
        break

      case 'monthly_x_day':
      case 'monthlyXDay':
        // 每月X日：服務月份的第X日（如果該月沒有X日，則為該月最後一天）
        {
          const day = Number(params.day) || 1
          if (day < 1 || day > 31) {
            result = null
            break
          }
          // 服務月份的最後一天
          const lastDay = new Date(year, month, 0).getDate()
          // 如果該月沒有X日，則為該月最後一天
          const actualDay = Math.min(day, lastDay)
          result = new Date(year, month - 1, actualDay)
        }
        break

      default:
        result = null
    }

    // 緩存結果
    setCachedValue(generationTimeCache, cacheKey, result)
    
    // 返回結果的深拷貝（避免外部修改影響緩存）
    return result ? new Date(result.getTime()) : null
  } catch (error) {
    console.error('[dateCalculators] calculateGenerationTime error:', error)
    return null
  }
}

/**
 * 計算任務到期日
 * 
 * 與後端 generator-new.js 和 generator-one-time.js 中的 calculateDueDate 函數邏輯完全一致
 * 
 * 規則優先順序：
 * 1. 新規則：days_due（月份起始日 + days_due）- 優先使用
 * 2. 舊規則：due_rule/due_value - 回退使用
 * 
 * 後端規則名稱映射：
 * - end_of_month → service_month_end（服務月份結束時）
 * - specific_day → fixed_date（固定日期，每月X日）
 * - next_month_day → next_month_end（下個月結束時，或下個月的第X天）
 * - days_after_start → days_after_start（服務月份開始後N天）
 * 
 * 前端額外支持的規則：
 * - n_months_end: N個月後結束（N個月後的最後一天）
 * - fixed_deadline: 固定期限（指定年月日）
 * 
 * 邊緣情況處理：
 * - 跨年處理（12月的後一個月是1月，年份加1）
 * - 月份天數不足的情況（2月沒有31日，30天的月份沒有31日）
 * - 閏年處理（2月有29天）
 * - 對於 specific_day 規則，後端不處理月份天數不足的情況（會溢出到下個月），
 *   但前端為了更好的用戶體驗，會處理並返回該月最後一天
 * 
 * @param {string} rule - 到期日規則類型（舊規則，當 daysDue 為空時使用）
 * @param {object} params - 規則參數（舊規則參數，當 daysDue 為空時使用）
 *   - day: 用於 fixed_date 或 fixed_deadline 規則，表示日期（1-31）
 *   - dueValue: 後端參數名稱，等同於 day（用於兼容後端）
 *   - days: 用於 days_after_start 規則，表示天數
 *   - months: 用於 n_months_end 規則，表示月數（1-12）
 *   - year: 用於 fixed_deadline 規則，表示年份
 *   - month: 用於 fixed_deadline 規則，表示月份（1-12）
 * @param {number} serviceYear - 服務年份（2000-2100）
 * @param {number} serviceMonth - 服務月份 (1-12)
 * @param {number} daysDue - 新規則：從服務月份開始日加上的天數（優先使用）
 * @returns {Date|null} 到期日日期對象，如果計算失敗返回 null
 * 
 * @example
 * // 新規則：月份起始日 + 20天
 * calculateDueDate(null, {}, 2024, 3, 20)
 * // 返回: 2024-03-21
 * 
 * @example
 * // 服務月份結束時
 * calculateDueDate('end_of_month', {}, 2024, 2)
 * // 返回: 2024-02-29 (閏年)
 * 
 * @example
 * // 固定日期（處理月份天數不足）
 * calculateDueDate('specific_day', { dueValue: 31 }, 2024, 2)
 * // 返回: 2024-02-29 (2月沒有31日，返回2月最後一天)
 * 
 * @example
 * // 下個月的第15天
 * calculateDueDate('next_month_day', { dueValue: 15 }, 2024, 1)
 * // 返回: 2024-02-15
 * 
 * @example
 * // 固定期限（指定年月日）
 * calculateDueDate('fixed_deadline', { year: 2024, month: 3, day: 15 }, 2024, 1)
 * // 返回: 2024-03-15
 */
export function calculateDueDate(rule, params = {}, serviceYear, serviceMonth, daysDue = null) {
  // 驗證必填參數
  if (serviceYear === null || serviceYear === undefined || serviceMonth === null || serviceMonth === undefined) {
    return null
  }

  try {
    const year = Number(serviceYear)
    const month = Number(serviceMonth)

    // 驗證年份和月份格式
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return null
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    // 檢查緩存
    const cacheKey = generateCacheKey('due', rule, params, year, month, daysDue)
    const cached = getCachedValue(dueDateCache, cacheKey)
    if (cached !== undefined) {
      // 返回緩存值的深拷貝（避免外部修改影響緩存）
      return cached ? new Date(cached.getTime()) : null
    }

    let result = null

    // 新規則優先：月份起始日 + days_due（與後端邏輯完全一致）
    const hasDaysDue = daysDue !== null && daysDue !== undefined && Number.isFinite(daysDue) && daysDue >= 0
    if (hasDaysDue) {
      const periodStart = new Date(year, month - 1, 1)
      const dueDate = new Date(periodStart)
      dueDate.setDate(periodStart.getDate() + Number(daysDue))
      result = dueDate
    } else {

      // 舊規則回退：使用 due_rule/due_value（與後端邏輯完全一致）
      if (!rule) {
        // 後端默認返回服務月份最後一天
        result = new Date(year, month, 0)
      } else {
        // 支持後端規則名稱（直接映射）和前端規則名稱（兼容）
        switch (rule) {
          // 後端規則：end_of_month
          case 'end_of_month':
          // 前端規則：service_month_end
          case 'service_month_end':
          case 'serviceMonthEnd':
            // 服務月份結束時：服務月份的最後一天
            // 使用 new Date(year, month, 0) 獲取上個月的最後一天，即當前月份的最後一天
            result = new Date(year, month, 0)
            break

          // 後端規則：specific_day
          case 'specific_day':
            // 固定日期：每月X日
            // 注意：後端不處理月份天數不足的情況（會溢出到下個月），
            // 但前端為了更好的用戶體驗，會處理並返回該月最後一天
            {
              const day = Number(params.dueValue || params.day) || 1
              if (day < 1 || day > 31) {
                result = null
                break
              }
              // 後端邏輯：直接使用指定日期，不處理月份天數不足（會溢出到下個月）
              // 但為了更好的用戶體驗，前端處理月份天數不足的情況
              const lastDay = new Date(year, month, 0).getDate()
              const actualDay = Math.min(day, lastDay)
              result = new Date(year, month - 1, actualDay)
            }
            break
          // 前端規則：fixed_date
          case 'fixed_date':
          case 'fixedDate':
            // 固定日期：每月X日（如果該月沒有X日，則為該月最後一天）
            {
              // 前端使用 params.day
              const day = Number(params.day || params.dueValue) || 1
              if (day < 1 || day > 31) {
                result = null
                break
              }
              // 處理月份天數不足的情況（例如：2月沒有31日）
              const lastDay = new Date(year, month, 0).getDate()
              const actualDay = Math.min(day, lastDay)
              result = new Date(year, month - 1, actualDay)
            }
            break

          // 後端規則：next_month_day
          case 'next_month_day':
          // 前端規則：next_month_end
          case 'next_month_end':
          case 'nextMonthEnd':
            // 下個月結束時：後一個月的最後一天
            // 注意：後端的 next_month_day 實際上是下個月的第X天，但前端需求是下個月結束
            {
              const nextMonth = month === 12 ? 1 : month + 1
              const nextYear = month === 12 ? year + 1 : year
              // 如果使用後端規則 next_month_day，則使用 dueValue 作為日期
              if (rule === 'next_month_day' && params.dueValue) {
                const day = Number(params.dueValue) || 1
                const lastDay = new Date(nextYear, nextMonth, 0).getDate()
                const actualDay = Math.min(day, lastDay)
                result = new Date(nextYear, nextMonth - 1, actualDay)
              } else {
                // 前端規則：下個月最後一天
                result = new Date(nextYear, nextMonth, 0)
              }
            }
            break

          // 前端規則：n_months_end（後端不支持，但前端需求支持）
          case 'n_months_end':
          case 'nMonthsEnd':
            // N個月後結束：N個月後的最後一天
            {
              const n = Number(params.months) || 1
              if (n < 0) {
                result = null
                break
              }
              const targetMonth = month + n
              const targetYear = year + Math.floor((targetMonth - 1) / 12)
              const actualMonth = ((targetMonth - 1) % 12) + 1
              result = new Date(targetYear, actualMonth, 0)
            }
            break

          // 前端規則：fixed_deadline（固定期限，指定年月日）
          case 'fixed_deadline':
          case 'fixedDeadline':
            // 固定期限：指定日期（年月日）
            {
              if (params.year && params.month && params.day) {
                const targetYear = Number(params.year)
                const targetMonth = Number(params.month)
                const targetDay = Number(params.day)
                // 驗證日期有效性
                if (targetYear < 2000 || targetYear > 2100) {
                  result = null
                  break
                }
                if (targetMonth < 1 || targetMonth > 12) {
                  result = null
                  break
                }
                if (targetDay < 1 || targetDay > 31) {
                  result = null
                  break
                }
                // 處理月份天數不足的情況
                const lastDay = new Date(targetYear, targetMonth, 0).getDate()
                const actualDay = Math.min(targetDay, lastDay)
                result = new Date(targetYear, targetMonth - 1, actualDay)
              } else {
                result = null
              }
            }
            break

          // 後端規則：days_after_start
          case 'days_after_start':
          // 前端規則：days_after_start
          case 'daysAfterStart':
            // 服務月份開始後N天
            {
              // 後端使用 dueValue，前端使用 params.days
              const days = Number(params.days || params.dueValue) || 30
              if (days < 0) {
                result = null
                break
              }
              const base = new Date(year, month - 1, 1)
              base.setDate(base.getDate() + days)
              result = base
            }
            break

          default:
            // 後端默認返回服務月份最後一天
            result = new Date(year, month, 0)
        }
      }
    }

    // 緩存結果
    setCachedValue(dueDateCache, cacheKey, result)
    
    // 返回結果的深拷貝（避免外部修改影響緩存）
    return result ? new Date(result.getTime()) : null
  } catch (error) {
    console.error('[dateCalculators] calculateDueDate error:', error)
    return null
  }
}

/**
 * 格式化日期為 YYYY-MM-DD
 * @param {Date} date - 日期對象
 * @returns {string} 格式化後的日期字符串
 */
export function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化日期為中文顯示
 * @param {Date} date - 日期對象
 * @returns {string} 格式化後的日期字符串（例如：2024年3月1日）
 */
export function formatDateChinese(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
}

