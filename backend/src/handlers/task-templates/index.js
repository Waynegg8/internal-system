/**
 * 任务模板管理主入口
 */

import { errorResponse, successResponse } from "../../utils/response.js";
import { handleGetTaskTemplates, handleGetTaskTemplateDetail, handleCreateTaskTemplate, handleUpdateTaskTemplate, handleDeleteTaskTemplate } from "./template-crud.js";
import { handleGetStages, handleUpdateStageNames, handleSyncStages } from "./task-template-stages.js";

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
      // 使用路由匹配器傳遞的 match 參數（如果存在），否則從路徑重新匹配
      const stagesMatch = match && match[1] ? match : path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages$/);
      console.log('[Task Templates] GET stages - match:', match, 'stagesMatch:', stagesMatch, 'path:', path, 'url:', url);
      try {
        return await handleGetStages(request, env, ctx, requestId, stagesMatch, url);
      } catch (err) {
        console.error('[Task Templates] Error calling handleGetStages:', err);
        console.error('[Task Templates] Error stack:', err.stack);
        throw err; // 重新拋出錯誤，讓外層 catch 處理
      }
    }
    
    // POST /api/v2/settings/task-templates/:id/stages - 创建模板阶段
    const postStagesMatch = path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages$/);
    if (method === "POST" && postStagesMatch) {
      const templateId = parseInt(postStagesMatch[1], 10);
      if (!templateId || templateId <= 0) {
        return errorResponse(400, "INVALID_ID", "模板ID無效", null, requestId);
      }
      const body = await request.json();
      
      if (!body?.stage_name) {
        return errorResponse(422, "VALIDATION_ERROR", "階段名稱不能為空", null, requestId);
      }
      
      const stageId = await handleCreateTemplateStage(env, templateId, body);
      return successResponse({ stage_id: stageId }, "已創建", requestId);
    }
    
    // PUT /api/v2/settings/task-templates/:id/stages/:stageId - 更新模板阶段
    const putStageMatch = path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages\/(\d+)$/);
    if (method === "PUT" && putStageMatch) {
      const templateId = parseInt(putStageMatch[1], 10);
      const stageId = parseInt(putStageMatch[2], 10);
      if (!templateId || templateId <= 0 || !stageId || stageId <= 0) {
        return errorResponse(400, "INVALID_ID", "模板ID或階段ID無效", null, requestId);
      }
      const body = await request.json();
      
      await handleUpdateTemplateStage(env, templateId, stageId, body);
      return successResponse({ stage_id: stageId }, "已更新", requestId);
    }
    
    // DELETE /api/v2/settings/task-templates/:id/stages/:stageId - 删除模板阶段
    const deleteStageMatch = path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages\/(\d+)$/);
    if (method === "DELETE" && deleteStageMatch) {
      const templateId = parseInt(deleteStageMatch[1], 10);
      const stageId = parseInt(deleteStageMatch[2], 10);
      if (!templateId || templateId <= 0 || !stageId || stageId <= 0) {
        return errorResponse(400, "INVALID_ID", "模板ID或階段ID無效", null, requestId);
      }
      
      await handleDeleteTemplateStage(env, templateId, stageId);
      return successResponse({ stage_id: stageId }, "已刪除", requestId);
    }
    
    // PUT /api/v2/settings/task-templates/:id/stages/batch - 批量更新階段名稱和順序
    const batchMatch = path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages\/batch$/);
    if (method === "PUT" && batchMatch) {
      return await handleUpdateStageNames(request, env, ctx, requestId, batchMatch, url);
    }
    
    // POST /api/v2/settings/task-templates/:id/stages/sync - 同步階段變更到服務配置
    const syncMatch = path.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages\/sync$/);
    if (method === "POST" && syncMatch) {
      return await handleSyncStages(request, env, ctx, requestId, syncMatch, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Task Templates] Error:`, err);
    console.error(`[Task Templates] Error details:`, {
      message: err.message,
      name: err.name,
      stack: err.stack,
      path: path,
      method: method,
      match: match
    });
    return errorResponse(500, "INTERNAL_ERROR", `伺服器錯誤: ${err.message}`, { error: err.message, stack: err.stack }, requestId);
  }
}

