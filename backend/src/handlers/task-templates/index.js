/**
 * 任务模板管理主入口
 */

import { errorResponse, successResponse } from "../../utils/response.js";
import { handleGetTaskTemplates, handleGetTaskTemplateDetail, handleCreateTaskTemplate, handleUpdateTaskTemplate, handleDeleteTaskTemplate } from "./template-crud.js";

// 任务模板阶段管理函数
async function handleGetTemplateStages(env, templateId) {
  const stagesRows = await env.DATABASE.prepare(
    `SELECT stage_id, template_id, stage_name, stage_order, description, estimated_hours
     FROM TaskTemplateStages
     WHERE template_id = ?
     ORDER BY stage_order ASC`
  ).bind(templateId).all();
  
  return (stagesRows?.results || []).map(s => ({
    stage_id: s.stage_id,
    template_id: s.template_id,
    stage_name: s.stage_name || "",
    stage_order: s.stage_order || 0,
    description: s.description || "",
    estimated_hours: s.estimated_hours || null
  }));
}

async function handleCreateTemplateStage(env, templateId, stageData) {
  const stageName = String(stageData?.stage_name || "").trim();
  const stageDesc = String(stageData?.description || "").trim();
  const estimatedHours = stageData?.estimated_hours ? parseFloat(stageData.estimated_hours) : null;
  
  // 获取当前最大order
  const maxOrderRow = await env.DATABASE.prepare(
    `SELECT MAX(stage_order) as max_order FROM TaskTemplateStages WHERE template_id = ?`
  ).bind(templateId).first();
  const nextOrder = (maxOrderRow?.max_order || 0) + 1;
  
  const result = await env.DATABASE.prepare(
    `INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(templateId, stageName, nextOrder, stageDesc || null, estimatedHours).run();
  
  return result.meta?.last_row_id;
}

async function handleUpdateTemplateStage(env, templateId, stageId, stageData) {
  const stageName = String(stageData?.stage_name || "").trim();
  const stageDesc = String(stageData?.description || "").trim();
  const estimatedHours = stageData?.estimated_hours ? parseFloat(stageData.estimated_hours) : null;
  const stageOrder = stageData?.stage_order ? parseInt(stageData.stage_order, 10) : null;
  
  const updates = [];
  const binds = [];
  
  if (stageName) {
    updates.push("stage_name = ?");
    binds.push(stageName);
  }
  if (stageDesc !== undefined) {
    updates.push("description = ?");
    binds.push(stageDesc || null);
  }
  if (estimatedHours !== undefined) {
    updates.push("estimated_hours = ?");
    binds.push(estimatedHours);
  }
  if (stageOrder !== null) {
    updates.push("stage_order = ?");
    binds.push(stageOrder);
  }
  
  if (updates.length === 0) {
    return;
  }
  
  binds.push(stageId);
  binds.push(templateId);
  
  await env.DATABASE.prepare(
    `UPDATE TaskTemplateStages SET ${updates.join(", ")}, updated_at = datetime('now')
     WHERE stage_id = ? AND template_id = ?`
  ).bind(...binds).run();
}

async function handleDeleteTemplateStage(env, templateId, stageId) {
  await env.DATABASE.prepare(
    `DELETE FROM TaskTemplateStages WHERE stage_id = ? AND template_id = ?`
  ).bind(stageId, templateId).run();
}

export async function handleTaskTemplates(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/task-templates 或 /api/v2/settings/task-templates - 获取任务模板列表
    if (method === "GET" && (path === '/api/v2/task-templates' || path === '/api/v2/settings/task-templates')) {
      return await handleGetTaskTemplates(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/task-templates/:id 或 /api/v2/settings/task-templates/:id - 获取任务模板详情
    if (method === "GET" && match && match[1] && (path.match(/^\/api\/v2\/task-templates\/(\d+)$/) || path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)$/))) {
      return await handleGetTaskTemplateDetail(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/task-templates 或 /api/v2/settings/task-templates - 创建任务模板
    if (method === "POST" && (path === '/api/v2/task-templates' || path === '/api/v2/settings/task-templates')) {
      return await handleCreateTaskTemplate(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/task-templates/:id 或 /api/v2/settings/task-templates/:id - 更新任务模板
    if (method === "PUT" && match && match[1] && (path.match(/^\/api\/v2\/task-templates\/(\d+)$/) || path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)$/))) {
      return await handleUpdateTaskTemplate(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/task-templates/:id 或 /api/v2/settings/task-templates/:id - 删除任务模板
    if (method === "DELETE" && match && match[1] && (path.match(/^\/api\/v2\/task-templates\/(\d+)$/) || path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)$/))) {
      return await handleDeleteTaskTemplate(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/settings/task-templates/:id/stages - 获取模板阶段列表
    if (method === "GET" && path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages$/)) {
      const templateId = match[1];
      const stages = await handleGetTemplateStages(env, templateId);
      return successResponse(stages, "查詢成功", requestId);
    }
    
    // POST /api/v2/settings/task-templates/:id/stages - 创建模板阶段
    if (method === "POST" && path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages$/)) {
      const templateId = match[1];
      const body = await request.json();
      
      if (!body?.stage_name) {
        return errorResponse(422, "VALIDATION_ERROR", "階段名稱不能為空", null, requestId);
      }
      
      const stageId = await handleCreateTemplateStage(env, templateId, body);
      return successResponse({ stage_id: stageId }, "已創建", requestId);
    }
    
    // PUT /api/v2/settings/task-templates/:id/stages/:stageId - 更新模板阶段
    if (method === "PUT" && path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages\/(\d+)$/)) {
      const templateId = match[1];
      const stageId = match[2];
      const body = await request.json();
      
      await handleUpdateTemplateStage(env, templateId, stageId, body);
      return successResponse({ stage_id: stageId }, "已更新", requestId);
    }
    
    // DELETE /api/v2/settings/task-templates/:id/stages/:stageId - 删除模板阶段
    if (method === "DELETE" && path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages\/(\d+)$/)) {
      const templateId = match[1];
      const stageId = match[2];
      
      await handleDeleteTemplateStage(env, templateId, stageId);
      return successResponse({ stage_id: stageId }, "已刪除", requestId);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Task Templates] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

