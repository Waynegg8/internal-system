/**
 * 任務配置主入口
 */

import { errorResponse } from "../../utils/response.js";
import { 
  handleGetTaskConfigs, 
  handleCreateTaskConfig, 
  handleUpdateTaskConfig, 
  handleDeleteTaskConfig,
  handleBatchSaveTaskConfigs
} from "./task-config-crud.js";

/**
 * 批量保存的專用 handler（直接調用，無需路徑匹配）
 */
export async function handleBatchSaveTaskConfigsDirect(request, env, ctx, requestId, match, url) {
  return await handleBatchSaveTaskConfigs(request, env, ctx, requestId, match, url);
}

export async function handleTaskConfigs(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // POST /api/v2/clients/:clientId/services/:serviceId/task-configs/batch
    if (method === "POST" && path.endsWith('/batch')) {
      console.log('[handleTaskConfigs] 匹配到 batch 路由');
      return await handleBatchSaveTaskConfigs(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/clients/:clientId/services/:serviceId/task-configs
    if (method === "GET") {
      return await handleGetTaskConfigs(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/clients/:clientId/services/:serviceId/task-configs（排除 /batch）
    if (method === "POST" && !path.endsWith('/batch')) {
      return await handleCreateTaskConfig(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/clients/:clientId/services/:serviceId/task-configs/:configId
    if (method === "PUT" && match[3]) {
      return await handleUpdateTaskConfig(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/clients/:clientId/services/:serviceId/task-configs/:configId
    if (method === "DELETE" && match[3]) {
      return await handleDeleteTaskConfig(request, env, ctx, requestId, match, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[TaskConfigs] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

