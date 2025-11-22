/**
 * 年度客户盈利能力报表
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { calculateWeightedHours } from "./work-types.js";
import { getAnnualRevenueByClient } from "./revenue-allocation.js";
import { getReportCache, setReportCache } from "../../utils/report-cache.js";
import { calculateEmployeePayroll } from "../../utils/payroll-calculator.js";
import {
  calculateRecurringServiceRevenue,
  calculateOneTimeServiceRevenue
} from "../../utils/billing-calculator.js";

const REPORT_TYPE = "annual-client-profitability";

/**
 * 按服務類型分攤客戶年度收入（使用 BR1.3.3 規則）
 * 
 * 此函數已重構為使用 BR1.3.3 應計收入計算邏輯：
 * - 定期服務：按執行次數比例分攤收費計劃總金額（累加全年所有月份的月度收入）
 * - 一次性服務：直接使用收費計劃實際金額（累加全年所有月份的月度收入）
 * 
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {number} totalRevenue - 客戶該年度總收入（用於計算百分比，實際收入從收費計劃計算）
 * @param {Object} env - Cloudflare Workers 環境變數
 * @returns {Promise<Array>} 服務類型收入分攤明細陣列
 *   - serviceId: 服務 ID
 *   - serviceName: 服務名稱
 *   - hours: 工時（保留欄位，設為 0，因為不再使用工時計算）
 *   - weightedHours: 加權工時（保留欄位，設為 0，因為不再使用工時計算）
 *   - revenue: 該服務該年度應計收入
 *   - revenuePercentage: 該服務收入佔總收入的百分比
 */
async function getAnnualServiceTypeDetails(clientId, year, totalRevenue, env) {
  // 驗證年度參數
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and 2100.`);
  }

  // 使用 BR1.3.3 邏輯計算年度應計收入
  const [recurringResult, oneTimeResult] = await Promise.all([
    calculateRecurringServiceRevenue(env, clientId, year),
    calculateOneTimeServiceRevenue(env, clientId, year)
  ]);

  const serviceDetails = [];
  const serviceMap = new Map();

  // 處理定期服務：按執行次數比例分攤（使用年度分攤收入）
  for (const service of recurringResult.services || []) {
    const serviceId = service.serviceId || 0;
    const serviceName = service.serviceName || '未命名服務';
    
    // 使用年度分攤收入（已經按執行次數比例分攤）
    const annualRevenue = Number(service.annualAllocatedRevenue || 0);

    // 如果該服務已存在（可能有多個收費計劃），累加收入
    if (serviceMap.has(serviceId)) {
      const existing = serviceMap.get(serviceId);
      existing.revenue += annualRevenue;
    } else {
      serviceMap.set(serviceId, {
        serviceId,
        serviceName,
        hours: 0, // 不再使用工時計算
        weightedHours: 0, // 不再使用工時計算
        revenue: annualRevenue
      });
    }
  }

  // 處理一次性服務：直接使用收費計劃實際金額（累加全年所有月份的月度收入）
  for (const service of oneTimeResult.services || []) {
    const serviceId = service.serviceId || 0;
    const serviceName = service.serviceName || '未命名服務';
    
    // 計算該服務的年度總收入（累加所有月份的月度收入）
    let annualRevenue = 0;
    if (service.monthlyRevenue && typeof service.monthlyRevenue === 'object') {
      // 累加所有月份的月度收入
      for (const month in service.monthlyRevenue) {
        annualRevenue += Number(service.monthlyRevenue[month] || 0);
      }
    } else if (service.annualRevenue) {
      // 如果已經有年度收入，直接使用
      annualRevenue = service.annualRevenue;
    }

    // 如果該服務已存在（可能有多個收費計劃），累加收入
    if (serviceMap.has(serviceId)) {
      const existing = serviceMap.get(serviceId);
      existing.revenue += annualRevenue;
    } else {
      serviceMap.set(serviceId, {
        serviceId,
        serviceName,
        hours: 0, // 不再使用工時計算
        weightedHours: 0, // 不再使用工時計算
        revenue: annualRevenue
      });
    }
  }

  // 如果沒有服務或總收入為 0，返回空陣列
  if (serviceMap.size === 0 || totalRevenue === 0) {
    return [];
  }

  // 計算每個服務的收入百分比並構建結果陣列
  for (const [serviceId, service] of serviceMap) {
    const revenuePercentage = totalRevenue > 0
      ? (service.revenue / totalRevenue) * 100
      : 0;

    serviceDetails.push({
      serviceId,
      serviceName: service.serviceName,
      hours: 0, // 保留欄位，設為 0
      weightedHours: 0, // 保留欄位，設為 0
      revenue: Number(service.revenue.toFixed(2)),
      revenuePercentage: Number(revenuePercentage.toFixed(1))
    });
  }

  // 按收入降序排序
  serviceDetails.sort((a, b) => b.revenue - a.revenue);
  return serviceDetails;
}

/**
 * 計算所有員工的年度實際時薪（包含全年薪資成本和管理費分攤）
 * @param {Object} env - Cloudflare環境對象
 * @param {number} year - 年份
 * @returns {Promise<Object>} { userId: actualHourlyRate, ... }
 */
async function calculateAllEmployeesAnnualActualHourlyRate(env, year) {
  // 獲取所有員工
  const usersRows = await env.DATABASE.prepare(
    "SELECT user_id, name, base_salary FROM Users WHERE is_deleted = 0"
  ).all();
  const usersList = usersRows?.results || [];

  const employeeActualHourlyRates = {};

  // 為每個員工計算年度實際時薪
  for (const user of usersList) {
    const userId = user.user_id;
    const userIdStr = String(userId);

    // 計算全年薪資成本（應發）
    let annualGrossSalary = 0;
    for (let m = 1; m <= 12; m++) {
      const ym = `${year}-${String(m).padStart(2, "0")}`;
      
      // 先嘗試從 PayrollCache 獲取
      const payrollCacheRow = await env.DATABASE.prepare(`
          SELECT gross_salary_cents
          FROM PayrollCache
          WHERE user_id = ? AND year_month = ? AND is_deleted = 0
        `).bind(userId, ym).first();
      
      if (payrollCacheRow?.gross_salary_cents) {
        annualGrossSalary += Number(payrollCacheRow.gross_salary_cents) / 100;
      } else {
        // 如果快取不存在，使用 calculateEmployeePayroll 計算
        try {
          const payroll = await calculateEmployeePayroll(env, userId, ym);
          if (payroll) {
            annualGrossSalary += payroll.grossSalaryCents / 100;
          }
        } catch (err) {
          console.warn(`[AnnualClientProfitability] 計算薪資失敗 (user: ${userId}, month: ${ym}):`, err);
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
          `).bind(userId, ym).first();
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
        console.warn(`[AnnualClientProfitability] 獲取管理費失敗 (user: ${userId}, month: ${m}):`, err);
      }
    }

    // 計算全年工時
    const annualHoursRow = await env.DATABASE.prepare(`
        SELECT SUM(hours) as total_hours
        FROM Timesheets
        WHERE user_id = ? AND substr(work_date, 1, 4) = ? AND is_deleted = 0
      `).bind(userId, String(year)).first();
    const annualHours = Number(annualHoursRow?.total_hours || 0);

    // 計算年度實際時薪 = (全年薪資成本（應發）+ 全年管理費分攤) / 全年工時
    const annualTotalCost = annualGrossSalary + annualOverheadAllocation;
    const actualHourlyRate = annualHours > 0 ? annualTotalCost / annualHours : 0;

    employeeActualHourlyRates[userIdStr] = actualHourlyRate;
  }

  return employeeActualHourlyRates;
}

export async function computeAnnualClientProfitability(env, year) {
  const revenueMap = await getAnnualRevenueByClient(year, env);

  // 計算所有員工的年度實際時薪
  const employeeActualHourlyRates = await calculateAllEmployeesAnnualActualHourlyRate(env, year);

  // 獲取所有工時記錄（按客戶和員工分組）
  const timesheetsResult = await env.DATABASE.prepare(
    `SELECT 
        t.client_id,
        t.user_id,
        SUM(t.hours) AS total_hours
     FROM Timesheets t
     WHERE substr(t.work_date, 1, 4) = ?
       AND t.is_deleted = 0
     GROUP BY t.client_id, t.user_id`
  ).bind(String(year)).all();

  const clients = new Map();

  // 初始化客戶記錄
  for (const [clientId, revenue] of Object.entries(revenueMap)) {
    clients.set(clientId, {
      clientId,
      annualRevenue: Number(revenue || 0),
      totalHours: 0,
      weightedHours: 0,
      annualCost: 0,
    });
  }

  // 計算每個客戶的成本（基於員工實際時薪）
  for (const row of timesheetsResult?.results || []) {
    const clientId = row.client_id;
    const userId = String(row.user_id);
    if (!clientId || !userId) continue;

    if (!clients.has(clientId)) {
      clients.set(clientId, {
        clientId,
        annualRevenue: 0,
        totalHours: 0,
        weightedHours: 0,
        annualCost: 0,
      });
    }

    const client = clients.get(clientId);
    const hours = Number(row.total_hours || 0);
    client.totalHours += hours;

    // 獲取員工實際時薪
    const actualHourlyRate = employeeActualHourlyRates[userId] || 0;
    
    // 計算該員工為該客戶的成本 = 員工實際時薪 × 該員工為該客戶的工時
    const employeeClientCost = actualHourlyRate * hours;
    client.annualCost += employeeClientCost;
  }

  // 計算加權工時（用於顯示）
  const weightedRows = await env.DATABASE.prepare(
    `SELECT 
        t.client_id,
        t.work_type,
        t.work_date,
        SUM(t.hours) AS total_hours
     FROM Timesheets t
     WHERE substr(t.work_date, 1, 4) = ?
       AND t.is_deleted = 0
     GROUP BY t.client_id, t.work_type, t.work_date`
  ).bind(String(year)).all();

  const processedFixed = new Set();
  for (const row of weightedRows?.results || []) {
    const clientId = row.client_id;
    if (!clients.has(clientId)) continue;

    const hours = Number(row.total_hours || 0);
    const workTypeId = parseInt(row.work_type) || 1;
    const workDate = row.work_date;

    let weighted;
    if (workTypeId === 7 || workTypeId === 10) {
      const key = `${clientId}:${workDate}:${workTypeId}`;
      if (!processedFixed.has(key)) {
        weighted = 8.0;
        processedFixed.add(key);
      } else {
        weighted = 0;
      }
    } else {
      weighted = calculateWeightedHours(workTypeId, hours);
    }

    const client = clients.get(clientId);
    client.weightedHours += weighted;
  }

  const clientIds = Array.from(clients.keys());
  const clientNames = new Map();
  if (clientIds.length > 0) {
    const placeholders = clientIds.map(() => "?").join(",");
    const nameRows = await env.DATABASE.prepare(
      `SELECT client_id, company_name
       FROM Clients
       WHERE client_id IN (${placeholders})`
    ).bind(...clientIds).all();
    for (const row of nameRows?.results || []) {
      clientNames.set(row.client_id, row.company_name);
    }
  }

  const clientSummary = [];
  for (const [clientId, client] of clients) {
    const annualRevenue = client.annualRevenue;
    const annualCost = client.annualCost; // 使用基於員工實際時薪計算的成本
    const annualProfit = annualRevenue - annualCost;
    const annualProfitMargin = annualRevenue > 0 ? (annualProfit / annualRevenue) * 100 : 0;

    const serviceDetails = await getAnnualServiceTypeDetails(
      clientId,
      year,
      annualRevenue,
      env
    );

    clientSummary.push({
      clientId,
      clientName: clientNames.get(clientId) || "未知客戶",
      annualHours: Number(client.totalHours.toFixed(1)),
      annualWeightedHours: Number(client.weightedHours.toFixed(1)),
      annualCost: Number(annualCost.toFixed(2)),
      annualRevenue: Number(annualRevenue.toFixed(2)),
      annualProfit: Number(annualProfit.toFixed(2)),
      annualProfitMargin: Number(annualProfitMargin.toFixed(2)),
      avgMonthlyRevenue: Number((annualRevenue / 12).toFixed(2)),
      serviceDetails,
    });
  }

  const serviceTypeRows = await env.DATABASE.prepare(
    `SELECT 
        s.service_name,
        SUM(t.hours) AS total_hours,
        t.work_type
     FROM Timesheets t
     JOIN Services s ON s.service_id = t.service_id
     WHERE t.is_deleted = 0
       AND substr(t.work_date, 1, 4) = ?
     GROUP BY s.service_name, t.work_type`
  ).bind(String(year)).all();

  const serviceMap = new Map();
  for (const row of serviceTypeRows?.results || []) {
    const serviceName = row.service_name || "未分類";
    const hours = Number(row.total_hours || 0);
    const workTypeId = parseInt(row.work_type) || 1;
    const weighted = calculateWeightedHours(workTypeId, hours);

    if (!serviceMap.has(serviceName)) {
      serviceMap.set(serviceName, {
        serviceName,
        totalHours: 0,
        weightedHours: 0,
      });
    }

    const service = serviceMap.get(serviceName);
    service.totalHours += hours;
    service.weightedHours += weighted;
  }

  const serviceTypeSummary = Array.from(serviceMap.values()).map((service) => ({
    serviceName: service.serviceName,
    totalHours: Number(service.totalHours.toFixed(1)),
    weightedHours: Number(service.weightedHours.toFixed(1)),
  }));

  const filteredClientSummary = clientSummary
    .filter((client) => client.annualHours > 0 || client.annualRevenue > 0)
    .sort((a, b) => b.annualRevenue - a.annualRevenue);

  return {
    clientSummary: filteredClientSummary,
    serviceTypeSummary,
  };
}

export async function handleAnnualClientProfitability(request, env, ctx, requestId, url) {
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

    const data = await computeAnnualClientProfitability(env, year);
    await setReportCache(env, REPORT_TYPE, year, data, null, true);

    return successResponse(data, "查詢成功", requestId, {
      cacheHit: false,
      refreshed: forceRefresh,
    });
  } catch (err) {
    console.error("[AnnualClientProfitability] Error:", err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}



