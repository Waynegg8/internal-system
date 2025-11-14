/**
 * 请假基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, getD1Cache, saveD1Cache, deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";
import { ensureBasicLeaveBalances } from "./leave-balances.js";

/**
 * 获取请假列表
 */
export async function handleGetLeaves(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return new Response(JSON.stringify({
      ok: false,
      error: "UNAUTHORIZED",
      message: "未登入或身份驗證失敗"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  try {
    const params = url.searchParams;
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
    const offset = (page - 1) * perPage;
    const q = (params.get("q") || "").trim();
    const status = (params.get("status") || "").trim();
    const type = (params.get("type") || "").trim();
    const dateFrom = (params.get("dateFrom") || "").trim();
    const dateTo = (params.get("dateTo") || "").trim();
    const queryUserId = params.get("user_id");
    
    const cacheKey = generateCacheKey('leaves_list', {
      page, perPage, q, status, type, dateFrom, dateTo,
      userId: queryUserId || (user.is_admin ? 'all' : user.user_id)
    });
    
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached?.data) {
      return successResponse(kvCached.data.list, "查詢成功（KV缓存）", requestId, {
        ...kvCached.data.meta,
        cache_source: 'kv'
      });
    }
    
    const d1Cached = await getD1Cache(env, cacheKey);
    if (d1Cached?.data) {
      saveKVCache(env, cacheKey, 'leaves_list', d1Cached.data, { ttl: 3600 }).catch(() => {});
      return successResponse(d1Cached.data.list, "查詢成功（D1缓存）", requestId, {
        ...d1Cached.data.meta,
        cache_source: 'd1'
      });
    }
    
    const where = ["l.is_deleted = 0"];
    const binds = [];
    
    // 管理员可以指定user_id，员工只能看自己的
    if (queryUserId && user.is_admin) {
      where.push("l.user_id = ?");
      binds.push(String(queryUserId));
    } else if (!user.is_admin) {
      where.push("l.user_id = ?");
      binds.push(String(user.user_id));
    }
    
    if (q) {
      where.push("l.leave_type LIKE ?");
      binds.push(`%${q}%`);
    }
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      where.push("l.status = ?");
      binds.push(status);
    }
    if (type) {
      where.push("l.leave_type = ?");
      binds.push(type);
    }
    if (dateFrom) {
      where.push("l.start_date >= ?");
      binds.push(dateFrom);
    }
    if (dateTo) {
      where.push("l.end_date <= ?");
      binds.push(dateTo);
    }
    
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countRow = await env.DATABASE.prepare(
      `SELECT COUNT(1) AS total FROM LeaveRequests l ${whereSql}`
    ).bind(...binds).first();
    const total = Number(countRow?.total || 0);
    
    const rows = await env.DATABASE.prepare(
      `SELECT l.leave_id, l.user_id, l.leave_type, l.start_date, l.end_date, l.unit, l.amount, l.start_time, l.end_time, l.status, l.submitted_at,
              u.name as user_name
       FROM LeaveRequests l
       LEFT JOIN Users u ON l.user_id = u.user_id
       ${whereSql}
       ORDER BY l.submitted_at DESC, l.leave_id DESC
       LIMIT ? OFFSET ?`
    ).bind(...binds, perPage, offset).all();
    
    const data = (rows?.results || []).map(r => ({
      leaveId: String(r.leave_id),
      userId: String(r.user_id),
      userName: r.user_name || '',
      type: r.leave_type,
      start: r.start_date,
      end: r.end_date,
      unit: r.unit,
      amount: Number(r.amount || 0),
      startTime: r.start_time || null,
      endTime: r.end_time || null,
      status: r.status,
      submittedAt: r.submitted_at,
    }));
    
    const meta = { page, perPage, total, hasNext: offset + perPage < total };
    const cacheData = { list: data, meta };
    
    await Promise.all([
      saveKVCache(env, cacheKey, 'leaves_list', cacheData, { ttl: 3600 }),
      saveD1Cache(env, cacheKey, 'leaves_list', cacheData, {})
    ]).catch(() => {});
    
    return successResponse(data, "成功", requestId, meta);
  } catch (error) {
    console.error('[Leaves] Get leaves error:', error);
    return errorResponse(500, "DATABASE_ERROR", error.message || "查詢假期記錄失敗", null, requestId);
  }
}

/**
 * 创建请假申请
 */
export async function handleCreateLeave(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const body = await request.json();
  const leave_type = String(body?.leave_type || "").trim();
  const start_date = String(body?.start_date || "").trim();
  const amount = Number(body?.amount);
  const start_time = String(body?.start_time || "").trim();
  const end_time = String(body?.end_time || "").trim();
  
  const errors = [];
  if (!leave_type) errors.push({ field: "leave_type", message: "必選假別" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) errors.push({ field: "start_date", message: "日期格式 YYYY-MM-DD" });
  if (!Number.isFinite(amount) || amount <= 0) errors.push({ field: "amount", message: "需大於 0" });
  if (Math.abs(amount * 2 - Math.round(amount * 2)) > 1e-9) {
    errors.push({ field: "amount", message: "請假小時數必須是 0.5 的倍數" });
  }
  if (!/^\d{2}:\d{2}$/.test(start_time)) errors.push({ field: "start_time", message: "請選擇開始時間（格式 HH:MM）" });
  if (!/^\d{2}:\d{2}$/.test(end_time)) errors.push({ field: "end_time", message: "請選擇結束時間（格式 HH:MM）" });
  
  // 验证时间必须是30分钟的倍数
  if (start_time && /^\d{2}:\d{2}$/.test(start_time)) {
    const [, m] = start_time.split(':').map(Number);
    if (m !== 0 && m !== 30) errors.push({ field: "start_time", message: "時間必須是整點或半點" });
  }
  if (end_time && /^\d{2}:\d{2}$/.test(end_time)) {
    const [, m] = end_time.split(':').map(Number);
    if (m !== 0 && m !== 30) errors.push({ field: "end_time", message: "時間必須是整點或半點" });
  }
  
  // 性别限制检查
  const femaleOnlyLeaveTypes = ['maternity', 'menstrual', 'prenatal_checkup'];
  const maleOnlyLeaveTypes = ['paternity'];
  
  if (femaleOnlyLeaveTypes.includes(leave_type) && user.gender === 'M') {
    errors.push({ field: "leave_type", message: "此假別僅限女性" });
  }
  if (maleOnlyLeaveTypes.includes(leave_type) && user.gender === 'F') {
    errors.push({ field: "leave_type", message: "此假別僅限男性" });
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  try {
    // 检查余额（简化版，完整版需要检查各种假期类型）
    const year = new Date(start_date).getFullYear();
    await ensureBasicLeaveBalances(env, String(user.user_id), year);
    
    const now = new Date().toISOString();
    await env.DATABASE.prepare(
      `INSERT INTO LeaveRequests (user_id, leave_type, start_date, end_date, unit, amount, start_time, end_time, status, submitted_at)
       VALUES (?, ?, ?, ?, 'hours', ?, ?, ?, 'approved', ?)`
    ).bind(String(user.user_id), leave_type, start_date, start_date, amount, start_time, end_time, now).run();
    
    // 清除缓存
    await Promise.all([
      deleteKVCacheByPrefix(env, 'leaves_'),
      invalidateD1CacheByType(env, 'leaves_list'),
      invalidateD1CacheByType(env, 'leaves_balances')
    ]).catch(() => {});
    
    // 觸發重新計算薪資（異步執行）
    const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
    triggerPayrollRecalculation(env, user.user_id, start_date, ctx, 'leave').catch(() => {});
    
    return successResponse({ leave_type, start_date, amount }, "請假申請已提交", requestId);
  } catch (error) {
    console.error('[Leaves] Create leave error:', error);
    return errorResponse(500, "DATABASE_ERROR", error.message || "數據庫錯誤", null, requestId);
  }
}

/**
 * 更新请假记录
 */
export async function handleUpdateLeave(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const leaveId = match[1];
  const body = await request.json();
  
  const row = await env.DATABASE.prepare(
    `SELECT leave_id, user_id, leave_type FROM LeaveRequests WHERE leave_id = ? AND is_deleted = 0`
  ).bind(leaveId).first();
  
  if (!row) {
    return errorResponse(404, "NOT_FOUND", "記錄不存在", null, requestId);
  }
  
  if (!user.is_admin && String(row.user_id) !== String(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "沒有權限", null, requestId);
  }
  
  // 暫不支援編輯補休
  if (row.leave_type === 'comp' || body.leave_type === 'comp') {
    return errorResponse(422, "UNSUPPORTED", "補休紀錄暫不支援編輯，請刪除後重建", null, requestId);
  }
  
  const leave_type = String(body?.leave_type || "").trim();
  const start_date = String(body?.start_date || "").trim();
  const amount = Number(body?.amount);
  const start_time = String(body?.start_time || "").trim();
  const end_time = String(body?.end_time || "").trim();
  
  const errors = [];
  if (!leave_type) errors.push({ field: "leave_type", message: "必選假別" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) errors.push({ field: "start_date", message: "日期格式 YYYY-MM-DD" });
  if (!Number.isFinite(amount) || amount <= 0) errors.push({ field: "amount", message: "需大於 0" });
  if (!/^\d{2}:\d{2}$/.test(start_time)) errors.push({ field: "start_time", message: "請選擇開始時間" });
  if (!/^\d{2}:\d{2}$/.test(end_time)) errors.push({ field: "end_time", message: "請選擇結束時間" });
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  await env.DATABASE.prepare(
    `UPDATE LeaveRequests 
     SET leave_type = ?, start_date = ?, end_date = ?, amount = ?, start_time = ?, end_time = ?, status = 'approved'
     WHERE leave_id = ?`
  ).bind(leave_type, start_date, start_date, amount, start_time, end_time, leaveId).run();
  
  // 清除缓存
  await Promise.all([
    deleteKVCacheByPrefix(env, 'leaves_'),
    invalidateD1CacheByType(env, 'leaves_list'),
    invalidateD1CacheByType(env, 'leaves_balances')
  ]).catch(() => {});
  
  // 觸發重新計算薪資（異步執行）
  const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
  triggerPayrollRecalculation(env, row.user_id, start_date, ctx, 'leave').catch(() => {});
  
  return successResponse({ leave_id: leaveId }, "已更新請假紀錄", requestId);
}

/**
 * 删除请假记录
 */
export async function handleDeleteLeave(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const leaveId = match[1];
  
  const leaveRow = await env.DATABASE.prepare(
    `SELECT leave_id, user_id, leave_type, amount, status FROM LeaveRequests WHERE leave_id = ? AND is_deleted = 0`
  ).bind(leaveId).first();
  
  if (!leaveRow) {
    return errorResponse(404, "NOT_FOUND", "請假記錄不存在", null, requestId);
  }
  
  // 权限检查
  if (!user.is_admin && String(leaveRow.user_id) !== String(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "沒有權限", null, requestId);
  }
  
  // 如果是補休且已批准，需要歸還補休額度（简化版）
  if (leaveRow.leave_type === 'comp' && leaveRow.status === 'approved') {
    // 简化处理：这里应该实现FIFO归还逻辑
  }
  
  // 软删除
  await env.DATABASE.prepare(
    `UPDATE LeaveRequests SET is_deleted = 1 WHERE leave_id = ?`
  ).bind(leaveId).run();
  
  // 清除缓存
  await Promise.all([
    deleteKVCacheByPrefix(env, 'leaves_'),
    invalidateD1CacheByType(env, 'leaves_list'),
    invalidateD1CacheByType(env, 'leaves_balances')
  ]).catch(() => {});
  
  // 觸發重新計算薪資（異步執行）
  const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
  triggerPayrollRecalculation(env, leaveRow.user_id, leaveRow.start_date, ctx, 'leave').catch(() => {});
  
  return successResponse({ leave_id: leaveId }, "已刪除請假記錄", requestId);
}

