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
  
  // 检查文档是否存在，获取完整信息包括 file_url
  const existing = await env.DATABASE.prepare(
    `SELECT document_id, uploaded_by, file_url, file_name, file_size, file_type FROM InternalDocuments WHERE document_id = ? AND is_deleted = 0`
  ).bind(docId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "文檔不存在", null, requestId);
  }
  
  // 权限检查：只有上传者或管理员可以更新
  if (String(existing.uploaded_by) !== String(user.user_id) && !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "無權更新此文檔", null, requestId);
  }
  
  // 检查请求内容类型，判断是 JSON 还是 FormData（文件上传）
  const contentType = request.headers.get('content-type') || '';
  const isFormData = contentType.includes('multipart/form-data');
  
  const oldFileUrl = existing.file_url;
  let newFileUrl = null;
  let newFileName = null;
  let newFileSize = null;
  let newFileType = null;
  let fileUploadError = null;
  
  // 解析请求数据
  let metadata = {};
  
  if (isFormData) {
    // FormData 请求：处理文件上传和元数据
    const formData = await request.formData();
    const file = formData.get('file');
    
    // 处理文件上传
    if (file && file instanceof File) {
      try {
        // 验证文件大小（最大 25MB）
        if (file.size > 25 * 1024 * 1024) {
          return errorResponse(413, "FILE_TOO_LARGE", "文件大小不能超過 25MB", null, requestId);
        }
        
        // 检查 R2 是否配置
        if (!env.R2_BUCKET) {
          return errorResponse(500, "CONFIG_ERROR", "R2 存储未配置", null, requestId);
        }
        
        // 生成新的 R2 对象键
        const now = Date.now();
        const envName = String(env.APP_ENV || 'dev');
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        newFileUrl = `private/${envName}/documents/${now}_${sanitizedFileName}`;
        newFileName = file.name;
        newFileSize = file.size;
        newFileType = file.type || 'application/octet-stream';
        
        // 读取文件内容
        const fileBody = await file.arrayBuffer();
        
        // 上传新文件到 R2
        await env.R2_BUCKET.put(newFileUrl, fileBody, {
          httpMetadata: {
            contentType: newFileType,
            contentDisposition: `attachment; filename="${file.name}"`
          },
          customMetadata: {
            ownerId: String(user.user_id),
            module: 'documents',
            replacedDocumentId: String(docId)
          }
        });
      } catch (err) {
        console.error(`[Documents Update] File upload error:`, err);
        fileUploadError = err.message || '文件上傳失敗';
        // 如果文件上传失败，保留原有文件，仅更新元数据
      }
    }
    
    // 从 FormData 提取元数据
    const title = formData.get('title');
    const description = formData.get('description');
    const category = formData.get('category');
    const scope = formData.get('scope');
    const clientId = formData.get('client_id');
    const docYear = formData.get('doc_year');
    const docMonth = formData.get('doc_month');
    const taskId = formData.get('task_id');
    const tags = formData.get('tags');
    
    if (title !== null && title !== undefined) metadata.title = String(title || "").trim();
    if (formData.has('description')) metadata.description = description ? String(description).trim() : null;
    if (formData.has('category')) metadata.category = category ? String(category).trim() : null;
    if (formData.has('scope')) metadata.scope = scope ? String(scope).trim() : null;
    if (formData.has('tags')) metadata.tags = tags ? String(tags) : '';
    if (formData.has('client_id')) metadata.client_id = clientId ? parseInt(clientId) : null;
    if (formData.has('doc_year')) metadata.doc_year = docYear ? parseInt(docYear) : null;
    if (formData.has('doc_month')) metadata.doc_month = docMonth ? parseInt(docMonth) : null;
    if (formData.has('task_id')) metadata.task_id = taskId ? parseInt(taskId) : null;
  } else {
    // JSON 请求：仅更新元数据
    metadata = await request.json();
  }
  
  // 构建更新 SQL
  const updates = [];
  const binds = [];
  
  // 处理元数据字段
  if (metadata.hasOwnProperty('title') && metadata.title !== undefined) {
    updates.push("title = ?");
    binds.push(String(metadata.title || "").trim());
  }
  if (metadata.hasOwnProperty('description') && metadata.description !== undefined) {
    updates.push("description = ?");
    binds.push(String(metadata.description || "").trim() || null);
  }
  if (metadata.hasOwnProperty('category') && metadata.category !== undefined) {
    updates.push("category = ?");
    binds.push(String(metadata.category || "").trim() || null);
  }
  if (metadata.hasOwnProperty('scope') && metadata.scope !== undefined) {
    const scope = String(metadata.scope || "").trim();
    // 验证 scope 必须是 'service' 或 'task'
    if (scope && scope !== 'service' && scope !== 'task') {
      // 如果文件已上传但验证失败，删除新上传的文件
      if (newFileUrl && env.R2_BUCKET) {
        try {
          await env.R2_BUCKET.delete(newFileUrl);
        } catch (err) {
          console.warn(`[Documents Update] Failed to delete newly uploaded file:`, err);
        }
      }
      return errorResponse(422, "VALIDATION_ERROR", "適用層級必須是 'service' 或 'task'", 
        [{ field: "scope", message: "適用層級必須是 'service' 或 'task'" }], requestId);
    }
    updates.push("scope = ?");
    binds.push(scope || null);
  }
  if (metadata.hasOwnProperty('tags') && metadata.tags !== undefined) {
    const tagsStr = Array.isArray(metadata.tags) ? metadata.tags.join(',') : String(metadata.tags || "");
    updates.push("tags = ?");
    binds.push(tagsStr);
  }
  if (metadata.hasOwnProperty('client_id') && metadata.client_id !== undefined) {
    updates.push("client_id = ?");
    binds.push(metadata.client_id ? parseInt(metadata.client_id) : null);
  }
  if (metadata.hasOwnProperty('doc_year') && metadata.doc_year !== undefined) {
    updates.push("doc_year = ?");
    binds.push(metadata.doc_year ? parseInt(metadata.doc_year) : null);
  }
  if (metadata.hasOwnProperty('doc_month') && metadata.doc_month !== undefined) {
    updates.push("doc_month = ?");
    binds.push(metadata.doc_month ? parseInt(metadata.doc_month) : null);
  }
  if (metadata.hasOwnProperty('task_id') && metadata.task_id !== undefined) {
    updates.push("task_id = ?");
    binds.push(metadata.task_id ? parseInt(metadata.task_id) : null);
  }
  
  // 如果有文件上传错误，返回错误（但允许仅更新元数据的情况）
  if (fileUploadError && updates.length === 0) {
    return errorResponse(500, "FILE_UPLOAD_ERROR", `文件上傳失敗: ${fileUploadError}，已保留原有文件`, null, requestId);
  }
  
  // 如果有新文件上传成功，更新文件相关字段
  if (newFileUrl && !fileUploadError) {
    updates.push("file_url = ?");
    binds.push(newFileUrl);
    updates.push("file_name = ?");
    binds.push(newFileName);
    updates.push("file_size = ?");
    binds.push(newFileSize);
    updates.push("file_type = ?");
    binds.push(newFileType);
  }
  
  // 如果没有可更新的字段
  if (updates.length === 0) {
    // 如果文件已上传但验证失败，删除新上传的文件
    if (newFileUrl && env.R2_BUCKET) {
      try {
        await env.R2_BUCKET.delete(newFileUrl);
      } catch (err) {
        console.warn(`[Documents Update] Failed to delete newly uploaded file:`, err);
      }
    }
    return errorResponse(400, "BAD_REQUEST", "沒有可更新的欄位", null, requestId);
  }
  
  updates.push("updated_at = ?");
  binds.push(new Date().toISOString());
  binds.push(docId);
  
  try {
    // 更新数据库
    await env.DATABASE.prepare(
      `UPDATE InternalDocuments SET ${updates.join(", ")} WHERE document_id = ?`
    ).bind(...binds).run();
    
    // 如果新文件上传成功且数据库更新成功，删除旧文件
    if (newFileUrl && !fileUploadError && oldFileUrl && env.R2_BUCKET) {
      try {
        await env.R2_BUCKET.delete(oldFileUrl);
      } catch (err) {
        console.warn(`[Documents Update] Failed to delete old R2 file ${oldFileUrl}:`, err);
        // 继续执行，即使旧文件删除失败
      }
    }
    
    // 清除文档列表的 KV 缓存
    await deleteKVCacheByPrefix(env, 'documents_list').catch(() => {});
    
    const responseData = { document_id: docId };
    if (newFileUrl && !fileUploadError) {
      responseData.fileUrl = newFileUrl;
      responseData.fileName = newFileName;
      responseData.fileSize = newFileSize;
    }
    
    let message = "已更新";
    if (newFileUrl && !fileUploadError) {
      message = "已更新（包含文件更換）";
    } else if (fileUploadError) {
      message = `已更新元數據，但文件上傳失敗: ${fileUploadError}，已保留原有文件`;
    }
    
    return successResponse(responseData, message, requestId);
  } catch (dbError) {
    // 如果数据库更新失败，删除新上传的文件
    if (newFileUrl && env.R2_BUCKET) {
      try {
        await env.R2_BUCKET.delete(newFileUrl);
      } catch (err) {
        console.warn(`[Documents Update] Failed to delete newly uploaded file after DB error:`, err);
      }
    }
    console.error(`[Documents Update] Database error:`, dbError);
    return errorResponse(500, "DATABASE_ERROR", `更新失敗: ${dbError.message || '未知錯誤'}`, null, requestId);
  }
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
  
  // 软删除数据库记录（僅執行軟刪除，不從 R2 刪除文件）
  await env.DATABASE.prepare(
    `UPDATE InternalDocuments SET is_deleted = 1, updated_at = ? WHERE document_id = ?`
  ).bind(new Date().toISOString(), docId).run();
  
  // 清除文档列表的 KV 缓存
  await deleteKVCacheByPrefix(env, 'documents_list').catch(() => {});
  
  return successResponse({ document_id: docId }, "已刪除", requestId);
}

/**
 * 批量删除文档
 */
export async function handleBatchDeleteDocuments(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 驗證用戶身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const documentIds = body?.document_ids || body?.ids || [];
  
  // 驗證輸入參數
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return errorResponse(422, "VALIDATION_ERROR", "文檔ID列表不能為空", 
      [{ field: "document_ids", message: "必須提供至少一個文檔ID" }], requestId);
  }
  
  // 驗證所有 ID 都是有效的數字
  const validDocumentIds = documentIds
    .map(id => parseInt(id, 10))
    .filter(id => Number.isInteger(id) && id > 0);
  
  if (validDocumentIds.length === 0) {
    return errorResponse(422, "VALIDATION_ERROR", "無效的文檔ID", 
      [{ field: "document_ids", message: "所有ID必須為正整數" }], requestId);
  }
  
  try {
    // 獲取所有文檔信息，用於權限檢查
    const placeholders = validDocumentIds.map(() => '?').join(',');
    const documents = await env.DATABASE.prepare(
      `SELECT document_id, uploaded_by, file_url 
       FROM InternalDocuments 
       WHERE document_id IN (${placeholders}) AND is_deleted = 0`
    ).bind(...validDocumentIds).all();
    
    if (!documents?.results || documents.results.length === 0) {
      return errorResponse(404, "NOT_FOUND", "未找到任何文檔記錄", null, requestId);
    }
    
    const foundDocuments = documents.results;
    const foundIds = new Set(foundDocuments.map(d => d.document_id));
    const missingIds = validDocumentIds.filter(id => !foundIds.has(id));
    
    // 處理每個文檔的刪除
    const successIds = [];
    const failedIds = [];
    const unauthorizedIds = [];
    const notFoundIds = [...missingIds];
    
    const updatedAt = new Date().toISOString();
    
    for (const doc of foundDocuments) {
      const docId = doc.document_id;
      
      // 權限檢查：只有上傳者或管理員可以刪除
      if (String(doc.uploaded_by) !== String(user.user_id) && !user.is_admin) {
        unauthorizedIds.push(docId);
        failedIds.push(docId);
        continue;
      }
      
      try {
        // 執行軟刪除（僅設置 is_deleted = 1，不從 R2 刪除文件）
        await env.DATABASE.prepare(
          `UPDATE InternalDocuments SET is_deleted = 1, updated_at = ? WHERE document_id = ?`
        ).bind(updatedAt, docId).run();
        
        successIds.push(docId);
      } catch (err) {
        console.error(`[BatchDeleteDocuments] Failed to delete document ${docId}:`, err);
        failedIds.push(docId);
      }
    }
    
    // 如果所有資源都無權限或不存在，返回錯誤
    if (successIds.length === 0) {
      if (unauthorizedIds.length > 0 && notFoundIds.length === 0) {
        return errorResponse(403, "FORBIDDEN", 
          `無權限刪除以下文檔: ${unauthorizedIds.join(', ')}`, null, requestId);
      } else if (notFoundIds.length > 0 && unauthorizedIds.length === 0) {
        return errorResponse(404, "NOT_FOUND", 
          `以下文檔不存在: ${notFoundIds.join(', ')}`, null, requestId);
      } else {
        const allFailed = [...unauthorizedIds, ...notFoundIds];
        return errorResponse(403, "FORBIDDEN", 
          `無權限刪除或文檔不存在: ${allFailed.join(', ')}`, null, requestId);
      }
    }
    
    // 清除文檔列表的 KV 緩存
    await deleteKVCacheByPrefix(env, 'documents_list').catch(() => {});
    
    // 構建響應數據
    const responseData = {
      success_count: successIds.length,
      failed_count: failedIds.length,
      success_ids: successIds,
      failed_ids: failedIds.length > 0 ? failedIds : undefined,
    };
    
    // 如果有失敗的，添加詳細信息
    if (unauthorizedIds.length > 0) {
      responseData.unauthorized_ids = unauthorizedIds;
    }
    if (notFoundIds.length > 0) {
      responseData.not_found_ids = notFoundIds;
    }
    
    // 構建消息
    let message = `已成功刪除 ${successIds.length} 筆文檔`;
    if (failedIds.length > 0) {
      message += `，${failedIds.length} 筆失敗`;
    }
    
    return successResponse(responseData, message, requestId);
    
  } catch (err) {
    console.error('[BatchDeleteDocuments] Error:', err);
    return errorResponse(500, "INTERNAL_ERROR", 
      `批量刪除處理失敗: ${err?.message || err}`, null, requestId);
  }
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

/**
 * 生成預覽 URL
 * 用於 Office 文件等需要公開 URL 的預覽場景
 */
export async function handleGetPreviewUrl(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const docId = match[1];
  
  try {
    // 獲取文檔信息
    const doc = await env.DATABASE.prepare(`
      SELECT document_id, file_url, file_name, file_type, uploaded_by
      FROM InternalDocuments
      WHERE document_id = ? AND is_deleted = 0
    `).bind(docId).first();
    
    if (!doc) {
      return errorResponse(404, "NOT_FOUND", "文檔不存在", null, requestId);
    }
    
    // 權限檢查：所有登入用戶都可以生成預覽 URL
    if (!user) {
      return errorResponse(401, "UNAUTHORIZED", "未授權", null, requestId);
    }
    
    // 檢查 R2 是否配置
    if (!env.R2_BUCKET) {
      return errorResponse(500, "CONFIG_ERROR", "R2 存储未配置", null, requestId);
    }
    
    // 檢查文件是否存在於 R2（使用 get 方法檢查）
    const object = await env.R2_BUCKET.get(doc.file_url);
    if (!object) {
      return errorResponse(404, "FILE_NOT_FOUND", "文件不存在於存儲中", null, requestId);
    }
    
    // 生成簽名 URL（過期時間 1 小時）
    const expiresIn = 3600; // 1 小時
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    
    // 生成簽名 token
    const secret = String(env.PREVIEW_SIGNING_SECRET || env.UPLOAD_SIGNING_SECRET || "change-me");
    const payload = {
      documentId: docId,
      fileUrl: doc.file_url,
      userId: String(user.user_id),
      exp: expiresAt
    };
    
    // 使用與 attachments 相同的簽名邏輯
    const b64urlEncode = (u8) => {
      const b64 = btoa(String.fromCharCode(...u8));
      return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    };
    
    const utf8 = (str) => new TextEncoder().encode(str);
    
    const hmacSha256 = async (keyBytes, msgBytes) => {
      const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
      return new Uint8Array(sig);
    };
    
    const pBytes = utf8(JSON.stringify(payload));
    const sig = await hmacSha256(utf8(secret), pBytes);
    const token = `${b64urlEncode(pBytes)}.${b64urlEncode(sig)}`;
    
    // 構建預覽 URL（指向 Worker 的預覽代理端點）
    const previewUrl = `${url.origin}/api/v2/documents/${docId}/preview?token=${token}`;
    
    return successResponse({
      previewUrl,
      expiresAt,
      expiresIn
    }, "預覽 URL 生成成功", requestId);
    
  } catch (err) {
    console.error(`[Documents Preview URL] Error:`, err);
    return errorResponse(500, "PREVIEW_URL_ERROR", "生成預覽 URL 失敗", null, requestId);
  }
}

/**
 * 預覽文件代理端點
 * 驗證簽名並從 R2 返回文件內容
 * 注意：此端點不需要用戶認證，簽名驗證即為認證
 */
export async function handlePreviewDocument(request, env, ctx, requestId, match, url) {
  const docId = match[1];
  const token = url.searchParams.get("token") || "";
  
  try {
    // 驗證 token
    const parts = token.split(".");
    if (parts.length !== 2) {
      return errorResponse(400, "BAD_REQUEST", "簽名無效", null, requestId);
    }
    
    const secret = String(env.PREVIEW_SIGNING_SECRET || env.UPLOAD_SIGNING_SECRET || "change-me");
    
    const b64urlDecode = (str) => {
      const b64 = str.replaceAll("-", "+").replaceAll("_", "/");
      const pad = (4 - (b64.length % 4)) % 4;
      const padded = b64 + "=".repeat(pad);
      return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    };
    
    const utf8 = (str) => new TextEncoder().encode(str);
    
    const hmacSha256 = async (keyBytes, msgBytes) => {
      const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
      return new Uint8Array(sig);
    };
    
    const b64urlEncode = (u8) => {
      const b64 = btoa(String.fromCharCode(...u8));
      return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    };
    
    const payloadBytes = b64urlDecode(parts[0]);
    const sigBytes = b64urlDecode(parts[1]);
    
    // 驗證簽名
    const expectedSig = await hmacSha256(utf8(secret), payloadBytes);
    const expectedSigB64 = b64urlEncode(expectedSig);
    
    if (parts[1] !== expectedSigB64) {
      return errorResponse(400, "BAD_REQUEST", "簽名驗證失敗", null, requestId);
    }
    
    // 解析 payload
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    
    // 檢查過期時間
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return errorResponse(400, "BAD_REQUEST", "預覽 URL 已過期", null, requestId);
    }
    
    // 驗證文檔 ID 匹配
    if (String(payload.documentId) !== String(docId)) {
      return errorResponse(400, "BAD_REQUEST", "文檔 ID 不匹配", null, requestId);
    }
    
    // 獲取文檔信息
    const doc = await env.DATABASE.prepare(`
      SELECT file_url, file_name, file_type
      FROM InternalDocuments
      WHERE document_id = ? AND is_deleted = 0
    `).bind(docId).first();
    
    if (!doc) {
      return errorResponse(404, "NOT_FOUND", "文檔不存在", null, requestId);
    }
    
    // 驗證 file_url 匹配
    if (doc.file_url !== payload.fileUrl) {
      return errorResponse(400, "BAD_REQUEST", "文件 URL 不匹配", null, requestId);
    }
    
    // 檢查 R2 是否配置
    if (!env.R2_BUCKET) {
      return errorResponse(500, "CONFIG_ERROR", "R2 存储未配置", null, requestId);
    }
    
    // 從 R2 獲取文件
    const object = await env.R2_BUCKET.get(doc.file_url);
    
    if (!object) {
      return errorResponse(404, "FILE_NOT_FOUND", "文件不存在於存儲中", null, requestId);
    }
    
    // 返回文件（用於預覽，不設置 attachment）
    return new Response(object.body, {
      headers: {
        'Content-Type': doc.file_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.file_name)}"`,
        'Cache-Control': 'private, max-age=3600',
        'Access-Control-Allow-Origin': '*', // 允許 Google Docs Viewer 等外部服務訪問
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Range'
      }
    });
    
  } catch (err) {
    console.error(`[Documents Preview] Error:`, err);
    return errorResponse(500, "PREVIEW_ERROR", "預覽失敗", null, requestId);
  }
}
