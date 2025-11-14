/**
 * 文档管理完整功能
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 获取文档列表
 */
export async function handleGetDocumentsList(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
  const offset = (page - 1) * perPage;
  const q = (params.get("q") || "").trim();
  const category = (params.get("category") || "").trim();
  const scope = (params.get("scope") || "").trim();
  const clientId = params.get("client_id");
  const year = params.get("year");
  const month = params.get("month");
  const tags = (params.get("tags") || "").trim();
  const relatedEntityType = (params.get("related_entity_type") || "").trim();
  const relatedEntityId = (params.get("related_entity_id") || "").trim();
  
  // KV 缓存
  const cacheKey = generateCacheKey('documents_list', {
    page, perPage, q, category, scope, client_id: clientId, year, month, tags,
    related_entity_type: relatedEntityType, related_entity_id: relatedEntityId
  });
  
  const kvCached = await getKVCache(env, cacheKey);
  if (kvCached?.data) {
    return successResponse(kvCached.data.items, "查詢成功（KV缓存）", requestId, {
      ...kvCached.data.meta,
      cache_source: 'kv'
    });
  }
  
  // 构建查询条件
  const where = ["d.is_deleted = 0"];
  const binds = [];
  
  if (q) {
    where.push("(d.title LIKE ? OR d.description LIKE ? OR d.file_name LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  
  if (category && category !== 'all') {
    where.push("d.category = ?");
    binds.push(category);
  }
  
  if (scope && (scope === 'service' || scope === 'task')) {
    where.push("d.scope = ?");
    binds.push(scope);
  }
  
  if (clientId && clientId !== 'all') {
    where.push("d.client_id = ?");
    binds.push(parseInt(clientId));
  }
  
  if (year && year !== 'all') {
    where.push("d.doc_year = ?");
    binds.push(parseInt(year));
  }
  
  if (month && month !== 'all') {
    where.push("d.doc_month = ?");
    binds.push(parseInt(month));
  }
  
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    tagList.forEach(tag => {
      where.push("d.tags LIKE ?");
      binds.push(`%${tag}%`);
    });
  }
  
  if (relatedEntityType) {
    where.push("d.related_entity_type = ?");
    binds.push(relatedEntityType);
  }
  
  if (relatedEntityId) {
    where.push("d.related_entity_id = ?");
    binds.push(relatedEntityId);
  }
  
  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  
  // 查询总数
  const countRow = await env.DATABASE.prepare(
    `SELECT COUNT(*) as total FROM InternalDocuments d ${whereSql}`
  ).bind(...binds).first();
  const total = Number(countRow?.total || 0);
  
  // 查询数据
  const buildSelectQuery = (useLegacyTaskColumn = false) => `SELECT 
      d.document_id,
      d.title,
      d.description,
      d.file_name,
      d.file_url,
      d.file_size,
      d.file_type,
      d.category,
      d.scope,
      d.client_id,
      d.doc_year,
      d.doc_month,
      ${useLegacyTaskColumn ? 'd.related_task_id' : 'COALESCE(d.task_id, d.related_task_id)'} as task_id,
      d.tags,
      d.related_entity_type,
      d.related_entity_id,
      d.uploaded_by,
      d.created_at,
      d.updated_at,
      COALESCE(u.username, u.name, '未知') as uploader_name
    FROM InternalDocuments d
    LEFT JOIN Users u ON d.uploaded_by = u.user_id
    ${whereSql}
    ORDER BY d.created_at DESC
    LIMIT ? OFFSET ?`;

  let rows;
  try {
    rows = await env.DATABASE.prepare(buildSelectQuery(false)).bind(...binds, perPage, offset).all();
  } catch (dbError) {
    if (dbError?.message && dbError.message.includes('d.task_id')) {
      rows = await env.DATABASE.prepare(buildSelectQuery(true)).bind(...binds, perPage, offset).all();
    } else {
      console.error('[Documents] Database query error:', dbError);
      return successResponse({ documents: [], total: 0, page, per_page: perPage }, "查詢成功（空結果）", requestId, { total: 0, page, per_page: perPage });
    }
  }
  
  const documents = (rows?.results || []).map(row => ({
    document_id: row.document_id,
    title: row.title,
    description: row.description || "",
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileSize: row.file_size,
    fileType: row.file_type,
    category: row.category || "",
    scope: row.scope || null,
    clientId: row.client_id || null,
    docYear: row.doc_year || null,
    docMonth: row.doc_month || null,
    taskId: row.task_id || null,
    tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    relatedEntityType: row.related_entity_type || null,
    relatedEntityId: row.related_entity_id || null,
    uploadedBy: row.uploaded_by,
    uploaderName: row.uploader_name || "未知",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  
  // 保存到 KV 缓存
  const cacheData = {
    items: documents,
    meta: { total, page, perPage }
  };
  await saveKVCache(env, cacheKey, 'documents_list', cacheData, { ttl: 3600 }).catch(() => {});
  
  const meta = { page, perPage, total, hasNext: offset + perPage < total };
  return successResponse(documents, "查詢成功", requestId, meta);
}

/**
 * 获取单个文档详情
 */
export async function handleGetDocumentDetail(request, env, ctx, requestId, match, url) {
  const docId = match[1];
  
  const doc = await env.DATABASE.prepare(`
    SELECT 
      d.document_id,
      d.title,
      d.description,
      d.file_name,
      d.file_url,
      d.file_size,
      d.file_type,
      d.category,
      d.scope,
      d.client_id,
      d.doc_year,
      d.doc_month,
      COALESCE(d.task_id, d.related_task_id) as task_id,
      d.tags,
      d.related_entity_type,
      d.related_entity_id,
      d.uploaded_by,
      d.created_at,
      d.updated_at,
      COALESCE(u.username, u.name, '未知') as uploader_name
    FROM InternalDocuments d
    LEFT JOIN Users u ON d.uploaded_by = u.user_id
    WHERE d.document_id = ? AND d.is_deleted = 0
  `).bind(docId).first().catch(async (err) => {
    if (err?.message && err.message.includes('d.task_id')) {
      return await env.DATABASE.prepare(`
        SELECT 
          d.document_id,
          d.title,
          d.description,
          d.file_name,
          d.file_url,
          d.file_size,
          d.file_type,
          d.category,
          d.scope,
          d.client_id,
          d.doc_year,
          d.doc_month,
          d.related_task_id as task_id,
          d.tags,
          d.related_entity_type,
          d.related_entity_id,
          d.uploaded_by,
          d.created_at,
          d.updated_at,
          COALESCE(u.username, u.name, '未知') as uploader_name
        FROM InternalDocuments d
        LEFT JOIN Users u ON d.uploaded_by = u.user_id
        WHERE d.document_id = ? AND d.is_deleted = 0
      `).bind(docId).first();
    }
    throw err;
  });
  
  if (!doc) {
    return errorResponse(404, "NOT_FOUND", "文檔不存在", null, requestId);
  }
  
  const data = {
    document_id: doc.document_id,
    title: doc.title,
    description: doc.description || "",
    fileName: doc.file_name,
    fileUrl: doc.file_url,
    fileSize: doc.file_size,
    fileType: doc.file_type,
    category: doc.category || "",
    scope: doc.scope || null,
    clientId: doc.client_id || null,
    docYear: doc.doc_year || null,
    docMonth: doc.doc_month || null,
    taskId: doc.task_id || null,
    tags: doc.tags ? doc.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    relatedEntityType: doc.related_entity_type || null,
    relatedEntityId: doc.related_entity_id || null,
    uploadedBy: doc.uploaded_by,
    uploaderName: doc.uploader_name || "未知",
    createdAt: doc.created_at,
    updatedAt: doc.updated_at
  };
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 上传文档（上传到R2 + 创建DB记录）
 */
export async function handleUploadDocument(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const title = formData.get('title');
    const description = formData.get('description') || '';
    const category = formData.get('category') || '';
    const scope = formData.get('scope') || '';
    const clientId = formData.get('client_id') || '';
    const docYear = formData.get('doc_year') || '';
    const docMonth = formData.get('doc_month') || '';
    const taskId = formData.get('task_id') || '';
    const tags = formData.get('tags') || '';
    const relatedEntityType = formData.get('related_entity_type') || '';
    const relatedEntityId = formData.get('related_entity_id') || '';
    
    // 验证必填字段
    if (!file || !title) {
      return errorResponse(400, "VALIDATION_ERROR", "文件和標題為必填項", null, requestId);
    }
    
    if (!scope || (scope !== 'service' && scope !== 'task')) {
      return errorResponse(400, "VALIDATION_ERROR", "必須指定資源適用層級（service或task）", null, requestId);
    }
    
    // 验证文件大小（最大 25MB）
    if (file.size > 25 * 1024 * 1024) {
      return errorResponse(413, "FILE_TOO_LARGE", "文件大小不能超過 25MB", null, requestId);
    }
    
    // 检查 R2 是否配置
    if (!env.R2_BUCKET) {
      return errorResponse(500, "CONFIG_ERROR", "R2 存储未配置", null, requestId);
    }
    
    // 生成 R2 对象键
    const now = Date.now();
    const envName = String(env.APP_ENV || 'dev');
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `private/${envName}/documents/${now}_${sanitizedFileName}`;
    
    // 读取文件内容（FormData 中的 File 对象使用 arrayBuffer）
    const fileBody = await file.arrayBuffer();
    
    // 上传到 R2
    await env.R2_BUCKET.put(objectKey, fileBody, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
        contentDisposition: `attachment; filename="${file.name}"`
      },
      customMetadata: {
        ownerId: String(user.user_id),
        module: 'documents'
      }
    });
    
    // 创建数据库记录
    const tagsStr = tags;
    const nowISO = new Date().toISOString();
    
    // 嘗試插入，如果 task_id 欄位不存在則使用 related_task_id
    let result;
    try {
      result = await env.DATABASE.prepare(`
        INSERT INTO InternalDocuments (
          title,
          description,
          file_name,
          file_url,
          file_size,
          file_type,
          category,
          scope,
          client_id,
          doc_year,
          doc_month,
          task_id,
          tags,
          related_entity_type,
          related_entity_id,
          uploaded_by,
          created_at,
          updated_at,
          is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).bind(
        title,
        description || null,
        file.name,
        objectKey,
        file.size,
        file.type,
        category || null,
        scope,
        clientId ? parseInt(clientId) : null,
        docYear ? parseInt(docYear) : null,
        docMonth ? parseInt(docMonth) : null,
        taskId ? parseInt(taskId) : null,
        tagsStr,
        relatedEntityType || null,
        relatedEntityId || null,
        user.user_id,
        nowISO,
        nowISO
      ).run();
    } catch (err) {
      // 如果 task_id 欄位不存在，使用 related_task_id
      if (err.message && err.message.includes('task_id')) {
        result = await env.DATABASE.prepare(`
          INSERT INTO InternalDocuments (
            title,
            description,
            file_name,
            file_url,
            file_size,
            file_type,
            category,
            scope,
            client_id,
            doc_year,
            doc_month,
            related_task_id,
            tags,
            related_entity_type,
            related_entity_id,
            uploaded_by,
            created_at,
            updated_at,
            is_deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).bind(
          title,
          description || null,
          file.name,
          objectKey,
          file.size,
          file.type,
          category || null,
          scope,
          clientId ? parseInt(clientId) : null,
          docYear ? parseInt(docYear) : null,
          docMonth ? parseInt(docMonth) : null,
          taskId ? parseInt(taskId) : null,
          tagsStr,
          relatedEntityType || null,
          relatedEntityId || null,
          user.user_id,
          nowISO,
          nowISO
        ).run();
      } else {
        throw err;
      }
    }
    
    const documentId = result.meta?.last_row_id;
    
    // 清除文档列表的 KV 缓存
    await deleteKVCacheByPrefix(env, 'documents_list').catch(() => {});
    
    return successResponse({
      document_id: documentId,
      title,
      fileName: file.name,
      fileUrl: objectKey,
      fileSize: file.size
    }, "上傳成功", requestId);
    
  } catch (err) {
    console.error(`[Documents Upload] Error:`, err);
    console.error(`[Documents Upload] Error stack:`, err.stack);
    console.error(`[Documents Upload] Error message:`, err.message);
    return errorResponse(500, "UPLOAD_ERROR", `上傳失敗: ${err.message || '未知錯誤'}`, null, requestId);
  }
}

/**
 * 更新文档信息
 */
export async function handleUpdateDocument(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const docId = match[1];
  const body = await request.json();
  
  // 检查文档是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT document_id, uploaded_by FROM InternalDocuments WHERE document_id = ? AND is_deleted = 0`
  ).bind(docId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "文檔不存在", null, requestId);
  }
  
  // 权限检查：只有上传者或管理员可以更新
  if (String(existing.uploaded_by) !== String(user.user_id) && !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "無權更新此文檔", null, requestId);
  }
  
  const updates = [];
  const binds = [];
  
  if (body.hasOwnProperty('title')) {
    updates.push("title = ?");
    binds.push(String(body.title || "").trim());
  }
  if (body.hasOwnProperty('description')) {
    updates.push("description = ?");
    binds.push(String(body.description || "").trim() || null);
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
  if (body.hasOwnProperty('doc_year')) {
    updates.push("doc_year = ?");
    binds.push(body.doc_year ? parseInt(body.doc_year) : null);
  }
  if (body.hasOwnProperty('doc_month')) {
    updates.push("doc_month = ?");
    binds.push(body.doc_month ? parseInt(body.doc_month) : null);
  }
  if (body.hasOwnProperty('task_id')) {
    updates.push("task_id = ?");
    binds.push(body.task_id ? parseInt(body.task_id) : null);
  }
  
  if (updates.length === 0) {
    return errorResponse(400, "BAD_REQUEST", "沒有可更新的欄位", null, requestId);
  }
  
  updates.push("updated_at = ?");
  binds.push(new Date().toISOString());
  binds.push(docId);
  
  await env.DATABASE.prepare(
    `UPDATE InternalDocuments SET ${updates.join(", ")} WHERE document_id = ?`
  ).bind(...binds).run();
  
  // 清除文档列表的 KV 缓存
  await deleteKVCacheByPrefix(env, 'documents_list').catch(() => {});
  
  return successResponse({ document_id: docId }, "已更新", requestId);
}

/**
 * 删除文档
 */
export async function handleDeleteDocument(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const docId = match[1];
  
  // 检查文档是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT document_id, uploaded_by, file_url FROM InternalDocuments WHERE document_id = ? AND is_deleted = 0`
  ).bind(docId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "文檔不存在", null, requestId);
  }
  
  // 权限检查：只有上传者或管理员可以删除
  if (String(existing.uploaded_by) !== String(user.user_id) && !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "無權刪除此文檔", null, requestId);
  }
  
  // 从R2删除文件
  if (env.R2_BUCKET && existing.file_url) {
    try {
      await env.R2_BUCKET.delete(existing.file_url);
    } catch (err) {
      console.warn(`[Documents] Failed to delete R2 file:`, err);
      // 继续执行数据库删除，即使R2删除失败
    }
  }
  
  // 软删除数据库记录
  await env.DATABASE.prepare(
    `UPDATE InternalDocuments SET is_deleted = 1, updated_at = ? WHERE document_id = ?`
  ).bind(new Date().toISOString(), docId).run();
  
  // 清除文档列表的 KV 缓存
  await deleteKVCacheByPrefix(env, 'documents_list').catch(() => {});
  
  return successResponse({ document_id: docId }, "已刪除", requestId);
}

/**
 * 下载文档
 */
export async function handleDownloadDocument(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const docId = match[1];
  
  try {
    // 获取文档信息
    const doc = await env.DATABASE.prepare(`
      SELECT file_url, file_name, file_type, uploaded_by
      FROM InternalDocuments
      WHERE document_id = ? AND is_deleted = 0
    `).bind(docId).first();
    
    if (!doc) {
      return errorResponse(404, "NOT_FOUND", "文檔不存在", null, requestId);
    }
    
    // 权限检查：只有上传者或管理员可以下载
    if (String(doc.uploaded_by) !== String(user.user_id) && !user.is_admin) {
      return errorResponse(403, "FORBIDDEN", "無權下載此文檔", null, requestId);
    }
    
    // 检查 R2 是否配置
    if (!env.R2_BUCKET) {
      return errorResponse(500, "CONFIG_ERROR", "R2 存储未配置", null, requestId);
    }
    
    // 从 R2 获取文件
    const object = await env.R2_BUCKET.get(doc.file_url);
    
    if (!object) {
      return errorResponse(404, "FILE_NOT_FOUND", "文件不存在於存儲中", null, requestId);
    }
    
    // 返回文件
    return new Response(object.body, {
      headers: {
        'Content-Type': doc.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.file_name)}"`,
        'Cache-Control': 'private, max-age=3600'
      }
    });
    
  } catch (err) {
    console.error(`[Documents Download] Error:`, err);
    return errorResponse(500, "DOWNLOAD_ERROR", "下載失敗", null, requestId);
  }
}
