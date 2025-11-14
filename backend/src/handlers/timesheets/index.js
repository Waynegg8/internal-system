/**
 * 工时管理主入口
 * 模块化路由到各个处理器
 */

import { errorResponse } from "../../utils/response.js";
import { handleGetTimesheets, handleGetTimesheetDetail, handleCreateOrUpdateTimesheet, handleDeleteTimesheet } from "./timesheet-crud.js";
import { handleGetMyStats } from "./timesheet-stats.js";

export async function handleTimesheets(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  
  try {
    // GET /api/v2/timesheets - 查询工时记录
    if (method === "GET" && path === '/api/v2/timesheets') {
      return await handleGetTimesheets(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/timesheets/:id - 获取单条工时记录
    if (method === "GET" && match && match[1]) {
      return await handleGetTimesheetDetail(request, env, ctx, requestId, match, url);
    }
    
    // POST /api/v2/timesheets - 新增/更新工时（UPSERT）
    if (method === "POST" && path === '/api/v2/timesheets') {
      return await handleCreateOrUpdateTimesheet(request, env, ctx, requestId, url);
    }
    
    // PUT /api/v2/timesheets/:id - 更新工时记录
    if (method === "PUT" && match && match[1]) {
      // 使用 POST 逻辑进行更新
      const body = await request.json();
      const updateBody = {
        ...body,
        timesheet_id: match[1],
        work_date: body.work_date || undefined
      };
      
      const updateRequest = new Request(request.url, {
        method: 'POST',
        body: JSON.stringify(updateBody),
        headers: request.headers
      });
      
      return await handleCreateOrUpdateTimesheet(updateRequest, env, ctx, requestId, url);
    }
    
    // DELETE /api/v2/timesheets/:id - 删除工时记录
    if (method === "DELETE" && match && match[1]) {
      return await handleDeleteTimesheet(request, env, ctx, requestId, match, url);
    }
    
    // GET /api/v2/timesheets/my-stats - 获取我的工时统计
    if (method === "GET" && path === '/api/v2/timesheets/my-stats') {
      return await handleGetMyStats(request, env, ctx, requestId, url);
    }
    
    // GET /api/v2/timesheets/monthly-summary - 获取月度统计（别名）
    if (method === "GET" && path === '/api/v2/timesheets/monthly-summary') {
      return await handleGetMyStats(request, env, ctx, requestId, url);
    }
    
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
    
  } catch (err) {
    console.error(`[Timesheets] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

