/**
 * 完整的薪资计算函数
 */

import {
  shouldPayInMonth,
  calculateHourlyRate,
  getTimesheetMonthlyStats,
  getOvertimeDetails,
  calculateMealAllowance,
  calculateTransportAllowance,
  calculateLeaveDeductions,
  checkFullAttendance
} from "./payroll-helpers.js";
import { getSettingValue } from "./settings.js";
import { upsertPayrollCache } from "./payroll-cache.js";

/**
 * 计算单个员工的月度薪资
 */
export async function calculateEmployeePayroll(env, userId, month) {
  // 1. 读取员工基本信息
  const user = await env.DATABASE.prepare(
    `SELECT user_id, username, name, base_salary FROM Users WHERE user_id = ? AND is_deleted = 0`
  ).bind(userId).first();

  if (!user) {
    return null;
  }

  const baseSalaryCents = Math.round((user.base_salary || 0) * 100); // 转换为分

  // 2. 计算该月的日期范围
  const [year, monthNum] = month.split('-');
  const firstDay = `${year}-${monthNum}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

  // 2.1 计算未使用补休转加班费
  const overtimeDetails = await getOvertimeDetails(env, userId, month);

  // 计算本月产生的补休总时数
  let totalCompHoursGenerated = 0;
  const compGenerationDetails = [];

  for (const day of overtimeDetails.dailyOvertime) {
    for (const item of day.items) {
      totalCompHoursGenerated += item.compHoursGenerated;
      compGenerationDetails.push({
        date: day.date,
        workType: item.workType,
        workTypeId: item.workTypeId,
        hours: item.compHoursGenerated,
        multiplier: item.multiplier,
        isFixedType: item.isFixedType
      });
    }
  }

  const totalCompHoursUsed = overtimeDetails.totalCompHoursUsed;
  const unusedCompHours = Math.max(0, totalCompHoursGenerated - totalCompHoursUsed);

  // 3. 读取该月有效的薪资项目
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

  // 3.1 查询年终奖金
  const [yearStr] = month.split('-');
  const yearEndBonusData = await env.DATABASE.prepare(`
    SELECT amount_cents, payment_month, notes
    FROM YearEndBonus
    WHERE user_id = ? AND year = ? AND amount_cents > 0 AND payment_month = ?
  `).bind(userId, parseInt(yearStr), month).first();

  // 3.2 分类薪资项目
  const regularAllowanceItems = [];
  const irregularAllowanceItems = [];
  const regularBonusItems = [];
  const yearEndBonusItems = [];
  const deductionItems = [];

  if (yearEndBonusData && yearEndBonusData.amount_cents > 0) {
    yearEndBonusItems.push({
      name: '年終獎金',
      amountCents: yearEndBonusData.amount_cents,
      itemCode: 'YEAR_END',
      isFullAttendanceBonus: false,
      shouldPay: true,
      notes: yearEndBonusData.notes || ''
    });
  }

  const items = salaryItems.results || [];
  for (const item of items) {
    try {
      // 判斷是否應該在當月發放（參考舊系統：有錯誤處理）
      const recurringType = item.recurring_type || 'monthly';
      const shouldPay = shouldPayInMonth(
        recurringType,
        item.recurring_months,
        item.effective_date,
        item.expiry_date,
        month
      );

      if (!shouldPay) {
        continue; // 不在發放月份，跳過
      }
    } catch (error) {
      console.error('[calculateEmployeePayroll] Error checking recurring:', error, item);
      // 如果判斷失敗，默認發放（向下兼容，參考舊系統）
    }

    const amount = item.amount_cents || 0;

    if (item.category === 'deduction') {
      deductionItems.push({
        name: item.item_name,
        amountCents: amount,
        itemCode: item.item_code || ''
      });
    } else if (item.category === 'regular_allowance') {
      regularAllowanceItems.push({
        name: item.item_name,
        amountCents: amount,
        itemCode: item.item_code || ''
      });
    } else if (item.category === 'irregular_allowance') {
      irregularAllowanceItems.push({
        name: item.item_name,
        amountCents: amount,
        itemCode: item.item_code || ''
      });
    } else if (item.category === 'year_end_bonus') {
      yearEndBonusItems.push({
        name: item.item_name,
        amountCents: amount,
        itemCode: item.item_code || '',
        isFullAttendanceBonus: false
      });
    } else if (item.category === 'bonus') {
      if (item.item_code === 'PERFORMANCE') {
        continue; // 绩效奖金单独处理
      }

      const isYearEndBonus = item.item_name && (
        item.item_name.includes('年終') || item.item_name.includes('年终')
      );

      const isFullAttendanceBonus =
        (item.item_code && item.item_code.toUpperCase().includes('FULL')) ||
        (item.item_name && item.item_name.includes('全勤'));

      const bonusItem = {
        name: item.item_name,
        amountCents: amount,
        itemCode: item.item_code || '',
        isFullAttendanceBonus: isFullAttendanceBonus
      };

      if (isYearEndBonus) {
        yearEndBonusItems.push({
          ...bonusItem,
          isFullAttendanceBonus: false
        });
      } else {
        regularBonusItems.push(bonusItem);
      }
    } else if (item.category === 'allowance') {
      irregularAllowanceItems.push({
        name: item.item_name,
        amountCents: amount,
        itemCode: item.item_code || ''
      });
    }
  }

  // 4. 计算时薪基准
  const hourlyRateCents = await calculateHourlyRate(env, baseSalaryCents);

  // 5. 判定全勤
  const isFullAttendance = await checkFullAttendance(env, userId, month);

  // 5.1 标记全勤奖金是否发放
  for (const bonusItem of regularBonusItems) {
    if (bonusItem.isFullAttendanceBonus) {
      bonusItem.shouldPay = isFullAttendance;
    } else {
      bonusItem.shouldPay = true;
    }
  }

  for (const bonusItem of yearEndBonusItems) {
    bonusItem.shouldPay = true;
  }

  // 5.2 使用时薪计算未使用补休转加班费
  let expiredCompPayCents = 0;
  let remainingToConvert = unusedCompHours;
  const expiredCompDetails = [];

  for (const detail of compGenerationDetails) {
    if (remainingToConvert <= 0) break;

    const hoursToConvert = Math.min(detail.hours, remainingToConvert);
    const amountCents = Math.round(hoursToConvert * hourlyRateCents * detail.multiplier);

    expiredCompPayCents += amountCents;
    remainingToConvert -= hoursToConvert;

    expiredCompDetails.push({
      date: detail.date,
      workType: detail.workType,
      hours: hoursToConvert,
      multiplier: detail.multiplier,
      amountCents: amountCents
    });
  }

  // 6. 计算误餐费
  const mealResult = await calculateMealAllowance(env, userId, month);
  const mealAllowanceCents = mealResult.mealAllowanceCents;
  const overtimeDays = mealResult.overtimeDays;
  const mealAllowanceDays = mealResult.mealAllowanceDays || [];

  // 7. 从工时统计读取加权工时
  const timesheetStats = await getTimesheetMonthlyStats(env, userId, month);
  const weightedHours = timesheetStats?.weighted_hours || 0;
  const effectiveWeightedHours = overtimeDetails.effectiveTotalWeightedHours || 0;

  // 加班费 = 未使用补休转加班费
  const overtimeCents = expiredCompPayCents;

  // 8. 计算交通补贴
  const transportResult = await calculateTransportAllowance(env, userId, month);
  const transportCents = transportResult.transportCents;
  const totalKm = transportResult.totalKm;
  const transportIntervals = transportResult.intervals || 0;
  const tripDetails = transportResult.tripDetails || [];

  // 9. 计算请假扣款（參考舊系統：只用底薪，傳入 0）
  const leaveResult = await calculateLeaveDeductions(env, userId, month, baseSalaryCents, 0);
  const leaveDeductionCents = leaveResult.leaveDeductionCents;
  const sickDays = leaveResult.sickDays;
  const personalDays = leaveResult.personalDays;
  const menstrualDays = leaveResult.menstrualDays || 0;
  const sickHours = leaveResult.sickHours || 0;
  const personalHours = leaveResult.personalHours || 0;
  const menstrualHours = leaveResult.menstrualHours || 0;
  const menstrualFreeDays = leaveResult.menstrualFreeDays || 0;
  const menstrualMergedDays = leaveResult.menstrualMergedDays || 0;
  const dailySalaryCents = leaveResult.dailySalaryCents || 0;
  const leaveDetails = leaveResult.leaveDetails || [];

  // 11. 检查绩效奖金调整
  const bonusAdjustment = await env.DATABASE.prepare(`
    SELECT bonus_amount_cents 
    FROM MonthlyBonusAdjustments 
    WHERE user_id = ? AND month = ?
  `).bind(userId, month).first();

  let performanceBonusCents = 0;
  if (bonusAdjustment) {
    performanceBonusCents = bonusAdjustment.bonus_amount_cents || 0;
  } else {
    const perfItem = items.find(i => i.item_code === 'PERFORMANCE');
    if (perfItem) {
      performanceBonusCents = perfItem.amount_cents || 0;
    }
  }

  // 12. 计算总薪资
  // 12.1 计算经常性给与总额
  let totalRegularAllowanceCents = 0;
  for (const item of regularAllowanceItems) {
    totalRegularAllowanceCents += item.amountCents || 0;
  }

  let totalIrregularAllowanceCents = 0;
  for (const item of irregularAllowanceItems) {
    totalIrregularAllowanceCents += item.amountCents || 0;
  }

  let totalRegularBonusCents = 0;
  for (const bonusItem of regularBonusItems) {
    if (bonusItem.shouldPay) {
      totalRegularBonusCents += bonusItem.amountCents || 0;
    }
  }

  let totalYearEndBonusCents = 0;
  for (const bonusItem of yearEndBonusItems) {
    totalYearEndBonusCents += bonusItem.amountCents || 0;
  }

  let deductionCents = 0;
  for (const item of deductionItems) {
    deductionCents += item.amountCents || 0;
  }

  // 应发 = 底薪 + 加给 + 津贴 + 奖金 + 年终 + 绩效 + 加班费 + 补助
  const grossSalaryCents = baseSalaryCents +
    totalRegularAllowanceCents +
    totalIrregularAllowanceCents +
    totalRegularBonusCents +
    totalYearEndBonusCents +
    performanceBonusCents +
    overtimeCents +
    mealAllowanceCents +
    transportCents;

  // 总扣款 = 固定扣款 + 请假扣款
  const totalDeductionCents = deductionCents + leaveDeductionCents;

  // 实发 = 应发 - 总扣款
  const netSalaryCents = grossSalaryCents - totalDeductionCents;

  // 保存到缓存表
  const payrollResult = {
    userId: user.user_id,
    username: user.username,
    name: user.name,
    baseSalaryCents,

    // 新的分类数据结构
    regularAllowanceItems,
    irregularAllowanceItems,
    regularBonusItems,
    yearEndBonusItems,
    deductionItems,

    // 各项总额
    totalRegularAllowanceCents,
    totalIrregularAllowanceCents,
    totalRegularBonusCents,
    totalYearEndBonusCents,

    // 其他收入
    overtimeCents,
    mealAllowanceCents,
    transportCents,
    performanceBonusCents,

    // 扣款
    deductionCents,
    leaveDeductionCents,
    totalDeductionCents,

    // 汇总
    grossSalaryCents,
    netSalaryCents,

    // 状态
    isFullAttendance,
    hourlyRateCents,

    // 附加信息
    overtimeDays,
    mealAllowanceDays,
    weightedHours,
    effectiveWeightedHours,
    totalWorkHours: timesheetStats?.total_hours || 0,
    totalOvertimeHours: overtimeDetails?.totalOvertimeHours || 0,
    dailyOvertime: overtimeDetails.dailyOvertime,
    totalCompHoursGenerated,
    totalCompHoursUsed,
    unusedCompHours,
    expiredCompPayCents,
    expiredCompDetails,
    tripDetails,
    totalKm,
    transportIntervals,
    sickDays,
    personalDays,
    menstrualDays,
    sickHours,
    personalHours,
    menstrualHours,
    menstrualFreeDays,
    menstrualMergedDays,
    dailySalaryCents,
    leaveDetails,
  };

  try {
    await upsertPayrollCache(env, user.user_id, month, payrollResult);
  } catch (cacheErr) {
    console.error('[PayrollCache] 保存缓存失败:', cacheErr);
  }

  return payrollResult;
}

