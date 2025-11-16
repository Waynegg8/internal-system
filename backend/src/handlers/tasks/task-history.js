/**
 * 任务变更历史
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取任务变更历史
 */
export async function handleGetTaskAdjustmentHistory(request, env, ctx, requestId, match, url) {
  const taskId = match[1];
  
  try {
    // 检查任务是否存在
    const task = await env.DATABASE.prepare(`
      SELECT task_id FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first();
    
    if (!task) {
      return errorResponse(404, "NOT_FOUND", "任務不存在", null, requestId);
    }
    
    // 获取状态更新历史
    const statusRows = await env.DATABASE.prepare(`
      SELECT 
        tsu.update_id,
        tsu.old_status,
        tsu.new_status,
        tsu.progress_note,
        tsu.blocker_reason,
        tsu.overdue_reason,
        tsu.expected_completion_date,
        tsu.updated_at,
        u.name AS updated_by_name
      FROM TaskStatusUpdates tsu
      LEFT JOIN Users u ON u.user_id = tsu.updated_by
      WHERE tsu.task_id = ?
      ORDER BY tsu.updated_at DESC
    `).bind(taskId).all();
    
    // 获取到期日调整历史
    const dueDateRows = await env.DATABASE.prepare(`
      SELECT 
        tda.adjustment_id,
        tda.old_due_date,
        tda.new_due_date,
        tda.reason,
        tda.adjustment_type,
        tda.is_overdue,
        tda.adjusted_at,
        u.name AS adjusted_by_name
      FROM TaskDueDateAdjustments tda
      LEFT JOIN Users u ON u.user_id = tda.adjusted_by
      WHERE tda.task_id = ?
      ORDER BY tda.adjusted_at DESC
    `).bind(taskId).all();
    
    const statusHistory = (statusRows?.results || []).map(r => ({
      type: 'status',
      id: String(r.update_id),
      old_status: r.old_status,
      new_status: r.new_status,
      progress_note: r.progress_note,
      blocker_reason: r.blocker_reason,
      overdue_reason: r.overdue_reason,
      expected_completion_date: r.expected_completion_date,
      updated_at: r.updated_at,
      updated_by_name: r.updated_by_name
    }));
    
    const dueDateHistory = (dueDateRows?.results || []).map(r => ({
      type: 'due_date',
      id: String(r.adjustment_id),
      old_due_date: r.old_due_date,
      new_due_date: r.new_due_date,
      reason: r.reason,
      adjustment_type: r.adjustment_type,
      is_overdue: Boolean(r.is_overdue),
      adjusted_at: r.adjusted_at,
      adjusted_by_name: r.adjusted_by_name
    }));
    
    // 合并并按时间排序
    const history = [...statusHistory, ...dueDateHistory].sort((a, b) => {
      const timeA = a.updated_at || a.adjusted_at;
      const timeB = b.updated_at || b.adjusted_at;
      return new Date(timeB) - new Date(timeA);
    });
    
    return successResponse(history, "查詢成功", requestId);
  } catch (err) {
    console.error(`[Tasks] Get adjustment history error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}






