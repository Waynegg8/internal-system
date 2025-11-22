/**
 * 固定期限任務處理邏輯
 * 處理前置任務延誤對固定期限任務的影響
 */

import { 
  calculateEstimatedCompletionDate, 
  adjustIntermediateTaskDueDate, 
  formatDate 
} from "../../utils/dateCalculators.js";

/**
 * 發送固定期限任務衝突通知
 */
async function sendFixedDeadlineConflictNotification(env, {
  intermediateTask,
  fixedDeadlineTask,
  clientOwnerId,
  adjustedDueDate,
  originalDueDate,
  fixedDeadline
}) {
  try {
    // 獲取任務詳細信息
    const taskInfo = await env.DATABASE.prepare(
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
    ).bind(intermediateTask.task_id).first();

    if (!taskInfo) {
      console.warn("[FixedDeadline] 無法獲取任務信息", intermediateTask.task_id);
      return;
    }

    const alertPayload = {
      taskId: intermediateTask.task_id,
      fixedDeadlineTaskId: fixedDeadlineTask.task_id,
      clientId: taskInfo.client_id,
      clientServiceId: taskInfo.client_service_id,
      serviceName: taskInfo.service_name,
      taskName: taskInfo.task_type,
      clientName: taskInfo.company_name,
      originalDueDate: originalDueDate,
      adjustedDueDate: adjustedDueDate,
      fixedDeadline: fixedDeadline
    };

    const alertTitle = `固定期限任務衝突：${taskInfo.company_name || "未命名客戶"} - ${taskInfo.service_name || "服務"}`;
    const alertDescription = `任務「${taskInfo.task_type || "未命名任務"}」因前置任務延誤，已調整到期日為 ${adjustedDueDate}（固定期限：${fixedDeadline}）`;
    const alertLink = `/tasks/${intermediateTask.task_id}`;

    // 通知中間任務負責人
    if (intermediateTask.assignee_user_id) {
      await env.DATABASE.prepare(
        `INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      ).bind(
        intermediateTask.assignee_user_id,
        'fixed_deadline_conflict',
        alertTitle,
        alertDescription,
        alertLink,
        JSON.stringify(alertPayload)
      ).run();
    }

    // 通知固定期限任務負責人
    if (fixedDeadlineTask.assignee_user_id) {
      await env.DATABASE.prepare(
        `INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      ).bind(
        fixedDeadlineTask.assignee_user_id,
        'fixed_deadline_conflict',
        alertTitle,
        alertDescription,
        alertLink,
        JSON.stringify(alertPayload)
      ).run();
    }

    // 通知客戶負責人
    if (clientOwnerId) {
      await env.DATABASE.prepare(
        `INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      ).bind(
        clientOwnerId,
        'fixed_deadline_conflict',
        alertTitle,
        alertDescription,
        alertLink,
        JSON.stringify(alertPayload)
      ).run();
    }

    // 發送管理員通知
    await env.DATABASE.prepare(
      `INSERT INTO DashboardAlerts (user_id, alert_type, title, description, link, payload_json, is_admin_alert)
       VALUES (NULL, ?, ?, ?, ?, ?, 1)`
    ).bind(
      'fixed_deadline_conflict',
      alertTitle,
      alertDescription,
      alertLink,
      JSON.stringify(alertPayload)
    ).run();

    console.log(`[FixedDeadline] 已發送固定期限任務衝突通知，中間任務: ${intermediateTask.task_id}, 固定期限任務: ${fixedDeadlineTask.task_id}`);
  } catch (err) {
    console.error("[FixedDeadline] 發送通知失敗", err);
  }
}

/**
 * 處理固定期限任務邏輯
 * 
 * 當前置任務延誤時，檢查是否影響固定期限任務：
 * 1. 查找所有固定期限任務
 * 2. 檢查它們的前置任務鏈
 * 3. 如果前置任務延誤，計算中間任務的預估完成時間
 * 4. 如果預估完成時間超過固定期限，調整中間任務的到期日
 * 5. 發送通知給相關人員
 * 
 * @param {object} env - Cloudflare Workers 環境變數
 * @param {number} completedTaskId - 剛完成的任務 ID（前置任務）
 * @param {number} userId - 觸發用戶 ID（用於記錄）
 * @returns {Promise<{adjusted: number, errors: Array}>} 處理結果
 */
export async function handleFixedDeadlineTaskLogic(env, completedTaskId, userId) {
  try {
    // 獲取剛完成的任務信息
    const completedTask = await env.DATABASE.prepare(
      `SELECT task_id, due_date, completed_at, original_due_date
       FROM ActiveTasks
       WHERE task_id = ? AND status = 'completed'`
    ).bind(completedTaskId).first();

    if (!completedTask || !completedTask.due_date || !completedTask.completed_at) {
      return { adjusted: 0, errors: [] };
    }

    // 計算延誤天數
    const completedDate = new Date(completedTask.completed_at);
    const dueDate = new Date(completedTask.due_date);
    const delayDays = Math.ceil((completedDate - dueDate) / (1000 * 60 * 60 * 24));

    if (delayDays <= 0) {
      // 沒有延誤，不需要處理
      return { adjusted: 0, errors: [] };
    }

    console.log(`[FixedDeadline] 任務 ${completedTaskId} 延誤了 ${delayDays} 天，開始檢查固定期限任務影響`);

    // 查找所有固定期限任務
    const fixedDeadlineTasks = await env.DATABASE.prepare(
      `SELECT 
        t.task_id,
        t.task_type,
        t.due_date AS fixed_deadline,
        t.assignee_user_id,
        t.client_service_id,
        t.client_id,
        cs.client_id AS client_id_from_service,
        c.assignee_user_id AS client_owner_id
       FROM ActiveTasks t
       LEFT JOIN ClientServices cs ON t.client_service_id = cs.client_service_id
       LEFT JOIN Clients c ON cs.client_id = c.client_id
       WHERE t.is_fixed_deadline = 1
         AND t.is_deleted = 0
         AND t.status NOT IN ('completed', 'cancelled')`
    ).all();

    const results = { adjusted: 0, errors: [] };

    for (const fixedTask of (fixedDeadlineTasks.results || [])) {
      try {
        // 查找固定期限任務的前置任務鏈，檢查 completedTaskId 是否在這個鏈中
        // 使用遞歸查詢找到從固定期限任務回溯到 completedTaskId 的所有任務
        const taskChain = await env.DATABASE.prepare(
          `WITH RECURSIVE task_chain AS (
            -- 起始：固定期限任務
            SELECT 
              t.task_id,
              t.task_type,
              t.due_date,
              t.assignee_user_id,
              t.estimated_hours,
              t.estimated_work_days,
              t.client_service_id,
              t.client_id,
              t.prerequisite_task_id,
              0 AS depth
            FROM ActiveTasks t
            WHERE t.task_id = ?
              AND t.is_deleted = 0
            
            UNION ALL
            
            -- 遞歸：找到前置任務
            SELECT 
              t.task_id,
              t.task_type,
              t.due_date,
              t.assignee_user_id,
              t.estimated_hours,
              t.estimated_work_days,
              t.client_service_id,
              t.client_id,
              t.prerequisite_task_id,
              tc.depth + 1
            FROM ActiveTasks t
            INNER JOIN task_chain tc ON t.task_id = tc.prerequisite_task_id
            WHERE t.is_deleted = 0
              AND tc.depth < 10  -- 防止無限遞歸
          )
          SELECT * FROM task_chain
          ORDER BY depth DESC`
        ).bind(fixedTask.task_id).all();

        // 檢查 completedTaskId 是否在任務鏈中
        const chainTasks = taskChain.results || [];
        const completedTaskIndex = chainTasks.findIndex(t => t.task_id === completedTaskId);
        
        if (completedTaskIndex === -1) {
          // completedTaskId 不在這個固定期限任務的前置任務鏈中，跳過
          continue;
        }

        // 找到所有中間任務（completedTaskId 之後，固定期限任務之前）
        // 注意：chainTasks 是從固定期限任務回溯到前置任務的順序（depth 從 0 遞增）
        // 所以 slice(0, completedTaskIndex) 是從固定期限任務到 completedTaskId 之間的所有任務
        // 我們需要反轉順序，從 completedTaskId 之後的第一個任務開始處理
        const intermediateTasks = chainTasks.slice(0, completedTaskIndex).reverse();
        const fixedDeadline = new Date(fixedTask.fixed_deadline);

        // 從 completedTaskId 之後的第一個任務開始，依次計算每個中間任務的預估完成時間
        let currentStartDate = completedDate;

        for (const intermediateTask of intermediateTasks) {
          // 跳過固定期限任務本身
          if (intermediateTask.task_id === fixedTask.task_id) {
            continue;
          }

          // 檢查中間任務的到期日是否在固定期限之前
          const intermediateDueDate = new Date(intermediateTask.due_date);
          if (intermediateDueDate > fixedDeadline) {
            // 中間任務的到期日已經在固定期限之後，跳過
            continue;
          }

          // 計算中間任務的預估完成時間
          // 起始時間：前一個任務的完成時間（第一個中間任務從 completedDate 開始）
          const estimatedCompletion = calculateEstimatedCompletionDate(
            currentStartDate,
            intermediateTask.estimated_hours,
            intermediateTask.estimated_work_days,
            8  // 每天工作 8 小時
          );

          if (!estimatedCompletion) {
            // 無法計算預估完成時間，使用當前到期日作為下一個任務的起始時間
            console.warn(`[FixedDeadline] 無法計算任務 ${intermediateTask.task_id} 的預估完成時間，使用到期日`);
            currentStartDate = intermediateDueDate;
            continue;
          }

          // 檢查是否需要調整到期日
          const adjustedDueDate = adjustIntermediateTaskDueDate(fixedDeadline, estimatedCompletion);
          
          // 更新下一個任務的起始時間為當前任務的預估完成時間
          currentStartDate = estimatedCompletion;

          if (adjustedDueDate) {
            // 需要調整到期日
            const originalDueDate = intermediateTask.due_date;
            const adjustedDueDateStr = formatDate(adjustedDueDate);

            // 更新任務到期日
            await env.DATABASE.prepare(
              `UPDATE ActiveTasks
               SET due_date = ?,
                   due_date_adjusted = 1,
                   adjustment_count = adjustment_count + 1,
                   last_adjustment_date = datetime('now'),
                   adjustment_reason = ?,
                   can_start_date = ?
               WHERE task_id = ?`
            ).bind(
              adjustedDueDateStr,
              `因固定期限任務 ${fixedTask.task_id} 的期限限制，調整為固定期限前一天`,
              formatDate(startDate),
              intermediateTask.task_id
            ).run();

            // 記錄調整歷史
            try {
              await env.DATABASE.prepare(
                `INSERT INTO TaskDueDateAdjustments (
                  task_id, old_due_date, new_due_date, reason, adjustment_type,
                  adjusted_by, is_overdue, adjusted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
              ).bind(
                intermediateTask.task_id,
                originalDueDate,
                adjustedDueDateStr,
                `固定期限任務 ${fixedTask.task_id} 衝突，調整為固定期限前一天（固定期限：${formatDate(fixedDeadline)}）`,
                'fixed_deadline_adjust',
                userId,
                0
              ).run();
            } catch (err) {
              // TaskDueDateAdjustments 表可能不存在，忽略錯誤
              console.warn("[FixedDeadline] 無法記錄調整歷史", err);
            }

            // 發送通知
            await sendFixedDeadlineConflictNotification(env, {
              intermediateTask,
              fixedDeadlineTask: fixedTask,
              clientOwnerId: fixedTask.client_owner_id || fixedTask.client_id,
              adjustedDueDate: adjustedDueDateStr,
              originalDueDate: originalDueDate,
              fixedDeadline: formatDate(fixedDeadline)
            });

            results.adjusted++;
            console.log(`[FixedDeadline] 已調整任務 ${intermediateTask.task_id} 的到期日：${originalDueDate} -> ${adjustedDueDateStr}`);
          }
        }
      } catch (err) {
        console.error(`[FixedDeadline] 處理固定期限任務 ${fixedTask.task_id} 失敗:`, err);
        results.errors.push({ 
          fixed_task_id: fixedTask.task_id, 
          error: String(err) 
        });
      }
    }

    return results;
  } catch (err) {
    console.error('[FixedDeadline] handleFixedDeadlineTaskLogic 失敗:', err);
    throw err;
  }
}

