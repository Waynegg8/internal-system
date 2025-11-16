/**
 * 系统设置工具函数
 */

/**
 * 从 Settings 表读取单个设定值
 */
export async function getSettingValue(env, settingKey, defaultValue) {
  try {
    if (!env.DATABASE) return defaultValue;
    
    const setting = await env.DATABASE.prepare(
      `SELECT setting_value FROM Settings WHERE setting_key = ?`
    ).bind(settingKey).first();
    
    if (!setting) return defaultValue;
    
    const value = setting.setting_value;
    
    // 尝试转换为数字
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) return numValue;
    
    return value;
  } catch (error) {
    console.error(`[getSettingValue] Error reading ${settingKey}:`, error);
    return defaultValue;
  }
}

/**
 * 从 PayrollSettings 表读取薪资设定值（如果存在）
 */
export async function getPayrollSettingValue(env, settingKey, defaultValue) {
  try {
    if (!env.DATABASE) return defaultValue;
    
    const setting = await env.DATABASE.prepare(
      `SELECT setting_value FROM PayrollSettings WHERE setting_key = ?`
    ).bind(settingKey).first();
    
    if (!setting) return defaultValue;
    
    const value = setting.setting_value;
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) return numValue;
    
    return value;
  } catch (error) {
    // 如果 PayrollSettings 表不存在，回退到 Settings 表
    return getSettingValue(env, settingKey, defaultValue);
  }
}






