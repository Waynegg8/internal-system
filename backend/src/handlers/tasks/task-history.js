/**
 * 任务变更历史
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取任务变更历史（增强版 - 包含所有变更类型）
 */
export async function handleGetTaskHistory(request, env, ctx, requestId, match, url) {
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
        tsu.updated_by,
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
        tda.adjustment_reason AS reason,
        tda.adjustment_type,
        tda.is_overdue_adjustment AS is_overdue,
        tda.requested_at,
        tda.requested_by,
        u.name AS requested_by_name
      FROM TaskDueDateAdjustments tda
      LEFT JOIN Users u ON u.user_id = tda.requested_by
      WHERE tda.task_id = ?
      ORDER BY tda.requested_at DESC
    `).bind(taskId).all();
    
    // 获取 TaskEventLogs 中的事件历史
    const eventRows = await env.DATABASE.prepare(`
      SELECT 
        tel.event_id,
        tel.event_type,
        tel.payload_json,
        tel.created_at,
        tel.triggered_by,
        u.name AS triggered_by_name
      FROM TaskEventLogs tel
      LEFT JOIN Users u ON u.user_id = CAST(REPLACE(tel.triggered_by, 'user:', '') AS INTEGER)
      WHERE tel.task_id = ?
        AND tel.event_type IN ('assignee_changed', 'stage_status_changed', 'stage_status_updated', 'sop_association_changed', 'document_changed')
      ORDER BY tel.created_at DESC
    `).bind(taskId).all();
    
    // 格式化状态更新历史
    const statusHistory = (statusRows?.results || []).map(r => {
      let content = `狀態從「${r.old_status || '未設置'}」變更為「${r.new_status || '未設置'}」`;
      if (r.progress_note) {
        content += `\n進度說明：${r.progress_note}`;
      }
      if (r.blocker_reason) {
        content += `\n阻礙原因：${r.blocker_reason}`;
      }
      if (r.overdue_reason) {
        content += `\n逾期原因：${r.overdue_reason}`;
      }
      if (r.expected_completion_date) {
        content += `\n預期完成日期：${r.expected_completion_date}`;
      }
      
      return {
        type: 'status',
        id: String(r.update_id),
        content,
        time: r.updated_at,
        user_id: r.updated_by ? String(r.updated_by) : null,
        user_name: r.updated_by_name || null,
        // 保留原始字段以保持兼容性
        old_status: r.old_status,
        new_status: r.new_status,
        progress_note: r.progress_note,
        blocker_reason: r.blocker_reason,
        overdue_reason: r.overdue_reason,
        expected_completion_date: r.expected_completion_date
      };
    });
    
    // 格式化到期日调整历史
    const dueDateHistory = (dueDateRows?.results || []).map(r => {
      let content = `到期日從「${r.old_due_date || '未設置'}」調整為「${r.new_due_date || '未設置'}」`;
      if (r.reason) {
        content += `\n調整原因：${r.reason}`;
      }
      if (r.adjustment_type) {
        content += `\n調整類型：${r.adjustment_type}`;
      }
      
      return {
        type: 'due_date',
        id: String(r.adjustment_id),
        content,
        time: r.requested_at,
        user_id: r.requested_by ? String(r.requested_by) : null,
        user_name: r.requested_by_name || null,
        // 保留原始字段以保持兼容性
        old_due_date: r.old_due_date,
        new_due_date: r.new_due_date,
        reason: r.reason,
        adjustment_type: r.adjustment_type,
        is_overdue: Boolean(r.is_overdue)
      };
    });
    
    // 格式化事件历史
    const eventHistory = (eventRows?.results || []).map(r => {
      let payload = {};
      try {
        payload = r.payload_json ? JSON.parse(r.payload_json) : {};
      } catch (e) {
        console.warn(`[Tasks] Failed to parse payload_json for event ${r.event_id}:`, e);
      }
      
      // 提取用户ID（从 triggered_by 字段，格式为 "user:123"）
      let userId = null;
      if (r.triggered_by && r.triggered_by.startsWith('user:')) {
        userId = r.triggered_by.replace('user:', '');
      }
      
      let content = '';
      let eventType = r.event_type;
      
      // 根据事件类型格式化内容
      if (r.event_type === 'assignee_changed') {
        const oldAssigneeId = payload.old_assignee_id;
        const newAssigneeId = payload.new_assignee_id;
        content = `負責人變更`;
        if (oldAssigneeId && newAssigneeId) {
          content += `：從用戶 ID ${oldAssigneeId} 變更為用戶 ID ${newAssigneeId}`;
        } else if (newAssigneeId) {
          content += `：設置為用戶 ID ${newAssigneeId}`;
        } else if (oldAssigneeId) {
          content += `：移除負責人（原為用戶 ID ${oldAssigneeId}）`;
        }
      } else if (r.event_type === 'stage_status_changed' || r.event_type === 'stage_status_updated') {
        const stageId = payload.stage_id || r.stage_id;
        const oldStatus = payload.old_status;
        const newStatus = payload.status || payload.new_status;
        content = `階段狀態變更`;
        if (stageId) {
          content += `（階段 ID: ${stageId}）`;
        }
        if (oldStatus && newStatus) {
          content += `：從「${oldStatus}」變更為「${newStatus}」`;
        } else if (newStatus) {
          content += `：變更為「${newStatus}」`;
        }
        if (payload.notes) {
          content += `\n備註：${payload.notes}`;
        }
        if (payload.delay_days) {
          content += `\n延遲天數：${payload.delay_days}`;
        }
        eventType = 'stage_status';
      } else if (r.event_type === 'sop_association_changed') {
        const addedSopIds = payload.added_sop_ids || [];
        const removedSopIds = payload.removed_sop_ids || [];
        content = `SOP 關聯變更`;
        if (addedSopIds.length > 0) {
          content += `\n新增 SOP：${addedSopIds.join(', ')}`;
        }
        if (removedSopIds.length > 0) {
          content += `\n移除 SOP：${removedSopIds.join(', ')}`;
        }
        if (addedSopIds.length === 0 && removedSopIds.length === 0) {
          content += `：無變更`;
        }
        eventType = 'sop';
      } else if (r.event_type === 'document_changed') {
        const documentId = payload.document_id;
        const action = payload.action; // 'upload' or 'delete'
        const fileName = payload.file_name || payload.fileName;
        content = `文檔${action === 'upload' ? '上傳' : action === 'delete' ? '刪除' : '變更'}`;
        if (documentId) {
          content += `（文檔 ID: ${documentId}）`;
        }
        if (fileName) {
          content += `：${fileName}`;
        }
        eventType = 'document';
      } else {
        content = `事件：${r.event_type}`;
        if (r.payload_json) {
          content += `\n詳情：${r.payload_json}`;
        }
      }
      
      return {
        type: eventType,
        id: String(r.event_id),
        content,
        time: r.created_at,
        user_id: userId,
        user_name: r.triggered_by_name || null,
        // 保留原始字段
        event_type: r.event_type,
        payload: payload
      };
    });
    
    // 合并所有历史并按时间倒序排序
    const allHistory = [...statusHistory, ...dueDateHistory, ...eventHistory];
    allHistory.sort((a, b) => {
      const timeA = a.time || a.updated_at || a.requested_at || a.adjusted_at || a.created_at;
      const timeB = b.time || b.updated_at || b.requested_at || b.adjusted_at || b.created_at;
      if (!timeA && !timeB) return 0;
      if (!timeA) return 1;
      if (!timeB) return -1;
      return new Date(timeB) - new Date(timeA);
    });
    
    return successResponse(allHistory, "查詢成功", requestId);
  } catch (err) {
    console.error(`[Tasks] Get task history error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 获取任务变更历史（保持向后兼容的别名）
 */
export async function handleGetTaskAdjustmentHistory(request, env, ctx, requestId, match, url) {
  return await handleGetTaskHistory(request, env, ctx, requestId, match, url);
}










