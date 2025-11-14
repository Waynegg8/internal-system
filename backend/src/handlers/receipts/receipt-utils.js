/**
 * 收据工具功能
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取应开收据提醒
 */
export async function handleGetReceiptReminders(request, env, ctx, requestId, url) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const serviceMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  
  const reminders = await env.DATABASE.prepare(
    `SELECT DISTINCT
       c.client_id, c.company_name AS client_name,
       cs.client_service_id, s.service_name,
       sbs.billing_month, sbs.billing_amount AS amount,
       (SELECT COUNT(*) FROM ActiveTasks t 
        WHERE t.client_service_id = cs.client_service_id 
          AND t.service_month = ? AND t.is_deleted = 0) as total_tasks,
       (SELECT COUNT(*) FROM ActiveTasks t 
        WHERE t.client_service_id = cs.client_service_id 
          AND t.service_month = ? AND t.is_deleted = 0
          AND t.status = 'completed') as completed_tasks
     FROM ClientServices cs
     JOIN Clients c ON c.client_id = cs.client_id
     JOIN Services s ON s.service_id = cs.service_id
     JOIN ServiceBillingSchedule sbs ON sbs.client_service_id = cs.client_service_id
     WHERE cs.status = 'active'
       AND sbs.billing_month = ?
       AND NOT EXISTS (
         SELECT 1 FROM Receipts r 
         WHERE r.client_service_id = cs.client_service_id 
           AND r.billing_month = sbs.billing_month
           AND r.is_deleted = 0 AND r.status != 'cancelled'
       )
       AND EXISTS (
         SELECT 1 FROM ActiveTasks t
         WHERE t.client_service_id = cs.client_service_id
           AND t.service_month = ? AND t.is_deleted = 0
       )
       AND NOT EXISTS (
         SELECT 1 FROM ActiveTasks t
         WHERE t.client_service_id = cs.client_service_id
           AND t.service_month = ? AND t.is_deleted = 0
           AND t.status != 'completed'
       )
       AND NOT EXISTS (
         SELECT 1 FROM BillingReminders br
         WHERE br.client_service_id = cs.client_service_id
           AND br.service_month = ? AND br.status = 'postponed'
       )
     ORDER BY c.company_name, s.service_name
     LIMIT 20`
  ).bind(serviceMonth, serviceMonth, currentMonth, serviceMonth, serviceMonth, serviceMonth).all();
  
  const data = (reminders?.results || []).map(r => ({
    client_id: r.client_id,
    client_name: r.client_name,
    client_service_id: r.client_service_id,
    service_name: r.service_name,
    billing_month: r.billing_month,
    amount: Number(r.amount || 0),
    total_tasks: Number(r.total_tasks || 0),
    completed_tasks: Number(r.completed_tasks || 0)
  }));
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 获取建议金额
 */
export async function handleGetSuggestAmount(request, env, ctx, requestId, url) {
  const clientServiceId = parseInt(url.searchParams.get("client_service_id") || "0", 10);
  const billingMonth = parseInt(url.searchParams.get("billing_month") || "0", 10);
  
  if (!clientServiceId || billingMonth < 1 || billingMonth > 12) {
    return errorResponse(400, "BAD_REQUEST", "請提供有效的client_service_id和billing_month（1-12）", null, requestId);
  }
  
  const schedule = await env.DATABASE.prepare(
    `SELECT billing_amount, payment_due_days 
     FROM ServiceBillingSchedule 
     WHERE client_service_id = ? AND billing_month = ?`
  ).bind(clientServiceId, billingMonth).first();
  
  if (!schedule) {
    return successResponse({
      suggested_amount: 0,
      payment_due_days: 30,
      has_schedule: false
    }, "該月份未設定收費", requestId);
  }
  
  return successResponse({
    suggested_amount: Number(schedule.billing_amount || 0),
    payment_due_days: Number(schedule.payment_due_days || 30),
    has_schedule: true
  }, "成功獲取建議金額", requestId);
}

/**
 * 暂缓开票提醒
 */
export async function handlePostponeReminder(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const client_service_id = body?.client_service_id ? parseInt(body.client_service_id, 10) : null;
  const service_month = body?.service_month ? String(body.service_month).trim() : null;
  const postpone_reason = body?.postpone_reason ? String(body.postpone_reason).trim() : '';
  
  if (!client_service_id || !service_month) {
    return errorResponse(400, "BAD_REQUEST", "請提供 client_service_id 和 service_month", null, requestId);
  }
  
  // 验证 service_month 格式 (YYYY-MM)
  if (!/^\d{4}-\d{2}$/.test(service_month)) {
    return errorResponse(422, "VALIDATION_ERROR", "service_month 格式錯誤，應為 YYYY-MM", null, requestId);
  }
  
  try {
    // 获取客户ID和建议金额
    const serviceInfo = await env.DATABASE.prepare(`
      SELECT cs.client_id, sbs.billing_amount
      FROM ClientServices cs
      LEFT JOIN ServiceBillingSchedule sbs ON sbs.client_service_id = cs.client_service_id
        AND sbs.billing_month = ?
      WHERE cs.client_service_id = ?
    `).bind(parseInt(service_month.split('-')[1], 10), client_service_id).first();
    
    if (!serviceInfo) {
      return errorResponse(404, "NOT_FOUND", "服務不存在", null, requestId);
    }
    
    // 检查是否已存在该记录
    const existing = await env.DATABASE.prepare(`
      SELECT reminder_id, status FROM BillingReminders
      WHERE client_service_id = ? AND service_month = ?
    `).bind(client_service_id, service_month).first();
    
    const now = new Date().toISOString();
    
    if (existing) {
      // 更新现有记录
      await env.DATABASE.prepare(`
        UPDATE BillingReminders
        SET status = 'postponed',
            postpone_reason = ?,
            postponed_by = ?,
            postponed_at = ?,
            updated_at = ?
        WHERE reminder_id = ?
      `).bind(postpone_reason, String(user.user_id), now, now, existing.reminder_id).run();
    } else {
      // 创建新记录
      await env.DATABASE.prepare(`
        INSERT INTO BillingReminders (
          client_service_id, service_month, status, postpone_reason,
          postponed_by, postponed_at, created_at, updated_at
        ) VALUES (?, ?, 'postponed', ?, ?, ?, ?, ?)
      `).bind(client_service_id, service_month, postpone_reason, String(user.user_id), now, now, now).run();
    }
    
    return successResponse({
      client_service_id,
      service_month,
      status: 'postponed'
    }, "已暫緩提醒", requestId);
  } catch (err) {
    console.error(`[Receipts] Postpone reminder error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

