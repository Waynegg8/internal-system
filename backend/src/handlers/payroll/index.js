/**
 * 薪资管理主入口
 * 模块化路由到各个处理器
 */

import { errorResponse } from "../../utils/response.js";
import { handlePayrollPreview, handleCalculatePayroll } from "./payroll-calculation.js";
import { handleGetSalaryItemTypes, handleCreateSalaryItemType, handleUpdateSalaryItemType, handleDeleteSalaryItemType, handleToggleSalaryItemType } from "./salary-item-types.js";
import { handleGetPayrollSettings, handleUpdatePayrollSettings } from "./payroll-settings.js";
import { handleGetYearlyBonus, handleUpdateYearlyBonus, handleGetYearEndBonus, handleUpdateYearEndBonus } from "./bonuses.js";
import { handleGetUserSalary, handleUpdateUserSalary } from "./user-salary.js";

export async function handlePayroll(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  const user = ctx?.user;
  
  try {
    // GET /api/v2/payroll/preview/:month - 薪资预览
    if (method === "GET" && path.match(/^\/api\/v2\/payroll\/preview\/(\d{4}-\d{2})$/)) {
      return await handlePayrollPreview(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/payroll/calculate - 计算单个员工薪资
    if (method === "POST" && path === '/api/v2/payroll/calculate') {
      return await handleCalculatePayroll(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/payroll/salary-item-types - 获取薪资项目类型
    if (method === "GET" && path === '/api/v2/payroll/salary-item-types') {
      return await handleGetSalaryItemTypes(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/payroll/salary-item-types - 创建薪资项目类型
    if (method === "POST" && path === '/api/v2/payroll/salary-item-types') {
      return await handleCreateSalaryItemType(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/payroll/salary-item-types/:id - 更新薪资项目类型
    if (method === "PUT" && path.match(/^\/api\/v2\/payroll\/salary-item-types\/(\d+)$/)) {
      return await handleUpdateSalaryItemType(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/payroll/salary-item-types/:id - 删除薪资项目类型
    if (method === "DELETE" && path.match(/^\/api\/v2\/payroll\/salary-item-types\/(\d+)$/)) {
      return await handleDeleteSalaryItemType(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/payroll/salary-item-types/:id/toggle - 切换薪资项目类型启用状态
    if (method === "PUT" && path.match(/^\/api\/v2\/payroll\/salary-item-types\/(\d+)\/toggle$/)) {
      return await handleToggleSalaryItemType(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/payroll/settings - 获取薪资设定
    if (method === "GET" && path === '/api/v2/payroll/settings') {
      return await handleGetPayrollSettings(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/payroll/settings - 更新薪资设定
    if (method === "PUT" && path === '/api/v2/payroll/settings') {
      return await handleUpdatePayrollSettings(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/payroll/yearly-bonus/:year - 获取年度绩效奖金
    if (method === "GET" && path.match(/^\/api\/v2\/payroll\/yearly-bonus\/(\d+)$/)) {
      return await handleGetYearlyBonus(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/payroll/yearly-bonus/:year - 保存年度绩效奖金
    if (method === "PUT" && path.match(/^\/api\/v2\/payroll\/yearly-bonus\/(\d+)$/)) {
      return await handleUpdateYearlyBonus(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/payroll/year-end-bonus/:year - 获取年终奖金
    if (method === "GET" && path.match(/^\/api\/v2\/payroll\/year-end-bonus\/(\d+)$/)) {
      return await handleGetYearEndBonus(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/payroll/year-end-bonus/:year - 保存年终奖金
    if (method === "PUT" && path.match(/^\/api\/v2\/payroll\/year-end-bonus\/(\d+)$/)) {
      return await handleUpdateYearEndBonus(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/users/:id/salary - 获取员工薪资设定
    if (method === "GET" && path.match(/^\/api\/v2\/users\/(\d+)\/salary$/)) {
      return await handleGetUserSalary(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/users/:id/salary - 更新员工薪资设定
    if (method === "PUT" && path.match(/^\/api\/v2\/users\/(\d+)\/salary$/)) {
      return await handleUpdateUserSalary(request, env, ctx, requestId, match, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Payroll] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

