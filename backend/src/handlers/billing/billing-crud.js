/**
 * 账单管理基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 获取服务的收费明细
 */
export async function handleGetServiceBilling(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const clientServiceId = match[1];
  
  // 检查服务是否存在且有权限访问
  const service = await env.DATABASE.prepare(
    `SELECT cs.client_service_id, cs.client_id, c.assignee_user_id
     FROM ClientServices cs
     LEFT JOIN Clients c ON c.client_id = cs.client_id
     WHERE cs.client_service_id = ? AND cs.is_deleted = 0`
  ).bind(clientServiceId).first();
  
  if (!service) {
    return errorResponse(404, "NOT_FOUND", "服務不存在", null, requestId);
  }
  
  // 权限检查：管理员或负责人可查看
  if (!user.is_admin && service.assignee_user_id !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "無權限訪問", null, requestId);
  }
  
  const rows = await env.DATABASE.prepare(
    `SELECT schedule_id, billing_type, billing_month, billing_amount, 
            payment_due_days, billing_date, description, notes, 
            created_at, updated_at
     FROM ServiceBillingSchedule
     WHERE client_service_id = ?
     ORDER BY billing_type ASC, billing_month ASC`
  ).bind(clientServiceId).all();
  
  const data = (rows?.results || []).map(r => ({
    schedule_id: r.schedule_id,
    billing_type: r.billing_type || 'monthly',
    billing_month: r.billing_month,
    billing_amount: Number(r.billing_amount || 0),
    payment_due_days: Number(r.payment_due_days || 30),
    billing_date: r.billing_date || null,
    description: r.description || null,
    notes: r.notes || "",
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
  
  // 计算年度总额
  const yearTotal = data.reduce((sum, item) => sum + item.billing_amount, 0);
  
  return successResponse({
    schedules: data,
    year_total: yearTotal
  }, "查詢成功", requestId);
}

/**
 * 创建收费明细
 */
export async function handleCreateBilling(request, env, ctx, requestId, url) {
  const body = await request.json();
  const clientServiceId = parseInt(body?.client_service_id || 0);
  const billingType = String(body?.billing_type || "monthly").trim();
  const billingMonth = parseInt(body?.billing_month, 10);
  const billingAmount = parseFloat(body?.billing_amount);
  const paymentDueDays = parseInt(body?.payment_due_days || 30, 10);
  const notes = String(body?.notes || "").trim();
  const billingDate = String(body?.billing_date || "").trim();
  const description = String(body?.description || "").trim();
  
  const errors = [];
  if (!clientServiceId) errors.push({ field: "client_service_id", message: "必填" });
  if (!['monthly', 'one-time'].includes(billingType)) {
    errors.push({ field: "billing_type", message: "收費類型必須為monthly或one-time" });
  }
  
  if (billingType === 'monthly') {
    if (!Number.isInteger(billingMonth) || billingMonth < 1 || billingMonth > 12) {
      errors.push({ field: "billing_month", message: "月份必須在1-12之間" });
    }
  } else if (billingType === 'one-time') {
    if (!billingDate) errors.push({ field: "billing_date", message: "一次性收費必須提供日期" });
    if (!description) errors.push({ field: "description", message: "一次性收費必須提供說明" });
  }
  
  if (isNaN(billingAmount) || billingAmount < 0) {
    errors.push({ field: "billing_amount", message: "金額必須為非負數" });
  }
  if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
    errors.push({ field: "payment_due_days", message: "收款期限必須大於0" });
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 检查服务是否存在
  const service = await env.DATABASE.prepare(
    `SELECT client_service_id, client_id FROM ClientServices WHERE client_service_id = ? AND is_deleted = 0`
  ).bind(clientServiceId).first();
  
  if (!service) {
    return errorResponse(404, "NOT_FOUND", "服務不存在", null, requestId);
  }
  
  // 唯一性检查
  if (billingType === 'monthly') {
    const existing = await env.DATABASE.prepare(
      `SELECT schedule_id FROM ServiceBillingSchedule 
       WHERE client_service_id = ? AND billing_month = ? AND billing_type = 'monthly'`
    ).bind(clientServiceId, billingMonth).first();
    
    if (existing) {
      return errorResponse(422, "DUPLICATE", "該月份已設定收費", 
        [{ field: "billing_month", message: "該月份已存在" }], requestId);
    }
  } else if (billingType === 'one-time') {
    const existing = await env.DATABASE.prepare(
      `SELECT schedule_id FROM ServiceBillingSchedule 
       WHERE client_service_id = ? AND billing_type = 'one-time' 
       AND billing_date = ? AND COALESCE(description,'') = ?`
    ).bind(clientServiceId, billingDate, description).first();
    
    if (existing) {
      return errorResponse(422, "DUPLICATE", "該日期與說明的一次性收費已存在",
        [{ field: "billing_date", message: "重複" }], requestId);
    }
  }
  
  const now = new Date().toISOString();
  await env.DATABASE.prepare(
    `INSERT INTO ServiceBillingSchedule 
     (client_service_id, billing_type, billing_month, billing_amount, 
      payment_due_days, billing_date, description, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    clientServiceId,
    billingType,
    billingType === 'monthly' ? billingMonth : null,
    billingAmount,
    paymentDueDays,
    billingType === 'one-time' ? billingDate : null,
    billingType === 'one-time' ? description : null,
    notes,
    now,
    now
  ).run();
  
  const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
  
  // 清除相关缓存
  await deleteKVCacheByPrefix(env, `client_detail:clientId=${service.client_id}`).catch(() => {});
  
  return successResponse({ schedule_id: idRow?.id }, "已創建", requestId);
}

/**
 * 更新收费明细
 */
export async function handleUpdateBilling(request, env, ctx, requestId, match, url) {
  const scheduleId = match[1];
  const body = await request.json();
  
  // 检查记录是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT schedule_id, client_service_id FROM ServiceBillingSchedule WHERE schedule_id = ?`
  ).bind(scheduleId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "收費明細不存在", null, requestId);
  }
  
  const updates = [];
  const binds = [];
  
  if (body.hasOwnProperty('billing_amount')) {
    const billingAmount = parseFloat(body.billing_amount);
    if (isNaN(billingAmount) || billingAmount < 0) {
      return errorResponse(422, "VALIDATION_ERROR", "金額必須為非負數", null, requestId);
    }
    updates.push("billing_amount = ?");
    binds.push(billingAmount);
  }
  if (body.hasOwnProperty('payment_due_days')) {
    const paymentDueDays = parseInt(body.payment_due_days, 10);
    if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
      return errorResponse(422, "VALIDATION_ERROR", "收款期限必須大於0", null, requestId);
    }
    updates.push("payment_due_days = ?");
    binds.push(paymentDueDays);
  }
  if (body.hasOwnProperty('notes')) {
    updates.push("notes = ?");
    binds.push(String(body.notes || "").trim());
  }
  
  if (updates.length === 0) {
    return errorResponse(400, "BAD_REQUEST", "沒有可更新的欄位", null, requestId);
  }
  
  updates.push("updated_at = ?");
  binds.push(new Date().toISOString());
  binds.push(scheduleId);
  
  await env.DATABASE.prepare(
    `UPDATE ServiceBillingSchedule SET ${updates.join(", ")} WHERE schedule_id = ?`
  ).bind(...binds).run();
  
  // 清除相关缓存
  const service = await env.DATABASE.prepare(
    `SELECT client_id FROM ClientServices WHERE client_service_id = ?`
  ).bind(existing.client_service_id).first();
  
  if (service) {
    await deleteKVCacheByPrefix(env, `client_detail:clientId=${service.client_id}`).catch(() => {});
  }
  
  return successResponse({ schedule_id: scheduleId }, "已更新", requestId);
}





