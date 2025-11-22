/**
 * 任務批量操作 Handler
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix } from "../../utils/cache.js";
import { recordStatusUpdate, recordDueDateAdjustment } from "./task-updates.js";

/**
 * 批量更新任務
 */
export async function handleBatchUpdateTasks(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 驗證用戶身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const taskIds = body?.task_ids || [];
  const operation = body?.operation; // 'assign_assignee', 'update_status', 'adjust_due_date'
  const assigneeUserId = body?.assignee_user_id !== undefined ? Number(body.assignee_user_id) : null;
  const status = body?.status;
  const dueDate = body?.due_date;
  const reason = (body?.reason || '').trim() || null;
  const progressNote = (body?.progress_note || '').trim() || null;
  const overdueReason = (body?.overdue_reason || '').trim() || null;
  
  // 驗證輸入參數
  const errors = [];
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    errors.push({ field: 'task_ids', message: '任務ID列表不能為空' });
  }
  if (!operation || !['assign_assignee', 'update_status', 'adjust_due_date'].includes(operation)) {
    errors.push({ field: 'operation', message: '操作類型無效' });
  }
  
  // 驗證操作特定參數
  if (operation === 'assign_assignee') {
    if (assigneeUserId !== null && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) {
      errors.push({ field: 'assignee_user_id', message: '負責人ID格式錯誤' });
    }
  } else if (operation === 'update_status') {
    if (!status || !['in_progress', 'completed', 'cancelled'].includes(status)) {
      errors.push({ field: 'status', message: '狀態無效' });
    }
  } else if (operation === 'adjust_due_date') {
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      errors.push({ field: 'due_date', message: '到期日格式錯誤（YYYY-MM-DD）' });
    }
    if (!reason) {
      errors.push({ field: 'reason', message: '調整原因必填' });
    }
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 驗證所有任務ID都是有效的整數
  const validTaskIds = [];
  for (const taskId of taskIds) {
    const id = Number(taskId);
    if (Number.isInteger(id) && id > 0) {
      validTaskIds.push(id);
    } else {
      errors.push({ field: 'task_ids', message: `無效的任務ID: ${taskId}` });
    }
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  if (validTaskIds.length === 0) {
    return errorResponse(422, "VALIDATION_ERROR", "沒有有效的任務ID", null, requestId);
  }
  
  try {
    // 驗證任務存在且用戶有權限
    const placeholders = validTaskIds.map(() => '?').join(',');
    const tasks = await env.DATABASE.prepare(
      `SELECT task_id, assignee_user_id, status, due_date 
       FROM ActiveTasks 
       WHERE task_id IN (${placeholders}) AND is_deleted = 0`
    ).bind(...validTaskIds).all();
    
    const existingTaskIds = (tasks?.results || []).map(t => Number(t.task_id));
    const notFoundIds = validTaskIds.filter(id => !existingTaskIds.includes(id));
    
    if (notFoundIds.length > 0) {
      return errorResponse(404, "NOT_FOUND", `以下任務不存在: ${notFoundIds.join(', ')}`, null, requestId);
    }
    
    // 權限檢查：非管理員只能操作自己負責的任務
    if (!user.is_admin) {
      const unauthorizedTasks = (tasks?.results || []).filter(
        t => Number(t.assignee_user_id) !== Number(user.user_id)
      );
      if (unauthorizedTasks.length > 0) {
        const unauthorizedIds = unauthorizedTasks.map(t => t.task_id);
        return errorResponse(403, "FORBIDDEN", `無權限操作以下任務: ${unauthorizedIds.join(', ')}`, null, requestId);
      }
    }
    
    // 驗證負責人存在（如果是分配負責人操作）
    if (operation === 'assign_assignee' && assigneeUserId) {
      const assignee = await env.DATABASE.prepare(
        "SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1"
      ).bind(assigneeUserId).first();
      if (!assignee) {
        return errorResponse(422, "VALIDATION_ERROR", "負責人不存在", [{ field: 'assignee_user_id', message: '負責人不存在' }], requestId);
      }
    }
    
    // 執行批量操作
    const results = {
      total: validTaskIds.length,
      success: [],
      failed: []
    };
    
    // 使用 batch 操作提高效率
    const statements = [];
    const today = new Date().toISOString().split('T')[0];
    
    for (const task of tasks.results) {
      const taskId = Number(task.task_id);
      try {
        if (operation === 'assign_assignee') {
          // 批量分配負責人
          statements.push(
            env.DATABASE.prepare(
              `UPDATE ActiveTasks SET assignee_user_id = ? WHERE task_id = ?`
            ).bind(assigneeUserId, taskId)
          );
          results.success.push({ task_id: taskId, operation: 'assign_assignee' });
          
        } else if (operation === 'update_status') {
          // 批量更新狀態
          const currentStatus = task.status;
          const currentDueDate = task.due_date;
          
          // 檢查是否逾期（用於驗證）
          const currentIsOverdue = currentDueDate && currentDueDate < today && 
                                   currentStatus !== 'completed' && currentStatus !== 'cancelled';
          
          if (currentIsOverdue && !overdueReason) {
            results.failed.push({
              task_id: taskId,
              operation: 'update_status',
              error: '任務逾期，必須填寫逾期原因'
            });
            continue;
          }
          
          // 記錄狀態更新
          await recordStatusUpdate(env, taskId, status, user.user_id, {
            progress_note: progressNote,
            overdue_reason: overdueReason
          }).catch(err => {
            console.error(`[Batch] 記錄狀態更新失敗 (task ${taskId}):`, err);
            // 繼續執行，不阻塞
          });
          
          // 計算新的 is_overdue 狀態
          const newIsOverdue = currentDueDate && currentDueDate < today && 
                              status !== 'completed' && status !== 'cancelled';
          
          const completedAt = status === 'completed' ? new Date().toISOString() : null;
          
          statements.push(
            env.DATABASE.prepare(
              `UPDATE ActiveTasks 
               SET status = ?, completed_at = ?, is_overdue = ? 
               WHERE task_id = ?`
            ).bind(status, completedAt, newIsOverdue ? 1 : 0, taskId)
          );
          
          results.success.push({ task_id: taskId, operation: 'update_status' });
          
        } else if (operation === 'adjust_due_date') {
          // 批量調整到期日
          const oldDueDate = task.due_date || today;
          const newIsOverdue = dueDate < today && task.status !== 'completed' && task.status !== 'cancelled';
          
          // 記錄到期日調整
          await recordDueDateAdjustment(
            env,
            taskId,
            oldDueDate,
            dueDate,
            reason,
            'manual',
            user.user_id,
            newIsOverdue
          ).catch(err => {
            console.error(`[Batch] 記錄到期日調整失敗 (task ${taskId}):`, err);
            // 繼續執行，不阻塞
          });
          
          // 更新 is_overdue 狀態
          statements.push(
            env.DATABASE.prepare(
              `UPDATE ActiveTasks 
               SET due_date = ?, is_overdue = ? 
               WHERE task_id = ?`
            ).bind(dueDate, newIsOverdue ? 1 : 0, taskId)
          );
          
          results.success.push({ task_id: taskId, operation: 'adjust_due_date' });
        }
      } catch (err) {
        console.error(`[Batch] 處理任務 ${taskId} 失敗:`, err);
        results.failed.push({
          task_id: taskId,
          operation: operation,
          error: err.message || '處理失敗'
        });
      }
    }
    
    // 執行批量更新
    if (statements.length > 0) {
      try {
        await env.DATABASE.batch(statements);
      } catch (err) {
        console.error('[Batch] 批量執行失敗:', err);
        // 如果批量執行失敗，標記所有為失敗
        for (const task of tasks.results) {
          const taskId = Number(task.task_id);
          if (!results.failed.find(f => f.task_id === taskId)) {
            results.failed.push({
              task_id: taskId,
              operation: operation,
              error: '批量執行失敗'
            });
            results.success = results.success.filter(s => s.task_id !== taskId);
          }
        }
      }
    }
    
    // 清除緩存
    await Promise.all([
      deleteKVCacheByPrefix(env, 'task_detail').catch(() => {}),
      deleteKVCacheByPrefix(env, 'tasks_list').catch(() => {}),
      deleteKVCacheByPrefix(env, 'tasks_stats').catch(() => {})
    ]);
    
    // 返回結果
    const successCount = results.success.length;
    const failedCount = results.failed.length;
    
    if (failedCount === 0) {
      return successResponse({
        total: results.total,
        success: successCount,
        failed: failedCount,
        details: results.success
      }, `批量操作成功：${successCount} 個任務已更新`, requestId);
    } else if (successCount > 0) {
      return successResponse({
        total: results.total,
        success: successCount,
        failed: failedCount,
        details: {
          success: results.success,
          failed: results.failed
        }
      }, `部分成功：${successCount} 個任務已更新，${failedCount} 個任務失敗`, requestId);
    } else {
      return errorResponse(500, "BATCH_OPERATION_FAILED", "批量操作失敗", {
        total: results.total,
        success: successCount,
        failed: failedCount,
        details: results.failed
      }, requestId);
    }
  } catch (err) {
    console.error(`[Tasks Batch] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", `伺服器錯誤: ${err.message || String(err)}`, null, requestId);
  }
}



