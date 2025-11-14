/**
 * 年度薪资报表
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { calculateEmployeePayroll } from "../../utils/payroll-calculator.js";

function formatMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

async function ensurePayrollCacheForYear(env, year) {
  const months = Array.from({ length: 12 }, (_, idx) => formatMonth(year, idx + 1));
  const existingRows = await env.DATABASE.prepare(
    `SELECT DISTINCT year_month FROM PayrollCache WHERE year_month LIKE ?`
  ).bind(`${year}-%`).all();
  const existingSet = new Set((existingRows?.results || []).map((row) => row.year_month));

  const missingMonths = months.filter((month) => !existingSet.has(month));
  if (missingMonths.length === 0) {
    return;
  }

  const usersResult = await env.DATABASE.prepare(
    `SELECT user_id FROM Users WHERE is_deleted = 0 ORDER BY user_id`
  ).all();
  const userIds = (usersResult?.results || []).map((row) => Number(row.user_id));

  for (const month of missingMonths) {
    for (const userId of userIds) {
      try {
        await calculateEmployeePayroll(env, userId, month);
      } catch (err) {
        console.error(`[AnnualPayroll] 補齊薪資快取失敗: user=${userId} month=${month}`, err);
      }
    }
  }
}

export async function computeAnnualPayroll(env, year) {
  await ensurePayrollCacheForYear(env, year);

  const cacheResult = await env.DATABASE.prepare(`
      SELECT 
        pc.user_id,
        pc.year_month,
        pc.gross_salary_cents,
        pc.net_salary_cents,
        pc.overtime_cents,
        pc.performance_bonus_cents,
        pc.year_end_bonus_cents,
        u.name,
        u.username
      FROM PayrollCache pc
      JOIN Users u ON u.user_id = pc.user_id
      WHERE pc.year_month LIKE ?
        AND u.is_deleted = 0
      ORDER BY pc.year_month, u.name
    `).bind(`${year}-%`).all();

  const cacheRows = cacheResult?.results || [];

  const empMap = new Map();
  const users = await env.DATABASE.prepare(`
      SELECT user_id, username, name FROM Users WHERE is_deleted = 0
    `).all();
  for (const user of users.results || []) {
    empMap.set(user.user_id, {
      userId: user.user_id,
      name: user.name || user.username,
      annualGross: 0,
      annualNet: 0,
      totalOvertime: 0,
      totalPerformance: 0,
      totalYearEnd: 0,
      monthlyDetails: [],
    });
  }

  const monthlyMap = new Map();
  for (let m = 1; m <= 12; m++) {
    monthlyMap.set(m, {
      month: m,
      totalGrossSalary: 0,
      totalNetSalary: 0,
      employeeCount: 0,
    });
  }

  for (const row of cacheRows) {
    const [, m] = row.year_month.split("-");
    const month = parseInt(m);

    const gross = (row.gross_salary_cents || 0) / 100;
    const net = (row.net_salary_cents || 0) / 100;
    const overtime = (row.overtime_cents || 0) / 100;
    const performance = (row.performance_bonus_cents || 0) / 100;
    const yearEnd = (row.year_end_bonus_cents || 0) / 100;

    if (empMap.has(row.user_id)) {
      const emp = empMap.get(row.user_id);
      emp.annualGross += gross;
      emp.annualNet += net;
      emp.totalOvertime += overtime;
      emp.totalPerformance += performance;
      emp.totalYearEnd += yearEnd;
      emp.monthlyDetails.push({
        month,
        grossSalary: gross,
        netSalary: net,
        overtimePay: overtime,
        performanceBonus: performance,
        yearEndBonus: yearEnd,
      });
    }

    if (monthlyMap.has(month)) {
      const monthData = monthlyMap.get(month);
      monthData.totalGrossSalary += gross;
      monthData.totalNetSalary += net;
      monthData.employeeCount = users.results?.length || 0;
    }
  }

  const employeeSummary = [];
  for (const emp of empMap.values()) {
    if (emp.annualGross > 0 || emp.annualNet > 0) {
      emp.monthlyDetails.sort((a, b) => a.month - b.month);
      employeeSummary.push({
        userId: emp.userId,
        name: emp.name,
        annualGrossSalary: emp.annualGross,
        annualNetSalary: emp.annualNet,
        avgMonthlySalary: emp.annualGross / 12,
        totalOvertimePay: emp.totalOvertime,
        totalPerformanceBonus: emp.totalPerformance,
        totalYearEndBonus: emp.totalYearEnd,
        monthlyDetails: emp.monthlyDetails,
      });
    }
  }

  const monthlyTrend = Array.from(monthlyMap.values()).map((m) => ({
    month: m.month,
    totalGrossSalary: m.totalGrossSalary,
    totalNetSalary: m.totalNetSalary,
    employeeCount: m.employeeCount,
    avgGrossSalary: m.employeeCount > 0 ? m.totalGrossSalary / m.employeeCount : 0,
  }));

  const totalGross = monthlyTrend.reduce((sum, m) => sum + m.totalGrossSalary, 0);
  const totalNet = monthlyTrend.reduce((sum, m) => sum + m.totalNetSalary, 0);

  return {
    summary: {
      annualGrossSalary: totalGross,
      annualNetSalary: totalNet,
      avgMonthlySalary: totalGross / 12,
      avgEmployeeCount: users.results?.length || 0,
    },
    monthlyTrend,
    employeeSummary,
  };
}

export async function handleAnnualPayroll(request, env, ctx, requestId, url) {
  try {
    const params = url.searchParams;
    const year = parseInt(params.get("year") || String(new Date().getFullYear()), 10);

    if (!Number.isFinite(year) || year < 2000) {
      return errorResponse(422, "VALIDATION_ERROR", "請選擇查詢年度", null, requestId);
    }

    const data = await computeAnnualPayroll(env, year);
    return successResponse(data, "查詢成功", requestId);
  } catch (err) {
    console.error(`[AnnualPayroll] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}



