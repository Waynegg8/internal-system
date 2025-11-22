/**
 * 任務生成歷史記錄查詢 API
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 獲取任務生成歷史記錄
 * 
 * 支持按時間範圍、客戶、服務類型篩選
 * 解析 generated_tasks JSON 並返回詳細信息
 * 
 * @param {Request} request - HTTP 請求對象
 * @param {object} env - Cloudflare Workers 環境變數
 * @param {object} ctx - 執行上下文
 * @param {string} requestId - 請求 ID
 * @param {Array} match - 路由匹配結果
 * @param {URL} url - URL 對象
 * @returns {Promise<Response>} JSON 響應
 */
export async function handleGetTaskGenerationHistory(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 驗證用戶身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  // 僅管理員可以查看任務生成歷史
  if (!user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "僅管理員可以查看任務生成歷史", null, requestId);
  }
  
  try {
    const params = url.searchParams;
    
    // 解析查詢參數
    const page = Math.max(1, parseInt(params.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(params.get("page_size") || params.get("per_page") || "20", 10)));
    const offset = (page - 1) * pageSize;
    
    // 時間範圍篩選
    const dateFrom = (params.get("date_from") || params.get("dateFrom") || "").trim();
    const dateTo = (params.get("date_to") || params.get("dateTo") || "").trim();
    
    // 客戶篩選
    const clientId = (params.get("client_id") || "").trim();
    
    // 客戶服務篩選
    const clientServiceId = params.get("client_service_id");
    const clientServiceIdNum = clientServiceId ? parseInt(clientServiceId, 10) : null;
    
    // 服務類型篩選（通過 client_service_id 關聯查詢）
    const serviceType = (params.get("service_type") || "").trim();
    
    // 服務年月篩選
    const serviceYear = params.get("service_year");
    const serviceYearNum = serviceYear ? parseInt(serviceYear, 10) : null;
    const serviceMonth = params.get("service_month");
    const serviceMonthNum = serviceMonth ? parseInt(serviceMonth, 10) : null;
    
    // 生成狀態篩選
    const status = (params.get("status") || params.get("generation_status") || "").trim();
    
    // 搜索關鍵字（客戶名稱、服務名稱）
    const search = (params.get("search") || params.get("q") || "").trim();
    
    // 構建 WHERE 條件
    const where = [];
    const binds = [];
    
    // 時間範圍篩選
    if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
      where.push("date(tgh.generation_time) >= date(?)");
      binds.push(dateFrom);
    }
    if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
      where.push("date(tgh.generation_time) <= date(?)");
      binds.push(dateTo);
    }
    
    // 客戶篩選
    if (clientId) {
      where.push("tgh.client_id = ?");
      binds.push(clientId);
    }
    
    // 客戶服務篩選
    if (clientServiceIdNum && Number.isInteger(clientServiceIdNum) && clientServiceIdNum > 0) {
      where.push("tgh.client_service_id = ?");
      binds.push(clientServiceIdNum);
    }
    
    // 服務年月篩選
    if (serviceYearNum && Number.isInteger(serviceYearNum) && serviceYearNum >= 2000 && serviceYearNum <= 2100) {
      where.push("tgh.service_year = ?");
      binds.push(serviceYearNum);
    }
    if (serviceMonthNum && Number.isInteger(serviceMonthNum) && serviceMonthNum >= 1 && serviceMonthNum <= 12) {
      where.push("tgh.service_month = ?");
      binds.push(serviceMonthNum);
    }
    
    // 生成狀態篩選
    if (status && ["success", "failed", "partial"].includes(status)) {
      where.push("tgh.generation_status = ?");
      binds.push(status);
    }
    
    // 搜索關鍵字（客戶名稱、服務名稱）
    if (search) {
      where.push("(c.company_name LIKE ? OR tgh.service_name LIKE ?)");
      binds.push(`%${search}%`, `%${search}%`);
    }
    
    // 服務類型篩選（通過 JOIN ClientServices 表）
    // 注意：無論是否有服務類型篩選，都需要 JOIN ClientServices 以獲取 service_type
    if (serviceType && ["recurring", "one-time"].includes(serviceType)) {
      where.push("cs.service_type = ?");
      binds.push(serviceType);
    }
    
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    
    // 查詢總數
    const countSql = `
      SELECT COUNT(1) AS total
      FROM TaskGenerationHistory tgh
      LEFT JOIN Clients c ON c.client_id = tgh.client_id
      LEFT JOIN ClientServices cs ON cs.client_service_id = tgh.client_service_id
      ${whereSql}
    `;
    
    const countRow = await env.DATABASE.prepare(countSql).bind(...binds).first();
    const total = Number(countRow?.total || 0);
    
    // 查詢歷史記錄
    const querySql = `
      SELECT 
        tgh.history_id,
        tgh.generation_time,
        tgh.service_year,
        tgh.service_month,
        tgh.client_id,
        tgh.client_service_id,
        tgh.service_name,
        tgh.generated_tasks,
        tgh.generation_status,
        tgh.error_message,
        tgh.generated_count,
        tgh.skipped_count,
        tgh.created_at,
        c.company_name AS client_name,
        cs.service_type
      FROM TaskGenerationHistory tgh
      LEFT JOIN Clients c ON c.client_id = tgh.client_id
      LEFT JOIN ClientServices cs ON cs.client_service_id = tgh.client_service_id
      ${whereSql}
      ORDER BY tgh.generation_time DESC, tgh.history_id DESC
      LIMIT ? OFFSET ?
    `;
    
    const rows = await env.DATABASE.prepare(querySql).bind(...binds, pageSize, offset).all();
    
    // 解析並格式化歷史記錄
    const history = (rows?.results || []).map(row => {
      // 解析 generated_tasks JSON
      let generatedTasks = null;
      if (row.generated_tasks) {
        try {
          generatedTasks = typeof row.generated_tasks === 'string' 
            ? JSON.parse(row.generated_tasks) 
            : row.generated_tasks;
        } catch (err) {
          console.warn("[TaskGenerationHistory] 無法解析 generated_tasks JSON", row.history_id, err);
          generatedTasks = null;
        }
      }
      
      return {
        history_id: row.history_id,
        generation_time: row.generation_time,
        service_year: row.service_year,
        service_month: row.service_month,
        client_id: row.client_id,
        client_name: row.client_name,
        client_service_id: row.client_service_id,
        service_name: row.service_name,
        service_type: row.service_type,
        generated_tasks: generatedTasks,
        generation_status: row.generation_status,
        error_message: row.error_message,
        generated_count: row.generated_count,
        skipped_count: row.skipped_count,
        created_at: row.created_at
      };
    });
    
    return successResponse({
      history: history,
      pagination: {
        page: page,
        page_size: pageSize,
        total: total,
        total_pages: Math.ceil(total / pageSize)
      }
    }, "查詢成功", requestId);
    
  } catch (err) {
    console.error(`[TaskGenerationHistory] Error:`, err);
    console.error(`[TaskGenerationHistory] Error stack:`, err.stack);
    return errorResponse(500, "INTERNAL_ERROR", `查詢失敗: ${err.message || String(err)}`, { error: err.message, stack: err.stack }, requestId);
  }
}

