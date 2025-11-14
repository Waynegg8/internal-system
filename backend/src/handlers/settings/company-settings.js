/**
 * 公司資料設定管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 獲取公司資料
 */
export async function handleGetCompanySettings(request, env, ctx, requestId, match, url) {
  const setNumber = match[1]; // 從路由參數獲取
  const category = `company${setNumber}`;
  
  const query = `SELECT setting_key AS settingKey, setting_value AS settingValue, 
                        description, updated_at AS updatedAt, updated_by AS updatedBy 
                 FROM Settings 
                 WHERE setting_key LIKE ? 
                 ORDER BY setting_key`;
  
  const stmt = env.DATABASE.prepare(query).bind(`${category}_%`);
  const rows = await stmt.all();
  
  return successResponse(rows?.results || [], "成功", requestId);
}

/**
 * 保存公司資料（批量）
 */
export async function handleSaveCompanySettings(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const setNumber = match[1]; // 從路由參數獲取
  const body = await request.json();
  const settings = body?.settings || [];
  
  if (!Array.isArray(settings)) {
    return errorResponse(422, "VALIDATION_ERROR", "參數格式錯誤", null, requestId);
  }
  
  const category = `company${setNumber}`;
  const nowIso = new Date().toISOString();
  const userId = String(user.user_id);
  
  // 批量插入或更新
  for (const setting of settings) {
    const { settingKey, settingValue } = setting;
    if (!settingKey) continue;
    
    // 驗證 key 必須屬於當前 category
    if (!settingKey.startsWith(`${category}_`)) {
      continue;
    }
    
    // 為每個 setting 生成描述
    const description = `${category} - ${settingKey}`;
    
    await env.DATABASE.prepare(
      `INSERT INTO Settings(setting_key, setting_value, description, updated_at, updated_by) 
       VALUES(?, ?, ?, ?, ?) 
       ON CONFLICT(setting_key) 
       DO UPDATE SET setting_value=excluded.setting_value, description=excluded.description, 
                     updated_at=excluded.updated_at, updated_by=excluded.updated_by`
    ).bind(settingKey, settingValue || "", description, nowIso, userId).run();
  }
  
  return successResponse({ updated: settings.length }, "保存成功", requestId);
}





