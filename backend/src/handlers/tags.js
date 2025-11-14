/**
 * 标签管理处理器
 * 精简重构版本
 */

import { successResponse, errorResponse } from "../utils/response.js";
import { deleteKVCacheByPrefix } from "../utils/cache.js";

export async function handleTags(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/tags - 查询所有标签
    if (method === "GET" && path === '/api/v2/tags') {
      const rows = await env.DATABASE.prepare(
        `SELECT tag_id, tag_name, tag_color, created_at 
         FROM CustomerTags 
         ORDER BY tag_name ASC`
      ).all();
      
      const data = (rows?.results || []).map(r => ({
        tag_id: r.tag_id,
        tag_name: r.tag_name,
        tag_color: r.tag_color || null,
        created_at: r.created_at
      }));
      
      return successResponse(data, "查詢成功", requestId);
    }
    
    // GET /api/v2/tags/:id - 查询单个标签
    if (method === "GET" && match && match[1]) {
      const tagId = match[1];
      
      const row = await env.DATABASE.prepare(
        `SELECT tag_id, tag_name, tag_color, created_at 
         FROM CustomerTags 
         WHERE tag_id = ?`
      ).bind(tagId).first();
      
      if (!row) {
        return errorResponse(404, "NOT_FOUND", "標籤不存在", null, requestId);
      }
      
      const data = {
        tag_id: row.tag_id,
        tag_name: row.tag_name,
        tag_color: row.tag_color || null,
        created_at: row.created_at
      };
      
      return successResponse(data, "查詢成功", requestId);
    }
    
    // POST /api/v2/tags - 新增标签
    if (method === "POST" && path === '/api/v2/tags') {
      const body = await request.json();
      const tagName = String(body?.tag_name || "").trim();
      const tagColor = String(body?.tag_color || "").trim();
      
      const errors = [];
      if (!tagName || tagName.length < 1 || tagName.length > 50) {
        errors.push({ field: "tag_name", message: "標籤名稱為必填（1-50字）" });
      }
      if (tagColor && !/^#[0-9A-Fa-f]{6}$/.test(tagColor)) {
        errors.push({ field: "tag_color", message: "顏色碼格式錯誤（需為 #RRGGBB）" });
      }
      
      if (errors.length > 0) {
        return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
      }
      
      // 检查标签名称唯一性
      const existing = await env.DATABASE.prepare(
        `SELECT 1 FROM CustomerTags WHERE tag_name = ? LIMIT 1`
      ).bind(tagName).first();
      
      if (existing) {
        return errorResponse(409, "CONFLICT", "標籤名稱已存在", null, requestId);
      }
      
      const now = new Date().toISOString();
      await env.DATABASE.prepare(
        `INSERT INTO CustomerTags (tag_name, tag_color, created_at) VALUES (?, ?, ?)`
      ).bind(tagName, tagColor || null, now).run();
      
      const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
      
      // 清除相关缓存
      await deleteKVCacheByPrefix(env, 'clients_list').catch(() => {});
      
      return successResponse({
        tag_id: idRow?.id,
        tag_name: tagName,
        tag_color: tagColor || null,
        created_at: now
      }, "已建立", requestId);
    }
    
    // PUT /api/v2/tags/:id - 更新标签
    if (method === "PUT" && match && match[1]) {
      const tagId = match[1];
      const body = await request.json();
      const tagName = body?.tag_name ? String(body.tag_name).trim() : null;
      const tagColor = body?.tag_color ? String(body.tag_color).trim() : null;
      
      const errors = [];
      if (tagName !== null && (tagName.length < 1 || tagName.length > 50)) {
        errors.push({ field: "tag_name", message: "標籤名稱長度需為 1-50字" });
      }
      if (tagColor !== null && tagColor !== "" && !/^#[0-9A-Fa-f]{6}$/.test(tagColor)) {
        errors.push({ field: "tag_color", message: "顏色碼格式錯誤（需為 #RRGGBB）" });
      }
      
      if (errors.length > 0) {
        return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
      }
      
      // 检查标签是否存在
      const existing = await env.DATABASE.prepare(
        `SELECT 1 FROM CustomerTags WHERE tag_id = ? LIMIT 1`
      ).bind(tagId).first();
      
      if (!existing) {
        return errorResponse(404, "NOT_FOUND", "標籤不存在", null, requestId);
      }
      
      // 如果更新名称，检查唯一性
      if (tagName !== null) {
        const dup = await env.DATABASE.prepare(
          `SELECT 1 FROM CustomerTags WHERE tag_name = ? AND tag_id != ? LIMIT 1`
        ).bind(tagName, tagId).first();
        
        if (dup) {
          return errorResponse(409, "CONFLICT", "標籤名稱已存在", null, requestId);
        }
      }
      
      // 构建更新语句
      const updates = [];
      const binds = [];
      if (tagName !== null) {
        updates.push("tag_name = ?");
        binds.push(tagName);
      }
      if (tagColor !== null) {
        updates.push("tag_color = ?");
        binds.push(tagColor === "" ? null : tagColor);
      }
      
      if (updates.length === 0) {
        return errorResponse(400, "BAD_REQUEST", "沒有可更新的欄位", null, requestId);
      }
      
      await env.DATABASE.prepare(
        `UPDATE CustomerTags SET ${updates.join(", ")} WHERE tag_id = ?`
      ).bind(...binds, tagId).run();
      
      // 清除相关缓存
      await deleteKVCacheByPrefix(env, 'clients_list').catch(() => {});
      
      return successResponse({ tag_id: tagId, tag_name: tagName, tag_color: tagColor }, "已更新", requestId);
    }
    
    // DELETE /api/v2/tags/:id - 删除标签
    if (method === "DELETE" && match && match[1]) {
      const tagId = match[1];
      
      // 检查标签是否存在
      const existing = await env.DATABASE.prepare(
        `SELECT 1 FROM CustomerTags WHERE tag_id = ? LIMIT 1`
      ).bind(tagId).first();
      
      if (!existing) {
        return errorResponse(404, "NOT_FOUND", "標籤不存在", null, requestId);
      }
      
      // 检查是否有客户使用此标签
      const usage = await env.DATABASE.prepare(
        `SELECT COUNT(1) as cnt FROM ClientTagAssignments WHERE tag_id = ?`
      ).bind(tagId).first();
      
      if (Number(usage?.cnt || 0) > 0) {
        return errorResponse(409, "CONFLICT", 
          `此標籤正被 ${usage.cnt} 個客戶使用，無法刪除`, null, requestId);
      }
      
      // 删除标签
      await env.DATABASE.prepare(
        `DELETE FROM CustomerTags WHERE tag_id = ?`
      ).bind(tagId).run();
      
      // 清除相关缓存
      await deleteKVCacheByPrefix(env, 'clients_list').catch(() => {});
      
      return successResponse({ tag_id: tagId }, "已刪除", requestId);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Tags] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}
