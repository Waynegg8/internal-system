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
    try {
      // 從 API 獲取工具列表
      const response = await fetch(`${API_BASE_URL}/mcp/tools`);
      const data = await response.json();

      if (!data.ok || !data.data?.tools) {
        throw new Error("無法獲取工具列表");
      }

      // 轉換為 MCP 格式
      const tools = data.data.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: "object",
          properties: Object.entries(tool.parameters || {}).reduce(
            (acc, [key, value]) => {
              const desc = typeof value === "string" ? value : String(value);
              acc[key] = {
                type: desc.includes("string") ? "string" : desc.includes("number") ? "number" : desc.includes("array") ? "array" : "string",
                description: desc,
              };
              return acc;
            },
            {}
          ),
          required: Object.entries(tool.parameters || {})
            .filter(([_, value]) => typeof value === "string" && value.includes("required"))
            .map(([key]) => key),
        },
      }));

      return { tools };
    } catch (error) {
      console.error("[MCP Bridge] 獲取工具列表失敗:", error);
      // 返回預設工具列表
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
                  description: "分類（可選）",
                },
              },
              required: ["keyword"],
            },
          },
          {
            name: "get_database_schema",
            description: "獲取數據庫架構資訊",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      };
    }
  });

  // 註冊資源列表處理器
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      // 從 API 獲取資源列表
      const response = await fetch(`${API_BASE_URL}/mcp/resources`);
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

      const response = await fetch(`${API_BASE_URL}${endpoint}`);
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
    const { name, arguments: args } = request.params;

    try {
      let response;
      let endpoint;
      let method = "GET";
      let body = null;

      // 根據工具名稱決定端點和參數
      switch (name) {
        case "query_database":
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

      response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
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



