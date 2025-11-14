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
 * 生成下一个个人客户ID
 */
export async function generateNextPersonalClientId(env) {
  const result = await env.DATABASE.prepare(
    `SELECT client_id FROM Clients 
     WHERE client_id LIKE '00%' AND is_deleted = 0 
     ORDER BY client_id DESC LIMIT 1`
  ).first();
  
  let startNum = result?.client_id ? parseInt(result.client_id) + 1 : 1;
  let nextId;
  let found = false;
  let attempts = 0;
  
  while (!found && attempts < 100) {
    nextId = String(startNum).padStart(8, '0');
    const exists = await env.DATABASE.prepare(
      `SELECT 1 FROM Clients WHERE client_id = ? LIMIT 1`
    ).bind(nextId).first();
    
    if (!exists && !isValidTaxId(nextId)) {
      found = true;
      break;
    }
    startNum++;
    attempts++;
  }
  
  if (!found) {
    const timestamp = Date.now().toString().slice(-6);
    nextId = '00' + timestamp;
    if (isValidTaxId(nextId)) {
      nextId = String(parseInt(nextId) + 1).padStart(8, '0');
    }
  }
  
  return nextId;
}





