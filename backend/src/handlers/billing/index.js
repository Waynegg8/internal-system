/**
 * 账单管理主入口
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetServiceBilling, handleCreateBilling, handleUpdateBilling, handleBatchDeleteBilling } from "./billing-crud.js";

export async function handleBilling(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/billing/service/:serviceId - 获取服务的收费明细
    if (method === "GET" && path.match(/^\/api\/v2\/billing\/service\/(\d+)$/)) {
      return await handleGetServiceBilling(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/billing - 新增收费明细
    if (method === "POST" && path === '/api/v2/billing') {
      return await handleCreateBilling(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/billing/:id - 更新收费明细
    if (method === "PUT" && match && match[1]) {
      return await handleUpdateBilling(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/billing/batch - 批量删除收费明细
    if (method === "DELETE" && path === '/api/v2/billing/batch') {
      return await handleBatchDeleteBilling(request, env, ctx, requestId, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Billing] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}










