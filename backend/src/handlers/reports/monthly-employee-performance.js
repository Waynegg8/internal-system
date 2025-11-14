/**
 * 月度员工绩效报表
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { calculateEmployeePayroll } from "../../utils/payroll-calculator.js";
import { getTimesheetMonthlyStats } from "../../utils/payroll-helpers.js";
import { calculateWeightedHours } from "./work-types.js";
import { getMonthlyRevenueByClient } from "./revenue-allocation.js";
import { getReportCache, setReportCache } from "../../utils/report-cache.js";

const REPORT_TYPE = "monthly-employee-performance";

function formatMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function computeMonthlyEmployeePerformance(env, year, month) {
  const ym = formatMonth(year, month);

  const usersResult = await env.DATABASE.prepare(
    `SELECT user_id, username, name, base_salary
     FROM Users
     WHERE is_deleted = 0
     ORDER BY name`
  ).all();

  const users = usersResult?.results || [];
  const monthlyClientRevenues = await getMonthlyRevenueByClient(ym, env);

  const employeePerformance = [];

  for (const user of users) {
    const payroll = await calculateEmployeePayroll(env, user.user_id, ym);
    const laborCost = payroll ? payroll.grossSalaryCents / 100 : 0;

    const stats = await getTimesheetMonthlyStats(env, user.user_id, ym);
    const standardHours = stats?.standard_hours ?? stats?.total_hours ?? 0;
    const weightedHours = stats?.weighted_hours || 0;

    let overheadAllocation = 0;
    try {
      const overheadRow = await env.DATABASE.prepare(
        `SELECT SUM(oc.amount *
            CASE 
              WHEN ot.allocation_method = 'per_employee' THEN 1.0 / (SELECT COUNT(*) FROM Users WHERE is_deleted = 0)
              WHEN ot.allocation_method = 'per_hour' THEN 
                (SELECT SUM(hours) FROM Timesheets WHERE user_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0) / 
                (SELECT SUM(hours) FROM Timesheets WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0)
              ELSE 0
            END
         ) AS overhead
         FROM OverheadCosts oc
         JOIN OverheadTypes ot ON ot.id = oc.cost_type_id
         WHERE oc.year = ? AND oc.month = ? AND oc.is_deleted = 0`
      ).bind(user.user_id, ym, ym, year, month).first();

      overheadAllocation = Number(overheadRow?.overhead || 0);
    } catch (err) {
      console.warn(`[MonthlyEmployeePerformance] 獲取管理費失敗 (user: ${user.user_id}):`, err);
    }

    const timesheetRows = await env.DATABASE.prepare(
      `SELECT 
          t.client_id,
          t.service_id,
          t.hours,
          t.work_type,
          c.company_name AS client_name,
          s.service_name
       FROM Timesheets t
       LEFT JOIN Clients c ON c.client_id = t.client_id
       JOIN Services s ON s.service_id = t.service_id
       WHERE t.user_id = ?
         AND substr(t.work_date, 1, 7) = ?
         AND t.is_deleted = 0`
    ).bind(user.user_id, ym).all();

    const clientHoursMap = new Map();
    for (const ts of timesheetRows?.results || []) {
      const clientId = ts.client_id;
      if (!clientId) continue;

      const hours = Number(ts.hours || 0);
      const workTypeId = parseInt(ts.work_type) || 1;
      const weighted = calculateWeightedHours(workTypeId, hours);

      if (!clientHoursMap.has(clientId)) {
        clientHoursMap.set(clientId, {
          clientId,
          clientName: ts.client_name || "未知客戶",
          serviceName: ts.service_name || "綜合服務",
          hours: 0,
          weightedHours: 0,
        });
      }

      const client = clientHoursMap.get(clientId);
      client.hours += hours;
      client.weightedHours += weighted;
    }

    let generatedRevenue = 0;
    const clientDistribution = [];

    for (const [clientId, clientData] of clientHoursMap) {
      const clientRevenue = Number(monthlyClientRevenues[clientId] || 0);
      if (clientRevenue <= 0) continue;

      const totalHoursRow = await env.DATABASE.prepare(
        `SELECT SUM(hours) AS total_hours
         FROM Timesheets
         WHERE client_id = ?
           AND substr(work_date, 1, 7) = ?
           AND is_deleted = 0`
      ).bind(clientId, ym).first();

      const clientTotalHours = Number(totalHoursRow?.total_hours || 0);
      if (clientTotalHours === 0) continue;

      const employeeRevenue = clientRevenue * (clientData.hours / clientTotalHours);
      generatedRevenue += employeeRevenue;

      clientDistribution.push({
        clientId: clientData.clientId,
        clientName: clientData.clientName,
        serviceName: clientData.serviceName,
        hours: Number(clientData.hours.toFixed(1)),
        weightedHours: Number(clientData.weightedHours.toFixed(1)),
        generatedRevenue: Number(employeeRevenue.toFixed(2)),
      });
    }

    const totalCost = laborCost + overheadAllocation;
    const profit = generatedRevenue - totalCost;
    const profitMargin = generatedRevenue > 0 ? (profit / generatedRevenue) * 100 : 0;
    const hourlyRate = standardHours > 0 ? totalCost / standardHours : 0;
    const revenuePerHour = standardHours > 0 ? generatedRevenue / standardHours : 0;

    const distributionWithRatio = clientDistribution.map((entry) => ({
      ...entry,
      revenuePercentage:
        generatedRevenue > 0
          ? Number(((entry.generatedRevenue / generatedRevenue) * 100).toFixed(2))
          : 0,
    }));

    employeePerformance.push({
      userId: user.user_id,
      name: user.name || user.username,
      standardHours: Number(standardHours.toFixed(1)),
      weightedHours: Number(weightedHours.toFixed(1)),
      hoursDifference: Number((weightedHours - standardHours).toFixed(1)),
      generatedRevenue: Number(generatedRevenue.toFixed(2)),
      laborCost: Number(laborCost.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(2)),
      hourlyRate: Number(hourlyRate.toFixed(2)),
      revenuePerHour: Number(revenuePerHour.toFixed(2)),
      clientDistribution: distributionWithRatio,
    });
  }

  return { employeePerformance };
}

export async function handleMonthlyEmployeePerformance(request, env, ctx, requestId, url) {
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

    const period = formatMonth(year, month);
    const cached = await getReportCache(env, REPORT_TYPE, period);

    if (cached?.data) {
      return successResponse(cached.data, "查詢成功", requestId, {
        cacheHit: true,
        cachedAt: cached.computedAt || null,
      });
    }

    const data = await computeMonthlyEmployeePerformance(env, year, month);
    await setReportCache(env, REPORT_TYPE, period, data);

    return successResponse(data, "查詢成功", requestId, {
      cacheHit: false,
    });
  } catch (err) {
    console.error("[MonthlyEmployeePerformance] Error:", err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}


