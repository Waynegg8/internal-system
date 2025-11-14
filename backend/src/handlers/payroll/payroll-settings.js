/**
 * 薪资设置管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取薪资设置
 */
export async function handleGetPayrollSettings(request, env, ctx, requestId, url) {
  const settingsRows = await env.DATABASE.prepare(`
    SELECT setting_key, setting_value, setting_type, category, display_name, description
    FROM PayrollSettings
    ORDER BY category, setting_id
  `).all().catch(() => ({ results: [] }));
  
  const settingsData = (settingsRows.results || []).map(s => ({
    settingKey: s.setting_key,
    settingValue: s.setting_value,
    settingType: s.setting_type,
    category: s.category,
    displayName: s.display_name,
    description: s.description
  }));
  
  // 按类别分组
  const grouped = {
    meal: settingsData.filter(s => s.category === 'meal'),
    transport: settingsData.filter(s => s.category === 'transport'),
    leave: settingsData.filter(s => s.category === 'leave'),
    general: settingsData.filter(s => s.category === 'general')
  };
  
  // 如果没有数据，返回默认值
  if (settingsData.length === 0) {
    return successResponse({
      settings: [],
      grouped: {
        meal: [],
        transport: [],
        leave: [],
        general: []
      }
    }, "查詢成功", requestId);
  }
  
  return successResponse({ settings: settingsData, grouped }, "查詢成功", requestId);
}

/**
 * 更新薪资设置
 */
export async function handleUpdatePayrollSettings(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const body = await request.json();
  const settings = body?.settings || [];
  
  if (!Array.isArray(settings)) {
    return errorResponse(400, "BAD_REQUEST", "設定數據格式錯誤", null, requestId);
  }
  
  for (const setting of settings) {
    // 支持多種命名格式
    const settingKey = setting.setting_key || setting.settingKey;
    const settingValue = setting.setting_value !== undefined ? setting.setting_value : setting.settingValue;
    
    if (!settingKey || settingValue === undefined) continue;
    
    await env.DATABASE.prepare(`
      UPDATE PayrollSettings 
      SET setting_value = ?, updated_by = ?, updated_at = datetime('now')
      WHERE setting_key = ?
    `).bind(String(settingValue), user?.userId || user?.user_id || 1, settingKey).run().catch((err) => {
      console.error('[Payroll Settings] Update error:', err);
    });
  }
  
  try {
    const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
    const users = await env.DATABASE.prepare(
      `SELECT user_id FROM Users WHERE is_deleted = 0`
    ).all();
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const triggerDate = `${currentMonthStr}-01`;
    for (const row of users.results || []) {
      triggerPayrollRecalculation(env, row.user_id, triggerDate, ctx, "settings").catch(() => {});
    }
  } catch (err) {
    console.error("[Payroll Settings] 觸發薪資重新計算失敗:", err);
  }
  
  return successResponse({ updated: settings.length }, "已更新", requestId);
}

