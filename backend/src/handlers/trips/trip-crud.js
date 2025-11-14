/**
 * 外出登记基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, deleteKVCacheByPrefix } from "../../utils/cache.js";
import { calculateTransportSubsidy } from "./utils.js";

/**
 * 获取外出登记列表
 */
export async function handleGetTrips(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const params = url.searchParams;
  const userId = params.get("user_id");
  const clientId = params.get("client_id");
  const startDate = params.get("start_date");
  const endDate = params.get("end_date");
  const status = params.get("status");
  const month = params.get("month");
  
  // 一般用户只能查看自己的记录，管理员可以查看所有
  let targetUserId = user.is_admin && userId ? userId : String(user.user_id);
  
  // 构建查询条件
  const conditions = ["t.is_deleted = 0"];
  const bindings = [];
  
  if (!user.is_admin || !userId) {
    conditions.push("t.user_id = ?");
    bindings.push(targetUserId);
  } else if (userId) {
    conditions.push("t.user_id = ?");
    bindings.push(userId);
  }
  
  if (clientId) {
    conditions.push("t.client_id = ?");
    bindings.push(clientId);
  }
  if (startDate) {
    conditions.push("t.trip_date >= ?");
    bindings.push(startDate);
  }
  if (endDate) {
    conditions.push("t.trip_date <= ?");
    bindings.push(endDate);
  }
  if (month) {
    conditions.push("strftime('%Y-%m', t.trip_date) = ?");
    bindings.push(month);
  }
  if (status) {
    conditions.push("t.status = ?");
    bindings.push(status);
  }
  
  const whereClause = conditions.join(" AND ");
  
  // 尝试从KV缓存读取
  const cacheKey = generateCacheKey('trips_list', {
    userId: targetUserId,
    clientId,
    startDate,
    endDate,
    month,
    status
  });
  
  const kvCached = await getKVCache(env, cacheKey);
  if (kvCached?.data) {
    return successResponse(kvCached.data, "查詢成功（KV缓存）", requestId, {
      ...kvCached.meta,
      cache_source: 'kv'
    });
  }
  
  // 查询数据
  const sql = `
    SELECT 
      t.trip_id, t.user_id, t.client_id, t.trip_date, t.destination,
      t.distance_km, t.purpose, t.transport_subsidy_cents, t.status,
      t.submitted_at, t.reviewed_at, t.reviewed_by, t.notes,
      u.name as user_name, c.company_name as client_name,
      r.name as reviewer_name
    FROM BusinessTrips t
    LEFT JOIN Users u ON t.user_id = u.user_id
    LEFT JOIN Clients c ON t.client_id = c.client_id
    LEFT JOIN Users r ON t.reviewed_by = r.user_id
    WHERE ${whereClause}
    ORDER BY t.trip_date DESC, t.trip_id DESC
  `;
  
  const rows = await env.DATABASE.prepare(sql).bind(...bindings).all();
  
  const data = (rows?.results || []).map(r => ({
    trip_id: r.trip_id,
    user_id: r.user_id,
    user_name: r.user_name || "",
    client_id: r.client_id || null,
    client_name: r.client_name || "",
    trip_date: r.trip_date,
    destination: r.destination || "",
    distance_km: Number(r.distance_km || 0),
    purpose: r.purpose || "",
    transport_subsidy_twd: Number(r.transport_subsidy_cents || 0) / 100,
    status: r.status || "pending",
    submitted_at: r.submitted_at || null,
    reviewed_at: r.reviewed_at || null,
    reviewed_by: r.reviewed_by || null,
    reviewer_name: r.reviewer_name || "",
    notes: r.notes || ""
  }));
  
  await saveKVCache(env, cacheKey, 'trips_list', data, { ttl: 1800 }).catch(() => {});
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 获取单条外出登记
 */
export async function handleGetTripDetail(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const tripId = match[1];
  
  const row = await env.DATABASE.prepare(
    `SELECT 
      t.trip_id, t.user_id, t.client_id, t.trip_date, t.destination,
      t.distance_km, t.purpose, t.transport_subsidy_cents, t.status,
      t.submitted_at, t.reviewed_at, t.reviewed_by, t.notes,
      u.name as user_name, c.company_name as client_name,
      r.name as reviewer_name
     FROM BusinessTrips t
     LEFT JOIN Users u ON t.user_id = u.user_id
     LEFT JOIN Clients c ON t.client_id = c.client_id
     LEFT JOIN Users r ON t.reviewed_by = r.user_id
     WHERE t.trip_id = ? AND t.is_deleted = 0`
  ).bind(tripId).first();
  
  if (!row) {
    return errorResponse(404, "NOT_FOUND", "找不到此外出登記", null, requestId);
  }
  
  // 权限检查
  if (!user.is_admin && String(row.user_id) !== String(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限查看此記錄", null, requestId);
  }
  
  const data = {
    trip_id: row.trip_id,
    user_id: row.user_id,
    user_name: row.user_name || "",
    client_id: row.client_id || null,
    client_name: row.client_name || "",
    trip_date: row.trip_date,
    destination: row.destination || "",
    distance_km: Number(row.distance_km || 0),
    purpose: row.purpose || "",
    transport_subsidy_twd: Number(row.transport_subsidy_cents || 0) / 100,
    status: row.status || "pending",
    submitted_at: row.submitted_at || null,
    reviewed_at: row.reviewed_at || null,
    reviewed_by: row.reviewed_by || null,
    reviewer_name: row.reviewer_name || "",
    notes: row.notes || ""
  };
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 创建外出登记
 */
export async function handleCreateTrip(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const body = await request.json();
  const { client_id, trip_date, destination, distance_km, purpose, notes } = body;
  
  // 验证必填字段
  if (!trip_date || !destination || !distance_km) {
    return errorResponse(400, "VALIDATION_ERROR", "請填寫日期、目的地和距離", null, requestId);
  }
  
  if (distance_km <= 0) {
    return errorResponse(400, "VALIDATION_ERROR", "距離必須大於0公里", null, requestId);
  }
  
  // 计算交通补贴
  const transportSubsidy = calculateTransportSubsidy(distance_km);
  
  // 新增记录（直接设为已核准）
  const result = await env.DATABASE.prepare(
    `INSERT INTO BusinessTrips (
      user_id, client_id, trip_date, destination, 
      distance_km, purpose, transport_subsidy_cents, 
      status, notes, submitted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, datetime('now'), datetime('now'), datetime('now'))`
  ).bind(
    user.user_id,
    client_id || null,
    trip_date,
    destination,
    distance_km,
    purpose || null,
    transportSubsidy,
    notes || null
  ).run();
  
  // 清除相关缓存
  await deleteKVCacheByPrefix(env, 'trips_list').catch(() => {});
  
  // 觸發重新計算薪資（異步執行）
  const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
  triggerPayrollRecalculation(env, user.user_id, trip_date, ctx, 'trip').catch(() => {});
  
  return successResponse({
    trip_id: result.meta?.last_row_id,
    transport_subsidy_twd: transportSubsidy / 100
  }, "外出登記已新增", requestId);
}

/**
 * 更新外出登记
 */
export async function handleUpdateTrip(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const tripId = match[1];
  const body = await request.json();
  
  // 检查记录是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT * FROM BusinessTrips WHERE trip_id = ? AND is_deleted = 0`
  ).bind(tripId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "找不到此外出登記", null, requestId);
  }
  
  // 一般用户只能修改自己的记录
  if (!user.is_admin && String(existing.user_id) !== String(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限修改此記錄", null, requestId);
  }
  
  const updates = [];
  const bindings = [];
  
  if (body.client_id !== undefined) {
    updates.push("client_id = ?");
    bindings.push(body.client_id || null);
  }
  if (body.trip_date) {
    updates.push("trip_date = ?");
    bindings.push(body.trip_date);
  }
  if (body.destination) {
    updates.push("destination = ?");
    bindings.push(body.destination);
  }
  if (body.distance_km !== undefined) {
    updates.push("distance_km = ?");
    bindings.push(body.distance_km);
    // 重新计算交通补贴
    const transportSubsidy = calculateTransportSubsidy(body.distance_km);
    updates.push("transport_subsidy_cents = ?");
    bindings.push(transportSubsidy);
  }
  if (body.purpose !== undefined) {
    updates.push("purpose = ?");
    bindings.push(body.purpose || null);
  }
  if (body.notes !== undefined) {
    updates.push("notes = ?");
    bindings.push(body.notes || null);
  }
  
  if (updates.length === 0) {
    return errorResponse(400, "BAD_REQUEST", "沒有可更新的欄位", null, requestId);
  }
  
  updates.push("updated_at = datetime('now')");
  bindings.push(tripId);
  
  await env.DATABASE.prepare(
    `UPDATE BusinessTrips SET ${updates.join(", ")} WHERE trip_id = ?`
  ).bind(...bindings).run();
  
  // 清除相关缓存
  await deleteKVCacheByPrefix(env, 'trips_list').catch(() => {});
  
  // 觸發重新計算薪資（異步執行）
  const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
  const tripDate = body.trip_date || existing.trip_date;
  triggerPayrollRecalculation(env, existing.user_id, tripDate, ctx, 'trip').catch(() => {});
  
  return successResponse({ trip_id: tripId }, "已更新", requestId);
}

/**
 * 删除外出登记
 */
export async function handleDeleteTrip(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const tripId = match[1];
  
  // 检查记录是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT user_id, trip_date FROM BusinessTrips WHERE trip_id = ? AND is_deleted = 0`
  ).bind(tripId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "找不到此外出登記", null, requestId);
  }
  
  // 权限检查
  if (!user.is_admin && String(existing.user_id) !== String(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限刪除此記錄", null, requestId);
  }
  
  // 软删除
  await env.DATABASE.prepare(
    `UPDATE BusinessTrips SET is_deleted = 1, updated_at = datetime('now') WHERE trip_id = ?`
  ).bind(tripId).run();
  
  // 清除相关缓存
  await deleteKVCacheByPrefix(env, 'trips_list').catch(() => {});
  
  // 觸發重新計算薪資（異步執行）
  const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
  triggerPayrollRecalculation(env, existing.user_id, existing.trip_date, ctx, 'trip').catch(() => {});
  
  return successResponse({ trip_id: tripId }, "已刪除", requestId);
}

