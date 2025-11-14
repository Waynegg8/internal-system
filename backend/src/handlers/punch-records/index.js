/**
 * 打卡记录管理主入口
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetPunchRecords, handleUploadPunchRecord, handleDownloadPunchRecord, handleDeletePunchRecord } from "./punch-crud.js";

export async function handlePunchRecords(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  // 所有用户都可以访问打卡记录功能（withAuth 中間件已驗證登入狀態）
  // 註：管理員可以為所有員工上傳/查看打卡記錄，一般員工只能操作自己的記錄
  
  try {
    // GET /api/v2/payroll/punch-records - 获取打卡记录列表
    if (method === "GET" && path === '/api/v2/payroll/punch-records') {
      return await handleGetPunchRecords(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/payroll/punch-records/upload - 上传打卡记录文件
    if (method === "POST" && path === '/api/v2/payroll/punch-records/upload') {
      return await handleUploadPunchRecord(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/payroll/punch-records/:id/download - 下载打卡记录
    if (method === "GET" && path.match(/^\/api\/v2\/payroll\/punch-records\/(\d+)\/download$/)) {
      return await handleDownloadPunchRecord(request, env, ctx, requestId, match, url, false);
    }
    
    // GET /api/v2/payroll/punch-records/:id/preview - 预览打卡记录
    if (method === "GET" && path.match(/^\/api\/v2\/payroll\/punch-records\/(\d+)\/preview$/)) {
      return await handleDownloadPunchRecord(request, env, ctx, requestId, match, url, true);
    }
    
    // GET /api/v2/payroll/punch-records/:id - 获取单条打卡记录
    if (method === "GET" && path.match(/^\/api\/v2\/payroll\/punch-records\/(\d+)$/)) {
      return await handleGetPunchRecords(request, env, ctx, requestId, url);
    }
    
    // DELETE /api/v2/payroll/punch-records/:id - 删除打卡记录
    if (method === "DELETE" && path.match(/^\/api\/v2\/payroll\/punch-records\/(\d+)$/)) {
      return await handleDeletePunchRecord(request, env, ctx, requestId, match, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Punch Records] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

