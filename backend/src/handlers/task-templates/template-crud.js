/**
 * 任务模板基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";

/**
 * 获取任务模板列表
 */
export async function handleGetTaskTemplates(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const serviceId = params.get("service_id");
  const clientId = params.get("client_id");
  // 客户类型筛选：'unified' 表示统一模板（client_id IS NULL），'specific' 表示客户专属（client_id IS NOT NULL）
  const clientType = (params.get("client_type") || "").trim().toLowerCase();
  // 搜索关键词：支持按模板名称、服务名称、客户名称搜索
  const search = (params.get("search") || params.get("q") || "").trim();
  
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
  
  // 搜索功能：支持按模板名称、服务名称、客户名称搜索
  if (search) {
    query += ` AND (tt.template_name LIKE ? OR s.service_name LIKE ? OR c.company_name LIKE ?)`;
    const searchPattern = `%${search}%`;
    binds.push(searchPattern, searchPattern, searchPattern);
  }
  
  // 服务ID筛选
  if (serviceId) {
    // 如果 serviceId 是臨時ID（以 temp_ 開頭），則跳過此篩選
    if (String(serviceId).startsWith('temp_')) {
      console.warn('[Task Templates] 跳過臨時ID的服務篩選:', serviceId);
      // 不添加服務ID篩選條件，返回所有模板
    } else {
      const parsedServiceId = parseInt(serviceId, 10);
      if (isNaN(parsedServiceId)) {
        console.warn('[Task Templates] 無效的服務ID，跳過篩選:', serviceId);
        // 不添加服務ID篩選條件
      } else {
        query += ` AND tt.service_id = ?`;
        binds.push(parsedServiceId);
      }
    }
  }
  
  // 客户类型筛选：统一模板或客户专属
  if (clientType === 'unified' || clientType === 'null') {
    query += ` AND tt.client_id IS NULL`;
  } else if (clientType === 'specific' || clientType === 'client-specific') {
    query += ` AND tt.client_id IS NOT NULL`;
  }
  
  // 特定客户ID筛选（如果指定了 client_type，此筛选会被忽略，因为 client_type 优先级更高）
  if (clientId && !clientType) {
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
  let templateStagesUpdated = false;
  if (Array.isArray(tasks)) {
    console.log(`[Task Template] Updating ${tasks.length} tasks for template ${templateId}`);
    templateStagesUpdated = true;
    
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
  
  // 同步到使用該模板的服務配置
  // 只有在模板階段被更新時才進行同步（如果只更新基本信息，不影響任務配置）
  if (templateStagesUpdated) {
    try {
      await synchronizeTemplateToServices(env, templateId, requestId);
    } catch (syncError) {
      // 記錄錯誤但不阻止模板更新
      console.error(`[Task Template] 同步到服務配置失敗 (模板 ${templateId}):`, syncError);
      // 可以選擇返回警告，但為了不影響模板更新，我們只記錄錯誤
    }
  }
  
  return successResponse({ template_id: templateId }, "已更新", requestId);
}

/**
 * 同步模板到使用該模板的服務配置
 * 當模板更新時，自動更新所有使用該模板的服務的任務配置
 */
async function synchronizeTemplateToServices(env, templateId, requestId) {
  try {
    console.log(`[Task Template] 開始同步模板 ${templateId} 到服務配置...`);
    
    // 1. 獲取模板的最新階段配置
    const templateStages = await env.DATABASE.prepare(
      `SELECT stage_name, stage_order, description, estimated_hours, execution_frequency, execution_months
       FROM TaskTemplateStages
       WHERE template_id = ?
       ORDER BY stage_order ASC`
    ).bind(templateId).all();
    
    if (!templateStages || !templateStages.results || templateStages.results.length === 0) {
      console.log(`[Task Template] 模板 ${templateId} 沒有階段配置，跳過同步`);
      return;
    }
    
    // 2. 獲取模板的默認配置
    const template = await env.DATABASE.prepare(
      `SELECT default_due_date_rule, default_due_date_value, default_due_date_offset_days, default_advance_days
       FROM TaskTemplates
       WHERE template_id = ?`
    ).bind(templateId).first();
    
    const defaultDueDateRule = template?.default_due_date_rule || 'end_of_month';
    const defaultDueDateValue = template?.default_due_date_value || null;
    const defaultAdvanceDays = template?.default_advance_days || 7;
    
    // 3. 查找所有使用該模板的服務
    const clientServices = await env.DATABASE.prepare(
      `SELECT cs.client_service_id, cs.client_id, cs.service_id
       FROM ClientServices cs
       WHERE cs.task_template_id = ? AND cs.is_deleted = 0`
    ).bind(templateId).all();
    
    if (!clientServices || !clientServices.results || clientServices.results.length === 0) {
      console.log(`[Task Template] 沒有服務使用模板 ${templateId}，跳過同步`);
      return;
    }
    
    console.log(`[Task Template] 找到 ${clientServices.results.length} 個使用模板 ${templateId} 的服務`);
    
    // 4. 為每個服務更新任務配置
    const syncResults = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (const clientService of clientServices.results) {
      try {
        const clientServiceId = clientService.client_service_id;
        const clientId = clientService.client_id;
        
        console.log(`[Task Template] 同步服務 ${clientServiceId} (客戶 ${clientId})...`);
        
        // 獲取服務的執行月份配置（從服務層級繼承）
        const serviceInfo = await env.DATABASE.prepare(
          `SELECT execution_months FROM ClientServices WHERE client_service_id = ?`
        ).bind(clientServiceId).first();
        
        const serviceExecutionMonths = serviceInfo?.execution_months 
          ? (typeof serviceInfo.execution_months === 'string' 
            ? JSON.parse(serviceInfo.execution_months) 
            : serviceInfo.execution_months)
          : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        
        // 刪除現有的任務配置
        await env.DATABASE.prepare(
          `DELETE FROM ClientServiceTaskConfigs WHERE client_service_id = ?`
        ).bind(clientServiceId).run();
        
        // 插入新的任務配置（基於模板階段）
        const configIds = [];
        for (const stage of templateStages.results) {
          const taskName = stage.stage_name || '';
          if (!taskName) {
            continue;
          }
          
          const result = await env.DATABASE.prepare(
            `INSERT INTO ClientServiceTaskConfigs 
             (client_service_id, task_name, task_description, assignee_user_id,
              estimated_hours, advance_days, due_rule, due_value, days_due, stage_order,
              execution_frequency, execution_months, auto_generate, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            clientServiceId,
            taskName,
            stage.description || null,
            null, // assignee_user_id 保持為 null，由用戶後續設置
            stage.estimated_hours || null,
            defaultAdvanceDays,
            defaultDueDateRule,
            defaultDueDateValue,
            null, // days_due 使用默認值
            stage.stage_order || 0,
            stage.execution_frequency || 'monthly',
            JSON.stringify(serviceExecutionMonths), // 使用服務層級的執行月份
            1, // auto_generate 默認為 1
            null // notes 保持為 null
          ).run();
          
          const configId = result.meta?.last_row_id;
          configIds.push(configId);
        }
        
        // 清除相關緩存
        await Promise.all([
          deleteKVCacheByPrefix(env, 'clients_list'),
          deleteKVCacheByPrefix(env, `client_detail:clientId=${clientId}`),
          invalidateD1CacheByType(env, 'clients_list'),
          invalidateD1CacheByType(env, 'client_detail')
        ]).catch(() => {});
        
        console.log(`[Task Template] 服務 ${clientServiceId} 同步成功，更新了 ${configIds.length} 個任務配置`);
        syncResults.success++;
      } catch (serviceError) {
        console.error(`[Task Template] 同步服務 ${clientService.client_service_id} 失敗:`, serviceError);
        syncResults.failed++;
        syncResults.errors.push({
          client_service_id: clientService.client_service_id,
          error: serviceError.message || '未知錯誤'
        });
      }
    }
    
    console.log(`[Task Template] 模板 ${templateId} 同步完成: 成功 ${syncResults.success}，失敗 ${syncResults.failed}`);
    
    if (syncResults.failed > 0) {
      console.warn(`[Task Template] 部分服務同步失敗:`, syncResults.errors);
    }
  } catch (error) {
    console.error(`[Task Template] 同步模板 ${templateId} 到服務配置時發生錯誤:`, error);
    throw error; // 重新拋出錯誤，讓調用者決定如何處理
  }
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
    `SELECT template_id, template_name FROM TaskTemplates WHERE template_id = ?`
  ).bind(templateId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "模板不存在", null, requestId);
  }
  
  // 检查模板是否被使用
  const usedServices = await env.DATABASE.prepare(
    `SELECT cs.client_service_id, cs.client_id, cs.service_id,
            c.company_name as client_name,
            s.service_name
     FROM ClientServices cs
     LEFT JOIN Clients c ON c.client_id = cs.client_id
     LEFT JOIN Services s ON s.service_id = cs.service_id
     WHERE cs.task_template_id = ? AND cs.is_deleted = 0
     ORDER BY c.company_name ASC, s.service_name ASC`
  ).bind(templateId).all();
  
  // 如果模板被使用，返回错误并列出使用该模板的服务
  if (usedServices && usedServices.results && usedServices.results.length > 0) {
    const serviceList = usedServices.results.map(service => ({
      client_service_id: service.client_service_id,
      client_id: service.client_id,
      client_name: service.client_name || '未知客戶',
      service_id: service.service_id,
      service_name: service.service_name || '未知服務'
    }));
    
    const serviceCount = serviceList.length;
    const serviceNames = serviceList.map(s => 
      `${s.client_name} - ${s.service_name}`
    ).join('、');
    
    return errorResponse(
      409, 
      "TEMPLATE_IN_USE", 
      `無法刪除模板「${existing.template_name}」，因為有 ${serviceCount} 個服務正在使用此模板`,
      {
        template_id: templateId,
        template_name: existing.template_name,
        used_by_count: serviceCount,
        used_by_services: serviceList,
        message: `以下服務正在使用此模板：${serviceNames}`
      },
      requestId
    );
  }
  
  // 模板未被使用，執行刪除操作
  try {
    // 软删除：先删除阶段，再删除模板
    await env.DATABASE.prepare(
      `DELETE FROM TaskTemplateStages WHERE template_id = ?`
    ).bind(templateId).run();
    
    await env.DATABASE.prepare(
      `DELETE FROM TaskTemplates WHERE template_id = ?`
    ).bind(templateId).run();
    
    console.log(`[Task Template] 模板 ${templateId} 已刪除`);
    
    return successResponse({ template_id: templateId }, "已刪除", requestId);
  } catch (deleteError) {
    console.error(`[Task Template] 刪除模板 ${templateId} 失敗:`, deleteError);
    return errorResponse(
      500, 
      "DELETE_ERROR", 
      "刪除模板時發生錯誤", 
      { error: deleteError.message },
      requestId
    );
  }
}

