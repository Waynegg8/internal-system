/**
 * 收据作废处理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { invalidateCacheByDataType, extractYearFromDate } from "../../utils/cache-invalidation.js";

/**
 * 作废收据
 */
export async function handleCancelReceipt(request, env, ctx, requestId, match, url) {
  const receiptId = match[1];

  try {
    let body;
    try {
      body = await request.json();
    } catch (_) {
      body = {};
    }

    const cancellationReason = body.cancellation_reason || '';

    // 检查收据是否存在，並獲取日期信息用於失效快取
    const receipt = await env.DATABASE.prepare(`
      SELECT receipt_id, status, receipt_date, service_start_month FROM Receipts WHERE receipt_id = ? AND is_deleted = 0
    `).bind(receiptId).first();

    if (!receipt) {
      return errorResponse(404, "NOT_FOUND", "收據不存在", null, requestId);
    }

    // 标记为作废（软删除+状态改为cancelled）
    const now = new Date().toISOString();
    const userId = ctx?.user?.user_id || 1;

    await env.DATABASE.prepare(`
      UPDATE Receipts
      SET status = 'cancelled', is_deleted = 1, notes = CASE
        WHEN notes IS NOT NULL AND notes != '' THEN notes || '\n\n[作廢原因] ' || ?
        ELSE '[作廢原因] ' || ?
      END, updated_at = ?
      WHERE receipt_id = ?
    `).bind(cancellationReason, cancellationReason, now, receiptId).run();

    // 記錄付款記錄為「已作廢收據的付款」
    await env.DATABASE.prepare(`
      UPDATE Payments
      SET notes = CASE
        WHEN notes IS NOT NULL AND notes != '' THEN notes || ' (已作廢收據的付款)'
        ELSE '已作廢收據的付款'
      END, updated_at = ?
      WHERE receipt_id = ? AND is_deleted = 0
    `).bind(now, receiptId).run();

    // 記錄編輯歷史
    try {
      await env.DATABASE.prepare(
        `INSERT INTO ReceiptEditHistory (receipt_id, field_name, old_value, new_value, modified_by, modified_at)
         VALUES (?, 'status', ?, 'cancelled', ?, ?)`
      ).bind(
        receiptId,
        JSON.stringify(receipt.status),
        userId,
        now
      ).run();
    } catch (err) {
      console.warn(`[CancelReceipt] 無法記錄編輯歷史:`, err);
    }

    // 失效相關年度報表快取
    const years = new Set();
    if (receipt.receipt_date) {
      const year = extractYearFromDate(receipt.receipt_date);
      if (year) years.add(year);
    }
    if (receipt.service_start_month) {
      const year = extractYearFromDate(receipt.service_start_month);
      if (year) years.add(year);
    }
    
    for (const year of years) {
      await invalidateCacheByDataType(env, "receipts", year).catch((err) => {
        console.warn("[CancelReceipt] 失效快取失敗:", err);
      });
    }

    return successResponse({ receipt_id: receiptId, status: 'cancelled' }, "已作廢", requestId);
  } catch (err) {
    console.error(`[Receipts] Cancel receipt error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}










