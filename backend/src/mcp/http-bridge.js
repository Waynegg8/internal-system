/**
 * MCP HTTP 橋接器
 * 將 HTTP REST API 端點包裝為標準 MCP 伺服器
 * 讓 Cursor 可以透過 MCP 協議查詢資料庫
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// API 基礎 URL
const API_BASE_URL = process.env.MCP_API_URL || "https://v2.horgoscpa.com/api/v2";

// 取得可用的 fetch（Node 18 以下使用 undici 作為後援）
let runtimeFetch = globalThis.fetch;
async function ensureFetch() {
  if (!runtimeFetch) {
    try {
      const undici = await import("undici");
      runtimeFetch = undici.fetch;
    } catch (e) {
      // 保持為 undefined，稍後呼叫時會有明確錯誤訊息
    }
  }
  if (!runtimeFetch) {
    throw new Error("fetch 不可用，請使用 Node 18+ 或安裝 undici 依賴");
  }
  return runtimeFetch;
}

/**
 * 具超時的安全 fetch，避免 MCP 初始化時因外部 API 無回應而卡住
 */
async function safeFetch(url, options = {}, timeoutMs = 3000) {
  const fetchImpl = await ensureFetch();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 建立 MCP 伺服器
 */
async function createServer() {
  const server = new Server(
    {
      name: "horgoscpa-mcp-http-bridge",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {
          subscribe: false,
          listChanged: false,
        },
      },
    }
  );

  // 註冊工具列表處理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // 提供一組穩定且嚴格定義的工具清單（避免動態 Schema 造成相容性問題）
    return {
      tools: [
        {
          name: "query_database",
          description: "執行 SQL 查詢以獲取數據庫資訊（僅支持 SELECT）",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "SQL SELECT 查詢語句",
              },
              params: {
                type: "array",
                description: "查詢參數（可選）",
                items: { type: "string" },
              },
            },
            required: ["query"],
            additionalProperties: false,
          },
        },
        {
          name: "get_database_schema",
          description: "獲取數據庫架構資訊",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "get_api_config",
          description: "獲取 API 配置資訊",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
        {
          name: "get_dashboard_stats",
          description: "獲取儀表板統計數據",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
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
                description: "分類（可選）",
              },
            },
            required: ["keyword"],
            additionalProperties: false,
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
                description: "客戶狀態 (active/inactive/all)",
                enum: ["active", "inactive", "all"],
              },
              limit: {
                type: "number",
                description: "返回數量限制，默認 50",
              },
            },
            additionalProperties: false,
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
              },
              assigned_to: {
                type: "string",
                description: "負責人 ID",
              },
              limit: {
                type: "number",
                description: "返回數量限制，默認 50",
              },
            },
            additionalProperties: false,
          },
        },
      ],
    };
  });

  // 註冊資源列表處理器
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      // 從 API 獲取資源列表
      const response = await safeFetch(`${API_BASE_URL}/mcp/resources`);
      const data = await response.json();

      if (data.ok && data.data?.resources) {
        return {
          resources: data.data.resources,
        };
      }

      // 返回預設資源列表
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
    } catch (error) {
      console.error("[MCP Bridge] 獲取資源列表失敗:", error);
      // 返回預設資源列表
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
        ],
      };
    }
  });

  // 註冊資源讀取處理器
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      let endpoint;
      switch (uri) {
        case "horgoscpa://database/schema":
          endpoint = "/mcp/schema";
          break;
        case "horgoscpa://config/api":
          endpoint = "/mcp/config";
          break;
        case "horgoscpa://stats/system":
          endpoint = "/mcp/stats";
          break;
        default:
          throw new Error(`未知資源: ${uri}`);
      }

      const response = await safeFetch(`${API_BASE_URL}${endpoint}`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || "讀取資源失敗");
      }

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(data.data || data, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[MCP Bridge] 讀取資源失敗 (${uri}):`, error);
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

  // 註冊工具調用處理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: argsRaw } = request.params;
    const args = argsRaw || {};

    try {
      // 基礎輸入驗證（避免傳入非物件或多餘屬性導致 schema 衝突）
      if (argsRaw != null && typeof argsRaw !== "object") {
        throw new Error("參數必須為物件");
      }

      let response;
      let endpoint;
      let method = "GET";
      let body = null;

      // 根據工具名稱決定端點和參數
      switch (name) {
        case "query_database":
          if (!args.query || typeof args.query !== "string") {
            throw new Error("query 為必填字串");
          }
          if (args.params && !Array.isArray(args.params)) {
            throw new Error("params 必須為陣列");
          }
          endpoint = "/mcp/query";
          method = "POST";
          body = {
            query: args.query,
            params: args.params || [],
          };
          break;

        case "get_user_info":
          endpoint = `/mcp/user?user_id=${encodeURIComponent(args.user_id)}`;
          break;

        case "get_clients":
          if (args.status && !["active", "inactive", "all"].includes(args.status)) {
            throw new Error("status 僅允許 active/inactive/all");
          }
          const clientParams = new URLSearchParams();
          if (args.status) clientParams.append("status", args.status);
          if (args.limit) clientParams.append("limit", args.limit);
          endpoint = `/mcp/clients${clientParams.toString() ? `?${clientParams.toString()}` : ""}`;
          break;

        case "get_tasks":
          const taskParams = new URLSearchParams();
          if (args.status) taskParams.append("status", args.status);
          if (args.assigned_to) taskParams.append("assigned_to", args.assigned_to);
          if (args.limit) taskParams.append("limit", args.limit);
          endpoint = `/mcp/tasks${taskParams.toString() ? `?${taskParams.toString()}` : ""}`;
          break;

        case "get_dashboard_stats":
          endpoint = "/mcp/stats";
          break;

        case "search_knowledge":
          if (!args.keyword || typeof args.keyword !== "string") {
            throw new Error("keyword 為必填字串");
          }
          const knowledgeParams = new URLSearchParams();
          knowledgeParams.append("keyword", args.keyword);
          if (args.category) knowledgeParams.append("category", args.category);
          endpoint = `/mcp/knowledge?${knowledgeParams.toString()}`;
          break;

        case "get_database_schema":
          endpoint = "/mcp/schema";
          break;

        case "get_api_config":
          endpoint = "/mcp/config";
          break;

        default:
          throw new Error(`未知工具: ${name}`);
      }

      // 發送 HTTP 請求
      const fetchOptions = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      response = await safeFetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || "請求失敗");
      }

      // 返回 MCP 格式的結果
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.data || data, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[MCP Bridge] 工具調用失敗 (${name}):`, error);
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

  return server;
}

// 啟動伺服器
async function main() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[MCP Bridge] MCP HTTP 橋接器已啟動");
  console.error(`[MCP Bridge] API Base URL: ${API_BASE_URL}`);
}

main().catch((error) => {
  console.error("[MCP Bridge] 啟動失敗:", error);
  process.exit(1);
});



