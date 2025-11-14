/**
 * 系统设置管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";

const ALLOWED_KEYS = new Set([
  "company_name",
  "contact_email",
  "timezone",
  "currency",
  "timesheet_min_unit",
  "soft_delete_enabled",
  "workday_start",
  "workday_end",
  "report_locale",
  "rule_comp_hours_expiry",
  "attendance_bonus_amount",
  "overhead_cost_per_hour",
  "target_profit_margin",
]);

/**
 * 获取系统设置
 */
export async function handleGetSystemSettings(request, env, ctx, requestId, url) {
  const category = url.searchParams.get("category") || null;
  
  let query = `SELECT setting_key AS settingKey, setting_value AS settingValue, 
                      is_dangerous AS isDangerous, description, 
                      updated_at AS updatedAt, updated_by AS updatedBy 
               FROM Settings`;
  const binds = [];
  
  if (category) {
    query += " WHERE setting_key LIKE ?";
    binds.push(`${category}_%`);
  }
  
  query += " ORDER BY setting_key";
  
  const stmt = binds.length > 0 ? env.DATABASE.prepare(query).bind(...binds) : env.DATABASE.prepare(query);
  const rows = await stmt.all();
  
  const map = {};
  for (const r of (rows?.results || [])) {
    map[r.settingKey] = r.settingValue;
  }
  
  return successResponse({
    settings: rows?.results || [],
    map
  }, "成功", requestId);
}

/**
 * 更新系统设置
 */
export async function handleUpdateSystemSettings(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const body = await request.json();
  const settings = body?.settings || {};
  
  const nowIso = new Date().toISOString();
  const userId = String(user.user_id);
  
  for (const [key, value] of Object.entries(settings)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    
    // 验证值
    if (key === "contact_email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return errorResponse(422, "VALIDATION_ERROR", `Email 格式錯誤: ${key}`, null, requestId);
    }
    if (key === "timesheet_min_unit") {
      const n = parseFloat(value);
      if (!Number.isFinite(n) || (n !== 0.25 && n !== 0.5 && n !== 1)) {
        return errorResponse(422, "VALIDATION_ERROR", "工時最小單位僅允許 0.25/0.5/1", null, requestId);
      }
    }
    if (key === "workday_start" || key === "workday_end") {
      if (!/^\d{2}:\d{2}$/.test(value)) {
        return errorResponse(422, "VALIDATION_ERROR", "時間格式需為 HH:MM", null, requestId);
      }
    }
    
    await env.DATABASE.prepare(
      `INSERT INTO Settings(setting_key, setting_value, updated_at, updated_by) 
       VALUES(?, ?, ?, ?) 
       ON CONFLICT(setting_key) 
       DO UPDATE SET setting_value=excluded.setting_value, updated_at=excluded.updated_at, updated_by=excluded.updated_by`
    ).bind(key, String(value || ""), nowIso, userId).run();
  }
  
  return successResponse({ updated: Object.keys(settings).length }, "已更新", requestId);
}





