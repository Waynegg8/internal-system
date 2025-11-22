/**
 * 日期計算工具
 * 用於計算任務生成時間和到期日
 * 
 * 本文件實現了任務生成時間和到期日的計算邏輯，與前端 dateCalculators.js 保持一致
 * 支持所有規則類型，並正確處理邊緣情況（月份天數不足、跨年等）
 * 
 * 生成時間規則支持：
 * - service_month_start: 服務月份開始時（服務月份的第1天）
 * - prev_month_last_x_days: 服務月份前一個月的最後X天
 * - prev_month_x_day: 服務月份前一個月的第X天（如果該月沒有X日，則為該月最後一天）
 * - next_month_start: 服務月份後一個月開始時（後一個月的第1天）
 * - monthly_x_day: 每月X日（服務月份的第X日，如果該月沒有X日，則為該月最後一天）
 * 
 * 到期日規則支持：
 * - end_of_month: 服務月份結束時（服務月份的最後一天）
 * - specific_day: 固定日期（每月X日，後端不處理月份天數不足，會溢出到下個月）
 * - next_month_day: 下個月的第X天
 * - days_after_start: 服務月份開始後N天
 * - fixed_date: 固定日期（每月X日，處理月份天數不足的情況）
 * - next_month_end: 下個月結束時（下個月的最後一天）
 * - next_n_months_end: N個月後結束時（N個月後的最後一天）
 * 
 * 固定期限任務支持：
 * - is_fixed_deadline: 標記為固定期限任務，不受前置任務延後影響
 * - 支持 estimated_hours 和 estimated_work_days 計算預估完成時間
 * 
 * 邊緣情況處理：
 * - 跨年處理（1月的前一個月是12月，12月的後一個月是1月）
 * - 月份天數不足的情況（2月沒有31日，30天的月份沒有31日）
 * - 閏年處理（2月有29天）
 */

/**
 * 計算任務生成時間
 * 
 * 根據生成時間規則計算實際生成日期
 * 如果未配置 generation_time_rule，則回退到 advance_days 邏輯（dueDate - advanceDays）
 * 
 * @param {string|null} rule - 生成時間規則類型
 * @param {object} params - 規則參數
 *   - days: 用於 prev_month_last_x_days 規則，表示最後X天（1-31）
 *   - day: 用於 prev_month_x_day 或 monthly_x_day 規則，表示日期（1-31）
 * @param {number} serviceYear - 服務年份（2000-2100）
 * @param {number} serviceMonth - 服務月份 (1-12)
 * @param {number|null} advanceDays - 回退邏輯：提前天數（當 rule 為空時使用）
 * @param {Date|null} dueDate - 回退邏輯：到期日（當 rule 為空時使用，計算為 dueDate - advanceDays）
 * @returns {Date|null} 生成時間日期對象，如果計算失敗返回 null
 */
export function calculateGenerationTime(rule, params = {}, serviceYear, serviceMonth, advanceDays = null, dueDate = null) {
  // 驗證必填參數
  if (serviceYear === null || serviceYear === undefined || serviceMonth === null || serviceMonth === undefined) {
    return null;
  }

  try {
    const year = Number(serviceYear);
    const month = Number(serviceMonth);

    // 驗證年份和月份格式
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return null;
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return null;
    }

    // 如果沒有配置生成時間規則，回退到 advance_days 邏輯
    if (!rule && advanceDays !== null && advanceDays !== undefined && dueDate) {
      const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
      if (!isNaN(due.getTime())) {
        const genTime = new Date(due);
        genTime.setDate(due.getDate() - Number(advanceDays));
        return genTime;
      }
    }

    let result = null;

    // 根據規則類型計算生成時間
    switch (rule) {
      case 'service_month_start':
      case 'serviceMonthStart':
        // 服務月份開始時：服務月份的第1天
        result = new Date(year, month - 1, 1);
        break;

      case 'prev_month_last_x_days':
      case 'prevMonthLastXDays':
        // 服務月份前一個月的最後X天
        {
          const days = Number(params.days) || 1;
          if (days < 1 || days > 31) {
            result = null;
            break;
          }
          // 計算前一個月
          const prevMonth = month === 1 ? 12 : month - 1;
          const prevYear = month === 1 ? year - 1 : year;
          // 獲取前一個月的最後一天
          const lastDay = new Date(prevYear, prevMonth, 0).getDate();
          // 最後X天的第一天
          const startDay = Math.max(1, lastDay - days + 1);
          result = new Date(prevYear, prevMonth - 1, startDay);
        }
        break;

      case 'prev_month_x_day':
      case 'prevMonthXDay':
        // 服務月份前一個月的第X天（如果該月沒有X日，則為該月最後一天）
        {
          const day = Number(params.day) || 1;
          if (day < 1 || day > 31) {
            result = null;
            break;
          }
          // 計算前一個月
          const prevMonth = month === 1 ? 12 : month - 1;
          const prevYear = month === 1 ? year - 1 : year;
          // 獲取前一個月的天數
          const lastDay = new Date(prevYear, prevMonth, 0).getDate();
          // 處理月份天數不足的情況
          const actualDay = Math.min(day, lastDay);
          result = new Date(prevYear, prevMonth - 1, actualDay);
        }
        break;

      case 'next_month_start':
      case 'nextMonthStart':
        // 服務月份後一個月開始時：後一個月的第1天
        {
          const nextMonth = month === 12 ? 1 : month + 1;
          const nextYear = month === 12 ? year + 1 : year;
          result = new Date(nextYear, nextMonth - 1, 1);
        }
        break;

      case 'monthly_x_day':
      case 'monthlyXDay':
        // 每月X日：服務月份的第X日（如果該月沒有X日，則為該月最後一天）
        {
          const day = Number(params.day) || 1;
          if (day < 1 || day > 31) {
            result = null;
            break;
          }
          // 處理月份天數不足的情況
          const lastDay = new Date(year, month, 0).getDate();
          const actualDay = Math.min(day, lastDay);
          result = new Date(year, month - 1, actualDay);
        }
        break;

      default:
        // 如果規則不匹配，回退到 advance_days 邏輯
        if (advanceDays !== null && advanceDays !== undefined && dueDate) {
          const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
          if (!isNaN(due.getTime())) {
            const genTime = new Date(due);
            genTime.setDate(due.getDate() - Number(advanceDays));
            result = genTime;
          }
        } else {
          // 默認：服務月份的第一天
          result = new Date(year, month - 1, 1);
        }
    }

    // 驗證結果
    if (result && !isNaN(result.getTime())) {
      return result;
    }
    return null;
  } catch (error) {
    console.error('[dateCalculators] calculateGenerationTime error:', error);
    return null;
  }
}

/**
 * 計算任務到期日
 * 
 * 規則優先順序：
 * 1. 新規則：days_due（月份起始日 + days_due）- 優先使用
 * 2. 舊規則：due_rule/due_value - 回退使用
 * 
 * 支持所有到期日規則類型，並正確處理邊緣情況
 * 
 * @param {object} config - 任務配置對象
 *   - days_due: 新規則：從服務月份開始日加上的天數（優先使用）
 *   - due_rule: 舊規則：到期日規則類型
 *   - due_value: 舊規則：到期日規則參數值
 *   - is_fixed_deadline: 是否為固定期限任務
 * @param {number} targetYear - 目標年份（2000-2100）
 * @param {number} targetMonth - 目標月份 (1-12)
 * @returns {Date|null} 到期日日期對象，如果計算失敗返回 null
 */
export function calculateDueDate(config, targetYear, targetMonth) {
  // 驗證必填參數
  if (targetYear === null || targetYear === undefined || targetMonth === null || targetMonth === undefined) {
    return null;
  }

  try {
    const year = Number(targetYear);
    const month = Number(targetMonth);

    // 驗證年份和月份格式
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return null;
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return null;
    }

    let result = null;

    // 新規則優先：月份起始日 + days_due（與現有邏輯完全一致）
    const hasDaysDue = config.days_due !== null && config.days_due !== undefined && 
                       Number.isFinite(config.days_due) && config.days_due >= 0;
    if (hasDaysDue) {
      const periodStart = new Date(year, month - 1, 1);
      const dueDate = new Date(periodStart);
      dueDate.setDate(periodStart.getDate() + Number(config.days_due));
      result = dueDate;
    } else {
      // 舊規則回退：使用 due_rule/due_value（與現有邏輯完全一致）
      const dueRule = config.due_rule;
      const dueValue = config.due_value;

      if (!dueRule) {
        // 後端默認返回服務月份最後一天
        result = new Date(year, month, 0);
      } else {
        switch (dueRule) {
          case 'end_of_month':
            // 服務月份結束時：服務月份的最後一天
            result = new Date(year, month, 0);
            break;

          case 'specific_day':
            // 固定日期：每月X日
            // 注意：後端不處理月份天數不足的情況（會溢出到下個月），保持與現有邏輯一致
            {
              const day = Number(dueValue) || 1;
              if (day < 1 || day > 31) {
                result = null;
                break;
              }
              result = new Date(year, month - 1, day);
            }
            break;

          case 'next_month_day':
            // 下個月的第X天
            {
              const day = Number(dueValue) || 1;
              if (day < 1 || day > 31) {
                result = null;
                break;
              }
              const nextMonth = month === 12 ? 1 : month + 1;
              const nextYear = month === 12 ? year + 1 : year;
              result = new Date(nextYear, nextMonth - 1, day);
            }
            break;

          case 'days_after_start':
            // 服務月份開始後N天
            {
              const days = Number(dueValue) || 30;
              if (days < 0) {
                result = null;
                break;
              }
              const base = new Date(year, month - 1, 1);
              base.setDate(base.getDate() + days);
              result = base;
            }
            break;

          case 'fixed_date':
            // 固定日期：每月X日（處理月份天數不足的情況）
            {
              const day = Number(dueValue) || 1;
              if (day < 1 || day > 31) {
                result = null;
                break;
              }
              // 處理月份天數不足的情況（例如：2月沒有31日）
              const lastDay = new Date(year, month, 0).getDate();
              const actualDay = Math.min(day, lastDay);
              result = new Date(year, month - 1, actualDay);
            }
            break;

          case 'next_month_end':
            // 下個月結束時：下個月的最後一天
            {
              const nextMonth = month === 12 ? 1 : month + 1;
              const nextYear = month === 12 ? year + 1 : year;
              result = new Date(nextYear, nextMonth, 0);
            }
            break;

          case 'next_n_months_end':
            // N個月後結束時：N個月後的最後一天
            {
              const n = Number(dueValue) || 1;
              if (n < 0) {
                result = null;
                break;
              }
              const targetMonth = month + n;
              const targetYear = year + Math.floor((targetMonth - 1) / 12);
              const actualMonth = ((targetMonth - 1) % 12) + 1;
              result = new Date(targetYear, actualMonth, 0);
            }
            break;

          default:
            // 後端默認返回服務月份最後一天
            result = new Date(year, month, 0);
        }
      }
    }

    // 驗證結果
    if (result && !isNaN(result.getTime())) {
      return result;
    }
    return null;
  } catch (error) {
    console.error('[dateCalculators] calculateDueDate error:', error);
    return null;
  }
}

/**
 * 計算任務預估完成時間
 * 
 * 根據 estimated_hours 或 estimated_work_days 計算任務預估完成時間
 * 用於固定期限任務的期限調整邏輯
 * 
 * @param {Date} startDate - 開始日期
 * @param {number|null} estimatedHours - 預估小時數
 * @param {number|null} estimatedWorkDays - 預估工作天數
 * @param {number} workingHoursPerDay - 每天工作小時數（默認 8 小時）
 * @returns {Date|null} 預估完成日期，如果計算失敗返回 null
 */
export function calculateEstimatedCompletionDate(startDate, estimatedHours = null, estimatedWorkDays = null, workingHoursPerDay = 8) {
  if (!startDate || (startDate instanceof Date && isNaN(startDate.getTime()))) {
    return null;
  }

  try {
    const start = startDate instanceof Date ? startDate : new Date(startDate);
    if (isNaN(start.getTime())) {
      return null;
    }

    let daysToAdd = 0;

    // 優先使用 estimated_work_days
    if (estimatedWorkDays !== null && estimatedWorkDays !== undefined && Number.isFinite(estimatedWorkDays) && estimatedWorkDays >= 0) {
      daysToAdd = Number(estimatedWorkDays);
    } 
    // 回退到 estimated_hours
    else if (estimatedHours !== null && estimatedHours !== undefined && Number.isFinite(estimatedHours) && estimatedHours >= 0) {
      // 將小時轉換為天數（考慮每天工作小時數）
      daysToAdd = Math.ceil(Number(estimatedHours) / workingHoursPerDay);
    } else {
      // 如果都沒有提供，返回 null
      return null;
    }

    const completionDate = new Date(start);
    completionDate.setDate(start.getDate() + daysToAdd);
    return completionDate;
  } catch (error) {
    console.error('[dateCalculators] calculateEstimatedCompletionDate error:', error);
    return null;
  }
}

/**
 * 調整固定期限任務的中間任務到期日
 * 
 * 當前置任務延誤導致中間任務無法在固定期限前完成時，
 * 調整中間任務的到期日為「固定期限的前一天」
 * 
 * @param {Date} fixedDeadline - 固定期限日期
 * @param {Date} estimatedCompletion - 預估完成時間
 * @returns {Date|null} 調整後的到期日（固定期限的前一天），如果不需要調整返回 null
 */
export function adjustIntermediateTaskDueDate(fixedDeadline, estimatedCompletion) {
  if (!fixedDeadline || !estimatedCompletion) {
    return null;
  }

  try {
    const deadline = fixedDeadline instanceof Date ? fixedDeadline : new Date(fixedDeadline);
    const completion = estimatedCompletion instanceof Date ? estimatedCompletion : new Date(estimatedCompletion);

    if (isNaN(deadline.getTime()) || isNaN(completion.getTime())) {
      return null;
    }

    // 如果預估完成時間超過固定期限，則調整為固定期限的前一天
    if (completion.getTime() > deadline.getTime()) {
      const adjustedDate = new Date(deadline);
      adjustedDate.setDate(deadline.getDate() - 1);
      return adjustedDate;
    }

    // 不需要調整
    return null;
  } catch (error) {
    console.error('[dateCalculators] adjustIntermediateTaskDueDate error:', error);
    return null;
  }
}

/**
 * 檢查是否為固定期限任務
 * 
 * @param {object} config - 任務配置對象
 * @returns {boolean} 是否為固定期限任務
 */
export function isFixedDeadlineTask(config) {
  return config && (config.is_fixed_deadline === true || config.is_fixed_deadline === 1 || config.is_fixed_deadline === '1');
}

/**
 * 格式化日期為 YYYY-MM-DD
 * 
 * @param {Date} date - 日期對象
 * @returns {string|null} 格式化後的日期字符串，如果失敗返回 null
 */
export function formatDate(date) {
  if (!date) return null;
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('[dateCalculators] formatDate error:', error);
    return null;
  }
}



