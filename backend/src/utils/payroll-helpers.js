/**
 * 薪资计算辅助函数
 */

import { getSettingValue, getPayrollSettingValue } from "./settings.js";

/**
 * 判断薪资项目是否应该在指定月份发放
 */
export function shouldPayInMonth(recurringType, recurringMonths, effectiveDate, expiryDate, targetMonth) {
  const [targetYear, targetMonthNum] = targetMonth.split('-');
  const currentMonthInt = parseInt(targetMonthNum);
  
  // 检查是否在有效期内
  const firstDay = `${targetYear}-${targetMonthNum}-01`;
  const lastDay = new Date(parseInt(targetYear), parseInt(targetMonthNum), 0).getDate();
  const lastDayStr = `${targetYear}-${targetMonthNum}-${String(lastDay).padStart(2, '0')}`;
  
  if (effectiveDate > lastDayStr) return false; // 还未生效
  if (expiryDate && expiryDate < firstDay) return false; // 已过期
  
  // 根据循环类型判断
  if (recurringType === 'monthly') {
    return true; // 每月都发放
  }
  
  if (recurringType === 'once') {
    // 仅一次：只在生效月份发放
    const [effYear, effMonth] = effectiveDate.split('-');
    return effYear === targetYear && effMonth === targetMonthNum;
  }
  
  if (recurringType === 'yearly') {
    // 每年指定月份：检查当前月份是否在列表中
    if (!recurringMonths) return false;
    try {
      const months = JSON.parse(recurringMonths);
      return Array.isArray(months) && months.includes(currentMonthInt);
    } catch (e) {
      console.error('Invalid recurring_months JSON:', recurringMonths);
      return false;
    }
  }
  
  return false;
}

/**
 * 计算员工的时薪基准
 */
export async function calculateHourlyRate(env, baseSalaryCents) {
  const divisor = await getSettingValue(env, 'hourly_rate_divisor', 240);
  return Math.round(baseSalaryCents / divisor); // 四舍五入到整数（分）
}

/**
 * 读取工时月度统计数据
 */
export async function getTimesheetMonthlyStats(env, userId, month) {
  const [year, monthNum] = month.split('-');
  const firstDay = `${year}-${monthNum}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
  
  const timelogs = await env.DATABASE.prepare(`
    SELECT work_date, work_type, hours
    FROM Timesheets
    WHERE user_id = ?
      AND work_date >= ?
      AND work_date <= ?
      AND is_deleted = 0
    ORDER BY work_date, work_type
  `).bind(userId, firstDay, lastDayStr).all();
  
  // 工时类型定义
  const WORK_TYPES = {
    1: { multiplier: 1.0, isOvertime: false, standard: 'regular' },
    2: { multiplier: 1.34, isOvertime: true, standard: null },
    3: { multiplier: 1.67, isOvertime: true, standard: null },
    4: { multiplier: 1.34, isOvertime: true, standard: null },
    5: { multiplier: 1.67, isOvertime: true, standard: null },
    6: { multiplier: 2.67, isOvertime: true, standard: null },
    7: { multiplier: 1.0, isOvertime: true, special: 'fixed_8h', standard: 'fixed' },
    8: { multiplier: 1.34, isOvertime: true, standard: null },
    9: { multiplier: 1.67, isOvertime: true, standard: null },
    10: { multiplier: 1.0, isOvertime: true, special: 'fixed_8h', standard: 'fixed' },
    11: { multiplier: 1.34, isOvertime: true, standard: null },
    12: { multiplier: 1.67, isOvertime: true, standard: null },
  };

  // 统计 fixed_8h 类型的每日总工时，供標準工時一次性取 8 小時
  const dailyFixedTypeMap = new Map();
  for (const log of (timelogs.results || [])) {
    const date = log.work_date;
    const workTypeId = parseInt(log.work_type) || 1;
    const workType = WORK_TYPES[workTypeId];
    const hours = parseFloat(log.hours) || 0;
    
    if (workType && workType.special === 'fixed_8h') {
      const key = `${date}:${workTypeId}`;
      const current = dailyFixedTypeMap.get(key) || 0;
      dailyFixedTypeMap.set(key, current + hours);
    }
  }
  
  // 计算总工时、加班工时、加权工时
  let totalHours = 0;
  let overtimeHours = 0;
  let weightedHours = 0;
  let standardHours = 0;
  const processedFixedKeys = new Set();
  const processedStandardFixedKeys = new Set();
  
  for (const log of (timelogs.results || [])) {
    const date = log.work_date;
    const hours = parseFloat(log.hours) || 0;
    const workTypeId = parseInt(log.work_type) || 1;
    const workType = WORK_TYPES[workTypeId];
    
    if (workType) {
      totalHours += hours;
      if (workType.isOvertime) {
        overtimeHours += hours;
      }
      
      // 標準工時：僅計入一般工時與固定 8 小時班別
      if (workType.standard === 'regular') {
        standardHours += hours;
      } else if (workType.standard === 'fixed') {
        const key = `${date}:${workTypeId}`;
        if (!processedStandardFixedKeys.has(key)) {
          const fixedTotal = dailyFixedTypeMap.get(key) || hours;
          standardHours += Math.min(fixedTotal, 8);
          processedStandardFixedKeys.add(key);
        }
      }

      // 计算加权工时
      if (workType.special === 'fixed_8h') {
        const key = `${date}:${workTypeId}`;
        if (!processedFixedKeys.has(key)) {
          weightedHours += 8.0; // 固定8h加权
          processedFixedKeys.add(key);
        }
      } else {
        weightedHours += hours * workType.multiplier;
      }
    }
  }
  
  return {
    total_hours: Math.round(totalHours * 100) / 100,
    overtime_hours: Math.round(overtimeHours * 100) / 100,
    weighted_hours: Math.round(weightedHours * 100) / 100,
    standard_hours: Math.round(standardHours * 100) / 100,
  };
}

/**
 * 计算误餐费
 */
export async function calculateMealAllowance(env, userId, month) {
  const [year, monthNum] = month.split('-');
  const firstDay = `${year}-${monthNum}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
  
  const minOvertimeHours = await getPayrollSettingValue(env, 'meal_allowance_min_overtime_hours', 1.5);
  
  const timesheets = await env.DATABASE.prepare(`
    SELECT work_date, SUM(hours) as daily_overtime_hours
    FROM Timesheets
    WHERE user_id = ?
      AND work_date >= ?
      AND work_date <= ?
      AND work_type = '2'
      AND is_deleted = 0
    GROUP BY work_date
  `).bind(userId, firstDay, lastDayStr).all();
  
  let mealAllowanceCount = 0;
  const mealAllowanceDays = [];
  
  for (const ts of (timesheets.results || [])) {
    const dailyHours = parseFloat(ts.daily_overtime_hours) || 0;
    if (dailyHours >= minOvertimeHours) {
      mealAllowanceCount++;
      mealAllowanceDays.push({
        date: ts.work_date,
        hours: dailyHours
      });
    }
  }
  
  const mealAllowancePerTime = await getPayrollSettingValue(env, 'meal_allowance_per_time', 100);
  const mealAllowanceCents = mealAllowanceCount * (mealAllowancePerTime * 100);
  
  return {
    mealAllowanceCents,
    overtimeDays: mealAllowanceCount,
    mealAllowanceDays
  };
}

/**
 * 计算交通补贴
 */
export async function calculateTransportAllowance(env, userId, month) {
  const [year, monthNum] = month.split('-');
  const firstDay = `${year}-${monthNum}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
  
  const tripsResult = await env.DATABASE.prepare(`
    SELECT trip_date, destination, distance_km, purpose
    FROM BusinessTrips
    WHERE user_id = ?
      AND trip_date >= ?
      AND trip_date <= ?
      AND status = 'approved'
      AND is_deleted = 0
    ORDER BY trip_date
  `).bind(userId, firstDay, lastDayStr).all();
  
  const trips = tripsResult.results || [];
  const amountPerInterval = await getPayrollSettingValue(env, 'transport_amount_per_interval', 60);
  const kmPerInterval = await getPayrollSettingValue(env, 'transport_km_per_interval', 5);
  
  let totalKm = 0;
  let totalIntervals = 0;
  const tripDetails = [];
  
  for (const trip of trips) {
    const km = trip.distance_km || 0;
    const intervals = km > 0 ? Math.ceil(km / kmPerInterval) : 0;
    totalKm += km;
    totalIntervals += intervals;
    
    tripDetails.push({
      date: trip.trip_date,
      destination: trip.destination,
      distance: km,
      purpose: trip.purpose,
      intervals: intervals,
      amount: intervals * amountPerInterval
    });
  }
  
  const transportCents = totalIntervals * amountPerInterval * 100;
  
  return {
    transportCents,
    totalKm,
    intervals: totalIntervals,
    tripDetails
  };
}

/**
 * 判定是否全勤
 */
export async function checkFullAttendance(env, userId, month) {
  const [year, monthNum] = month.split('-');
  const firstDay = `${year}-${monthNum}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
  
  const leaves = await env.DATABASE.prepare(`
    SELECT COUNT(*) as count
    FROM LeaveRequests
    WHERE user_id = ?
      AND start_date <= ?
      AND end_date >= ?
      AND status IN ('approved', 'pending')
      AND leave_type IN ('sick', 'personal')
  `).bind(userId, lastDayStr, firstDay).first();
  
  return (leaves?.count || 0) === 0;
}

/**
 * 获取加班明细（按日期+类型显示，考虑补休扣减）
 */
export async function getOvertimeDetails(env, userId, month) {
  const [year, monthNum] = month.split('-');
  const firstDay = `${year}-${monthNum}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
  
  // 查询当月国定假日
  const holidays = await env.DATABASE.prepare(`
    SELECT holiday_date, name
    FROM Holidays
    WHERE holiday_date >= ? AND holiday_date <= ?
  `).bind(firstDay, lastDayStr).all();
  
  const holidayMap = {};
  for (const h of (holidays.results || [])) {
    holidayMap[h.holiday_date] = h.name;
  }
  
  // 工时类型定义
  const WORK_TYPES = {
    1: { name: '正常工時', multiplier: 1.0, isOvertime: false },
    2: { name: '平日加班（前2h）', multiplier: 1.34, isOvertime: true },
    3: { name: '平日加班（後2h）', multiplier: 1.67, isOvertime: true },
    4: { name: '休息日（前2h）', multiplier: 1.34, isOvertime: true },
    5: { name: '休息日（3-8h）', multiplier: 1.67, isOvertime: true },
    6: { name: '休息日（9-12h）', multiplier: 2.67, isOvertime: true },
    7: { name: '國定假日（8h內）', multiplier: 1.0, isOvertime: true, special: 'fixed_8h' },
    8: { name: '國定假日（9-10h）', multiplier: 1.34, isOvertime: true },
    9: { name: '國定假日（11-12h）', multiplier: 1.67, isOvertime: true },
    10: { name: '例假日（8h內）', multiplier: 1.0, isOvertime: true, special: 'fixed_8h' },
    11: { name: '例假日（9-10h）', multiplier: 1.34, isOvertime: true },
    12: { name: '例假日（11-12h）', multiplier: 1.67, isOvertime: true },
  };
  
  // 查询每日加班记录
  const timelogs = await env.DATABASE.prepare(`
    SELECT work_date, work_type, hours
    FROM Timesheets
    WHERE user_id = ? AND work_date >= ? AND work_date <= ? AND is_deleted = 0
    ORDER BY work_date, work_type
  `).bind(userId, firstDay, lastDayStr).all();
  
  // 查询补休使用记录
  const compLeaves = await env.DATABASE.prepare(`
    SELECT start_date, amount, unit
    FROM LeaveRequests
    WHERE user_id = ? AND leave_type = 'compensatory' AND status = 'approved'
      AND start_date >= ? AND start_date <= ? AND is_deleted = 0
    ORDER BY start_date
  `).bind(userId, firstDay, lastDayStr).all();
  
  // 按日期+类型分组，计算fixed_8h类型的总工时
  const dailyFixedTypeMap = {};
  for (const log of (timelogs.results || [])) {
    const date = log.work_date;
    const workTypeId = parseInt(log.work_type) || 1;
    const workType = WORK_TYPES[workTypeId];
    const hours = parseFloat(log.hours) || 0;
    
    if (workType && workType.isOvertime && workType.special === 'fixed_8h') {
      const key = `${date}:${workTypeId}`;
      if (!dailyFixedTypeMap[key]) {
        dailyFixedTypeMap[key] = { totalHours: 0, records: [] };
      }
      dailyFixedTypeMap[key].totalHours += hours;
      dailyFixedTypeMap[key].records.push({ log, workType, hours });
    }
  }
  
  // 生成overtimeRecords
  const overtimeRecords = [];
  for (const log of (timelogs.results || [])) {
    const date = log.work_date;
    const workTypeId = parseInt(log.work_type) || 1;
    const workType = WORK_TYPES[workTypeId];
    const hours = parseFloat(log.hours) || 0;
    
    if (!workType || !workType.isOvertime || hours === 0) continue;
    
    if (workType.special === 'fixed_8h') {
      const key = `${date}:${workTypeId}`;
      const group = dailyFixedTypeMap[key];
      const totalHours = group.totalHours;
      const ratio = hours / totalHours;
      const totalCompHours = 8;
      const compHoursGenerated = totalCompHours * ratio;
      
      overtimeRecords.push({
        date,
        workType: workType.name,
        workTypeId,
        originalHours: hours,
        remainingHours: hours,
        multiplier: workType.multiplier,
        isFixedType: true,
        compHoursGenerated: Math.round(compHoursGenerated * 100) / 100,
        totalDailyHours: totalHours,
      });
    } else {
      overtimeRecords.push({
        date,
        workType: workType.name,
        workTypeId,
        originalHours: hours,
        remainingHours: hours,
        multiplier: workType.multiplier,
        isFixedType: false,
        compHoursGenerated: hours,
      });
    }
  }
  
  // 按日期排序（FIFO）
  overtimeRecords.sort((a, b) => a.date.localeCompare(b.date));
  
  // 统计使用的补休总时数
  let totalCompHoursUsed = 0;
  for (const leave of (compLeaves.results || [])) {
    const amount = parseFloat(leave.amount) || 0;
    const hours = leave.unit === 'day' ? amount * 8 : amount;
    totalCompHoursUsed += hours;
  }
  
  // FIFO扣减补休
  let remainingCompToDeduct = totalCompHoursUsed;
  for (const record of overtimeRecords) {
    if (remainingCompToDeduct <= 0) break;
    
    if (remainingCompToDeduct >= record.remainingHours) {
      remainingCompToDeduct -= record.remainingHours;
      record.compDeducted = record.remainingHours;
      record.remainingHours = 0;
    } else {
      record.compDeducted = remainingCompToDeduct;
      record.remainingHours -= remainingCompToDeduct;
      remainingCompToDeduct = 0;
    }
  }
  
  // 按日期重新整理
  const dailyOvertimeMap = {};
  let totalOvertimeHours = 0;
  let totalWeightedHours = 0;
  let effectiveTotalWeightedHours = 0;
  
  for (const record of overtimeRecords) {
    if (!dailyOvertimeMap[record.date]) {
      const dateObj = new Date(record.date + 'T00:00:00');
      const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()];
      
      dailyOvertimeMap[record.date] = {
        date: record.date,
        dayOfWeek,
        holidayName: holidayMap[record.date] || null,
        items: [],
        totalHours: 0,
        totalWeighted: 0,
        effectiveWeighted: 0
      };
    }
    
    const originalWeighted = record.isFixedType
      ? record.compHoursGenerated * 1.0
      : record.originalHours * record.multiplier;
    
    const effectiveWeighted = record.isFixedType
      ? (record.compHoursGenerated - (record.compDeducted || 0)) * 1.0
      : record.remainingHours * record.multiplier;
    
    dailyOvertimeMap[record.date].items.push({
      workType: record.workType,
      workTypeId: record.workTypeId,
      originalHours: Math.round(record.originalHours * 100) / 100,
      remainingHours: Math.round(record.remainingHours * 100) / 100,
      compDeducted: Math.round((record.compDeducted || 0) * 100) / 100,
      compHoursGenerated: Math.round(record.compHoursGenerated * 100) / 100,
      isFixedType: record.isFixedType,
      totalDailyHours: record.totalDailyHours || null,
      multiplier: record.multiplier,
      originalWeighted: Math.round(originalWeighted * 100) / 100,
      effectiveWeighted: Math.round(effectiveWeighted * 100) / 100
    });
    
    dailyOvertimeMap[record.date].totalHours += record.originalHours;
    dailyOvertimeMap[record.date].totalWeighted += originalWeighted;
    dailyOvertimeMap[record.date].effectiveWeighted += effectiveWeighted;
    
    totalOvertimeHours += record.originalHours;
    totalWeightedHours += originalWeighted;
    effectiveTotalWeightedHours += effectiveWeighted;
  }
  
  return {
    dailyOvertime: Object.values(dailyOvertimeMap),
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    totalWeightedHours: Math.round(totalWeightedHours * 100) / 100,
    effectiveTotalWeightedHours: Math.round(effectiveTotalWeightedHours * 100) / 100,
    totalCompHoursUsed: Math.round(totalCompHoursUsed * 100) / 100,
  };
}

/**
 * 计算请假扣款
 */
export async function calculateLeaveDeductions(env, userId, month, baseSalaryCents, regularAllowanceCents) {
  const [year, monthNum] = month.split('-');
  const firstDay = `${year}-${monthNum}-01`;
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
  const yearFirstDay = `${year}-01-01`;
  
  // 读取该月的请假记录
  const leavesMonth = await env.DATABASE.prepare(`
    SELECT leave_type, unit, SUM(amount) as total_amount
    FROM LeaveRequests
    WHERE user_id = ? AND start_date <= ? AND end_date >= ?
      AND status IN ('approved', 'pending') AND leave_type IN ('sick', 'personal', 'menstrual')
    GROUP BY leave_type, unit
  `).bind(userId, lastDayStr, firstDay).all();
  
  // 读取详细列表
  const leaveDetails = await env.DATABASE.prepare(`
    SELECT leave_type, start_date, end_date, amount, unit, reason
    FROM LeaveRequests
    WHERE user_id = ? AND start_date <= ? AND end_date >= ?
      AND status IN ('approved', 'pending') AND leave_type IN ('sick', 'personal', 'menstrual')
    ORDER BY start_date
  `).bind(userId, lastDayStr, firstDay).all();
  
  // 读取今年累计的生理假天数
  const menstrualYearResult = await env.DATABASE.prepare(`
    SELECT SUM(amount) as total_menstrual
    FROM LeaveRequests
    WHERE user_id = ? AND start_date >= ? AND start_date <= ?
      AND status IN ('approved', 'pending') AND leave_type = 'menstrual'
  `).bind(userId, yearFirstDay, lastDayStr).first();
  
  const yearMenstrualDays = menstrualYearResult?.total_menstrual || 0;
  
  // 统一按小时汇总
  let sickHours = 0;
  let personalHours = 0;
  let menstrualHours = 0;
  
  for (const leave of (leavesMonth.results || [])) {
    const amount = leave.total_amount || 0;
    const unit = leave.unit || 'day';
    const hours = unit === 'day' ? amount * 8 : amount;
    
    if (leave.leave_type === 'sick') {
      sickHours += hours;
    } else if (leave.leave_type === 'personal') {
      personalHours += hours;
    } else if (leave.leave_type === 'menstrual') {
      menstrualHours += hours;
    }
  }
  
  const sickDays = sickHours / 8;
  const personalDays = personalHours / 8;
  const menstrualDays = menstrualHours / 8;
  
  // 从系统设定读取扣款比例
  const dailySalaryDivisor = await getSettingValue(env, 'leave_daily_salary_divisor', 30);
  const sickLeaveRate = await getSettingValue(env, 'sick_leave_deduction_rate', 0.5);
  const personalLeaveRate = await getSettingValue(env, 'personal_leave_deduction_rate', 1.0);
  const menstrualLeaveRate = 0.5;
  
  const totalBase = baseSalaryCents + regularAllowanceCents;
  const dailySalaryCents = Math.round(totalBase / dailySalaryDivisor);
  const hourlyRateCents = Math.round(totalBase / 240);
  
  // 生理假扣款计算
  let menstrualDeductionCents = 0;
  let menstrualFreeDays = 0;
  let menstrualMergedDays = 0;
  
  if (menstrualDays > 0) {
    const previousMenstrualDays = yearMenstrualDays - menstrualDays;
    
    if (previousMenstrualDays < 3) {
      menstrualFreeDays = Math.min(menstrualDays, 3 - previousMenstrualDays);
      menstrualMergedDays = menstrualDays - menstrualFreeDays;
    } else {
      menstrualMergedDays = menstrualDays;
    }
    
    menstrualDeductionCents = Math.floor(menstrualHours * hourlyRateCents * menstrualLeaveRate);
  }
  
  const sickDeductionCents = Math.floor(sickHours * hourlyRateCents * sickLeaveRate);
  const personalDeductionCents = Math.floor(personalHours * hourlyRateCents * personalLeaveRate);
  
  // 整理请假详细记录列表
  const leaveDetailsList = (leaveDetails.results || []).map(leave => ({
    leaveType: leave.leave_type,
    startDate: leave.start_date,
    endDate: leave.end_date,
    amount: leave.amount,
    unit: leave.unit,
    reason: leave.reason || ''
  }));
  
  return {
    leaveDeductionCents: sickDeductionCents + personalDeductionCents + menstrualDeductionCents,
    sickDays,
    personalDays,
    menstrualDays,
    sickHours,
    personalHours,
    menstrualHours,
    menstrualFreeDays,
    menstrualMergedDays,
    dailySalaryCents,
    hourlyRateCents,
    leaveDetails: leaveDetailsList
  };
}

