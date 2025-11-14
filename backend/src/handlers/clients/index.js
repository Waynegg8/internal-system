/**
 * 客户管理主入口
 * 模块化路由到各个处理器
 */

import { errorResponse } from "../../utils/response.js";
import { handleClientList, handleClientDetail, handleCreateClient, handleUpdateClient, handleDeleteClient } from "./client-crud.js";
import { handleClientServices, handleServiceItems, handleCreateClientService, handleUpdateClientService, handleDeleteClientService } from "./client-services.js";
import { handleUpdateClientTags } from "./client-tags.js";
import { handleGetNextPersonalClientId, handleBatchAssign } from "./client-utils.js";
import { handleGetCollaborators, handleAddCollaborator, handleRemoveCollaborator } from "./client-collaborators.js";

export async function handleClients(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/clients/:clientId/services/:serviceId/items
    if (method === "GET" && match && match[0].includes('/services/') && path.endsWith('/items')) {
      return await handleServiceItems(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/clients/:clientId/services/:serviceId
    if (method === "PUT" && path.includes('/services/') && match && match[2]) {
      return await handleUpdateClientService(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/clients/:clientId/services/:serviceId
    if (method === "DELETE" && path.includes('/services/') && match && match[2]) {
      return await handleDeleteClientService(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/clients/:clientId/services
    if (method === "GET" && path.endsWith('/services') && !path.endsWith('/items')) {
      return await handleClientServices(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/clients/:clientId/services
    if (method === "POST" && path.endsWith('/services') && !path.endsWith('/items')) {
      return await handleCreateClientService(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/clients/next-personal-id
    if (method === "GET" && path.endsWith('/next-personal-id')) {
      return await handleGetNextPersonalClientId(request, env, ctx, requestId, url);
    }
    
    // 協作人員相關路由（需要在客戶詳情之前檢查）
    // GET /api/v2/clients/:clientId/collaborators - 獲取協作人員列表
    if (method === "GET" && path.endsWith('/collaborators') && match && match[1]) {
      return await handleGetCollaborators(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/clients/:clientId/collaborators - 添加協作人員
    if (method === "POST" && path.endsWith('/collaborators') && match && match[1]) {
      return await handleAddCollaborator(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/clients/:clientId/collaborators/:collaborationId - 移除協作人員
    if (method === "DELETE" && path.includes('/collaborators/') && match && match[1] && match[2]) {
      return await handleRemoveCollaborator(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/clients/:id - 客户详情（需要在協作人員之後檢查）
    if (method === "GET" && match && match[1] && !path.includes('/services') && !path.includes('/tags') && !path.includes('/collaborators')) {
      return await handleClientDetail(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/clients - 客户列表
    if (method === "GET" && path === '/api/v2/clients') {
      return await handleClientList(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/clients - 创建客户
    if (method === "POST" && path === '/api/v2/clients') {
      return await handleCreateClient(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/clients/:id - 更新客户
    if (method === "PUT" && match && match[1] && !path.endsWith('/tags') && !path.includes('/collaborators')) {
      return await handleUpdateClient(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/clients/:id - 删除客户
    if (method === "DELETE" && match && match[1] && !path.includes('/collaborators')) {
      return await handleDeleteClient(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/clients/:id/tags - 更新客户标签
    if (method === "PUT" && path.endsWith('/tags') && match && match[1]) {
      return await handleUpdateClientTags(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/clients/batch-assign - 批量分配负责人
    if (method === "POST" && path === '/api/v2/clients/batch-assign') {
      return await handleBatchAssign(request, env, ctx, requestId, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Clients] Error:`, err);
    const errorMessage = err?.message || String(err);
    const errorStack = err?.stack || '';
    // 在开发环境返回详细错误信息
    const errorDetail = env.APP_ENV && env.APP_ENV !== "prod" ? { error: errorMessage, stack: errorStack } : null;
    return errorResponse(500, "INTERNAL_ERROR", `伺服器錯誤: ${errorMessage}`, errorDetail, requestId);
  }
}

