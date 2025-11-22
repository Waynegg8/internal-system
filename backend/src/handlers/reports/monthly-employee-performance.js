/**
 * 月度员工绩效报表
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { calculateEmployeePayroll } from "../../utils/payroll-calculator.js";
import { getTimesheetMonthlyStats } from "../../utils/payroll-helpers.js";
import { getMonthlyRevenueByClient } from "./revenue-allocation.js";
import { getReportCache, setReportCache, deleteReportCache } from "../../utils/report-cache.js";

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

    // 查詢該員工該月的所有工時記錄（用於計算標準工時）
    const timesheetRows = await env.DATABASE.prepare(
      `SELECT 
          t.client_id,
          t.service_id,
          t.hours,
          t.work_type,
          t.work_date,
          c.company_name AS client_name,
          s.service_name
       FROM Timesheets t
       LEFT JOIN Clients c ON c.client_id = t.client_id
       LEFT JOIN Services s ON s.service_id = t.service_id
       WHERE t.user_id = ?
         AND substr(t.work_date, 1, 7) = ?
         AND t.is_deleted = 0
       ORDER BY t.work_date, t.work_type`
    ).bind(user.user_id, ym).all();

    // 工時類型定義（與 payroll-helpers.js 一致）
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

    // 統計固定 8 小時類型的每日總工時（按客戶分組）
    const dailyFixedTypeMap = new Map(); // key: `${clientId}:${date}:${workTypeId}`
    for (const log of timesheetRows?.results || []) {
      const clientId = log.client_id;
      if (!clientId) continue;
      
      const date = log.work_date;
      const workTypeId = parseInt(log.work_type) || 1;
      const workType = WORK_TYPES[workTypeId];
      const hours = Number(log.hours || 0);
      
      if (workType && workType.special === 'fixed_8h') {
        const key = `${clientId}:${date}:${workTypeId}`;
        const current = dailyFixedTypeMap.get(key) || 0;
        dailyFixedTypeMap.set(key, current + hours);
      }
    }

    // 計算每個客戶的標準工時
    const clientStandardHoursMap = new Map(); // key: clientId
    const processedStandardFixedKeys = new Set(); // key: `${clientId}:${date}:${workTypeId}`
    
    for (const ts of timesheetRows?.results || []) {
      const clientId = ts.client_id;
      if (!clientId) continue;

      const hours = Number(ts.hours || 0);
      const workTypeId = parseInt(ts.work_type) || 1;
      const workType = WORK_TYPES[workTypeId];
      const date = ts.work_date;

      if (!workType) continue;

      // 只計算標準工時類型（work_type = 1, 7, 10）
      if (workType.standard === 'regular') {
        // work_type = 1: 直接累加
        if (!clientStandardHoursMap.has(clientId)) {
          clientStandardHoursMap.set(clientId, 0);
        }
        clientStandardHoursMap.set(clientId, clientStandardHoursMap.get(clientId) + hours);
      } else if (workType.standard === 'fixed') {
        // work_type = 7, 10: 固定 8 小時類型，每日最多 8 小時
        const key = `${clientId}:${date}:${workTypeId}`;
        if (!processedStandardFixedKeys.has(key)) {
          const fixedTotal = dailyFixedTypeMap.get(key) || hours;
          const standardHoursForDay = Math.min(fixedTotal, 8);
          
          if (!clientStandardHoursMap.has(clientId)) {
            clientStandardHoursMap.set(clientId, 0);
          }
          clientStandardHoursMap.set(clientId, clientStandardHoursMap.get(clientId) + standardHoursForDay);
          processedStandardFixedKeys.add(key);
        }
      }
    }

    // 獲取客戶名稱和服務名稱（用於顯示）
    const clientInfoMap = new Map();
    for (const ts of timesheetRows?.results || []) {
      const clientId = ts.client_id;
      if (!clientId) continue;
      
      if (!clientInfoMap.has(clientId)) {
        clientInfoMap.set(clientId, {
          clientName: ts.client_name || "未知客戶",
          serviceName: ts.service_name || "綜合服務"
        });
      }
    }

    let generatedRevenue = 0;
    const clientDistribution = [];

    // 按標準工時比例分配收入
    for (const [clientId, employeeStandardHours] of clientStandardHoursMap) {
      const clientRevenue = Number(monthlyClientRevenues[clientId] || 0);
      if (clientRevenue <= 0 || employeeStandardHours <= 0) continue;

      // 計算該客戶該月的總標準工時（所有員工）
      const clientTimesheetRows = await env.DATABASE.prepare(
        `SELECT work_date, work_type, hours
         FROM Timesheets
         WHERE client_id = ?
           AND substr(work_date, 1, 7) = ?
           AND is_deleted = 0
         ORDER BY work_date, work_type`
      ).bind(clientId, ym).all();

      // 統計客戶的固定 8 小時類型每日總工時
      const clientDailyFixedTypeMap = new Map(); // key: `${date}:${workTypeId}`
      for (const log of clientTimesheetRows?.results || []) {
        const date = log.work_date;
        const workTypeId = parseInt(log.work_type) || 1;
        const workType = WORK_TYPES[workTypeId];
        const hours = Number(log.hours || 0);
        
        if (workType && workType.special === 'fixed_8h') {
          const key = `${date}:${workTypeId}`;
          const current = clientDailyFixedTypeMap.get(key) || 0;
          clientDailyFixedTypeMap.set(key, current + hours);
        }
      }

      // 計算客戶的總標準工時
      let clientTotalStandardHours = 0;
      const processedClientStandardFixedKeys = new Set();
      
      for (const ts of clientTimesheetRows?.results || []) {
        const hours = Number(ts.hours || 0);
        const workTypeId = parseInt(ts.work_type) || 1;
        const workType = WORK_TYPES[workTypeId];
        const date = ts.work_date;

        if (!workType) continue;

        if (workType.standard === 'regular') {
          clientTotalStandardHours += hours;
        } else if (workType.standard === 'fixed') {
          const key = `${date}:${workTypeId}`;
          if (!processedClientStandardFixedKeys.has(key)) {
            const fixedTotal = clientDailyFixedTypeMap.get(key) || hours;
            clientTotalStandardHours += Math.min(fixedTotal, 8);
            processedClientStandardFixedKeys.add(key);
          }
        }
      }

      if (clientTotalStandardHours === 0) continue;

      // 按標準工時比例分配收入
      const employeeRevenue = clientRevenue * (employeeStandardHours / clientTotalStandardHours);
      generatedRevenue += employeeRevenue;

      const clientInfo = clientInfoMap.get(clientId) || { clientName: "未知客戶", serviceName: "綜合服務" };

      clientDistribution.push({
        clientId,
        clientName: clientInfo.clientName,
        serviceName: clientInfo.serviceName,
        hours: Number(employeeStandardHours.toFixed(1)), // 標準工時
        weightedHours: Number(employeeStandardHours.toFixed(1)), // 保留欄位，設為標準工時
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

    const data = await computeMonthlyEmployeePerformance(env, year, month);
    await setReportCache(env, REPORT_TYPE, year, data, month);

    return successResponse(data, "查詢成功", requestId, {
      cacheHit: false,
      refreshed: forceRefresh,
    });
  } catch (err) {
    console.error("[MonthlyEmployeePerformance] Error:", err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}


