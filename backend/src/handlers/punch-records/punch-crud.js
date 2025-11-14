/**
 * 打卡记录基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取打卡记录列表
 */
export async function handleGetPunchRecords(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const params = url.searchParams;
  const queryUserId = params.get("user_id");
  
  // 确定查询的用户ID：管理员可以指定，员工只能查自己
  let targetUserId = String(user.user_id);
  if (queryUserId && user.is_admin) {
    targetUserId = String(queryUserId);
  } else if (!user.is_admin) {
    // 普通员工只能看自己的
    targetUserId = String(user.user_id);
  }
  
  const records = await env.DATABASE.prepare(`
    SELECT 
      record_id,
      user_id,
      month,
      file_name,
      file_key,
      file_size_bytes,
      file_type,
      notes,
      status,
      uploaded_at,
      confirmed_at
    FROM PunchRecords
    WHERE user_id = ? AND status = 'confirmed'
    ORDER BY month DESC, uploaded_at DESC
  `).bind(targetUserId).all();
  
  const data = (records?.results || []).map(r => ({
    recordId: r.record_id,
    userId: r.user_id,
    month: r.month,
    fileName: r.file_name,
    fileSizeBytes: r.file_size_bytes,
    fileType: r.file_type || 'application/octet-stream',
    notes: r.notes || "",
    uploadedAt: r.confirmed_at || r.uploaded_at
  }));
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 上传打卡记录文件
 */
export async function handleUploadPunchRecord(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const month = formData.get('month');
    const notes = formData.get('notes');
    
    if (!file || !month) {
      return errorResponse(400, "VALIDATION_ERROR", "缺少文件或月份", null, requestId);
    }
    
    const fileName = file.name;
    const fileSize = file.size;
    
    // 检查文件大小（10MB）
    if (fileSize > 10 * 1024 * 1024) {
      return errorResponse(400, "FILE_TOO_LARGE", "文件大小不能超过 10MB", null, requestId);
    }
    
    // 验证月份格式 (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse(400, "VALIDATION_ERROR", "月份格式必須為 YYYY-MM", null, requestId);
    }
    
    // 检查 R2 是否配置
    if (!env.R2_BUCKET) {
      return errorResponse(500, "CONFIG_ERROR", "R2 存储未配置", null, requestId);
    }
    
    // 生成文件key
    const timestamp = Date.now();
    const fileKey = `punch-records/${user.user_id}/${month}/${timestamp}-${fileName}`;
    
    // 上传到R2
    await env.R2_BUCKET.put(fileKey, file, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream'
      },
      customMetadata: {
        ownerId: String(user.user_id),
        module: 'punch-records',
        month: month
      }
    });
    
    // 创建数据库记录
    const result = await env.DATABASE.prepare(`
      INSERT INTO PunchRecords 
      (user_id, month, file_name, file_key, file_size_bytes, file_type, notes, status, confirmed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))
    `).bind(
      user.user_id,
      month,
      fileName,
      fileKey,
      fileSize,
      file.type || 'application/octet-stream',
      notes || null
    ).run();
    
    const recordId = result.meta?.last_row_id;
    
    return successResponse({
      recordId,
      fileName,
      month,
      fileSize
    }, "上傳成功", requestId);
    
  } catch (err) {
    console.error(`[Punch Records Upload] Error:`, err);
    return errorResponse(500, "UPLOAD_ERROR", "上傳失敗", null, requestId);
  }
}

/**
 * 下载或预览打卡记录文件
 */
export async function handleDownloadPunchRecord(request, env, ctx, requestId, match, url, isPreview = false) {
  const user = ctx?.user;
  const recordId = match[1];
  
  try {
    // 检查记录是否存在
    const record = await env.DATABASE.prepare(`
      SELECT record_id, user_id, file_key, file_name, file_type, status
      FROM PunchRecords
      WHERE record_id = ?
    `).bind(recordId).first();
    
    if (!record) {
      return errorResponse(404, "NOT_FOUND", "記錄不存在", null, requestId);
    }
    
    // 权限检查：用户只能访问自己的记录，管理员可以访问所有
    if (String(record.user_id) !== String(user.user_id) && !user.is_admin) {
      return errorResponse(403, "FORBIDDEN", "無權訪問此文件", null, requestId);
    }
    
    if (record.status !== 'confirmed') {
      return errorResponse(400, "FILE_NOT_READY", "文件尚未準備就緒", null, requestId);
    }
    
    // 检查 R2 是否配置
    if (!env.R2_BUCKET) {
      return errorResponse(500, "CONFIG_ERROR", "R2 存储未配置", null, requestId);
    }
    
    // 从R2获取文件
    const object = await env.R2_BUCKET.get(record.file_key);
    if (!object) {
      return errorResponse(404, "FILE_NOT_FOUND", "文件不存在於存儲中", null, requestId);
    }
    
    // 根据是否预览设置Content-Disposition
    const disposition = isPreview ? 'inline' : 'attachment';
    const headers = {
      'Content-Type': record.file_type || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename="${encodeURIComponent(record.file_name)}"`,
      'Cache-Control': 'private, max-age=3600'
    };
    
    return new Response(object.body, {
      status: 200,
      headers
    });
    
  } catch (err) {
    console.error(`[Punch Records Download] Error:`, err);
    return errorResponse(500, "DOWNLOAD_ERROR", isPreview ? "預覽失敗" : "下載失敗", null, requestId);
  }
}

/**
 * 删除打卡记录
 */
export async function handleDeletePunchRecord(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const recordId = match[1];
  
  try {
    // 检查记录是否存在
    const record = await env.DATABASE.prepare(`
      SELECT record_id, user_id, file_key, status
      FROM PunchRecords
      WHERE record_id = ?
    `).bind(recordId).first();
    
    if (!record) {
      return errorResponse(404, "NOT_FOUND", "記錄不存在", null, requestId);
    }
    
    // 权限检查：用户只能删除自己的记录
    if (String(record.user_id) !== String(user.user_id)) {
      return errorResponse(403, "FORBIDDEN", "無權刪除此記錄", null, requestId);
    }
    
    // 从R2删除文件
    if (env.R2_BUCKET && record.file_key) {
      try {
        await env.R2_BUCKET.delete(record.file_key);
      } catch (err) {
        console.warn(`[Punch Records] Failed to delete R2 file:`, err);
        // 继续执行数据库删除，即使R2删除失败
      }
    }
    
    // 软删除数据库记录
    await env.DATABASE.prepare(`
      UPDATE PunchRecords
      SET status = 'deleted', deleted_at = datetime('now')
      WHERE record_id = ?
    `).bind(recordId).run();
    
    return successResponse({ recordId }, "刪除成功", requestId);
    
  } catch (err) {
    console.error(`[Punch Records Delete] Error:`, err);
    return errorResponse(500, "DELETE_ERROR", "刪除失敗", null, requestId);
  }
}





