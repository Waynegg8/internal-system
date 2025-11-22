/**
 * 成本管理主入口
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetCosts, handleCreateCost, handleUpdateCost, handleDeleteCost } from "./cost-records-crud.js";
import { handleGetCostAnalysis } from "./cost-analysis.js";
import { handleGetCostTypes, handleCreateCostType, handleUpdateCostType, handleDeleteCostType } from "./cost-types.js";
import { handleGetEmployeeCosts, handleCalculateAllocation } from "./cost-allocation.js";
import { handleGetTaskCosts, handleGetClientCosts } from "./task-costs.js";
import { handleGetOverheadTemplate, handleUpdateOverheadTemplate, handlePreviewOverheadGeneration, handleGenerateOverheadCosts } from "./overhead-templates.js";

export async function handleCosts(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  const user = ctx?.user;
  
  // 只有管理员可以访问成本管理
  if (!user || !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "沒有權限", null, requestId);
  }
  
  try {
    // 成本类型管理 - 支持别名路径（包括舊系統路徑）
    if (method === "GET" && (path === '/api/v2/admin/cost-types' || path === '/api/v2/costs/types' || 
                              path === '/api/v2/admin/overhead-types' || path === '/internal/api/v1/admin/overhead-types')) {
      return await handleGetCostTypes(request, env, ctx, requestId, url);
    }
    if (method === "POST" && (path === '/api/v2/admin/cost-types' || path === '/api/v2/costs/types' || 
                              path === '/api/v2/admin/overhead-types' || path === '/internal/api/v1/admin/overhead-types')) {
      return await handleCreateCostType(request, env, ctx, requestId, url);
    }
    if (method === "PUT" && (path.match(/^\/api\/v2\/admin\/cost-types\/(\d+)$/) || path.match(/^\/api\/v2\/costs\/types\/(\d+)$/) ||
                             path.match(/^\/api\/v2\/admin\/overhead-types\/(\d+)$/) || path.match(/^\/internal\/api\/v1\/admin\/overhead-types\/(\d+)$/))) {
      return await handleUpdateCostType(request, env, ctx, requestId, match, url);
    }
    if (method === "DELETE" && (path.match(/^\/api\/v2\/admin\/cost-types\/(\d+)$/) || path.match(/^\/api\/v2\/costs\/types\/(\d+)$/) ||
                                path.match(/^\/api\/v2\/admin\/overhead-types\/(\d+)$/) || path.match(/^\/internal\/api\/v1\/admin\/overhead-types\/(\d+)$/))) {
      return await handleDeleteCostType(request, env, ctx, requestId, match, url);
    }
    
    // 月度管理費用記錄 - 主要路徑
    if (method === "GET" && path === '/api/v2/costs/records') {
      return await handleGetCosts(request, env, ctx, requestId, url);
    }
    if (method === "POST" && path === '/api/v2/costs/records') {
      return await handleCreateCost(request, env, ctx, requestId, url);
    }
    if (method === "PUT" && path.match(/^\/api\/v2\/costs\/records\/(\d+)$/)) {
      return await handleUpdateCost(request, env, ctx, requestId, match, url);
    }
    if (method === "DELETE" && path.match(/^\/api\/v2\/costs\/records\/(\d+)$/)) {
      return await handleDeleteCost(request, env, ctx, requestId, match, url);
    }

    // 月度成本管理 - 支持别名路径（包括舊系統路徑）
    if (method === "GET" && (path.match(/^\/api\/v2\/costs\/overhead\/(\d+)\/(\d+)$/) ||
                              path === '/api/v2/admin/costs' ||
                              path === '/internal/api/v1/admin/overhead-costs')) {
      // 从路径中提取year和month
      const yearMonthMatch = path.match(/^\/api\/v2\/costs\/overhead\/(\d+)\/(\d+)$/);
      if (yearMonthMatch) {
        const year = yearMonthMatch[1];
        const month = yearMonthMatch[2];
        url.searchParams.set('year', year);
        url.searchParams.set('month', month);
      }
      return await handleGetCosts(request, env, ctx, requestId, url);
    }
    if (method === "POST" && (path === '/api/v2/costs/overhead' || 
                              path === '/api/v2/admin/costs' || 
                              path === '/internal/api/v1/admin/overhead-costs')) {
      return await handleCreateCost(request, env, ctx, requestId, url);
    }
    if (method === "PUT" && (path.match(/^\/api\/v2\/costs\/overhead\/(\d+)$/) || 
                             path.match(/^\/api\/v2\/admin\/costs\/(\d+)$/) ||
                             path.match(/^\/internal\/api\/v1\/admin\/overhead-costs\/(\d+)$/))) {
      return await handleUpdateCost(request, env, ctx, requestId, match, url);
    }
    if (method === "DELETE" && (path.match(/^\/api\/v2\/costs\/overhead\/(\d+)$/) || 
                                path.match(/^\/api\/v2\/admin\/costs\/(\d+)$/) ||
                                path.match(/^\/internal\/api\/v1\/admin\/overhead-costs\/(\d+)$/))) {
      return await handleDeleteCost(request, env, ctx, requestId, match, url);
    }
    if (method === "POST" && (path === '/api/v2/costs/overhead/generate' || 
                              path === '/internal/api/v1/admin/overhead-costs/generate')) {
      return await handleGenerateOverheadCosts(request, env, ctx, requestId, url);
    }
    if (method === "GET" && (path.match(/^\/api\/v2\/costs\/overhead\/preview\/(\d+)\/(\d+)$/) || 
                             path === '/internal/api/v1/admin/overhead-costs/generate/preview' ||
                             path === '/api/v2/admin/overhead-costs/generate/preview')) {
      // 如果是查詢參數路徑，從查詢參數中提取 year 和 month
      if (path.includes('/generate/preview')) {
        const year = url.searchParams.get('year');
        const month = url.searchParams.get('month');
        if (year && month) {
          // 創建一個假的 match 對象以兼容函數簽名
          const fakeMatch = [null, year, month];
          return await handlePreviewOverheadGeneration(request, env, ctx, requestId, fakeMatch, url);
        }
      }
      return await handlePreviewOverheadGeneration(request, env, ctx, requestId, match, url);
    }
    // 模板查詢 - 支持舊系統路徑別名
    if (method === "GET" && (path.match(/^\/api\/v2\/costs\/overhead-templates\/(\d+)$/) || 
                              path.match(/^\/api\/v2\/admin\/overhead-templates\/by-type\/(\d+)$/) ||
                              path.match(/^\/internal\/api\/v1\/admin\/overhead-templates\/by-type\/(\d+)$/))) {
      const matchResult = path.match(/^\/api\/v2\/costs\/overhead-templates\/(\d+)$/) || 
                          path.match(/^\/api\/v2\/admin\/overhead-templates\/by-type\/(\d+)$/) ||
                          path.match(/^\/internal\/api\/v1\/admin\/overhead-templates\/by-type\/(\d+)$/);
      return await handleGetOverheadTemplate(request, env, ctx, requestId, matchResult, url);
    }
    if (method === "PUT" && (path.match(/^\/api\/v2\/costs\/overhead-templates\/(\d+)$/) || 
                             path.match(/^\/api\/v2\/admin\/overhead-templates\/by-type\/(\d+)$/) ||
                             path.match(/^\/internal\/api\/v1\/admin\/overhead-templates\/by-type\/(\d+)$/))) {
      const matchResult = path.match(/^\/api\/v2\/costs\/overhead-templates\/(\d+)$/) || 
                          path.match(/^\/api\/v2\/admin\/overhead-templates\/by-type\/(\d+)$/) ||
                          path.match(/^\/internal\/api\/v1\/admin\/overhead-templates\/by-type\/(\d+)$/);
      return await handleUpdateOverheadTemplate(request, env, ctx, requestId, matchResult, url);
    }
    
    // 成本分析 - 支持别名路径
    if (method === "GET" && path === '/api/v2/admin/cost-analysis') {
      return await handleGetCostAnalysis(request, env, ctx, requestId, url);
    }
    
    // 员工成本明细 - 支持别名路径（包括舊系統路徑）
    if (method === "GET" && (path.match(/^\/api\/v2\/costs\/employee\/(\d+)\/(\d+)$/) || 
                             path === '/api/v2/admin/employee-costs' ||
                             path === '/internal/api/v1/admin/costs/employee')) {
      const yearMonthMatch = path.match(/^\/api\/v2\/costs\/employee\/(\d+)\/(\d+)$/);
      if (yearMonthMatch) {
        const year = yearMonthMatch[1];
        const month = yearMonthMatch[2];
        url.searchParams.set('year', year);
        url.searchParams.set('month', month);
      }
      return await handleGetEmployeeCosts(request, env, ctx, requestId, url);
    }
    
    // 任务成本明细 - 支持别名路径（包括舊系統路徑）
    if (method === "GET" && (path.match(/^\/api\/v2\/costs\/task\/(\d+)\/(\d+)$/) || 
                             path === '/api/v2/admin/task-costs' ||
                             path === '/internal/api/v1/admin/costs/task')) {
      const yearMonthMatch = path.match(/^\/api\/v2\/costs\/task\/(\d+)\/(\d+)$/);
      if (yearMonthMatch) {
        const year = yearMonthMatch[1];
        const month = yearMonthMatch[2];
        url.searchParams.set('year', year);
        url.searchParams.set('month', month);
      }
      return await handleGetTaskCosts(request, env, ctx, requestId, url);
    }
    
    // 客户成本汇总 - 支持别名路径（包括舊系統路徑）
    if (method === "GET" && (path.match(/^\/api\/v2\/costs\/client-summary\/(\d+)\/(\d+)$/) ||
                             path === '/api/v2/admin/client-costs' ||
                             path === '/internal/api/v1/admin/costs/client')) {
      const yearMonthMatch = path.match(/^\/api\/v2\/costs\/client-summary\/(\d+)\/(\d+)$/);
      if (yearMonthMatch) {
        const year = yearMonthMatch[1];
        const month = yearMonthMatch[2];
        url.searchParams.set('year', year);
        url.searchParams.set('month', month);
      }
      return await handleGetClientCosts(request, env, ctx, requestId, url);
    }

    // 成本分攤計算
    if (method === "POST" && path === '/api/v2/costs/allocation/calculate') {
      return await handleCalculateAllocation(request, env, ctx, requestId);
    }

    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Costs] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

