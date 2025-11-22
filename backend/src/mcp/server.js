/**
 * MCP (Model Context Protocol) 伺服器
 * 提供 AI 工具與後端系統的整合接口
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * 創建 MCP 伺服器實例
 */
export function createMCPServer(env) {
  const server = new Server(
    {
      name: "horgoscpa-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // 註冊工具列表處理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "query_database",
          description: "執行 SQL 查詢以獲取數據庫資訊",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "要執行的 SQL 查詢語句（僅支持 SELECT）",
              },
              params: {
                type: "array",
                description: "查詢參數（可選）",
                items: {
                  type: "string",
                },
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_user_info",
          description: "獲取用戶資訊",
          inputSchema: {
            type: "object",
            properties: {
              user_id: {
                type: "string",
                description: "用戶 ID",
              },
            },
            required: ["user_id"],
          },
        },
        {
          name: "get_clients",
          description: "獲取客戶列表",
          inputSchema: {
            type: "object",
            properties: {
              status: {
                type: "string",
                description: "客戶狀態（active/inactive/all）",
                enum: ["active", "inactive", "all"],
              },
              limit: {
                type: "number",
                description: "返回數量限制",
              },
            },
          },
        },
        {
          name: "get_tasks",
          description: "獲取任務列表",
          inputSchema: {
            type: "object",
            properties: {
              status: {
                type: "string",
                description: "任務狀態",
                enum: ["pending", "in_progress", "completed", "cancelled"],
              },
              assigned_to: {
                type: "string",
                description: "負責人 ID",
              },
              limit: {
                type: "number",
                description: "返回數量限制",
              },
            },
          },
        },
        {
          name: "get_dashboard_stats",
          description: "獲取儀表板統計數據",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "search_knowledge",
          description: "搜索知識庫",
          inputSchema: {
            type: "object",
            properties: {
              keyword: {
                type: "string",
                description: "搜索關鍵字",
              },
              category: {
                type: "string",
                description: "分類",
              },
            },
            required: ["keyword"],
          },
        },
      ],
    };
  });

  // 註冊工具調用處理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "query_database":
          return await handleQueryDatabase(env, args);
        
        case "get_user_info":
          return await handleGetUserInfo(env, args);
        
        case "get_clients":
          return await handleGetClients(env, args);
        
        case "get_tasks":
          return await handleGetTasks(env, args);
        
        case "get_dashboard_stats":
          return await handleGetDashboardStats(env);
        
        case "search_knowledge":
          return await handleSearchKnowledge(env, args);
        
        default:
          throw new Error(`未知工具: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `執行失敗: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // 註冊資源列表處理器
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "horgoscpa://database/schema",
          name: "數據庫架構",
          description: "完整的數據庫表結構定義",
          mimeType: "application/json",
        },
        {
          uri: "horgoscpa://config/api",
          name: "API 配置",
          description: "API 端點和配置資訊",
          mimeType: "application/json",
        },
        {
          uri: "horgoscpa://stats/system",
          name: "系統統計",
          description: "系統運行統計資訊",
          mimeType: "application/json",
        },
      ],
    };
  });

  // 註冊資源讀取處理器
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      switch (uri) {
        case "horgoscpa://database/schema":
          return await handleGetDatabaseSchema(env);
        
        case "horgoscpa://config/api":
          return await handleGetAPIConfig(env);
        
        case "horgoscpa://stats/system":
          return await handleGetSystemStats(env);
        
        default:
          throw new Error(`未知資源: ${uri}`);
      }
    } catch (error) {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: `讀取失敗: ${error.message}`,
          },
        ],
      };
    }
  });

  return server;
}

/**
 * 工具處理函數
 */

async function handleQueryDatabase(env, args) {
  const { query, params = [] } = args;
  
  // 安全檢查：只允許 SELECT 查詢
  if (!query.trim().toUpperCase().startsWith("SELECT")) {
    throw new Error("僅支持 SELECT 查詢");
  }
  
  let stmt = env.DATABASE.prepare(query);
  if (params.length > 0) {
    stmt = stmt.bind(...params);
  }
  
  const result = await stmt.all();
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.results, null, 2),
      },
    ],
  };
}

async function handleGetUserInfo(env, args) {
  const { user_id } = args;
  
  const user = await env.DATABASE.prepare(
    `SELECT user_id, username, display_name, email, role, department, status
     FROM Users WHERE user_id = ?`
  ).bind(user_id).first();
  
  if (!user) {
    throw new Error("用戶不存在");
  }
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(user, null, 2),
      },
    ],
  };
}

async function handleGetClients(env, args) {
  const { status = "all", limit = 50 } = args;
  
  let query = `SELECT * FROM Clients`;
  const params = [];
  
  if (status !== "all") {
    query += ` WHERE status = ?`;
    params.push(status);
  }
  
  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  
  const result = await env.DATABASE.prepare(query).bind(...params).all();
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.results, null, 2),
      },
    ],
  };
}

async function handleGetTasks(env, args) {
  const { status, assigned_to, limit = 50 } = args;
  
  let query = `SELECT * FROM Tasks WHERE 1=1`;
  const params = [];
  
  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }
  
  if (assigned_to) {
    query += ` AND assigned_to = ?`;
    params.push(assigned_to);
  }
  
  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  
  const result = await env.DATABASE.prepare(query).bind(...params).all();
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.results, null, 2),
      },
    ],
  };
}

async function handleGetDashboardStats(env) {
  // 獲取各類統計數據
  const stats = {
    clients: await env.DATABASE.prepare(
      `SELECT status, COUNT(*) as count FROM Clients GROUP BY status`
    ).all(),
    tasks: await env.DATABASE.prepare(
      `SELECT status, COUNT(*) as count FROM Tasks GROUP BY status`
    ).all(),
    receipts: await env.DATABASE.prepare(
      `SELECT status, COUNT(*) as count FROM Receipts GROUP BY status`
    ).all(),
  };
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(stats, null, 2),
      },
    ],
  };
}

async function handleSearchKnowledge(env, args) {
  const { keyword, category } = args;
  
  let query = `SELECT * FROM KnowledgeBase WHERE title LIKE ? OR content LIKE ?`;
  const params = [`%${keyword}%`, `%${keyword}%`];
  
  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }
  
  query += ` ORDER BY updated_at DESC LIMIT 20`;
  
  const result = await env.DATABASE.prepare(query).bind(...params).all();
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result.results, null, 2),
      },
    ],
  };
}

/**
 * 資源處理函數
 */

async function handleGetDatabaseSchema(env) {
  const tables = await env.DATABASE.prepare(
    `SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name`
  ).all();
  
  return {
    contents: [
      {
        uri: "horgoscpa://database/schema",
        mimeType: "application/json",
        text: JSON.stringify(tables.results, null, 2),
      },
    ],
  };
}

async function handleGetAPIConfig(env) {
  const config = {
    version: "2.0.0",
    baseURL: "https://v2.horgoscpa.com/api/v2",
    endpoints: {
      auth: "/auth",
      users: "/users",
      clients: "/clients",
      tasks: "/tasks",
      timesheets: "/timesheets",
      receipts: "/receipts",
      reports: "/reports",
      knowledge: "/knowledge",
    },
    features: {
      mcp: true,
      realtime: false,
      webhooks: false,
    },
  };
  
  return {
    contents: [
      {
        uri: "horgoscpa://config/api",
        mimeType: "application/json",
        text: JSON.stringify(config, null, 2),
      },
    ],
  };
}

async function handleGetSystemStats(env) {
  const stats = {
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      type: "D1",
    },
    cache: {
      connected: true,
      type: "KV",
    },
    storage: {
      connected: true,
      type: "R2",
    },
  };
  
  return {
    contents: [
      {
        uri: "horgoscpa://stats/system",
        mimeType: "application/json",
        text: JSON.stringify(stats, null, 2),
      },
    ],
  };
}












