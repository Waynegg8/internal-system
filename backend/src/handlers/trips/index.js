/**
 * 外出登记主入口
 * 模块化路由到各个处理器
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetTrips, handleGetTripDetail, handleCreateTrip, handleUpdateTrip, handleDeleteTrip } from "./trip-crud.js";
import { handleGetTripSummary } from "./trip-stats.js";

export async function handleTrips(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/trips - 获取外出登记列表
    if (method === "GET" && path === '/api/v2/trips') {
      return await handleGetTrips(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/trips/:id - 获取单条外出登记
    if (method === "GET" && match && match[1]) {
      return await handleGetTripDetail(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/trips - 新增外出登记
    if (method === "POST" && path === '/api/v2/trips') {
      return await handleCreateTrip(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/trips/:id - 更新外出登记
    if (method === "PUT" && match && match[1]) {
      return await handleUpdateTrip(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/trips/:id - 删除外出登记
    if (method === "DELETE" && match && match[1]) {
      return await handleDeleteTrip(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/trips/summary - 获取外出登记统计
    if (method === "GET" && path === '/api/v2/trips/summary') {
      return await handleGetTripSummary(request, env, ctx, requestId, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Trips] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}






