/**
 * 成本管理基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 获取成本列表
 */
export async function handleGetCosts(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const year = parseInt(params.get("year") || String(new Date().getFullYear()), 10);
  const month = params.get("month") ? parseInt(params.get("month"), 10) : null;
  
  const where = ["oc.is_deleted = 0", "oc.year = ?"];
  const binds = [year];
  
  if (month) {
    where.push("oc.month = ?");
    binds.push(month);
  }
  
  const q = (params.get("q") || "").trim();
  if (q) {
    where.push("(ot.cost_code LIKE ? OR ot.cost_name LIKE ? OR oc.notes LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  
  const rows = await env.DATABASE.prepare(
    `SELECT 
      oc.overhead_id, oc.cost_type_id, oc.year, oc.month, oc.amount, oc.notes,
      oc.recorded_by, oc.recorded_at, oc.updated_at,
      ot.cost_name, ot.cost_code, ot.allocation_method, ot.category,
      u.name as recorded_by_name
     FROM MonthlyOverheadCosts oc
     LEFT JOIN OverheadCostTypes ot ON ot.cost_type_id = oc.cost_type_id
     LEFT JOIN Users u ON u.user_id = oc.recorded_by
     ${whereSql}
     ORDER BY ot.display_order ASC, ot.cost_code ASC`
  ).bind(...binds).all();
  
  const items = (rows?.results || []).map(r => ({
    id: r.overhead_id,
    overhead_id: r.overhead_id,
    cost_id: r.overhead_id, // 兼容字段
    costTypeId: r.cost_type_id,
    cost_type_id: r.cost_type_id, // 兼容字段
    name: r.cost_name || "", // 舊系統使用 item.name
    costName: r.cost_name || "",
    cost_name: r.cost_name || "", // 兼容字段
    costCode: r.cost_code || "",
    cost_code: r.cost_code || "", // 兼容字段
    type_name: r.cost_name || "",
    category: r.category || "",
    allocationMethod: r.allocation_method || "per_employee",
    allocation_method: r.allocation_method || "per_employee", // 兼容字段
    year: Number(r.year),
    month: Number(r.month),
    amount: Number(r.amount || 0),
    description: r.notes || "",
    notes: r.notes || "",
    recordedBy: r.recorded_by_name || r.recorded_by || "",
    recorded_by: r.recorded_by_name || r.recorded_by || "", // 兼容字段
    recordedAt: r.recorded_at || "",
    recorded_at: r.recorded_at || "", // 兼容字段
    updatedAt: r.updated_at || "",
    updated_at: r.updated_at || "", // 兼容字段
    created_at: r.recorded_at
  }));
  
  // 计算总成本、固定成本、变动成本
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const totalFixed = items
    .filter(item => item.category === 'fixed')
    .reduce((sum, item) => sum + item.amount, 0);
  const totalVariable = items
    .filter(item => item.category === 'variable')
    .reduce((sum, item) => sum + item.amount, 0);
  
  return successResponse({
    items,
    total,
    totalFixed,
    totalVariable,
    year,
    month
  }, "查詢成功", requestId);
}

/**
 * 创建成本记录
 */
export async function handleCreateCost(request, env, ctx, requestId, url) {
  const body = await request.json();
  const costTypeId = parseInt(body?.cost_type_id || 0);
  const year = parseInt(body?.year || String(new Date().getFullYear()), 10);
  const month = parseInt(body?.month || String(new Date().getMonth() + 1), 10);
  const amount = parseFloat(body?.amount || 0);
  const description = String(body?.description || "").trim();
  const notes = String(body?.notes || "").trim();
  
  const errors = [];
  if (!costTypeId || costTypeId <= 0) errors.push({ field: "cost_type_id", message: "必填" });
  if (!Number.isInteger(year) || year < 2000) errors.push({ field: "year", message: "年份無效" });
  if (!Number.isInteger(month) || month < 1 || month > 12) errors.push({ field: "month", message: "月份必須在1-12之間" });
  if (isNaN(amount) || amount < 0) errors.push({ field: "amount", message: "金額必須為非負數" });
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 检查成本类型是否存在
  const costType = await env.DATABASE.prepare(
    `SELECT cost_type_id FROM OverheadCostTypes WHERE cost_type_id = ? AND is_active = 1`
  ).bind(costTypeId).first();
  
  if (!costType) {
    return errorResponse(404, "NOT_FOUND", "成本類型不存在", null, requestId);
  }
  
  // 检查是否已存在
  const existing = await env.DATABASE.prepare(
    `SELECT overhead_id FROM MonthlyOverheadCosts WHERE cost_type_id = ? AND year = ? AND month = ? AND is_deleted = 0`
  ).bind(costTypeId, year, month).first();
  
  if (existing) {
    return errorResponse(422, "DUPLICATE", "該月份已存在此類型的成本記錄", 
      [{ field: "month", message: "重複" }], requestId);
  }
  
  const now = new Date().toISOString();
  const user = ctx?.user;
  await env.DATABASE.prepare(
    `INSERT INTO MonthlyOverheadCosts (cost_type_id, year, month, amount, notes, recorded_by, recorded_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(costTypeId, year, month, amount, notes || description || null, user.user_id, now, now).run();
  
  const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
  
  // 清除相关缓存
  await deleteKVCacheByPrefix(env, 'costs_').catch(() => {});
  
  return successResponse({ cost_id: idRow?.id }, "已創建", requestId);
}

/**
 * 更新成本记录
 */
export async function handleUpdateCost(request, env, ctx, requestId, match, url) {
  const costId = match[1];
  const body = await request.json();
  
  // 检查记录是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT overhead_id FROM MonthlyOverheadCosts WHERE overhead_id = ? AND is_deleted = 0`
  ).bind(costId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "成本記錄不存在", null, requestId);
  }
  
  const updates = [];
  const binds = [];
  
  if (body.hasOwnProperty('amount')) {
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount < 0) {
      return errorResponse(422, "VALIDATION_ERROR", "金額必須為非負數", null, requestId);
    }
    updates.push("amount = ?");
    binds.push(amount);
  }
  if (body.hasOwnProperty('notes') || body.hasOwnProperty('description')) {
    const notes = String((body.notes || body.description || "")).trim() || null;
    updates.push("notes = ?");
    binds.push(notes);
  }
  
  if (updates.length === 0) {
    return errorResponse(400, "BAD_REQUEST", "沒有可更新的欄位", null, requestId);
  }
  
  updates.push("updated_at = ?");
  binds.push(new Date().toISOString());
  binds.push(costId);
  
  await env.DATABASE.prepare(
    `UPDATE MonthlyOverheadCosts SET ${updates.join(", ")} WHERE overhead_id = ?`
  ).bind(...binds).run();
  
  // 清除相关缓存
  await deleteKVCacheByPrefix(env, 'costs_').catch(() => {});
  
  return successResponse({ cost_id: costId }, "已更新", requestId);
}

/**
 * 删除成本记录
 */
export async function handleDeleteCost(request, env, ctx, requestId, match, url) {
  const costId = match[1];
  
  // 软删除
  await env.DATABASE.prepare(
    `UPDATE MonthlyOverheadCosts SET is_deleted = 1, updated_at = ? WHERE overhead_id = ?`
  ).bind(new Date().toISOString(), costId).run();
  
  // 清除相关缓存
  await deleteKVCacheByPrefix(env, 'costs_').catch(() => {});
  
  return successResponse({ cost_id: costId }, "已刪除", requestId);
}

