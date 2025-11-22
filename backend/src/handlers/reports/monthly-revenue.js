/**
 * 月度收款報表
 * 以收款期限（due_date）為核心統計本月應收、期限內實收與逾期收回
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { getReportCache, setReportCache, deleteReportCache } from "../../utils/report-cache.js";

const REPORT_TYPE = "monthly-revenue";
const REPORT_VERSION = "2025-11-receipt-based";

function formatMonth(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getMonthDateRange(year, month) {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  return { monthStart, monthEnd };
}

export async function computeMonthlyRevenue(env, year, month) {
  const { monthStart, monthEnd } = getMonthDateRange(year, month);

  const receiptRows = await env.DATABASE.prepare(
    `SELECT 
        r.receipt_id,
        r.client_id,
        r.client_service_id,
        r.total_amount,
        r.receipt_date,
        r.due_date,
        r.status,
        c.company_name AS client_name,
        s.service_name,
        r.service_start_month,
        r.service_end_month,
        r.billing_month
     FROM Receipts r
     LEFT JOIN Clients c ON c.client_id = r.client_id
     LEFT JOIN ClientServices cs ON cs.client_service_id = r.client_service_id
     LEFT JOIN Services s ON s.service_id = cs.service_id
     WHERE r.is_deleted = 0
       AND r.status != 'cancelled'
       AND r.receipt_date IS NOT NULL
       AND r.receipt_date <= ?
     ORDER BY c.company_name, r.due_date, r.receipt_id`
  ).bind(monthEnd).all();

  const receipts = receiptRows?.results || [];
  const receiptIds = receipts.map((receipt) => receipt.receipt_id);

  const receiptServiceTypeMap = new Map();
  const receiptItemNameMap = new Map();

  if (receiptIds.length > 0) {
    const placeholders = receiptIds.map(() => "?").join(",");
    const typeRows = await env.DATABASE.prepare(
      `SELECT rst.receipt_id, s.service_name
       FROM ReceiptServiceTypes rst
       LEFT JOIN Services s ON s.service_id = rst.service_id
       WHERE rst.receipt_id IN (${placeholders})`
    ).bind(...receiptIds).all();

    for (const row of typeRows?.results || []) {
      const id = row.receipt_id;
      if (!receiptServiceTypeMap.has(id)) {
        receiptServiceTypeMap.set(id, []);
      }
      if (row.service_name) {
        receiptServiceTypeMap.get(id).push(row.service_name);
      }
    }
  }

  if (receiptIds.length > 0) {
    const placeholders = receiptIds.map(() => "?").join(",");
    const itemRows = await env.DATABASE.prepare(
      `SELECT receipt_id, service_name
       FROM ReceiptItems
       WHERE receipt_id IN (${placeholders})
       ORDER BY item_id`
    ).bind(...receiptIds).all();

    for (const row of itemRows?.results || []) {
      if (!row.service_name) continue;
      if (!receiptItemNameMap.has(row.receipt_id)) {
        receiptItemNameMap.set(row.receipt_id, row.service_name);
      }
    }
  }

  const paymentAggMap = new Map();
  if (receiptIds.length > 0) {
    const placeholders = receiptIds.map(() => "?").join(",");
    const paymentRows = await env.DATABASE.prepare(
      `SELECT 
         receipt_id,
         SUM(CASE WHEN payment_date < ? THEN payment_amount ELSE 0 END) AS paid_before_month,
         SUM(CASE WHEN payment_date >= ? AND payment_date <= ? THEN payment_amount ELSE 0 END) AS paid_in_month,
         SUM(CASE WHEN payment_date <= ? THEN payment_amount ELSE 0 END) AS paid_until_end
       FROM Payments
       WHERE is_deleted = 0
         AND receipt_id IN (${placeholders})
       GROUP BY receipt_id`
    ).bind(monthStart, monthStart, monthEnd, monthEnd, ...receiptIds).all();

    for (const row of paymentRows?.results || []) {
      paymentAggMap.set(row.receipt_id, {
        paidBeforeMonth: Number(row.paid_before_month || 0),
        paidInMonth: Number(row.paid_in_month || 0),
        paidUntilEnd: Number(row.paid_until_end || 0),
      });
    }
  }

  let totalReceivable = 0;
  let totalCurrentReceived = 0;
  let totalCurrentOutstanding = 0;
  let totalOverdueRecovered = 0;
  let totalOverdueOutstanding = 0;

  const clientMap = new Map();

  for (const receipt of receipts) {
    const totalAmount = Number(receipt.total_amount || 0);
    const paymentAgg = paymentAggMap.get(receipt.receipt_id) || {
      paidBeforeMonth: 0,
      paidInMonth: 0,
      paidUntilEnd: 0,
    };

    const paidBeforeMonth = paymentAgg.paidBeforeMonth;
    const paidInMonth = paymentAgg.paidInMonth;
    const paidUntilEnd = paymentAgg.paidUntilEnd;

    const outstandingAtStart = Math.max(0, Number((totalAmount - paidBeforeMonth).toFixed(2)));
    const outstandingAtEnd = Math.max(0, Number((totalAmount - paidUntilEnd).toFixed(2)));

    const receiptDate = receipt.receipt_date || receipt.receiptDate || "";
    const dueDate = receipt.due_date || receipt.dueDate || "";

    const currentPeriod =
      receiptDate && receiptDate >= monthStart && receiptDate <= monthEnd;
    const historical = receiptDate && receiptDate < monthStart;
    const overdueCandidate = historical && dueDate && dueDate < monthStart;

    const currentReceivable = currentPeriod ? totalAmount : 0;
    const currentReceived = currentPeriod ? Math.min(paidInMonth, outstandingAtStart) : 0;
    const currentOutstanding = currentPeriod ? outstandingAtEnd : 0;

    const overdueRecovered = overdueCandidate ? Math.min(paidInMonth, outstandingAtStart) : 0;
    const overdueOutstanding = overdueCandidate ? outstandingAtEnd : 0;

    if (!currentPeriod && !overdueCandidate) {
      continue;
    }

    totalReceivable += currentReceivable;
    totalCurrentReceived += currentReceived;
    totalCurrentOutstanding += currentOutstanding;
    totalOverdueRecovered += overdueRecovered;
    totalOverdueOutstanding += overdueOutstanding;

    if (!clientMap.has(receipt.client_id)) {
      clientMap.set(receipt.client_id, {
        clientId: receipt.client_id,
        clientName: receipt.client_name || "未知客戶",
        currentReceivable: 0,
        currentReceived: 0,
        currentOutstanding: 0,
        overdueRecovered: 0,
        overdueOutstanding: 0,
        receipts: [],
      });
    }

    const client = clientMap.get(receipt.client_id);
    client.currentReceivable += currentReceivable;
    client.currentReceived += currentReceived;
    client.currentOutstanding += currentOutstanding;
    client.overdueRecovered += overdueRecovered;
    client.overdueOutstanding += overdueOutstanding;

    const serviceTypeNames = receiptServiceTypeMap.get(receipt.receipt_id) || [];
    const displayServiceName =
      serviceTypeNames.length > 0
        ? serviceTypeNames.join("、")
        : receipt.service_name || receiptItemNameMap.get(receipt.receipt_id) || "未分類";

    client.receipts.push({
      serviceId: receipt.client_service_id || receipt.receipt_id,
      receiptId: receipt.receipt_id,
      receiptDate,
      dueDate,
      status: receipt.status,
      serviceType: displayServiceName,
      serviceName: displayServiceName,
      serviceTypeNames,
      totalAmount: Number(totalAmount.toFixed(2)),
      paidBeforeMonth: Number(paidBeforeMonth.toFixed(2)),
      paidInMonth: Number(paidInMonth.toFixed(2)),
      paidUntilEnd: Number(paidUntilEnd.toFixed(2)),
      currentReceivable: Number(currentReceivable.toFixed(2)),
      currentReceived: Number(currentReceived.toFixed(2)),
      currentOutstanding: Number(currentOutstanding.toFixed(2)),
      overdueRecovered: Number(overdueRecovered.toFixed(2)),
      overdueOutstanding: Number(overdueOutstanding.toFixed(2)),
      isCurrentPeriod: currentPeriod,
      isOverdue: overdueCandidate,
    });
  }

  const clients = Array.from(clientMap.values())
    .map((client) => ({
      ...client,
      currentReceivable: Number(client.currentReceivable.toFixed(2)),
      currentReceived: Number(client.currentReceived.toFixed(2)),
      currentOutstanding: Number(client.currentOutstanding.toFixed(2)),
      overdueRecovered: Number(client.overdueRecovered.toFixed(2)),
      overdueOutstanding: Number(client.overdueOutstanding.toFixed(2)),
      totalOutstanding: Number(
        (client.currentOutstanding + client.overdueOutstanding).toFixed(2)
      ),
    }))
    .filter(
      (client) =>
        client.currentReceivable > 0 ||
        client.currentReceived > 0 ||
        client.currentOutstanding > 0 ||
        client.overdueRecovered > 0 ||
        client.overdueOutstanding > 0
    )
    .sort(
      (a, b) =>
        b.currentReceivable +
        b.overdueOutstanding -
        (a.currentReceivable + a.overdueOutstanding)
    );

  const summary = {
    currentReceivable: Number(totalReceivable.toFixed(2)),
    currentReceived: Number(totalCurrentReceived.toFixed(2)),
    currentOutstanding: Number(totalCurrentOutstanding.toFixed(2)),
    overdueRecovered: Number(totalOverdueRecovered.toFixed(2)),
    overdueOutstanding: Number(totalOverdueOutstanding.toFixed(2)),
    totalOutstanding: Number(
      (totalCurrentOutstanding + totalOverdueOutstanding).toFixed(2)
    ),
  };

  return {
    summary,
    clients,
    period: {
      year,
      month,
      monthStart,
      monthEnd,
    },
    version: REPORT_VERSION,
  };
}

export async function handleMonthlyRevenue(request, env, ctx, requestId, url) {
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
    const requiresUpgrade = (data) => {
      if (!data) return true;
      if (data.version !== REPORT_VERSION) {
        return true;
      }
      return false;
    };

    if (!forceRefresh && cached?.data && !requiresUpgrade(cached.data)) {
      return successResponse(cached.data, "查詢成功", requestId, {
        cacheHit: true,
        cachedAt: cached.computedAt || null,
      });
    } else {
      await deleteReportCache(env, REPORT_TYPE, year, month).catch(() => {});
    }

    const data = await computeMonthlyRevenue(env, year, month);
    await setReportCache(env, REPORT_TYPE, year, data, month);

    return successResponse(data, "查詢成功", requestId, {
      cacheHit: false,
      refreshed: forceRefresh,
    });
  } catch (err) {
    console.error("[MonthlyRevenue] Error:", err);
    return errorResponse(500, "INTERNAL_ERROR", err.message || "伺服器錯誤", null, requestId);
  }
}


