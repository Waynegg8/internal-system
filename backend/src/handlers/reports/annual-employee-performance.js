/**
 * 年度员工绩效报表
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { calculateWeightedHours } from "./work-types.js";
import { getMonthlyRevenueByClient } from "./revenue-allocation.js";
import { getTimesheetMonthlyStats } from "../../utils/payroll-helpers.js";
import { calculateEmployeePayroll } from "../../utils/payroll-calculator.js";
import { getReportCache, setReportCache, deleteReportCache } from "../../utils/report-cache.js";

const REPORT_TYPE = "annual-employee-performance";

export async function computeAnnualEmployeePerformance(env, year) {
  const usersResult = await env.DATABASE.prepare(`
      SELECT user_id, username, name, base_salary
      FROM Users
      WHERE is_deleted = 0
      ORDER BY name
    `).all();

  const users = usersResult?.results || [];
  const employeeSummary = [];

  // 获取全年所有客户的收入（按client_id）
  const clientRevenueRows = await env.DATABASE.prepare(`
      SELECT 
        r.client_id,
        SUM(r.total_amount) as revenue
      FROM Receipts r
      WHERE r.is_deleted = 0 
        AND r.status != 'cancelled'
        AND substr(r.receipt_date, 1, 4) = ?
      GROUP BY r.client_id
    `).bind(String(year)).all();

  const clientRevenueMap = new Map();
  for (const row of clientRevenueRows?.results || []) {
    clientRevenueMap.set(row.client_id, Number(row.revenue || 0));
  }

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

  // 为每个员工计算年度产值
  for (const user of users) {
    let annualStandardHours = 0;
    let annualWeightedHours = 0;
    let annualRevenue = 0;
    const clientDistribution = new Map();

    // 获取该员工全年的工时记录（包含日期信息，用于计算标准工时）
    const timesheetRows = await env.DATABASE.prepare(`
        SELECT 
          t.client_id,
          c.company_name as client_name,
          s.service_name,
          t.work_type,
          t.work_date,
          t.hours
        FROM Timesheets t
        LEFT JOIN Clients c ON c.client_id = t.client_id
        LEFT JOIN Services s ON s.service_id = t.service_id
        WHERE t.user_id = ? 
          AND substr(t.work_date, 1, 4) = ?
          AND t.is_deleted = 0
        ORDER BY t.work_date, t.work_type
      `).bind(user.user_id, String(year)).all();

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

    // 計算每個客戶的標準工時和加權工時
    const clientHoursMap = new Map(); // key: clientId
    const processedStandardFixedKeys = new Set(); // key: `${clientId}:${date}:${workTypeId}`
    
    for (const ts of timesheetRows?.results || []) {
      const clientId = ts.client_id;
      if (!clientId) continue;

      const hours = Number(ts.hours || 0);
      const workTypeId = parseInt(ts.work_type) || 1;
      const workType = WORK_TYPES[workTypeId];
      const date = ts.work_date;

      if (!workType) continue;

      if (!clientHoursMap.has(clientId)) {
        clientHoursMap.set(clientId, {
          clientId: clientId,
          clientName: ts.client_name || "未知客戶",
          serviceName: ts.service_name || "綜合服務",
          standardHours: 0,
          weightedHours: 0,
        });
      }

      const client = clientHoursMap.get(clientId);
      
      // 計算加權工時
      const weighted = calculateWeightedHours(workTypeId, hours);
      client.weightedHours += weighted;

      // 計算標準工時（只計算 work_type = 1, 7, 10）
      if (workType.standard === 'regular') {
        // work_type = 1: 直接累加
        client.standardHours += hours;
      } else if (workType.standard === 'fixed') {
        // work_type = 7, 10: 固定 8 小時類型，每日最多 8 小時
        const key = `${clientId}:${date}:${workTypeId}`;
        if (!processedStandardFixedKeys.has(key)) {
          const fixedTotal = dailyFixedTypeMap.get(key) || hours;
          const standardHoursForDay = Math.min(fixedTotal, 8);
          client.standardHours += standardHoursForDay;
          processedStandardFixedKeys.add(key);
        }
      }
    }

    // 为每个客户分配收入（使用标准工时）
    for (const [clientId, clientData] of clientHoursMap) {
      // 获取该客户的全年总标准工时（所有员工）
      // 需要重新查询所有员工的工时记录来计算总标准工时
      const allClientTimesheetRows = await env.DATABASE.prepare(`
          SELECT 
            t.work_type,
            t.work_date,
            t.hours
          FROM Timesheets t
          WHERE t.client_id = ? 
            AND substr(t.work_date, 1, 4) = ? 
            AND t.is_deleted = 0
          ORDER BY t.work_date, t.work_type
        `).bind(clientId, String(year)).all();

      // 計算該客戶的總標準工時
      const allDailyFixedTypeMap = new Map(); // key: `${date}:${workTypeId}`
      for (const log of allClientTimesheetRows?.results || []) {
        const date = log.work_date;
        const workTypeId = parseInt(log.work_type) || 1;
        const workType = WORK_TYPES[workTypeId];
        const hours = Number(log.hours || 0);
        
        if (workType && workType.special === 'fixed_8h') {
          const key = `${date}:${workTypeId}`;
          const current = allDailyFixedTypeMap.get(key) || 0;
          allDailyFixedTypeMap.set(key, current + hours);
        }
      }

      let clientTotalStandardHours = 0;
      const processedAllStandardFixedKeys = new Set(); // key: `${date}:${workTypeId}`
      
      for (const ts of allClientTimesheetRows?.results || []) {
        const hours = Number(ts.hours || 0);
        const workTypeId = parseInt(ts.work_type) || 1;
        const workType = WORK_TYPES[workTypeId];
        const date = ts.work_date;

        if (!workType) continue;

        if (workType.standard === 'regular') {
          // work_type = 1: 直接累加
          clientTotalStandardHours += hours;
        } else if (workType.standard === 'fixed') {
          // work_type = 7, 10: 固定 8 小時類型，每日最多 8 小時
          const key = `${date}:${workTypeId}`;
          if (!processedAllStandardFixedKeys.has(key)) {
            const fixedTotal = allDailyFixedTypeMap.get(key) || hours;
            const standardHoursForDay = Math.min(fixedTotal, 8);
            clientTotalStandardHours += standardHoursForDay;
            processedAllStandardFixedKeys.add(key);
          }
        }
      }

      if (clientTotalStandardHours === 0) continue;

      // 获取该客户的全年收入
      const clientRevenue = clientRevenueMap.get(clientId) || 0;

      // 按標準工時比例分配收入给该员工
      const employeeRevenue = clientRevenue * (clientData.standardHours / clientTotalStandardHours);
      annualRevenue += employeeRevenue;

      // 客户分布
      clientDistribution.set(clientId, {
        clientId: clientData.clientId,
        clientName: clientData.clientName,
        serviceName: clientData.serviceName,
        hours: clientData.standardHours, // 使用標準工時
        weightedHours: clientData.weightedHours,
        generatedRevenue: employeeRevenue,
        revenuePercentage: 0,
      });
    }

    // 计算客户分布的收入占比
    const clientDistArray = Array.from(clientDistribution.values()).map((d) => ({
      ...d,
      revenuePercentage:
        annualRevenue > 0 ? Number((d.generatedRevenue / annualRevenue * 100).toFixed(2)) : 0,
    }));

    // 計算全年薪資成本（應發）：從 PayrollCache 或 calculateEmployeePayroll 獲取
    let annualGrossSalary = 0;
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, "0")}`;
      
      // 先嘗試從 PayrollCache 獲取
      const payrollCacheRow = await env.DATABASE.prepare(`
          SELECT gross_salary_cents
          FROM PayrollCache
          WHERE user_id = ? AND year_month = ? AND is_deleted = 0
        `).bind(user.user_id, ym).first();
      
      if (payrollCacheRow?.gross_salary_cents) {
        annualGrossSalary += Number(payrollCacheRow.gross_salary_cents) / 100;
      } else {
        // 如果快取不存在，使用 calculateEmployeePayroll 計算
        try {
          const payroll = await calculateEmployeePayroll(env, user.user_id, ym);
          if (payroll) {
            annualGrossSalary += payroll.grossSalaryCents / 100;
          }
        } catch (err) {
          console.warn(`[AnnualEmployeePerformance] 計算薪資失敗 (user: ${user.user_id}, month: ${ym}):`, err);
        }
      }
    }

    // 計算全年管理費分攤
    let annualOverheadAllocation = 0;
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, "0")}`;
      
      try {
        // 獲取該月的總工時（用於 per_hour 分配）
        const totalHoursRow = await env.DATABASE.prepare(`
            SELECT SUM(hours) as total_hours
            FROM Timesheets
            WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0
          `).bind(ym).first();
        const totalHours = Number(totalHoursRow?.total_hours || 0);

        // 獲取該員工該月的工時
        const empHoursRow = await env.DATABASE.prepare(`
            SELECT SUM(hours) as emp_hours
            FROM Timesheets
            WHERE user_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0
          `).bind(user.user_id, ym).first();
        const empHours = Number(empHoursRow?.emp_hours || 0);

        // 獲取該月的管理費分攤
        const overheadRow = await env.DATABASE.prepare(
          `SELECT SUM(oc.amount *
              CASE 
                WHEN ot.allocation_method = 'per_employee' THEN 1.0 / (SELECT COUNT(*) FROM Users WHERE is_deleted = 0)
                WHEN ot.allocation_method = 'per_hour' THEN 
                  CASE WHEN ? > 0 THEN ? / ? ELSE 0 END
                ELSE 0
              END
           ) AS overhead
           FROM OverheadCosts oc
           JOIN OverheadTypes ot ON ot.id = oc.cost_type_id
           WHERE oc.year = ? AND oc.month = ? AND oc.is_deleted = 0`
        ).bind(totalHours, empHours, totalHours, year, m).first();

        const monthOverhead = Number(overheadRow?.overhead || 0);
        annualOverheadAllocation += monthOverhead;
      } catch (err) {
        console.warn(`[AnnualEmployeePerformance] 獲取管理費失敗 (user: ${user.user_id}, month: ${m}):`, err);
      }
    }

    // 員工年度成本 = 全年薪資成本（應發）+ 全年管理費分攤
    const annualCost = annualGrossSalary + annualOverheadAllocation;

    const annualProfit = annualRevenue - annualCost;
    const annualProfitMargin = annualRevenue > 0 ? (annualProfit / annualRevenue * 100) : 0;

    // 计算月度趋势
    const monthlyTrend = [];
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, "0")}`;

      const monthStats = await getTimesheetMonthlyStats(env, user.user_id, ym);
      const monthStandardHours = monthStats?.standard_hours || 0;
      const monthWeightedHours = monthStats?.weighted_hours || 0;
      annualStandardHours += monthStandardHours;
      annualWeightedHours += monthWeightedHours;

      // 获取该月收入（使用应计制）
      const monthlyClientRevenues = await getMonthlyRevenueByClient(ym, env);

      let monthRevenue = 0;

      // 获取该员工該月在各客户的工时记录（用于计算标准工时）
      const employeeClientTimesheetRows = await env.DATABASE.prepare(`
          SELECT 
            client_id,
            work_type,
            work_date,
            hours
          FROM Timesheets
          WHERE user_id = ? 
            AND substr(work_date, 1, 7) = ?
            AND is_deleted = 0
          ORDER BY work_date, work_type
        `).bind(user.user_id, ym).all();

      // 按客戶分組計算標準工時
      const monthlyClientStandardHoursMap = new Map(); // key: clientId
      const monthlyDailyFixedTypeMap = new Map(); // key: `${clientId}:${date}:${workTypeId}`
      const processedMonthlyStandardFixedKeys = new Set(); // key: `${clientId}:${date}:${workTypeId}`

      // 統計固定 8 小時類型的每日總工時
      for (const log of employeeClientTimesheetRows?.results || []) {
        const clientId = log.client_id;
        if (!clientId) continue;
        
        const date = log.work_date;
        const workTypeId = parseInt(log.work_type) || 1;
        const workType = WORK_TYPES[workTypeId];
        const hours = Number(log.hours || 0);
        
        if (workType && workType.special === 'fixed_8h') {
          const key = `${clientId}:${date}:${workTypeId}`;
          const current = monthlyDailyFixedTypeMap.get(key) || 0;
          monthlyDailyFixedTypeMap.set(key, current + hours);
        }
      }

      // 計算每個客戶的標準工時
      for (const ts of employeeClientTimesheetRows?.results || []) {
        const clientId = ts.client_id;
        if (!clientId) continue;

        const hours = Number(ts.hours || 0);
        const workTypeId = parseInt(ts.work_type) || 1;
        const workType = WORK_TYPES[workTypeId];
        const date = ts.work_date;

        if (!workType) continue;

        if (!monthlyClientStandardHoursMap.has(clientId)) {
          monthlyClientStandardHoursMap.set(clientId, 0);
        }

        if (workType.standard === 'regular') {
          // work_type = 1: 直接累加
          monthlyClientStandardHoursMap.set(
            clientId,
            monthlyClientStandardHoursMap.get(clientId) + hours
          );
        } else if (workType.standard === 'fixed') {
          // work_type = 7, 10: 固定 8 小時類型，每日最多 8 小時
          const key = `${clientId}:${date}:${workTypeId}`;
          if (!processedMonthlyStandardFixedKeys.has(key)) {
            const fixedTotal = monthlyDailyFixedTypeMap.get(key) || hours;
            const standardHoursForDay = Math.min(fixedTotal, 8);
            monthlyClientStandardHoursMap.set(
              clientId,
              monthlyClientStandardHoursMap.get(clientId) + standardHoursForDay
            );
            processedMonthlyStandardFixedKeys.add(key);
          }
        }
      }

      // 為每個客戶分配收入（使用標準工時）
      for (const [clientId, empStandardHours] of monthlyClientStandardHoursMap) {
        // 獲取該客戶該月的總標準工時（所有員工）
        const allClientTimesheetRows = await env.DATABASE.prepare(`
            SELECT 
              work_type,
              work_date,
              hours
            FROM Timesheets
            WHERE client_id = ? 
              AND substr(work_date, 1, 7) = ?
              AND is_deleted = 0
            ORDER BY work_date, work_type
          `).bind(clientId, ym).all();

        // 計算該客戶的總標準工時
        const allMonthlyDailyFixedTypeMap = new Map(); // key: `${date}:${workTypeId}`
        for (const log of allClientTimesheetRows?.results || []) {
          const date = log.work_date;
          const workTypeId = parseInt(log.work_type) || 1;
          const workType = WORK_TYPES[workTypeId];
          const hours = Number(log.hours || 0);
          
          if (workType && workType.special === 'fixed_8h') {
            const key = `${date}:${workTypeId}`;
            const current = allMonthlyDailyFixedTypeMap.get(key) || 0;
            allMonthlyDailyFixedTypeMap.set(key, current + hours);
          }
        }

        let clientTotalStandardHours = 0;
        const processedAllMonthlyStandardFixedKeys = new Set(); // key: `${date}:${workTypeId}`
        
        for (const ts of allClientTimesheetRows?.results || []) {
          const hours = Number(ts.hours || 0);
          const workTypeId = parseInt(ts.work_type) || 1;
          const workType = WORK_TYPES[workTypeId];
          const date = ts.work_date;

          if (!workType) continue;

          if (workType.standard === 'regular') {
            // work_type = 1: 直接累加
            clientTotalStandardHours += hours;
          } else if (workType.standard === 'fixed') {
            // work_type = 7, 10: 固定 8 小時類型，每日最多 8 小時
            const key = `${date}:${workTypeId}`;
            if (!processedAllMonthlyStandardFixedKeys.has(key)) {
              const fixedTotal = allMonthlyDailyFixedTypeMap.get(key) || hours;
              const standardHoursForDay = Math.min(fixedTotal, 8);
              clientTotalStandardHours += standardHoursForDay;
              processedAllMonthlyStandardFixedKeys.add(key);
            }
          }
        }

        if (clientTotalStandardHours === 0) continue;

        const clientRevenue = Number(monthlyClientRevenues[clientId] || 0);
        // 按標準工時比例分配收入
        monthRevenue += clientRevenue * (empStandardHours / clientTotalStandardHours);
      }

      // 計算該月的薪資成本（應發）
      let monthGrossSalary = 0;
      const payrollCacheRow = await env.DATABASE.prepare(`
          SELECT gross_salary_cents
          FROM PayrollCache
          WHERE user_id = ? AND year_month = ? AND is_deleted = 0
        `).bind(user.user_id, ym).first();
      
      if (payrollCacheRow?.gross_salary_cents) {
        monthGrossSalary = Number(payrollCacheRow.gross_salary_cents) / 100;
      } else {
        // 如果快取不存在，使用 calculateEmployeePayroll 計算
        try {
          const payroll = await calculateEmployeePayroll(env, user.user_id, ym);
          if (payroll) {
            monthGrossSalary = payroll.grossSalaryCents / 100;
          }
        } catch (err) {
          console.warn(`[AnnualEmployeePerformance] 計算月度薪資失敗 (user: ${user.user_id}, month: ${ym}):`, err);
        }
      }

      // 計算該月的管理費分攤
      let monthOverheadAllocation = 0;
      try {
        // 獲取該月的總工時（用於 per_hour 分配）
        const totalHoursRow = await env.DATABASE.prepare(`
            SELECT SUM(hours) as total_hours
            FROM Timesheets
            WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0
          `).bind(ym).first();
        const totalHours = Number(totalHoursRow?.total_hours || 0);

        // 獲取該員工該月的工時
        const empHoursRow = await env.DATABASE.prepare(`
            SELECT SUM(hours) as emp_hours
            FROM Timesheets
            WHERE user_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0
          `).bind(user.user_id, ym).first();
        const empHours = Number(empHoursRow?.emp_hours || 0);

        // 獲取該月的管理費分攤（與月度報表邏輯一致）
        const overheadRow = await env.DATABASE.prepare(
          `SELECT SUM(oc.amount *
              CASE 
                WHEN ot.allocation_method = 'per_employee' THEN 1.0 / (SELECT COUNT(*) FROM Users WHERE is_deleted = 0)
                WHEN ot.allocation_method = 'per_hour' THEN 
                  CASE WHEN ? > 0 THEN ? / ? ELSE 0 END
                ELSE 0
              END
           ) AS overhead
           FROM OverheadCosts oc
           JOIN OverheadTypes ot ON ot.id = oc.cost_type_id
           WHERE oc.year = ? AND oc.month = ? AND oc.is_deleted = 0`
        ).bind(totalHours, empHours, totalHours, year, m).first();

        monthOverheadAllocation = Number(overheadRow?.overhead || 0);
      } catch (err) {
        console.warn(`[AnnualEmployeePerformance] 獲取月度管理費失敗 (user: ${user.user_id}, month: ${m}):`, err);
      }

      // 月度成本 = 月度薪資成本（應發）+ 月度管理費分攤
      const monthCost = monthGrossSalary + monthOverheadAllocation;
      const monthProfit = monthRevenue - monthCost;

      monthlyTrend.push({
        month: m,
        standardHours: Number(monthStandardHours.toFixed(1)),
        weightedHours: Number(monthWeightedHours.toFixed(1)),
        revenue: Number(monthRevenue.toFixed(2)),
        cost: Number(monthCost.toFixed(2)),
        profit: Number(monthProfit.toFixed(2)),
        profitMargin:
          monthRevenue > 0 ? Number((monthProfit / monthRevenue * 100).toFixed(2)) : 0,
      });
    }

    employeeSummary.push({
      userId: user.user_id,
      name: user.name || user.username,
      annualStandardHours: Number(annualStandardHours.toFixed(1)),
      annualWeightedHours: Number(annualWeightedHours.toFixed(1)),
      hoursDifference: Number((annualWeightedHours - annualStandardHours).toFixed(1)),
      annualRevenue: Number(annualRevenue.toFixed(2)),
      annualCost: Number(annualCost.toFixed(2)),
      annualProfit: Number(annualProfit.toFixed(2)),
      annualProfitMargin: Number(annualProfitMargin.toFixed(2)),
      monthlyTrend,
      clientDistribution: clientDistArray,
    });
  }

  return {
    employeeSummary,
  };
}

export async function handleAnnualEmployeePerformance(request, env, ctx, requestId, url) {
  try {
    const params = url.searchParams;
    const year = parseInt(params.get("year") || "0", 10);

    if (!Number.isFinite(year) || year < 2000) {
      return errorResponse(422, "VALIDATION_ERROR", "請選擇查詢年度", null, requestId);
    }

    const forceRefresh = params.get("refresh") === "1";

    const cached = await getReportCache(env, REPORT_TYPE, year, null, true);

    if (!forceRefresh && cached?.data) {
      return successResponse(cached.data, "查詢成功", requestId, {
        cacheHit: true,
        cachedAt: cached.computedAt || null,
      });
    } else {
      await deleteReportCache(env, REPORT_TYPE, year, null, true).catch(() => {});
    }

    const data = await computeAnnualEmployeePerformance(env, year);
    await setReportCache(env, REPORT_TYPE, year, data, null, true);

    return successResponse(data, "查詢成功", requestId, {
      cacheHit: false,
      refreshed: forceRefresh,
    });
  } catch (err) {
    console.error(`[AnnualEmployeePerformance] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}



