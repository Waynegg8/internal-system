/**
 * 任务SOP关联管理
 */

import { successResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 获取任务关联的SOP
 */
export async function handleGetTaskSOPs(request, env, ctx, requestId, match, url) {
  const taskId = match[1];
  
  const sops = await env.DATABASE.prepare(
    `SELECT s.sop_id, s.title, s.category, s.version
     FROM ActiveTaskSOPs ats
     JOIN SOPDocuments s ON s.sop_id = ats.sop_id
     WHERE ats.task_id = ? AND s.is_deleted = 0
     ORDER BY ats.sort_order ASC`
  ).bind(taskId).all();
  
  const data = (sops?.results || []).map(s => ({
    id: s.sop_id,
    title: s.title,
    category: s.category || "",
    version: s.version || 1
  }));
  
  return successResponse(data, "成功", requestId);
}

/**
 * 更新任务关联的SOP
 */
export async function handleUpdateTaskSOPs(request, env, ctx, requestId, match, url) {
  const taskId = match[1];
  const body = await request.json();
  const sopIds = Array.isArray(body?.sop_ids) ? body.sop_ids : [];
  
  // 删除现有关联
  await env.DATABASE.prepare(`DELETE FROM ActiveTaskSOPs WHERE task_id = ?`).bind(taskId).run();
  
  // 添加新关联
  for (let i = 0; i < sopIds.length; i++) {
    await env.DATABASE.prepare(
      `INSERT INTO ActiveTaskSOPs (task_id, sop_id, sort_order) VALUES (?, ?, ?)`
    ).bind(taskId, sopIds[i], i).run();
  }
  
  // 清除任务缓存
  await deleteKVCacheByPrefix(env, 'task_detail').catch(() => {});
  
  return successResponse({ taskId, sopIds }, "已更新", requestId);
}






