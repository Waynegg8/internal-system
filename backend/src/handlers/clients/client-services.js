/**
 * 客户服务管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, saveD1Cache, deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";

// 注意：CACHE 是舊的 KV namespace 名稱，現在使用 KV_CACHE

/**
 * 获取客户服务列表
 */
export async function handleClientServices(request, env, ctx, requestId, match, url) {
  const clientId = match?.[1] || url.pathname.split('/').slice(-2, -1)[0];
  
  const cacheKey = generateCacheKey('client_services', { clientId });
  const kvCached = await getKVCache(env, cacheKey);
  
  if (kvCached?.data) {
    return successResponse(kvCached.data, "查詢成功（KV缓存）", requestId);
  }
  
  const client = await env.DATABASE.prepare(
    `SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
  ).bind(clientId).first();
  
  if (!client) {
    return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
  }
  
  const clientServices = await env.DATABASE.prepare(
    `SELECT DISTINCT cs.service_id
     FROM ClientServices cs
     WHERE cs.client_id = ? AND cs.is_deleted = 0 AND cs.service_id IS NOT NULL`
  ).bind(clientId).all();
  
  let services;
  if (clientServices.results?.length > 0) {
    const serviceIds = clientServices.results.map(r => r.service_id);
    const placeholders = serviceIds.map(() => '?').join(',');
    services = await env.DATABASE.prepare(
      `SELECT service_id, service_name, service_code, description
       FROM Services
       WHERE service_id IN (${placeholders}) AND is_active = 1
       ORDER BY sort_order ASC, service_id ASC`
    ).bind(...serviceIds).all();
  } else {
    services = await env.DATABASE.prepare(
      `SELECT service_id, service_name, service_code, description
       FROM Services
       WHERE is_active = 1
       ORDER BY sort_order ASC, service_id ASC`
    ).all();
  }
  
  const data = services.results?.map(service => ({
    service_id: service.service_id,
    service_name: service.service_name,
    service_code: service.service_code,
    description: service.description || ""
  })) || [];
  
  await Promise.all([
    saveKVCache(env, cacheKey, 'client_services', data, { ttl: 3600 }),
    saveD1Cache(env, cacheKey, 'client_services', data, {})
  ]).catch(() => {});
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 获取服务项目列表
 */
export async function handleServiceItems(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const serviceId = parseInt(match[2] || url.pathname.split('/').slice(-2, -1)[0]);
  
  const client = await env.DATABASE.prepare(
    `SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
  ).bind(clientId).first();
  
  if (!client) {
    return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
  }
  
  // 檢查客戶是否有這個服務項目
  const clientService = await env.DATABASE.prepare(
    `SELECT client_service_id FROM ClientServices 
     WHERE client_id = ? AND service_id = ? AND is_deleted = 0
     LIMIT 1`
  ).bind(clientId, serviceId).first();
  
  if (!clientService) {
    return errorResponse(404, "NOT_FOUND", "客戶沒有此服務項目", null, requestId);
  }
  
  const cacheKey = generateCacheKey('service_items', { clientId, serviceId });
  const kvCached = await getKVCache(env, cacheKey);
  
  if (kvCached?.data) {
    return successResponse(kvCached.data, "查詢成功（KV缓存）", requestId);
  }
  
  // 獲取該客戶服務項目已配置的任務類型
  // 通過 ClientServiceTaskConfigs 的 task_name 匹配 ServiceItems 的 item_name
  const items = await env.DATABASE.prepare(
    `SELECT DISTINCT si.item_id, si.item_name, si.item_code, si.description, si.sort_order
     FROM ServiceItems si
     INNER JOIN ClientServiceTaskConfigs cstc ON cstc.task_name = si.item_name
     WHERE si.service_id = ? 
       AND si.is_active = 1
       AND cstc.client_service_id = ?
       AND cstc.is_deleted = 0
     ORDER BY si.sort_order ASC, si.item_id ASC`
  ).bind(serviceId, clientService.client_service_id).all();
  
  // 如果沒有配置任務，返回空陣列（而不是所有任務類型）
  const data = items.results?.map(item => ({
    item_id: item.item_id,
    item_name: item.item_name,
    item_code: item.item_code,
    description: item.description || ""
  })) || [];
  
  await saveKVCache(env, cacheKey, 'service_items', data, { ttl: 3600 }).catch(() => {});
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 更新客戶服務
 */
export async function handleUpdateClientService(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const clientServiceId = parseInt(match[2]);  // 使用 client_service_id 而非 service_id
  const user = ctx?.user;
  
  const body = await request.json();
  const { status, start_date, end_date, service_id } = body;
  
  // 檢查客戶服務是否存在並獲取客戶負責人信息
  const existing = await env.DATABASE.prepare(
    `SELECT cs.client_service_id, cs.service_id, c.assignee_user_id
     FROM ClientServices cs
     LEFT JOIN Clients c ON c.client_id = cs.client_id
     WHERE cs.client_service_id = ? AND cs.client_id = ? AND cs.is_deleted = 0 AND c.is_deleted = 0
     LIMIT 1`
  ).bind(clientServiceId, clientId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "客戶服務不存在", null, requestId);
  }
  
  // 權限檢查：只有管理員或客戶負責人可以更新客戶服務
  if (!user.is_admin && existing.assignee_user_id !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "無權限修改此客戶服務", null, requestId);
  }
  
  // 如果要更改服務類型，需要驗證新服務存在
  if (service_id && service_id !== existing.service_id) {
    const serviceExists = await env.DATABASE.prepare(
      `SELECT service_id FROM Services WHERE service_id = ? AND is_active = 1`
    ).bind(service_id).first();
    
    if (!serviceExists) {
      return errorResponse(404, "NOT_FOUND", "服務類型不存在", null, requestId);
    }
  }
  
  // 更新客戶服務
  await env.DATABASE.prepare(
    `UPDATE ClientServices 
     SET service_id = ?, status = ?, start_date = ?, end_date = ?, updated_at = datetime('now')
     WHERE client_service_id = ?`
  ).bind(
    service_id || existing.service_id,
    status || 'active',
    start_date || null,
    end_date || null,
    existing.client_service_id
  ).run();
  
  // 清除所有相關快取（客戶列表、客戶詳情、客戶服務列表）
  await Promise.all([
    deleteKVCacheByPrefix(env, 'clients_list'),
    deleteKVCacheByPrefix(env, `client_detail:clientId=${clientId}`),
    deleteKVCacheByPrefix(env, `client_services:clientId=${clientId}`),
    invalidateD1CacheByType(env, 'clients_list'),
    invalidateD1CacheByType(env, 'client_detail'),
    invalidateD1CacheByType(env, 'client_services')
  ]).catch(() => {});
  
  return successResponse({ client_service_id: existing.client_service_id }, "服務已更新", requestId);
}

/**
 * 新增客戶服務
 */
export async function handleCreateClientService(request, env, ctx, requestId, match, url) {
  const clientId = match?.[1] || url.pathname.split('/').slice(-2, -1)[0];
  const user = ctx?.user;
  
  const body = await request.json();
  const { service_id, status, start_date, end_date } = body;
  
  if (!service_id) {
    return errorResponse(422, "VALIDATION_ERROR", "服務ID必填", null, requestId);
  }
  
  // 檢查客戶是否存在並獲取負責人信息
  const client = await env.DATABASE.prepare(
    `SELECT client_id, assignee_user_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
  ).bind(clientId).first();
  
  if (!client) {
    return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
  }
  
  // 權限檢查：只有管理員或客戶負責人可以新增客戶服務
  if (!user.is_admin && client.assignee_user_id !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "無權限為此客戶新增服務項目", null, requestId);
  }
  
  // 檢查服務是否存在
  const service = await env.DATABASE.prepare(
    `SELECT service_id FROM Services WHERE service_id = ? AND is_active = 1`
  ).bind(service_id).first();
  
  if (!service) {
    return errorResponse(404, "NOT_FOUND", "服務不存在", null, requestId);
  }
  
  // 檢查是否已存在該服務（包括已刪除的）
  const existing = await env.DATABASE.prepare(
    `SELECT client_service_id, is_deleted FROM ClientServices 
     WHERE client_id = ? AND service_id = ? LIMIT 1`
  ).bind(clientId, service_id).first();
  
  if (existing && !existing.is_deleted) {
    return errorResponse(409, "CONFLICT", "該客戶已有此服務", null, requestId);
  }
  
  let clientServiceId;
  
  // 如果之前刪除過，則恢復該記錄；否則新增
  if (existing && existing.is_deleted) {
    await env.DATABASE.prepare(
      `UPDATE ClientServices 
       SET is_deleted = 0, status = ?, start_date = ?, end_date = ?, 
           updated_at = datetime('now'), task_configs_count = 0
       WHERE client_service_id = ?`
    ).bind(
      status || 'active',
      start_date || null,
      end_date || null,
      existing.client_service_id
    ).run();
    clientServiceId = existing.client_service_id;
  } else {
    // 新增客戶服務（確保所有必要欄位都有值）
    const result = await env.DATABASE.prepare(
      `INSERT INTO ClientServices (
        client_id, service_id, status, start_date, end_date, 
        task_configs_count, created_at, updated_at, is_deleted
      )
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0)`
    ).bind(
      clientId,
      service_id,
      status || 'active',
      start_date || null,
      end_date || null,
      0  // task_configs_count 初始為 0
    ).run();
    
    clientServiceId = result.meta?.last_row_id;
  }
  
  // 清除所有相關快取（客戶列表、客戶詳情、客戶服務列表）
  await Promise.all([
    deleteKVCacheByPrefix(env, 'clients_list'),
    deleteKVCacheByPrefix(env, `client_detail:clientId=${clientId}`),
    deleteKVCacheByPrefix(env, `client_services:clientId=${clientId}`),
    invalidateD1CacheByType(env, 'clients_list'),
    invalidateD1CacheByType(env, 'client_detail'),
    invalidateD1CacheByType(env, 'client_services')
  ]).catch(() => {});
  
  return successResponse({ 
    client_service_id: clientServiceId,
    client_id: clientId,
    service_id: service_id 
  }, "服務已新增", requestId);
}

/**
 * 刪除客戶服務
 */
export async function handleDeleteClientService(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const clientServiceId = parseInt(match[2]);  // 使用 client_service_id 而非 service_id
  const user = ctx?.user;
  
  // 檢查客戶服務是否存在並獲取客戶負責人信息
  const existing = await env.DATABASE.prepare(
    `SELECT cs.client_service_id, c.assignee_user_id
     FROM ClientServices cs
     LEFT JOIN Clients c ON c.client_id = cs.client_id
     WHERE cs.client_service_id = ? AND cs.client_id = ? AND cs.is_deleted = 0 AND c.is_deleted = 0
     LIMIT 1`
  ).bind(clientServiceId, clientId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "客戶服務不存在", null, requestId);
  }
  
  // 權限檢查：只有管理員或客戶負責人可以刪除客戶服務
  if (!user.is_admin && existing.assignee_user_id !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "無權限刪除此客戶服務", null, requestId);
  }
  
  // 軟刪除客戶服務
  await env.DATABASE.prepare(
    `UPDATE ClientServices 
     SET is_deleted = 1, updated_at = datetime('now')
     WHERE client_service_id = ?`
  ).bind(existing.client_service_id).run();
  
  // 清除所有相關快取（客戶列表、客戶詳情、客戶服務列表）
  await Promise.all([
    deleteKVCacheByPrefix(env, 'clients_list'),
    deleteKVCacheByPrefix(env, `client_detail:clientId=${clientId}`),
    deleteKVCacheByPrefix(env, `client_services:clientId=${clientId}`),
    invalidateD1CacheByType(env, 'clients_list'),
    invalidateD1CacheByType(env, 'client_detail'),
    invalidateD1CacheByType(env, 'client_services')
  ]).catch(() => {});
  
  return successResponse({ client_service_id: existing.client_service_id }, "服務已刪除", requestId);
}

