/**
 * 薪資重新計算工具
 * 當影響薪資的事件發生時，自動重新計算並更新緩存
 */

import { calculateEmployeePayroll } from "./payroll-calculator.js";
import {
  getOvertimeDetails,
  calculateTransportAllowance,
  calculateLeaveDeductions,
  checkFullAttendance,
  getTimesheetMonthlyStats,
  shouldPayInMonth
} from "./payroll-helpers.js";
import {
  enqueuePayrollRecalc,
  fetchPendingRecalcQueue,
  markQueueProcessing,
  markQueueSuccess,
  markQueueError,
  clearPayrollRecalc
} from "./payroll-cache.js";
import { refreshReportCaches } from "../handlers/reports/precompute.js";

/**
 * 從日期獲取當月月份字符串 (YYYY-MM)
 * @param {Date|string} date - 日期對象或日期字符串 (YYYY-MM-DD)
 * @returns {string} 月份字符串
 */
export function getCurrentMonth(date = new Date()) {
  if (typeof date === 'string') {
    // 如果是字符串，提取前7個字符 (YYYY-MM)
    return date.substring(0, 7);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * 處理薪資重算佇列
 * @param {Object} env
 * @param {Object} options
 * @param {string|null} options.month 指定月份 (YYYY-MM)，預設處理全部
 * @param {number} options.limit 單次處理筆數
 * @param {string|null} options.requestId 追蹤用請求 ID
 * @returns {Promise<{processed: number, results: Array}>}
 */
export async function processPayrollRecalcQueue(
  env,
  { month = null, limit = 10, requestId = null, ctx = null } = {}
) {
  const queueEntries = await fetchPendingRecalcQueue(env, { month, limit });
  if (!queueEntries.length) {
    return { processed: 0, results: [] };
  }

  const results = [];
  const monthsToRefresh = new Set();

  for (const entry of queueEntries) {
    const queueId = entry.queue_id;
    const userId = Number(entry.user_id);
    const targetMonth = entry.year_month;

    try {
      await markQueueProcessing(env, queueId);
    } catch (err) {
      console.error("[PayrollRecalc] 標記處理中失敗:", err);
    }

    try {
      await calculateEmployeePayroll(env, userId, targetMonth);
      await markQueueSuccess(env, queueId, userId, targetMonth);
      results.push({ userId, month: targetMonth, status: "success" });
      monthsToRefresh.add(targetMonth);
    } catch (err) {
      const message = err?.message || String(err);
      console.error("[PayrollRecalc] 處理佇列失敗:", message, { userId, month: targetMonth, requestId });
      await markQueueError(env, queueId, userId, targetMonth, message);
      results.push({ userId, month: targetMonth, status: "error", error: message });
    }
  }

  if (monthsToRefresh.size > 0) {
    const years = new Set();
    for (const ym of monthsToRefresh) {
      const [year] = ym.split("-");
      years.add(Number(year));
    }
    await refreshReportCaches(env, ctx, {
      months: Array.from(monthsToRefresh),
      years: Array.from(years),
    });
  }

  return {
    processed: results.length,
    results,
  };
}

/**
 * 增量更新薪資緩存（只重新計算受影響的項目）
 * @param {Object} env - Cloudflare 環境變量
 * @param {number} userId - 員工 ID
 * @param {string} month - 月份 (YYYY-MM)
 * @param {string} affectedType - 受影響的類型：'overtime' | 'leave' | 'trip'
 */
export async function incrementalUpdatePayrollCache(env, userId, month, affectedType) {
  try {
    console.log(`[PayrollRecalculate] 增量更新員工 ${userId} ${month} 的薪資（${affectedType}）`);
    
    // 1. 讀取現有緩存數據
    const cached = await env.DATABASE.prepare(
      `SELECT * FROM PayrollCache WHERE user_id = ? AND year_month = ?`
    ).bind(userId, month).first();
    
    if (!cached) {
      // 如果沒有緩存，執行完整計算
      console.log(`[PayrollRecalculate] 無緩存數據，執行完整計算`);
      return await recalculateEmployeePayroll(env, userId, month);
    }
    
    // 2. 讀取員工基本信息
    const user = await env.DATABASE.prepare(
      `SELECT user_id, username, name, base_salary FROM Users WHERE user_id = ? AND is_deleted = 0`
    ).bind(userId).first();
    
    if (!user) {
      return false;
    }
    
    const baseSalaryCents = Math.round((user.base_salary || 0) * 100);
    
    // 3. 讀取該月有效的薪資項目（用於計算全勤獎金和請假扣款）
    const [year, monthNum] = month.split('-');
    const firstDay = `${year}-${monthNum}-01`;
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
    
    const salaryItems = await env.DATABASE.prepare(`
      SELECT 
        esi.amount_cents,
        esi.recurring_type,
        esi.recurring_months,
        esi.effective_date,
        esi.expiry_date,
        sit.category,
        sit.item_name,
        sit.item_code
      FROM EmployeeSalaryItems esi
      JOIN SalaryItemTypes sit ON sit.item_type_id = esi.item_type_id
      WHERE esi.user_id = ?
        AND esi.is_active = 1
        AND sit.is_active = 1
        AND esi.effective_date <= ?
        AND (esi.expiry_date IS NULL OR esi.expiry_date >= ?)
    `).bind(userId, lastDayStr, firstDay).all();
    
    // 計算經常性給與（用於請假扣款）
    let totalRegularAllowanceCents = 0;
    let totalRegularBonusCents = 0;
    let hasFullAttendanceBonus = false;
    
    for (const item of (salaryItems?.results || [])) {
      let shouldPay = true;
      try {
        const recurringType = item.recurring_type || 'monthly';
        shouldPay = shouldPayInMonth(
          recurringType,
          item.recurring_months,
          item.effective_date,
          item.expiry_date,
          month
        );
      } catch (err) {
        console.error('[PayrollRecalculate] shouldPayInMonth failed:', err, item);
      }
      if (!shouldPay) continue;
      
      if (item.category === 'allowance' && item.recurring_type === 'monthly') {
        totalRegularAllowanceCents += item.amount_cents || 0;
      } else if (item.category === 'bonus' && item.recurring_type === 'monthly') {
        totalRegularBonusCents += item.amount_cents || 0;
        if (item.item_code === 'FULL_ATTENDANCE') {
          hasFullAttendanceBonus = true;
        }
      }
    }
    
    // 4. 根據受影響類型，重新計算對應項目
    // 從緩存讀取現有值
    let overtimeCents = cached.overtime_cents || 0;
    let transportCents = cached.transport_cents || 0;
    let leaveDeductionCents = cached.leave_deduction_cents || 0;
    let totalRegularBonusCentsUpdated = cached.total_regular_bonus_cents || 0;
    let totalOvertimeHours = cached.total_overtime_hours || 0;
    let totalWorkHours = cached.total_work_hours || 0;
    
    if (affectedType === 'overtime') {
      // 重新計算加班費
      const overtimeDetails = await getOvertimeDetails(env, userId, month);
      const hourlyRateCents = Math.round((baseSalaryCents + totalRegularAllowanceCents) / 240);
      
      // 計算未使用補休轉加班費
      let totalCompHoursGenerated = 0;
      const compGenerationDetails = [];
      
      for (const day of overtimeDetails.dailyOvertime) {
        for (const item of day.items) {
          totalCompHoursGenerated += item.compHoursGenerated;
          compGenerationDetails.push({
            date: day.date,
            workType: item.workType,
            hours: item.compHoursGenerated,
            multiplier: item.multiplier
          });
        }
      }
      
      const totalCompHoursUsed = overtimeDetails.totalCompHoursUsed;
      const unusedCompHours = Math.max(0, totalCompHoursGenerated - totalCompHoursUsed);
      
      let expiredCompPayCents = 0;
      let remainingToConvert = unusedCompHours;
      
      for (const detail of compGenerationDetails) {
        if (remainingToConvert <= 0) break;
        const hoursToConvert = Math.min(detail.hours, remainingToConvert);
        const amountCents = Math.round(hoursToConvert * hourlyRateCents * detail.multiplier);
        expiredCompPayCents += amountCents;
        remainingToConvert -= hoursToConvert;
      }
      
      overtimeCents = expiredCompPayCents;
      
      // 更新工時統計
      const timesheetStats = await getTimesheetMonthlyStats(env, userId, month);
      totalOvertimeHours = overtimeDetails.totalOvertimeHours || 0;
      totalWorkHours = timesheetStats?.total_hours || 0;
      
      // 如果影響全勤，重新計算全勤獎金
      if (hasFullAttendanceBonus) {
        const isFullAttendance = await checkFullAttendance(env, userId, month);
        const fullAttendanceItem = (salaryItems?.results || []).find(item => 
          item.item_code === 'FULL_ATTENDANCE' && item.recurring_type === 'monthly'
        );
        if (fullAttendanceItem) {
          let shouldPay = true;
          try {
            const recurringType = fullAttendanceItem.recurring_type || 'monthly';
            shouldPay = shouldPayInMonth(
              recurringType,
              fullAttendanceItem.recurring_months,
              fullAttendanceItem.effective_date,
              fullAttendanceItem.expiry_date,
              month
            );
          } catch (err) {
            console.error('[PayrollRecalculate] shouldPayInMonth failed for full attendance:', err, fullAttendanceItem);
          }
          if (shouldPay && isFullAttendance) {
            totalRegularBonusCentsUpdated = totalRegularBonusCents;
          } else if (shouldPay && !isFullAttendance) {
            totalRegularBonusCentsUpdated = totalRegularBonusCents - (fullAttendanceItem.amount_cents || 0);
          }
        }
      }
    } else if (affectedType === 'leave') {
      // 重新計算請假扣款和全勤獎金
      const leaveResult = await calculateLeaveDeductions(env, userId, month, baseSalaryCents, totalRegularAllowanceCents);
      leaveDeductionCents = leaveResult.leaveDeductionCents;
      
      // 重新計算全勤獎金
      if (hasFullAttendanceBonus) {
        const isFullAttendance = await checkFullAttendance(env, userId, month);
        const fullAttendanceItem = (salaryItems?.results || []).find(item => 
          item.item_code === 'FULL_ATTENDANCE' && item.recurring_type === 'monthly'
        );
        if (fullAttendanceItem) {
          let shouldPay = true;
          try {
            const recurringType = fullAttendanceItem.recurring_type || 'monthly';
            shouldPay = shouldPayInMonth(
              recurringType,
              fullAttendanceItem.recurring_months,
              fullAttendanceItem.effective_date,
              fullAttendanceItem.expiry_date,
              month
            );
          } catch (err) {
            console.error('[PayrollRecalculate] shouldPayInMonth failed for full attendance:', err, fullAttendanceItem);
          }
          if (shouldPay && isFullAttendance) {
            totalRegularBonusCentsUpdated = totalRegularBonusCents;
          } else if (shouldPay && !isFullAttendance) {
            totalRegularBonusCentsUpdated = totalRegularBonusCents - (fullAttendanceItem.amount_cents || 0);
          }
        }
      }
    } else if (affectedType === 'trip') {
      // 重新計算交通補貼
      const transportResult = await calculateTransportAllowance(env, userId, month);
      transportCents = transportResult.transportCents;
    }
    
    // 5. 重新計算總計（使用緩存中的其他數據）
    const cachedTotalRegularAllowanceCents = cached.total_regular_allowance_cents || 0;
    const cachedTotalIrregularAllowanceCents = cached.total_irregular_allowance_cents || 0;
    const performanceBonusCents = cached.performance_bonus_cents || 0;
    const yearEndBonusCents = cached.year_end_bonus_cents || 0;
    const mealAllowanceCents = cached.meal_allowance_cents || 0;
    const deductionCents = cached.deduction_cents || 0;
    
    // 應發 = 底薪 + 加給 + 津貼 + 獎金 + 年終 + 績效 + 加班費 + 誤餐費 + 交通補貼
    const grossSalaryCents = baseSalaryCents +
      cachedTotalRegularAllowanceCents +
      cachedTotalIrregularAllowanceCents +
      totalRegularBonusCentsUpdated +
      yearEndBonusCents +
      performanceBonusCents +
      overtimeCents +
      mealAllowanceCents +
      transportCents;
    
    // 總扣款 = 固定扣款 + 請假扣款
    const totalDeductionCents = deductionCents + leaveDeductionCents;
    
    // 實發 = 應發 - 總扣款
    const netSalaryCents = grossSalaryCents - totalDeductionCents;
    
    // 6. 更新緩存（只更新受影響的欄位）
    const updateFields = [];
    const updateValues = [];
    
    if (affectedType === 'overtime') {
      updateFields.push('overtime_cents = ?', 'total_overtime_hours = ?', 'total_work_hours = ?');
      updateValues.push(overtimeCents, totalOvertimeHours, totalWorkHours);
    } else if (affectedType === 'leave') {
      updateFields.push('leave_deduction_cents = ?', 'total_regular_bonus_cents = ?');
      updateValues.push(leaveDeductionCents, totalRegularBonusCentsUpdated);
    } else if (affectedType === 'trip') {
      updateFields.push('transport_cents = ?');
      updateValues.push(transportCents);
    }
    
    updateFields.push('gross_salary_cents = ?', 'net_salary_cents = ?', 'last_calculated_at = datetime(\'now\')');
    updateValues.push(grossSalaryCents, netSalaryCents, userId, month);
    
    await env.DATABASE.prepare(`
      UPDATE PayrollCache SET
        ${updateFields.join(', ')}
      WHERE user_id = ? AND year_month = ?
    `).bind(...updateValues).run();
    
    console.log(`[PayrollRecalculate] 增量更新完成：${affectedType}`);
    return true;
  } catch (err) {
    console.error(`[PayrollRecalculate] 增量更新失敗:`, err);
    // 如果增量更新失敗，回退到完整計算
    return await recalculateEmployeePayroll(env, userId, month);
  }
}

/**
 * 重新計算指定員工當月薪資並更新緩存
 * @param {Object} env - Cloudflare 環境變量
 * @param {number} userId - 員工 ID
 * @param {string} month - 月份 (YYYY-MM)
 */
export async function recalculateEmployeePayroll(env, userId, month) {
  try {
    console.log(`[PayrollRecalculate] 重新計算員工 ${userId} ${month} 的薪資`);
    const payroll = await calculateEmployeePayroll(env, userId, month);
    if (payroll) {
      console.log(`[PayrollRecalculate] 員工 ${userId} ${month} 薪資重新計算完成`);
      try {
        await clearPayrollRecalc(env, userId, month);
      } catch (err) {
        console.error("[PayrollRecalc] 清除佇列失敗:", err);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[PayrollRecalculate] 重新計算員工 ${userId} ${month} 薪資失敗:`, err);
    return false;
  }
}

/**
 * 批量重新計算所有員工當月薪資並更新緩存
 * @param {Object} env - Cloudflare 環境變量
 * @param {string} month - 月份 (YYYY-MM)
 */
export async function recalculateAllEmployeesPayroll(env, month) {
  try {
    console.log(`[PayrollRecalculate] 開始批量重新計算 ${month} 所有員工薪資`);
    
    // 獲取所有員工
    const users = await env.DATABASE.prepare(
      `SELECT user_id FROM Users WHERE is_deleted = 0`
    ).all();
    
    const results = [];
    for (const userRow of (users?.results || [])) {
      try {
        const success = await recalculateEmployeePayroll(env, userRow.user_id, month);
        results.push({ userId: userRow.user_id, success });
      } catch (err) {
        console.error(`[PayrollRecalculate] 計算員工 ${userRow.user_id} 失敗:`, err);
        results.push({ userId: userRow.user_id, success: false, error: String(err) });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`[PayrollRecalculate] 批量重新計算完成: ${successCount}/${results.length} 成功`);
    
    if (results.length > 0) {
      const [yearStr] = month.split("-");
      await refreshReportCaches(env, null, {
        months: [month],
        years: [Number(yearStr)],
      });
    }

    return {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
      results
    };
  } catch (err) {
    console.error(`[PayrollRecalculate] 批量重新計算失敗:`, err);
    throw err;
  }
}

/**
 * 觸發重新計算薪資（異步執行，不阻塞響應）
 * @param {Object} env - Cloudflare 環境變量
 * @param {number} userId - 員工 ID
 * @param {Date|string} date - 日期對象或日期字符串
 * @param {Object} ctx - Cloudflare 上下文（用於 waitUntil）
 * @param {string} affectedType - 受影響的類型：'overtime' | 'leave' | 'trip'
 */
export function triggerPayrollRecalculation(env, userId, date, ctx = null, affectedType = null) {
  const month = getCurrentMonth(date);
  const reason = affectedType || "update";

  const enqueuePromise = enqueuePayrollRecalc(env, userId, month, reason).catch((err) => {
    console.error("[PayrollRecalc] 加入重算佇列失敗:", err);
  });

  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(
      (async () => {
        await enqueuePromise;
        await processPayrollRecalcQueue(env, { month, limit: 3, ctx });
      })()
    );
  }

  return enqueuePromise;
}

