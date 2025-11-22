/**
 * 任務通知檢查邏輯
 * 用於檢查各種任務狀態並生成通知數據
 */

/**
 * 檢查逾期任務
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Date|string} now - 當前時間（Date 對象或 ISO 字符串）
 * @returns {Promise<Array>} 返回通知數據數組，每個元素包含 { task, recipients, notificationData }
 */
export async function checkOverdueTasks(env, now) {
  try {
    // 將 now 轉換為日期字符串（YYYY-MM-DD 格式）用於 SQL 查詢
    const currentDate = now instanceof Date 
      ? now.toISOString().split('T')[0] 
      : new Date(now).toISOString().split('T')[0];

    // 查詢逾期任務
    // 條件：due_date < current_date AND status NOT IN ('completed', 'cancelled') AND is_deleted = 0
    const overdueTasks = await env.DATABASE.prepare(
      `SELECT 
        t.task_id,
        t.task_type AS task_name,
        t.due_date,
        t.status,
        t.assignee_user_id AS task_assignee_id,
        t.client_service_id,
        c.client_id,
        c.company_name AS client_name,
        c.assignee_user_id AS client_assignee_id,
        s.service_name,
        u_task.name AS task_assignee_name,
        u_client.name AS client_assignee_name
      FROM ActiveTasks t
      LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
      LEFT JOIN Clients c ON c.client_id = cs.client_id
      LEFT JOIN Services s ON s.service_id = cs.service_id
      LEFT JOIN Users u_task ON u_task.user_id = t.assignee_user_id
      LEFT JOIN Users u_client ON u_client.user_id = c.assignee_user_id
      WHERE date(t.due_date) < date(?)
        AND t.status NOT IN ('completed', 'cancelled')
        AND t.is_deleted = 0
        AND t.due_date IS NOT NULL
      ORDER BY t.due_date ASC`
    ).bind(currentDate).all();

    if (!overdueTasks.results || overdueTasks.results.length === 0) {
      return [];
    }

    // 處理每個逾期任務，構建通知數據
    const notifications = [];

    for (const task of overdueTasks.results) {
      // 計算逾期天數
      const dueDate = new Date(task.due_date);
      const today = new Date(currentDate);
      const delayDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

      // 構建通知對象列表（去重）
      const recipients = [];
      const recipientIds = new Set();

      // 添加任務負責人（必送）
      if (task.task_assignee_id && !recipientIds.has(task.task_assignee_id)) {
        recipients.push({
          user_id: task.task_assignee_id,
          user_name: task.task_assignee_name || '未知'
        });
        recipientIds.add(task.task_assignee_id);
      }

      // 添加客戶負責人（必送）
      if (task.client_assignee_id && !recipientIds.has(task.client_assignee_id)) {
        recipients.push({
          user_id: task.client_assignee_id,
          user_name: task.client_assignee_name || '未知'
        });
        recipientIds.add(task.client_assignee_id);
      }

      // 如果沒有通知對象，跳過此任務
      if (recipients.length === 0) {
        console.warn(`[checkOverdueTasks] 任務 ${task.task_id} 沒有通知對象，跳過`);
        continue;
      }

      // 構建通知數據
      const notificationData = {
        taskId: task.task_id,
        task_id: task.task_id,
        clientName: task.client_name || '未知客戶',
        serviceName: task.service_name || '未知服務',
        assignee: task.task_assignee_id ? {
          id: task.task_assignee_id,
          name: task.task_assignee_name || '未知'
        } : null,
        dueDate: task.due_date,
        delayDays: delayDays,
        description: `任務「${task.task_name}」已逾期 ${delayDays} 天`,
        taskDetailLink: `/tasks/${task.task_id}`
      };

      notifications.push({
        task: {
          task_id: task.task_id,
          task_name: task.task_name,
          due_date: task.due_date,
          status: task.status,
          client_name: task.client_name,
          service_name: task.service_name
        },
        recipients: recipients,
        notificationData: notificationData
      });
    }

    return notifications;

  } catch (error) {
    console.error('[checkOverdueTasks] 檢查逾期任務失敗:', error);
    throw error;
  }
}

/**
 * 檢查即將到期任務（到期日前1天）
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Date|string} now - 當前時間（Date 對象或 ISO 字符串）
 * @returns {Promise<Array>} 返回通知數據數組，每個元素包含 { task, recipients, notificationData }
 */
export async function checkUpcomingTasks(env, now) {
  try {
    // 將 now 轉換為日期字符串（YYYY-MM-DD 格式）用於 SQL 查詢
    const currentDate = now instanceof Date 
      ? now.toISOString().split('T')[0] 
      : new Date(now).toISOString().split('T')[0];

    // 計算明天的日期（YYYY-MM-DD 格式）
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    // 查詢即將到期任務（到期日前1天）
    // 條件：due_date = current_date + 1 day AND status NOT IN ('completed', 'cancelled') AND is_deleted = 0
    const upcomingTasks = await env.DATABASE.prepare(
      `SELECT 
        t.task_id,
        t.task_type AS task_name,
        t.due_date,
        t.status,
        t.assignee_user_id AS task_assignee_id,
        t.client_service_id,
        c.client_id,
        c.company_name AS client_name,
        c.assignee_user_id AS client_assignee_id,
        s.service_name,
        u_task.name AS task_assignee_name,
        u_client.name AS client_assignee_name
      FROM ActiveTasks t
      LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
      LEFT JOIN Clients c ON c.client_id = cs.client_id
      LEFT JOIN Services s ON s.service_id = cs.service_id
      LEFT JOIN Users u_task ON u_task.user_id = t.assignee_user_id
      LEFT JOIN Users u_client ON u_client.user_id = c.assignee_user_id
      WHERE date(t.due_date) = date(?)
        AND t.status NOT IN ('completed', 'cancelled')
        AND t.is_deleted = 0
        AND t.due_date IS NOT NULL
      ORDER BY t.due_date ASC`
    ).bind(tomorrowDate).all();

    if (!upcomingTasks.results || upcomingTasks.results.length === 0) {
      return [];
    }

    // 處理每個即將到期任務，構建通知數據
    const notifications = [];

    for (const task of upcomingTasks.results) {
      // 構建通知對象列表（去重）
      const recipients = [];
      const recipientIds = new Set();

      // 添加任務負責人（必送）
      if (task.task_assignee_id && !recipientIds.has(task.task_assignee_id)) {
        recipients.push({
          user_id: task.task_assignee_id,
          user_name: task.task_assignee_name || '未知'
        });
        recipientIds.add(task.task_assignee_id);
      }

      // 添加客戶負責人（必送）
      if (task.client_assignee_id && !recipientIds.has(task.client_assignee_id)) {
        recipients.push({
          user_id: task.client_assignee_id,
          user_name: task.client_assignee_name || '未知'
        });
        recipientIds.add(task.client_assignee_id);
      }

      // 如果沒有通知對象，跳過此任務
      if (recipients.length === 0) {
        console.warn(`[checkUpcomingTasks] 任務 ${task.task_id} 沒有通知對象，跳過`);
        continue;
      }

      // 構建通知數據
      const notificationData = {
        taskId: task.task_id,
        task_id: task.task_id,
        clientName: task.client_name || '未知客戶',
        serviceName: task.service_name || '未知服務',
        assignee: task.task_assignee_id ? {
          id: task.task_assignee_id,
          name: task.task_assignee_name || '未知'
        } : null,
        dueDate: task.due_date,
        remainingDays: 1, // 剩餘天數固定為1天
        description: `任務「${task.task_name}」將於明天到期`,
        taskDetailLink: `/tasks/${task.task_id}`
      };

      notifications.push({
        task: {
          task_id: task.task_id,
          task_name: task.task_name,
          due_date: task.due_date,
          status: task.status,
          client_name: task.client_name,
          service_name: task.service_name
        },
        recipients: recipients,
        notificationData: notificationData
      });
    }

    return notifications;

  } catch (error) {
    console.error('[checkUpcomingTasks] 檢查即將到期任務失敗:', error);
    throw error;
  }
}

/**
 * 檢查前置任務延誤
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Date|string} now - 當前時間（Date 對象或 ISO 字符串）
 * @returns {Promise<Array>} 返回通知數據數組，每個元素包含 { task, recipients, notificationData }
 */
export async function checkPredecessorTaskDelays(env, now) {
  try {
    // 將 now 轉換為日期字符串（YYYY-MM-DD 格式）用於 SQL 查詢
    const currentDate = now instanceof Date 
      ? now.toISOString().split('T')[0] 
      : new Date(now).toISOString().split('T')[0];

    // 第一步：查詢逾期且未完成的前置任務
    const overduePredecessorTasks = await env.DATABASE.prepare(
      `SELECT 
        t.task_id,
        t.task_type AS task_name,
        t.due_date,
        t.status,
        t.assignee_user_id AS task_assignee_id,
        t.client_service_id,
        c.client_id,
        c.company_name AS client_name,
        c.assignee_user_id AS client_assignee_id,
        s.service_name,
        u_task.name AS task_assignee_name,
        u_client.name AS client_assignee_name
      FROM ActiveTasks t
      LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
      LEFT JOIN Clients c ON c.client_id = cs.client_id
      LEFT JOIN Services s ON s.service_id = cs.service_id
      LEFT JOIN Users u_task ON u_task.user_id = t.assignee_user_id
      LEFT JOIN Users u_client ON u_client.user_id = c.assignee_user_id
      WHERE date(t.due_date) < date(?)
        AND t.status NOT IN ('completed', 'cancelled')
        AND t.is_deleted = 0
        AND t.due_date IS NOT NULL
      ORDER BY t.due_date ASC`
    ).bind(currentDate).all();

    if (!overduePredecessorTasks.results || overduePredecessorTasks.results.length === 0) {
      return [];
    }

    // 計算逾期天數
    const calculateDelayDays = (dueDate) => {
      const due = new Date(dueDate);
      const today = new Date(currentDate);
      return Math.floor((today - due) / (1000 * 60 * 60 * 24));
    };

    // 處理每個逾期前置任務
    const notifications = [];

    for (const predecessorTask of overduePredecessorTasks.results) {
      // 第二步：查詢所有依賴此前置任務的後續任務
      const dependentTasks = await env.DATABASE.prepare(
        `SELECT 
          t.task_id,
          t.task_type AS task_name,
          t.due_date,
          t.status,
          t.assignee_user_id AS task_assignee_id,
          t.due_date_adjusted,
          t.adjustment_reason,
          t.client_service_id,
          c.client_id,
          c.company_name AS client_name,
          c.assignee_user_id AS client_assignee_id,
          s.service_name,
          u_task.name AS task_assignee_name,
          u_client.name AS client_assignee_name
        FROM ActiveTasks t
        LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
        LEFT JOIN Clients c ON c.client_id = cs.client_id
        LEFT JOIN Services s ON s.service_id = cs.service_id
        LEFT JOIN Users u_task ON u_task.user_id = t.assignee_user_id
        LEFT JOIN Users u_client ON u_client.user_id = c.assignee_user_id
        WHERE t.prerequisite_task_id = ?
          AND t.is_deleted = 0
          AND t.status NOT IN ('completed', 'cancelled')
        ORDER BY t.due_date ASC`
      ).bind(predecessorTask.task_id).all();

      if (!dependentTasks.results || dependentTasks.results.length === 0) {
        // 沒有受影響的後續任務，跳過
        continue;
      }

      // 第三步：構建通知對象列表（去重）
      // 通知對象包括：所有後續任務的負責人 + 客戶負責人
      const recipients = [];
      const recipientIds = new Set();

      // 收集所有後續任務的負責人和客戶負責人
      for (const dependentTask of dependentTasks.results) {
        // 添加後續任務負責人
        if (dependentTask.task_assignee_id && !recipientIds.has(dependentTask.task_assignee_id)) {
          recipients.push({
            user_id: dependentTask.task_assignee_id,
            user_name: dependentTask.task_assignee_name || '未知'
          });
          recipientIds.add(dependentTask.task_assignee_id);
        }

        // 添加客戶負責人（每個後續任務可能屬於不同的客戶）
        if (dependentTask.client_assignee_id && !recipientIds.has(dependentTask.client_assignee_id)) {
          recipients.push({
            user_id: dependentTask.client_assignee_id,
            user_name: dependentTask.client_assignee_name || '未知'
          });
          recipientIds.add(dependentTask.client_assignee_id);
        }
      }

      // 如果沒有通知對象，跳過
      if (recipients.length === 0) {
        console.warn(`[checkPredecessorTaskDelays] 前置任務 ${predecessorTask.task_id} 的後續任務沒有通知對象，跳過`);
        continue;
      }

      // 第四步：構建受影響的後續任務列表
      const affectedTasks = dependentTasks.results.map(task => ({
        task_id: task.task_id,
        task_name: task.task_name,
        due_date: task.due_date,
        due_date_adjusted: task.due_date_adjusted === 1,
        adjustment_reason: task.adjustment_reason || null,
        client_name: task.client_name || '未知客戶',
        service_name: task.service_name || '未知服務',
        taskDetailLink: `/tasks/${task.task_id}`
      }));

      // 計算前置任務的逾期天數
      const delayDays = calculateDelayDays(predecessorTask.due_date);

      // 第五步：構建通知數據
      const notificationData = {
        predecessorTask: {
          taskId: predecessorTask.task_id,
          task_id: predecessorTask.task_id,
          task_name: predecessorTask.task_name,
          due_date: predecessorTask.due_date,
          delayDays: delayDays,
          client_name: predecessorTask.client_name || '未知客戶',
          service_name: predecessorTask.service_name || '未知服務',
          taskDetailLink: `/tasks/${predecessorTask.task_id}`
        },
        affectedTasks: affectedTasks,
        description: `前置任務「${predecessorTask.task_name}」已逾期 ${delayDays} 天，影響 ${affectedTasks.length} 個後續任務`
      };

      notifications.push({
        task: {
          task_id: predecessorTask.task_id,
          task_name: predecessorTask.task_name,
          due_date: predecessorTask.due_date,
          status: predecessorTask.status,
          client_name: predecessorTask.client_name,
          service_name: predecessorTask.service_name
        },
        recipients: recipients,
        notificationData: notificationData
      });
    }

    return notifications;

  } catch (error) {
    console.error('[checkPredecessorTaskDelays] 檢查前置任務延誤失敗:', error);
    throw error;
  }
}

/**
 * 檢查固定期限任務衝突
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Date|string} now - 當前時間（Date 對象或 ISO 字符串）
 * @returns {Promise<Array>} 返回通知數據數組，每個元素包含 { task, recipients, notificationData }
 */
export async function checkFixedDeadlineConflicts(env, now) {
  try {
    // 將 now 轉換為日期字符串（YYYY-MM-DD 格式）用於 SQL 查詢
    const currentDate = now instanceof Date 
      ? now.toISOString().split('T')[0] 
      : new Date(now).toISOString().split('T')[0];

    // 第一步：查找所有固定期限任務
    const fixedDeadlineTasks = await env.DATABASE.prepare(
      `SELECT 
        t.task_id,
        t.task_type AS task_name,
        t.due_date AS fixed_deadline,
        t.status,
        t.assignee_user_id AS fixed_task_assignee_id,
        t.client_service_id,
        c.client_id,
        c.company_name AS client_name,
        c.assignee_user_id AS client_assignee_id,
        s.service_name,
        u_fixed.name AS fixed_task_assignee_name,
        u_client.name AS client_assignee_name
      FROM ActiveTasks t
      LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
      LEFT JOIN Clients c ON c.client_id = cs.client_id
      LEFT JOIN Services s ON s.service_id = cs.service_id
      LEFT JOIN Users u_fixed ON u_fixed.user_id = t.assignee_user_id
      LEFT JOIN Users u_client ON u_client.user_id = c.assignee_user_id
      WHERE t.is_fixed_deadline = 1
        AND t.is_deleted = 0
        AND t.status NOT IN ('completed', 'cancelled')`
    ).all();

    if (!fixedDeadlineTasks.results || fixedDeadlineTasks.results.length === 0) {
      return [];
    }

    const notifications = [];

    // 第二步：對每個固定期限任務，檢查前置任務鏈中的衝突
    for (const fixedTask of fixedDeadlineTasks.results) {
      try {
        // 使用遞歸查詢找到從固定期限任務回溯的所有前置任務
        const taskChain = await env.DATABASE.prepare(
          `WITH RECURSIVE task_chain AS (
            -- 起始：固定期限任務
            SELECT 
              t.task_id,
              t.task_type,
              t.due_date,
              t.status,
              t.assignee_user_id,
              t.estimated_hours,
              t.estimated_work_days,
              t.client_service_id,
              t.prerequisite_task_id,
              t.due_date_adjusted,
              t.adjustment_reason,
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
              t.status,
              t.assignee_user_id,
              t.estimated_hours,
              t.estimated_work_days,
              t.client_service_id,
              t.prerequisite_task_id,
              t.due_date_adjusted,
              t.adjustment_reason,
              tc.depth + 1
            FROM ActiveTasks t
            INNER JOIN task_chain tc ON t.task_id = tc.prerequisite_task_id
            WHERE t.is_deleted = 0
              AND tc.depth < 10  -- 防止無限遞歸
          )
          SELECT * FROM task_chain
          ORDER BY depth DESC`
        ).bind(fixedTask.task_id).all();

        const chainTasks = taskChain.results || [];
        if (chainTasks.length <= 1) {
          // 沒有前置任務，跳過
          continue;
        }

        // 第三步：檢查前置任務鏈中是否有逾期且未完成的任務
        const overduePredecessors = [];
        const intermediateTasks = [];

        for (let i = 0; i < chainTasks.length - 1; i++) {
          const task = chainTasks[i];
          
          // 跳過固定期限任務本身
          if (task.task_id === fixedTask.task_id) {
            continue;
          }

          // 檢查是否為逾期且未完成的前置任務
          if (task.due_date && 
              new Date(task.due_date) < new Date(currentDate) &&
              task.status !== 'completed' && 
              task.status !== 'cancelled') {
            overduePredecessors.push(task);
          }

          // 收集中間任務（固定期限任務之前的所有任務）
          if (task.task_id !== fixedTask.task_id) {
            intermediateTasks.push(task);
          }
        }

        if (overduePredecessors.length === 0) {
          // 沒有逾期前置任務，跳過
          continue;
        }

        // 第四步：檢查中間任務是否已調整（due_date_adjusted = 1）
        // 只對已調整的中間任務發送通知
        const adjustedIntermediateTasks = intermediateTasks.filter(
          task => task.due_date_adjusted === 1
        );

        if (adjustedIntermediateTasks.length === 0) {
          // 沒有已調整的中間任務，跳過
          continue;
        }

        // 第五步：獲取中間任務和固定期限任務的完整信息（包括客戶、服務、負責人等）
        const taskIds = [
          ...adjustedIntermediateTasks.map(t => t.task_id),
          fixedTask.task_id
        ];
        const placeholders = taskIds.map(() => '?').join(',');

        const tasksInfo = await env.DATABASE.prepare(
          `SELECT 
            t.task_id,
            t.task_type AS task_name,
            t.due_date,
            t.status,
            t.assignee_user_id AS task_assignee_id,
            t.due_date_adjusted,
            t.adjustment_reason,
            t.client_service_id,
            c.client_id,
            c.company_name AS client_name,
            c.assignee_user_id AS client_assignee_id,
            s.service_name,
            u_task.name AS task_assignee_name,
            u_client.name AS client_assignee_name
          FROM ActiveTasks t
          LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
          LEFT JOIN Clients c ON c.client_id = cs.client_id
          LEFT JOIN Services s ON s.service_id = cs.service_id
          LEFT JOIN Users u_task ON u_task.user_id = t.assignee_user_id
          LEFT JOIN Users u_client ON u_client.user_id = c.assignee_user_id
          WHERE t.task_id IN (${placeholders})
            AND t.is_deleted = 0`
        ).bind(...taskIds).all();

        const tasksInfoMap = new Map();
        (tasksInfo.results || []).forEach(task => {
          tasksInfoMap.set(task.task_id, task);
        });

        // 第六步：構建通知對象列表（去重）
        const recipients = [];
        const recipientIds = new Set();

        // 添加中間任務負責人
        for (const intermediateTask of adjustedIntermediateTasks) {
          const taskInfo = tasksInfoMap.get(intermediateTask.task_id);
          if (taskInfo && taskInfo.task_assignee_id && !recipientIds.has(taskInfo.task_assignee_id)) {
            recipients.push({
              user_id: taskInfo.task_assignee_id,
              user_name: taskInfo.task_assignee_name || '未知'
            });
            recipientIds.add(taskInfo.task_assignee_id);
          }
        }

        // 添加固定期限任務負責人
        const fixedTaskInfo = tasksInfoMap.get(fixedTask.task_id);
        if (fixedTaskInfo && fixedTaskInfo.task_assignee_id && !recipientIds.has(fixedTaskInfo.task_assignee_id)) {
          recipients.push({
            user_id: fixedTaskInfo.task_assignee_id,
            user_name: fixedTaskInfo.task_assignee_name || '未知'
          });
          recipientIds.add(fixedTaskInfo.task_assignee_id);
        }

        // 添加客戶負責人
        if (fixedTaskInfo && fixedTaskInfo.client_assignee_id && !recipientIds.has(fixedTaskInfo.client_assignee_id)) {
          recipients.push({
            user_id: fixedTaskInfo.client_assignee_id,
            user_name: fixedTaskInfo.client_assignee_name || '未知'
          });
          recipientIds.add(fixedTaskInfo.client_assignee_id);
        }

        // 如果沒有通知對象，跳過
        if (recipients.length === 0) {
          console.warn(`[checkFixedDeadlineConflicts] 固定期限任務 ${fixedTask.task_id} 沒有通知對象，跳過`);
          continue;
        }

        // 第七步：構建通知數據
        const affectedIntermediateTasks = adjustedIntermediateTasks.map(task => {
          const taskInfo = tasksInfoMap.get(task.task_id);
          return {
            task_id: task.task_id,
            task_name: taskInfo?.task_name || task.task_type || '未知任務',
            original_due_date: task.due_date,
            adjusted_due_date: taskInfo?.due_date || task.due_date,
            adjustment_reason: taskInfo?.adjustment_reason || task.adjustment_reason || null,
            client_name: taskInfo?.client_name || '未知客戶',
            service_name: taskInfo?.service_name || '未知服務',
            taskDetailLink: `/tasks/${task.task_id}`
          };
        });

        // 計算前置任務的延誤情況
        const predecessorDelayInfo = overduePredecessors.map(pred => {
          const delayDays = Math.floor((new Date(currentDate) - new Date(pred.due_date)) / (1000 * 60 * 60 * 24));
          return {
            task_id: pred.task_id,
            task_name: pred.task_type || '未知任務',
            due_date: pred.due_date,
            delayDays: delayDays,
            taskDetailLink: `/tasks/${pred.task_id}`
          };
        });

        const notificationData = {
          fixedDeadlineTask: {
            taskId: fixedTask.task_id,
            task_id: fixedTask.task_id,
            task_name: fixedTask.task_name,
            fixed_deadline: fixedTask.fixed_deadline,
            client_name: fixedTaskInfo?.client_name || fixedTask.client_name || '未知客戶',
            service_name: fixedTaskInfo?.service_name || fixedTask.service_name || '未知服務',
            taskDetailLink: `/tasks/${fixedTask.task_id}`
          },
          predecessorDelays: predecessorDelayInfo,
          affectedIntermediateTasks: affectedIntermediateTasks,
          conflictDescription: `前置任務延誤導致 ${affectedIntermediateTasks.length} 個中間任務無法在固定期限（${fixedTask.fixed_deadline}）前完成，已調整到期日`,
          description: `固定期限任務「${fixedTask.task_name}」的前置任務延誤，影響 ${affectedIntermediateTasks.length} 個中間任務`
        };

        notifications.push({
          task: {
            task_id: fixedTask.task_id,
            task_name: fixedTask.task_name,
            due_date: fixedTask.fixed_deadline,
            status: fixedTask.status,
            client_name: fixedTaskInfo?.client_name || fixedTask.client_name,
            service_name: fixedTaskInfo?.service_name || fixedTask.service_name
          },
          recipients: recipients,
          notificationData: notificationData
        });

      } catch (error) {
        console.error(`[checkFixedDeadlineConflicts] 處理固定期限任務 ${fixedTask.task_id} 失敗:`, error);
        // 繼續處理下一個固定期限任務
        continue;
      }
    }

    return notifications;

  } catch (error) {
    console.error('[checkFixedDeadlineConflicts] 檢查固定期限任務衝突失敗:', error);
    throw error;
  }
}

