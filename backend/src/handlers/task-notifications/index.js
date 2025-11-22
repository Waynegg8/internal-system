/**
 * 任務通知主入口
 * 模組化路由到各個處理器
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetNotifications, handleMarkNotificationAsRead } from "./notification-crud.js";

export async function handleNotifications(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/notifications - 獲取通知列表
    if (method === "GET" && path === "/api/v2/notifications") {
      return await handleGetNotifications(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/notifications/:id/read - 標記通知為已讀（單個）
    if (method === "PUT" && path.match(/^\/api\/v2\/notifications\/(\d+)\/read$/)) {
      return await handleMarkNotificationAsRead(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/notifications/read - 標記通知為已讀（批量）
    if (method === "PUT" && path === "/api/v2/notifications/read") {
      return await handleMarkNotificationAsRead(request, env, ctx, requestId, match, url);
    }
    
    // 未匹配的路由
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
  } catch (error) {
    console.error("[Notifications] 處理請求失敗:", error);
    return errorResponse(500, "INTERNAL_ERROR", `處理失敗: ${error.message || String(error)}`, null, requestId);
  }
}



