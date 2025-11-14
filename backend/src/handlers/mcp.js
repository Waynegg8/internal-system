/**
 * MCP (Model Context Protocol) HTTP 處理器
 * 提供 HTTP 接口讓 AI 工具與系統交互
 */

import { successResponse, errorResponse } from "../utils/response.js";

/**
 * 執行 SQL 查詢（僅支持 SELECT）
 */
export async function mcpQueryDatabase(request, env, ctx, requestId) {
  try {
    const { query, params = [] } = await request.json();
    
    // 安全檢查：只允許 SELECT 查詢
    if (!query || !query.trim().toUpperCase().startsWith("SELECT")) {
      return errorResponse("僅支持 SELECT 查詢", "INVALID_QUERY", 400, requestId);
    }
    
    let stmt = env.DATABASE.prepare(query);
    if (params.length > 0) {
      stmt = stmt.bind(...params);
    }
    
    const result = await stmt.all();
    
    return successResponse(
      {
        rows: result.results,
        count: result.results.length,
      },
      requestId
    );
  } catch (error) {
    console.error("[MCP] Query database error:", error);
    return errorResponse(`查詢失敗: ${error.message}`, "QUERY_ERROR", 500, requestId);
  }
}

/**
 * 獲取用戶資訊
 */
export async function mcpGetUserInfo(request, env, ctx, requestId) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("user_id");
    
    if (!userId) {
      return errorResponse("缺少 user_id 參數", "MISSING_PARAMETER", 400, requestId);
    }
    
    const user = await env.DATABASE.prepare(
      `SELECT user_id, username, display_name, email, role, department, status, 
              base_salary, overtime_rate, created_at, updated_at
       FROM Users WHERE user_id = ?`
    ).bind(userId).first();
    
    if (!user) {
      return errorResponse("用戶不存在", "USER_NOT_FOUND", 404, requestId);
    }
    
    return successResponse(user, requestId);
  } catch (error) {
    console.error("[MCP] Get user info error:", error);
    return errorResponse(`獲取用戶資訊失敗: ${error.message}`, "GET_USER_ERROR", 500, requestId);
  }
}

/**
 * 獲取客戶列表
 */
export async function mcpGetClients(request, env, ctx, requestId) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "all";
    const limit = parseInt(url.searchParams.get("limit") || "50");
    
    let query = `SELECT * FROM Clients`;
    const params = [];
    
    if (status !== "all") {
      query += ` WHERE status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    
    const result = await env.DATABASE.prepare(query).bind(...params).all();
    
    return successResponse(
      {
        clients: result.results,
        count: result.results.length,
      },
      requestId
    );
  } catch (error) {
    console.error("[MCP] Get clients error:", error);
    return errorResponse(`獲取客戶列表失敗: ${error.message}`, "GET_CLIENTS_ERROR", 500, requestId);
  }
}

/**
 * 獲取任務列表
 */
export async function mcpGetTasks(request, env, ctx, requestId) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const assignedTo = url.searchParams.get("assigned_to");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    
    let query = `SELECT * FROM ActiveTasks WHERE is_deleted = 0`;
    const params = [];
    
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    
    if (assignedTo) {
      query += ` AND assigned_to = ?`;
      params.push(assignedTo);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    
    const result = await env.DATABASE.prepare(query).bind(...params).all();
    
    return successResponse(
      {
        tasks: result.results,
        count: result.results.length,
      },
      requestId
    );
  } catch (error) {
    console.error("[MCP] Get tasks error:", error);
    return errorResponse(`獲取任務列表失敗: ${error.message}`, "GET_TASKS_ERROR", 500, requestId);
  }
}

/**
 * 獲取儀表板統計
 */
export async function mcpGetDashboardStats(request, env, ctx, requestId) {
  try {
    const [clientStats, taskStats, receiptStats, timesheetStats] = await Promise.all([
      env.DATABASE.prepare(
        `SELECT COUNT(*) as count FROM Clients WHERE is_deleted = 0`
      ).first(),
      env.DATABASE.prepare(
        `SELECT status, COUNT(*) as count FROM ActiveTasks WHERE is_deleted = 0 GROUP BY status`
      ).all(),
      env.DATABASE.prepare(
        `SELECT status, COUNT(*) as count FROM Receipts WHERE is_deleted = 0 GROUP BY status`
      ).all(),
      env.DATABASE.prepare(
        `SELECT 
          COUNT(*) as total_entries,
          SUM(hours) as total_hours
         FROM Timesheets 
         WHERE is_deleted = 0 AND work_date >= DATE('now', 'start of month')`
      ).first(),
    ]);
    
    return successResponse(
      {
        clients: { total: clientStats.count || 0 },
        tasks: taskStats.results || [],
        receipts: receiptStats.results || [],
        timesheets: timesheetStats || { total_entries: 0, total_hours: 0 },
      },
      requestId
    );
  } catch (error) {
    console.error("[MCP] Get dashboard stats error:", error);
    return errorResponse(`獲取統計數據失敗: ${error.message}`, "GET_STATS_ERROR", 500, requestId);
  }
}

/**
 * 搜索知識庫
 */
export async function mcpSearchKnowledge(request, env, ctx, requestId) {
  try {
    const url = new URL(request.url);
    const keyword = url.searchParams.get("keyword");
    const category = url.searchParams.get("category");
    
    if (!keyword) {
      return errorResponse("缺少 keyword 參數", "MISSING_PARAMETER", 400, requestId);
    }
    
    // 搜索 SOPDocuments 和 InternalFAQ
    const sopQuery = `SELECT 'SOP' as type, sop_id as id, title, content, category, tags, created_at, updated_at 
                      FROM SOPDocuments 
                      WHERE is_deleted = 0 AND (title LIKE ? OR content LIKE ?)`;
    const faqQuery = `SELECT 'FAQ' as type, faq_id as id, question as title, answer as content, category, tags, created_at, updated_at 
                      FROM InternalFAQ 
                      WHERE is_deleted = 0 AND (question LIKE ? OR answer LIKE ?)`;
    
    const params = [`%${keyword}%`, `%${keyword}%`];
    
    const [sopResults, faqResults] = await Promise.all([
      env.DATABASE.prepare(sopQuery).bind(...params).all(),
      env.DATABASE.prepare(faqQuery).bind(...params).all(),
    ]);
    
    const combinedResults = [...(sopResults.results || []), ...(faqResults.results || [])];
    const result = { results: combinedResults.slice(0, 20) };
    
    return successResponse(
      {
        items: result.results,
        count: result.results.length,
      },
      requestId
    );
  } catch (error) {
    console.error("[MCP] Search knowledge error:", error);
    return errorResponse(`搜索知識庫失敗: ${error.message}`, "SEARCH_ERROR", 500, requestId);
  }
}

/**
 * 獲取數據庫架構
 */
export async function mcpGetDatabaseSchema(request, env, ctx, requestId) {
  try {
    const tables = await env.DATABASE.prepare(
      `SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name`
    ).all();
    
    return successResponse(
      {
        tables: tables.results,
        count: tables.results.length,
      },
      requestId
    );
  } catch (error) {
    console.error("[MCP] Get database schema error:", error);
    return errorResponse(`獲取數據庫架構失敗: ${error.message}`, "GET_SCHEMA_ERROR", 500, requestId);
  }
}

/**
 * 獲取 API 配置資訊
 */
export async function mcpGetAPIConfig(request, env, ctx, requestId) {
  try {
    const config = {
      version: "2.0.0",
      baseURL: "https://v2.horgoscpa.com/api/v2",
      endpoints: {
        auth: {
          login: "POST /auth/login",
          logout: "POST /auth/logout",
          me: "GET /auth/me",
        },
        users: {
          list: "GET /users",
          get: "GET /users/:id",
          create: "POST /users",
          update: "PUT /users/:id",
          delete: "DELETE /users/:id",
        },
        clients: {
          list: "GET /clients",
          get: "GET /clients/:id",
          create: "POST /clients",
          update: "PUT /clients/:id",
          delete: "DELETE /clients/:id",
        },
        tasks: {
          list: "GET /tasks",
          get: "GET /tasks/:id",
          create: "POST /tasks",
          update: "PUT /tasks/:id",
          delete: "DELETE /tasks/:id",
        },
        timesheets: {
          list: "GET /timesheets",
          create: "POST /timesheets",
          update: "PUT /timesheets/:id",
          delete: "DELETE /timesheets/:id",
        },
        receipts: {
          list: "GET /receipts",
          get: "GET /receipts/:id",
          create: "POST /receipts",
          update: "PUT /receipts/:id",
          delete: "DELETE /receipts/:id",
        },
        reports: {
          generate: "POST /reports/generate",
        },
        knowledge: {
          search: "GET /knowledge/search",
          get: "GET /knowledge/:id",
          create: "POST /knowledge",
          update: "PUT /knowledge/:id",
        },
        mcp: {
          query: "POST /mcp/query",
          user: "GET /mcp/user",
          clients: "GET /mcp/clients",
          tasks: "GET /mcp/tasks",
          stats: "GET /mcp/stats",
          knowledge: "GET /mcp/knowledge",
          schema: "GET /mcp/schema",
          config: "GET /mcp/config",
        },
      },
      features: {
        mcp: true,
        realtime: false,
        webhooks: false,
      },
    };
    
    return successResponse(config, requestId);
  } catch (error) {
    console.error("[MCP] Get API config error:", error);
    return errorResponse(`獲取 API 配置失敗: ${error.message}`, "GET_CONFIG_ERROR", 500, requestId);
  }
}

/**
 * 獲取 MCP 工具列表
 */
export async function mcpGetTools(request, env, ctx, requestId) {
  try {
    const tools = [
      {
        name: "query_database",
        description: "執行 SQL 查詢以獲取數據庫資訊（僅支持 SELECT）",
        method: "POST",
        endpoint: "/mcp/query",
        parameters: {
          query: "string (required) - SQL SELECT 查詢語句",
          params: "array (optional) - 查詢參數",
        },
      },
      {
        name: "get_user_info",
        description: "獲取用戶資訊",
        method: "GET",
        endpoint: "/mcp/user",
        parameters: {
          user_id: "string (required) - 用戶 ID",
        },
      },
      {
        name: "get_clients",
        description: "獲取客戶列表",
        method: "GET",
        endpoint: "/mcp/clients",
        parameters: {
          status: "string (optional) - 客戶狀態 (active/inactive/all)",
          limit: "number (optional) - 返回數量限制，默認 50",
        },
      },
      {
        name: "get_tasks",
        description: "獲取任務列表",
        method: "GET",
        endpoint: "/mcp/tasks",
        parameters: {
          status: "string (optional) - 任務狀態",
          assigned_to: "string (optional) - 負責人 ID",
          limit: "number (optional) - 返回數量限制，默認 50",
        },
      },
      {
        name: "get_dashboard_stats",
        description: "獲取儀表板統計數據",
        method: "GET",
        endpoint: "/mcp/stats",
        parameters: {},
      },
      {
        name: "search_knowledge",
        description: "搜索知識庫",
        method: "GET",
        endpoint: "/mcp/knowledge",
        parameters: {
          keyword: "string (required) - 搜索關鍵字",
          category: "string (optional) - 分類",
        },
      },
      {
        name: "get_database_schema",
        description: "獲取數據庫架構資訊",
        method: "GET",
        endpoint: "/mcp/schema",
        parameters: {},
      },
      {
        name: "get_api_config",
        description: "獲取 API 配置資訊",
        method: "GET",
        endpoint: "/mcp/config",
        parameters: {},
      },
    ];
    
    return successResponse(
      {
        tools,
        count: tools.length,
      },
      requestId
    );
  } catch (error) {
    console.error("[MCP] Get tools error:", error);
    return errorResponse(`獲取工具列表失敗: ${error.message}`, "GET_TOOLS_ERROR", 500, requestId);
  }
}

