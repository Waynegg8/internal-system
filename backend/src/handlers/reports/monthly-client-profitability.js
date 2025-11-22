/**
 * 月度客户盈利能力报表
 * 使用应计制获取收入，从成本 API 获取准确的成本数据
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { getMonthlyRevenueByClient, allocateRevenueByServiceType } from "./revenue-allocation.js";
import { handleGetClientCosts } from "../costs/task-costs.js";
import { getReportCache, setReportCache, deleteReportCache } from "../../utils/report-cache.js";

const REPORT_TYPE = "monthly-client-profitability";

function formatMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function computeMonthlyClientProfitability(env, ctx, request, url, year, month) {
  const ym = formatMonth(year, month);

  const costUrl = new URL(url);
  costUrl.pathname = "/api/v2/admin/client-costs";
  costUrl.searchParams.set("year", String(year));
  costUrl.searchParams.set("month", String(month));

  const costResponse = await handleGetClientCosts(
    new Request(costUrl.toString(), request),
    env,
    ctx,
    null,
    costUrl
  );
  const costJson = await costResponse.json();

  if (!costJson.ok) {
    throw new Error("無法獲取客戶成本數據");
  }

  const costClients = costJson.data?.clients || [];
  const revenueMap = await getMonthlyRevenueByClient(ym, env);

  const allClientIds = [...new Set([
    ...costClients.map((c) => c.clientId),
    ...Object.keys(revenueMap),
  ])];

  const clientNames = new Map();
  if (allClientIds.length > 0) {
    const placeholders = allClientIds.map(() => "?").join(",");
    const nameRows = await env.DATABASE.prepare(
      `SELECT client_id, company_name
       FROM Clients
       WHERE client_id IN (${placeholders})`
    ).bind(...allClientIds).all();

    for (const row of nameRows?.results || []) {
      clientNames.set(row.client_id, row.company_name);
    }
  }

  const costMap = new Map(costClients.map((client) => [client.clientId, client]));

  const clients = [];

  for (const clientId of allClientIds) {
    const cost = costMap.get(clientId);
    const revenue = Number(revenueMap[clientId] || 0);
    const totalCost = Number(cost?.totalCost || 0);
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const serviceDetails = await allocateRevenueByServiceType(clientId, ym, revenue, env);

    clients.push({
      clientId,
      clientName: clientNames.get(clientId) || cost?.clientName || "未知客戶",
      totalHours: Number(cost?.totalHours || 0),
      weightedHours: Number(cost?.weightedHours || 0),
      avgHourlyRate: Number(cost?.avgHourlyRate || 0),
      totalCost: Number(totalCost.toFixed(2)),
      revenue: Number(revenue.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(2)),
      serviceDetails,
    });
  }

  clients.sort((a, b) => b.revenue - a.revenue);
  return { clients };
}

export async function handleMonthlyClientProfitability(request, env, ctx, requestId, url) {
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

    const data = await computeMonthlyClientProfitability(env, ctx, request, url, year, month);
    await setReportCache(env, REPORT_TYPE, year, data, month);

    return successResponse(data, "查詢成功", requestId, {
      cacheHit: false,
      refreshed: forceRefresh,
    });
  } catch (err) {
    console.error("[MonthlyClientProfitability] Error:", err);
    return errorResponse(500, "INTERNAL_ERROR", err.message || "伺服器錯誤", null, requestId);
  }
}


