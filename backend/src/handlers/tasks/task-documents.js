/**
 * 任务文档管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 获取任务文档列表
 */
export async function handleGetTaskDocuments(request, env, ctx, requestId, match, url) {
  const taskId = match[1];
  
  try {
    // 检查任务是否存在
    const task = await env.DATABASE.prepare(`
      SELECT task_id FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first();
    
    if (!task) {
      return errorResponse(404, "NOT_FOUND", "任務不存在", null, requestId);
    }
    
    // 获取任务文档（从InternalDocuments表中查询，通过related_task_id关联）
    const rows = await env.DATABASE.prepare(`
      SELECT document_id, title, file_name, file_size, file_type, uploaded_by, created_at as uploaded_at, related_task_id as task_id
      FROM InternalDocuments
      WHERE related_task_id = ? AND is_deleted = 0
      ORDER BY created_at DESC
    `).bind(taskId).all();
    
    const documents = (rows?.results || []).map(r => ({
      document_id: String(r.document_id),
      document_name: r.title || r.file_name,
      file_name: r.file_name,
      file_size: Number(r.file_size || 0),
      file_type: r.file_type,
      uploaded_by: r.uploaded_by || null,
      uploaded_at: r.uploaded_at,
      task_id: String(r.task_id)
    }));
    
    return successResponse(documents, "查詢成功", requestId);
  } catch (err) {
    console.error(`[Tasks] Get documents error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 删除任务文档
 */
export async function handleDeleteTaskDocument(request, env, ctx, requestId, match, url) {
  const taskId = match[1];
  const documentId = match[2];
  
  try {
    // 检查任务是否存在
    const task = await env.DATABASE.prepare(`
      SELECT task_id FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first();
    
    if (!task) {
      return errorResponse(404, "NOT_FOUND", "任務不存在", null, requestId);
    }
    
    // 检查文档是否存在且属于该任务
    const document = await env.DATABASE.prepare(`
      SELECT document_id, file_url FROM InternalDocuments 
      WHERE document_id = ? AND related_task_id = ? AND is_deleted = 0
    `).bind(documentId, taskId).first();
    
    if (!document) {
      return errorResponse(404, "NOT_FOUND", "文檔不存在", null, requestId);
    }
    
    // 从R2删除文件（如果存在）
    if (document.file_url && env.R2_BUCKET) {
      try {
        await env.R2_BUCKET.delete(document.file_url);
      } catch (err) {
        console.warn(`[Tasks] Failed to delete file from R2: ${document.file_url}`, err);
        // 继续执行，即使R2删除失败也继续删除数据库记录
      }
    }
    
    // 软删除数据库记录
    await env.DATABASE.prepare(`
      UPDATE InternalDocuments SET is_deleted = 1, updated_at = datetime('now')
      WHERE document_id = ? AND related_task_id = ?
    `).bind(documentId, taskId).run();
    
    // 清除任务缓存
    await deleteKVCacheByPrefix(env, 'task_detail').catch(() => {});
    await deleteKVCacheByPrefix(env, 'tasks_list').catch(() => {});
    
    return successResponse({ document_id: documentId }, "文檔已刪除", requestId);
  } catch (err) {
    console.error(`[Tasks] Delete document error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 上传任务文档
 */
export async function handleUploadTaskDocument(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const taskId = match[1];
  
  try {
    // 检查任务是否存在
    const task = await env.DATABASE.prepare(`
      SELECT task_id FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first();
    
    if (!task) {
      return errorResponse(404, "NOT_FOUND", "任務不存在", null, requestId);
    }
    
    // 获取上传的文件（从FormData中）
    const formData = await request.formData();
    const file = formData.get('file');
    const documentName = formData.get('document_name') || formData.get('title') || file?.name || '';
    
    if (!file || !(file instanceof File)) {
      return errorResponse(400, "BAD_REQUEST", "請選擇要上傳的檔案", null, requestId);
    }
    
    // 验证文件大小（最大 25MB）
    if (file.size > 25 * 1024 * 1024) {
      return errorResponse(413, "FILE_TOO_LARGE", "文件大小不能超過 25MB", null, requestId);
    }
    
    // 生成 R2 对象键
    const now = Date.now();
    const envName = String(env.APP_ENV || 'dev');
    const objectKey = `private/${envName}/documents/${now}_${file.name}`;
    
    // 上传到 R2
    if (!env.R2_BUCKET) {
      return errorResponse(500, "CONFIG_ERROR", "R2 未配置", null, requestId);
    }
    
    await env.R2_BUCKET.put(objectKey, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
        contentDisposition: `attachment; filename="${file.name}"`
      },
      customMetadata: {
        ownerId: String(user.user_id),
        module: 'tasks',
        taskId: String(taskId)
      }
    });
    
    // 创建数据库记录（使用InternalDocuments表）
    const nowISO = new Date().toISOString();
    const result = await env.DATABASE.prepare(`
      INSERT INTO InternalDocuments (
        title,
        file_name,
        file_url,
        file_size,
        file_type,
        category,
        related_task_id,
        uploaded_by,
        created_at,
        updated_at,
        is_deleted
      ) VALUES (?, ?, ?, ?, ?, 'task', ?, ?, ?, ?, 0)
    `).bind(
      documentName || file.name,
      file.name,
      objectKey,
      file.size,
      file.type || 'application/octet-stream',
      taskId,
      user.user_id,
      nowISO,
      nowISO
    ).run();
    
    const documentId = result.meta?.last_row_id;
    
    // 清除任务缓存
    await deleteKVCacheByPrefix(env, 'task_detail').catch(() => {});
    await deleteKVCacheByPrefix(env, 'tasks_list').catch(() => {});
    
    return successResponse({
      document_id: documentId,
      document_name: documentName || file.name,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      task_id: taskId
    }, "文檔上傳成功", requestId);
  } catch (err) {
    console.error(`[Tasks] Upload document error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

