/**
 * 任務模板階段管理 Handler
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";

/**
 * 獲取任務模板階段列表
 * GET /api/v2/settings/task-templates/:id/stages
 */
export async function handleGetStages(request, env, ctx, requestId, match, url) {
  let finalTemplateId = null; // 在函數頂部定義，確保在 catch 塊中可用
  
  try {
    const user = ctx?.user;
    
    // 驗證用戶身份
    if (!user || !user.user_id) {
      return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
    }
    
    // 僅管理員可查看階段列表
    if (!user.is_admin) {
      return errorResponse(403, "FORBIDDEN", "僅管理員可查看階段列表", null, requestId);
    }
    
    // 從 URL 路徑中獲取模板 ID（優先使用 match 參數，因為路由已經匹配）
    let templateId = null;
    if (match && match[1]) {
      templateId = parseInt(match[1], 10);
      console.log('[Task Template Stages] 從 match 獲取 templateId:', templateId, 'match:', match);
    } else {
      // 如果 match 沒有提供，從 URL 路徑中提取
      const templateIdMatch = url.pathname.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages$/);
      templateId = templateIdMatch ? parseInt(templateIdMatch[1], 10) : null;
      console.log('[Task Template Stages] 從 URL 路徑提取 templateId:', templateId, 'pathname:', url.pathname);
    }
    
    // 如果路徑中沒有模板 ID，嘗試從查詢參數獲取（支持可選的查詢參數過濾）
    const templateIdFromQuery = url.searchParams.get("template_id");
    finalTemplateId = templateId || (templateIdFromQuery ? parseInt(templateIdFromQuery, 10) : null);
    
    console.log('[Task Template Stages] finalTemplateId:', finalTemplateId, 'templateId:', templateId, 'templateIdFromQuery:', templateIdFromQuery);
    
    if (!finalTemplateId || finalTemplateId <= 0 || isNaN(finalTemplateId)) {
      console.error('[Task Template Stages] 無效的模板ID:', finalTemplateId);
      return errorResponse(400, "INVALID_ID", `模板ID無效: ${finalTemplateId}`, null, requestId);
    }
    
    // 檢查模板是否存在
    const template = await env.DATABASE.prepare(
      `SELECT template_id, template_name FROM TaskTemplates WHERE template_id = ?`
    ).bind(finalTemplateId).first();
    
    if (!template) {
      return errorResponse(404, "NOT_FOUND", "模板不存在", null, requestId);
    }
    
    // 查詢階段列表
    const stagesRows = await env.DATABASE.prepare(
      `SELECT stage_id, template_id, stage_name, stage_order, description, estimated_hours,
              execution_frequency, execution_months, created_at
       FROM TaskTemplateStages
       WHERE template_id = ?
       ORDER BY stage_order ASC, stage_id ASC`
    ).bind(finalTemplateId).all();
    
    // 轉換數據格式
    const stages = (stagesRows?.results || []).map(s => {
      let executionMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // 默認值
      
      if (s.execution_months) {
        if (typeof s.execution_months === 'string') {
          try {
            executionMonths = JSON.parse(s.execution_months);
            // 確保解析結果是數組
            if (!Array.isArray(executionMonths)) {
              console.warn('[Task Template Stages] execution_months 不是數組，使用默認值:', s.execution_months);
              executionMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            }
          } catch (parseError) {
            console.warn('[Task Template Stages] 解析 execution_months 失敗，使用默認值:', s.execution_months, parseError);
            executionMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
          }
        } else if (Array.isArray(s.execution_months)) {
          executionMonths = s.execution_months;
        }
      }
      
      return {
        stage_id: s.stage_id,
        template_id: s.template_id,
        stage_name: s.stage_name || "",
        stage_order: s.stage_order || 0,
        description: s.description || "",
        estimated_hours: s.estimated_hours ? Number(s.estimated_hours) : null,
        execution_frequency: s.execution_frequency || 'monthly',
        execution_months: executionMonths,
        created_at: s.created_at || null,
        updated_at: s.updated_at || s.created_at || null // 如果沒有 updated_at，使用 created_at
      };
    });
    
    return successResponse(stages, "查詢成功", requestId);
  } catch (error) {
    console.error(`[Task Template Stages] 查詢階段列表失敗 (模板 ${finalTemplateId || 'unknown'}):`, error);
    console.error('[Task Template Stages] 錯誤堆疊:', error.stack);
    console.error('[Task Template Stages] 錯誤詳情:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      url: url?.pathname,
      match: match
    });
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      `查詢階段列表時發生錯誤: ${error.message}`,
      { error: error.message, stack: error.stack },
      requestId
    );
  }
}

/**
 * 批量更新階段名稱和順序
 * PUT /api/v2/settings/task-templates/:id/stages/batch
 */
export async function handleUpdateStageNames(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 驗證用戶身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  // 僅管理員可更新階段
  if (!user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "僅管理員可更新階段", null, requestId);
  }
  
  // 從 URL 路徑中獲取模板 ID
  let templateId = null;
  if (match && match[1]) {
    templateId = parseInt(match[1], 10);
  } else {
    const templateIdMatch = url.pathname.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages\/batch$/);
    templateId = templateIdMatch ? parseInt(templateIdMatch[1], 10) : null;
  }
  
  if (!templateId || templateId <= 0) {
    return errorResponse(400, "INVALID_ID", "模板ID無效", null, requestId);
  }
  
  // 解析請求體
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const stages = body?.stages;
  
  // 驗證輸入數據
  if (!Array.isArray(stages) || stages.length === 0) {
    return errorResponse(422, "VALIDATION_ERROR", "stages 必須為非空陣列", null, requestId);
  }
  
  // 驗證每個階段的數據
  const validationErrors = [];
  const stageIds = new Set();
  const stageOrders = new Set();
  
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    
    // 驗證必要字段
    if (!stage.stage_id || !Number.isInteger(Number(stage.stage_id))) {
      validationErrors.push(`第 ${i + 1} 個階段缺少有效的 stage_id`);
      continue;
    }
    
    const stageId = Number(stage.stage_id);
    
    // 檢查重複的 stage_id
    if (stageIds.has(stageId)) {
      validationErrors.push(`階段 ID ${stageId} 重複`);
      continue;
    }
    stageIds.add(stageId);
    
    // 驗證 stage_name
    if (stage.stage_name !== undefined && stage.stage_name !== null) {
      const stageName = String(stage.stage_name).trim();
      if (stageName === '') {
        validationErrors.push(`階段 ID ${stageId} 的名稱不能為空`);
      }
    }
    
    // 驗證 stage_order
    if (stage.stage_order !== undefined && stage.stage_order !== null) {
      const stageOrder = Number(stage.stage_order);
      if (!Number.isInteger(stageOrder) || stageOrder < 0) {
        validationErrors.push(`階段 ID ${stageId} 的順序必須為非負整數`);
      } else {
        // 檢查重複的 stage_order（允許，但會警告）
        if (stageOrders.has(stageOrder)) {
          console.warn(`[Task Template Stages] 階段順序 ${stageOrder} 重複`);
        }
        stageOrders.add(stageOrder);
      }
    }
  }
  
  if (validationErrors.length > 0) {
    return errorResponse(
      422,
      "VALIDATION_ERROR",
      "輸入數據驗證失敗",
      { errors: validationErrors },
      requestId
    );
  }
  
  try {
    // 檢查模板是否存在
    const template = await env.DATABASE.prepare(
      `SELECT template_id, template_name FROM TaskTemplates WHERE template_id = ?`
    ).bind(templateId).first();
    
    if (!template) {
      return errorResponse(404, "NOT_FOUND", "模板不存在", null, requestId);
    }
    
    // 驗證所有階段都屬於該模板
    const stageIdsArray = Array.from(stageIds);
    const existingStages = await env.DATABASE.prepare(
      `SELECT stage_id, template_id, stage_name, stage_order 
       FROM TaskTemplateStages 
       WHERE stage_id IN (${stageIdsArray.map(() => '?').join(',')})`
    ).bind(...stageIdsArray).all();
    
    if (!existingStages || !existingStages.results || existingStages.results.length !== stageIdsArray.length) {
      return errorResponse(
        404,
        "NOT_FOUND",
        "部分階段不存在",
        null,
        requestId
      );
    }
    
    // 檢查所有階段是否都屬於該模板
    const invalidStages = existingStages.results.filter(s => Number(s.template_id) !== templateId);
    if (invalidStages.length > 0) {
      return errorResponse(
        403,
        "FORBIDDEN",
        `部分階段不屬於模板 ${templateId}`,
        { invalid_stage_ids: invalidStages.map(s => s.stage_id) },
        requestId
      );
    }
    
    // 準備批量更新語句（使用 batch 確保原子性）
    const updateStatements = [];
    const updatedStages = [];
    
    for (const stage of stages) {
      const stageId = Number(stage.stage_id);
      const updates = [];
      const binds = [];
      
      // 構建更新字段
      if (stage.stage_name !== undefined && stage.stage_name !== null) {
        updates.push("stage_name = ?");
        binds.push(String(stage.stage_name).trim());
      }
      
      if (stage.stage_order !== undefined && stage.stage_order !== null) {
        updates.push("stage_order = ?");
        binds.push(Number(stage.stage_order));
      }
      
      // 如果沒有需要更新的字段，跳過
      if (updates.length === 0) {
        continue;
      }
      
      // 添加 updated_at
      updates.push("updated_at = datetime('now')");
      
      // 添加 WHERE 條件
      binds.push(stageId);
      binds.push(templateId);
      
      // 創建更新語句
      const updateQuery = `UPDATE TaskTemplateStages 
                           SET ${updates.join(', ')} 
                           WHERE stage_id = ? AND template_id = ?`;
      
      updateStatements.push(
        env.DATABASE.prepare(updateQuery).bind(...binds)
      );
      
      updatedStages.push({
        stage_id: stageId,
        stage_name: stage.stage_name !== undefined ? String(stage.stage_name).trim() : undefined,
        stage_order: stage.stage_order !== undefined ? Number(stage.stage_order) : undefined
      });
    }
    
    // 如果沒有需要更新的語句，返回成功
    if (updateStatements.length === 0) {
      return successResponse(
        { updated_count: 0, stages: [] },
        "沒有需要更新的階段",
        requestId
      );
    }
    
    // 使用 batch 執行批量更新（確保原子性）
    try {
      await env.DATABASE.batch(updateStatements);
      console.log(`[Task Template Stages] 批量更新階段成功 (模板 ${templateId}): ${updateStatements.length} 個階段`);
    } catch (batchError) {
      console.error(`[Task Template Stages] 批量更新階段失敗 (模板 ${templateId}):`, batchError);
      return errorResponse(
        500,
        "BATCH_UPDATE_ERROR",
        "批量更新階段時發生錯誤",
        { error: batchError.message },
        requestId
      );
    }
    
    // 清除相關緩存
    await Promise.all([
      deleteKVCacheByPrefix(env, 'task_templates'),
      deleteKVCacheByPrefix(env, `task_template:${templateId}`),
      invalidateD1CacheByType(env, 'task_templates')
    ]).catch(() => {});
    
    return successResponse(
      {
        template_id: templateId,
        updated_count: updatedStages.length,
        stages: updatedStages
      },
      `已更新 ${updatedStages.length} 個階段`,
      requestId
    );
  } catch (error) {
    console.error(`[Task Template Stages] 更新階段失敗 (模板 ${templateId}):`, error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "更新階段時發生錯誤",
      { error: error.message },
      requestId
    );
  }
}

/**
 * 同步階段變更到使用該模板的服務配置
 * POST /api/v2/settings/task-templates/:id/stages/sync
 */
export async function handleSyncStages(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 驗證用戶身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  // 僅管理員可執行同步
  if (!user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "僅管理員可執行階段同步", null, requestId);
  }
  
  // 從 URL 路徑中獲取模板 ID
  let templateId = null;
  if (match && match[1]) {
    templateId = parseInt(match[1], 10);
  } else {
    const templateIdMatch = url.pathname.match(/^\/api\/v2\/settings\/task-templates\/(\d+)\/stages\/sync$/);
    templateId = templateIdMatch ? parseInt(templateIdMatch[1], 10) : null;
  }
  
  if (!templateId || templateId <= 0) {
    return errorResponse(400, "INVALID_ID", "模板ID無效", null, requestId);
  }
  
  // 解析請求體
  let body;
  try {
    body = await request.json();
  } catch (error) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const confirmSync = body?.confirm === true; // 同步確認標誌
  
  try {
    // 檢查模板是否存在
    const template = await env.DATABASE.prepare(
      `SELECT template_id, template_name FROM TaskTemplates WHERE template_id = ?`
    ).bind(templateId).first();
    
    if (!template) {
      return errorResponse(404, "NOT_FOUND", "模板不存在", null, requestId);
    }
    
    // 獲取模板的最新階段配置
    const templateStages = await env.DATABASE.prepare(
      `SELECT stage_id, stage_name, stage_order, description, estimated_hours, execution_frequency, execution_months
       FROM TaskTemplateStages
       WHERE template_id = ?
       ORDER BY stage_order ASC`
    ).bind(templateId).all();
    
    if (!templateStages || !templateStages.results || templateStages.results.length === 0) {
      return errorResponse(
        422,
        "VALIDATION_ERROR",
        "模板沒有階段配置，無法同步",
        null,
        requestId
      );
    }
    
    // 查找所有使用該模板的服務
    const clientServices = await env.DATABASE.prepare(
      `SELECT cs.client_service_id, cs.client_id, cs.service_id,
              c.company_name as client_name,
              s.service_name
       FROM ClientServices cs
       LEFT JOIN Clients c ON c.client_id = cs.client_id
       LEFT JOIN Services s ON s.service_id = cs.service_id
       WHERE cs.task_template_id = ? AND cs.is_deleted = 0 AND c.is_deleted = 0
       ORDER BY c.company_name ASC, s.service_name ASC`
    ).bind(templateId).all();
    
    if (!clientServices || !clientServices.results || clientServices.results.length === 0) {
      return successResponse(
        {
          template_id: templateId,
          template_name: template.template_name,
          affected_services_count: 0,
          synced_count: 0,
          failed_count: 0
        },
        "沒有服務使用此模板，無需同步",
        requestId
      );
    }
    
    const affectedServices = clientServices.results.map(cs => ({
      client_service_id: cs.client_service_id,
      client_id: cs.client_id,
      client_name: cs.client_name || '未知客戶',
      service_id: cs.service_id,
      service_name: cs.service_name || '未知服務'
    }));
    
    // 如果未確認，返回需要確認的響應
    if (!confirmSync) {
      return errorResponse(
        428, // 428 Precondition Required
        "SYNC_CONFIRMATION_REQUIRED",
        "需要確認階段同步",
        {
          requires_confirmation: true,
          template_id: templateId,
          template_name: template.template_name,
          affected_services_count: affectedServices.length,
          affected_services: affectedServices,
          stages_count: templateStages.results.length,
          stages: templateStages.results.map(s => ({
            stage_id: s.stage_id,
            stage_name: s.stage_name,
            stage_order: s.stage_order
          })),
          message: `同步將更新 ${affectedServices.length} 個服務的任務配置。此操作將替換這些服務的現有任務配置。請確認是否繼續。`
        },
        requestId
      );
    }
    
    // 已確認，執行同步操作
    console.log(`[Task Template Stages] 開始同步階段到服務配置 (模板 ${templateId})...`);
    
    // 獲取模板的默認配置
    const templateDefaults = await env.DATABASE.prepare(
      `SELECT default_due_date_rule, default_due_date_value, default_due_date_offset_days, default_advance_days
       FROM TaskTemplates
       WHERE template_id = ?`
    ).bind(templateId).first();
    
    const defaultDueDateRule = templateDefaults?.default_due_date_rule || 'end_of_month';
    const defaultDueDateValue = templateDefaults?.default_due_date_value || null;
    const defaultAdvanceDays = templateDefaults?.default_advance_days || 7;
    
    // 同步結果統計
    const syncResults = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    // 為每個服務更新任務配置（使用批量操作確保原子性）
    for (const clientService of clientServices.results) {
      try {
        const clientServiceId = clientService.client_service_id;
        const clientId = clientService.client_id;
        
        console.log(`[Task Template Stages] 同步服務 ${clientServiceId} (客戶 ${clientId})...`);
        
        // 準備批量操作語句（刪除舊配置 + 插入新配置）
        const batchStatements = [];
        
        // 1. 刪除現有的任務配置
        batchStatements.push(
          env.DATABASE.prepare(
            `DELETE FROM ClientServiceTaskConfigs WHERE client_service_id = ?`
          ).bind(clientServiceId)
        );
        
        // 2. 獲取服務的執行月份配置（從服務層級繼承）
        const serviceInfo = await env.DATABASE.prepare(
          `SELECT execution_months FROM ClientServices WHERE client_service_id = ?`
        ).bind(clientServiceId).first();
        
        const serviceExecutionMonths = serviceInfo?.execution_months 
          ? (typeof serviceInfo.execution_months === 'string' 
            ? JSON.parse(serviceInfo.execution_months) 
            : serviceInfo.execution_months)
          : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        
        // 3. 準備插入新配置的語句
        for (const stage of templateStages.results) {
          const taskName = stage.stage_name || '';
          if (!taskName) {
            continue;
          }
          
          batchStatements.push(
            env.DATABASE.prepare(
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
            )
          );
        }
        
        // 使用 batch 執行批量操作（確保原子性）
        await env.DATABASE.batch(batchStatements);
        
        // 清除相關緩存
        await Promise.all([
          deleteKVCacheByPrefix(env, 'clients_list'),
          deleteKVCacheByPrefix(env, `client_detail:clientId=${clientId}`),
          invalidateD1CacheByType(env, 'clients_list'),
          invalidateD1CacheByType(env, 'client_detail')
        ]).catch(() => {});
        
        console.log(`[Task Template Stages] 服務 ${clientServiceId} 同步成功，更新了 ${templateStages.results.length} 個任務配置`);
        syncResults.success++;
      } catch (serviceError) {
        console.error(`[Task Template Stages] 同步服務 ${clientService.client_service_id} 失敗:`, serviceError);
        syncResults.failed++;
        syncResults.errors.push({
          client_service_id: clientService.client_service_id,
          client_name: clientService.client_name || '未知客戶',
          service_name: clientService.service_name || '未知服務',
          error: serviceError.message || '未知錯誤'
        });
      }
    }
    
    console.log(`[Task Template Stages] 模板 ${templateId} 同步完成: 成功 ${syncResults.success}，失敗 ${syncResults.failed}`);
    
    // 構建響應
    if (syncResults.failed === 0) {
      return successResponse(
        {
          template_id: templateId,
          template_name: template.template_name,
          affected_services_count: affectedServices.length,
          synced_count: syncResults.success,
          failed_count: syncResults.failed,
          stages_count: templateStages.results.length
        },
        `同步成功：已更新 ${syncResults.success} 個服務的任務配置`,
        requestId
      );
    } else if (syncResults.success > 0) {
      return successResponse(
        {
          template_id: templateId,
          template_name: template.template_name,
          affected_services_count: affectedServices.length,
          synced_count: syncResults.success,
          failed_count: syncResults.failed,
          errors: syncResults.errors,
          stages_count: templateStages.results.length
        },
        `部分成功：已更新 ${syncResults.success} 個服務，${syncResults.failed} 個服務同步失敗`,
        requestId
      );
    } else {
      return errorResponse(
        500,
        "SYNC_FAILED",
        "同步失敗：所有服務同步都失敗",
        {
          template_id: templateId,
          template_name: template.template_name,
          affected_services_count: affectedServices.length,
          synced_count: syncResults.success,
          failed_count: syncResults.failed,
          errors: syncResults.errors
        },
        requestId
      );
    }
  } catch (error) {
    console.error(`[Task Template Stages] 同步階段失敗 (模板 ${templateId}):`, error);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "同步階段時發生錯誤",
      { error: error.message },
      requestId
    );
  }
}

