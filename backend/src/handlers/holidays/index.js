/**
 * 假日管理主入口
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetHolidays, handleCreateHoliday, handleUpdateHoliday, handleDeleteHoliday } from "./holiday-crud.js";

export async function handleHolidays(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/holidays 或 /api/v2/settings/holidays - 查询假日数据
    if (method === "GET" && (path === '/api/v2/holidays' || path === '/api/v2/settings/holidays')) {
      return await handleGetHolidays(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/holidays 或 /api/v2/settings/holidays - 新增假日（支持单笔和批量）
    if (method === "POST" && (path === '/api/v2/holidays' || path === '/api/v2/settings/holidays')) {
      return await handleCreateHoliday(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/settings/holidays/batch - 批量新增假日
    if (method === "POST" && path === '/api/v2/settings/holidays/batch') {
      return await handleCreateHoliday(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/holidays/:date 或 /api/v2/settings/holidays/:date - 更新假日
    if (method === "PUT" && match && match[1] && (path.startsWith('/api/v2/holidays/') || path.startsWith('/api/v2/settings/holidays/'))) {
      return await handleUpdateHoliday(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/holidays/:date 或 /api/v2/settings/holidays/:date - 删除假日
    if (method === "DELETE" && match && match[1] && (path.startsWith('/api/v2/holidays/') || path.startsWith('/api/v2/settings/holidays/'))) {
      return await handleDeleteHoliday(request, env, ctx, requestId, match, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Holidays] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

