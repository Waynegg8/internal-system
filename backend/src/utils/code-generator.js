/**
 * 代碼自動生成工具
 * 從中文名稱自動生成英文代碼，使用者無需輸入
 */

/**
 * 從中文名稱生成代碼
 * @param {string} name - 中文名稱
 * @param {string} prefix - 代碼前綴（可選）
 * @param {number} maxLength - 最大長度（預設20）
 * @returns {string} 生成的代碼
 */
export function generateCodeFromName(name, prefix = '', maxLength = 20) {
  if (!name || typeof name !== 'string') {
    return prefix ? `${prefix}_${generateRandomSuffix()}` : generateRandomSuffix();
  }
  
  // 移除所有非字母數字字符，轉換為大寫
  let code = name
    .toUpperCase()
    .replace(/[^A-Z0-9\u4e00-\u9fa5]/g, '') // 保留中文、字母、數字
    .replace(/[\u4e00-\u9fa5]/g, '') // 移除中文
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  // 如果轉換後為空，使用隨機字串
  if (!code) {
    code = generateRandomSuffix();
  }
  
  // 添加前綴
  if (prefix) {
    code = `${prefix}_${code}`;
  }
  
  // 限制長度
  if (code.length > maxLength) {
    code = code.slice(0, maxLength);
  }
  
  return code;
}

/**
 * 生成隨機後綴（用於確保唯一性）
 * @param {number} length - 後綴長度（預設4）
 * @returns {string} 隨機字串
 */
function generateRandomSuffix(length = 4) {
  return Math.random()
    .toString(36)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, length)
    .padEnd(length, '0');
}

/**
 * 生成唯一代碼（帶重試機制）
 * @param {Object} env - Cloudflare環境
 * @param {string} tableName - 表名
 * @param {string} codeColumn - 代碼欄位名
 * @param {string} name - 中文名稱
 * @param {string} prefix - 代碼前綴（可選）
 * @param {number} maxRetries - 最大重試次數（預設10）
 * @returns {Promise<string>} 唯一的代碼
 */
export async function generateUniqueCode(env, tableName, codeColumn, name, prefix = '', maxRetries = 10) {
  let baseCode = generateCodeFromName(name, prefix);
  let code = baseCode;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    // 檢查代碼是否已存在
    const existing = await env.DATABASE.prepare(
      `SELECT ${codeColumn} FROM ${tableName} WHERE ${codeColumn} = ?`
    ).bind(code).first();
    
    if (!existing) {
      return code; // 代碼唯一，返回
    }
    
    // 代碼已存在，生成新的
    attempt++;
    const suffix = attempt > 1 ? `_${attempt}` : `_${generateRandomSuffix()}`;
    const maxBaseLen = Math.max(1, 20 - suffix.length - (prefix ? prefix.length + 1 : 0));
    code = prefix 
      ? `${prefix}_${baseCode.slice(0, maxBaseLen)}${suffix}`.slice(0, 20)
      : `${baseCode.slice(0, maxBaseLen)}${suffix}`.slice(0, 20);
  }
  
  // 如果所有嘗試都失敗，使用時間戳
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  return prefix 
    ? `${prefix}_${timestamp}`.slice(0, 20)
    : timestamp.slice(0, 20);
}

/**
 * 從中文名稱生成服務代碼
 */
export async function generateServiceCode(env, serviceName) {
  return await generateUniqueCode(env, 'Services', 'service_code', serviceName, 'SVC');
}

/**
 * 從中文名稱生成服務子項代碼
 */
export async function generateServiceItemCode(env, itemName, serviceId = null) {
  const prefix = serviceId ? `ITEM_${serviceId}` : 'ITEM';
  return await generateUniqueCode(env, 'ServiceItems', 'item_code', itemName, prefix);
}

/**
 * 從中文名稱生成薪資項目代碼
 */
export async function generateSalaryItemCode(env, itemName) {
  return await generateUniqueCode(env, 'SalaryItemTypes', 'item_code', itemName, 'SAL');
}

/**
 * 從中文名稱生成成本類型代碼
 */
export async function generateCostTypeCode(env, costName) {
  return await generateUniqueCode(env, 'OverheadCostTypes', 'cost_code', costName, 'COST');
}
