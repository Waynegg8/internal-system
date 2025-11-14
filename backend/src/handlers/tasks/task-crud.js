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
  
  const cacheKey = generateCacheKey('task_detail', { taskId });
  const kvCached = await getKVCache(env, cacheKey);
  
  if (kvCached?.data) {
    return successResponse(kvCached.data, "查詢成功（KV缓存）", requestId);
  }
  
  const task = await env.DATABASE.prepare(
    `SELECT t.task_id, t.task_type, t.due_date, t.status, t.assignee_user_id, t.notes, t.client_service_id,
            t.completed_at, t.created_at, t.service_month, t.estimated_hours,
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

  const currentStage = stages.find((stage) => stage.status !== 'completed');
  data.stages = stages;
  data.current_stage_id = currentStage ? currentStage.stage_id : null;

  await saveKVCache(env, cacheKey, 'task_detail', data, { ttl: 1800 }).catch(() => {});
  
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
  const page = Math.max(1, parseInt(params.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
  const offset = (page - 1) * perPage;
  const q = (params.get("q") || "").trim();
  const status = (params.get("status") || "").trim();
  const due = (params.get("due") || "").trim();
  const componentId = (params.get("component_id") || "").trim();
  const serviceYear = (params.get("service_year") || "").trim();
  const serviceMonth = (params.get("service_month") || "").trim();
  const hideCompleted = params.get("hide_completed") === "1";
  
  const cacheKey = generateCacheKey('tasks_list', {
    page, perPage, q, status, due, componentId, serviceYear, serviceMonth,
    hideCompleted: hideCompleted ? '1' : '0',
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
  if (serviceYear && serviceMonth) {
    where.push("t.service_month = ?");
    binds.push(`${serviceYear}-${serviceMonth.padStart(2, '0')}`);
  } else if (serviceYear) {
    where.push("t.service_month LIKE ?");
    binds.push(`${serviceYear}-%`);
  }
  if (hideCompleted) {
    where.push("t.status != 'completed'");
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
              u.name AS assignee_name
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
    dueDate: r.due_date || null,
    status: r.status,
    notes: r.notes || "",
    hasSop: Number(r.has_sop || 0) === 1,
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

