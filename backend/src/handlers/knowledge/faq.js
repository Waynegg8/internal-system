/**
 * FAQ管理完整功能
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 获取FAQ列表
 */
export async function handleGetFAQList(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
  const offset = (page - 1) * perPage;
  const q = (params.get("q") || "").trim();
  const category = (params.get("category") || "").trim();
  const scope = (params.get("scope") || "").trim();
  const clientId = params.get("client_id");
  const tags = (params.get("tags") || "").trim();
  
  // KV 缓存
  const cacheKey = generateCacheKey('faq_list', {
    page, perPage, q, category, scope, client_id: clientId, tags
  });
  
  const kvCached = await getKVCache(env, cacheKey);
  if (kvCached?.data) {
    return successResponse(kvCached.data.items, "查詢成功（KV缓存）", requestId, {
      ...kvCached.data.meta,
      cache_source: 'kv'
    });
  }
  
  // 构建查询条件
  const where = ["is_deleted = 0"];
  const binds = [];
  
  if (q) {
    where.push("(question LIKE ? OR answer LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  
  if (category && category !== 'all') {
    where.push("category = ?");
    binds.push(category);
  }
  
  if (scope && (scope === 'service' || scope === 'task')) {
    where.push("scope = ?");
    binds.push(scope);
  }
  
  if (clientId && clientId !== 'all') {
    where.push("client_id = ?");
    binds.push(parseInt(clientId));
  }
  
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    tagList.forEach(tag => {
      where.push("tags LIKE ?");
      binds.push(`%${tag}%`);
    });
  }
  
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  
  // 查询总数
  const countRow = await env.DATABASE.prepare(
    `SELECT COUNT(*) as total FROM InternalFAQ ${whereSql}`
  ).bind(...binds).first();
  const total = Number(countRow?.total || 0);
  
  // 查询数据
  const rows = await env.DATABASE.prepare(
    `SELECT 
      faq_id, 
      question, 
      answer, 
      category, 
      scope,
      client_id,
      tags, 
      created_by, 
      created_at, 
      updated_at
    FROM InternalFAQ
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?`
  ).bind(...binds, perPage, offset).all();
  
  const faqs = (rows?.results || []).map(row => ({
    faq_id: row.faq_id,
    question: row.question,
    answer: row.answer,
    category: row.category || "",
    scope: row.scope || null,
    clientId: row.client_id || null,
    tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  
  // 保存到 KV 缓存
  const cacheData = {
    items: faqs,
    meta: { total, page, perPage }
  };
  await saveKVCache(env, cacheKey, 'faq_list', cacheData, { ttl: 3600 }).catch(() => {});
  
  const meta = { page, perPage, total, hasNext: offset + perPage < total };
  return successResponse(faqs, "查詢成功", requestId, meta);
}

/**
 * 获取单个FAQ详情
 */
export async function handleGetFAQDetail(request, env, ctx, requestId, match, url) {
  const faqId = match[1];
  
  const faq = await env.DATABASE.prepare(`
    SELECT 
      faq_id, 
      question, 
      answer, 
      category, 
      scope,
      client_id,
      tags, 
      created_by, 
      created_at, 
      updated_at
    FROM InternalFAQ
    WHERE faq_id = ? AND is_deleted = 0
  `).bind(faqId).first();
  
  if (!faq) {
    return errorResponse(404, "NOT_FOUND", "FAQ不存在", null, requestId);
  }
  
  const data = {
    faq_id: faq.faq_id,
    question: faq.question,
    answer: faq.answer,
    category: faq.category || "",
    scope: faq.scope || null,
    clientId: faq.client_id || null,
    tags: faq.tags ? faq.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    createdBy: faq.created_by,
    createdAt: faq.created_at,
    updatedAt: faq.updated_at
  };
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 创建FAQ
 */
export async function handleCreateFAQ(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const body = await request.json();
  
  const question = String(body?.question || "").trim();
  const answer = String(body?.answer || "").trim();
  const category = String(body?.category || "").trim();
  const scope = String(body?.scope || "").trim();
  const clientId = body?.client_id ? parseInt(body.client_id) : null;
  const tags = Array.isArray(body?.tags) ? body.tags.join(',') : String(body?.tags || "");
  
  const errors = [];
  if (!question) errors.push({ field: "question", message: "問題為必填項" });
  if (!answer) errors.push({ field: "answer", message: "答案為必填項" });
  if (!scope || (scope !== 'service' && scope !== 'task')) {
    errors.push({ field: "scope", message: "必須指定資源適用層級（service或task）" });
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  const now = new Date().toISOString();
  const result = await env.DATABASE.prepare(`
    INSERT INTO InternalFAQ (
      question, answer, category, scope, client_id, tags, created_by, created_at, updated_at, is_deleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).bind(
    question,
    answer,
    category || null,
    scope,
    clientId,
    tags,
    user.user_id,
    now,
    now
  ).run();
  
  const faqId = result.meta?.last_row_id;
  
  // 清除 FAQ 列表的 KV 缓存
  await deleteKVCacheByPrefix(env, 'faq_list').catch(() => {});
  
  return successResponse({ faq_id: faqId }, "已創建", requestId);
}

/**
 * 更新FAQ
 */
export async function handleUpdateFAQ(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const faqId = match[1];
  const body = await request.json();
  
  // 检查FAQ是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT faq_id, created_by FROM InternalFAQ WHERE faq_id = ? AND is_deleted = 0`
  ).bind(faqId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "FAQ不存在", null, requestId);
  }
  
  // 权限检查：只有创建者或管理员可以更新
  if (String(existing.created_by) !== String(user.user_id) && !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "無權更新此FAQ", null, requestId);
  }
  
  const updates = [];
  const binds = [];
  
  if (body.hasOwnProperty('question')) {
    updates.push("question = ?");
    binds.push(String(body.question || "").trim());
  }
  if (body.hasOwnProperty('answer')) {
    updates.push("answer = ?");
    binds.push(String(body.answer || "").trim());
  }
  if (body.hasOwnProperty('category')) {
    updates.push("category = ?");
    binds.push(String(body.category || "").trim() || null);
  }
  if (body.hasOwnProperty('tags')) {
    const tagsStr = Array.isArray(body.tags) ? body.tags.join(',') : String(body.tags || "");
    updates.push("tags = ?");
    binds.push(tagsStr);
  }
  if (body.hasOwnProperty('client_id')) {
    updates.push("client_id = ?");
    binds.push(body.client_id ? parseInt(body.client_id) : null);
  }
  
  if (updates.length === 0) {
    return errorResponse(400, "BAD_REQUEST", "沒有可更新的欄位", null, requestId);
  }
  
  updates.push("updated_at = ?");
  binds.push(new Date().toISOString());
  binds.push(faqId);
  
  await env.DATABASE.prepare(
    `UPDATE InternalFAQ SET ${updates.join(", ")} WHERE faq_id = ?`
  ).bind(...binds).run();
  
  // 清除 FAQ 列表的 KV 缓存
  await deleteKVCacheByPrefix(env, 'faq_list').catch(() => {});
  
  return successResponse({ faq_id: faqId }, "已更新", requestId);
}

/**
 * 删除FAQ
 */
export async function handleDeleteFAQ(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const faqId = match[1];
  
  // 检查FAQ是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT faq_id, created_by FROM InternalFAQ WHERE faq_id = ? AND is_deleted = 0`
  ).bind(faqId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "FAQ不存在", null, requestId);
  }
  
  // 权限检查：只有创建者或管理员可以删除
  if (String(existing.created_by) !== String(user.user_id) && !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "無權刪除此FAQ", null, requestId);
  }
  
  // 软删除
  await env.DATABASE.prepare(
    `UPDATE InternalFAQ SET is_deleted = 1, updated_at = ? WHERE faq_id = ?`
  ).bind(new Date().toISOString(), faqId).run();
  
  // 清除 FAQ 列表的 KV 缓存
  await deleteKVCacheByPrefix(env, 'faq_list').catch(() => {});
  
  return successResponse({ faq_id: faqId }, "已刪除", requestId);
}
