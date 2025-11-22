/**
 * 知识库主入口
 * 模块化路由到各个处理器
 */

import { errorResponse, successResponse } from "../../utils/response.js";
import { handleGetSOPList, handleGetSOPDetail, handleCreateSOP, handleUpdateSOP, handleDeleteSOP } from "./sop.js";
import { handleGetFAQList, handleGetFAQDetail, handleCreateFAQ, handleUpdateFAQ, handleDeleteFAQ } from "./faq.js";
import { handleGetDocumentsList, handleGetDocumentDetail, handleUploadDocument, handleUpdateDocument, handleDeleteDocument, handleBatchDeleteDocuments, handleDownloadDocument, handleGetPreviewUrl, handlePreviewDocument } from "./documents.js";

export async function handleKnowledge(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // SOP管理
    if (method === "GET" && path === '/api/v2/sop') {
      return await handleGetSOPList(request, env, ctx, requestId, url);
    }
    
    if (method === "GET" && path.match(/^\/api\/v2\/sop\/(\d+)$/)) {
      return await handleGetSOPDetail(request, env, ctx, requestId, match, url);
    }
    
    if (method === "POST" && path === '/api/v2/sop') {
      return await handleCreateSOP(request, env, ctx, requestId, url);
    }
    
    if (method === "PUT" && path.match(/^\/api\/v2\/sop\/(\d+)$/)) {
      return await handleUpdateSOP(request, env, ctx, requestId, match, url);
    }
    
    if (method === "DELETE" && path.match(/^\/api\/v2\/sop\/(\d+)$/)) {
      return await handleDeleteSOP(request, env, ctx, requestId, match, url);
    }
    
    // FAQ管理
    if (method === "GET" && path === '/api/v2/faq') {
      return await handleGetFAQList(request, env, ctx, requestId, url);
    }
    
    if (method === "GET" && path.match(/^\/api\/v2\/faq\/(\d+)$/)) {
      return await handleGetFAQDetail(request, env, ctx, requestId, match, url);
    }
    
    if (method === "POST" && path === '/api/v2/faq') {
      return await handleCreateFAQ(request, env, ctx, requestId, url);
    }
    
    if (method === "PUT" && path.match(/^\/api\/v2\/faq\/(\d+)$/)) {
      return await handleUpdateFAQ(request, env, ctx, requestId, match, url);
    }
    
    if (method === "DELETE" && path.match(/^\/api\/v2\/faq\/(\d+)$/)) {
      return await handleDeleteFAQ(request, env, ctx, requestId, match, url);
    }
    
    // 文档管理
    if (method === "GET" && path === '/api/v2/documents') {
      return await handleGetDocumentsList(request, env, ctx, requestId, url);
    }
    
    if (method === "GET" && path.match(/^\/api\/v2\/documents\/(\d+)$/)) {
      return await handleGetDocumentDetail(request, env, ctx, requestId, match, url);
    }
    
    if (method === "POST" && path === '/api/v2/documents/upload') {
      return await handleUploadDocument(request, env, ctx, requestId, url);
    }
    
    if (method === "PUT" && path.match(/^\/api\/v2\/documents\/(\d+)$/)) {
      return await handleUpdateDocument(request, env, ctx, requestId, match, url);
    }
    
    if (method === "DELETE" && path.match(/^\/api\/v2\/documents\/(\d+)$/)) {
      return await handleDeleteDocument(request, env, ctx, requestId, match, url);
    }
    
    if (method === "DELETE" && path === '/api/v2/documents/batch') {
      return await handleBatchDeleteDocuments(request, env, ctx, requestId, url);
    }
    
    if (method === "GET" && path.match(/^\/api\/v2\/documents\/(\d+)\/download$/)) {
      return await handleDownloadDocument(request, env, ctx, requestId, match, url);
    }
    
    if (method === "GET" && path.match(/^\/api\/v2\/documents\/(\d+)\/preview-url$/)) {
      return await handleGetPreviewUrl(request, env, ctx, requestId, match, url);
    }
    
    if (method === "GET" && path.match(/^\/api\/v2\/documents\/(\d+)\/preview$/)) {
      return await handlePreviewDocument(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/settings/sops - 获取SOP列表（用于系统设定）
    if (method === "GET" && path === '/api/v2/settings/sops') {
      const params = url.searchParams;
      const scope = params.get("scope"); // service 或 task
      
      let query = `
        SELECT sop_id as document_id, title, category, client_id, scope, tags, content, created_at, updated_at
        FROM SOPDocuments
        WHERE is_deleted = 0
      `;
      const binds = [];
      
      if (scope) {
        query += ` AND scope = ?`;
        binds.push(scope);
      }
      
      query += ` ORDER BY title ASC`;
      
      const stmt = binds.length > 0 
        ? env.DATABASE.prepare(query).bind(...binds)
        : env.DATABASE.prepare(query);
      
      const rows = await stmt.all();
      const data = (rows?.results || []).map(r => ({
        document_id: r.document_id,
        title: r.title || "",
        category: r.category || null,
        client_id: r.client_id || null,
        scope: r.scope || "service",
        tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [],
        content: r.content || "",
        created_at: r.created_at,
        updated_at: r.updated_at
      }));
      
      return successResponse(data, "查詢成功", requestId);
    }
    
    // GET /api/v2/settings/documents - 获取文档列表（用于系统设定）
    if (method === "GET" && path === '/api/v2/settings/documents') {
      const params = url.searchParams;
      const category = params.get("category");
      
      let query = `
        SELECT document_id, title, file_name, file_size, file_type, category, uploaded_by, created_at as uploaded_at
        FROM InternalDocuments
        WHERE is_deleted = 0
      `;
      const binds = [];
      
      if (category) {
        query += ` AND category = ?`;
        binds.push(category);
      }
      
      query += ` ORDER BY created_at DESC`;
      
      const stmt = binds.length > 0 
        ? env.DATABASE.prepare(query).bind(...binds)
        : env.DATABASE.prepare(query);
      
      const rows = await stmt.all();
      const data = (rows?.results || []).map(r => ({
        document_id: r.document_id,
        document_name: r.title || r.file_name || "",
        file_name: r.file_name || "",
        file_size: r.file_size || 0,
        file_type: r.file_type || "",
        category: r.category || null,
        uploaded_by: r.uploaded_by || null,
        uploaded_at: r.uploaded_at
      }));
      
      return successResponse(data, "查詢成功", requestId);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Knowledge] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

