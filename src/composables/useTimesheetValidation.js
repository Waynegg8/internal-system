import { formatDateDisplay } from '@/utils/formatters'

/**
 * 工時驗證 Composable
 */
export function useTimesheetValidation() {
  // 日期類型文字映射
  const dateTypeNames = {
    workday: '工作日',
    restday: '休息日',
    weekly_restday: '例假日',
    national_holiday: '國定假日',
    holiday: '假日'
  }

  /**
   * 獲取日期類型文字
   */
  function getDayTypeText(dateType) {
    return dateTypeNames[dateType] || dateType
  }

  /**
   * 檢查工時類型是否允許在指定日期類型使用
   */
  function isWorkTypeAllowed(workType, dateType) {
    if (!workType || !workType.allowedOn) {
      return false
    }
    return workType.allowedOn.includes(dateType)
  }

  /**
   * 獲取指定日期類型允許的工時類型列表
   */
  function getAllowedWorkTypesForDate(dateType, workTypes) {
    if (!workTypes || !Array.isArray(workTypes)) {
      return []
    }
    return workTypes.filter(wt => isWorkTypeAllowed(wt, dateType))
  }

  /**
   * 驗證工時輸入
   * @param {Object} context - 驗證上下文
   * @param {number} context.rowIndex - 行索引
   * @param {number} context.dayIndex - 日期索引
   * @param {number} context.value - 工時數值
   * @param {Object} context.row - 行數據
   * @param {Object} context.day - 日期信息
   * @param {Array} context.workTypes - 工時類型列表
   * @param {Array} context.rows - 所有行數據
   * @param {Map} context.leaves - 請假記錄 Map
   * @returns {Object} { valid: boolean, error: string | null }
   */
  function validateHoursInput(context) {
    const {
      rowIndex,
      dayIndex,
      value,
      row,
      day,
      workTypes,
      rows,
      leaves
    } = context

    // 基本驗證：必填欄位檢查
    if (!row.clientId && !row.client_id) {
      return { valid: false, error: '請先選擇客戶' }
    }
    if (!row.serviceId && !row.service_id) {
      return { valid: false, error: '請先選擇服務項目' }
    }
    if (!row.serviceItemId && !row.service_item_id) {
      return { valid: false, error: '請先選擇服務子項目' }
    }
    if (!row.workTypeId && !row.work_type_id) {
      return { valid: false, error: '請先選擇工時類型' }
    }

    // 解析數值
    const hours = parseFloat(value)
    if (isNaN(hours) || hours <= 0) {
      return { valid: false, error: '工時必須大於 0' }
    }

    // 四捨五入到 0.5
    const rounded = Math.round(hours * 2) / 2

    // 檢查是否為 0.5 的倍數
    if (Math.abs(rounded - hours) > 0.01) {
      return { valid: false, error: `工時將四捨五入為 ${rounded} 小時` }
    }

    // 獲取工時類型
    const workTypeId = row.workTypeId || row.work_type_id
    const workType = workTypes.find(wt => wt.id === workTypeId)
    if (!workType) {
      return { valid: false, error: '無效的工時類型' }
    }

    // 日期顯示文字
    const dateDisplay = formatDateDisplay(day.date)

    // 驗證工時類型與日期相容性
    if (!isWorkTypeAllowed(workType, day.type)) {
      const allowedTypes = getAllowedWorkTypesForDate(day.type, workTypes)
      const typesText = allowedTypes.map(wt => wt.name).join('、')
      const dayTypeText = getDayTypeText(day.type)
      return {
        valid: false,
        error: `${dateDisplay}（${dayTypeText}）不可使用「${workType.name}」。可用類型：${typesText}`
      }
    }

    // 驗證加班前置條件：只有工作日的加班需要先填滿正常工時（正常工時 + 請假 >= 8 小時）
    if (workType.isOvertime && day.type === 'workday') {
      const leaveHours = parseFloat(leaves.get(day.date)?.hours || leaves.get(day.date)?.leave_hours || 0)
      const standardHours = 8

      // 計算當天已填的正常工時
      let existingNormalHours = 0
      rows.forEach((r, idx) => {
        if (idx !== rowIndex) {
          const rWorkTypeId = r.workTypeId || r.work_type_id
          const rWorkType = workTypes.find(wt => wt.id === rWorkTypeId)
          if (rWorkType && !rWorkType.isOvertime && r.hours && r.hours[dayIndex]) {
            existingNormalHours += parseFloat(r.hours[dayIndex] || 0)
          }
        }
      })

      const totalNormalWork = leaveHours + existingNormalHours

      if (totalNormalWork < standardHours) {
        const shortage = standardHours - totalNormalWork
        return {
          valid: false,
          error: `${dateDisplay}（工作日）：尚未填滿正常工時，不可填寫加班類型。請先填滿 ${shortage} 小時的正常工時（使用「一般」工時類型）`
        }
      }
    }

    // 驗證正常工時與請假衝突：如果當天已請滿假（>= 8小時），不可再填正常工時
    if (!workType.isOvertime) {
      const leaveHours = parseFloat(leaves.get(day.date)?.hours || leaves.get(day.date)?.leave_hours || 0)
      const standardHours = 8

      if (leaveHours >= standardHours) {
        return {
          valid: false,
          error: `${dateDisplay}：當日已請假 ${leaveHours} 小時（已滿工時），不可再填寫「${workType.name}」（正常工時類型）。如有加班，請使用加班類型`
        }
      }

      // 如果請假 + 正常工時累計 > 8小時，也不可填寫
      // 重要：檢查同一員工同一天所有行的正常工時總和（不應超過 8 小時）
      let existingNormalHours = 0
      rows.forEach((r, idx) => {
        // 檢查同一員工的所有行（包括當前行）
        const rUserId = r.userId || r.user_id
        const currentUserId = rows[rowIndex]?.userId || rows[rowIndex]?.user_id
        if (rUserId === currentUserId) {
          const rWorkTypeId = r.workTypeId || r.work_type_id
          const rWorkType = workTypes.find(wt => wt.id === rWorkTypeId)
          if (rWorkType && !rWorkType.isOvertime && r.hours && r.hours[dayIndex]) {
            // 如果是當前行，只累加已存在的值（不包括正在輸入的值）
            if (idx === rowIndex) {
              // 當前行的已存在值（不包括 rounded，因為 rounded 會在下面單獨計算）
              const currentRowExistingHours = parseFloat(r.hours[dayIndex] || 0)
              // 如果正在輸入的值與已存在的值不同，說明是修改，使用舊值
              if (Math.abs(currentRowExistingHours - rounded) > 0.01) {
                existingNormalHours += currentRowExistingHours
              }
            } else {
              // 其他行的正常工時
              existingNormalHours += parseFloat(r.hours[dayIndex] || 0)
            }
          }
        }
      })

      // 驗證：工作日「正常工時 + 請假」不應超過 8 小時
      const totalNormal = leaveHours + existingNormalHours + rounded
      if (totalNormal > standardHours) {
        const remaining = Math.max(0, standardHours - leaveHours - existingNormalHours)
        if (leaveHours > 0) {
          return {
            valid: false,
            error: `${dateDisplay}（工作日）：正常工時 + 請假時數不可超過 8 小時。目前：正常工時 ${existingNormalHours} 小時，請假 ${leaveHours} 小時，嘗試新增 ${rounded} 小時，總計 ${totalNormal.toFixed(1)} 小時。您最多還可以填 ${remaining.toFixed(1)} 小時正常工時`
          }
        } else {
          return {
            valid: false,
            error: `${dateDisplay}：正常工時已滿（上限 ${standardHours} 小時）。您最多還可以填 ${remaining.toFixed(1)} 小時正常工時，或使用加班類型記錄額外工時`
          }
        }
      }
    }

    // 驗證時數限制：檢查同一天同一工時類型的累計工時
    if (workType.maxHours) {
      // 先檢查單次輸入是否超過限制
      if (rounded > workType.maxHours) {
        return {
          valid: false,
          error: `${dateDisplay}：${workType.name}單次最多只能填 ${workType.maxHours} 小時。您填了 ${rounded} 小時，請改為 ${workType.maxHours} 或更少`
        }
      }

      // 計算同一天同一工時類型的現有總工時（排除當前行）
      let existingTotal = 0
      rows.forEach((r, idx) => {
        if (idx !== rowIndex) {
          const rWorkTypeId = r.workTypeId || r.work_type_id
          if (rWorkTypeId === workTypeId && r.hours && r.hours[dayIndex]) {
            existingTotal += parseFloat(r.hours[dayIndex] || 0)
          }
        }
      })

      // 檢查累計是否超過限制
      const totalAfter = existingTotal + rounded
      if (totalAfter > workType.maxHours) {
        return {
          valid: false,
          error: `${dateDisplay}：「${workType.name}」當日累計不可超過 ${workType.maxHours} 小時。現有：${existingTotal} 小時，新增：${rounded} 小時，累計：${totalAfter} 小時（超過 ${totalAfter - workType.maxHours} 小時）`
        }
      }
    }

    // 驗證前置要求（基於當天總工時，符合勞基法）
    if (workType.requiresTypes && Array.isArray(workType.requiresTypes)) {
      const hasRequired = workType.requiresTypes.every(reqId => {
        return rows.some(r => {
          const rWorkTypeId = r.workTypeId || r.work_type_id
          return rWorkTypeId === reqId && r.hours && r.hours[dayIndex] > 0
        })
      })

      if (!hasRequired) {
        const requiredTypes = workType.requiresTypes.map(reqId => {
          const reqType = workTypes.find(wt => wt.id === reqId)
          return reqType ? reqType.name : `類型${reqId}`
        }).join('、')
        return {
          valid: false,
          error: `${dateDisplay}：使用「${workType.name}」前，請先填寫：${requiredTypes}`
        }
      }
    }

    // 驗證每日總工時上限（12 小時）
    const DAILY_MAX_HOURS = 12
    let existingDailyTotal = 0

    // 計算當天所有行的總工時（排除當前正在編輯的單元格）
    rows.forEach((r, idx) => {
      if (r.hours && r.hours[dayIndex]) {
        if (idx !== rowIndex) {
          existingDailyTotal += parseFloat(r.hours[dayIndex] || 0)
        }
      }
    })

    const newDailyTotal = existingDailyTotal + rounded

    if (newDailyTotal > DAILY_MAX_HOURS) {
      const remaining = DAILY_MAX_HOURS - existingDailyTotal
      return {
        valid: false,
        error: `${dateDisplay}：每日總工時不可超過 ${DAILY_MAX_HOURS} 小時。當日已有：${existingDailyTotal} 小時，嘗試新增：${rounded} 小時，累計總工時：${newDailyTotal} 小時（超過 ${newDailyTotal - DAILY_MAX_HOURS} 小時）。您最多還可以填 ${Math.max(0, remaining)} 小時`
      }
    }

    return { valid: true, error: null }
  }

  return {
    validateHoursInput,
    isWorkTypeAllowed,
    getAllowedWorkTypesForDate,
    getDayTypeText
  }
}



