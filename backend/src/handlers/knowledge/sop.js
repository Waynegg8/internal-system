/**
 * SOP管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 获取SOP列表
 */
export async function handleGetSOPList(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "12", 10)));
  const offset = (page - 1) * perPage;
  const q = (params.get("q") || "").trim();
  const category = (params.get("category") || "").trim();
  const scope = (params.get("scope") || "").trim();
  const clientId = (params.get("client_id") || "").trim();
  const published = (params.get("published") || "all").trim().toLowerCase();
  
  const cacheKey = generateCacheKey('sop_list', {
    page, perPage, q, category, scope, client_id: clientId, published
  });
  
  const kvCached = await getKVCache(env, cacheKey);
  if (kvCached?.data) {
    return successResponse(kvCached.data.items, "查詢成功（KV缓存）", requestId, {
      ...kvCached.data.meta,
      cache_source: 'kv'
    });
  }
  
  const where = ["is_deleted = 0"];
  const binds = [];
  
  if (q) {
    where.push("(title LIKE ? OR tags LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  if (category && category !== "all") {
    where.push("category = ?");
    binds.push(category);
  }
  if (scope && (scope === "service" || scope === "task")) {
    where.push("scope = ?");
    binds.push(scope);
  }
  if (clientId && clientId !== "all") {
    where.push("client_id = ?");
    binds.push(parseInt(clientId));
  }
  if (published !== "all") {
    if (["1", "true", "published"].includes(published)) {
      where.push("is_published = 1");
    } else if (["0", "false", "draft"].includes(published)) {
      where.push("is_published = 0");
    }
  }
  
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countRow = await env.DATABASE.prepare(
    `SELECT COUNT(1) AS total FROM SOPDocuments ${whereSql}`
  ).bind(...binds).first();
  const total = Number(countRow?.total || 0);
  
  const rows = await env.DATABASE.prepare(
    `SELECT sop_id, title, category, tags, scope, client_id, version, is_published, created_by, created_at, updated_at
     FROM SOPDocuments
     ${whereSql}
     ORDER BY updated_at DESC, sop_id DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, perPage, offset).all();
  
  const items = (rows?.results || []).map(r => ({
    id: r.sop_id,
    title: r.title,
    category: r.category || "",
    scope: r.scope || null,
    clientId: r.client_id || null,
    tags: (() => {
      try {
        return JSON.parse(r.tags || "[]");
      } catch (_) {
        return [];
      }
    })(),
    version: Number(r.version || 1),
    isPublished: r.is_published === 1,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  
  const cacheData = {
    items,
    meta: { page, perPage, total }
  };
  await saveKVCache(env, cacheKey, 'sop_list', cacheData, { ttl: 3600 }).catch(() => {});
  
  return successResponse(items, "成功", requestId, { page, perPage, total });
}

/**
 * 获取单个SOP详情
 */
export async function handleGetSOPDetail(request, env, ctx, requestId, match, url) {
  const sopId = match[1];
  
  const row = await env.DATABASE.prepare(
    `SELECT sop_id, title, content, category, tags, scope, client_id, version, is_published, created_by, created_at, updated_at
     FROM SOPDocuments
     WHERE sop_id = ? AND is_deleted = 0`
  ).bind(sopId).first();
  
  if (!row) {
    return errorResponse(404, "NOT_FOUND", "SOP 不存在", null, requestId);
  }
  
  const data = {
    id: row.sop_id,
    title: row.title,
    content: row.content || "",
    category: row.category || "",
    scope: row.scope || null,
    clientId: row.client_id || null,
    tags: (() => {
      try {
        return JSON.parse(row.tags || "[]");
      } catch (_) {
        return [];
      }
    })(),
    version: Number(row.version || 1),
    isPublished: row.is_published === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  
  return successResponse(data, "成功", requestId);
}

/**
 * 创建SOP
 */
export async function handleCreateSOP(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const body = await request.json();
  const { title, content, category, tags, scope, client_id } = body;
  
  if (!title || !content) {
    return errorResponse(400, "VALIDATION_ERROR", "標題和內容為必填", null, requestId);
  }
  
  if (!scope || (scope !== 'service' && scope !== 'task')) {
    return errorResponse(400, "VALIDATION_ERROR", "必須指定SOP適用層級（service或task）", null, requestId);
  }
  
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  const now = new Date().toISOString();
  
  const result = await env.DATABASE.prepare(
    `INSERT INTO SOPDocuments (title, content, category, tags, scope, client_id, version, is_published, created_by, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, 0)`
  ).bind(title, content, category || '', tagsJson, scope, client_id || null, String(user.user_id), now, now).run();
  
  const sopId = result.meta?.last_row_id;
  
  // 清除SOP列表的KV缓存
  await deleteKVCacheByPrefix(env, 'sop_list').catch(() => {});
  
  return successResponse({ sop_id: sopId }, "創建成功", requestId);
}

/**
 * 更新SOP
 */
export async function handleUpdateSOP(request, env, ctx, requestId, match, url) {
  const sopId = match[1];
  const body = await request.json();
  const { title, content, category, tags, scope, client_id } = body;
  
  if (!title || !content) {
    return errorResponse(400, "VALIDATION_ERROR", "標題和內容為必填", null, requestId);
  }
  
  if (!scope || (scope !== 'service' && scope !== 'task')) {
    return errorResponse(400, "VALIDATION_ERROR", "必須指定SOP適用層級（service或task）", null, requestId);
  }
  
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  const now = new Date().toISOString();
  
  await env.DATABASE.prepare(
    `UPDATE SOPDocuments 
     SET title = ?, content = ?, category = ?, tags = ?, scope = ?, client_id = ?, updated_at = ?, version = version + 1
     WHERE sop_id = ? AND is_deleted = 0`
  ).bind(title, content, category || '', tagsJson, scope, client_id || null, now, sopId).run();
  
  // 清除SOP列表的KV缓存
  await deleteKVCacheByPrefix(env, 'sop_list').catch(() => {});
  
  return successResponse({ sop_id: sopId }, "已更新", requestId);
}

/**
 * 删除SOP
 */
export async function handleDeleteSOP(request, env, ctx, requestId, match, url) {
  const sopId = match[1];
  
  // 软删除
  await env.DATABASE.prepare(
    `UPDATE SOPDocuments SET is_deleted = 1, updated_at = datetime('now') WHERE sop_id = ?`
  ).bind(sopId).run();
  
  // 清除SOP列表的KV缓存
  await deleteKVCacheByPrefix(env, 'sop_list').catch(() => {});
  
  return successResponse({ sop_id: sopId }, "已刪除", requestId);
}





