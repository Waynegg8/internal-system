/**
 * 年度员工绩效报表
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { calculateWeightedHours } from "./work-types.js";
import { getMonthlyRevenueByClient } from "./revenue-allocation.js";
import { getTimesheetMonthlyStats } from "../../utils/payroll-helpers.js";

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

  // 为每个员工计算年度产值
  for (const user of users) {
    let annualStandardHours = 0;
    let annualWeightedHours = 0;
    let annualRevenue = 0;
    const clientDistribution = new Map();

    // 获取该员工全年的工时记录（按客户分组）
    const clientHoursRows = await env.DATABASE.prepare(`
        SELECT 
          t.client_id,
          c.company_name as client_name,
          s.service_name,
          t.work_type,
          SUM(t.hours) as total_hours
        FROM Timesheets t
        LEFT JOIN Clients c ON c.client_id = t.client_id
        LEFT JOIN Services s ON s.service_id = t.service_id
        WHERE t.user_id = ? 
          AND substr(t.work_date, 1, 4) = ?
          AND t.is_deleted = 0
        GROUP BY t.client_id, t.work_type
      `).bind(user.user_id, String(year)).all();

    // 按客户聚合工时
    const clientHoursMap = new Map();
    for (const row of clientHoursRows?.results || []) {
      const clientId = row.client_id;
      if (!clientId) continue;

      const hours = Number(row.total_hours || 0);
      const workTypeId = parseInt(row.work_type) || 1;
      const weighted = calculateWeightedHours(workTypeId, hours);

      if (!clientHoursMap.has(clientId)) {
        clientHoursMap.set(clientId, {
          clientId: clientId,
          clientName: row.client_name || "未知客戶",
          serviceName: row.service_name || "綜合服務",
          hours: 0,
          weightedHours: 0,
        });
      }

      const client = clientHoursMap.get(clientId);
      client.hours += hours;
      client.weightedHours += weighted;
    }

    // 为每个客户分配收入
    for (const [clientId, clientData] of clientHoursMap) {
      // 获取该客户的全年总工时（所有员工）
      const totalRow = await env.DATABASE.prepare(`
          SELECT SUM(hours) as total_hours
          FROM Timesheets
          WHERE client_id = ? 
            AND substr(work_date, 1, 4) = ? 
            AND is_deleted = 0
        `).bind(clientId, String(year)).first();
      const clientTotalHours = Number(totalRow?.total_hours || 0);
      if (clientTotalHours === 0) continue;

      // 获取该客户的全年收入
      const clientRevenue = clientRevenueMap.get(clientId) || 0;

      // 按工时比例分配收入给该员工
      const employeeRevenue = clientRevenue * (clientData.hours / clientTotalHours);
      annualRevenue += employeeRevenue;

      // 客户分布
      clientDistribution.set(clientId, {
        clientId: clientData.clientId,
        clientName: clientData.clientName,
        serviceName: clientData.serviceName,
        hours: clientData.hours,
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

    // 成本：底薪×12
    const baseSalary = Number(user.base_salary || 0);
    const annualCost = baseSalary * 12;

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

      // 获取该员工該月在各客户的工时
      const employeeClientHoursRows = await env.DATABASE.prepare(`
          SELECT client_id, SUM(hours) as emp_hours
          FROM Timesheets
          WHERE user_id = ? 
            AND substr(work_date, 1, 7) = ?
            AND is_deleted = 0
          GROUP BY client_id
        `).bind(user.user_id, ym).all();
      for (const row of employeeClientHoursRows?.results || []) {
        const clientId = row.client_id;
        if (!clientId) continue;

        const empHours = Number(row.emp_hours || 0);

        // 获取该客户该月的总工时（所有员工）
        const clientTotalHoursRow = await env.DATABASE.prepare(`
            SELECT SUM(hours) as total_hours
            FROM Timesheets
            WHERE client_id = ? 
              AND substr(work_date, 1, 7) = ?
              AND is_deleted = 0
          `).bind(clientId, ym).first();
        const clientTotalHours = Number(clientTotalHoursRow?.total_hours || 0);
        if (clientTotalHours === 0) continue;

        const clientRevenue = Number(monthlyClientRevenues[clientId] || 0);
        monthRevenue += clientRevenue * (empHours / clientTotalHours);
      }

      const monthCost = baseSalary;
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

    const data = await computeAnnualEmployeePerformance(env, year);
    return successResponse(data, "查詢成功", requestId);
  } catch (err) {
    console.error(`[AnnualEmployeePerformance] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}



