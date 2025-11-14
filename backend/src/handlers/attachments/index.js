/**
 * 附件管理 Handler
 */

import { successResponse, errorResponse } from "../../utils/response.js";

function b64urlEncode(u8) {
  const b64 = btoa(String.fromCharCode(...u8));
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmacSha256(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
  return new Uint8Array(sig);
}

function utf8(str) { return new TextEncoder().encode(str); }

function sanitizeFilename(name) {
  const n = String(name || "");
  return n.replace(/[\\/]/g, "_").replace(/\.{2,}/g, ".").slice(0, 200) || "file";
}

function extFromFilename(name) {
  const m = String(name||"").toLowerCase().match(/\.([a-z0-9]{1,10})$/);
  return m ? m[1] : "";
}

/**
 * 获取附件列表
 */
export async function handleGetAttachments(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const entityType = (params.get("entity_type") || params.get("type") || "").trim();
  const entityId = (params.get("entity_id") || params.get("client") || "").trim();
  
  // 如果没有指定 entity_type 和 entity_id，返回所有附件（用于知识库附件列表）
  if (!entityType && !entityId) {
    // 允许不传参数，返回所有附件
    const page = Math.max(1, parseInt(params.get("page") || params.get("per_page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || params.get("per_page") || "20", 10)));
    const offset = (page - 1) * perPage;
    const q = (params.get("q") || "").trim();
    const fileType = (params.get("file_type") || "all").trim();
    const dateFrom = (params.get("dateFrom") || "").trim();
    const dateTo = (params.get("dateTo") || "").trim();
    const clientFilter = (params.get("client") || "").trim();
    const typeFilter = (params.get("type") || "").trim();
    
    const where = ["is_deleted = 0"];
    const binds = [];
    
    if (q) { 
      where.push("(filename LIKE ?)"); 
      binds.push(`%${q}%`); 
    }
    if (clientFilter) {
      where.push("entity_id = ? AND entity_type = 'client'");
      binds.push(clientFilter);
    }
    if (typeFilter && ['client','receipt','sop','task'].includes(typeFilter)) {
      where.push("entity_type = ?");
      binds.push(typeFilter);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) { 
      where.push("uploaded_at >= ?"); 
      binds.push(`${dateFrom}T00:00:00.000Z`); 
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) { 
      where.push("uploaded_at <= ?"); 
      binds.push(`${dateTo}T23:59:59.999Z`); 
    }
    if (fileType !== 'all') {
      if (fileType === 'pdf') { 
        where.push("(LOWER(filename) LIKE '%.pdf' OR LOWER(content_type) = 'application/pdf')"); 
      } else if (fileType === 'image') { 
        where.push("(LOWER(content_type) LIKE 'image/%' OR LOWER(filename) GLOB '*.jpg' OR LOWER(filename) GLOB '*.jpeg' OR LOWER(filename) GLOB '*.png')"); 
      } else if (fileType === 'excel') { 
        where.push("(LOWER(filename) GLOB '*.xls' OR LOWER(filename) GLOB '*.xlsx' OR LOWER(content_type) IN ('application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))"); 
      } else if (fileType === 'word') { 
        where.push("(LOWER(filename) GLOB '*.doc' OR LOWER(filename) GLOB '*.docx' OR LOWER(content_type) IN ('application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'))"); 
      }
    }
    
    const whereSql = `WHERE ${where.join(" AND ")}`;
    
    const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM Attachments ${whereSql}`).bind(...binds).first();
    const total = Number(countRow?.total || 0);
    
    const sql = `SELECT a.attachment_id, a.entity_type, a.entity_id, a.filename, a.content_type, a.size_bytes, a.uploader_user_id, a.uploaded_at
                 FROM Attachments a
                 ${whereSql}
                 ORDER BY a.uploaded_at DESC
                 LIMIT ? OFFSET ?`;
    
    const rows = await env.DATABASE.prepare(sql).bind(...binds, perPage, offset).all();
    
    // 查询上传者姓名
    const uploaderIds = [...new Set((rows?.results || []).map(r => r.uploader_user_id).filter(Boolean))];
    let uploaderMap = {};
    if (uploaderIds.length > 0) {
      const placeholders = uploaderIds.map(() => '?').join(',');
      const uploaders = await env.DATABASE.prepare(
        `SELECT user_id, name FROM Users WHERE user_id IN (${placeholders})`
      ).bind(...uploaderIds).all();
      uploaders?.results?.forEach(u => {
        uploaderMap[u.user_id] = u.name;
      });
    }
    
    const data = (rows?.results || []).map(r => ({
      id: r.attachment_id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      filename: r.filename,
      contentType: r.content_type,
      sizeBytes: Number(r.size_bytes || 0),
      uploaderUserId: r.uploader_user_id,
      uploaderName: uploaderMap[r.uploader_user_id] || String(r.uploader_user_id || ''),
      uploadedAt: r.uploaded_at,
    }));
    
    return successResponse({ attachments: data, total, page, perPage }, "查詢成功", requestId);
  }
  
  if (!entityType || !entityId) {
    return errorResponse(422, "VALIDATION_ERROR", "entity_type 與 entity_id 必填", null, requestId);
  }
  
  if (!['client','receipt','sop','task'].includes(entityType)) {
    return errorResponse(422, "VALIDATION_ERROR", "entity_type 不合法", null, requestId);
  }
  
  const page = Math.max(1, parseInt(params.get("page") || params.get("per_page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || params.get("per_page") || "20", 10)));
  const offset = (page - 1) * perPage;
  const q = (params.get("q") || "").trim();
  const fileType = (params.get("file_type") || "all").trim();
  const dateFrom = (params.get("dateFrom") || "").trim();
  const dateTo = (params.get("dateTo") || "").trim();

  const where = ["is_deleted = 0", "entity_type = ?", "entity_id = ?"];
  const binds = [entityType, entityId];
  
  if (q) { 
    where.push("(filename LIKE ?)"); 
    binds.push(`%${q}%`); 
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) { 
    where.push("uploaded_at >= ?"); 
    binds.push(`${dateFrom}T00:00:00.000Z`); 
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) { 
    where.push("uploaded_at <= ?"); 
    binds.push(`${dateTo}T23:59:59.999Z`); 
  }
  if (fileType !== 'all') {
    if (fileType === 'pdf') { 
      where.push("(LOWER(filename) LIKE '%.pdf' OR LOWER(content_type) = 'application/pdf')"); 
    } else if (fileType === 'image') { 
      where.push("(LOWER(content_type) LIKE 'image/%' OR LOWER(filename) GLOB '*.jpg' OR LOWER(filename) GLOB '*.jpeg' OR LOWER(filename) GLOB '*.png')"); 
    } else if (fileType === 'excel') { 
      where.push("(LOWER(filename) GLOB '*.xls' OR LOWER(filename) GLOB '*.xlsx' OR LOWER(content_type) IN ('application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))"); 
    } else if (fileType === 'word') { 
      where.push("(LOWER(filename) GLOB '*.doc' OR LOWER(filename) GLOB '*.docx' OR LOWER(content_type) IN ('application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'))"); 
    }
  }
  
  const whereSql = `WHERE ${where.join(" AND ")}`;
  
  const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM Attachments ${whereSql}`).bind(...binds).first();
  const total = Number(countRow?.total || 0);
  
  const sql = `SELECT a.attachment_id, a.filename, a.content_type, a.size_bytes, a.uploader_user_id, a.uploaded_at
               FROM Attachments a
               ${whereSql}
               ORDER BY a.uploaded_at DESC
               LIMIT ? OFFSET ?`;
  
  const rows = await env.DATABASE.prepare(sql).bind(...binds, perPage, offset).all();
  
  // 查询上传者姓名
  const uploaderIds = [...new Set((rows?.results || []).map(r => r.uploader_user_id).filter(Boolean))];
  let uploaderMap = {};
  if (uploaderIds.length > 0) {
    const placeholders = uploaderIds.map(() => '?').join(',');
    const uploaders = await env.DATABASE.prepare(
      `SELECT user_id, name FROM Users WHERE user_id IN (${placeholders})`
    ).bind(...uploaderIds).all();
    uploaders?.results?.forEach(u => {
      uploaderMap[u.user_id] = u.name;
    });
  }
  
  const data = (rows?.results || []).map(r => ({
    id: r.attachment_id,
    filename: r.filename,
    contentType: r.content_type,
    sizeBytes: Number(r.size_bytes || 0),
    uploaderUserId: r.uploader_user_id,
    uploaderName: uploaderMap[r.uploader_user_id] || String(r.uploader_user_id || ''),
    uploadedAt: r.uploaded_at,
  }));
  
  return successResponse({ attachments: data, total, page, perPage }, "查詢成功", requestId);
}

/**
 * 获取附件详情
 */
export async function handleGetAttachmentDetail(request, env, ctx, requestId, match) {
  const attachmentId = parseInt(match[1], 10);
  
  const attachment = await env.DATABASE.prepare(
    `SELECT attachment_id, entity_type, entity_id, object_key, filename, content_type, size_bytes, uploader_user_id, uploaded_at
     FROM Attachments 
     WHERE attachment_id = ? AND is_deleted = 0`
  ).bind(attachmentId).first();
  
  if (!attachment) {
    return errorResponse(404, "NOT_FOUND", "附件不存在", null, requestId);
  }
  
  const data = {
    id: attachment.attachment_id,
    entityType: attachment.entity_type,
    entityId: attachment.entity_id,
    objectKey: attachment.object_key,
    filename: attachment.filename,
    contentType: attachment.content_type,
    sizeBytes: Number(attachment.size_bytes || 0),
    uploaderUserId: attachment.uploader_user_id,
    uploadedAt: attachment.uploaded_at,
  };
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 删除附件
 */
export async function handleDeleteAttachment(request, env, ctx, requestId, match) {
  const attachmentId = parseInt(match[1], 10);
  
  await env.DATABASE.prepare(
    `UPDATE Attachments SET is_deleted = 1 WHERE attachment_id = ?`
  ).bind(attachmentId).run();
  
  return successResponse({ attachment_id: attachmentId }, "已刪除", requestId);
}

/**
 * 下载附件
 */
export async function handleDownloadAttachment(request, env, ctx, requestId, match) {
  const attachmentId = parseInt(match[1], 10);
  
  const attachment = await env.DATABASE.prepare(
    `SELECT object_key, filename, content_type FROM Attachments WHERE attachment_id = ? AND is_deleted = 0`
  ).bind(attachmentId).first();
  
  if (!attachment) {
    return errorResponse(404, "NOT_FOUND", "附件不存在", null, requestId);
  }
  
  if (!env.R2_BUCKET) {
    return errorResponse(500, "INTERNAL_ERROR", "R2 未綁定", null, requestId);
  }
  
  const object = await env.R2_BUCKET.get(attachment.object_key);
  if (!object) {
    return errorResponse(404, "NOT_FOUND", "檔案不存在", null, requestId);
  }
  
  return new Response(object.body, {
    headers: {
      'Content-Type': attachment.content_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${attachment.filename}"`,
    }
  });
}

/**
 * 获取上传签名
 */
export async function handleGetUploadSign(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  if (!user) {
    return errorResponse(401, "UNAUTHORIZED", "未授權", null, requestId);
  }
  
  const body = await request.json();
  const entityType = String(body?.entity_type || "").trim();
  const entityId = String(body?.entity_id || "").trim();
  const filenameRaw = String(body?.filename || "").trim();
  const contentType = String(body?.content_type || "").trim().toLowerCase();
  const contentLength = Number(body?.content_length || 0);
  
  if (!['client','receipt','sop','task'].includes(entityType)) {
    return errorResponse(422, "VALIDATION_ERROR", "entity_type 不合法", null, requestId);
  }
  if (!entityId) {
    return errorResponse(422, "VALIDATION_ERROR", "entity_id 必填", null, requestId);
  }
  if (!filenameRaw) {
    return errorResponse(422, "VALIDATION_ERROR", "filename 必填", null, requestId);
  }
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return errorResponse(422, "VALIDATION_ERROR", "content_length 不合法", null, requestId);
  }
  if (contentLength > 10 * 1024 * 1024) {
    return errorResponse(413, "PAYLOAD_TOO_LARGE", "檔案大小超過限制（最大 10MB）", null, requestId);
  }
  
  const allowedExt = ["pdf","jpg","jpeg","png","xlsx","xls","docx","doc"];
  const allowedMime = [
    "application/pdf","image/jpeg","image/png",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/msword"
  ];
  const safeName = sanitizeFilename(filenameRaw);
  const ext = extFromFilename(safeName);
  if (!allowedExt.includes(ext)) {
    return errorResponse(422, "INVALID_EXTENSION", "不支援的副檔名", null, requestId);
  }
  if (!allowedMime.includes(contentType)) {
    return errorResponse(422, "INVALID_FILE_TYPE", "不支援的檔案型別", null, requestId);
  }
  
  // 数量上限
  const limits = { client:20, receipt:5, sop:10, task:10 };
  const limit = limits[entityType] ?? 20;
  const cntRow = await env.DATABASE.prepare("SELECT COUNT(1) AS c FROM Attachments WHERE is_deleted = 0 AND entity_type = ? AND entity_id = ?").bind(entityType, entityId).first();
  if (Number(cntRow?.c || 0) >= limit) {
    return errorResponse(409, "TOO_MANY_FILES", `已達到附件數量上限（最多 ${limit} 個）`, null, requestId);
  }
  
  // 产生 objectKey 与 token
  const envName = String(env.APP_ENV || "dev");
  const now = Math.floor(Date.now()/1000);
  const rand = crypto.getRandomValues(new Uint8Array(6));
  const randStr = b64urlEncode(rand);
  const folder = `private/${envName}/attachments/${entityType}_${entityId}`;
  const objectKey = `${folder}/f_${now}_${randStr}.${ext}`;
  const expiresAt = now + 300; // 5 分钟
  const payload = {
    objectKey,
    entityType,
    entityId,
    filename: safeName,
    contentType,
    contentLength,
    userId: String(user.user_id),
    exp: expiresAt,
  };
  const secret = String(env.UPLOAD_SIGNING_SECRET || "change-me");
  const pBytes = utf8(JSON.stringify(payload));
  const sig = await hmacSha256(utf8(secret), pBytes);
  const token = `${b64urlEncode(pBytes)}.${b64urlEncode(sig)}`;
  const uploadUrl = `${url.origin}/api/v2/attachments/upload-direct?token=${token}`;
  const data = { 
    uploadUrl, 
    objectKey, 
    headers: { 
      "Content-Type": contentType, 
      "Content-Length": String(contentLength) 
    } 
  };
  
  return successResponse(data, "成功", requestId, { expiresAt });
}

/**
 * 直接上传入口
 */
export async function handleUploadDirect(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  if (!user) {
    return errorResponse(401, "UNAUTHORIZED", "未授權", null, requestId);
  }
  
  try {
    const token = url.searchParams.get("token") || "";
    const parts = token.split(".");
    if (parts.length !== 2) {
      return errorResponse(400, "BAD_REQUEST", "簽名無效", null, requestId);
    }
    
    const pBytes = Uint8Array.from(atob(parts[0].replaceAll("-","+").replaceAll("_","/")), c => c.charCodeAt(0));
    const sBytes = Uint8Array.from(atob(parts[1].replaceAll("-","+").replaceAll("_","/")), c => c.charCodeAt(0));
    const secret = String(env.UPLOAD_SIGNING_SECRET || "change-me");
    const expected = await hmacSha256(utf8(secret), pBytes);
    if (expected.length !== sBytes.length) {
      return errorResponse(400, "BAD_REQUEST", "簽名無效", null, requestId);
    }
    let okSig = 0; 
    for (let i=0;i<expected.length;i++) okSig |= (expected[i]^sBytes[i]);
    if (okSig !== 0) {
      return errorResponse(400, "BAD_REQUEST", "簽名無效", null, requestId);
    }
    
    const payload = JSON.parse(new TextDecoder().decode(pBytes));
    if (!payload || typeof payload !== 'object') {
      return errorResponse(400, "BAD_REQUEST", "簽名無效", null, requestId);
    }
    if (payload.exp < Math.floor(Date.now()/1000)) {
      return errorResponse(400, "BAD_REQUEST", "簽名已過期", null, requestId);
    }
    if (String(payload.userId) !== String(user.user_id)) {
      return errorResponse(403, "FORBIDDEN", "不允許的使用者", null, requestId);
    }
    
    // Header 验证
    const reqCt = (request.headers.get("Content-Type") || "").toLowerCase();
    const reqLen = parseInt(request.headers.get("Content-Length") || "0", 10);
    if (reqCt !== String(payload.contentType).toLowerCase()) {
      return errorResponse(415, "INVALID_FILE_TYPE", "Content-Type 不匹配", null, requestId);
    }
    if (!Number.isFinite(reqLen) || reqLen !== Number(payload.contentLength)) {
      return errorResponse(400, "VALIDATION_ERROR", "Content-Length 不匹配", null, requestId);
    }
    
    if (!env.R2_BUCKET) {
      return errorResponse(500, "INTERNAL_ERROR", "R2 未綁定", null, requestId);
    }
    
    // 写入 R2
    const cd = `attachment; filename="${sanitizeFilename(payload.filename)}"`;
    await env.R2_BUCKET.put(payload.objectKey, request.body, {
      httpMetadata: { contentType: payload.contentType, contentDisposition: cd },
      customMetadata: { ownerId: String(user.user_id), module: "attachments", entityId: `${payload.entityType}:${payload.entityId}` },
    });
    
    // 建立 DB 记录
    await env.DATABASE.prepare(
      `INSERT INTO Attachments (entity_type, entity_id, object_key, filename, content_type, size_bytes, uploader_user_id, uploaded_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(payload.entityType, payload.entityId, payload.objectKey, payload.filename, payload.contentType, String(payload.contentLength), String(user.user_id), new Date().toISOString()).run();
    
    const row = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
    
    return successResponse({ attachment_id: row?.id, object_key: payload.objectKey }, "已上傳", requestId);
  } catch (err) {
    console.error(`[Attachments] Upload error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 主 Handler
 */
export async function handleAttachments(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  // GET /attachments - 获取附件列表
  if (path === "/api/v2/attachments" && method === "GET") {
    return handleGetAttachments(request, env, ctx, requestId, url);
  }
  
  // POST /attachments/upload-sign - 获取上传签名
  if (path === "/api/v2/attachments/upload-sign" && method === "POST") {
    return handleGetUploadSign(request, env, ctx, requestId, url);
  }
  
  // PUT /attachments/upload-direct - 直接上传
  if (path === "/api/v2/attachments/upload-direct" && method === "PUT") {
    return handleUploadDirect(request, env, ctx, requestId, url);
  }
  
  // GET /attachments/:id/download - 下载附件（必须在 /attachments/:id 之前检查）
  const downloadMatch = path.match(/^\/api\/v2\/attachments\/(\d+)\/download$/);
  if (downloadMatch && method === "GET") {
    return handleDownloadAttachment(request, env, ctx, requestId, downloadMatch);
  }
  
  // GET /attachments/:id - 获取附件详情
  if (match && method === "GET") {
    return handleGetAttachmentDetail(request, env, ctx, requestId, match);
  }
  
  // DELETE /attachments/:id - 删除附件
  if (match && method === "DELETE") {
    return handleDeleteAttachment(request, env, ctx, requestId, match);
  }
  
  return errorResponse(405, "METHOD_NOT_ALLOWED", "方法不允許", null, requestId);
}

