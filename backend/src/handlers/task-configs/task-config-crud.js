/**
 * 任務配置 CRUD
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";

/**
 * 獲取客戶服務的任務配置列表
 */
export async function handleGetTaskConfigs(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const clientServiceId = parseInt(match[2]);  // 使用 client_service_id 而非 service_id
  
  // 驗證客戶服務是否存在
  const clientService = await env.DATABASE.prepare(
    `SELECT client_service_id FROM ClientServices 
     WHERE client_service_id = ? AND client_id = ? AND is_deleted = 0 LIMIT 1`
  ).bind(clientServiceId, clientId).first();
  
  if (!clientService) {
    return errorResponse(404, "NOT_FOUND", "客戶服務不存在", null, requestId);
  }
  
  // 獲取任務配置列表
  const configs = await env.DATABASE.prepare(
    `SELECT config_id, task_name, task_description, assignee_user_id,
            estimated_hours, advance_days, due_rule, due_value, stage_order,
            execution_frequency, execution_months, auto_generate, notes
     FROM ClientServiceTaskConfigs
     WHERE client_service_id = ? AND is_deleted = 0
     ORDER BY stage_order ASC, config_id ASC`
  ).bind(clientService.client_service_id).all();
  
  // 獲取每個配置的 SOP
  const data = await Promise.all((configs.results || []).map(async (config) => {
    const sops = await env.DATABASE.prepare(
      `SELECT s.sop_id, s.title, s.category, s.scope
       FROM TaskConfigSOPs tcs
       JOIN SOPDocuments s ON tcs.sop_id = s.sop_id
       WHERE tcs.config_id = ?
       ORDER BY tcs.sort_order ASC`
    ).bind(config.config_id).all();
    
    const execution_months = config.execution_months 
      ? (typeof config.execution_months === 'string' 
        ? JSON.parse(config.execution_months) 
        : config.execution_months)
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // 預設每月
    
    return {
      config_id: config.config_id,
      task_name: config.task_name,
      task_description: config.task_description,
      assignee_user_id: config.assignee_user_id,
      estimated_hours: config.estimated_hours,
      advance_days: config.advance_days || 7,
      due_rule: config.due_rule || 'end_of_month',
      due_value: config.due_value,
      stage_order: config.stage_order || 0,
      execution_frequency: config.execution_frequency || 'monthly',
      execution_months: execution_months,
      auto_generate: config.auto_generate === 1,
      notes: config.notes,
      sops: sops.results || []
    };
  }));
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 創建任務配置
 */
export async function handleCreateTaskConfig(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const clientServiceId = parseInt(match[2]);  // 使用 client_service_id 而非 service_id
  const user = ctx?.user;
  
  const body = await request.json();
  const {
    task_name,
    task_description,
    assignee_user_id,
    estimated_hours,
    advance_days,
    due_rule,
    due_value,
    stage_order,
    execution_frequency,
    execution_months,
    auto_generate,
    notes,
    sop_ids
  } = body;
  
  if (!task_name) {
    return errorResponse(422, "VALIDATION_ERROR", "任務名稱為必填", null, requestId);
  }
  
  // 驗證客戶服務是否存在並獲取客戶負責人信息
  const clientService = await env.DATABASE.prepare(
    `SELECT cs.client_service_id, c.assignee_user_id
     FROM ClientServices cs
     LEFT JOIN Clients c ON c.client_id = cs.client_id
     WHERE cs.client_service_id = ? AND cs.client_id = ? AND cs.is_deleted = 0 AND c.is_deleted = 0
     LIMIT 1`
  ).bind(clientServiceId, clientId).first();
  
  if (!clientService) {
    return errorResponse(404, "NOT_FOUND", "客戶服務不存在", null, requestId);
  }
  
  // 權限檢查：只有管理員或客戶負責人可以創建任務配置
  if (!user.is_admin && clientService.assignee_user_id !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "無權限為此客戶服務新增任務配置", null, requestId);
  }
  
  // 創建任務配置
  const result = await env.DATABASE.prepare(
    `INSERT INTO ClientServiceTaskConfigs 
     (client_service_id, task_name, task_description, assignee_user_id,
      estimated_hours, advance_days, due_rule, due_value, stage_order,
      execution_frequency, execution_months, auto_generate, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    clientService.client_service_id,
    task_name,
    task_description || null,
    assignee_user_id || null,
    estimated_hours || null,
    advance_days || 7,
    due_rule || 'end_of_month',
    due_value || null,
    stage_order || 0,
    execution_frequency || 'monthly',
    execution_months ? JSON.stringify(execution_months) : null,
    auto_generate !== false ? 1 : 0,
    notes || null
  ).run();
  
  const configId = result.meta?.last_row_id;
  
  // 保存 SOP 關聯
  if (sop_ids && Array.isArray(sop_ids) && sop_ids.length > 0) {
    for (let i = 0; i < sop_ids.length; i++) {
      await env.DATABASE.prepare(
        `INSERT INTO TaskConfigSOPs (config_id, sop_id, sort_order) VALUES (?, ?, ?)`
      ).bind(configId, sop_ids[i], i).run();
    }
  }
  
  return successResponse({ config_id: configId }, "任務配置已創建", requestId);
}

/**
 * 更新任務配置
 */
export async function handleUpdateTaskConfig(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const clientServiceId = parseInt(match[2]);  // 使用 client_service_id 而非 service_id
  const configId = parseInt(match[3]);
  const user = ctx?.user;
  
  const body = await request.json();
  const {
    task_name,
    task_description,
    assignee_user_id,
    estimated_hours,
    advance_days,
    due_rule,
    due_value,
    stage_order,
    execution_frequency,
    execution_months,
    auto_generate,
    notes,
    sop_ids
  } = body;
  
  // 檢查配置是否存在並獲取客戶負責人信息
  const existing = await env.DATABASE.prepare(
    `SELECT tc.config_id, tc.client_service_id, c.assignee_user_id
     FROM ClientServiceTaskConfigs tc
     JOIN ClientServices cs ON tc.client_service_id = cs.client_service_id
     LEFT JOIN Clients c ON c.client_id = cs.client_id
     WHERE tc.config_id = ? AND cs.client_id = ? AND cs.client_service_id = ? AND tc.is_deleted = 0 AND c.is_deleted = 0`
  ).bind(configId, clientId, clientServiceId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "任務配置不存在", null, requestId);
  }
  
  // 權限檢查：只有管理員或客戶負責人可以更新任務配置
  if (!user.is_admin && existing.assignee_user_id !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "無權限修改此任務配置", null, requestId);
  }
  
  // 更新任務配置
  await env.DATABASE.prepare(
    `UPDATE ClientServiceTaskConfigs
     SET task_name = ?, task_description = ?, assignee_user_id = ?,
         estimated_hours = ?, advance_days = ?, due_rule = ?, due_value = ?,
         stage_order = ?, execution_frequency = ?, execution_months = ?,
         auto_generate = ?, notes = ?, updated_at = datetime('now')
     WHERE config_id = ?`
  ).bind(
    task_name,
    task_description || null,
    assignee_user_id || null,
    estimated_hours || null,
    advance_days || 7,
    due_rule || 'end_of_month',
    due_value || null,
    stage_order || 0,
    execution_frequency || 'monthly',
    execution_months ? JSON.stringify(execution_months) : null,
    auto_generate !== false ? 1 : 0,
    notes || null,
    configId
  ).run();
  
  // 更新 SOP 關聯
  if (sop_ids !== undefined) {
    // 刪除舊的關聯
    await env.DATABASE.prepare(
      `DELETE FROM TaskConfigSOPs WHERE config_id = ?`
    ).bind(configId).run();
    
    // 創建新的關聯
    if (Array.isArray(sop_ids) && sop_ids.length > 0) {
      for (let i = 0; i < sop_ids.length; i++) {
        await env.DATABASE.prepare(
          `INSERT INTO TaskConfigSOPs (config_id, sop_id, sort_order) VALUES (?, ?, ?)`
        ).bind(configId, sop_ids[i], i).run();
      }
    }
  }
  
  return successResponse({ config_id: configId }, "任務配置已更新", requestId);
}

/**
 * 刪除任務配置
 */
export async function handleDeleteTaskConfig(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const clientServiceId = parseInt(match[2]);  // 使用 client_service_id 而非 service_id
  const configId = parseInt(match[3]);
  const user = ctx?.user;
  
  // 檢查配置是否存在並獲取客戶負責人信息
  const existing = await env.DATABASE.prepare(
    `SELECT tc.config_id, c.assignee_user_id
     FROM ClientServiceTaskConfigs tc
     JOIN ClientServices cs ON tc.client_service_id = cs.client_service_id
     LEFT JOIN Clients c ON c.client_id = cs.client_id
     WHERE tc.config_id = ? AND cs.client_id = ? AND cs.client_service_id = ? AND tc.is_deleted = 0 AND c.is_deleted = 0`
  ).bind(configId, clientId, clientServiceId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "任務配置不存在", null, requestId);
  }
  
  // 權限檢查：只有管理員或客戶負責人可以刪除任務配置
  if (!user.is_admin && existing.assignee_user_id !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "無權限刪除此任務配置", null, requestId);
  }
  
  // 軟刪除
  await env.DATABASE.prepare(
    `UPDATE ClientServiceTaskConfigs
     SET is_deleted = 1, updated_at = datetime('now')
     WHERE config_id = ?`
  ).bind(configId).run();
  
  return successResponse({ config_id: configId }, "任務配置已刪除", requestId);
}

/**
 * 批量保存任務配置（用於新增/編輯客戶服務時）
 */
export async function handleBatchSaveTaskConfigs(request, env, ctx, requestId, match, url) {
  const clientId = match[1];
  const clientServiceId = parseInt(match[2]);  // 使用 client_service_id 而非 service_id
  const user = ctx?.user;
  
  try {
    // 檢查客戶服務是否存在並獲取客戶負責人信息
    const clientService = await env.DATABASE.prepare(
      `SELECT cs.client_service_id, c.assignee_user_id
       FROM ClientServices cs
       LEFT JOIN Clients c ON c.client_id = cs.client_id
       WHERE cs.client_service_id = ? AND cs.client_id = ? AND cs.is_deleted = 0 AND c.is_deleted = 0
       LIMIT 1`
    ).bind(clientServiceId, clientId).first();
    
    if (!clientService) {
      return errorResponse(404, "NOT_FOUND", "客戶服務不存在", null, requestId);
    }
    
    // 權限檢查：只有管理員或客戶負責人可以批量保存任務配置
    if (!user.is_admin && clientService.assignee_user_id !== user.user_id) {
      return errorResponse(403, "FORBIDDEN", "無權限批量保存此客戶服務的任務配置", null, requestId);
    }
    
    const body = await request.json();
    const { tasks, service_sops } = body;
    
    if (!Array.isArray(tasks)) {
      return errorResponse(422, "VALIDATION_ERROR", "tasks 必須為陣列", null, requestId);
    }
    
    console.log('[BatchSaveTaskConfigs] 開始刪除現有配置...');
    
    // 刪除現有的任務配置
    await env.DATABASE.prepare(
      `DELETE FROM ClientServiceTaskConfigs WHERE client_service_id = ?`
    ).bind(clientServiceId).run();
    
    console.log('[BatchSaveTaskConfigs] 開始創建新任務配置...', { tasksCount: tasks.length });
    
    // 創建新的任務配置
    const configIds = [];
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      console.log(`[BatchSaveTaskConfigs] 處理任務 ${i}:`, { 
        name: task.name || task.task_name,
        execution_months: task.execution_months
      });
      
      const taskName = task.name || task.task_name;
      if (!taskName || taskName.trim() === '') {
        return errorResponse(422, "VALIDATION_ERROR", `第 ${i + 1} 個任務的名稱不能為空`, null, requestId);
      }
      
      const result = await env.DATABASE.prepare(
        `INSERT INTO ClientServiceTaskConfigs 
         (client_service_id, task_name, task_description, assignee_user_id,
          estimated_hours, advance_days, due_rule, due_value, stage_order,
          execution_frequency, execution_months, auto_generate, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        clientServiceId,
        taskName,
        task.description || task.task_description || null,
        task.assignee_user_id || null,
        task.estimated_hours || null,
        task.advance_days || 7,
        task.due_rule || 'end_of_month',
        task.due_value || null,
        task.stage_order || i,
        task.execution_frequency || 'monthly',
        task.execution_months ? JSON.stringify(task.execution_months) : null,
        task.auto_generate !== false ? 1 : 0,
        task.notes || null
      ).run();
      
      const configId = result.meta?.last_row_id;
      configIds.push(configId);
      
      // 保存任務 SOP
      if (task.sop_ids && Array.isArray(task.sop_ids)) {
        console.log(`[BatchSaveTaskConfigs] 為任務 ${i} 添加 ${task.sop_ids.length} 個 SOP`);
        for (let j = 0; j < task.sop_ids.length; j++) {
          await env.DATABASE.prepare(
            `INSERT INTO TaskConfigSOPs (config_id, sop_id, sort_order) VALUES (?, ?, ?)`
          ).bind(configId, task.sop_ids[j], j).run();
        }
      }
    }
    
    console.log('[BatchSaveTaskConfigs] 任務配置創建完成', { configIdsCount: configIds.length });
    
    // 保存服務層級 SOP
    if (service_sops && Array.isArray(service_sops)) {
      console.log('[BatchSaveTaskConfigs] 處理服務層級 SOP...', { count: service_sops.length });
      // 刪除舊的
      await env.DATABASE.prepare(
        `DELETE FROM ClientServiceSOPs WHERE client_service_id = ?`
      ).bind(clientServiceId).run();
      
      // 創建新的
      for (let i = 0; i < service_sops.length; i++) {
        const sopId = typeof service_sops[i] === 'object' ? service_sops[i].sop_id : service_sops[i];
        console.log(`[BatchSaveTaskConfigs] 添加服務 SOP ${i}:`, sopId);
        await env.DATABASE.prepare(
          `INSERT INTO ClientServiceSOPs (client_service_id, sop_id, sort_order) VALUES (?, ?, ?)`
        ).bind(clientServiceId, sopId, i).run();
      }
    }
    
    // 清除相關緩存（客戶詳情，確保 task_configs_count 被更新）
    await Promise.all([
      deleteKVCacheByPrefix(env, 'clients_list'),
      deleteKVCacheByPrefix(env, `client_detail:clientId=${clientId}`),
      invalidateD1CacheByType(env, 'clients_list'),
      invalidateD1CacheByType(env, 'client_detail')
    ]).catch(() => {});
    
    return successResponse({ config_ids: configIds }, "任務配置已保存", requestId);
  } catch (err) {
    console.error('[BatchSaveTaskConfigs] 最終錯誤:', err);
    return errorResponse(500, "INTERNAL_ERROR", "保存任務配置時發生錯誤", { error: err.message, stack: err.stack }, requestId);
  }
}

