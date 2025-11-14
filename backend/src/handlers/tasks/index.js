/**
 * 任务管理主入口
 * 模块化路由到各个处理器
 */

import { errorResponse } from "../../utils/response.js";
import {
  handleGetTaskDetail,
  handleGetTasks,
  handleGetTasksOverview,
  handleCreateTask,
  handleUpdateTask,
  handleDeleteTask,
} from "./task-crud.js";
import { handleGetTaskSOPs, handleUpdateTaskSOPs } from "./task-sops.js";
import {
  handleUpdateTaskStatus,
  handleUpdateTaskAssignee,
  handleAdjustTaskDueDate,
  handleUpdateTaskStage,
} from "./task-updates.js";
import {
  handleGetTaskDocuments,
  handleUploadTaskDocument,
  handleDeleteTaskDocument,
} from "./task-documents.js";
import { handleGetTaskAdjustmentHistory } from "./task-history.js";

export async function handleTasks(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/tasks/:id/adjustment-history - 获取任务变更历史
    if (method === "GET" && path.endsWith('/adjustment-history') && match && match[1]) {
      return await handleGetTaskAdjustmentHistory(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/tasks/:id/documents - 获取任务文档
    if (method === "GET" && path.endsWith('/documents') && match && match[1]) {
      return await handleGetTaskDocuments(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/tasks/:id/documents - 上传任务文档
    if (method === "POST" && path.endsWith('/documents') && match && match[1] && !match[2]) {
      return await handleUploadTaskDocument(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/tasks/:id/documents/:documentId - 删除任务文档
    if (method === "DELETE" && path.match(/^\/api\/v2\/tasks\/(\d+)\/documents\/(\d+)$/)) {
      return await handleDeleteTaskDocument(request, env, ctx, requestId, match, url);
    }

  // PUT /api/v2/tasks/:id/stages/:stageId - 更新任務階段狀態
  if (method === "PUT" && path.match(/^\/api\/v2\/tasks\/(\d+)\/stages\/(\d+)$/)) {
    return await handleUpdateTaskStage(request, env, ctx, requestId, match, url);
  }

    // PUT /api/v2/tasks/:id/status - 更新任务状态
    if (method === "PUT" && path.endsWith('/status') && match && match[1]) {
      return await handleUpdateTaskStatus(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/tasks/:id/assignee - 更新任务负责人
    if (method === "PUT" && path.endsWith('/assignee') && match && match[1]) {
      return await handleUpdateTaskAssignee(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/tasks/:id/due-date - 调整任务到期日
    if (method === "PUT" && path.endsWith('/due-date') && match && match[1]) {
      return await handleAdjustTaskDueDate(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/tasks/:id/sops - 获取任务关联的SOP
    if (method === "GET" && path.endsWith('/sops') && match && match[1]) {
      return await handleGetTaskSOPs(request, env, ctx, requestId, match, url);
    }
    
    // PUT /api/v2/tasks/:id/sops - 更新任务关联的SOP
    if (method === "PUT" && path.endsWith('/sops') && match && match[1]) {
      return await handleUpdateTaskSOPs(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/tasks/overview - 任务总览
    if (method === "GET" && path === '/api/v2/tasks/overview') {
      return await handleGetTasksOverview(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/tasks/:id - 任务详情
    if (method === "GET" && match && match[1] && !path.includes('/sops') && !path.includes('/overview') && !path.includes('/preview') && !path.includes('/documents') && !path.includes('/adjustment-history')) {
      return await handleGetTaskDetail(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/tasks - 任务列表
    if (method === "GET" && path === '/api/v2/tasks') {
      return await handleGetTasks(request, env, ctx, requestId, url);
    }
    
    // POST /api/v2/tasks - 创建任务
    if (method === "POST" && path === '/api/v2/tasks') {
      return await handleCreateTask(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/tasks/:id - 更新任务
    if (method === "PUT" && match && match[1] && !path.endsWith('/sops') && !path.endsWith('/status') && !path.endsWith('/assignee') && !path.endsWith('/due-date')) {
      return await handleUpdateTask(request, env, ctx, requestId, match, url);
    }
    
    // DELETE /api/v2/tasks/:id - 删除任务
    if (method === "DELETE" && match && match[1]) {
      return await handleDeleteTask(request, env, ctx, requestId, match, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Tasks] Error:`, err);
    console.error(`[Tasks] Error stack:`, err.stack);
    console.error(`[Tasks] Request path:`, path);
    console.error(`[Tasks] Request method:`, method);
    return errorResponse(500, "INTERNAL_ERROR", `伺服器錯誤: ${err.message || String(err)}`, null, requestId);
  }
}

