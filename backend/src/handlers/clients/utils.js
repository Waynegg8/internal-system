/**
 * 客户管理工具函数
 */

/**
 * 台湾统一编号验证
 */
export function isValidTaxId(taxId) {
  if (!taxId || taxId.length !== 8 || !/^\d{8}$/.test(taxId)) {
    return false;
  }
  
  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    let product = parseInt(taxId[i]) * weights[i];
    if (product >= 10) {
      product = Math.floor(product / 10) + (product % 10);
    }
    sum += product;
  }
  
  return sum % 5 === 0;
}

/**
 * 生成下一个个人客户ID（10碼格式）
 * 根據需求：個人客戶編號應該是10碼，以00開頭，後8碼為數字（智能避開合法統編）
 */
export async function generateNextPersonalClientId(env) {
  // 查詢所有以00開頭的10碼客戶編號
  const result = await env.DATABASE.prepare(
    `SELECT client_id FROM Clients 
     WHERE client_id LIKE '00%' AND LENGTH(client_id) = 10 AND is_deleted = 0 
     ORDER BY client_id DESC LIMIT 1`
  ).first();
  
  // 從最後一個編號的後8碼開始，或從00000001開始
  let startNum = 1;
  if (result?.client_id) {
    const last8Digits = result.client_id.substring(2); // 去掉前綴00
    startNum = parseInt(last8Digits) + 1;
  }
  
  let nextId;
  let found = false;
  let attempts = 0;
  
  while (!found && attempts < 1000) {
    // 生成8碼數字
    const eightDigits = String(startNum).padStart(8, '0');
    
    // 檢查是否符合台灣統編驗證規則（如果符合，則跳過）
    if (isValidTaxId(eightDigits)) {
      startNum++;
      attempts++;
      continue;
    }
    
    // 加上00前綴，變成10碼
    nextId = `00${eightDigits}`;
    
    // 檢查是否已存在
    const exists = await env.DATABASE.prepare(
      `SELECT 1 FROM Clients WHERE client_id = ? LIMIT 1`
    ).bind(nextId).first();
    
    if (!exists) {
      found = true;
      break;
    }
    
    startNum++;
    attempts++;
  }
  
  // 如果1000次嘗試都失敗，使用時間戳生成
  if (!found) {
    const timestamp = Date.now().toString().slice(-8);
    nextId = `00${timestamp}`;
    
    // 檢查是否已存在，如果存在則加1
    const exists = await env.DATABASE.prepare(
      `SELECT 1 FROM Clients WHERE client_id = ? LIMIT 1`
    ).bind(nextId).first();
    
    if (exists) {
      const num = parseInt(nextId) + 1;
      nextId = String(num).padStart(10, '0');
    }
  }
  
  return nextId;
}






