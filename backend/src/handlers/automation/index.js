/**
 * 自动化规则管理主入口
 */

import { errorResponse, successResponse } from "../../utils/response.js";
import { handleGetAutomationRules, handleGetAutomationRuleDetail, handleCreateAutomationRule, handleUpdateAutomationRule, handleDeleteAutomationRule, handleTestAutomationRule } from "./automation-crud.js";

/**
 * 獲取已啟用自動生成的客戶服務列表
 */
async function handleGetAutomationComponents(request, env, ctx, requestId, match, url) {
  try {
    const rows = await env.DATABASE.prepare(
      `SELECT 
        cs.client_service_id,
        cs.client_id,
        c.company_name as client_name,
        cs.service_id,
        s.service_name,
        cs.auto_generate_tasks,
        COUNT(ctc.config_id) as task_count
      FROM ClientServices cs
      INNER JOIN Clients c ON cs.client_id = c.client_id
      INNER JOIN Services s ON cs.service_id = s.service_id
      LEFT JOIN ClientServiceTaskConfigs ctc ON cs.client_service_id = ctc.client_service_id
      WHERE cs.is_deleted = 0 AND cs.auto_generate_tasks = 1 AND c.is_deleted = 0
      GROUP BY cs.client_service_id
      ORDER BY c.company_name, s.service_name`
    ).all();
    
    const components = (rows?.results || []).map(r => ({
      component_id: r.client_service_id,
      client_id: r.client_id,
      client_name: r.client_name,
      service_id: r.service_id,
      service_name: r.service_name,
      task_count: r.task_count || 0
    }));
    
    return successResponse(components, "查詢成功", requestId);
  } catch (error) {
    console.error('[Automation] Get components error:', error);
    return errorResponse(500, "INTERNAL_ERROR", "查詢失敗", null, requestId);
  }
}

/**
 * 獲取客戶服務的任務配置
 */
async function handleGetComponentTasks(request, env, ctx, requestId, match, url) {
  try {
    const componentId = match[1]; // 這是 client_service_id
    
    const rows = await env.DATABASE.prepare(
      `SELECT 
        config_id,
        client_service_id,
        task_name,
        task_description,
        assignee_user_id,
        estimated_hours,
        advance_days,
        due_rule,
        due_value,
        stage_order
      FROM ClientServiceTaskConfigs
      WHERE client_service_id = ?
      ORDER BY stage_order`
    ).bind(componentId).all();
    
    const tasks = (rows?.results || []).map(r => ({
      config_id: r.config_id,
      task_name: r.task_name,
      task_description: r.task_description || '',
      assignee_user_id: r.assignee_user_id,
      estimated_hours: r.estimated_hours || 0,
      advance_days: r.advance_days || 0,
      due_rule: r.due_rule || 'end_of_month',
      due_value: r.due_value || 0,
      stage_order: r.stage_order || 0
    }));
    
    return successResponse(tasks, "查詢成功", requestId);
  } catch (error) {
    console.error('[Automation] Get component tasks error:', error);
    return errorResponse(500, "INTERNAL_ERROR", "查詢失敗", null, requestId);
  }
}

export async function handleAutomation(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  const user = ctx?.user;
  
  // 只有管理员可以访问自动化规则
  if (!user || !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "沒有權限", null, requestId);
  }
  
  try {
    // GET /api/v2/admin/automation-rules - 获取自动化规则列表
    if (method === "GET" && path === '/api/v2/admin/automation-rules') {
      return await handleGetAutomationRules(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/admin/automation-rules/:id - 获取单个自动化规则详情
    if (method === "GET" && path.match(/^\/api\/v2\/admin\/automation-rules\/(\d+)$/)) {
      return await handleGetAutomationRuleDetail(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/admin/automation-rules - 创建自动化规则
    if (method === "POST" && path === '/api/v2/admin/automation-rules') {
      return await handleCreateAutomationRule(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/admin/automation-rules/:id - 更新自动化规则
    if (method === "PUT" && path.match(/^\/api\/v2\/admin\/automation-rules\/(\d+)$/)) {
      return await handleUpdateAutomationRule(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/admin/automation-rules/:id - 删除自动化规则
    if (method === "DELETE" && path.match(/^\/api\/v2\/admin\/automation-rules\/(\d+)$/)) {
      return await handleDeleteAutomationRule(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/admin/automation-rules/:id/test - 测试自动化规则执行
    if (method === "POST" && path.match(/^\/api\/v2\/admin\/automation-rules\/(\d+)\/test$/)) {
      return await handleTestAutomationRule(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/settings/automation/components - 获取已啟用自動生成的客戶服務列表
    if (method === "GET" && path === '/api/v2/settings/automation/components') {
      return await handleGetAutomationComponents(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/settings/automation/components/:id/tasks - 获取客戶服務的任務配置
    if (method === "GET" && path.match(/^\/api\/v2\/settings\/automation\/components\/(\d+)\/tasks$/)) {
      return await handleGetComponentTasks(request, env, ctx, requestId, match, url);
    }
    
    // 注意：/api/v2/settings/automation/preview 路由由 task-generator.js 處理，這裡不再處理
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Automation] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

