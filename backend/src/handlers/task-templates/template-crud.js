/**
 * 任务模板基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取任务模板列表
 */
export async function handleGetTaskTemplates(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const serviceId = params.get("service_id");
  const clientId = params.get("client_id");
  
  let query = `
    SELECT tt.template_id, tt.template_name, tt.service_id, tt.client_id, tt.description, 
           tt.sop_id, tt.is_active, tt.created_at,
           tt.default_due_date_rule, tt.default_due_date_value, 
           tt.default_due_date_offset_days, tt.default_advance_days,
           s.service_name, s.service_code,
           c.company_name as client_name,
           (SELECT COUNT(DISTINCT stage_order) FROM TaskTemplateStages WHERE template_id = tt.template_id) as stages_count
    FROM TaskTemplates tt
    LEFT JOIN Services s ON s.service_id = tt.service_id
    LEFT JOIN Clients c ON c.client_id = tt.client_id
    WHERE 1=1
  `;
  const binds = [];
  
  if (serviceId) {
    query += ` AND tt.service_id = ?`;
    binds.push(parseInt(serviceId, 10));
  }
  
  if (clientId) {
    if (clientId === 'null') {
      query += ` AND tt.client_id IS NULL`;
    } else {
      query += ` AND tt.client_id = ?`;
      binds.push(parseInt(clientId, 10));
    }
  }
  
  query += ` ORDER BY tt.template_name ASC`;
  
  let rows;
  try {
    const stmt = binds.length > 0 
      ? env.DATABASE.prepare(query).bind(...binds)
      : env.DATABASE.prepare(query);
    
    rows = await stmt.all();
  } catch (dbError) {
    console.error('[Task Templates] Database query error:', dbError);
    return successResponse([], "查詢成功（空結果）", requestId);
  }
  
  // 獲取每個模板的任務（stages）
  const data = await Promise.all((rows?.results || []).map(async (r) => {
    // 獲取模板的任務列表
    const tasksRows = await env.DATABASE.prepare(
      `SELECT stage_id, stage_name, stage_order, description, estimated_hours, 
              execution_frequency, execution_months, created_at
       FROM TaskTemplateStages
       WHERE template_id = ?
       ORDER BY stage_order ASC`
    ).bind(r.template_id).all();
    
    const tasks = (tasksRows?.results || []).map(t => ({
      stage_id: t.stage_id,
      task_name: t.stage_name || "",
      stage_name: t.stage_name || "",
      stage_order: t.stage_order,
      description: t.description || "",
      estimated_hours: Number(t.estimated_hours || 0),
      execution_frequency: t.execution_frequency || 'monthly',
      execution_months: t.execution_months ? JSON.parse(t.execution_months) : [1,2,3,4,5,6,7,8,9,10,11,12],
      sops: [],
      assignee_user_id: null,
      advance_days: r.default_advance_days || 7,
      due_rule: r.default_due_date_rule || 'end_of_month',
      due_value: r.default_due_date_value || null
    }));
    
    return {
      template_id: r.template_id,
      template_name: r.template_name || "",
      service_id: r.service_id || null,
      service_name: r.service_name || "",
      service_code: r.service_code || "",
      client_id: r.client_id || null,
      client_name: r.client_name || "",
      description: r.description || "",
      sop_id: r.sop_id || null,
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
      stages_count: r.stages_count || 0,
      default_due_date_rule: r.default_due_date_rule || null,
      default_due_date_value: r.default_due_date_value || null,
      default_due_date_offset_days: r.default_due_date_offset_days || 0,
      default_advance_days: r.default_advance_days || 7,
      tasks: tasks  // 添加 tasks 字段
    };
  }));
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 获取任务模板详情（含阶段）
 */
export async function handleGetTaskTemplateDetail(request, env, ctx, requestId, match, url) {
  const templateId = parseInt(match[1], 10);
  
  if (!templateId || templateId <= 0) {
    return errorResponse(400, "INVALID_ID", "模板ID無效", null, requestId);
  }
  
  // 获取模板基本信息
  const template = await env.DATABASE.prepare(
    `SELECT tt.template_id, tt.template_name, tt.service_id, tt.client_id, tt.description, 
            tt.sop_id, tt.is_active, tt.created_at,
            tt.default_due_date_rule, tt.default_due_date_value, 
            tt.default_due_date_offset_days, tt.default_advance_days,
            s.service_name, s.service_code,
            c.company_name as client_name
     FROM TaskTemplates tt
     LEFT JOIN Services s ON s.service_id = tt.service_id
     LEFT JOIN Clients c ON c.client_id = tt.client_id
     WHERE tt.template_id = ?`
  ).bind(templateId).first();
  
  if (!template) {
    return errorResponse(404, "NOT_FOUND", "模板不存在", null, requestId);
  }
  
  // 获取阶段列表
  const stagesRows = await env.DATABASE.prepare(
    `SELECT stage_id, stage_name, stage_order, description, estimated_hours, execution_frequency, execution_months
     FROM TaskTemplateStages
     WHERE template_id = ?
     ORDER BY stage_order ASC`
  ).bind(templateId).all();
  
  const stages = (stagesRows?.results || []).map(s => ({
    stage_id: s.stage_id,
    name: s.stage_name || "",  // 前端使用 name 字段
    stage_name: s.stage_name || "",
    stage_order: s.stage_order,
    description: s.description || "",
    estimated_hours: Number(s.estimated_hours || 0),
    execution_frequency: s.execution_frequency || 'monthly',
    execution_months: s.execution_months ? JSON.parse(s.execution_months) : [1,2,3,4,5,6,7,8,9,10,11,12]
  }));
  
  const data = {
    template_id: template.template_id,
    template_name: template.template_name || "",
    service_id: template.service_id || null,
    service_name: template.service_name || "",
    service_code: template.service_code || "",
    client_id: template.client_id || null,
    client_name: template.client_name || "",
    description: template.description || "",
    sop_id: template.sop_id || null,
    is_active: Boolean(template.is_active),
    created_at: template.created_at,
    default_due_date_rule: template.default_due_date_rule || null,
    default_due_date_value: template.default_due_date_value || null,
    default_due_date_offset_days: template.default_due_date_offset_days || 0,
    default_advance_days: template.default_advance_days || 7,
    stages: stages
  };
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 创建任务模板
 */
export async function handleCreateTaskTemplate(request, env, ctx, requestId, url) {
  try {
    const user = ctx?.user;
    
    // 仅管理员可创建模板
    if (!user || !user.is_admin) {
      return errorResponse(403, "FORBIDDEN", "僅管理員可創建模板", null, requestId);
    }
    
    const body = await request.json();
    const templateName = String(body?.template_name || "").trim();
    const serviceId = body?.service_id ? parseInt(body.service_id, 10) : null;
    const clientId = body?.client_id ? parseInt(body.client_id, 10) : null;
    const description = String(body?.description || "").trim();
    const sopId = body?.sop_id ? parseInt(body.sop_id, 10) : null;
    // 接收tasks字段（前端發送的是tasks，不是stages）
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
    const stages = Array.isArray(body?.stages) ? body.stages : [];
    const defaultDueDateRule = body?.default_due_date_rule || null;
    const defaultDueDateValue = body?.default_due_date_value || null;
    const defaultDueDateOffsetDays = body?.default_due_date_offset_days || 0;
    const defaultAdvanceDays = body?.default_advance_days || 7;
    
    const errors = [];
    if (!templateName) {
      errors.push({ field: "template_name", message: "請輸入模板名稱" });
    }
    
    if (errors.length) {
      return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
    }
    
    // 插入模板
    const result = await env.DATABASE.prepare(
      `INSERT INTO TaskTemplates (template_name, service_id, client_id, description, sop_id, is_active,
                                  default_due_date_rule, default_due_date_value, default_due_date_offset_days, default_advance_days)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
    ).bind(templateName, serviceId, clientId, description, sopId, 
           defaultDueDateRule, defaultDueDateValue, defaultDueDateOffsetDays, defaultAdvanceDays).run();
    
    const templateId = result?.meta?.last_row_id;
    
    if (!templateId) {
      console.error('[Task Template] Failed to get template_id after insert');
      throw new Error('無法獲取新建模板ID');
    }
    
    console.log(`[Task Template] Created template ${templateId}, tasks count: ${tasks.length}, stages count: ${stages.length}`);
    
    // 插入任務（使用tasks字段，將其保存到TaskTemplateStages表）
    const tasksToInsert = tasks.length > 0 ? tasks : stages;
    if (tasksToInsert.length > 0) {
      console.log(`[Task Template] Inserting ${tasksToInsert.length} tasks/stages`);
      for (let i = 0; i < tasksToInsert.length; i++) {
        const task = tasksToInsert[i];
        // 前端TaskConfiguration發送的是name字段，不是task_name或stage_name
        const taskName = String(task?.name || task?.task_name || task?.stage_name || "").trim();
        const taskDesc = String(task?.notes || task?.description || "").trim();
        const estimatedHours = parseFloat(task?.estimated_hours || 0) || null;
        const executionFrequency = task?.execution_frequency || 'monthly';
        const executionMonths = task?.execution_months ? JSON.stringify(task.execution_months) : '[1,2,3,4,5,6,7,8,9,10,11,12]';
        // 使用前端發送的 stage_order，而不是循環索引
        const stageOrder = task?.stage_order || (i + 1);
        
        console.log(`[Task Template] Task ${i+1}: name="${taskName}", stage=${stageOrder}, freq=${executionFrequency}, months=${executionMonths}`);
        
        if (taskName) {
          await env.DATABASE.prepare(
            `INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours, execution_frequency, execution_months)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(templateId, taskName, stageOrder, taskDesc || null, estimatedHours, executionFrequency, executionMonths).run();
        } else {
          console.warn(`[Task Template] Skipping task ${i+1} - empty name`);
        }
      }
    } else {
      console.log('[Task Template] No tasks/stages to insert');
    }
    
    return successResponse({ template_id: templateId }, "已創建", requestId);
  } catch (error) {
    console.error('[Task Template] Create error:', error);
    return errorResponse(500, "DB_ERROR", error.message || "創建失敗", null, requestId);
  }
}

/**
 * 更新任务模板
 */
export async function handleUpdateTaskTemplate(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const templateId = parseInt(match[1], 10);
  
  // 仅管理员可更新模板
  if (!user || !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "僅管理員可更新模板", null, requestId);
  }
  
  if (!templateId || templateId <= 0) {
    return errorResponse(400, "INVALID_ID", "模板ID無效", null, requestId);
  }
  
  const body = await request.json();
  const templateName = body?.template_name ? String(body.template_name).trim() : undefined;
  const serviceId = body?.service_id !== undefined ? (body.service_id ? parseInt(body.service_id, 10) : null) : undefined;
  const clientId = body?.client_id !== undefined ? (body.client_id ? parseInt(body.client_id, 10) : null) : undefined;
  const description = body?.description !== undefined ? String(body.description).trim() : undefined;
  const sopId = body?.sop_id !== undefined ? (body.sop_id ? parseInt(body.sop_id, 10) : null) : undefined;
  const isActive = body?.is_active !== undefined ? (body.is_active ? 1 : 0) : undefined;
  // 接收 tasks 字段（前端使用 tasks，後端統一處理）
  const tasks = body?.tasks || body?.stages;
  const defaultDueDateRule = body?.default_due_date_rule;
  const defaultDueDateValue = body?.default_due_date_value;
  const defaultDueDateOffsetDays = body?.default_due_date_offset_days;
  const defaultAdvanceDays = body?.default_advance_days;
  
  // 检查模板是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT template_id FROM TaskTemplates WHERE template_id = ?`
  ).bind(templateId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "模板不存在", null, requestId);
  }
  
  // 更新模板基本信息
  const updates = [];
  const binds = [];
  
  if (templateName !== undefined) {
    if (!templateName) {
      return errorResponse(422, "VALIDATION_ERROR", "模板名稱必填", null, requestId);
    }
    updates.push("template_name = ?");
    binds.push(templateName);
  }
  if (serviceId !== undefined) {
    updates.push("service_id = ?");
    binds.push(serviceId);
  }
  if (clientId !== undefined) {
    updates.push("client_id = ?");
    binds.push(clientId);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    binds.push(description || null);
  }
  if (sopId !== undefined) {
    updates.push("sop_id = ?");
    binds.push(sopId);
  }
  if (isActive !== undefined) {
    updates.push("is_active = ?");
    binds.push(isActive);
  }
  if (defaultDueDateRule !== undefined) {
    updates.push("default_due_date_rule = ?");
    binds.push(defaultDueDateRule || null);
  }
  if (defaultDueDateValue !== undefined) {
    updates.push("default_due_date_value = ?");
    binds.push(defaultDueDateValue || null);
  }
  if (defaultDueDateOffsetDays !== undefined) {
    updates.push("default_due_date_offset_days = ?");
    binds.push(defaultDueDateOffsetDays || 0);
  }
  if (defaultAdvanceDays !== undefined) {
    updates.push("default_advance_days = ?");
    binds.push(defaultAdvanceDays || 7);
  }
  
  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    binds.push(templateId);
    await env.DATABASE.prepare(
      `UPDATE TaskTemplates SET ${updates.join(", ")} WHERE template_id = ?`
    ).bind(...binds).run();
  }
  
  // 更新阶段（如果提供tasks字段）
  if (Array.isArray(tasks)) {
    console.log(`[Task Template] Updating ${tasks.length} tasks for template ${templateId}`);
    
    // 删除旧阶段
    await env.DATABASE.prepare(
      `DELETE FROM TaskTemplateStages WHERE template_id = ?`
    ).bind(templateId).run();
    
    // 插入新阶段
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      // 前端使用 name 字段
      const taskName = String(task?.name || task?.task_name || task?.stage_name || "").trim();
      const taskDesc = String(task?.notes || task?.description || "").trim();
      const estimatedHours = parseFloat(task?.estimated_hours || 0) || null;
      const executionFrequency = task?.execution_frequency || 'monthly';
      const executionMonths = task?.execution_months ? JSON.stringify(task.execution_months) : '[1,2,3,4,5,6,7,8,9,10,11,12]';
      // 使用前端發送的 stage_order，而不是循環索引
      const stageOrder = task?.stage_order || (i + 1);
      
      if (taskName) {
        await env.DATABASE.prepare(
          `INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours, execution_frequency, execution_months)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(templateId, taskName, stageOrder, taskDesc || null, estimatedHours, executionFrequency, executionMonths).run();
      } else {
        console.warn(`[Task Template] Skipping task ${i+1} - empty name`);
      }
    }
  }
  
  return successResponse({ template_id: templateId }, "已更新", requestId);
}

/**
 * 删除任务模板
 */
export async function handleDeleteTaskTemplate(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const templateId = parseInt(match[1], 10);
  
  // 仅管理员可删除模板
  if (!user || !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "僅管理員可刪除模板", null, requestId);
  }
  
  if (!templateId || templateId <= 0) {
    return errorResponse(400, "INVALID_ID", "模板ID無效", null, requestId);
  }
  
  // 检查模板是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT template_id FROM TaskTemplates WHERE template_id = ?`
  ).bind(templateId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "模板不存在", null, requestId);
  }
  
  // 软删除：先删除阶段，再删除模板
  await env.DATABASE.prepare(
    `DELETE FROM TaskTemplateStages WHERE template_id = ?`
  ).bind(templateId).run();
  
  await env.DATABASE.prepare(
    `DELETE FROM TaskTemplates WHERE template_id = ?`
  ).bind(templateId).run();
  
  return successResponse({ template_id: templateId }, "已刪除", requestId);
}

