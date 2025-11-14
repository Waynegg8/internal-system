/**
 * 客戶協作管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";

/**
 * 獲取客戶的協作人員列表
 */
export async function handleGetCollaborators(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const user = ctx?.user;

  // 檢查客戶是否存在
  const client = await env.DATABASE.prepare(
    `SELECT client_id, assignee_user_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
  ).bind(clientId).first();

  if (!client) {
    return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
  }

  // 權限檢查：只有管理員或客戶負責人可以查看協作人員
  if (!user.is_admin && String(client.assignee_user_id) !== String(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限查看此客戶的協作人員", null, requestId);
  }

  const cacheKey = generateCacheKey('client_collaborators', { clientId });
  const kvCached = await getKVCache(env, cacheKey);

  if (kvCached?.data) {
    return successResponse(kvCached.data, "查詢成功（KV缓存）", requestId);
  }

  const rows = await env.DATABASE.prepare(
    `SELECT cc.collaboration_id, cc.user_id, cc.created_at, cc.created_by,
            u.name as user_name, u.email,
            creator.name as created_by_name
     FROM ClientCollaborators cc
     LEFT JOIN Users u ON u.user_id = cc.user_id
     LEFT JOIN Users creator ON creator.user_id = cc.created_by
     WHERE cc.client_id = ?
     ORDER BY cc.created_at DESC`
  ).bind(clientId).all();

  const data = (rows?.results || []).map(r => ({
    collaboration_id: r.collaboration_id,
    user_id: r.user_id,
    user_name: r.user_name || '',
    email: r.email || '',
    created_at: r.created_at,
    created_by: r.created_by,
    created_by_name: r.created_by_name || ''
  }));

  await saveKVCache(env, cacheKey, 'client_collaborators', data, { ttl: 3600 }).catch(() => {});

  return successResponse(data, "查詢成功", requestId);
}

/**
 * 添加協作人員
 */
export async function handleAddCollaborator(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const user = ctx?.user;
  const body = await request.json();
  const userId = parseInt(body?.user_id || 0);

  if (!userId || userId <= 0) {
    return errorResponse(422, "VALIDATION_ERROR", "請選擇員工", null, requestId);
  }

  // 檢查客戶是否存在
  const client = await env.DATABASE.prepare(
    `SELECT client_id, assignee_user_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
  ).bind(clientId).first();

  if (!client) {
    return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
  }

  // 權限檢查：只有管理員或客戶負責人可以添加協作人員
  if (!user.is_admin && String(client.assignee_user_id) !== String(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限管理此客戶的協作人員", null, requestId);
  }

  // 不能添加自己（自己已經是負責人）
  if (String(userId) === String(client.assignee_user_id)) {
    return errorResponse(422, "VALIDATION_ERROR", "負責人無需添加為協作人員", null, requestId);
  }

  // 檢查員工是否存在
  const targetUser = await env.DATABASE.prepare(
    `SELECT user_id FROM Users WHERE user_id = ? AND is_deleted = 0`
  ).bind(userId).first();

  if (!targetUser) {
    return errorResponse(404, "NOT_FOUND", "員工不存在", null, requestId);
  }

  // 檢查是否已經存在
  const existing = await env.DATABASE.prepare(
    `SELECT collaboration_id FROM ClientCollaborators WHERE client_id = ? AND user_id = ?`
  ).bind(clientId, userId).first();

  if (existing) {
    return errorResponse(422, "VALIDATION_ERROR", "該員工已經是協作人員", null, requestId);
  }

  // 添加協作人員
  await env.DATABASE.prepare(
    `INSERT INTO ClientCollaborators (client_id, user_id, created_by)
     VALUES (?, ?, ?)`
  ).bind(clientId, userId, user.user_id).run();

  // 清除相關緩存
  await Promise.all([
    deleteKVCacheByPrefix(env, `client_collaborators:clientId=${clientId}`),
    deleteKVCacheByPrefix(env, 'clients_list'),
    invalidateD1CacheByType(env, 'clients_list')
  ]).catch(() => {});

  return successResponse({ user_id: userId }, "已添加協作人員", requestId);
}

/**
 * 移除協作人員
 */
export async function handleRemoveCollaborator(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const collaborationId = parseInt(match[2] || 0);
  const user = ctx?.user;

  if (!collaborationId || collaborationId <= 0) {
    return errorResponse(422, "VALIDATION_ERROR", "無效的協作記錄ID", null, requestId);
  }

  // 檢查協作記錄是否存在
  const collaboration = await env.DATABASE.prepare(
    `SELECT cc.collaboration_id, cc.client_id, cc.user_id, c.assignee_user_id
     FROM ClientCollaborators cc
     LEFT JOIN Clients c ON c.client_id = cc.client_id
     WHERE cc.collaboration_id = ? AND c.is_deleted = 0`
  ).bind(collaborationId).first();

  if (!collaboration || collaboration.client_id !== clientId) {
    return errorResponse(404, "NOT_FOUND", "協作記錄不存在", null, requestId);
  }

  // 權限檢查：只有管理員或客戶負責人可以移除協作人員
  if (!user.is_admin && String(collaboration.assignee_user_id) !== String(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限移除此協作人員", null, requestId);
  }

  // 移除協作人員
  await env.DATABASE.prepare(
    `DELETE FROM ClientCollaborators WHERE collaboration_id = ?`
  ).bind(collaborationId).run();

  // 清除相關緩存
  await Promise.all([
    deleteKVCacheByPrefix(env, `client_collaborators:clientId=${clientId}`),
    deleteKVCacheByPrefix(env, 'clients_list'),
    invalidateD1CacheByType(env, 'clients_list')
  ]).catch(() => {});

  return successResponse({ collaboration_id: collaborationId }, "已移除協作人員", requestId);
}

