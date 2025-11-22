/**
 * 成本分摊计算功能
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 計算兩個月份之間的月份數
 */
function getMonthDiff(startMonth, endMonth) {
  const [startYear, startMon] = startMonth.split('-').map(Number);
  const [endYear, endMon] = endMonth.split('-').map(Number);
  return (endYear - startYear) * 12 + (endMon - startMon) + 1;
}

/**
 * 檢查目標月份是否在服務期間內
 */
function isMonthInServicePeriod(targetMonth, serviceStartMonth, serviceEndMonth) {
  if (!serviceStartMonth || !serviceEndMonth) return false;
  return targetMonth >= serviceStartMonth && targetMonth <= serviceEndMonth;
}

async function calculateMonthlyRevenueDistribution(env, yearMonth) {
  // 查詢所有可能與目標月份相關的收據（服務期間包含目標月份，或應計月份為目標月份）
  const revenueRows = await env.DATABASE.prepare(
    `SELECT 
       receipt_id,
       client_id, 
       total_amount,
       service_month,
       service_start_month,
       service_end_month
     FROM Receipts
     WHERE is_deleted = 0
       AND status != 'cancelled'
       AND (
         service_month = ?
         OR (service_start_month IS NOT NULL AND service_end_month IS NOT NULL 
             AND service_start_month <= ? AND service_end_month >= ?)
       )`
  ).bind(yearMonth, yearMonth, yearMonth).all();

  const clientRevenueMap = new Map();
  let totalRevenue = 0;

  // 計算每個客戶在目標月份應分配的收入
  for (const row of revenueRows?.results || []) {
    const clientId = row.client_id;
    const totalAmount = Number(row.total_amount || 0);
    if (!clientId || !Number.isFinite(totalAmount) || totalAmount <= 0) continue;

    let allocatedAmount = totalAmount;

    // 如果服務期間跨月，按月份數平均分配收入
    const serviceStartMonth = row.service_start_month;
    const serviceEndMonth = row.service_end_month;
    
    if (serviceStartMonth && serviceEndMonth && 
        isMonthInServicePeriod(yearMonth, serviceStartMonth, serviceEndMonth)) {
      // 計算服務期間的月份數
      const monthCount = getMonthDiff(serviceStartMonth, serviceEndMonth);
      if (monthCount > 0) {
        // 將收入平均分配到服務期間的每個月
        allocatedAmount = totalAmount / monthCount;
      }
    } else if (row.service_month === yearMonth) {
      // 如果應計月份就是目標月份，使用全部收入
      allocatedAmount = totalAmount;
    } else {
      // 其他情況不分配
      continue;
    }

    if (!clientRevenueMap.has(clientId)) {
      clientRevenueMap.set(clientId, 0);
    }
    clientRevenueMap.set(clientId, clientRevenueMap.get(clientId) + allocatedAmount);
    totalRevenue += allocatedAmount;
  }

  if (clientRevenueMap.size === 0 || totalRevenue === 0) {
    return { totalRevenue: 0, userRevenueMap: new Map() };
  }

  // 查詢目標月份的工時（只查詢當月工時）
  const timesheetRows = await env.DATABASE.prepare(
    `SELECT client_id, user_id, SUM(hours) AS total_hours
     FROM Timesheets
     WHERE substr(work_date, 1, 7) = ?
     AND is_deleted = 0
     GROUP BY client_id, user_id`
  ).bind(yearMonth).all();

  const clientTotalHoursMap = new Map();
  const clientUserHoursMap = new Map();

  for (const row of timesheetRows?.results || []) {
    const clientId = row.client_id;
    const userId = row.user_id;
    const hours = Number(row.total_hours || 0);
    if (!clientId || !userId || !Number.isFinite(hours) || hours <= 0) continue;

    clientTotalHoursMap.set(clientId, (clientTotalHoursMap.get(clientId) || 0) + hours);

    if (!clientUserHoursMap.has(clientId)) {
      clientUserHoursMap.set(clientId, new Map());
    }
    const userHoursMap = clientUserHoursMap.get(clientId);
    userHoursMap.set(userId, (userHoursMap.get(userId) || 0) + hours);
  }

  const userRevenueMap = new Map();

  // 按工時比例分配收入給員工
  for (const [clientId, revenue] of clientRevenueMap.entries()) {
    const totalClientHours = clientTotalHoursMap.get(clientId) || 0;
    if (totalClientHours <= 0) continue;

    const userHoursMap = clientUserHoursMap.get(clientId);
    if (!userHoursMap) continue;

    for (const [userId, userHours] of userHoursMap.entries()) {
      if (!Number.isFinite(userHours) || userHours <= 0) continue;
      const share = revenue * (userHours / totalClientHours);
      if (!Number.isFinite(share) || share <= 0) continue;
      userRevenueMap.set(userId, (userRevenueMap.get(userId) || 0) + share);
    }
  }

  return { totalRevenue, userRevenueMap };
}

/**
 * 判断薪资项目是否应该在指定月份发放
 */
function shouldPayInMonth(recurringType, recurringMonths, effectiveDate, expiryDate, targetMonth) {
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
      const months = Array.isArray(recurringMonths) ? recurringMonths : JSON.parse(String(recurringMonths));
      return Array.isArray(months) && months.includes(currentMonthInt);
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

/**
 * 计算所有员工的实际时薪（包含完整薪资成本 + 管理费分摊）
 * @param {Object} env - Cloudflare环境对象
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @param {string} yearMonth - 年月字符串 (YYYY-MM)
 * @returns {Object} { userId: actualHourlyRate, ... }
 */
export async function calculateAllEmployeesActualHourlyRate(env, year, month, yearMonth) {
  const [y, m] = yearMonth.split('-');
  const firstDay = `${y}-${m}-01`;
  const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
  const lastDayStr = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  
  // 获取所有员工
  const usersRows = await env.DATABASE.prepare(
    "SELECT user_id, name, base_salary FROM Users WHERE is_deleted = 0"
  ).all();
  const usersList = usersRows?.results || [];
  
  // 获取全局数据（用于管理费分摊）
  const totalMonthHoursResult = await env.DATABASE.prepare(
    `SELECT SUM(hours) as total FROM Timesheets 
     WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0`
  ).bind(yearMonth).first();
  const totalMonthHours = Number(totalMonthHoursResult?.total || 0);
  
  const { totalRevenue, userRevenueMap } = await calculateMonthlyRevenueDistribution(env, yearMonth);
  
  const costTypesRows = await env.DATABASE.prepare(
    `SELECT cost_type_id, allocation_method FROM OverheadCostTypes WHERE is_active = 1`
  ).all();
  const costTypes = costTypesRows?.results || [];
  
  const allUsersCount = usersList.length;
  const employeeActualHourlyRates = {};
  
  // 工時類型定義（與舊系統一致）
  const WORK_TYPES = {
    1: { multiplier: 1.0, comp: 0 },
    2: { multiplier: 1.34, comp: 1 },
    3: { multiplier: 1.67, comp: 1 },
    4: { multiplier: 1.34, comp: 1 },
    5: { multiplier: 1.67, comp: 1 },
    6: { multiplier: 2.67, comp: 1 },
    7: { multiplier: 1.0, comp: 'fixed_8h' },
    8: { multiplier: 1.34, comp: 1 },
    9: { multiplier: 1.67, comp: 1 },
    10: { multiplier: 1.0, comp: 'fixed_8h' },
    11: { multiplier: 1.34, comp: 1 },
    12: { multiplier: 1.67, comp: 1 },
  };
  
  // 为每个员工计算实际时薪
  for (const user of usersList) {
    const userId = user.user_id;
    const userIdStr = String(userId);
    const baseSalaryCents = Math.round(Number(user.base_salary || 0) * 100);
    
    // 计算本月工时
    const timesheetHoursResult = await env.DATABASE.prepare(
      `SELECT SUM(hours) as total FROM Timesheets 
       WHERE user_id = ? AND work_date >= ? AND work_date <= ? AND is_deleted = 0`
    ).bind(userId, firstDay, lastDayStr).first();
    const monthHours = Number(timesheetHoursResult?.total || 0);
    
    if (monthHours === 0) {
      employeeActualHourlyRates[userIdStr] = 0;
      continue;
    }
    
    // 计算完整的薪资成本
    let totalLaborCostCents = baseSalaryCents;
    
    // 判定全勤
    const leaveCheckResult = await env.DATABASE.prepare(
      `SELECT COUNT(*) as count
       FROM LeaveRequests
       WHERE user_id = ? AND start_date <= ? AND end_date >= ?
       AND status = 'approved' AND leave_type IN ('sick', 'personal')`
    ).bind(userId, lastDayStr, firstDay).first();
    const isFullAttendance = (leaveCheckResult?.count || 0) === 0;
    
    // 查询薪资项目
    const salaryItems = await env.DATABASE.prepare(
      `SELECT t.category as item_type, t.item_name, t.item_code, 
             e.amount_cents, e.recurring_type, e.recurring_months, 
             e.effective_date, e.expiry_date
       FROM EmployeeSalaryItems e
       LEFT JOIN SalaryItemTypes t ON e.item_type_id = t.item_type_id
       WHERE e.user_id = ? AND e.is_active = 1`
    ).bind(userId).all();
    
    const items = salaryItems?.results || [];
    for (const item of items) {
      const shouldPay = shouldPayInMonth(item.recurring_type, item.recurring_months, item.effective_date, item.expiry_date, yearMonth);
      if (shouldPay && item.item_type !== 'deduction') {
        const isFullAttendanceBonus = (item.item_code && item.item_code.toUpperCase().includes('FULL')) ||
                                      (item.item_name && item.item_name.includes('全勤'));
        if (isFullAttendanceBonus) {
          if (isFullAttendance) {
            totalLaborCostCents += Number(item.amount_cents || 0);
          }
        } else {
          totalLaborCostCents += Number(item.amount_cents || 0);
        }
      }
    }
    
    // 计算补休转加班费
    const hourlyRateForOvertime = Math.round(baseSalaryCents / 240);
    
    const timesheetsRows = await env.DATABASE.prepare(
      `SELECT work_date, work_type, hours 
       FROM Timesheets 
       WHERE user_id = ? AND work_date >= ? AND work_date <= ? AND is_deleted = 0`
    ).bind(userId, firstDay, lastDayStr).all();
    
    const dailyFixedTypeMap = {};
    for (const ts of (timesheetsRows?.results || [])) {
      const wt = parseInt(ts.work_type);
      if (wt === 7 || wt === 10) {
        const dateKey = ts.work_date;
        if (!dailyFixedTypeMap[dateKey]) dailyFixedTypeMap[dateKey] = {};
        if (!dailyFixedTypeMap[dateKey][wt]) dailyFixedTypeMap[dateKey][wt] = 0;
        dailyFixedTypeMap[dateKey][wt] += Number(ts.hours || 0);
      }
    }
    
    const compGenerationDetails = [];
    let totalCompHoursGenerated = 0;
    for (const ts of (timesheetsRows?.results || [])) {
      const wt = parseInt(ts.work_type);
      const h = Number(ts.hours || 0);
      const info = WORK_TYPES[wt] || WORK_TYPES[1];
      if (info.comp === 'fixed_8h') {
        const dateKey = ts.work_date;
        const dayTotal = dailyFixedTypeMap[dateKey]?.[wt] || 0;
        if (dayTotal <= 8) {
          compGenerationDetails.push({ hours: h, multiplier: 1.0, compHours: h });
          totalCompHoursGenerated += h;
        } else {
          compGenerationDetails.push({ hours: h, multiplier: 1.0, compHours: h });
          totalCompHoursGenerated += h;
        }
      } else if (info.comp > 0) {
        const compHours = h * info.comp;
        compGenerationDetails.push({ hours: h, multiplier: info.comp, compHours });
        totalCompHoursGenerated += compHours;
      }
    }
    
    const compUsedRows = await env.DATABASE.prepare(
      `SELECT amount, unit FROM LeaveRequests
       WHERE user_id = ? AND leave_type = 'compensatory' AND status = 'approved'
         AND start_date >= ? AND start_date <= ? AND is_deleted = 0`
    ).bind(userId, firstDay, lastDayStr).all();
    let totalCompHoursUsed = 0;
    for (const lr of (compUsedRows?.results || [])) {
      const amt = Number(lr.amount || 0);
      if (lr.unit === 'days') {
        totalCompHoursUsed += amt * 8;
      } else {
        totalCompHoursUsed += amt;
      }
    }
    
    const unusedCompHours = Math.max(0, totalCompHoursGenerated - totalCompHoursUsed);
    let expiredCompPayCents = 0;
    let remainingToConvert = unusedCompHours;
    for (let i = compGenerationDetails.length - 1; i >= 0 && remainingToConvert > 0; i--) {
      const detail = compGenerationDetails[i];
      const hoursToConvert = Math.min(remainingToConvert, detail.compHours);
      const payCents = Math.round(hoursToConvert * detail.multiplier * hourlyRateForOvertime);
      expiredCompPayCents += payCents;
      remainingToConvert -= hoursToConvert;
    }
    totalLaborCostCents += expiredCompPayCents;
    
    // 计算请假扣款
    const hourlyRateForLeave = hourlyRateForOvertime;
    const leaveDeductionRows = await env.DATABASE.prepare(
      `SELECT leave_type, unit, SUM(amount) as total_amount
       FROM LeaveRequests
       WHERE user_id = ? AND status = 'approved' 
         AND start_date <= ? AND end_date >= ?
         AND leave_type IN ('sick', 'personal', 'menstrual')
       GROUP BY leave_type, unit`
    ).bind(userId, lastDayStr, firstDay).all();
    
    let sickHours = 0, personalHours = 0, menstrualHours = 0;
    for (const lr of (leaveDeductionRows?.results || [])) {
      const amt = Number(lr.total_amount || 0);
      let hours = 0;
      if (lr.unit === 'days') {
        hours = amt * 8;
      } else {
        hours = amt;
      }
      if (lr.leave_type === 'sick') sickHours += hours;
      else if (lr.leave_type === 'personal') personalHours += hours;
      else if (lr.leave_type === 'menstrual') menstrualHours += hours;
    }
    
    let leaveDeductionCents = 0;
    leaveDeductionCents += Math.floor(sickHours * 0.5 * hourlyRateForLeave);
    leaveDeductionCents += Math.floor(personalHours * hourlyRateForLeave);
    leaveDeductionCents += Math.floor(menstrualHours * 0.5 * hourlyRateForLeave);
    totalLaborCostCents -= leaveDeductionCents;
    
    const totalLaborCost = Math.round(totalLaborCostCents / 100);
    
    // 计算管理费分摊
    let overheadAllocation = 0;
    for (const ct of costTypes) {
      const costRow = await env.DATABASE.prepare(
        `SELECT amount FROM MonthlyOverheadCosts 
         WHERE cost_type_id = ? AND year = ? AND month = ? AND is_deleted = 0`
      ).bind(ct.cost_type_id, year, month).first();
      const costAmount = Number(costRow?.amount || 0);
      
      if (ct.allocation_method === 'per_employee') {
        overheadAllocation += allUsersCount > 0 ? Math.round(costAmount / allUsersCount) : 0;
      } else if (ct.allocation_method === 'per_hour') {
        overheadAllocation += totalMonthHours > 0 ? Math.round(costAmount * (monthHours / totalMonthHours)) : 0;
      } else if (ct.allocation_method === 'per_revenue') {
        const userRevenue = Number(userRevenueMap.get(userId) || 0);
        overheadAllocation += totalRevenue > 0 && userRevenue > 0
          ? Math.round(costAmount * (userRevenue / totalRevenue))
          : 0;
      }
    }
    
    const totalCost = totalLaborCost + overheadAllocation;
    const actualHourlyRate = monthHours > 0 ? Math.round(totalCost / monthHours) : 0;
    
    employeeActualHourlyRates[userIdStr] = actualHourlyRate;
  }
  
  return employeeActualHourlyRates;
}

/**
 * 获取员工成本明细（包含薪资成本和管理费分摊）
 */
export async function handleGetEmployeeCosts(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const year = parseInt(params.get("year") || String(new Date().getFullYear()), 10);
  const month = parseInt(params.get("month") || String(new Date().getMonth() + 1), 10);
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  
  try {
    const usersRows = await env.DATABASE.prepare(
      "SELECT user_id, name, base_salary FROM Users WHERE is_deleted = 0 ORDER BY name ASC"
    ).all();
    const users = usersRows?.results || [];
    
    if (users.length === 0) {
      return successResponse({ year, month, employees: [], totalCost: 0 }, "查詢成功", requestId);
    }
    
    const payrollRows = await env.DATABASE.prepare(
      `SELECT pc.*, u.name AS user_name, u.base_salary AS fallback_base_salary
       FROM PayrollCache pc
       LEFT JOIN Users u ON u.user_id = pc.user_id
       WHERE pc.year_month = ?`
    ).bind(yearMonth).all();
    const payrollMap = new Map();
    for (const row of payrollRows?.results || []) {
      payrollMap.set(row.user_id, row);
    }
    
    const timesheetHoursRows = await env.DATABASE.prepare(
      `SELECT user_id, SUM(hours) AS total_hours
       FROM Timesheets
       WHERE substr(work_date, 1, 7) = ?
         AND is_deleted = 0
       GROUP BY user_id`
    ).bind(yearMonth).all();
    const timesheetHoursMap = new Map();
    for (const row of timesheetHoursRows?.results || []) {
      if (!row.user_id) continue;
      const hours = Number(row.total_hours || 0);
      if (!Number.isFinite(hours)) continue;
      timesheetHoursMap.set(row.user_id, hours);
    }

    const { totalRevenue: totalMonthRevenue, userRevenueMap } = await calculateMonthlyRevenueDistribution(env, yearMonth);

    const centsToAmount = (value) => {
      const num = Number(value || 0);
      if (!Number.isFinite(num)) {
        return 0;
      }
      return Math.round(num / 100);
    };
    
    const toNumber = (value, precision = 1) => {
      const num = Number(value || 0);
      if (!Number.isFinite(num)) {
        return 0;
      }
      const factor = Math.pow(10, precision);
      return Math.round(num * factor) / factor;
    };
    
    const employees = [];
    let totalMonthHours = 0;
    
    for (const user of users) {
      const payroll = payrollMap.get(user.user_id);
      const data = payroll?.data_json ? safelyParseJson(payroll.data_json) : {};
      
      const baseSalaryCents = data?.baseSalaryCents ??
        payroll?.base_salary_cents ??
        (Number(user.base_salary || 0) * 100);
      
      const baseSalary = centsToAmount(baseSalaryCents);
      
      const salaryItemsCents =
        (data?.totalRegularAllowanceCents || 0) +
        (data?.totalIrregularAllowanceCents || 0) +
        (data?.performanceBonusCents || 0) +
        (data?.totalRegularBonusCents || 0) +
        (data?.totalYearEndBonusCents || 0) +
        (data?.overtimeCents || 0) +
        (data?.mealAllowanceCents || 0) +
        (data?.transportCents || 0);
      
      const expiredCompPayCents = data?.expiredCompPayCents || 0;
      const leaveDeductionCents = data?.leaveDeductionCents ?? payroll?.leave_deduction_cents ?? 0;
      
      const salaryItemsAmount = centsToAmount(salaryItemsCents);
      const expiredCompPay = centsToAmount(expiredCompPayCents);
      const leaveDeduction = centsToAmount(leaveDeductionCents);

      let monthHours = Number(timesheetHoursMap.get(user.user_id) || 0);
      if (!Number.isFinite(monthHours) || monthHours === 0) {
        monthHours = Number(data?.totalWorkHours ?? payroll?.total_work_hours ?? 0) || 0;
      }
      const totalCompHoursGenerated = toNumber(data?.totalCompHoursGenerated ?? 0);
      const totalCompHoursUsed = toNumber(data?.totalCompHoursUsed ?? 0);
      const unusedCompHours = toNumber(
        data?.unusedCompHours ?? Math.max(totalCompHoursGenerated - totalCompHoursUsed, 0)
      );
      
      const laborCost = baseSalary + salaryItemsAmount + expiredCompPay - leaveDeduction;
      
      employees.push({
        userId: user.user_id,
        name: user.name || payroll?.user_name || `員工${user.user_id}`,
        baseSalary,
        salaryItemsAmount,
        expiredCompPay,
        leaveDeduction,
        totalCompHoursGenerated,
        totalCompHoursUsed,
        unusedCompHours,
        monthHours: toNumber(monthHours, 2),
        laborCost,
        overheadAllocation: 0,
        totalCost: laborCost,
        actualHourlyRate: monthHours > 0 ? Math.round(laborCost / monthHours) : 0
      });
      
      totalMonthHours += monthHours;
    }
    
    // 取得分攤所需資料
    const overheadDetailsRows = await env.DATABASE.prepare(
      `SELECT m.cost_type_id, m.amount, t.allocation_method
       FROM MonthlyOverheadCosts m
       LEFT JOIN OverheadCostTypes t ON m.cost_type_id = t.cost_type_id
       WHERE m.year = ? AND m.month = ? AND m.is_deleted = 0 AND t.cost_type_id IS NOT NULL AND t.is_active = 1`
    ).bind(year, month).all();
    
    let totalPerEmployee = 0;
    let totalPerHour = 0;
    let totalPerRevenue = 0;
    
    for (const row of overheadDetailsRows?.results || []) {
      const amount = Number(row.amount || 0);
      if (row.allocation_method === 'per_employee') {
        totalPerEmployee += amount;
      } else if (row.allocation_method === 'per_hour') {
        totalPerHour += amount;
      } else if (row.allocation_method === 'per_revenue') {
        totalPerRevenue += amount;
      }
    }
    
    const employeeCount = employees.length;
    
    for (const employee of employees) {
      let overheadAllocation = 0;
      
      if (totalPerEmployee > 0 && employeeCount > 0) {
        overheadAllocation += Math.round(totalPerEmployee / employeeCount);
      }
      
      if (totalPerHour > 0 && totalMonthHours > 0 && employee.monthHours > 0) {
        overheadAllocation += Math.round(totalPerHour * (employee.monthHours / totalMonthHours));
      }
      
      if (totalPerRevenue > 0 && totalMonthRevenue > 0) {
        const userRevenue = Number(userRevenueMap.get(employee.userId) || 0);
        if (userRevenue > 0) {
          overheadAllocation += Math.round(totalPerRevenue * (userRevenue / totalMonthRevenue));
        }
      }
      
      employee.overheadAllocation = overheadAllocation;
      employee.totalCost = employee.laborCost + overheadAllocation;
      employee.actualHourlyRate = employee.monthHours > 0
        ? Math.round(employee.totalCost / employee.monthHours)
        : 0;
    }
    
    const totalCost = employees.reduce((sum, item) => sum + item.totalCost, 0);
    
    return successResponse({
      year,
      month,
      employees,
      totalCost
    }, "查詢成功", requestId);
  } catch (err) {
    console.error(`[Employee Costs] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "計算失敗", null, requestId);
  }
}

/**
 * 處理成本分攤計算請求
 * @param {Object} request - 請求對象
 * @param {Object} env - 環境變數
 * @param {Object} ctx - 上下文
 * @param {string} requestId - 請求ID
 * @returns {Object} 回應對象
 */
export async function handleCalculateAllocation(request, env, ctx, requestId) {
  try {
    const body = await request.json();
    const { year, month, allocation_method } = body;

    // 參數驗證
    if (!year || !month || !allocation_method) {
      return errorResponse(400, "INVALID_PARAMS", "缺少必要參數：year, month, allocation_method", null, requestId);
    }

    if (!['per_employee', 'per_hour', 'per_revenue'].includes(allocation_method)) {
      return errorResponse(400, "INVALID_PARAMS", "無效的分攤方式", null, requestId);
    }

    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    // 計算所有員工的實際時薪（包含指定分攤方式的管理費分攤）
    const employeeActualHourlyRates = await calculateAllEmployeesActualHourlyRate(env, year, month, yearMonth);

    // 獲取員工成本明細（使用現有的邏輯）
    const usersRows = await env.DATABASE.prepare(
      "SELECT user_id, name, base_salary FROM Users WHERE is_deleted = 0 ORDER BY name ASC"
    ).all();
    const users = usersRows?.results || [];

    if (users.length === 0) {
      return successResponse({
        year,
        month,
        allocationMethod: allocation_method,
        summary: {
          totalCost: 0,
          allocationMethod: allocation_method
        },
        employees: [],
        clients: []
      }, "查詢成功", requestId);
    }

    // 計算員工成本明細
    const employees = [];
    const { totalRevenue, userRevenueMap } = await calculateMonthlyRevenueDistribution(env, yearMonth);

    // 取得分攤所需資料
    const overheadDetailsRows = await env.DATABASE.prepare(
      `SELECT m.cost_type_id, m.amount, t.allocation_method
       FROM MonthlyOverheadCosts m
       LEFT JOIN OverheadCostTypes t ON m.cost_type_id = t.cost_type_id
       WHERE m.year = ? AND m.month = ? AND m.is_deleted = 0 AND t.cost_type_id IS NOT NULL AND t.is_active = 1`
    ).bind(year, month).all();

    const costTypes = overheadDetailsRows?.results || [];
    const employeeCount = users.length;

    for (const user of users) {
      // 計算員工的勞動成本（簡化版本）
      const baseSalaryCents = Math.round(Number(user.base_salary || 0) * 100);
      const baseSalary = Math.round(baseSalaryCents / 100);

      // 計算工時
      const timesheetHoursResult = await env.DATABASE.prepare(
        `SELECT SUM(hours) as total FROM Timesheets
         WHERE user_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0`
      ).bind(user.user_id, yearMonth).first();
      const monthHours = Number(timesheetHoursResult?.total || 0);

      // 計算管理費分攤（僅使用指定分攤方式）
      let overheadAllocation = 0;
      for (const ct of costTypes) {
        if (ct.allocation_method !== allocation_method) continue; // 只計算指定分攤方式

        const costRow = await env.DATABASE.prepare(
          `SELECT amount FROM MonthlyOverheadCosts
           WHERE cost_type_id = ? AND year = ? AND month = ? AND is_deleted = 0`
        ).bind(ct.cost_type_id, year, month).first();
        const costAmount = Number(costRow?.amount || 0);

        if (allocation_method === 'per_employee') {
          overheadAllocation += employeeCount > 0 ? Math.round(costAmount / employeeCount) : 0;
        } else if (allocation_method === 'per_hour') {
          const totalMonthHoursResult = await env.DATABASE.prepare(
            `SELECT SUM(hours) as total FROM Timesheets
             WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0`
          ).bind(yearMonth).first();
          const totalMonthHours = Number(totalMonthHoursResult?.total || 0);
          overheadAllocation += totalMonthHours > 0 ? Math.round(costAmount * (monthHours / totalMonthHours)) : 0;
        } else if (allocation_method === 'per_revenue') {
          const userRevenue = Number(userRevenueMap.get(user.user_id) || 0);
          overheadAllocation += totalRevenue > 0 && userRevenue > 0
            ? Math.round(costAmount * (userRevenue / totalRevenue))
            : 0;
        }
      }

      const laborCost = baseSalary; // 簡化處理，只使用底薪
      const totalCost = laborCost + overheadAllocation;
      const hourlyRate = monthHours > 0 ? Math.round(totalCost / monthHours) : 0;

      employees.push({
        userId: user.user_id,
        name: user.name || `員工${user.user_id}`,
        baseSalary,
        laborCost,
        overheadAllocation,
        totalCost,
        monthHours: Math.round(monthHours * 10) / 10,
        hourlyRate
      });
    }

    // 計算客戶成本總結（使用現有的邏輯）
    const clientCosts = await calculateClientCostsForAllocation(env, year, month, yearMonth, allocation_method);

    const totalCost = employees.reduce((sum, emp) => sum + emp.totalCost, 0);

    return successResponse({
      year,
      month,
      allocationMethod: allocation_method,
      summary: {
        totalCost,
        allocationMethod: allocation_method,
        employeeCount: employees.length,
        clientCount: clientCosts.length
      },
      employees,
      clients: clientCosts
    }, "成本分攤計算成功", requestId);

  } catch (err) {
    console.error(`[Calculate Allocation] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "計算失敗", null, requestId);
  }
}

/**
 * 計算客戶成本總結（用於成本分攤結果展示）
 */
async function calculateClientCostsForAllocation(env, year, month, yearMonth, allocationMethod) {
  try {
    // 計算所有員工的實際時薪（使用指定分攤方式）
    const employeeActualHourlyRates = await calculateAllEmployeesActualHourlyRate(env, year, month, yearMonth);

    // 獲取工時記錄
    const timesheetsRows = await env.DATABASE.prepare(
      `SELECT
        t.user_id,
        t.client_id,
        t.work_type,
        t.hours,
        t.work_date,
        c.company_name as client_name,
        u.name as user_name
      FROM Timesheets t
      LEFT JOIN Clients c ON c.client_id = t.client_id
      LEFT JOIN Users u ON u.user_id = t.user_id
      WHERE t.is_deleted = 0 AND substr(t.work_date, 1, 7) = ?
      ORDER BY t.client_id, t.work_date`
    ).bind(yearMonth).all();

    const timesheets = timesheetsRows?.results || [];

    // 按客戶分組計算成本
    const clientCostMap = new Map();

    for (const ts of timesheets) {
      const clientId = ts.client_id;
      if (!clientId) continue;

      const userId = String(ts.user_id);
      const workTypeId = parseInt(ts.work_type || 1);
      const hours = Number(ts.hours || 0);

      // 計算加權工時（簡化處理）
      const weightedHours = hours; // 簡化：不考慮工時類型倍率

      // 獲取員工實際時薪
      const actualHourlyRate = employeeActualHourlyRates[userId] || 0;

      // 計算成本
      const cost = Math.round(weightedHours * actualHourlyRate);

      // 初始化客戶成本記錄
      if (!clientCostMap.has(clientId)) {
        clientCostMap.set(clientId, {
          clientId: clientId,
          clientName: ts.client_name || "",
          totalHours: 0,
          totalCost: 0,
          employeeCount: new Set()
        });
      }

      const clientCost = clientCostMap.get(clientId);
      clientCost.totalHours += hours;
      clientCost.totalCost += cost;
      clientCost.employeeCount.add(userId);
    }

    // 獲取客戶收入（簡化處理）
    const monthlyRevenues = await getMonthlyRevenueForAllocation(env, yearMonth);
    const clientRevenueMap = new Map();
    for (const [clientId, revenue] of Object.entries(monthlyRevenues)) {
      clientRevenueMap.set(parseInt(clientId), Number(revenue || 0));
    }

    // 轉換為數組並添加收入和利潤信息
    const clientCosts = Array.from(clientCostMap.values()).map(client => {
      const revenue = clientRevenueMap.get(client.clientId) || 0;
      const profit = revenue - client.totalCost;
      const margin = revenue > 0 ? Math.round((profit / revenue) * 10000) / 100 : 0;
      const avgHourlyRate = client.totalHours > 0
        ? Math.round((client.totalCost / client.totalHours) * 100) / 100
        : 0;

      return {
        clientId: client.clientId,
        clientName: client.clientName,
        totalHours: Math.round(client.totalHours * 10) / 10,
        avgHourlyRate: avgHourlyRate,
        totalCost: client.totalCost,
        revenue: revenue,
        profit: profit,
        margin: margin,
        employeeCount: client.employeeCount.size
      };
    }).sort((a, b) => b.totalCost - a.totalCost);

    return clientCosts;

  } catch (err) {
    console.error(`[Client Costs for Allocation] Error:`, err);
    return [];
  }
}

/**
 * 獲取月度收入分配（簡化版本）
 */
async function getMonthlyRevenueForAllocation(env, yearMonth) {
  const revenueRows = await env.DATABASE.prepare(
    `SELECT client_id, total_amount
     FROM Receipts
     WHERE is_deleted = 0
       AND status != 'cancelled'
       AND service_month = ?`
  ).bind(yearMonth).all();

  const clientRevenueMap = {};
  for (const row of revenueRows?.results || []) {
    const clientId = row.client_id;
    const amount = Number(row.total_amount || 0);
    if (clientId && amount > 0) {
      clientRevenueMap[clientId] = (clientRevenueMap[clientId] || 0) + amount;
    }
  }

  return clientRevenueMap;
}

function safelyParseJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn('[Employee Costs] Failed to parse payroll cache JSON', err);
    return {};
  }
}
