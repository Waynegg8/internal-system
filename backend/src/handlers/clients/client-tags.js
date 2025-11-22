/**
 * 客户标签管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";

/**
 * 更新客户标签
 */
export async function handleUpdateClientTags(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const body = await request.json();
  const tagIds = Array.isArray(body?.tag_ids) ? body.tag_ids.map(x => Number(x)).filter(Number.isFinite) : [];
  
  // 验证标签存在
  if (tagIds.length > 0) {
    const placeholders = tagIds.map(() => '?').join(',');
    const row = await env.DATABASE.prepare(
      `SELECT COUNT(1) as cnt FROM CustomerTags WHERE tag_id IN (${placeholders})`
    ).bind(...tagIds).first();
    if (Number(row?.cnt || 0) !== tagIds.length) {
      return errorResponse(422, "VALIDATION_ERROR", "標籤不存在", null, requestId);
    }
  }
  
  // 删除现有标签
  await env.DATABASE.prepare(
    `DELETE FROM ClientTagAssignments WHERE client_id = ?`
  ).bind(clientId).run();
  
  // 添加新标签
  const now = new Date().toISOString();
  for (const tagId of tagIds) {
    await env.DATABASE.prepare(
      `INSERT OR IGNORE INTO ClientTagAssignments (client_id, tag_id, assigned_at) VALUES (?, ?, ?)`
    ).bind(clientId, tagId, now).run();
  }
  
  // 清除缓存
  await Promise.all([
    deleteKVCacheByPrefix(env, 'clients_list'),
    deleteKVCacheByPrefix(env, `client_detail:clientId=${clientId}`),
    invalidateD1CacheByType(env, 'clients_list'),
    invalidateD1CacheByType(env, 'client_detail')
  ]).catch(() => {});
  
  return successResponse({ clientId, tagIds }, "標籤已更新", requestId);
}












