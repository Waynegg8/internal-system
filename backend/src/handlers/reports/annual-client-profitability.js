/**
 * 年度客户盈利能力报表
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { calculateWeightedHours } from "./work-types.js";
import { getAnnualRevenueByClient } from "./revenue-allocation.js";
import { getReportCache, setReportCache } from "../../utils/report-cache.js";

const REPORT_TYPE = "annual-client-profitability";
const DEFAULT_AVG_HOURLY_RATE = 500;

async function getAnnualServiceTypeDetails(clientId, year, totalRevenue, env) {
  const rows = await env.DATABASE.prepare(
    `SELECT 
        t.service_id,
        t.work_type,
        t.work_date,
        SUM(t.hours) AS total_hours,
        COALESCE(s.service_name, '未分類') AS service_name
     FROM Timesheets t
     LEFT JOIN Services s ON t.service_id = s.service_id
     WHERE t.client_id = ?
       AND substr(t.work_date, 1, 4) = ?
       AND t.is_deleted = 0
     GROUP BY t.service_id, t.work_type, t.work_date`
  ).bind(clientId, String(year)).all();

  const timesheets = rows?.results || [];
  const serviceMap = new Map();
  const processedFixed = new Set();
  let totalWeightedHours = 0;

  for (const ts of timesheets) {
    const serviceId = ts.service_id || 0;
    const serviceName = ts.service_name;
    const hours = Number(ts.total_hours || 0);
    const workTypeId = parseInt(ts.work_type) || 1;
    const workDate = ts.work_date;

    let weightedHours;
    if (workTypeId === 7 || workTypeId === 10) {
      const key = `${workDate}:${workTypeId}`;
      if (!processedFixed.has(key)) {
        weightedHours = 8.0;
        processedFixed.add(key);
      } else {
        weightedHours = 0;
      }
    } else {
      weightedHours = calculateWeightedHours(workTypeId, hours);
    }

    if (!serviceMap.has(serviceId)) {
      serviceMap.set(serviceId, {
        serviceId,
        serviceName,
        hours: 0,
        weightedHours: 0,
      });
    }

    const service = serviceMap.get(serviceId);
    service.hours += hours;
    service.weightedHours += weightedHours;
    totalWeightedHours += weightedHours;
  }

  if (totalWeightedHours === 0 || totalRevenue === 0) {
    return [];
  }

  const serviceDetails = [];
  for (const [serviceId, service] of serviceMap) {
    const ratio = service.weightedHours / totalWeightedHours;
    const revenue = totalRevenue * ratio;
    serviceDetails.push({
      serviceId,
      serviceName: service.serviceName,
      hours: Number(service.hours.toFixed(1)),
      weightedHours: Number(service.weightedHours.toFixed(1)),
      revenue: Number(revenue.toFixed(2)),
      revenuePercentage: Number((ratio * 100).toFixed(1)),
    });
  }

  serviceDetails.sort((a, b) => b.revenue - a.revenue);
  return serviceDetails;
}

export async function computeAnnualClientProfitability(env, year) {
  const revenueMap = await getAnnualRevenueByClient(year, env);

  const timesheetsResult = await env.DATABASE.prepare(
    `SELECT 
        t.client_id,
        SUM(t.hours) AS total_hours
     FROM Timesheets t
     WHERE substr(t.work_date, 1, 4) = ?
       AND t.is_deleted = 0
     GROUP BY t.client_id`
  ).bind(String(year)).all();

  const clients = new Map();

  for (const [clientId, revenue] of Object.entries(revenueMap)) {
    clients.set(clientId, {
      clientId,
      annualRevenue: Number(revenue || 0),
      totalHours: 0,
      weightedHours: 0,
    });
  }

  for (const row of timesheetsResult?.results || []) {
    const clientId = row.client_id;
    if (!clientId) continue;

    if (!clients.has(clientId)) {
      clients.set(clientId, {
        clientId,
        annualRevenue: 0,
        totalHours: 0,
        weightedHours: 0,
      });
    }

    const client = clients.get(clientId);
    client.totalHours += Number(row.total_hours || 0);
  }

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
    const annualCost = client.totalHours * DEFAULT_AVG_HOURLY_RATE;
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

    const period = String(year);
    const cached = await getReportCache(env, REPORT_TYPE, period);
    if (cached?.data) {
      return successResponse(cached.data, "查詢成功", requestId, {
        cacheHit: true,
        cachedAt: cached.computedAt || null,
      });
    }

    const data = await computeAnnualClientProfitability(env, year);
    await setReportCache(env, REPORT_TYPE, period, data);

    return successResponse(data, "查詢成功", requestId, {
      cacheHit: false,
    });
  } catch (err) {
    console.error("[AnnualClientProfitability] Error:", err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}



