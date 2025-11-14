/**
 * 收据基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取收据列表
 */
export async function handleGetReceipts(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
  const offset = (page - 1) * perPage;
  const q = (params.get("q") || "").trim();
  const status = (params.get("status") || "").trim();
  const receiptType = (params.get("receipt_type") || "").trim();
  const dateFrom = (params.get("dateFrom") || "").trim();
  const dateTo = (params.get("dateTo") || "").trim();
  
  const where = ["r.is_deleted = 0"];
  const binds = [];
  
  if (q) {
    where.push("(r.receipt_id LIKE ? OR c.company_name LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (status && ["unpaid", "partial", "paid", "cancelled"].includes(status)) {
    where.push("r.status = ?");
    binds.push(status);
  }
  if (receiptType && ["normal", "prepayment", "deposit"].includes(receiptType)) {
    where.push("r.receipt_type = ?");
    binds.push(receiptType);
  }
  if (dateFrom) {
    where.push("r.receipt_date >= ?");
    binds.push(dateFrom);
  }
  if (dateTo) {
    where.push("r.receipt_date <= ?");
    binds.push(dateTo);
  }
  
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  
  const countRow = await env.DATABASE.prepare(
    `SELECT COUNT(1) AS total FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id ${whereSql}`
  ).bind(...binds).first();
  const total = Number(countRow?.total || 0);
  
  const rows = await env.DATABASE.prepare(
    `SELECT r.receipt_id, r.client_id, c.company_name AS client_name, c.tax_registration_number AS client_tax_id, 
            r.total_amount, r.receipt_date, r.due_date, r.status, r.receipt_type,
            r.service_month, r.service_start_month, r.service_end_month
     FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id
     ${whereSql}
     ORDER BY r.receipt_date DESC, r.receipt_id DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, perPage, offset).all();
  
  // 为每条收据查询服务名称
  const receiptIds = (rows?.results || []).map(r => r.receipt_id);
  const serviceNamesMap = {};
  
  if (receiptIds.length > 0) {
    const placeholders = receiptIds.map(() => '?').join(',');
    const serviceNamesRows = await env.DATABASE.prepare(
      `SELECT DISTINCT ri.receipt_id, ri.service_name
       FROM ReceiptItems ri
       WHERE ri.receipt_id IN (${placeholders})`
    ).bind(...receiptIds).all();
    
    serviceNamesRows.results?.forEach(row => {
      if (!serviceNamesMap[row.receipt_id]) {
        serviceNamesMap[row.receipt_id] = [];
      }
      serviceNamesMap[row.receipt_id].push(row.service_name);
    });
  }
  
  // 查询已付金额
  const paidAmountsMap = {};
  if (receiptIds.length > 0) {
    const placeholders = receiptIds.map(() => '?').join(',');
    const paidRows = await env.DATABASE.prepare(
      `SELECT receipt_id, SUM(payment_amount) AS paid_amount
       FROM Payments
       WHERE receipt_id IN (${placeholders}) AND is_deleted = 0
       GROUP BY receipt_id`
    ).bind(...receiptIds).all();
    
    paidRows.results?.forEach(row => {
      paidAmountsMap[row.receipt_id] = Number(row.paid_amount || 0);
    });
  }
  
  const data = (rows?.results || []).map(r => {
    const paidAmount = paidAmountsMap[r.receipt_id] || 0;
    const totalAmount = Number(r.total_amount || 0);
    const remainingAmount = totalAmount - paidAmount;
    
    return {
      receipt_id: String(r.receipt_id),
      client_id: r.client_id,
      client_name: r.client_name || "",
      client_tax_id: r.client_tax_id || "",
      total_amount: totalAmount,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      receipt_date: r.receipt_date || null,
      due_date: r.due_date || null,
      status: r.status || "unpaid",
      receipt_type: r.receipt_type || "normal",
      service_names: serviceNamesMap[r.receipt_id] || [],
      service_month: r.service_start_month || null, // 兼容舊資料，實際使用 service_start_month
      service_start_month: r.service_start_month || null,
      service_end_month: r.service_end_month || null
    };
  });
  
  const meta = { page, perPage, total, hasNext: offset + perPage < total };
  
  return successResponse(data, "成功", requestId, meta);
}

/**
 * 获取收据详情
 */
export async function handleGetReceiptDetail(request, env, ctx, requestId, match, url) {
  const receiptId = match[1];
  
  const receipt = await env.DATABASE.prepare(
    `SELECT r.receipt_id, r.client_id, c.company_name AS client_name, c.tax_registration_number AS client_tax_id,
            r.total_amount, r.receipt_date, r.due_date, r.status, r.receipt_type, r.notes,
            r.service_start_month, r.service_end_month, r.billing_month, r.created_at, r.updated_at,
            r.created_by, u.name AS created_by_name
     FROM Receipts r
     LEFT JOIN Clients c ON c.client_id = r.client_id
     LEFT JOIN Users u ON u.user_id = r.created_by
     WHERE r.receipt_id = ? AND r.is_deleted = 0`
  ).bind(receiptId).first();
  
  if (!receipt) {
    return errorResponse(404, "NOT_FOUND", "收據不存在", null, requestId);
  }
  
  // 查询收据项目
  const items = await env.DATABASE.prepare(
    `SELECT ri.item_id, ri.service_name, ri.quantity, ri.unit_price, ri.subtotal,
            ri.notes
     FROM ReceiptItems ri
     WHERE ri.receipt_id = ?
     ORDER BY ri.item_id ASC`
  ).bind(receiptId).all();
  
  // 查询付款记录
  const payments = await env.DATABASE.prepare(
    `SELECT p.payment_id, p.payment_date, p.payment_amount, p.payment_method, p.reference_number,
            p.notes, p.created_by, p.created_at, u.name AS created_by_name
     FROM Payments p
     LEFT JOIN Users u ON u.user_id = p.created_by
     WHERE p.receipt_id = ? AND p.is_deleted = 0
     ORDER BY p.payment_date DESC, p.payment_id DESC`
  ).bind(receiptId).all();
 
  const serviceTypes = await env.DATABASE.prepare(
    `SELECT rst.service_id, s.service_name
     FROM ReceiptServiceTypes rst
     LEFT JOIN Services s ON s.service_id = rst.service_id
     WHERE rst.receipt_id = ?`
  ).bind(receiptId).all();

  const paidAmount = payments.results?.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0) || 0;
  const totalAmount = Number(receipt.total_amount || 0);
  
  const data = {
    receipt_id: String(receipt.receipt_id),
    client_id: receipt.client_id,
    client_name: receipt.client_name || "",
    client_tax_id: receipt.client_tax_id || "",
    total_amount: totalAmount,
    paid_amount: paidAmount,
    remaining_amount: totalAmount - paidAmount,
    receipt_date: receipt.receipt_date || null,
    due_date: receipt.due_date || null,
    status: receipt.status || "unpaid",
    receipt_type: receipt.receipt_type || "normal",
    notes: receipt.notes || "",
    service_month: receipt.service_start_month || null, // 兼容舊資料，實際使用 service_start_month
    service_start_month: receipt.service_start_month || null,
    service_end_month: receipt.service_end_month || null,
    withholding_amount: Number(receipt.withholding_amount || 0),
    created_by: receipt.created_by,
    created_by_name: receipt.created_by_name || "",
    items: (items.results || []).map(item => {
      const subtotal = Number(item.subtotal || 0);
      return {
        item_id: item.item_id,
        service_name: item.service_name || "",
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        subtotal,
        service_fee: subtotal,
        government_fee: 0,
        miscellaneous_fee: 0,
        notes: item.notes || ""
      };
    }),
    payments: (payments.results || []).map(p => ({
      payment_id: p.payment_id,
      payment_date: p.payment_date,
      payment_amount: Number(p.payment_amount || 0),
      payment_method: p.payment_method || "",
      reference_number: p.reference_number || "",
      notes: p.notes || "",
      created_by: p.created_by ? String(p.created_by) : null,
      created_by_name: p.created_by_name || "",
      created_at: p.created_at
    })),
    service_type_ids: (serviceTypes.results || []).map(row => Number(row.service_id)),
    service_types: (serviceTypes.results || []).map(row => ({
      service_id: Number(row.service_id),
      service_name: row.service_name || ""
    })),
    created_at: receipt.created_at,
    updated_at: receipt.updated_at
  };
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 创建收据
 */
export async function handleCreateReceipt(request, env, ctx, requestId, url) {
  try {
    const body = await request.json();
    
    const errors = [];
    if (!body.client_id) errors.push({ field: "client_id", message: "必填" });
    if (!body.receipt_date) {
      errors.push({ field: "receipt_date", message: "必填" });
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(body.receipt_date)) {
      errors.push({ field: "receipt_date", message: "日期格式必須為 YYYY-MM-DD" });
    }
    if (!body.total_amount || body.total_amount <= 0) {
      errors.push({ field: "total_amount", message: "總金額必須大於 0" });
    }
    if (!body.service_start_month) {
      errors.push({ field: "service_start_month", message: "必填" });
    }
    if (!body.service_end_month) {
      errors.push({ field: "service_end_month", message: "必填" });
    }
    // 不再需要 service_month，改用 service_start_month 和 billing_month
    
    if (errors.length > 0) {
      return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
    }
    
    const now = new Date().toISOString();
    const totalAmount = Number(body.total_amount);
    const userId = ctx?.user?.user_id || 1; // 預設為系統用戶 ID
    
    // 生成收據號碼：YYYYMM-XXX 格式
    const [yyyy, mm] = body.receipt_date.split("-");
    const prefix = `${yyyy}${mm}`;
    const maxRow = await env.DATABASE.prepare(
      `SELECT receipt_id FROM Receipts WHERE receipt_id LIKE ? ORDER BY receipt_id DESC LIMIT 1`
    ).bind(`${prefix}-%`).first();
    
    let seq = 1;
    if (maxRow && typeof maxRow.receipt_id === "string") {
      const match = maxRow.receipt_id.match(/^(\d{6})-(\d{3})$/);
      if (match) {
        seq = Math.max(seq, parseInt(match[2], 10) + 1);
      }
    }
    const receiptId = `${prefix}-${String(seq).padStart(3, "0")}`;
    
    // 計算到期日（如果未提供則預設 +30 天）
    let dueDate = body.due_date;
    if (!dueDate) {
      const d = new Date(body.receipt_date + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 30);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      dueDate = `${y}-${m}-${day}`;
    }
    
    // 创建收据
    await env.DATABASE.prepare(
      `INSERT INTO Receipts (receipt_id, client_id, total_amount, receipt_date, due_date, status, receipt_type, 
                            service_start_month, service_end_month, billing_month, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      receiptId,
      body.client_id,
      totalAmount,
      body.receipt_date,
      dueDate,
      body.status || "unpaid",
      body.receipt_type || "normal",
      body.service_start_month || null,
      body.service_end_month || null,
      body.billing_month || null, // 從 ServiceBillingSchedule 或手動輸入
      body.notes || null,
      userId,
      now,
      now
    ).run();
    
    // 创建收据项目（如果有）
    const items = body.items || [];
    if (items.length > 0) {
      for (const item of items) {
        // 支持前端格式：service_name, service_fee, government_fee, miscellaneous_fee
        const serviceFee = Number(item.service_fee || 0);
        const governmentFee = Number(item.government_fee || 0);
        const miscellaneousFee = Number(item.miscellaneous_fee || 0);
        const itemAmount = serviceFee + governmentFee + miscellaneousFee;
        
        await env.DATABASE.prepare(
          `INSERT INTO ReceiptItems (receipt_id, service_name, quantity, unit_price, subtotal, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          receiptId,
          item.service_name || "服務項目",
          Number(item.quantity || 1),
          itemAmount,
          itemAmount,
          item.notes || "",
          now
        ).run();
      }
    } else {
      // 如果沒有明細，創建一個預設項目（使用總金額）
      await env.DATABASE.prepare(
        `INSERT INTO ReceiptItems (receipt_id, service_name, quantity, unit_price, subtotal, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        receiptId,
        "服務費用",
        1,
        totalAmount,
        totalAmount,
        "",
        now
      ).run();
    }
  
    if (Array.isArray(body.service_type_ids)) {
      const uniqueIds = [...new Set(body.service_type_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
      if (uniqueIds.length > 0) {
        try {
          for (const serviceId of uniqueIds) {
            await env.DATABASE.prepare(
              `INSERT OR IGNORE INTO ReceiptServiceTypes (receipt_id, service_id, created_at)
               VALUES (?, ?, datetime('now'))`
            ).bind(receiptId, serviceId).run();
          }
        } catch (err) {
          console.warn("[CreateReceipt] 無法寫入服務類型關聯:", err);
        }
      }
    }
    
    return successResponse({ receipt_id: receiptId, total_amount: totalAmount }, "收據已創建", requestId);
  } catch (error) {
    console.error(`[CreateReceipt] Error:`, error);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 更新收据
 */
export async function handleUpdateReceipt(request, env, ctx, requestId, match, url) {
  const receiptId = match[1];

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }

  const existing = await env.DATABASE.prepare(
    `SELECT receipt_id, client_id, receipt_date, due_date, total_amount, status, receipt_type,
            service_month, service_start_month, service_end_month, notes
     FROM Receipts
     WHERE receipt_id = ? AND is_deleted = 0`
  ).bind(receiptId).first();

  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "收據不存在", null, requestId);
  }

  const errors = [];
  const payload = {
    client_id: body.client_id ?? existing.client_id,
    receipt_date: body.receipt_date ?? existing.receipt_date,
    due_date: body.hasOwnProperty("due_date") ? body.due_date : existing.due_date,
    receipt_type: body.receipt_type ?? existing.receipt_type ?? "normal",
    status: body.status ?? existing.status ?? "unpaid",
    notes: body.hasOwnProperty("notes") ? (body.notes || null) : existing.notes,
    // 不再使用 service_month
    service_start_month: body.hasOwnProperty("service_start_month") ? body.service_start_month : existing.service_start_month,
    service_end_month: body.hasOwnProperty("service_end_month") ? body.service_end_month : existing.service_end_month,
    total_amount: Number(body.total_amount ?? existing.total_amount ?? 0)
  };

  if (!payload.client_id) {
    errors.push({ field: "client_id", message: "必填" });
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!payload.receipt_date || !datePattern.test(payload.receipt_date)) {
    errors.push({ field: "receipt_date", message: "日期格式必須為 YYYY-MM-DD" });
  }

  if (payload.due_date && !datePattern.test(payload.due_date)) {
    errors.push({ field: "due_date", message: "日期格式必須為 YYYY-MM-DD" });
  }

  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (payload.service_start_month && !monthPattern.test(payload.service_start_month)) {
    errors.push({ field: "service_start_month", message: "月份格式需為 YYYY-MM" });
  }
  if (payload.service_end_month && !monthPattern.test(payload.service_end_month)) {
    errors.push({ field: "service_end_month", message: "月份格式需為 YYYY-MM" });
  }

  const allowedStatus = new Set(["unpaid", "partial", "paid", "cancelled", "overdue"]);
  if (!allowedStatus.has(payload.status)) {
    errors.push({ field: "status", message: "狀態無效" });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const normalizedItems = [];
  let totalFromItems = 0;

  const hasServiceTypeInput = body.hasOwnProperty("service_type_ids");
  const rawServiceTypeIds = Array.isArray(body.service_type_ids) ? body.service_type_ids : [];
  const serviceTypeIds = hasServiceTypeInput
    ? [...new Set(rawServiceTypeIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
    : null;

  if (items.length > 0) {
    for (const item of items) {
      const name = (item.service_name || item.serviceName || "").trim();
      if (!name) {
        errors.push({ field: "items", message: "每個明細需填寫項目名稱" });
        break;
      }

      const quantity = Number(item.quantity || 1);
      const serviceFee = Number(item.service_fee || item.serviceFee || 0);
      const governmentFee = Number(item.government_fee || item.governmentFee || 0);
      const miscellaneousFee = Number(item.miscellaneous_fee || item.miscellaneousFee || 0);
      const itemAmount = serviceFee + governmentFee + miscellaneousFee;

      if (itemAmount <= 0) {
        errors.push({ field: "items", message: "明細金額需大於 0" });
        break;
      }

      totalFromItems += itemAmount;
      normalizedItems.push({
        service_name: name,
        quantity,
        amount: itemAmount,
        notes: (item.notes || "").trim()
      });
    }

    payload.total_amount = totalFromItems;
  }

  if (!payload.total_amount || payload.total_amount <= 0) {
    errors.push({ field: "total_amount", message: "總金額需大於 0" });
  }

  if (hasServiceTypeInput && payload.client_id && Array.isArray(body.service_type_ids) && serviceTypeIds?.length === 0 && body.service_type_ids.length > 0) {
    errors.push({ field: "service_type_ids", message: "服務類型無效" });
  }

  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }

  const now = new Date().toISOString();

  try {
    const updateColumns = [
      "client_id = ?",
      "receipt_date = ?",
      "due_date = ?",
      "status = ?",
      "receipt_type = ?",
      "total_amount = ?",
      "notes = ?",
      "service_start_month = ?",
      "service_end_month = ?",
      "billing_month = ?",
      "updated_at = ?"
    ];

    await env.DATABASE.prepare(
      `UPDATE Receipts SET ${updateColumns.join(", ")} WHERE receipt_id = ?`
    ).bind(
      payload.client_id,
      payload.receipt_date,
      payload.due_date || null,
      payload.status,
      payload.receipt_type,
      payload.total_amount,
      payload.notes,
      payload.service_start_month || null,
      payload.service_end_month || null,
      payload.billing_month || null,
      now,
      receiptId
    ).run();

    if (normalizedItems.length > 0) {
      await env.DATABASE.prepare(
        `DELETE FROM ReceiptItems WHERE receipt_id = ?`
      ).bind(receiptId).run();

      for (const item of normalizedItems) {
        await env.DATABASE.prepare(
          `INSERT INTO ReceiptItems (receipt_id, service_name, quantity, unit_price, subtotal, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          receiptId,
          item.service_name,
          item.quantity,
          item.amount,
          item.amount,
          item.notes || "",
          now
        ).run();
      }
    }

    if (hasServiceTypeInput) {
      try {
        await env.DATABASE.prepare(
          `DELETE FROM ReceiptServiceTypes WHERE receipt_id = ?`
        ).bind(receiptId).run();

        if (serviceTypeIds && serviceTypeIds.length > 0) {
          for (const serviceId of serviceTypeIds) {
            await env.DATABASE.prepare(
              `INSERT OR IGNORE INTO ReceiptServiceTypes (receipt_id, service_id, created_at)
               VALUES (?, ?, datetime('now'))`
            ).bind(receiptId, serviceId).run();
          }
        }
      } catch (err) {
        console.warn("[UpdateReceipt] 無法更新服務類型關聯:", err);
      }
    }
  } catch (err) {
    console.error("[UpdateReceipt] Error:", err);
    return errorResponse(500, "INTERNAL_ERROR", "更新收據失敗", null, requestId);
  }
 
  return successResponse({ receipt_id: receiptId }, "收據已更新", requestId);
}

/**
 * 删除收据（硬刪除）
 */
export async function handleDeleteReceipt(request, env, ctx, requestId, match, url) {
  const receiptId = match[1];
  
  try {
    // 檢查收據是否存在
    const receipt = await env.DATABASE.prepare(
      `SELECT receipt_id FROM Receipts WHERE receipt_id = ? AND is_deleted = 0`
    ).bind(receiptId).first();
    
    if (!receipt) {
      return errorResponse(404, "NOT_FOUND", "收據不存在", null, requestId);
    }
    
    // 刪除相關的收款記錄
    await env.DATABASE.prepare(
      `DELETE FROM Payments WHERE receipt_id = ?`
    ).bind(receiptId).run();
    
    // 刪除相關的收據項目
    await env.DATABASE.prepare(
      `DELETE FROM ReceiptItems WHERE receipt_id = ?`
    ).bind(receiptId).run();
    
    // 刪除收據本身
    await env.DATABASE.prepare(
      `DELETE FROM Receipts WHERE receipt_id = ?`
    ).bind(receiptId).run();
    
    return successResponse({ receipt_id: receiptId }, "收據已刪除", requestId);
  } catch (err) {
    console.error(`[DeleteReceipt] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "刪除收據失敗", null, requestId);
  }
}

