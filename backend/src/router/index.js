/**
 * 路由管理器
 */

import { errorResponse } from "../utils/response.js";
import { handleCORS, addCorsHeaders } from "../middleware/cors.js";
import { authRoutes } from "./auth.js";
import { clientsRoutes } from "./clients.js";
import { tasksRoutes } from "./tasks.js";
import { timesheetsRoutes } from "./timesheets.js";
import { receiptsRoutes } from "./receipts.js";
import { payrollRoutes } from "./payroll.js";
import { leavesRoutes } from "./leaves.js";
import { tripsRoutes } from "./trips.js";
import { holidaysRoutes } from "./holidays.js";
import { dashboardRoutes } from "./dashboard.js";
import { reportsRoutes } from "./reports.js";
import { settingsRoutes } from "./settings.js";
import { knowledgeRoutes } from "./knowledge.js";
import { costsRoutes } from "./costs.js";
import { tagsRoutes } from "./tags.js";
import { servicesRoutes } from "./services.js";
import { billingRoutes } from "./billing.js";
import { punchRecordsRoutes } from "./punch-records.js";
import { taskTemplatesRoutes } from "./task-templates.js";
import { taskConfigsRoutes } from "./task-configs.js";
import { taskGeneratorRoutes } from "./task-generator.js";
import { automationRoutes } from "./automation.js";
import { userProfileRoutes } from "./user-profile.js";
import { attachmentsRoutes } from "./attachments.js";
import { mcpRoutes } from "./mcp.js";
import { clientServiceComponentsRoutes } from "./client-service-components.js";

// 路由表（按優先級排序：更具體的路由應該在前面）
const routes = [
  ...authRoutes,
  ...mcpRoutes, // MCP 路由放在前面，優先匹配
  ...clientServiceComponentsRoutes,
  ...taskConfigsRoutes, // 任務配置路由優先於客戶路由，因為是子資源
  ...clientsRoutes,
  ...tasksRoutes,
  ...timesheetsRoutes,
  ...receiptsRoutes,
  ...payrollRoutes,
  ...leavesRoutes,
  ...tripsRoutes,
  ...holidaysRoutes,
  ...dashboardRoutes,
  ...reportsRoutes,
  ...knowledgeRoutes, // 知識庫路由移到設定路由之前，避免 /api/v2/settings/sops 被攔截
  ...settingsRoutes,
  ...costsRoutes,
  ...tagsRoutes,
  ...servicesRoutes,
  ...billingRoutes,
  ...punchRecordsRoutes,
  ...taskTemplatesRoutes,
  ...taskGeneratorRoutes,
  ...automationRoutes,
  ...userProfileRoutes,
  ...attachmentsRoutes,
];

/**
 * 路由匹配器
 */
export async function matchRoute(request, env, ctx, requestId) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  // 处理 CORS 预检请求
  const corsResponse = handleCORS(request);
  if (corsResponse) {
    // 確保預檢請求也添加 CORS 頭
    return addCorsHeaders(corsResponse, request);
  }
  
  // 匹配路由（按顺序，更具体的路由应该在前）
  for (const route of routes) {
    const match = route.pattern.exec(path);
    if (match && route.methods.includes(method)) {
      try {
        const response = await route.handler(request, env, ctx, requestId, match, url);
        // 確保響應有 CORS 頭（如果 handler 已經添加了，這裡會合併）
        const corsResponse = addCorsHeaders(response, request);
        return corsResponse;
      } catch (error) {
        console.error(`[Router] Error in route ${path}:`, error);
        return addCorsHeaders(
          errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId),
          request
        );
      }
    }
  }
  
  // 未匹配的路由
  return addCorsHeaders(
    errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId),
    request
  );
}

