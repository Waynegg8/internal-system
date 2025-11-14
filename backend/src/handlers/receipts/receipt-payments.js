/**
 * 收据收款记录管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取收据的收款记录列表
 */
export async function handleGetReceiptPayments(request, env, ctx, requestId, match, url) {
  const receiptId = match[1];
  
  try {
    // 检查收据是否存在
    const receipt = await env.DATABASE.prepare(`
      SELECT receipt_id FROM Receipts WHERE receipt_id = ? AND is_deleted = 0
    `).bind(receiptId).first();
    
    if (!receipt) {
      return errorResponse(404, "NOT_FOUND", "收據不存在", null, requestId);
    }
    
    // 获取收款记录
    const rows = await env.DATABASE.prepare(`
      SELECT 
        payment_id,
        receipt_id,
        payment_date,
        payment_amount,
        payment_method,
        reference_number,
        notes,
        created_by,
        created_at,
        u.name AS created_by_name
      FROM Payments rp
      LEFT JOIN Users u ON u.user_id = rp.created_by
      WHERE rp.receipt_id = ? AND rp.is_deleted = 0
      ORDER BY rp.payment_date DESC, rp.created_at DESC
    `).bind(receiptId).all();
    
    const payments = (rows?.results || []).map(r => ({
      payment_id: String(r.payment_id),
      receipt_id: String(r.receipt_id),
      payment_date: r.payment_date,
      payment_amount: Number(r.payment_amount || 0),
      payment_method: r.payment_method,
      reference_number: r.reference_number || "",
      notes: r.notes || "",
      created_by: r.created_by ? String(r.created_by) : null,
      created_by_name: r.created_by_name || "",
      created_at: r.created_at
    }));
    
    return successResponse(payments, "查詢成功", requestId);
  } catch (err) {
    console.error(`[Receipts] Get payments error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 创建收款记录
 */
export async function handleCreateReceiptPayment(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const receiptId = match[1];
  
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const payment_date = String(body?.payment_date || "").trim();
  const payment_amount = Number(body?.payment_amount);
  const payment_method = String(body?.payment_method || "transfer").trim();
  const reference_number = String(body?.reference_number || "").trim();
  const notes = String(body?.notes || "").trim();
  
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payment_date)) {
    errors.push({ field: "payment_date", message: "日期格式 YYYY-MM-DD" });
  }
  if (!Number.isFinite(payment_amount) || payment_amount <= 0) {
    errors.push({ field: "payment_amount", message: "必須大於 0" });
  }
  if (!["cash", "transfer", "check", "other"].includes(payment_method)) {
    errors.push({ field: "payment_method", message: "收款方式不合法" });
  }
  
  if (errors.length) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  try {
    // 检查收据是否存在
    const receipt = await env.DATABASE.prepare(`
      SELECT receipt_id, total_amount, COALESCE(paid_amount, 0) as paid_amount, status 
      FROM Receipts 
      WHERE receipt_id = ? AND is_deleted = 0
    `).bind(receiptId).first();
    
    if (!receipt) {
      return errorResponse(404, "NOT_FOUND", "收據不存在", null, requestId);
    }
    
    if (receipt.status === "cancelled") {
      return errorResponse(422, "VALIDATION_ERROR", "已作廢的收據不可收款", null, requestId);
    }
    
    const outstanding = Number(receipt.total_amount) - Number(receipt.paid_amount);
    if (payment_amount > outstanding) {
      return errorResponse(422, "VALIDATION_ERROR", `收款金額超過未收金額（${outstanding}）`, null, requestId);
    }
    
    const now = new Date().toISOString();
    
    // 插入收款记录
    const insertResult = await env.DATABASE.prepare(`
      INSERT INTO Payments (
        receipt_id, payment_date, payment_amount, payment_method, 
        reference_number, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      receiptId, payment_date, payment_amount, payment_method, 
      reference_number, notes, String(user.user_id), now, now
    ).run();
    
    // 更新收据的已收金额和状态
    const newPaidAmount = Number(receipt.paid_amount) + payment_amount;
    const newStatus = newPaidAmount >= Number(receipt.total_amount) ? "paid" : (newPaidAmount > 0 ? "partial" : "unpaid");
    
    await env.DATABASE.prepare(`
      UPDATE Receipts 
      SET paid_amount = ?, status = ?, updated_at = ? 
      WHERE receipt_id = ?
    `).bind(newPaidAmount, newStatus, now, receiptId).run();
    
    const data = {
      payment_id: String(insertResult.meta.last_row_id),
      receipt_id: receiptId,
      payment_date,
      payment_amount,
      payment_method,
      receipt_status: newStatus,
      paid_amount: newPaidAmount,
      outstanding_amount: Number(receipt.total_amount) - newPaidAmount
    };
    
    return successResponse(data, "已記錄收款", requestId);
  } catch (err) {
    console.error(`[Receipts] Create payment error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 更新收款记录
 */
export async function handleUpdateReceiptPayment(request, env, ctx, requestId, match, url) {
  const receiptId = match[1];
  const paymentId = match[2];
  const user = ctx?.user;
  
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const payment_date = body?.payment_date ? String(body.payment_date).trim() : null;
  const payment_amount = body?.payment_amount != null ? Number(body.payment_amount) : null;
  const payment_method = body?.payment_method ? String(body.payment_method).trim() : null;
  const reference_number = body?.reference_number != null ? String(body.reference_number).trim() : null;
  const notes = body?.notes != null ? String(body.notes).trim() : null;
  
  try {
    // 检查收款记录是否存在
    const existingPayment = await env.DATABASE.prepare(`
      SELECT payment_id, receipt_id, payment_amount 
      FROM Payments 
      WHERE payment_id = ? AND receipt_id = ? AND is_deleted = 0
    `).bind(paymentId, receiptId).first();
    
    if (!existingPayment) {
      return errorResponse(404, "NOT_FOUND", "收款記錄不存在", null, requestId);
    }
    
    // 检查收据是否存在
    const receipt = await env.DATABASE.prepare(`
      SELECT receipt_id, total_amount, COALESCE(paid_amount, 0) as paid_amount, status 
      FROM Receipts 
      WHERE receipt_id = ? AND is_deleted = 0
    `).bind(receiptId).first();
    
    if (!receipt) {
      return errorResponse(404, "NOT_FOUND", "收據不存在", null, requestId);
    }
    
    // 如果更新金额，需要验证
    if (payment_amount !== null) {
      if (!Number.isFinite(payment_amount) || payment_amount <= 0) {
        return errorResponse(422, "VALIDATION_ERROR", "金額必須大於 0", null, requestId);
      }
      
      // 计算新的已收金额（减去旧金额，加上新金额）
      const oldAmount = Number(existingPayment.payment_amount);
      const newPaidAmount = Number(receipt.paid_amount) - oldAmount + payment_amount;
      
      if (newPaidAmount > Number(receipt.total_amount)) {
        return errorResponse(422, "VALIDATION_ERROR", `更新後收款金額超過收據總額`, null, requestId);
      }
    }
    
    // 验证日期格式
    if (payment_date && !/^\d{4}-\d{2}-\d{2}$/.test(payment_date)) {
      return errorResponse(422, "VALIDATION_ERROR", "日期格式 YYYY-MM-DD", null, requestId);
    }
    
    // 验证收款方式
    if (payment_method && !["cash", "transfer", "check", "other"].includes(payment_method)) {
      return errorResponse(422, "VALIDATION_ERROR", "收款方式不合法", null, requestId);
    }
    
    // 构建更新语句
    const updates = [];
    const binds = [];
    
    if (payment_date !== null) {
      updates.push("payment_date = ?");
      binds.push(payment_date);
    }
    if (payment_amount !== null) {
      updates.push("payment_amount = ?");
      binds.push(payment_amount);
    }
    if (payment_method !== null) {
      updates.push("payment_method = ?");
      binds.push(payment_method);
    }
    if (reference_number !== null) {
      updates.push("reference_number = ?");
      binds.push(reference_number);
    }
    if (notes !== null) {
      updates.push("notes = ?");
      binds.push(notes);
    }
    
    if (updates.length === 0) {
      return errorResponse(400, "BAD_REQUEST", "沒有可更新的欄位", null, requestId);
    }
    
    updates.push("updated_at = ?");
    binds.push(new Date().toISOString());
    binds.push(paymentId);
    binds.push(receiptId);
    
    // 更新收款记录
    await env.DATABASE.prepare(`
      UPDATE Payments 
      SET ${updates.join(", ")} 
      WHERE payment_id = ? AND receipt_id = ?
    `).bind(...binds).run();
    
    // 如果金额有变化，重新计算收据的已收金额和状态
    if (payment_amount !== null) {
      const paymentRows = await env.DATABASE.prepare(`
        SELECT SUM(payment_amount) as total_paid 
        FROM Payments 
        WHERE receipt_id = ? AND is_deleted = 0
      `).bind(receiptId).first();
      
      const newPaidAmount = Number(paymentRows?.total_paid || 0);
      const newStatus = newPaidAmount >= Number(receipt.total_amount) ? "paid" : (newPaidAmount > 0 ? "partial" : "unpaid");
      
      await env.DATABASE.prepare(`
        UPDATE Receipts 
        SET paid_amount = ?, status = ?, updated_at = ? 
        WHERE receipt_id = ?
      `).bind(newPaidAmount, newStatus, new Date().toISOString(), receiptId).run();
    }
    
    return successResponse({ payment_id: paymentId, receipt_id: receiptId }, "已更新收款記錄", requestId);
  } catch (err) {
    console.error(`[Receipts] Update payment error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 删除收款记录
 */
export async function handleDeleteReceiptPayment(request, env, ctx, requestId, match, url) {
  const receiptId = match[1];
  const paymentId = match[2];
  
  try {
    // 检查收款记录是否存在
    const existingPayment = await env.DATABASE.prepare(`
      SELECT payment_id, receipt_id, payment_amount 
      FROM Payments 
      WHERE payment_id = ? AND receipt_id = ? AND is_deleted = 0
    `).bind(paymentId, receiptId).first();
    
    if (!existingPayment) {
      return errorResponse(404, "NOT_FOUND", "收款記錄不存在", null, requestId);
    }
    
    // 检查收据是否存在
    const receipt = await env.DATABASE.prepare(`
      SELECT receipt_id, total_amount, COALESCE(paid_amount, 0) as paid_amount 
      FROM Receipts 
      WHERE receipt_id = ? AND is_deleted = 0
    `).bind(receiptId).first();
    
    if (!receipt) {
      return errorResponse(404, "NOT_FOUND", "收據不存在", null, requestId);
    }
    
    // 软删除收款记录
    await env.DATABASE.prepare(`
      UPDATE Payments 
      SET is_deleted = 1, updated_at = ? 
      WHERE payment_id = ? AND receipt_id = ?
    `).bind(new Date().toISOString(), paymentId, receiptId).run();
    
    // 重新计算收据的已收金额和状态
    const paymentRows = await env.DATABASE.prepare(`
      SELECT SUM(payment_amount) as total_paid 
      FROM Payments 
      WHERE receipt_id = ? AND is_deleted = 0
    `).bind(receiptId).first();
    
    const newPaidAmount = Number(paymentRows?.total_paid || 0);
    const newStatus = newPaidAmount >= Number(receipt.total_amount) ? "paid" : (newPaidAmount > 0 ? "partial" : "unpaid");
    
    await env.DATABASE.prepare(`
      UPDATE Receipts 
      SET paid_amount = ?, status = ?, updated_at = ? 
      WHERE receipt_id = ?
    `).bind(newPaidAmount, newStatus, new Date().toISOString(), receiptId).run();
    
    return successResponse({ payment_id: paymentId, receipt_id: receiptId }, "已刪除收款記錄", requestId);
  } catch (err) {
    console.error(`[Receipts] Delete payment error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

