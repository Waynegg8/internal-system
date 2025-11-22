/**
 * 月度薪资报表
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { calculateEmployeePayroll } from "../../utils/payroll-calculator.js";
import { getReportCache, setReportCache, deleteReportCache } from "../../utils/report-cache.js";

const REPORT_TYPE = "monthly-payroll";

function formatMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function serializeRegularBonusItems(items) {
  const source = Array.isArray(items)
    ? items
    : Array.isArray(items?.results)
      ? items.results
      : [];

  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item) => {
    const amountCents = Number(item.amountCents ?? item.amount_cents ?? 0);
    const shouldPayRaw = item.shouldPay ?? item.should_pay ?? false;
    const isFullAttendanceRaw =
      item.isFullAttendanceBonus ?? item.is_full_attendance_bonus ?? false;

    return {
      name: item.name || "",
      itemCode: item.itemCode || item.item_code || "",
      amountCents,
      amount: Number((amountCents / 100).toFixed(2)),
      shouldPay: Boolean(
        shouldPayRaw === true ||
          shouldPayRaw === 1 ||
          shouldPayRaw === "1" ||
          shouldPayRaw === "true"
      ),
      isFullAttendanceBonus: Boolean(
        isFullAttendanceRaw === true ||
          isFullAttendanceRaw === 1 ||
          isFullAttendanceRaw === "1" ||
          isFullAttendanceRaw === "true"
      ),
    };
  });
}

function extractFullAttendanceBonus(payroll) {
  if (!payroll || !payroll.isFullAttendance) {
    return 0;
  }

  const bonusItems = payroll.regularBonusItems || payroll.regular_bonus_items || [];
  if (!Array.isArray(bonusItems) || bonusItems.length === 0) {
    return 0;
  }

  const totalCents = bonusItems
    .filter((item) => {
      const shouldPay = item.shouldPay ?? item.should_pay;
      const isFullAttendance = item.isFullAttendanceBonus ?? item.is_full_attendance_bonus;
      return shouldPay === true && isFullAttendance === true;
    })
    .reduce((sum, item) => {
      const cents = item.amountCents ?? item.amount_cents ?? 0;
      return sum + Number(cents);
    }, 0);

  return Number((totalCents / 100).toFixed(2));
}

export async function computeMonthlyPayroll(env, year, month) {
  const ym = formatMonth(year, month);

  const usersResult = await env.DATABASE.prepare(
    `SELECT user_id, username, name, base_salary
     FROM Users
     WHERE is_deleted = 0
     ORDER BY name`
  ).all();

  const users = usersResult?.results || [];
  const payrollData = [];

  let totalGrossSalary = 0;
  let totalNetSalary = 0;

  for (const user of users) {
    const payroll = await calculateEmployeePayroll(env, user.user_id, ym);
    if (!payroll) continue;

    const grossSalary = payroll.grossSalaryCents / 100;
    const netSalary = payroll.netSalaryCents / 100;

    const fullAttendanceBonus = extractFullAttendanceBonus(payroll);

    const regularBonus = payroll.totalRegularBonusCents / 100;
    const bonusAmount = regularBonus - fullAttendanceBonus;

    payrollData.push({
      userId: user.user_id,
      username: user.username,
      name: user.name || user.username,
      baseSalary: payroll.baseSalaryCents / 100,
      regularAllowance: payroll.totalRegularAllowanceCents / 100,
      irregularAllowance: payroll.totalIrregularAllowanceCents / 100,
      bonusAmount,
      fullAttendanceBonus,
      regularBonus,
      yearEndBonus: payroll.totalYearEndBonusCents / 100,
      performanceBonus: payroll.performanceBonusCents / 100,
      overtimePay: payroll.overtimeCents / 100,
      mealAllowance: payroll.mealAllowanceCents / 100,
      transportSubsidy: payroll.transportCents / 100,
      fixedDeduction: payroll.deductionCents / 100,
      leaveDeduction: payroll.leaveDeductionCents / 100,
      grossSalary,
      netSalary,
      regularBonusItems: serializeRegularBonusItems(
        payroll.regularBonusItems ?? payroll.regular_bonus_items
      ),
      isFullAttendance: Boolean(payroll.isFullAttendance),
    });

    totalGrossSalary += grossSalary;
    totalNetSalary += netSalary;
  }

  const toNumber = (value) => Number(value.toFixed(2));
  const reduce = (key) => payrollData.reduce((sum, item) => sum + (item[key] || 0), 0);

  const composition = {
    baseSalary: toNumber(reduce("baseSalary")),
    regularAllowance: toNumber(reduce("regularAllowance")),
    irregularAllowance: toNumber(reduce("irregularAllowance")),
    bonusAmount: toNumber(reduce("bonusAmount")),
    fullAttendanceBonus: toNumber(reduce("fullAttendanceBonus")),
    overtimePay: toNumber(reduce("overtimePay")),
    mealAllowance: toNumber(reduce("mealAllowance")),
    transportSubsidy: toNumber(reduce("transportSubsidy")),
    performanceBonus: toNumber(reduce("performanceBonus")),
    yearEndBonus: toNumber(reduce("yearEndBonus")),
    fixedDeduction: toNumber(reduce("fixedDeduction")),
    leaveDeduction: toNumber(reduce("leaveDeduction")),
  };

  const summary = {
    totalGrossSalary: toNumber(totalGrossSalary),
    totalNetSalary: toNumber(totalNetSalary),
    employeeCount: users.length,
    avgGrossSalary:
      payrollData.length > 0 ? toNumber(totalGrossSalary / payrollData.length) : 0,
    avgNetSalary:
      payrollData.length > 0 ? toNumber(totalNetSalary / payrollData.length) : 0,
  };

  const roundedPayrollData = payrollData.map((item) => ({
    ...item,
    baseSalary: toNumber(item.baseSalary),
    regularAllowance: toNumber(item.regularAllowance),
    irregularAllowance: toNumber(item.irregularAllowance),
    bonusAmount: toNumber(item.bonusAmount),
    fullAttendanceBonus: toNumber(item.fullAttendanceBonus),
    regularBonus: toNumber(item.regularBonus),
    yearEndBonus: toNumber(item.yearEndBonus),
    performanceBonus: toNumber(item.performanceBonus),
    overtimePay: toNumber(item.overtimePay),
    mealAllowance: toNumber(item.mealAllowance),
    transportSubsidy: toNumber(item.transportSubsidy),
    fixedDeduction: toNumber(item.fixedDeduction),
    leaveDeduction: toNumber(item.leaveDeduction),
    grossSalary: toNumber(item.grossSalary),
    netSalary: toNumber(item.netSalary),
    regularBonusItems: item.regularBonusItems,
    isFullAttendance: Boolean(item.isFullAttendance),
  }));

  return {
    summary,
    payrollDetails: roundedPayrollData,
    composition,
  };
}

export async function handleMonthlyPayroll(request, env, ctx, requestId, url) {
  try {
    const params = url.searchParams;
    const year = parseInt(params.get("year") || "0", 10);
    const month = parseInt(params.get("month") || "0", 10);

    if (
      !Number.isFinite(year) ||
      year < 2000 ||
      !Number.isFinite(month) ||
      month < 1 ||
      month > 12
    ) {
      return errorResponse(422, "VALIDATION_ERROR", "請選擇查詢月份", null, requestId);
    }

    const forceRefresh = params.get("refresh") === "1";

    const cached = await getReportCache(env, REPORT_TYPE, year, month);

    if (!forceRefresh && cached?.data) {
      return successResponse(cached.data, "查詢成功", requestId, {
        cacheHit: true,
        cachedAt: cached.computedAt || null,
      });
    } else {
      await deleteReportCache(env, REPORT_TYPE, year, month).catch(() => {});
    }

    const data = await computeMonthlyPayroll(env, year, month);
    await setReportCache(env, REPORT_TYPE, year, data, month);

    return successResponse(data, "查詢成功", requestId, {
      cacheHit: false,
      refreshed: forceRefresh,
    });
  } catch (err) {
    console.error("[MonthlyPayroll] Error:", err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}


