/**
 * 收据管理主入口
 * 模块化路由到各个处理器
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetReceipts, handleGetReceiptDetail, handleCreateReceipt, handleUpdateReceipt, handleDeleteReceipt } from "./receipt-crud.js";
import { handleGetReceiptReminders, handleGetSuggestAmount, handlePostponeReminder } from "./receipt-utils.js";
import { handleGetReceiptPayments, handleCreateReceiptPayment, handleUpdateReceiptPayment, handleDeleteReceiptPayment } from "./receipt-payments.js";
import { handleCancelReceipt } from "./receipt-cancel.js";

export async function handleReceipts(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/receipts/reminders - 获取应开收据提醒
    if (method === "GET" && path === '/api/v2/receipts/reminders') {
      return await handleGetReceiptReminders(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/receipts/reminders/postpone - 暂缓开票提醒
    if (method === "POST" && path === '/api/v2/receipts/reminders/postpone') {
      return await handlePostponeReminder(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/receipts/suggest-amount - 建议金额
    if (method === "GET" && path === '/api/v2/receipts/suggest-amount') {
      return await handleGetSuggestAmount(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/receipts/:id/cancel - 作废收据
    if (method === "POST" && path.endsWith('/cancel') && match && match[1]) {
      return await handleCancelReceipt(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/receipts/:id/payments - 获取收款记录
    if (method === "GET" && path.endsWith('/payments') && match && match[1]) {
      return await handleGetReceiptPayments(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/receipts/:id/payments - 创建收款记录
    if (method === "POST" && path.endsWith('/payments') && match && match[1] && !match[2]) {
      return await handleCreateReceiptPayment(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/receipts/:id/payments/:paymentId - 更新收款记录
    if (method === "PUT" && path.match(/^\/api\/v2\/receipts\/(\d+)\/payments\/(\d+)$/)) {
      return await handleUpdateReceiptPayment(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/receipts/:id/payments/:paymentId - 删除收款记录
    if (method === "DELETE" && path.match(/^\/api\/v2\/receipts\/(\d+)\/payments\/(\d+)$/)) {
      return await handleDeleteReceiptPayment(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/receipts - 收据列表
    if (method === "GET" && path === '/api/v2/receipts') {
      return await handleGetReceipts(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/receipts/:id - 收据详情
    if (method === "GET" && match && match[1] && !path.endsWith('/payments')) {
      return await handleGetReceiptDetail(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/receipts - 创建收据
    if (method === "POST" && path === '/api/v2/receipts') {
      return await handleCreateReceipt(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/receipts/:id - 更新收据
    if (method === "PUT" && match && match[1] && !path.endsWith('/payments')) {
      return await handleUpdateReceipt(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/receipts/:id - 删除收据
    if (method === "DELETE" && match && match[1]) {
      return await handleDeleteReceipt(request, env, ctx, requestId, match, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Receipts] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

