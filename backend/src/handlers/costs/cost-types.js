/**
 * 成本類型管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix } from "../../utils/cache.js";
import { generateCostTypeCode } from "../../utils/code-generator.js";

/**
 * 獲取成本類型列表
 */
export async function handleGetCostTypes(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
  const offset = (page - 1) * perPage;
  const q = (params.get("q") || "").trim();
  const category = (params.get("category") || "").trim();
  const isActive = params.get("is_active");
  
  const where = [];
  const binds = [];
  
  if (q) {
    where.push("(cost_code LIKE ? OR cost_name LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (category && ["fixed", "variable"].includes(category)) {
    where.push("category = ?");
    binds.push(category);
  }
  if (isActive === "0" || isActive === "1") {
    where.push("is_active = ?");
    binds.push(parseInt(isActive, 10));
  }
  
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  
  const countRow = await env.DATABASE.prepare(
    `SELECT COUNT(1) AS total FROM OverheadCostTypes ${whereSql}`
  ).bind(...binds).first();
  const total = Number(countRow?.total || 0);
  
  const rows = await env.DATABASE.prepare(
    `SELECT cost_type_id, cost_code, cost_name, category, allocation_method, description, is_active, display_order, created_at, updated_at
     FROM OverheadCostTypes
     ${whereSql}
     ORDER BY cost_name ASC
     LIMIT ? OFFSET ?`
  ).bind(...binds, perPage, offset).all();
  
  const data = (rows?.results || []).map(r => ({
    id: r.cost_type_id,
    cost_type_id: r.cost_type_id,
    code: r.cost_code,
    cost_code: r.cost_code,
    name: r.cost_name,
    cost_name: r.cost_name,
    category: r.category,
    allocationMethod: r.allocation_method,
    allocation_method: r.allocation_method,
    description: r.description || "",
    isActive: r.is_active === 1,
    is_active: r.is_active === 1,
    displayOrder: Number(r.display_order || 0),
    display_order: Number(r.display_order || 0),
    createdAt: r.created_at,
    created_at: r.created_at,
    updatedAt: r.updated_at,
    updated_at: r.updated_at
  }));
  
  return successResponse(data, "查詢成功", requestId, { page, perPage, total });
}

/**
 * 創建成本類型
 */
export async function handleCreateCostType(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const body = await request.json();
  
  const code = String(body?.cost_code || body?.code || "").trim();
  const name = String(body?.cost_name || body?.name || "").trim();
  let category = String(body?.category || "").trim();
  let methodVal = String(body?.allocation_method || body?.allocationMethod || "").trim();
  
  // 映射：允许传中文或驼峰键名，统一转为有效值
  const catMap = { 'fixed': 'fixed', 'variable': 'variable', '固定': 'fixed', '變動': 'variable' };
  const methodMap = { 
    'per_employee': 'per_employee', 
    'per_hour': 'per_hour', 
    'per_revenue': 'per_revenue',
    '按員工數': 'per_employee', 
    '按工時': 'per_hour', 
    '按收入': 'per_revenue' 
  };
  category = catMap[category] || category;
  methodVal = methodMap[methodVal] || methodVal;
  const description = (body?.description || "").trim();
  
  const errors = [];
  if (!code) {
    errors.push({ field: "cost_code", message: "必填" });
  }
  if (!name || name.length > 50) {
    errors.push({ field: "cost_name", message: "必填且 ≤ 50" });
  }
  if (!["fixed", "variable"].includes(category)) {
    errors.push({ field: "category", message: "不合法" });
  }
  if (!["per_employee", "per_hour", "per_revenue"].includes(methodVal)) {
    errors.push({ field: "allocation_method", message: "不合法" });
  }
  if (errors.length) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }

  // 檢查成本代碼唯一性
  const existingCode = await env.DATABASE.prepare(
    `SELECT cost_type_id FROM OverheadCostTypes WHERE cost_code = ?`
  ).bind(code).first();

  if (existingCode) {
    return errorResponse(422, "DUPLICATE_CODE", "成本代碼已存在", null, requestId);
  }
  
  const result = await env.DATABASE.prepare(
    "INSERT INTO OverheadCostTypes (cost_code, cost_name, category, allocation_method, description, is_active) VALUES (?, ?, ?, ?, ?, 1)"
  ).bind(code, name, category, methodVal, description).run();
  
  const newId = result.meta?.last_row_id;
  
  // 清除相关缓存
  await deleteKVCacheByPrefix(env, 'costs_').catch(() => {});
  
  return successResponse({ id: newId, code, name, category, allocationMethod: methodVal }, "已建立", requestId);
}

/**
 * 更新成本類型
 */
export async function handleUpdateCostType(request, env, ctx, requestId, match, url) {
  const id = parseInt(match[1], 10);
  const body = await request.json();

  const code = String(body?.cost_code || body?.code || "").trim();
  const name = String(body?.cost_name || body?.name || "").trim();
  const category = String(body?.category || "").trim();
  const methodVal = String(body?.allocation_method || body?.allocationMethod || "").trim();
  const description = (body?.description || "").trim();
  const isActive = body?.is_active != null ? (body.is_active ? 1 : 0) : undefined;
  const displayOrder = body?.display_order != null ? parseInt(body.display_order) : undefined;
  
  const updates = [];
  const binds = [];

  // 檢查成本代碼唯一性（排除當前項目）
  if (code) {
    const existingCode = await env.DATABASE.prepare(
      `SELECT cost_type_id FROM OverheadCostTypes WHERE cost_code = ? AND cost_type_id != ?`
    ).bind(code, id).first();

    if (existingCode) {
      return errorResponse(422, "DUPLICATE_CODE", "成本代碼已存在", null, requestId);
    }

    updates.push("cost_code = ?");
    binds.push(code);
  }

  // 如果名称改变，自动重新生成代码
  if (name) {
    updates.push("cost_name = ?");
    binds.push(name);
    
    const existing = await env.DATABASE.prepare(
      `SELECT cost_name FROM OverheadCostTypes WHERE cost_type_id = ?`
    ).bind(id).first();
    
    if (existing && existing.cost_name !== name) {
      const newCode = await generateCostTypeCode(env, name);
      updates.push("cost_code = ?");
      binds.push(newCode);
    }
  }
  
  if (["fixed", "variable"].includes(category)) {
    updates.push("category = ?");
    binds.push(category);
  }
  if (["per_employee", "per_hour", "per_revenue"].includes(methodVal)) {
    updates.push("allocation_method = ?");
    binds.push(methodVal);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    binds.push(description);
  }
  if (isActive !== undefined) {
    updates.push("is_active = ?");
    binds.push(isActive);
  }
  if (displayOrder !== undefined) {
    updates.push("display_order = ?");
    binds.push(displayOrder);
  }
  
  if (updates.length === 0) {
    return errorResponse(400, "BAD_REQUEST", "沒有可更新的欄位", null, requestId);
  }
  
  updates.push("updated_at = datetime('now')");
  binds.push(id);
  
  await env.DATABASE.prepare(
    `UPDATE OverheadCostTypes SET ${updates.join(", ")} WHERE cost_type_id = ?`
  ).bind(...binds).run();
  
  // 清除相关缓存
  await deleteKVCacheByPrefix(env, 'costs_').catch(() => {});
  
  return successResponse({ id }, "已更新", requestId);
}

/**
 * 刪除成本類型（軟刪除）
 */
export async function handleDeleteCostType(request, env, ctx, requestId, match, url) {
  const id = parseInt(match[1], 10);
  
  if (!Number.isFinite(id) || id <= 0) {
    return errorResponse(400, "INVALID_ID", "成本類型ID無效", null, requestId);
  }
  
  try {
    // 先確認成本類型是否存在
    const existing = await env.DATABASE.prepare(
      "SELECT cost_type_id FROM OverheadCostTypes WHERE cost_type_id = ?"
    ).bind(id).first();
    
    if (!existing) {
      return errorResponse(404, "NOT_FOUND", "成本類型不存在", null, requestId);
    }

    // 檢查使用情況 - 檢查 MonthlyOverheadCosts 表
    const usageInMonthlyCosts = await env.DATABASE.prepare(
      "SELECT COUNT(1) AS count FROM MonthlyOverheadCosts WHERE cost_type_id = ? AND is_deleted = 0"
    ).bind(id).first();

    // 檢查使用情況 - 檢查 OverheadRecurringTemplates 表
    const usageInTemplates = await env.DATABASE.prepare(
      "SELECT COUNT(1) AS count FROM OverheadRecurringTemplates WHERE cost_type_id = ?"
    ).bind(id).first();

    if ((usageInMonthlyCosts?.count || 0) > 0 || (usageInTemplates?.count || 0) > 0) {
      return errorResponse(409, "IN_USE", "該成本項目類型已被使用，無法刪除", {
        monthlyCostsCount: usageInMonthlyCosts?.count || 0,
        templatesCount: usageInTemplates?.count || 0
      }, requestId);
    }

    // 以交易方式刪除相關資料
    await env.DATABASE.batch([
      env.DATABASE.prepare(
        "DELETE FROM OverheadRecurringTemplates WHERE cost_type_id = ?"
      ).bind(id),
      env.DATABASE.prepare(
        "UPDATE MonthlyOverheadCosts SET is_deleted = 1, updated_at = datetime('now') WHERE cost_type_id = ?"
      ).bind(id),
      env.DATABASE.prepare(
        "DELETE FROM OverheadCostTypes WHERE cost_type_id = ?"
      ).bind(id)
    ]);
    
    // 清除相關快取
    await deleteKVCacheByPrefix(env, 'costs_').catch(() => {});
    
    return successResponse({ id }, "已刪除", requestId);
  } catch (err) {
    console.error(`[Cost Types] Error deleting cost type ${id}:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "刪除失敗", null, requestId);
  }
}
