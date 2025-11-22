/**
 * 年度收款報表
 * 以月度期限邏輯彙總全年數據
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { computeMonthlyRevenue } from "./monthly-revenue.js";
import { getReportCache, setReportCache, deleteReportCache } from "../../utils/report-cache.js";

const REPORT_TYPE = "annual-revenue";

export async function computeAnnualRevenue(env, year) {
  const monthlyTrend = [];
  const clientMap = new Map();
  const serviceMap = new Map();
  const receiptOutstandingMap = new Map();

  let totalCurrentReceivable = 0;
  let totalCurrentReceived = 0;
  let totalCurrentOutstanding = 0;
  let totalOverdueRecovered = 0;

  let latestOverdueOutstanding = 0;
  let latestTotalOutstanding = 0;

  for (let month = 1; month <= 12; month += 1) {
    const monthly = await computeMonthlyRevenue(env, year, month);
    const summary = monthly.summary || {
      currentReceivable: 0,
      currentReceived: 0,
      currentOutstanding: 0,
      overdueRecovered: 0,
      overdueOutstanding: 0,
      totalOutstanding: 0,
    };

    monthlyTrend.push({
      month,
      currentReceivable: summary.currentReceivable,
      currentReceived: summary.currentReceived,
      currentOutstanding: summary.currentOutstanding,
      overdueRecovered: summary.overdueRecovered,
      overdueOutstanding: summary.overdueOutstanding,
      totalOutstanding: summary.totalOutstanding,
    });

    totalCurrentReceivable += summary.currentReceivable;
    totalCurrentReceived += summary.currentReceived;
    totalCurrentOutstanding += summary.currentOutstanding;
    totalOverdueRecovered += summary.overdueRecovered;

    latestOverdueOutstanding = summary.overdueOutstanding;
    latestTotalOutstanding = summary.totalOutstanding;

    for (const client of monthly.clients || []) {
      const key = client.clientId || client.client_id || client.clientName || client.client_name || Math.random();
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          clientId: client.clientId || client.client_id || null,
          clientName: client.clientName || client.client_name || "-",
          currentReceivable: 0,
          currentReceived: 0,
          currentOutstanding: 0,
          overdueRecovered: 0,
          overdueOutstanding: 0,
          totalOutstanding: 0,
          serviceMap: new Map(), // 用於存儲服務類型-月份的明細
        });
      }
      const entry = clientMap.get(key);
      entry.currentReceivable += client.currentReceivable || 0;
      entry.currentReceived += client.currentReceived || 0;
      entry.currentOutstanding += client.currentOutstanding || 0;
      entry.overdueRecovered += client.overdueRecovered || 0;
      // 逾期未收和總未收取該月的值（截至該月底的狀態）
      // 每次遇到該客戶時都更新，這樣最後會保留最後一個有數據的月的值（截至12月底的狀態）
      // 這樣可以確保即使某個月沒有新收據，也能保留之前月份的未收餘額
      entry.overdueOutstanding = client.overdueOutstanding || 0;
      entry.totalOutstanding = client.totalOutstanding || 0;

      for (const receipt of client.receipts || []) {
        const serviceName = receipt.serviceType || receipt.serviceName || receipt.service_type || "未分類";
        
        // 為客戶建立服務類型-月份的明細
        const entryServiceMap = entry.serviceMap;
        if (!entryServiceMap.has(serviceName)) {
          entryServiceMap.set(serviceName, new Map());
        }
        const serviceMonthlyMap = entryServiceMap.get(serviceName);
        const serviceMonthlyKey = month;
        if (!serviceMonthlyMap.has(serviceMonthlyKey)) {
          serviceMonthlyMap.set(serviceMonthlyKey, {
            month: serviceMonthlyKey,
            monthNum: month,
            serviceName: serviceName,
            currentReceivable: 0,
            currentReceived: 0,
            currentOutstanding: 0,
            overdueRecovered: 0,
            overdueOutstanding: 0,
            totalOutstanding: 0,
          });
        }
        const clientServiceDetail = serviceMonthlyMap.get(serviceMonthlyKey);
        clientServiceDetail.currentReceivable += receipt.currentReceivable || 0;
        clientServiceDetail.currentReceived += receipt.currentReceived || 0;
        clientServiceDetail.currentOutstanding += receipt.currentOutstanding || 0;
        clientServiceDetail.overdueRecovered += receipt.overdueRecovered || 0;
        clientServiceDetail.overdueOutstanding += receipt.overdueOutstanding || 0;
        clientServiceDetail.totalOutstanding += (receipt.currentOutstanding || 0) + (receipt.overdueOutstanding || 0);
        
        if (!serviceMap.has(serviceName)) {
          serviceMap.set(serviceName, {
            serviceName,
            currentReceivable: 0,
            currentReceived: 0,
            overdueRecovered: 0,
            currentOutstanding: 0,
            monthlyMap: new Map(),
          });
        }
        const serviceEntry = serviceMap.get(serviceName);
        serviceEntry.currentReceivable += receipt.currentReceivable || 0;
        serviceEntry.currentReceived += receipt.currentReceived || 0;
        serviceEntry.currentOutstanding += receipt.currentOutstanding || 0;
        serviceEntry.overdueRecovered += receipt.overdueRecovered || 0;

        // 使用 month-clientId 作為 key，以便區分不同客戶
        const clientId = client.clientId || client.client_id || null;
        const clientName = client.clientName || client.client_name || "未知客戶";
        const monthlyKey = `${month}-${clientId || clientName}`;
        
        if (!serviceEntry.monthlyMap.has(monthlyKey)) {
          serviceEntry.monthlyMap.set(monthlyKey, {
            month: monthlyKey,
            monthNum: month,
            clientId: clientId,
            clientName: clientName,
            currentReceivable: 0,
            currentReceived: 0,
            currentOutstanding: 0,
            overdueRecovered: 0,
            overdueOutstanding: 0,
            totalOutstanding: 0,
          });
        }

        const monthlyDetail = serviceEntry.monthlyMap.get(monthlyKey);
        monthlyDetail.currentReceivable += receipt.currentReceivable || 0;
        monthlyDetail.currentReceived += receipt.currentReceived || 0;
        monthlyDetail.currentOutstanding += receipt.currentOutstanding || 0;
        monthlyDetail.overdueRecovered += receipt.overdueRecovered || 0;
        // 直接從收據數據累加逾期未收和總未收
        monthlyDetail.overdueOutstanding += receipt.overdueOutstanding || 0;
        monthlyDetail.totalOutstanding += (receipt.currentOutstanding || 0) + (receipt.overdueOutstanding || 0);

        const receiptOutstanding =
          (receipt.currentOutstanding || 0) + (receipt.overdueOutstanding || 0);
        receiptOutstandingMap.set(receipt.receiptId || receipt.receipt_id || `${serviceName}-${month}-${Math.random()}`, {
          serviceName,
          outstanding: receiptOutstanding,
          overdueOutstanding: receipt.overdueOutstanding || 0,
          month: monthlyKey,
        });
      }
    }
  }

  for (const serviceEntry of serviceMap.values()) {
    serviceEntry.overdueOutstanding = 0;
    serviceEntry.totalOutstanding = 0;
  }

  // 累加服務類型的總未收（用於年度彙總）
  for (const entry of receiptOutstandingMap.values()) {
    const serviceEntry = serviceMap.get(entry.serviceName);
    if (!serviceEntry) continue;
    serviceEntry.overdueOutstanding += entry.overdueOutstanding;
    serviceEntry.totalOutstanding += entry.outstanding;
    // monthlyDetail 的 overdueOutstanding 和 totalOutstanding 已經在遍歷收據時直接累加了，這裡不需要再更新
  }

  const clientSummary = Array.from(clientMap.values()).sort(
    (a, b) => b.currentReceivable - a.currentReceivable
  ).map((client) => {
    // 構建服務類型-月份的明細列表
    const serviceDetails = [];
    for (const [serviceName, monthlyMap] of client.serviceMap.entries()) {
      const monthlyDetails = Array.from(monthlyMap.values())
        .map((detail) => ({
          ...detail,
          currentReceivable: Number((detail.currentReceivable || 0).toFixed(2)),
          currentReceived: Number((detail.currentReceived || 0).toFixed(2)),
          currentOutstanding: Number((detail.currentOutstanding || 0).toFixed(2)),
          overdueRecovered: Number((detail.overdueRecovered || 0).toFixed(2)),
          overdueOutstanding: Number((detail.overdueOutstanding || 0).toFixed(2)),
          totalOutstanding: Number((detail.totalOutstanding || 0).toFixed(2)),
        }))
        .filter(
          (detail) =>
            detail.currentReceivable > 0 ||
            detail.currentReceived > 0 ||
            detail.currentOutstanding > 0 ||
            detail.overdueRecovered > 0 ||
            detail.overdueOutstanding > 0 ||
            detail.totalOutstanding > 0
        )
        .sort((a, b) => a.monthNum - b.monthNum);
      
      if (monthlyDetails.length > 0) {
        serviceDetails.push(...monthlyDetails);
      }
    }
    
    // 按月份和服務名稱排序
    serviceDetails.sort((a, b) => {
      if (a.monthNum !== b.monthNum) {
        return a.monthNum - b.monthNum;
      }
      return (a.serviceName || '').localeCompare(b.serviceName || '');
    });
    
    return {
      clientId: client.clientId,
      clientName: client.clientName,
      currentReceivable: Number(client.currentReceivable.toFixed(2)),
      currentReceived: Number(client.currentReceived.toFixed(2)),
      currentOutstanding: Number(client.currentOutstanding.toFixed(2)),
      overdueRecovered: Number(client.overdueRecovered.toFixed(2)),
      overdueOutstanding: Number(client.overdueOutstanding.toFixed(2)),
      totalOutstanding: Number(client.totalOutstanding.toFixed(2)),
      serviceDetails,
    };
  });

  const serviceTypeSummary = Array.from(serviceMap.values()).sort(
    (a, b) => b.currentReceivable - a.currentReceivable
  ).map((service) => {
    const monthlyDetails = Array.from(service.monthlyMap.values())
      .map((detail) => ({
        ...detail,
        currentReceivable: Number((detail.currentReceivable || 0).toFixed(2)),
        currentReceived: Number((detail.currentReceived || 0).toFixed(2)),
        currentOutstanding: Number((detail.currentOutstanding || 0).toFixed(2)),
        overdueRecovered: Number((detail.overdueRecovered || 0).toFixed(2)),
        overdueOutstanding: Number((detail.overdueOutstanding || 0).toFixed(2)),
        totalOutstanding: Number((detail.totalOutstanding || 0).toFixed(2)),
      }))
      .filter(
        (detail) =>
          detail.currentReceivable > 0 ||
          detail.currentReceived > 0 ||
          detail.currentOutstanding > 0 ||
          detail.overdueRecovered > 0 ||
          detail.overdueOutstanding > 0 ||
          detail.totalOutstanding > 0
      )
      .sort((a, b) => {
        // 先按月份排序，再按客戶名稱排序
        if (a.monthNum !== b.monthNum) {
          return a.monthNum - b.monthNum;
        }
        return (a.clientName || '').localeCompare(b.clientName || '');
      });

    return {
      serviceName: service.serviceName,
      currentReceivable: Number(service.currentReceivable.toFixed(2)),
      currentReceived: Number(service.currentReceived.toFixed(2)),
      currentOutstanding: Number(service.currentOutstanding.toFixed(2)),
      overdueRecovered: Number(service.overdueRecovered.toFixed(2)),
      overdueOutstanding: Number(service.overdueOutstanding.toFixed(2)),
      totalOutstanding: Number(service.totalOutstanding.toFixed(2)),
      monthlyDetails,
    };
  });

  return {
    summary: {
      currentReceivable: Number(totalCurrentReceivable.toFixed(2)),
      currentReceived: Number(totalCurrentReceived.toFixed(2)),
      currentOutstanding: Number(totalCurrentOutstanding.toFixed(2)),
      overdueRecovered: Number(totalOverdueRecovered.toFixed(2)),
      overdueOutstanding: Number(latestOverdueOutstanding.toFixed(2)),
      totalOutstanding: Number(latestTotalOutstanding.toFixed(2)),
    },
    monthlyTrend,
    clientSummary,
    serviceTypeSummary,
  };
}

export async function handleAnnualRevenue(request, env, ctx, requestId, url) {
  try {
    const params = url.searchParams;
    const year = parseInt(params.get("year") || String(new Date().getFullYear()), 10);

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

    const data = await computeAnnualRevenue(env, year);
    await setReportCache(env, REPORT_TYPE, year, data, null, true);

    return successResponse(data, "查詢成功", requestId, {
      cacheHit: false,
      refreshed: forceRefresh,
    });
  } catch (err) {
    console.error(`[AnnualRevenue] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", err.message || "伺服器錯誤", null, requestId);
  }
}


