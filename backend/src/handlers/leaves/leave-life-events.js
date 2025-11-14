/**
 * 生活事件管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取生活事件列表
 */
export async function handleGetLifeEvents(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const params = url.searchParams;
  const targetUserId = params.get("user_id") ? parseInt(params.get("user_id"), 10) : user.user_id;
  
  // 权限检查：只能查看自己的，或管理员可以查看任何人
  if (!user.is_admin && targetUserId !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "沒有權限", null, requestId);
  }
  
  try {
    const rows = await env.DATABASE.prepare(`
      SELECT 
        grant_id,
        user_id,
        event_type,
        event_date,
        leave_type,
        days_granted,
        days_used,
        days_remaining,
        valid_from,
        valid_until,
        status,
        notes,
        created_by,
        created_at
      FROM LifeEventLeaveGrants
      WHERE user_id = ? AND status != 'deleted'
      ORDER BY created_at DESC, event_date DESC
    `).bind(targetUserId).all();
    
    const events = (rows?.results || []).map(r => ({
      id: String(r.grant_id),
      event_id: String(r.grant_id),
      user_id: String(r.user_id),
      event_type: r.event_type,
      event_date: r.event_date,
      leave_type: r.leave_type || "",
      days_granted: Number(r.days_granted || 0),
      days_used: Number(r.days_used || 0),
      days_remaining: Number(r.days_remaining || 0),
      valid_from: r.valid_from || "",
      valid_until: r.valid_until || "",
      status: r.status || "active",
      notes: r.notes || "",
      created_at: r.created_at
    }));
    
    return successResponse(events, "查詢成功", requestId);
  } catch (err) {
    console.error(`[Leaves] Get life events error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 创建生活事件
 */
export async function handleCreateLifeEvent(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const event_type = String(body?.event_type || "").trim();
  const event_date = String(body?.event_date || "").trim();
  const notes = String(body?.notes || "").trim();
  
  const errors = [];
  if (!event_type) {
    errors.push({ field: "event_type", message: "事件類型必填" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
    errors.push({ field: "event_date", message: "日期格式 YYYY-MM-DD" });
  }
  
  if (errors.length) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  try {
    // 根据事件类型确定对应的假别和天数
    const eventRules = {
      marriage: { leave_type: 'marriage', days: 8 },
      funeral: { leave_type: 'funeral', days: 8 },
      maternity: { leave_type: 'maternity', days: 42 },
      paternity: { leave_type: 'paternity', days: 5 },
      other: { leave_type: 'other', days: 0 }
    };
    
    const rule = eventRules[event_type] || eventRules.other;
    const daysGranted = rule.days;
    const validFrom = event_date;
    // 有效期限：从事件日期开始，根据假别类型设置有效期
    const validUntil = event_type === 'maternity' 
      ? new Date(new Date(event_date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 产假1年有效
      : new Date(new Date(event_date).getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 其他6个月有效
    
    const now = new Date().toISOString();
    
    // 插入生活事件假期授予记录
    const insertResult = await env.DATABASE.prepare(`
      INSERT INTO LifeEventLeaveGrants (
        user_id, event_type, event_date, leave_type, days_granted, 
        days_used, days_remaining, valid_from, valid_until, status, 
        notes, created_by, created_at
      )
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'active', ?, ?, ?)
    `).bind(
      user.user_id, 
      event_type, 
      event_date, 
      rule.leave_type, 
      daysGranted,
      daysGranted,
      validFrom,
      validUntil,
      notes || null,
      user.user_id,
      now
    ).run();
    
    const grantId = String(insertResult.meta.last_row_id);
    
    return successResponse({
      id: grantId,
      event_id: grantId,
      user_id: String(user.user_id),
      event_type,
      event_date,
      leave_type: rule.leave_type,
      days_granted: daysGranted,
      days_used: 0,
      days_remaining: daysGranted,
      valid_from: validFrom,
      valid_until: validUntil,
      status: 'active',
      notes: notes || "",
      created_at: now
    }, "已登記生活事件", requestId);
  } catch (err) {
    console.error(`[Leaves] Create life event error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 删除生活事件
 */
export async function handleDeleteLifeEvent(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const eventId = match[1];
  
  try {
    // 检查事件是否存在
    const event = await env.DATABASE.prepare(`
      SELECT grant_id, user_id, status FROM LifeEventLeaveGrants WHERE grant_id = ? AND status != 'deleted'
    `).bind(eventId).first();
    
    if (!event) {
      return errorResponse(404, "NOT_FOUND", "生活事件不存在", null, requestId);
    }
    
    // 权限检查：只能删除自己的，或管理员可以删除任何人
    if (!user.is_admin && Number(event.user_id) !== user.user_id) {
      return errorResponse(403, "FORBIDDEN", "沒有權限", null, requestId);
    }
    
    // 直接删除（旧系统也是直接删除）
    await env.DATABASE.prepare(`
      DELETE FROM LifeEventLeaveGrants WHERE grant_id = ?
    `).bind(eventId).run();
    
    return successResponse({ event_id: eventId, grant_id: eventId }, "已刪除", requestId);
  } catch (err) {
    console.error(`[Leaves] Delete life event error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

