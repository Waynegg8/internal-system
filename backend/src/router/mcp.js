/**
 * MCP (Model Context Protocol) 路由
 */

import {
  mcpQueryDatabase,
  mcpGetUserInfo,
  mcpGetClients,
  mcpGetTasks,
  mcpGetDashboardStats,
  mcpSearchKnowledge,
  mcpGetDatabaseSchema,
  mcpGetAPIConfig,
  mcpGetTools,
} from "../handlers/mcp.js";

export const mcpRoutes = [
  // 獲取 MCP 工具列表
  {
    pattern: /^\/api\/v2\/mcp\/tools$/,
    methods: ["GET"],
    handler: mcpGetTools,
  },
  
  // 執行數據庫查詢
  {
    pattern: /^\/api\/v2\/mcp\/query$/,
    methods: ["POST"],
    handler: mcpQueryDatabase,
  },
  
  // 獲取用戶資訊
  {
    pattern: /^\/api\/v2\/mcp\/user$/,
    methods: ["GET"],
    handler: mcpGetUserInfo,
  },
  
  // 獲取客戶列表
  {
    pattern: /^\/api\/v2\/mcp\/clients$/,
    methods: ["GET"],
    handler: mcpGetClients,
  },
  
  // 獲取任務列表
  {
    pattern: /^\/api\/v2\/mcp\/tasks$/,
    methods: ["GET"],
    handler: mcpGetTasks,
  },
  
  // 獲取儀表板統計
  {
    pattern: /^\/api\/v2\/mcp\/stats$/,
    methods: ["GET"],
    handler: mcpGetDashboardStats,
  },
  
  // 搜索知識庫
  {
    pattern: /^\/api\/v2\/mcp\/knowledge$/,
    methods: ["GET"],
    handler: mcpSearchKnowledge,
  },
  
  // 獲取數據庫架構
  {
    pattern: /^\/api\/v2\/mcp\/schema$/,
    methods: ["GET"],
    handler: mcpGetDatabaseSchema,
  },
  
  // 獲取 API 配置
  {
    pattern: /^\/api\/v2\/mcp\/config$/,
    methods: ["GET"],
    handler: mcpGetAPIConfig,
  },
];

