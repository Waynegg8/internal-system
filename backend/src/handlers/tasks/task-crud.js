/**
 * 任务基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 获取任务详情
 */
export async function handleGetTaskDetail(request, env, ctx, requestId, match, url) {
  const taskId = match[1];
  
  // 不緩存任務詳情，確保每次查詢都是最新數據（特別是相關任務的篩選）
  // const cacheKey = generateCacheKey('task_detail', { taskId });
  // const kvCached = await getKVCache(env, cacheKey);
  // 
  // if (kvCached?.data) {
  //   return successResponse(kvCached.data, "查詢成功（KV缓存）", requestId);
  // }
  
  const task = await env.DATABASE.prepare(
    `SELECT t.task_id, t.task_type, t.due_date, t.status, t.assignee_user_id, t.notes, t.client_service_id,
            t.completed_at, t.created_at, t.service_month, t.service_year, t.estimated_hours,
            c.company_name AS client_name, c.tax_registration_number AS client_tax_id, c.client_id,
            s.service_name,
            (SELECT COUNT(1) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id) AS total_stages,
            (SELECT COUNT(1) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id AND stg.status = 'completed') AS completed_stages,
            u.name AS assignee_name
     FROM ActiveTasks t
     LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
     LEFT JOIN Clients c ON c.client_id = cs.client_id
     LEFT JOIN Services s ON s.service_id = cs.service_id
     LEFT JOIN Users u ON u.user_id = t.assignee_user_id
     WHERE t.task_id = ? AND t.is_deleted = 0`
  ).bind(taskId).first();
  
  if (!task) {
    return errorResponse(404, "NOT_FOUND", "任務不存在", null, requestId);
  }
  
  const data = {
    task_id: String(task.task_id),
    task_name: task.task_type,
    client_name: task.client_name || "",
    client_tax_id: task.client_tax_id || "",
    client_id: task.client_id || "",
    service_name: task.service_name || "",
    service_month: task.service_month || "",
    service_year: task.service_year || null,
    assignee_name: task.assignee_name || "",
    assignee_user_id: task.assignee_user_id || null,
    client_service_id: task.client_service_id || null,
    component_id: null, // component_id 字段在当前数据库版本中不存在
    completed_stages: Number(task.completed_stages || 0),
    total_stages: Number(task.total_stages || 0),
    due_date: task.due_date || null,
    estimated_hours: Number(task.estimated_hours || 0),
    status: task.status,
    is_overdue: Boolean(task.is_overdue),
    last_status_update: task.last_status_update || null,
    notes: task.notes || "",
    completed_date: task.completed_date || null,
    completed_at: task.completed_at || null,
    created_at: task.created_at || null
  };
  
  const stagesRows = await env.DATABASE.prepare(
    `SELECT 
        st.active_stage_id AS stage_id,
        st.stage_name,
        st.stage_order,
        st.status,
        st.started_at,
        st.completed_at,
        st.delay_days,
        st.triggered_at,
        st.triggered_by
     FROM ActiveTaskStages st
     WHERE st.task_id = ?
     ORDER BY st.stage_order ASC`
  ).bind(taskId).all();

  const stages = (stagesRows?.results || []).map((row) => ({
    stage_id: Number(row.stage_id),
    stage_name: row.stage_name,
    stage_order: Number(row.stage_order || 0),
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    delay_days: Number(row.delay_days || 0),
    triggered_at: row.triggered_at,
    triggered_by: row.triggered_by
  }));

  // 為每個階段獲取該任務所屬服務的相同年月任務，用於顯示該服務的整體情況
  // 該任務的所屬服務應該已經先天篩選了年月，所以只需要查詢相同 client_service_id、service_year、service_month 的任務
  const clientServiceId = task.client_service_id;
  const serviceYear = Number(task.service_year);
  const serviceMonth = Number(task.service_month);
  
  console.log(`[TaskDetail] 查詢相關任務: taskId=${taskId}, clientServiceId=${clientServiceId}, serviceYear=${serviceYear}, serviceMonth=${serviceMonth}`);
  
  if (clientServiceId && serviceYear && serviceMonth && Number.isFinite(serviceYear) && Number.isFinite(serviceMonth)) {
    for (const stage of stages) {
      // 查詢所有屬於該 client_service_id、相同 service_year、相同 service_month 且具有該 stage_order 的任務
      // 這樣可以顯示該服務在該階段的所有任務（相同年月），看到整體情況
      // 確保 service_year 和 service_month 都是有效的數字
      const relatedTasksRows = await env.DATABASE.prepare(
        `SELECT DISTINCT
            t.task_id,
            t.task_type,
            t.status,
            t.assignee_user_id,
            u.name AS assignee_name,
            st.status AS stage_status,
            t.service_year,
            t.service_month
         FROM ActiveTasks t
         INNER JOIN ActiveTaskStages st ON st.task_id = t.task_id
         LEFT JOIN Users u ON u.user_id = t.assignee_user_id
         WHERE t.client_service_id = ?
           AND t.service_year IS NOT NULL
           AND t.service_month IS NOT NULL
           AND CAST(t.service_year AS INTEGER) = ?
           AND CAST(t.service_month AS INTEGER) = ?
           AND st.stage_order = ?
           AND t.is_deleted = 0
         ORDER BY t.task_id ASC`
      ).bind(clientServiceId, serviceYear, serviceMonth, stage.stage_order).all();
      
      console.log(`[TaskDetail] 階段${stage.stage_order}查詢結果: ${relatedTasksRows?.results?.length || 0}個任務`, relatedTasksRows?.results?.map(r => ({ task_id: r.task_id, service_year: r.service_year, service_month: r.service_month })));

      // 去重處理：使用 Map 確保每個 task_id 只出現一次
      const taskMap = new Map();
      (relatedTasksRows?.results || []).forEach((taskRow) => {
        const taskId = Number(taskRow.task_id);
        if (!taskMap.has(taskId)) {
          taskMap.set(taskId, {
            task_id: taskId,
            task_name: taskRow.task_type || '',
            task_status: taskRow.stage_status || taskRow.status || 'pending',
            assignee_user_id: taskRow.assignee_user_id || null,
            assignee_name: (taskRow.assignee_name && String(taskRow.assignee_name).trim() !== '') ? String(taskRow.assignee_name).trim() : null
          });
        }
      });
      
      stage.tasks = Array.from(taskMap.values());
    }
  } else {
    // 如果沒有 client_service_id、service_year 或 service_month，為每個階段設置空數組
    stages.forEach(stage => {
      stage.tasks = [];
    });
  }

  const currentStage = stages.find((stage) => stage.status !== 'completed');
  data.stages = stages;
  data.current_stage_id = currentStage ? currentStage.stage_id : null;

  // 不緩存任務詳情，確保每次查詢都是最新數據
  // await saveKVCache(env, cacheKey, 'task_detail', data, { ttl: 1800 }).catch(() => {});
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 获取任务列表
 */
export async function handleGetTasks(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const params = url.searchParams;
  
  // 檢查任務生成狀態，確保不會顯示不全的任務
  // 如果正在生成當月任務，返回生成狀態信息
  // 如果沒有生成且用戶是管理員，觸發即時生成
  const serviceMonthParam = params.get("service_month") || params.get("month");
  const serviceYearParam = params.get("service_year") || params.get("year");
  const triggerGeneration = params.get("trigger_generation") === "1"; // 是否觸發即時生成
  
  if (serviceYearParam && serviceMonthParam) {
    const year = parseInt(serviceYearParam);
    const month = parseInt(serviceMonthParam);
    if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
      const lockKey = `task_generation_lock_${year}_${month}`;
      try {
        const lockStatus = await env.CACHE.get(lockKey);
        if (lockStatus) {
          const status = JSON.parse(lockStatus);
          if (status.status === 'generating' || status.status === 'partial') {
            // 正在生成或部分完成，返回狀態信息
            return successResponse(
              { tasks: [], total: 0, page: 1, perPage: 50 },
              `任務生成中（${status.processedServices || 0}/${status.totalServices || 0}），請稍後刷新`,
              requestId,
              {
                generationStatus: status.status,
                processedServices: status.processedServices || 0,
                totalServices: status.totalServices || 0,
                remainingServices: status.remainingServices || 0,
                lastUpdated: status.lastUpdated || status.startedAt
              }
            );
          }
        }
        
        // 即時生成機制：如果用戶明確請求觸發生成，且沒有正在生成的鎖
        // 所有登入用戶都可以觸發即時生成（因為生成的是他們負責的任務）
        if (triggerGeneration && !lockStatus) {
          // 檢查是否真的沒有任務（快速檢查）
          // 只檢查當前用戶負責的任務，避免觸發不必要的生成
          let hasTasks = false
          if (user.is_admin) {
            // 管理員檢查所有任務
            const result = await env.DATABASE.prepare(
              `SELECT COUNT(1) as count FROM ActiveTasks 
               WHERE service_year = ? AND service_month = ? AND is_deleted = 0 
               LIMIT 1`
            ).bind(year, month).first()
            hasTasks = Number(result?.count || 0) > 0
          } else {
            // 非管理員只檢查自己負責的任務
            const result = await env.DATABASE.prepare(
              `SELECT COUNT(1) as count FROM ActiveTasks 
               WHERE service_year = ? AND service_month = ? AND is_deleted = 0 
               AND assignee_user_id = ?
               LIMIT 1`
            ).bind(year, month, user.user_id).first()
            hasTasks = Number(result?.count || 0) > 0
          }
          
          if (Number(hasTasks?.count || 0) === 0) {
            const now = new Date();
            
            // 設置鎖定狀態，防止重複觸發
            await env.CACHE.put(lockKey, JSON.stringify({
              status: 'generating',
              startedAt: now.toISOString(),
              lastUpdated: now.toISOString(),
              processedServices: 0,
              totalServices: 0,
              remainingServices: 0,
              isComplete: false,
              iterations: 0,
              totalQueries: 0,
              requestId: requestId,
              triggeredBy: 'on-demand'
            }), { expirationTtl: 15 * 60 }); // 15分鐘
            
            // 異步觸發生成，不阻塞當前請求
            // 使用 ctx.waitUntil 確保在 Worker 關閉前完成
            if (ctx?.waitUntil) {
              const { generateTasksForMonth } = await import("../task-generator/generator-new.js");
              ctx.waitUntil(
                generateTasksForMonth(env, year, month, { 
                  now, 
                  force: true,
                  ctx: ctx
                }).then(result => {
                  console.log(`[TaskList] 即時生成完成：${result.generatedCount} 個任務`);
                  // 更新鎖定狀態
                  return env.CACHE.put(lockKey, JSON.stringify({
                    status: result.isComplete ? 'completed' : 'partial',
                    startedAt: now.toISOString(),
                    lastUpdated: new Date().toISOString(),
                    processedServices: result.processedServices || 0,
                    totalServices: result.totalServices || 0,
                    remainingServices: result.remainingServices || 0,
                    isComplete: result.isComplete,
                    iterations: 1,
                    totalQueries: result.queryCount || 0,
                    requestId: requestId,
                    triggeredBy: 'on-demand'
                  }), { expirationTtl: result.isComplete ? 3600 : 15 * 60 });
                }).catch(err => {
                  console.error("[TaskList] 即時生成任務失敗", err);
                  // 清除鎖定狀態
                  return env.CACHE.delete(lockKey).catch(() => {});
                })
              );
            } else {
              // 沒有 ctx，直接異步觸發（不等待）
              const { generateTasksForMonth } = await import("../task-generator/generator-new.js");
              generateTasksForMonth(env, year, month, { 
                now, 
                force: true,
                ctx: null
              }).catch(err => {
                console.error("[TaskList] 即時生成任務失敗", err);
                env.CACHE.delete(lockKey).catch(() => {});
              });
            }
            
            // 返回提示信息，讓前端知道已觸發生成
            return successResponse(
              { tasks: [], total: 0, page: 1, perPage: 50 },
              "已觸發任務生成，請稍後刷新",
              requestId,
              {
                generationStatus: 'triggered',
                message: '已觸發即時生成，請稍後刷新查看任務'
              }
            );
          }
        }
      } catch (err) {
        console.warn("[TaskList] 檢查生成狀態失敗", err);
        // 繼續正常查詢，不阻塞
      }
    }
  }
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  // 增加 perPage 限制到 1000，以支持一次性載入更多任務
  const perPage = Math.min(1000, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
  const offset = (page - 1) * perPage;
  const q = (params.get("q") || "").trim();
  const status = (params.get("status") || "").trim();
  const due = (params.get("due") || "").trim();
  const componentId = (params.get("component_id") || "").trim();
  const serviceYear = (params.get("service_year") || "").trim();
  const serviceMonth = (params.get("service_month") || "").trim();
  const hideCompleted = params.get("hide_completed") === "1";
  const canStart = params.get("can_start"); // "true" or "false" or null
  
  const cacheKey = generateCacheKey('tasks_list', {
    page, perPage, q, status, due, componentId, serviceYear, serviceMonth,
    hideCompleted: hideCompleted ? '1' : '0',
    canStart: canStart || '',
    userId: user.is_admin ? 'all' : String(user.user_id)
  });
  
  const kvCached = await getKVCache(env, cacheKey);
  if (kvCached?.data) {
    return successResponse(kvCached.data.list, "查詢成功（KV缓存）", requestId, {
      ...kvCached.data.meta,
      cache_source: 'kv'
    });
  }
  
  const where = ["t.is_deleted = 0"];
  const binds = [];
  
  if (!user.is_admin && !componentId) {
    where.push("t.assignee_user_id = ?");
    binds.push(String(user.user_id));
  }
  // component_id 字段在当前数据库版本中不存在，暂时跳过此筛选
  // if (componentId) {
  //   where.push("t.component_id = ?");
  //   binds.push(componentId);
  // }
  if (q) {
    where.push("(t.task_type LIKE ? OR c.company_name LIKE ? OR c.tax_registration_number LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (status && ["in_progress", "completed", "cancelled"].includes(status)) {
    where.push("t.status = ?");
    binds.push(status);
  }
  if (due === "overdue") {
    where.push("date(t.due_date) < date('now') AND t.status != 'completed'");
  }
  if (due === "soon") {
    where.push("date(t.due_date) BETWEEN date('now') AND date('now','+3 days')");
  }
  // 修正：使用 service_year 和 service_month 兩個獨立字段進行篩選
  if (serviceYear && serviceMonth) {
    where.push("t.service_year = ? AND t.service_month = ?");
    binds.push(parseInt(serviceYear), parseInt(serviceMonth));
  } else if (serviceYear) {
    where.push("t.service_year = ?");
    binds.push(parseInt(serviceYear));
  }
  if (hideCompleted) {
    where.push("t.status != 'completed'");
  }
  
  // Add can_start filter
  if (canStart === "true" || canStart === "false") {
    // Use the same logic as in SELECT clause to filter by can_start
    const canStartValue = canStart === "true" ? 1 : 0;
    where.push(`(
      CASE 
        -- No stages: can start
        WHEN (SELECT COUNT(1) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id) = 0 THEN 1
        -- All stages completed: can start (though task might be completed)
        WHEN (SELECT MIN(stg.stage_order) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id AND stg.status != 'completed') IS NULL THEN 1
        -- First stage (stage_order = 1) is not completed: can start
        WHEN (SELECT MIN(stg.stage_order) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id AND stg.status != 'completed') = 1 THEN 1
        -- Check if all preceding stages (before first non-completed) are completed
        ELSE CASE 
          WHEN (
            SELECT COUNT(1) 
            FROM ActiveTaskStages stg 
            WHERE stg.task_id = t.task_id 
            AND stg.stage_order < (
              SELECT MIN(stg2.stage_order) 
              FROM ActiveTaskStages stg2 
              WHERE stg2.task_id = t.task_id 
              AND stg2.status != 'completed'
            )
            AND stg.status != 'completed'
          ) = 0 THEN 1
          ELSE 0
        END
      END
    ) = ?`);
    binds.push(canStartValue);
  }
  
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  
  let countRow;
  try {
    countRow = await env.DATABASE.prepare(
      `SELECT COUNT(1) as total
       FROM ActiveTasks t
       LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
       LEFT JOIN Clients c ON c.client_id = cs.client_id
       ${whereSql}`
    ).bind(...binds).first();
  } catch (err) {
    console.error(`[Tasks] Count query error:`, err);
    throw err;
  }
  const total = Number(countRow?.total || 0);
  
  let rows;
  try {
    rows = await env.DATABASE.prepare(
      `SELECT t.task_id, t.task_type, t.due_date, t.status, t.assignee_user_id, t.notes, t.service_month,
              t.client_service_id, cs.service_id,
              c.company_name AS client_name, c.tax_registration_number AS client_tax_id, c.client_id,
              s.service_name,
              (SELECT COUNT(1) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id) AS total_stages,
              (SELECT COUNT(1) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id AND stg.status = 'completed') AS completed_stages,
              u.name AS assignee_name,
              -- Calculate can_start: true if no stages, or if all preceding stages (before first non-completed stage) are completed
              -- Logic: A task can start if there are no stages, or if the first non-completed stage has all preceding stages completed
              CASE 
                -- No stages: can start
                WHEN (SELECT COUNT(1) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id) = 0 THEN 1
                -- All stages completed: can start (though task might be completed)
                WHEN (SELECT MIN(stg.stage_order) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id AND stg.status != 'completed') IS NULL THEN 1
                -- First stage (stage_order = 1) is not completed: can start
                WHEN (SELECT MIN(stg.stage_order) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id AND stg.status != 'completed') = 1 THEN 1
                -- Check if all preceding stages (before first non-completed) are completed
                ELSE CASE 
                  WHEN (
                    SELECT COUNT(1) 
                    FROM ActiveTaskStages stg 
                    WHERE stg.task_id = t.task_id 
                    AND stg.stage_order < (
                      SELECT MIN(stg2.stage_order) 
                      FROM ActiveTaskStages stg2 
                      WHERE stg2.task_id = t.task_id 
                      AND stg2.status != 'completed'
                    )
                    AND stg.status != 'completed'
                  ) = 0 THEN 1
                  ELSE 0
                END
              END AS can_start,
              -- Calculate is_overdue: due_date < current date AND status NOT IN ('completed', 'cancelled')
              CASE 
                WHEN t.due_date IS NULL THEN 0
                WHEN date(t.due_date) < date('now') AND t.status NOT IN ('completed', 'cancelled') THEN 1
                ELSE 0
              END AS is_overdue
       FROM ActiveTasks t
       LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
       LEFT JOIN Clients c ON c.client_id = cs.client_id
       LEFT JOIN Services s ON s.service_id = cs.service_id
       LEFT JOIN Users u ON u.user_id = t.assignee_user_id
       ${whereSql}
       ORDER BY c.company_name ASC, s.service_name ASC, t.service_month DESC, date(t.due_date) ASC NULLS LAST, t.task_id DESC
       LIMIT ? OFFSET ?`
    ).bind(...binds, perPage, offset).all();
  } catch (err) {
    console.error(`[Tasks] Select query error:`, err);
    throw err;
  }
  
  // 獲取所有任務的階段資料
  const taskIds = (rows?.results || []).map(r => r.task_id);
  const stagesMap = new Map();
  
  if (taskIds.length > 0) {
    try {
      // 使用 IN 查詢獲取所有任務的階段
      const placeholders = taskIds.map(() => '?').join(',');
      const stagesRows = await env.DATABASE.prepare(
        `SELECT 
          task_id,
          active_stage_id AS stage_id,
          stage_name,
          stage_order,
          status
         FROM ActiveTaskStages
         WHERE task_id IN (${placeholders})
         ORDER BY task_id, stage_order ASC`
      ).bind(...taskIds).all();
      
      // 按 task_id 分組階段
      (stagesRows?.results || []).forEach((row) => {
        const taskId = row.task_id;
        if (!stagesMap.has(taskId)) {
          stagesMap.set(taskId, []);
        }
        stagesMap.get(taskId).push({
          stage_id: Number(row.stage_id),
          stage_name: row.stage_name,
          stage_order: Number(row.stage_order || 0),
          status: row.status
        });
      });
    } catch (err) {
      console.error(`[Tasks] Fetch stages error:`, err);
      // 如果獲取階段失敗，繼續處理但不包含階段資料
    }
  }
  
  const data = (rows?.results || []).map((r) => ({
    taskId: String(r.task_id),
    taskName: r.task_type,
    clientName: r.client_name || "",
    clientTaxId: r.client_tax_id || "",
    clientId: r.client_id || "",
    clientServiceId: r.client_service_id || null,
    serviceId: r.service_id || null,
    serviceName: r.service_name || "",
    serviceMonth: r.service_month || "", // 任務的 service_month，不是收據的
    componentId: null, // component_id 字段在当前数据库版本中不存在
    assigneeName: r.assignee_name || "",
    assigneeUserId: r.assignee_user_id || null,
    progress: { completed: Number(r.completed_stages || 0), total: Number(r.total_stages || 0) },
    totalStages: Number(r.total_stages || 0),
    stages: stagesMap.get(r.task_id) || [], // 返回所有階段資料
    dueDate: r.due_date || null,
    status: r.status,
    notes: r.notes || "",
    hasSop: Number(r.has_sop || 0) === 1,
    canStart: Boolean(r.can_start === 1),
    isOverdue: Boolean(r.is_overdue === 1),
  }));
  
  const meta = { page, perPage, total, hasNext: offset + perPage < total };
  const cacheData = { list: data, meta };
  
  await saveKVCache(env, cacheKey, 'tasks_list', cacheData, { ttl: 1800 }).catch(() => {});
  
  return successResponse(data, "成功", requestId, meta);
}

/**
 * 创建任务
 */
export async function handleCreateTask(request, env, ctx, requestId, url) {
  const body = await request.json();
  const clientServiceId = Number(body?.client_service_id || 0);
  const taskName = String(body?.task_name || "").trim();
  const dueDate = body?.due_date ? String(body.due_date) : null;
  const assigneeUserId = body?.assignee_user_id ? Number(body.assignee_user_id) : null;
  const stageNames = Array.isArray(body?.stage_names) ? body.stage_names.filter(s => typeof s === 'string' && s.trim().length > 0).map(s => s.trim()) : [];
  
  let serviceMonth = body?.service_month ? String(body.service_month).trim() : null;
  if (!serviceMonth) {
    const now = new Date();
    serviceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  
  const errors = [];
  if (!Number.isInteger(clientServiceId) || clientServiceId <= 0) errors.push({ field: "client_service_id", message: "必填" });
  if (taskName.length < 1 || taskName.length > 200) errors.push({ field: "task_name", message: "長度需 1–200" });
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) errors.push({ field: "due_date", message: "日期格式 YYYY-MM-DD" });
  if (serviceMonth && !/^\d{4}-\d{2}$/.test(serviceMonth)) errors.push({ field: "service_month", message: "格式需 YYYY-MM" });
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 验证客户服务存在
  const cs = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_service_id = ? LIMIT 1").bind(clientServiceId).first();
  if (!cs) {
    return errorResponse(422, "VALIDATION_ERROR", "客戶服務不存在", [{ field: "client_service_id", message: "不存在" }], requestId);
  }
  
  if (assigneeUserId) {
    const u = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
    if (!u) {
      return errorResponse(422, "VALIDATION_ERROR", "負責人不存在", [{ field: "assignee_user_id", message: "不存在" }], requestId);
    }
  }
  
  const now = new Date().toISOString();
  // 獲取 client_id 和 service_id
  const csInfo = await env.DATABASE.prepare(
    `SELECT cs.client_id, cs.service_id 
     FROM ClientServices cs 
     WHERE cs.client_service_id = ?`
  ).bind(clientServiceId).first();
  
  if (!csInfo) {
    return errorResponse(422, "VALIDATION_ERROR", "客戶服務不存在", null, requestId);
  }
  
  const serviceYear = parseInt(serviceMonth.split('-')[0]);
  const serviceMonthNum = parseInt(serviceMonth.split('-')[1]);
  
  await env.DATABASE.prepare(
    `INSERT INTO ActiveTasks (
      client_id, client_service_id, service_id, task_type, assignee_user_id, 
      status, service_year, service_month, due_date, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?, '', ?)`
  ).bind(csInfo.client_id, clientServiceId, csInfo.service_id, taskName, assigneeUserId, serviceYear, serviceMonthNum, dueDate, now).run();
  
  const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
  const taskId = String(idRow?.id);
  
  // 创建任务阶段
  if (stageNames.length > 0) {
    let order = 1;
    for (const s of stageNames) {
      await env.DATABASE.prepare(
        `INSERT INTO ActiveTaskStages (task_id, stage_name, stage_order, status) VALUES (?, ?, ?, 'pending')`
      ).bind(taskId, s, order++).run();
    }
  }
  
  // 清除任务缓存
  await deleteKVCacheByPrefix(env, 'task_detail').catch(() => {});
  await deleteKVCacheByPrefix(env, 'tasks_list').catch(() => {});
  
  return successResponse({ taskId, taskName, clientServiceId, dueDate, serviceMonth, assigneeUserId }, "已建立", requestId);
}

/**
 * 更新任务
 */
export async function handleUpdateTask(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const taskId = match[1];
  const body = await request.json();
  
  const errors = [];
  const updates = [];
  const binds = [];
  
  if (body.hasOwnProperty('task_name')) {
    const taskName = String(body.task_name || "").trim();
    if (taskName.length < 1 || taskName.length > 200) {
      errors.push({ field: "task_name", message: "長度需 1–200" });
    } else {
      updates.push("task_type = ?");
      binds.push(taskName);
    }
  }
  if (body.hasOwnProperty('due_date')) {
    const dueDate = body.due_date ? String(body.due_date) : null;
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      errors.push({ field: "due_date", message: "日期格式 YYYY-MM-DD" });
    } else {
      updates.push("due_date = ?");
      binds.push(dueDate);
    }
  }
  if (body.hasOwnProperty('status')) {
    const status = String(body.status || "").trim();
    if (!["in_progress", "completed", "cancelled"].includes(status)) {
      errors.push({ field: "status", message: "狀態無效" });
    } else {
      updates.push("status = ?");
      binds.push(status);
      if (status === "completed") {
        updates.push("completed_date = ?");
        binds.push(new Date().toISOString());
      }
    }
  }
  if (body.hasOwnProperty('assignee_user_id')) {
    const assigneeUserId = body.assignee_user_id ? Number(body.assignee_user_id) : null;
    if (assigneeUserId !== null && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) {
      errors.push({ field: "assignee_user_id", message: "格式錯誤" });
    } else {
      if (assigneeUserId) {
        const u = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
        if (!u) {
          errors.push({ field: "assignee_user_id", message: "負責人不存在" });
        }
      }
      if (errors.length === 0) {
        updates.push("assignee_user_id = ?");
        binds.push(assigneeUserId);
      }
    }
  }
  if (body.hasOwnProperty('notes')) {
    updates.push("notes = ?");
    binds.push(String(body.notes || "").trim() || null);
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  if (updates.length === 0) {
    return errorResponse(400, "BAD_REQUEST", "沒有要更新的欄位", null, requestId);
  }
  
  // 检查任务是否存在
  const task = await env.DATABASE.prepare("SELECT task_id, assignee_user_id FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0 LIMIT 1").bind(taskId).first();
  if (!task) {
    return errorResponse(404, "NOT_FOUND", "任務不存在", null, requestId);
  }
  
  // 权限检查：只有管理员或任务负责人可以更新
  if (!user.is_admin && Number(task.assignee_user_id) !== Number(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限更新此任務", null, requestId);
  }
  
  // 执行更新
  const sql = `UPDATE ActiveTasks SET ${updates.join(", ")} WHERE task_id = ?`;
  await env.DATABASE.prepare(sql).bind(...binds, taskId).run();
  
  // 清除任务缓存
  await deleteKVCacheByPrefix(env, 'task_detail').catch(() => {});
  await deleteKVCacheByPrefix(env, 'tasks_list').catch(() => {});
  
  return successResponse({ taskId }, "已更新", requestId);
}

/**
 * 删除任务
 */
export async function handleDeleteTask(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const taskId = match[1];
  
  // 检查任务是否存在
  const task = await env.DATABASE.prepare("SELECT task_id, assignee_user_id FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0 LIMIT 1").bind(taskId).first();
  if (!task) {
    return errorResponse(404, "NOT_FOUND", "任務不存在", null, requestId);
  }
  
  // 权限检查
  if (!user.is_admin && Number(task.assignee_user_id) !== Number(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限刪除此任務", null, requestId);
  }
  
  // 软删除
  await env.DATABASE.prepare(
    `UPDATE ActiveTasks SET is_deleted = 1 WHERE task_id = ?`
  ).bind(taskId).run();
  
  // 清除任务缓存
  await deleteKVCacheByPrefix(env, 'task_detail').catch(() => {});
  await deleteKVCacheByPrefix(env, 'tasks_list').catch(() => {});
  
  return successResponse({ taskId }, "已刪除", requestId);
}

/**
 * 獲取預設日期範圍
 * 計算從最早有未完成任務的月份到當前月份
 */
export async function handleGetDefaultDateRange(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 驗證用戶身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  try {
    const where = ["t.is_deleted = 0"];
    const binds = [];
    
    // 權限過濾：非管理員只能看到自己負責的任務
    if (!user.is_admin) {
      where.push("t.assignee_user_id = ?");
      binds.push(String(user.user_id));
    }
    
    // 只查詢未完成的任務（不包括已完成和已取消的）
    where.push("t.status NOT IN ('completed', 'cancelled')");
    
    // 只查詢有 service_month 的任務
    where.push("t.service_month IS NOT NULL AND t.service_month != ''");
    
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    
    // 查詢所有未完成任務的 service_month
    const tasks = await env.DATABASE.prepare(
      `SELECT DISTINCT t.service_month
       FROM ActiveTasks t
       LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
       LEFT JOIN Clients c ON c.client_id = cs.client_id
       ${whereSql}
       ORDER BY t.service_month ASC`
    ).bind(...binds).all();
    
    // 獲取當前日期
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    
    // 如果沒有未完成任務，返回當前月份
    if (!tasks || tasks.results.length === 0) {
      return successResponse({
        start_month: currentMonthStr,
        end_month: currentMonthStr
      }, "查詢成功", requestId);
    }
    
    // 找出最早的月份
    const months = tasks.results
      .map(row => row.service_month)
      .filter(month => month && /^\d{4}-\d{2}$/.test(month))
      .sort();
    
    if (months.length === 0) {
      // 如果沒有有效的月份格式，返回當前月份
      return successResponse({
        start_month: currentMonthStr,
        end_month: currentMonthStr
      }, "查詢成功", requestId);
    }
    
    const earliestMonth = months[0];
    
    // 返回從最早月份到當前月份
    return successResponse({
      start_month: earliestMonth,
      end_month: currentMonthStr
    }, "查詢成功", requestId);
    
  } catch (err) {
    console.error(`[Default Date Range] Query error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", `獲取預設日期範圍失敗: ${err.message || String(err)}`, null, requestId);
  }
}

/**
 * 获取任务总览（按客户+服务分组）
 */
export async function handleGetTasksOverview(request, env, ctx, requestId, match, url) {
  try {
    // 解析筛选参数
    const params = url.searchParams;
    const months = params.getAll('months[]') || params.getAll('months'); // 兼容两种格式
    const statuses = params.getAll('statuses[]') || params.getAll('statuses');
    const sources = params.getAll('sources[]') || params.getAll('sources');
    const searchText = params.get('search');
    
    if (!months || months.length === 0) {
      return errorResponse(400, "VALIDATION_ERROR", "請至少選擇一個月份", null, requestId);
    }
    
    // 构建WHERE条件
    const where = ['t.is_deleted = 0'];
    const binds = [];
    
    // 月份条件（多选）- 注意新表格使用 service_year 和 service_month 两个字段
    const monthConditions = months.map(() => 
      "CONCAT(CAST(t.service_year AS TEXT), '-', SUBSTR('0' || CAST(t.service_month AS TEXT), -2)) = ?"
    ).join(' OR ');
    where.push(`(${monthConditions})`);
    binds.push(...months);
    
    // 状态条件
    if (statuses && statuses.length > 0 && statuses.length < 4) { // 小于4表示不是全选
      const statusPlaceholders = statuses.map(() => '?').join(',');
      where.push(`t.status IN (${statusPlaceholders})`);
      binds.push(...statuses);
    }
    
    // 来源条件（新表格沒有 component_id，使用 task_config_id 判斷）
    if (sources && sources.length === 1) {
      if (sources[0] === 'auto') {
        where.push('t.task_config_id IS NOT NULL');
      } else if (sources[0] === 'manual') {
        where.push('t.task_config_id IS NULL');
      }
    }
    
    // 客户搜索
    if (searchText) {
      where.push('c.company_name LIKE ?');
      binds.push(`%${searchText}%`);
    }
    
    const whereSql = where.join(' AND ');
    
    // 查询任务
    const tasks = await env.DATABASE.prepare(`
      SELECT 
        t.task_id,
        t.task_type as task_name,
        t.status,
        t.due_date,
        t.completed_at as completed_date,
        CONCAT(CAST(t.service_year AS TEXT), '-', SUBSTR('0' || CAST(t.service_month AS TEXT), -2)) as service_month,
        t.notes,
        t.created_at,
        cs.client_service_id,
        cs.service_id,
        c.client_id,
        c.company_name,
        c.tax_registration_number as client_tax_id,
        s.service_name,
        u.name as assignee_name,
        (SELECT COUNT(1) FROM ActiveTaskStages ats WHERE ats.task_id = t.task_id) as total_stages,
        (SELECT COUNT(1) FROM ActiveTaskStages ats WHERE ats.task_id = t.task_id AND ats.status = 'completed') as completed_stages
      FROM ActiveTasks t
      LEFT JOIN ClientServices cs ON t.client_service_id = cs.client_service_id
      LEFT JOIN Clients c ON c.client_id = cs.client_id
      LEFT JOIN Services s ON s.service_id = cs.service_id
      LEFT JOIN Users u ON u.user_id = t.assignee_user_id
      WHERE ${whereSql}
      ORDER BY c.company_name, s.service_name, t.service_year DESC, t.service_month DESC, t.due_date
    `).bind(...binds).all();
    
    console.log('[getTasksOverview] 查询到任务数量:', tasks.results?.length);
    
    // 返回数据
    return successResponse(tasks.results || [], "查詢成功", requestId);
    
  } catch (err) {
    console.error('[getTasksOverview] 获取任务总览失败:', err);
    return errorResponse(500, "INTERNAL_ERROR", `獲取失敗: ${err.message || String(err)}`, null, requestId);
  }
}

