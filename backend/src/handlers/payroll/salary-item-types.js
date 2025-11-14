/**
 * 薪資項目類型管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateSalaryItemCode } from "../../utils/code-generator.js";

const ALLOWED_CATEGORIES = new Set([
  "regular_allowance",
  "irregular_allowance",
  "bonus",
  "year_end_bonus",
  "deduction",
  "allowance" // 舊系統兼容
]);

function normalizeCategory(category) {
  const raw = (category || "").toString();
  if (!ALLOWED_CATEGORIES.has(raw)) {
    return {
      category: "irregular_allowance",
      isRegularPayment: 0,
      isFixed: 0
    };
  }

  switch (raw) {
    case "regular_allowance":
      return { category: "regular_allowance", isRegularPayment: 1, isFixed: 0 };
    case "allowance":
    case "irregular_allowance":
      return { category: "irregular_allowance", isRegularPayment: 0, isFixed: 0 };
    case "bonus":
      return { category: "bonus", isRegularPayment: 0, isFixed: 0 };
    case "year_end_bonus":
      return { category: "year_end_bonus", isRegularPayment: 0, isFixed: 1 };
    case "deduction":
      return { category: "deduction", isRegularPayment: 0, isFixed: 0 };
    default:
      return { category: "irregular_allowance", isRegularPayment: 0, isFixed: 0 };
  }
}

/**
 * 獲取薪資項目類型列表
 */
export async function handleGetSalaryItemTypes(request, env, ctx, requestId, url) {
  let rows;
  try {
    rows = await env.DATABASE.prepare(
      `SELECT item_type_id, item_name, item_code, category, is_regular_payment, description, is_active, display_order
       FROM SalaryItemTypes
       ORDER BY display_order ASC, item_type_id ASC`
    ).all();
  } catch (dbError) {
    console.error('[Salary Item Types] Database query error:', dbError);
    return successResponse({ items: [] }, "查詢成功（空結果）", requestId);
  }
  
  const data = (rows?.results || []).map(r => {
    let category = r.category;
    if (category === "allowance") {
      category = r.is_regular_payment ? "regular_allowance" : "irregular_allowance";
    }
    return {
      item_type_id: r.item_type_id,
      item_name: r.item_name,
      item_code: r.item_code,
      category,
      description: r.description || '',
      is_active: Boolean(r.is_active),
      display_order: r.display_order || 0
    };
  });
  
  return successResponse({ items: data }, "查詢成功", requestId);
}

/**
 * 創建薪資項目類型
 */
export async function handleCreateSalaryItemType(request, env, ctx, requestId, url) {
  const body = await request.json();
  const errors = [];
  
  if (!body.item_name) errors.push({ field: "item_name", message: "必填" });
  if (!body.category) errors.push({ field: "category", message: "必選" });
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 自動生成薪資項目代碼（從中文名稱）
  const itemCode = await generateSalaryItemCode(env, body.item_name);
  const normalized = normalizeCategory(body.category);
  
  const now = new Date().toISOString();
  await env.DATABASE.prepare(
    `INSERT INTO SalaryItemTypes 
     (item_name, item_code, category, is_regular_payment, is_fixed, description, is_active, display_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.item_name,
    itemCode,
    normalized.category,
    normalized.isRegularPayment,
    normalized.isFixed,
    body.description || '',
    body.is_active !== false ? 1 : 0,
    body.display_order !== undefined ? body.display_order : (body.sort_order !== undefined ? body.sort_order : 0),
    now,
    now
  ).run();
  
  const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
  
  return successResponse({ item_type_id: idRow?.id }, "已創建", requestId);
}

/**
 * 更新薪資項目類型
 */
export async function handleUpdateSalaryItemType(request, env, ctx, requestId, match, url) {
  const itemTypeId = match[1];
  const body = await request.json();
  
  const updates = [];
  const binds = [];
  
  if (body.hasOwnProperty('item_name')) {
    updates.push("item_name = ?");
    binds.push(body.item_name);
    
    // 如果名稱改變，自動重新生成代碼
    const existing = await env.DATABASE.prepare(
      `SELECT item_name FROM SalaryItemTypes WHERE item_type_id = ?`
    ).bind(itemTypeId).first();
    
    if (existing && existing.item_name !== body.item_name) {
      const newCode = await generateSalaryItemCode(env, body.item_name);
      updates.push("item_code = ?");
      binds.push(newCode);
    }
  }
  // 移除 item_code 的手動更新，改為自動生成
  if (body.hasOwnProperty('category')) {
    const normalized = normalizeCategory(body.category);
    updates.push("category = ?");
    binds.push(normalized.category);
    updates.push("is_regular_payment = ?");
    binds.push(normalized.isRegularPayment);
    updates.push("is_fixed = ?");
    binds.push(normalized.isFixed);
  }
  if (body.hasOwnProperty('is_active')) {
    updates.push("is_active = ?");
    binds.push(body.is_active ? 1 : 0);
  }
  if (body.hasOwnProperty('display_order') || body.hasOwnProperty('sort_order')) {
    updates.push("display_order = ?");
    const orderValue = body.display_order !== undefined ? body.display_order : body.sort_order;
    binds.push(orderValue);
  }
  if (body.hasOwnProperty('description')) {
    updates.push("description = ?");
    binds.push(body.description || '');
  }
  
  if (updates.length > 0) {
    updates.push("updated_at = ?");
    binds.push(new Date().toISOString());
    
    await env.DATABASE.prepare(
      `UPDATE SalaryItemTypes SET ${updates.join(", ")} WHERE item_type_id = ?`
    ).bind(...binds, itemTypeId).run();
  }
  
  return successResponse({ item_type_id: itemTypeId }, "已更新", requestId);
}

/**
 * 刪除薪資項目類型
 */
export async function handleDeleteSalaryItemType(request, env, ctx, requestId, match, url) {
  const itemTypeId = match[1];
  
  // 檢查項目是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT item_type_id FROM SalaryItemTypes WHERE item_type_id = ?`
  ).bind(itemTypeId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "薪資項目不存在", null, requestId);
  }
  
  // 檢查是否有員工使用此項目
  const usageCheck = await env.DATABASE.prepare(
    `SELECT COUNT(*) as count FROM EmployeeSalaryItems WHERE item_type_id = ?`
  ).bind(itemTypeId).first();
  
  if (usageCheck && usageCheck.count > 0) {
    return errorResponse(409, "CONFLICT", "此薪資項目正在被使用，無法刪除", null, requestId);
  }
  
  // 刪除項目
  await env.DATABASE.prepare(
    `DELETE FROM SalaryItemTypes WHERE item_type_id = ?`
  ).bind(itemTypeId).run();
  
  return successResponse({ item_type_id: itemTypeId }, "已刪除", requestId);
}

/**
 * 切換薪資項目類型啟用狀態
 */
export async function handleToggleSalaryItemType(request, env, ctx, requestId, match, url) {
  const itemTypeId = match[1];
  
  // 獲取當前狀態
  const existing = await env.DATABASE.prepare(
    `SELECT is_active FROM SalaryItemTypes WHERE item_type_id = ?`
  ).bind(itemTypeId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "薪資項目不存在", null, requestId);
  }
  
  // 切換狀態
  const newStatus = existing.is_active ? 0 : 1;
  await env.DATABASE.prepare(
    `UPDATE SalaryItemTypes SET is_active = ?, updated_at = ? WHERE item_type_id = ?`
  ).bind(newStatus, new Date().toISOString(), itemTypeId).run();
  
  return successResponse({ 
    item_type_id: itemTypeId, 
    is_active: Boolean(newStatus) 
  }, newStatus ? "已啟用" : "已停用", requestId);
}
