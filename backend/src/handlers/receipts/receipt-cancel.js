/**
 * 收据作废处理
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 作废收据
 */
export async function handleCancelReceipt(request, env, ctx, requestId, match, url) {
  const receiptId = match[1];
  
  try {
    // 检查收据是否存在
    const receipt = await env.DATABASE.prepare(`
      SELECT receipt_id, status FROM Receipts WHERE receipt_id = ? AND is_deleted = 0
    `).bind(receiptId).first();
    
    if (!receipt) {
      return errorResponse(404, "NOT_FOUND", "收據不存在", null, requestId);
    }
    
    // 标记为作废（软删除+状态改为cancelled）
    const now = new Date().toISOString();
    await env.DATABASE.prepare(`
      UPDATE Receipts 
      SET status = 'cancelled', is_deleted = 1, updated_at = ? 
      WHERE receipt_id = ?
    `).bind(now, receiptId).run();
    
    return successResponse({ receipt_id: receiptId, status: 'cancelled' }, "已作廢", requestId);
  } catch (err) {
    console.error(`[Receipts] Cancel receipt error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}





