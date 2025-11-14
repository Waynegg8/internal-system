/**
 * 请假管理主入口
 * 模块化路由到各个处理器
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetLeaveBalances } from "./leave-balances.js";
import { handleGetLeaves, handleCreateLeave, handleUpdateLeave, handleDeleteLeave } from "./leave-crud.js";
import { handleGetLifeEvents, handleCreateLifeEvent, handleDeleteLifeEvent } from "./leave-life-events.js";
import { handleRecalculateLeaveBalances } from "./leave-recalculate.js";

export async function handleLeaves(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/leaves/balances - 获取假期余额
    if (method === "GET" && path === '/api/v2/leaves/balances') {
      return await handleGetLeaveBalances(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/leaves/life-events - 获取生活事件列表
    if (method === "GET" && path === '/api/v2/leaves/life-events') {
      return await handleGetLifeEvents(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/leaves/life-events - 创建生活事件
    if (method === "POST" && path === '/api/v2/leaves/life-events') {
      return await handleCreateLifeEvent(request, env, ctx, requestId, url);
    }
    
    // DELETE /api/v2/leaves/life-events/:id - 删除生活事件
    if (method === "DELETE" && path.startsWith('/api/v2/leaves/life-events/') && match && match[1]) {
      return await handleDeleteLifeEvent(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/leaves/recalculate-balances/:userId - 重新计算假期余额
    if (method === "POST" && path.startsWith('/api/v2/leaves/recalculate-balances/') && match && match[1]) {
      return await handleRecalculateLeaveBalances(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/leaves - 请假列表
    if (method === "GET" && path === '/api/v2/leaves') {
      return await handleGetLeaves(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/leaves - 创建请假申请
    if (method === "POST" && path === '/api/v2/leaves') {
      return await handleCreateLeave(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/leaves/:id - 更新请假记录
    if (method === "PUT" && match && match[1] && !path.includes('/life-events') && !path.includes('/recalculate-balances')) {
      return await handleUpdateLeave(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/leaves/:id - 删除请假记录
    if (method === "DELETE" && match && match[1] && !path.includes('/life-events') && !path.includes('/recalculate-balances')) {
      return await handleDeleteLeave(request, env, ctx, requestId, match, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Leaves] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

