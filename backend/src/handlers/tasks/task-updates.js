/**
 * 任务更新相关操作（状态、负责人、到期日）
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 计算日期差（天数）
 */
function daysBetween(date1Str, date2Str) {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * 添加天数到日期
 */
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

async function insertTaskEvent(env, { taskId, stageId = null, configId = null, eventType, triggeredBy, payload }) {
  const data = {
    taskId,
    stageId,
    configId,
    eventType,
    triggeredBy,
    payloadJson: payload ? JSON.stringify(payload) : JSON.stringify({}),
  };
  await env.DATABASE.prepare(
    `INSERT INTO TaskEventLogs (task_id, stage_id, config_id, event_type, triggered_by, payload_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    data.taskId,
    data.stageId,
    data.configId,
    data.eventType,
    data.triggeredBy,
    data.payloadJson
  ).run();
}

async function insertDashboardAlert(env, { userId = null, alertType, title, description = null, link = null, payload = null, isAdminAlert = false }) {
  await env.DATABASE.prepare(
    `INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    userId,
    alertType,
    title,
    description,
    link,
    payload ? JSON.stringify(payload) : null,
    isAdminAlert ? 1 : 0
  ).run();
}

function normalizeStageRow(row) {
  if (!row) return null;
  return {
    stage_id: Number(row.stage_id),
    task_id: Number(row.task_id),
    stage_name: row.stage_name,
    stage_order: Number(row.stage_order),
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    delay_days: Number(row.delay_days || 0),
    triggered_at: row.triggered_at,
    triggered_by: row.triggered_by,
    notes: row.notes || null,
  };
}

async function getStageWithTask(env, stageId) {
  const row = await env.DATABASE.prepare(
    `SELECT 
        st.active_stage_id AS stage_id,
        st.task_id,
        st.stage_name,
        st.stage_order,
        st.status,
        st.started_at,
        st.completed_at,
        st.delay_days,
        st.triggered_at,
        st.triggered_by,
        st.notes,
        t.assignee_user_id,
        t.due_date,
        t.task_type,
        t.client_service_id,
        t.service_month,
        t.status AS task_status,
        t.adjustment_count,
        t.due_date_adjusted,
        t.last_adjustment_date
     FROM ActiveTaskStages st
     JOIN ActiveTasks t ON t.task_id = st.task_id
     WHERE st.active_stage_id = ?`
  ).bind(stageId).first();

  return normalizeStageRow(row)
    ? { stage: normalizeStageRow(row), task: row }
    : null;
}

/**
 * 自动调整后续任务的到期日（当前置任务完成延迟时）
 */
async function autoAdjustDependentTasks(env, taskId, userId) {
  try {
    // 获取刚完成的任务信息
    const completedTask = await env.DATABASE.prepare(`
      SELECT task_id, due_date, completed_at, original_due_date
      FROM ActiveTasks
      WHERE task_id = ? AND status = 'completed'
    `).bind(taskId).first();
    
    if (!completedTask || !completedTask.due_date || !completedTask.completed_at) {
      return { adjusted: 0, errors: [] };
    }
    
    // 计算延迟天数
    const completedDate = completedTask.completed_at.split('T')[0];
    const dueDate = completedTask.due_date;
    const delayDays = daysBetween(dueDate, completedDate);
    
    if (delayDays <= 0) {
      // 没有延迟，不需要调整
      return { adjusted: 0, errors: [] };
    }
    
    console.log(`[任务调整] 任务 ${taskId} 延迟了 ${delayDays} 天`);
    
    // 查找所有依赖此任务的后续任务
    const dependentTasks = await env.DATABASE.prepare(`
      SELECT task_id, task_name, due_date, status
      FROM ActiveTasks
      WHERE prerequisite_task_id = ?
        AND is_deleted = 0
        AND status NOT IN ('completed', 'cancelled')
    `).bind(taskId).all();
    
    const results = { adjusted: 0, errors: [] };
    
    for (const task of (dependentTasks.results || [])) {
      try {
        // 最多延长7天（可配置的限制）
        const adjustDays = Math.min(delayDays, 7);
        const newDueDate = addDays(task.due_date, adjustDays);
        
        // 更新任务到期日
        await env.DATABASE.prepare(`
          UPDATE ActiveTasks
          SET due_date = ?,
              due_date_adjusted = 1,
              adjustment_count = adjustment_count + 1,
              last_adjustment_date = datetime('now'),
              can_start_date = ?
          WHERE task_id = ?
        `).bind(newDueDate, completedDate, task.task_id).run();
        
        // 记录调整历史
        await env.DATABASE.prepare(`
          INSERT INTO TaskDueDateAdjustments (
            task_id, old_due_date, new_due_date, reason, adjustment_type,
            adjusted_by, is_overdue, adjusted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          task.task_id,
          task.due_date,
          newDueDate,
          `前置任务 ${taskId} 延迟完成，自动延长 ${adjustDays} 天`,
          'auto_adjust',
          userId,
          0
        ).run();
        
        results.adjusted++;
      } catch (err) {
        console.error(`[任务调整] 调整任务 ${task.task_id} 失败:`, err);
        results.errors.push({ task_id: task.task_id, error: String(err) });
      }
    }
    
    return results;
  } catch (err) {
    console.error('[任务调整] autoAdjustDependentTasks 失败:', err);
    throw err;
  }
}

/**
 * 记录任务状态更新
 */
export async function recordStatusUpdate(env, taskId, newStatus, userId, notes = {}) {
  try {
    // 先获取当前状态
    const task = await env.DATABASE.prepare(`
      SELECT status FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first();
    
    const oldStatus = task?.status || 'pending';
    
    await env.DATABASE.prepare(`
      INSERT INTO TaskStatusUpdates (
        task_id, old_status, new_status, status, updated_by,
        progress_note, blocker_reason, overdue_reason,
        expected_completion_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      taskId,
      oldStatus,
      newStatus,
      newStatus, // 保持兼容性
      userId,
      notes.progress_note || null,
      notes.blocker_reason || null,
      notes.overdue_reason || null,
      notes.expected_completion_date || null
    ).run();
    
    // 同时更新任务表的快照字段
    await env.DATABASE.prepare(`
      UPDATE ActiveTasks
      SET status_note = ?,
          blocker_reason = ?,
          overdue_reason = ?,
          expected_completion_date = ?,
          last_status_update = datetime('now')
      WHERE task_id = ?
    `).bind(
      notes.progress_note || null,
      notes.blocker_reason || null,
      notes.overdue_reason || null,
      notes.expected_completion_date || null,
      taskId
    ).run();
    
    return { success: true };
  } catch (err) {
    console.error('[任务调整] recordStatusUpdate 失败:', err);
    throw err;
  }
}

/**
 * 记录到期日调整
 */
export async function recordDueDateAdjustment(
  env,
  taskId,
  oldDueDate,
  newDueDate,
  reason,
  adjustmentType,
  userId,
  isOverdue = false,
  options = {}
) {
  try {
    const now = new Date().toISOString();
    const daysChanged = daysBetween(oldDueDate, newDueDate);
    const isInitial = options.isInitial === true;
    const isSystemAuto = options.isSystemAuto === true || adjustmentType === 'system_auto';

    // 获取当前调整次数
    const task = await env.DATABASE.prepare(`
      SELECT adjustment_count FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first();

    const adjustmentCount = (task?.adjustment_count || 0) + 1;

    // 记录调整历史
    await env.DATABASE.prepare(`
      INSERT INTO TaskDueDateAdjustments (
        task_id, old_due_date, new_due_date, days_changed, adjustment_reason, adjustment_type,
        requested_by, requested_at, is_overdue_adjustment, is_initial_creation, is_system_auto
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId,
      oldDueDate,
      newDueDate,
      daysChanged,
      reason,
      adjustmentType,
      userId,
      now,
      isOverdue ? 1 : 0,
      isInitial ? 1 : 0,
      isSystemAuto ? 1 : 0
    ).run();

    // 更新任务表
    await env.DATABASE.prepare(`
      UPDATE ActiveTasks
      SET due_date = ?,
          due_date_adjusted = 1,
          adjustment_count = ?,
          last_adjustment_date = ?,
          adjustment_reason = ?
      WHERE task_id = ?
    `).bind(
      newDueDate,
      adjustmentCount,
      now,
      reason,
      taskId
    ).run();

    return { success: true, adjustmentCount, daysChanged };
  } catch (err) {
    console.error('[任务调整] recordDueDateAdjustment 失败:', err);
    throw err;
  }
}

/**
 * 更新任务状态
 */
export async function handleUpdateTaskStatus(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const taskId = match[1];
  
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const status = body?.status;
  const progress_note = (body?.progress_note || '').trim() || null;
  const blocker_reason = (body?.blocker_reason || '').trim() || null;
  const overdue_reason = (body?.overdue_reason || '').trim() || null;
  const expected_completion_date = body?.expected_completion_date || null;
  
  const errors = [];
  if (!['in_progress', 'completed', 'cancelled'].includes(status)) {
    errors.push({ field: 'status', message: '狀態無效' });
  }
  
  try {
    // 获取任务信息
    const task = await env.DATABASE.prepare(`
      SELECT task_id, due_date, status as current_status, assignee_user_id
      FROM ActiveTasks
      WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first();
    
    if (!task) {
      return errorResponse(404, "NOT_FOUND", "任務不存在", null, requestId);
    }
    
    // 权限检查：只有管理员或任务负责人可以更新
    if (!user.is_admin && Number(task.assignee_user_id) !== Number(user.user_id)) {
      return errorResponse(403, "FORBIDDEN", "無權限更新此任務", null, requestId);
    }
    
    // 检查是否逾期（基于当前状态，用于验证）
    const today = new Date().toISOString().split('T')[0];
    const currentIsOverdue = task.due_date && task.due_date < today && task.current_status !== 'completed' && task.current_status !== 'cancelled';
    
    // 如果任务逾期，必须填写逾期原因
    if (currentIsOverdue && !overdue_reason) {
      errors.push({ field: 'overdue_reason', message: '任務逾期，必須填寫逾期原因' });
    }
    
    if (errors.length) {
      return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
    }
    
    // 记录状态更新
    await recordStatusUpdate(env, taskId, status, user.user_id, {
      progress_note,
      blocker_reason,
      overdue_reason,
      expected_completion_date
    });
    
    // 更新任务状态
    let completedAt = null;
    if (status === 'completed') {
      completedAt = new Date().toISOString();
    }
    
    // 计算更新后的 is_overdue 状态
    // 逻辑：due_date < current date AND status NOT IN ('completed', 'cancelled')
    const newIsOverdue = task.due_date && task.due_date < today && status !== 'completed' && status !== 'cancelled';
    
    await env.DATABASE.prepare(`
      UPDATE ActiveTasks
      SET status = ?,
          completed_at = ?,
          is_overdue = ?
      WHERE task_id = ?
    `).bind(status, completedAt, newIsOverdue ? 1 : 0, taskId).run();
    
    // 如果任务完成，自动调整后续依赖任务
    if (status === 'completed') {
      try {
        const adjustResult = await autoAdjustDependentTasks(env, taskId, user.user_id);
        console.log(`[任务完成] 自动调整了 ${adjustResult.adjusted} 个后续任务`);
      } catch (err) {
        console.error('[任务完成] 自动调整后续任务失败:', err);
        // 不阻塞主流程
      }
    }
    
    // 清除任务缓存
    await deleteKVCacheByPrefix(env, 'task_detail').catch(() => {});
    await deleteKVCacheByPrefix(env, 'tasks_list').catch(() => {});
    
    return successResponse({ taskId, status }, "已更新狀態", requestId);
  } catch (err) {
    console.error(`[Tasks] Update status error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 更新任务负责人
 */
export async function handleUpdateTaskAssignee(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const taskId = match[1];
  
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const assigneeUserId = body?.assignee_user_id ? Number(body.assignee_user_id) : null;
  
  const errors = [];
  if (assigneeUserId !== null && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) {
    errors.push({ field: "assignee_user_id", message: "格式錯誤" });
  }
  
  try {
    // 检查任务是否存在
    const task = await env.DATABASE.prepare(`
      SELECT task_id, assignee_user_id FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first();
    
    if (!task) {
      return errorResponse(404, "NOT_FOUND", "任務不存在", null, requestId);
    }
    
    // 权限检查：只有管理员可以更新负责人
    if (!user.is_admin) {
      return errorResponse(403, "FORBIDDEN", "無權限更新負責人", null, requestId);
    }
    
    // 验证负责人存在
    if (assigneeUserId) {
      const u = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
      if (!u) {
        errors.push({ field: "assignee_user_id", message: "負責人不存在" });
      }
    }
    
    if (errors.length) {
      return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
    }
    
    // 更新负责人
    await env.DATABASE.prepare(`
      UPDATE ActiveTasks SET assignee_user_id = ? WHERE task_id = ?
    `).bind(assigneeUserId, taskId).run();
    
    // 清除任务缓存
    await deleteKVCacheByPrefix(env, 'task_detail').catch(() => {});
    await deleteKVCacheByPrefix(env, 'tasks_list').catch(() => {});
    
    return successResponse({ taskId, assignee_user_id: assigneeUserId }, "已更新負責人", requestId);
  } catch (err) {
    console.error(`[Tasks] Update assignee error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 调整任务到期日
 */
export async function handleAdjustTaskDueDate(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const taskId = match[1];
  
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const new_due_date = body?.new_due_date || body?.due_date;
  const reason = (body?.reason || '').trim();
  
  const errors = [];
  if (!new_due_date || !/^\d{4}-\d{2}-\d{2}$/.test(new_due_date)) {
    errors.push({ field: 'new_due_date', message: '日期格式無效 (YYYY-MM-DD)' });
  }
  if (!reason) {
    errors.push({ field: 'reason', message: '必須填寫調整原因' });
  }
  
  if (errors.length) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  try {
    // 获取任务信息
    const task = await env.DATABASE.prepare(`
      SELECT task_id, due_date, status, assignee_user_id
      FROM ActiveTasks
      WHERE task_id = ? AND is_deleted = 0
    `).bind(taskId).first();
    
    if (!task) {
      return errorResponse(404, "NOT_FOUND", "任務不存在", null, requestId);
    }
    
    // 权限检查：只有管理员或任务负责人可以调整
    if (!user.is_admin && Number(task.assignee_user_id) !== Number(user.user_id)) {
      return errorResponse(403, "FORBIDDEN", "無權限調整此任務", null, requestId);
    }
    
    // 检查是否逾期
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = task.due_date && task.due_date < today && task.status !== 'completed';
    
    // 记录调整
    await recordDueDateAdjustment(
      env,
      taskId,
      task.due_date,
      new_due_date,
      reason,
      isOverdue ? 'overdue_adjust' : 'manual_adjust',
      user.user_id,
      isOverdue
    );
    
    // 清除任务缓存
    await deleteKVCacheByPrefix(env, 'task_detail').catch(() => {});
    await deleteKVCacheByPrefix(env, 'tasks_list').catch(() => {});
    
    return successResponse({ taskId, due_date: new_due_date }, "已調整到期日", requestId);
  } catch (err) {
    console.error(`[Tasks] Adjust due date error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 更新任務階段狀態
 */
async function handleUpdateTaskStage(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;

  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }

  const taskId = Number(match[1]);
  const stageId = Number(match[2]);

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }

  const allowedStatuses = ["in_progress", "completed", "blocked"];
  const targetStatus = body?.status;
  const delayDays = body?.delay_days !== undefined ? Number(body.delay_days) : null;
  const triggerNotes = (body?.notes || "").trim();
  const confirmSync = body?.confirm_sync === true; // 階段同步確認標誌

  const errors = [];
  if (targetStatus && !allowedStatuses.includes(targetStatus)) {
    errors.push({ field: "status", message: "狀態無效" });
  }
  if (delayDays !== null && (!Number.isFinite(delayDays) || delayDays < 0 || delayDays > 365)) {
    errors.push({ field: "delay_days", message: "延遲天數需介於 0-365" });
  }

  if (errors.length) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }

  const stageBundle = await getStageWithTask(env, stageId);
  if (!stageBundle) {
    return errorResponse(404, "NOT_FOUND", "階段不存在", null, requestId);
  }

  if (Number(stageBundle.stage.task_id) !== taskId) {
    return errorResponse(400, "BAD_REQUEST", "階段不屬於指定任務", null, requestId);
  }

  const taskRow = stageBundle.task;
  if (!user.is_admin && Number(taskRow.assignee_user_id) !== Number(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限更新此階段", null, requestId);
  }

  const nowIso = new Date().toISOString();
  const updates = [];
  const binds = [];

  if (targetStatus) {
    updates.push("status = ?");
    binds.push(targetStatus);
  }

  if (targetStatus === "completed") {
    updates.push("completed_at = ?");
    binds.push(nowIso);
  }

  if (targetStatus === "in_progress" && !stageBundle.stage.started_at) {
    updates.push("started_at = ?");
    binds.push(nowIso);
  }

  if (delayDays !== null) {
    updates.push("delay_days = ?");
    binds.push(delayDays);
  }

  updates.push("triggered_at = ?");
  binds.push(nowIso);
  updates.push("triggered_by = ?");
  binds.push(`user:${user.user_id}`);

  await env.DATABASE.prepare(
    `UPDATE ActiveTaskStages
     SET ${updates.join(", ")}
     WHERE active_stage_id = ?`
  ).bind(...binds, stageId).run();

  // 重新取得更新後的階段資料
  const updatedBundle = await getStageWithTask(env, stageId);
  const updatedStage = updatedBundle ? updatedBundle.stage : null;

  let nextStageData = null;
  const payload = {
    status: targetStatus || updatedStage?.status,
    delay_days: delayDays,
  };

  await insertTaskEvent(env, {
    taskId,
    stageId,
    eventType: "stage_status_updated",
    triggeredBy: `user:${user.user_id}`,
    payload: { ...payload, notes: triggerNotes || null },
  });

  if (targetStatus === "completed") {
    const delay = delayDays && delayDays > 0 ? delayDays : 0;

    if (delay > 0 && taskRow.due_date) {
      const newDueDate = addDays(taskRow.due_date, delay);
      await recordDueDateAdjustment(
        env,
        taskId,
        taskRow.due_date,
        newDueDate,
        `階段「${updatedStage.stage_name}」延遲 ${delay} 天`,
        "system_auto",
        user.user_id,
        false,
        { isSystemAuto: true }
      ).catch((err) => {
        console.error("[Tasks] 自動順延任務到期失敗:", err);
      });

      await insertTaskEvent(env, {
        taskId,
        stageId,
        eventType: "stage_delay_adjust",
        triggeredBy: `user:${user.user_id}`,
        payload: { delayDays: delay, previousDueDate: taskRow.due_date, newDueDate },
      });
    } else {
      await insertTaskEvent(env, {
        taskId,
        stageId,
        eventType: "stage_completed",
        triggeredBy: `user:${user.user_id}`,
        payload: { delayDays: delay },
      });
    }

    // 自動啟動下一階段（需要確認）
    const nextStageRow = await env.DATABASE.prepare(
      `SELECT active_stage_id AS stage_id, stage_name, stage_order
       FROM ActiveTaskStages
       WHERE task_id = ? AND stage_order > ?
       ORDER BY stage_order ASC
       LIMIT 1`
    ).bind(taskId, updatedStage.stage_order).first();

    if (nextStageRow) {
      const nextStageId = nextStageRow.stage_id;
      const nextStageName = nextStageRow.stage_name || `階段 ${nextStageRow.stage_order}`;
      
      // 如果需要同步但未確認，返回需要確認的響應
      if (!confirmSync) {
        return errorResponse(
          428, // 428 Precondition Required
          "SYNC_CONFIRMATION_REQUIRED",
          "需要確認階段同步",
          {
            requires_confirmation: true,
            next_stage: {
              stage_id: nextStageId,
              stage_name: nextStageName,
              stage_order: nextStageRow.stage_order
            },
            message: `完成當前階段後，下一階段「${nextStageName}」將自動啟動。請確認是否繼續。`
          },
          requestId
        );
      }

      // 已確認，執行階段同步
      await env.DATABASE.prepare(
        `UPDATE ActiveTaskStages
         SET status = 'in_progress',
             started_at = COALESCE(started_at, ?),
             triggered_at = ?,
             triggered_by = ?
         WHERE active_stage_id = ? AND status != 'completed'`
      ).bind(nowIso, nowIso, `user:${user.user_id}`, nextStageId).run();

      const nextStageBundle = await getStageWithTask(env, nextStageId);
      nextStageData = nextStageBundle ? nextStageBundle.stage : null;

      if (nextStageData) {
        await insertTaskEvent(env, {
          taskId,
          stageId: nextStageId,
          eventType: "stage_status_changed",
          triggeredBy: `user:${user.user_id}`,
          payload: {
            old_status: nextStageData.status || 'pending',
            new_status: 'in_progress',
            stage_name: nextStageData.stage_name,
            stage_order: nextStageData.stage_order,
            confirmed_by_user: true
          },
        });
      }
    } else {
      // 所有階段完成，記錄事件
      await insertTaskEvent(env, {
        taskId,
        eventType: "service_all_completed",
        triggeredBy: `user:${user.user_id}`,
        payload: { stageId },
      });

      const completedAtIso = nowIso;
      const completedDate = completedAtIso.split('T')[0];
      // 任务完成时，is_overdue 应该为 0（完成的任务不标记为逾期）
      // 逻辑：due_date < current date AND status NOT IN ('completed', 'cancelled')
      // 由于状态是 'completed'，所以 is_overdue = 0
      await env.DATABASE.prepare(
        `UPDATE ActiveTasks
         SET status = 'completed',
             completed_at = ?,
             completed_date = ?,
             is_overdue = 0
         WHERE task_id = ?`
      ).bind(completedAtIso, completedDate, taskId).run();

      await recordStatusUpdate(env, taskId, 'completed', user.user_id, { source: 'stage_auto' }).catch(() => {});
      await autoAdjustDependentTasks(env, taskId, user.user_id).catch(() => {});
      
      // 處理固定期限任務邏輯
      try {
        const { handleFixedDeadlineTaskLogic } = await import("../task-generator/fixed-deadline-handler.js");
        await handleFixedDeadlineTaskLogic(env, taskId, user.user_id).catch((err) => {
          console.error("[Tasks] 固定期限任務處理失敗:", err);
        });
      } catch (err) {
        console.warn("[Tasks] 無法載入固定期限任務處理模組:", err);
      }

      const context = await env.DATABASE.prepare(
        `SELECT 
            t.task_id,
            t.task_type,
            t.due_date,
            cs.client_service_id,
            COALESCE(svc.service_name, '') AS service_name,
            cs.client_id,
            c.company_name,
            c.assignee_user_id AS client_owner_id
         FROM ActiveTasks t
         LEFT JOIN ClientServices cs ON t.client_service_id = cs.client_service_id
         LEFT JOIN Services svc ON cs.service_id = svc.service_id
         LEFT JOIN Clients c ON cs.client_id = c.client_id
         WHERE t.task_id = ?`
      ).bind(taskId).first();

      if (context) {
        const alertPayload = {
          taskId: context.task_id,
          clientId: context.client_id,
          clientServiceId: context.client_service_id,
          serviceName: context.service_name,
          taskName: context.task_type,
          clientName: context.company_name,
          dueDate: context.due_date,
        };

        const alertTitle = `${context.company_name || "未命名客戶"} - ${context.service_name || "服務"} 已完成`;
        const alertDescription = `請立即開立收據（任務：${context.task_type || "未命名任務"}）`;
        const alertLink = `/tasks/${taskId}`;

        if (context.client_owner_id) {
          await insertDashboardAlert(env, {
            userId: context.client_owner_id,
            alertType: "receipt_pending",
            title: alertTitle,
            description: alertDescription,
            link: alertLink,
            payload: alertPayload,
          }).catch((err) => console.error("[DashboardAlerts] Insert client alert failed:", err));
        }

        await insertDashboardAlert(env, {
          userId: null,
          alertType: "receipt_pending",
          title: alertTitle,
          description: alertDescription,
          link: alertLink,
          payload: alertPayload,
          isAdminAlert: true,
        }).catch((err) => console.error("[DashboardAlerts] Insert admin alert failed:", err));
      }
    }
  }

  await deleteKVCacheByPrefix(env, "task_detail").catch(() => {});
  await deleteKVCacheByPrefix(env, "tasks_list").catch(() => {});

  return successResponse(
    {
      stage: updatedStage,
      nextStage: nextStageData,
    },
    "已更新階段",
    requestId
  );
}

export { handleUpdateTaskStage };

