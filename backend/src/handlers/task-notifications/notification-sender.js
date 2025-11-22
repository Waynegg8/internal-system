/**
 * 任務通知發送邏輯
 * 用於發送任務通知並控制通知頻率
 */

/**
 * 檢查是否應該發送通知
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {number} taskId - 任務 ID
 * @param {string} notificationType - 通知類型（'overdue' | 'upcoming' | 'delay' | 'conflict'）
 * @param {Date|string} now - 當前時間（Date 對象或 ISO 字符串）
 * @returns {Promise<{shouldSend: boolean, reason?: string}>} 返回是否應該發送通知及原因
 */
export async function shouldSendNotification(env, taskId, notificationType, now) {
  try {
    // 將 now 轉換為日期字符串（YYYY-MM-DD 格式）用於 SQL 查詢
    const currentDate = now instanceof Date 
      ? now.toISOString().split('T')[0] 
      : new Date(now).toISOString().split('T')[0];

    // 第一步：檢查任務狀態（已完成或已取消的任務不再發送）
    const task = await env.DATABASE.prepare(
      `SELECT task_id, status, is_deleted
       FROM ActiveTasks
       WHERE task_id = ?`
    ).bind(taskId).first();

    if (!task) {
      return {
        shouldSend: false,
        reason: '任務不存在'
      };
    }

    // 第二步：檢查任務是否已刪除
    if (task.is_deleted === 1 || task.is_deleted === true) {
      return {
        shouldSend: false,
        reason: '任務已刪除'
      };
    }

    // 第三步：檢查任務狀態（已完成或已取消的任務不再發送）
    if (task.status === 'completed' || task.status === 'cancelled') {
      return {
        shouldSend: false,
        reason: `任務狀態為「${task.status}」，不再發送通知`
      };
    }

    // 第四步：檢查通知發送時間（每日只發送一次）
    // 查詢今天是否已經發送過該類型的通知
    const todayNotification = await env.DATABASE.prepare(
      `SELECT history_id, sent_at
       FROM TaskNotificationHistory
       WHERE task_id = ?
         AND notification_type = ?
         AND date(sent_at) = date(?)
       ORDER BY sent_at DESC
       LIMIT 1`
    ).bind(taskId, notificationType, currentDate).first();

    if (todayNotification) {
      return {
        shouldSend: false,
        reason: `今天已發送過「${notificationType}」類型的通知（發送時間：${todayNotification.sent_at}）`
      };
    }

    // 所有檢查通過，應該發送通知
    return {
      shouldSend: true
    };

  } catch (error) {
    console.error(`[shouldSendNotification] 檢查通知發送條件失敗 (taskId: ${taskId}, type: ${notificationType}):`, error);
    // 發生錯誤時，為了避免遺漏通知，返回 false 並記錄錯誤
    return {
      shouldSend: false,
      reason: `檢查失敗：${error.message || String(error)}`
    };
  }
}

/**
 * 發送任務通知
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {number} taskId - 任務 ID
 * @param {string} notificationType - 通知類型（'overdue' | 'upcoming' | 'delay' | 'conflict'）
 * @param {Array} recipients - 接收者列表 [{ user_id, user_name }]
 * @param {Object} notificationData - 通知數據
 * @param {Date|string} now - 當前時間（Date 對象或 ISO 字符串）
 * @returns {Promise<{success: boolean, sentCount: number, errors?: Array}>} 返回發送結果
 */
export async function sendTaskNotification(env, taskId, notificationType, recipients, notificationData, now) {
  try {
    // 第一步：檢查是否應該發送通知（頻率控制）
    const checkResult = await shouldSendNotification(env, taskId, notificationType, now);
    
    if (!checkResult.shouldSend) {
      console.log(`[sendTaskNotification] 跳過發送通知 (taskId: ${taskId}, type: ${notificationType}): ${checkResult.reason || '未知原因'}`);
      return {
        success: false,
        sentCount: 0,
        reason: checkResult.reason
      };
    }

    // 將 now 轉換為 ISO 字符串
    const nowIso = now instanceof Date 
      ? now.toISOString() 
      : new Date(now).toISOString();

    // 第二步：構建通知標題和描述
    const titleMap = {
      'overdue': '任務逾期提醒',
      'upcoming': '任務即將到期提醒',
      'delay': '前置任務延誤通知',
      'conflict': '固定期限任務衝突通知'
    };

    const title = titleMap[notificationType] || '任務通知';
    let description = notificationData.description || '';

    // 如果沒有描述，根據通知類型生成默認描述
    if (!description) {
      const taskName = notificationData.task_name || notificationData.predecessorTask?.task_name || '任務';
      switch (notificationType) {
        case 'overdue':
          description = `任務「${taskName}」已逾期 ${notificationData.delayDays || 0} 天`;
          break;
        case 'upcoming':
          description = `任務「${taskName}」將於明天到期`;
          break;
        case 'delay':
          description = `前置任務延誤，影響後續任務`;
          break;
        case 'conflict':
          description = `固定期限任務衝突，中間任務已調整到期日`;
          break;
        default:
          description = `任務「${taskName}」相關通知`;
      }
    }

    // 構建任務詳情連結
    const taskDetailLink = notificationData.taskDetailLink || 
                          notificationData.predecessorTask?.taskDetailLink ||
                          `/tasks/${taskId}`;

    // 第三步：為每個接收者創建 DashboardAlerts 記錄
    let sentCount = 0;
    const errors = [];

    for (const recipient of recipients) {
      try {
        // 構建 payload_json（根據設計文檔的格式）
        const payload = {
          taskId: notificationData.taskId || notificationData.task_id || taskId,
          task_id: notificationData.taskId || notificationData.task_id || taskId,
          clientName: notificationData.clientName || notificationData.predecessorTask?.clientName || '未知客戶',
          serviceName: notificationData.serviceName || notificationData.predecessorTask?.serviceName || '未知服務',
          assignee: notificationData.assignee || null,
          dueDate: notificationData.dueDate || notificationData.predecessorTask?.dueDate || null,
          delayDays: notificationData.delayDays || null,
          remainingDays: notificationData.remainingDays || null,
          description: description
        };

        // 插入 DashboardAlerts 記錄（is_admin_alert = 0）
        await env.DATABASE.prepare(
          `INSERT INTO DashboardAlerts 
           (user_id, alert_type, title, description, link, payload_json, is_admin_alert, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
        ).bind(
          recipient.user_id,
          notificationType,
          title,
          description,
          taskDetailLink,
          JSON.stringify(payload),
          nowIso
        ).run();

        sentCount++;
      } catch (error) {
        console.error(`[sendTaskNotification] 為用戶 ${recipient.user_id} 創建通知失敗:`, error);
        errors.push({
          user_id: recipient.user_id,
          user_name: recipient.user_name,
          error: error.message || String(error)
        });
      }
    }

    // 第四步：記錄到 TaskNotificationHistory 表（即使部分發送失敗也記錄）
    if (sentCount > 0) {
      try {
        await env.DATABASE.prepare(
          `INSERT INTO TaskNotificationHistory 
           (task_id, notification_type, sent_at, recipients, notification_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          taskId,
          notificationType,
          nowIso,
          JSON.stringify(recipients),
          JSON.stringify(notificationData),
          nowIso
        ).run();
      } catch (error) {
        console.error(`[sendTaskNotification] 記錄通知歷史失敗:`, error);
        // 歷史記錄失敗不影響通知發送結果
      }
    }

    // 返回結果
    const success = sentCount > 0 && errors.length === 0;
    
    if (success) {
      console.log(`[sendTaskNotification] 成功發送通知 (taskId: ${taskId}, type: ${notificationType}, recipients: ${sentCount})`);
    } else if (sentCount > 0) {
      console.warn(`[sendTaskNotification] 部分發送成功 (taskId: ${taskId}, type: ${notificationType}, sent: ${sentCount}, errors: ${errors.length})`);
    } else {
      console.error(`[sendTaskNotification] 發送失敗 (taskId: ${taskId}, type: ${notificationType}, errors: ${errors.length})`);
    }

    return {
      success: success,
      sentCount: sentCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error(`[sendTaskNotification] 發送任務通知失敗 (taskId: ${taskId}, type: ${notificationType}):`, error);
    return {
      success: false,
      sentCount: 0,
      errors: [{
        error: error.message || String(error)
      }]
    };
  }
}

