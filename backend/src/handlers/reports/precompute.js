import { computeMonthlyRevenue } from "./monthly-revenue.js";
import { computeMonthlyPayroll } from "./monthly-payroll.js";
import { computeMonthlyEmployeePerformance } from "./monthly-employee-performance.js";
import { computeMonthlyClientProfitability } from "./monthly-client-profitability.js";
import { computeAnnualRevenue } from "./annual-revenue.js";
import { computeAnnualPayroll } from "./annual-payroll.js";
import { computeAnnualEmployeePerformance } from "./annual-employee-performance.js";
import { computeAnnualClientProfitability } from "./annual-client-profitability.js";
import { setReportCache } from "../../utils/report-cache.js";

function formatMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getMonthInfo(baseDate, offset = 0) {
  const utcYear = baseDate.getUTCFullYear();
  const utcMonth = baseDate.getUTCMonth();
  const shifted = new Date(Date.UTC(utcYear, utcMonth + offset, 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
  };
}

function createDummyRequest(url) {
  return new Request(url.toString(), { method: "GET" });
}

async function computeMonthlyCaches(env, ctx, year, month) {
  const period = formatMonth(year, month);

  try {
    const revenueData = await computeMonthlyRevenue(env, year, month);
    await setReportCache(env, "monthly-revenue", period, revenueData);
  } catch (err) {
    console.error("[ReportPrecompute] 月度收款緩存失敗:", period, err);
  }

  try {
    const payrollData = await computeMonthlyPayroll(env, year, month);
    await setReportCache(env, "monthly-payroll", period, payrollData);
  } catch (err) {
    console.error("[ReportPrecompute] 月度薪資緩存失敗:", period, err);
  }

  try {
    const performanceData = await computeMonthlyEmployeePerformance(env, year, month);
    await setReportCache(env, "monthly-employee-performance", period, performanceData);
  } catch (err) {
    console.error("[ReportPrecompute] 月度員工產值緩存失敗:", period, err);
  }

  try {
    const dummyUrl = new URL("https://internal.horgoscpa.com/api/v2/reports/monthly-client-profitability");
    dummyUrl.searchParams.set("year", String(year));
    dummyUrl.searchParams.set("month", String(month));
    const dummyRequest = createDummyRequest(dummyUrl);
    const profitData = await computeMonthlyClientProfitability(
      env,
      ctx,
      dummyRequest,
      dummyUrl,
      year,
      month
    );
    await setReportCache(env, "monthly-client-profitability", period, profitData);
  } catch (err) {
    console.error("[ReportPrecompute] 月度客戶毛利緩存失敗:", period, err);
  }
}

async function computeAnnualCaches(env, ctx, year) {
  const period = String(year);

  try {
    const revenueData = await computeAnnualRevenue(env, year);
    await setReportCache(env, "annual-revenue", period, revenueData);
  } catch (err) {
    console.error("[ReportPrecompute] 年度收款緩存失敗:", year, err);
  }

  try {
    const payrollData = await computeAnnualPayroll(env, year);
    await setReportCache(env, "annual-payroll", period, payrollData);
  } catch (err) {
    console.error("[ReportPrecompute] 年度薪資緩存失敗:", year, err);
  }

  try {
    const performanceData = await computeAnnualEmployeePerformance(env, year);
    await setReportCache(env, "annual-employee-performance", period, performanceData);
  } catch (err) {
    console.error("[ReportPrecompute] 年度員工產值緩存失敗:", year, err);
  }

  try {
    const profitData = await computeAnnualClientProfitability(env, year);
    await setReportCache(env, "annual-client-profitability", period, profitData);
  } catch (err) {
    console.error("[ReportPrecompute] 年度客戶毛利緩存失敗:", year, err);
  }
}

export async function refreshReportCaches(env, ctx, { months = [], years = [] } = {}) {
  for (const target of months) {
    if (!target) continue;
    const year = typeof target === "string" ? Number(target.substring(0, 4)) : target.year;
    const month =
      typeof target === "string" ? Number(target.substring(5, 7)) : target.month;
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      continue;
    }
    await computeMonthlyCaches(env, ctx, year, month);
  }

  for (const rawYear of years) {
    const year = Number(rawYear);
    if (!Number.isFinite(year)) {
      continue;
    }
    await computeAnnualCaches(env, ctx, year);
  }
}

export async function precomputeReportCaches(env, ctx, now = new Date()) {
  const monthTargets = [getMonthInfo(now, 0), getMonthInfo(now, -1)];
  const yearTargets = [now.getUTCFullYear(), now.getUTCFullYear() - 1];

  await refreshReportCaches(env, ctx, {
    months: monthTargets,
    years: yearTargets,
  });
}

