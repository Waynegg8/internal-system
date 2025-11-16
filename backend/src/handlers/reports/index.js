/**
 * 报表分析主入口
 * 模块化路由到各个报表处理器
 */

import { errorResponse } from "../../utils/response.js";
import { handleMonthlyRevenue } from "./monthly-revenue.js";
import { handleMonthlyPayroll } from "./monthly-payroll.js";
import { handleMonthlyEmployeePerformance } from "./monthly-employee-performance.js";
import { handleMonthlyClientProfitability } from "./monthly-client-profitability.js";
import { handleAnnualRevenue } from "./annual-revenue.js";
import { handleAnnualPayroll } from "./annual-payroll.js";
import { handleAnnualEmployeePerformance } from "./annual-employee-performance.js";
import { handleAnnualClientProfitability } from "./annual-client-profitability.js";

export async function handleReports(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  const user = ctx?.user;
  
  // 只有管理员可以访问报表
  if (!user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "沒有權限", null, requestId);
  }
  
  try {
    // 月度报表
    if (method === "GET" && path === '/api/v2/reports/monthly/revenue') {
      return await handleMonthlyRevenue(request, env, ctx, requestId, url);
    }
    
    if (method === "GET" && path === '/api/v2/reports/monthly/payroll') {
      return await handleMonthlyPayroll(request, env, ctx, requestId, url);
    }
    
    if (method === "GET" && path === '/api/v2/reports/monthly/employee-performance') {
      return await handleMonthlyEmployeePerformance(request, env, ctx, requestId, url);
    }
    
    if (method === "GET" && path === '/api/v2/reports/monthly/client-profitability') {
      return await handleMonthlyClientProfitability(request, env, ctx, requestId, url);
    }
    
    // 年度报表
    if (method === "GET" && path === '/api/v2/reports/annual/revenue') {
      return await handleAnnualRevenue(request, env, ctx, requestId, url);
    }
    
    if (method === "GET" && path === '/api/v2/reports/annual/payroll') {
      return await handleAnnualPayroll(request, env, ctx, requestId, url);
    }
    
    if (method === "GET" && path === '/api/v2/reports/annual/employee-performance') {
      return await handleAnnualEmployeePerformance(request, env, ctx, requestId, url);
    }
    
    if (method === "GET" && path === '/api/v2/reports/annual/client-profitability') {
      return await handleAnnualClientProfitability(request, env, ctx, requestId, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Reports] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}






