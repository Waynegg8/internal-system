/**
 * 任務生成器主入口（重構版）
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateTasksForMonth } from "./generator-new.js";
import { generateTasksForOneTimeService } from "./generator-one-time.js";
import { preAggregateTasks, generateTasksFromQueue } from "./pre-aggregation.js";
import { preAggregateTasksV2, generateTasksFromQueueV2 } from "./pre-aggregation-v2.js";
import { syncTaskGenerationTemplates, generateQueueFromTemplates } from "./pre-aggregation-ultimate.js";

/**
 * 手動觸發任務生成
 */
export async function handleManualTaskGeneration(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 驗證用戶身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  // 僅管理員可以手動觸發任務生成
  if (!user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "僅管理員可以手動觸發任務生成", null, requestId);
  }
  
  try {
    const params = url.searchParams;
    const targetMonth = params.get("target_month"); // 格式：YYYY-MM
    
    let targetYear, targetMonthNum;
    
    if (targetMonth) {
      const [year, month] = targetMonth.split('-');
      targetYear = parseInt(year);
      targetMonthNum = parseInt(month);
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonthNum = now.getMonth() + 1;
    }
    
    // 記錄手動生成開始
    let recordGenerationStart;
    try {
      const monitoring = await import("../../utils/monitoring.js");
      recordGenerationStart = monitoring.recordGenerationStart;
      await recordGenerationStart(env.DATABASE, 'manual', targetYear, targetMonthNum, { triggered_by: user.user_id });
    } catch (err) {
      console.warn("[Task Generator] 監控工具載入失敗:", err);
    }
    
    // 使用終極預聚合方案：基於數據穩定性的徹底重構
    // 核心：第一次完整計算模板，後續月份複用模板，大幅減少工作量
    const monitoringStart = Date.now();
    const monthLabel = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;
    console.log(`[TaskGenerator Ultimate] 使用終極預聚合方案生成任務 for ${monthLabel}`);
    
    const now = new Date();
    
    // 步驟1：同步任務生成模板（只在配置變更時重新計算）
    const syncResult = await syncTaskGenerationTemplates(env, { 
      force: false, // 不強制，只同步變更的配置
      ctx 
    });
    console.log(`[TaskGenerator Ultimate] 模板同步完成：創建 ${syncResult.createdCount} 個，更新 ${syncResult.updatedCount} 個，未變更 ${syncResult.unchangedCount} 個，使用 ${syncResult.queryCount} 次查詢`);
    
    // 步驟2：從模板生成 Queue（極致高效，只需應用模板規則）
    const queueResult = await generateQueueFromTemplates(env, targetYear, targetMonthNum, { 
      now, 
      force: true, 
      ctx 
    });
    console.log(`[TaskGenerator Ultimate] 從模板生成 Queue 完成：${queueResult.queuedCount} 個任務，使用 ${queueResult.queryCount} 次查詢`);
    
    // 步驟3：從 Queue 高效生成任務（無需額外查詢）
    const genResult = await generateTasksFromQueueV2(env, targetYear, targetMonthNum, { 
      now, 
      force: true, 
      ctx 
    });
    console.log(`[TaskGenerator Ultimate] 從 Queue 生成任務完成：${genResult.generatedCount} 個任務，使用 ${genResult.queryCount} 次查詢`);
    
    // 合併結果
    const totalQueryCount = syncResult.queryCount + queueResult.queryCount + genResult.queryCount;
    const result = {
      generatedCount: genResult.generatedCount,
      skippedCount: genResult.skippedCount + (queueResult.queuedCount - genResult.generatedCount),
      errors: 0,
      durationMs: Date.now() - monitoringStart,
      processedServices: genResult.generatedCount,
      totalServices: queueResult.queuedCount,
      remainingServices: queueResult.queuedCount - genResult.generatedCount,
      isComplete: genResult.generatedCount >= queueResult.queuedCount,
      queryCount: totalQueryCount,
      skipReasons: {},
      clientsProcessed: 0,
      clientsWithTasks: 0,
      templateSync: {
        createdCount: syncResult.createdCount,
        updatedCount: syncResult.updatedCount,
        unchangedCount: syncResult.unchangedCount,
        queryCount: syncResult.queryCount,
        version: 'ultimate'
      },
      queueGeneration: {
        queuedCount: queueResult.queuedCount,
        queryCount: queueResult.queryCount,
        version: 'ultimate'
      },
      taskGeneration: {
        generatedCount: genResult.generatedCount,
        queryCount: genResult.queryCount,
        version: 'ultimate'
      },
      totalQueryCount,
      efficiency: {
        queriesPerTask: totalQueryCount > 0 ? (totalQueryCount / Math.max(genResult.generatedCount, 1)).toFixed(2) : 0,
        avgTimePerTask: genResult.generatedCount > 0 ? ((Date.now() - monitoringStart) / genResult.generatedCount).toFixed(2) : 0,
        templateReuse: syncResult.unchangedCount > 0 ? `${((syncResult.unchangedCount / (syncResult.createdCount + syncResult.updatedCount + syncResult.unchangedCount)) * 100).toFixed(1)}%` : '0%'
      }
    };
    
    return successResponse(result, `任務生成完成（終極預聚合方案，總共 ${totalQueryCount} 次查詢，模板複用率 ${result.efficiency.templateReuse}）`, requestId);
    
  } catch (err) {
    console.error(`[Task Generator] Error:`, err);
    console.error(`[Task Generator] Error stack:`, err.stack);
    return errorResponse(500, "INTERNAL_ERROR", `任務生成失敗: ${err.message || String(err)}`, { error: err.message, stack: err.stack }, requestId);
  }
}

/**
 * 任務生成預覽
 * 顯示完整月份的服務情況，包括所有任務的生成時間和到期日
 */
export async function handleTaskGenerationPreview(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  console.log(`[TaskGenerator Preview] 開始處理預覽請求，user:`, user ? { user_id: user.user_id, username: user.username, is_admin: user.is_admin, isAdmin: user.isAdmin } : 'null');
  
  // 僅管理員可以預覽任務生成
  // 強制檢查：無論中間件如何，這裡必須嚴格檢查
  if (!user || !user.user_id) {
    console.warn(`[TaskGenerator Preview] 用戶未登入`);
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  // 嚴格檢查 is_admin 字段 - 使用最簡單直接的檢查
  // 從數據庫返回的 is_admin 應該是 boolean (row.is_admin === 1)
  const isAdmin = user.is_admin === true || user.is_admin === 1;
  
  console.log(`[TaskGenerator Preview] 權限檢查: user_id=${user.user_id}, username=${user.username}, is_admin=${JSON.stringify(user.is_admin)} (${typeof user.is_admin}), 判斷結果=${isAdmin}`);
  
  if (!isAdmin) {
    console.warn(`[TaskGenerator Preview] 非管理員用戶嘗試訪問預覽，返回 403: user_id=${user.user_id}, username=${user.username}, is_admin=${JSON.stringify(user.is_admin)}`);
    return errorResponse(403, "FORBIDDEN", "僅管理員可以預覽任務生成", null, requestId);
  }
  
  console.log(`[TaskGenerator Preview] 用戶 ${user.username} 通過權限檢查，繼續處理`);
  
  try {
    // 導入日期計算工具和輔助函數
    const { calculateGenerationTime, calculateDueDate, formatDate } = await import("../../utils/dateCalculators.js");
    const { default: generatorNew } = await import("./generator-new.js");
    
    // 使用 generator-new.js 中的輔助函數（如果可用的話）
    // 否則在本地實現相同的邏輯
    function parseJsonArray(value) {
      if (!value) return null;
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed : null;
      } catch (err) {
        return null;
      }
    }

    function isConfigEffectiveInMonth(config, targetYear, targetMonth) {
      if (!config.effective_month) return true;
      const [effYear, effMonth] = config.effective_month.split("-").map((n) => parseInt(n, 10));
      if (Number.isNaN(effYear) || Number.isNaN(effMonth)) return true;
      if (targetYear < effYear) return false;
      if (targetYear === effYear && targetMonth < effMonth) return false;
      return true;
    }

    function shouldGenerateInMonth(config, month, serviceContext) {
      const frequency = config.execution_frequency || config.delivery_frequency;
      const serviceMonths = serviceContext ? parseJsonArray(serviceContext.execution_months) : null;
      const executionMonths = parseJsonArray(config.execution_months);

      // 如果指定了具體月份（優先使用）
      if (serviceMonths && Array.isArray(serviceMonths) && serviceMonths.length > 0) {
        return serviceMonths.includes(month);
      }
      if (executionMonths && Array.isArray(executionMonths)) {
        return executionMonths.includes(month);
      }

      // 根據頻率判斷
      switch (frequency) {
        case "monthly":
          return true;
        case "bi-monthly":
          return month % 2 === 1;
        case "quarterly":
          return [1, 4, 7, 10].includes(month);
        case "semi-annual":
          return [1, 7].includes(month);
        case "annual":
        case "yearly":
          return month === 1;
        case "one-time":
          return false;
        default:
          return true;
      }
    }
    
    const params = url.searchParams;
    const targetMonth = params.get("target_month"); // YYYY-MM
    
    let now;
    if (targetMonth) {
      const [year, month] = targetMonth.split('-');
      now = new Date(parseInt(year), parseInt(month) - 1, 1);
    } else {
      now = new Date();
    }
    
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // 獲取所有啟用的客戶服務
    const respectServiceFlag = (env && env.USE_SERVICE_AUTO_FLAG === '0') ? false : true;
    const baseSql =
      `SELECT DISTINCT cs.client_service_id, cs.client_id, cs.service_id, cs.status,
              cs.service_type, cs.execution_months, cs.use_for_auto_generate,
              c.company_name, s.service_name, s.service_code
       FROM ClientServices cs
       JOIN Clients c ON cs.client_id = c.client_id
       JOIN Services s ON cs.service_id = s.service_id
       INNER JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id
       WHERE cs.is_deleted = 0 AND c.is_deleted = 0 AND cs.status = 'active'
         AND tc.is_deleted = 0 AND tc.auto_generate = 1`;
    const querySql = respectServiceFlag
      ? `${baseSql} AND COALESCE(cs.use_for_auto_generate, 1) = 1`
      : baseSql;
    const clientServices = await env.DATABASE.prepare(querySql).all();
    
    // 按客戶服務分組的預覽數據
    const servicesPreview = [];
    
    for (const cs of (clientServices.results || [])) {
      // 服務層控管：一次性或未啟用自動生成則跳過
      if (cs.service_type === 'one-time' || Number(cs.use_for_auto_generate ?? 0) === 0) {
        continue;
      }

      // 獲取該客戶服務的任務配置
      const configs = await env.DATABASE.prepare(
        `SELECT config_id, task_name, task_description, assignee_user_id,
                estimated_hours, advance_days, due_rule, due_value, days_due, stage_order,
                delivery_frequency, delivery_months, auto_generate, notes,
                execution_frequency, execution_months, effective_month,
                generation_time_rule, generation_time_params, is_fixed_deadline
         FROM ClientServiceTaskConfigs
         WHERE client_service_id = ? AND is_deleted = 0 AND auto_generate = 1
         ORDER BY stage_order ASC, config_id ASC`
      )
        .bind(cs.client_service_id)
        .all();

      const configList = (configs.results || []).filter(c => Number(c.auto_generate ?? 1) !== 0);
      if (!configList.length) {
        continue;
      }

      // 以第一階段配置為主（與生成邏輯一致）
      const primaryConfig = configList[0];

      // 判斷生效月份
      if (!isConfigEffectiveInMonth(primaryConfig, currentYear, currentMonth)) {
        continue;
      }

      // 檢查是否應該在這個月份生成（以第一階段為基準，優先服務層設定）
      if (!shouldGenerateInMonth(primaryConfig, currentMonth, cs)) {
        continue;
      }

      // 檢查是否已存在該客戶服務在當月的任務
      const existing = await env.DATABASE.prepare(
        `SELECT task_id FROM ActiveTasks
         WHERE client_service_id = ?
           AND service_year = ?
           AND service_month = ?
           AND is_deleted = 0
         LIMIT 1`
      )
        .bind(cs.client_service_id, currentYear, currentMonth)
        .first();

      // 該服務的所有任務預覽
      const tasksPreview = [];
      
      // 解析生成時間規則參數
      let generationParams = {};
      if (primaryConfig.generation_time_params) {
        try {
          generationParams = typeof primaryConfig.generation_time_params === 'string' 
            ? JSON.parse(primaryConfig.generation_time_params) 
            : primaryConfig.generation_time_params;
        } catch (err) {
          console.warn("[TaskGenerator Preview] 無法解析 generation_time_params", primaryConfig.generation_time_params, err);
        }
      }

      // 計算生成時間
      let generationTime = null;
      let generationTimeStr = null;
      let generationTimeError = null;
      
      try {
        if (primaryConfig.generation_time_rule) {
          generationTime = calculateGenerationTime(
            primaryConfig.generation_time_rule,
            generationParams,
            currentYear,
            currentMonth,
            null,
            null
          );
        } else {
          // 回退到 advance_days 邏輯：需要先計算到期日
          const dueDate = calculateDueDate(primaryConfig, currentYear, currentMonth);
          if (dueDate) {
            const advanceDays = Number.isFinite(primaryConfig.advance_days)
              ? Number(primaryConfig.advance_days)
              : 7;
            generationTime = calculateGenerationTime(
              null,
              {},
              currentYear,
              currentMonth,
              advanceDays,
              dueDate
            );
          }
        }
        
        if (generationTime && !Number.isNaN(generationTime.getTime())) {
          generationTimeStr = formatDate(generationTime);
          // 調試：記錄生成時間計算結果
          if (primaryConfig.generation_time_rule === 'prev_month_last_x_days') {
            console.log(`[TaskGenerator Preview] prev_month_last_x_days: serviceMonth=${currentMonth}, generationTime=${generationTimeStr}, rawDate=${generationTime}`);
          }
        } else {
          generationTimeError = '無法計算生成時間';
        }
      } catch (err) {
        console.warn("[TaskGenerator Preview] 生成時間計算失敗", err);
        generationTimeError = err.message || '計算失敗';
      }

      // 計算到期日
      let dueDate = null;
      let dueDateStr = null;
      let dueDateError = null;
      
      try {
        dueDate = calculateDueDate(primaryConfig, currentYear, currentMonth);
        if (dueDate && !Number.isNaN(dueDate.getTime())) {
          dueDateStr = formatDate(dueDate);
        } else {
          dueDateError = '無法計算到期日';
        }
      } catch (err) {
        console.warn("[TaskGenerator Preview] 到期日計算失敗", err);
        dueDateError = err.message || '計算失敗';
      }

      // 為每個任務配置創建預覽項（顯示所有任務，不只是第一階段）
      // 每個任務使用自己的生成時間規則和到期日規則
      for (const config of configList) {
        // 計算該任務配置的生成時間（使用該任務自己的規則）
        let taskGenerationTime = null;
        let taskGenerationTimeStr = null;
        let taskGenerationTimeError = null;
        let taskGenerationParams = {};
        
        // 解析該任務配置的生成時間規則參數
        if (config.generation_time_params) {
          try {
            taskGenerationParams = typeof config.generation_time_params === 'string' 
              ? JSON.parse(config.generation_time_params) 
              : config.generation_time_params;
          } catch (err) {
            console.warn("[TaskGenerator Preview] 無法解析任務 generation_time_params", config.config_id, config.generation_time_params, err);
          }
        }
        
        try {
          if (config.generation_time_rule) {
            taskGenerationTime = calculateGenerationTime(
              config.generation_time_rule,
              taskGenerationParams,
              currentYear,
              currentMonth,
              null,
              null
            );
          } else {
            // 回退到 advance_days 邏輯
            const taskDueDate = calculateDueDate(config, currentYear, currentMonth);
            if (taskDueDate) {
              const advanceDays = Number.isFinite(config.advance_days)
                ? Number(config.advance_days)
                : 7;
              taskGenerationTime = calculateGenerationTime(
                null,
                {},
                currentYear,
                currentMonth,
                advanceDays,
                taskDueDate
              );
            }
          }
          
          if (taskGenerationTime && !Number.isNaN(taskGenerationTime.getTime())) {
            taskGenerationTimeStr = formatDate(taskGenerationTime);
          } else {
            taskGenerationTimeError = '無法計算生成時間';
          }
        } catch (err) {
          console.warn("[TaskGenerator Preview] 任務生成時間計算失敗", config.config_id, err);
          taskGenerationTimeError = err.message || '計算失敗';
        }
        
        // 計算該任務配置的到期日（可能與第一階段不同）
        let taskDueDate = null;
        let taskDueDateStr = null;
        let taskDueDateError = null;
        
        try {
          taskDueDate = calculateDueDate(config, currentYear, currentMonth);
          if (taskDueDate && !Number.isNaN(taskDueDate.getTime())) {
            taskDueDateStr = formatDate(taskDueDate);
          } else {
            taskDueDateError = '無法計算到期日';
          }
        } catch (err) {
          console.warn("[TaskGenerator Preview] 任務到期日計算失敗", config.config_id, err);
          taskDueDateError = err.message || '計算失敗';
        }

        tasksPreview.push({
          config_id: config.config_id,
          task_name: config.task_name,
          task_description: config.task_description,
          stage_order: config.stage_order,
          assignee_user_id: config.assignee_user_id,
          generation_time: taskGenerationTimeStr || generationTimeStr, // 使用該任務的生成時間，如果計算失敗則使用第一階段的
          generation_time_error: taskGenerationTimeError || generationTimeError,
          due_date: taskDueDateStr || dueDateStr, // 使用該任務配置的到期日，如果計算失敗則使用第一階段的
          due_date_error: taskDueDateError || dueDateError,
          is_fixed_deadline: config.is_fixed_deadline ? true : false,
          generation_time_rule: config.generation_time_rule || primaryConfig.generation_time_rule, // 使用該任務的生成時間規則
          generation_time_params: taskGenerationParams || generationParams,
          advance_days: config.advance_days !== null && config.advance_days !== undefined ? config.advance_days : primaryConfig.advance_days,
          days_due: config.days_due,
          due_rule: config.due_rule,
          due_value: config.due_value
        });
      }

      servicesPreview.push({
        client_id: cs.client_id,
        client_name: cs.company_name,
        service_id: cs.service_id,
        service_name: cs.service_name,
        service_code: cs.service_code,
        client_service_id: cs.client_service_id,
        service_type: cs.service_type,
        already_generated: !!existing,
        tasks: tasksPreview
      });
    }
    
    // 計算統計信息
    const totalServices = servicesPreview.length;
    const totalTasks = servicesPreview.reduce((sum, s) => sum + s.tasks.length, 0);
    const willGenerateServices = servicesPreview.filter(s => !s.already_generated).length;
    const willGenerateTasks = servicesPreview
      .filter(s => !s.already_generated)
      .reduce((sum, s) => sum + s.tasks.length, 0);
    
    return successResponse({
      year: currentYear,
      month: currentMonth,
      services: servicesPreview,
      summary: {
        total_services: totalServices,
        total_tasks: totalTasks,
        will_generate_services: willGenerateServices,
        will_generate_tasks: willGenerateTasks,
        already_generated_services: totalServices - willGenerateServices,
        already_generated_tasks: totalTasks - willGenerateTasks
      }
    }, "預覽成功", requestId);
    
  } catch (err) {
    console.error(`[Task Generator Preview] Error:`, err);
    console.error(`[Task Generator Preview] Error stack:`, err.stack);
    return errorResponse(500, "INTERNAL_ERROR", `預覽失敗: ${err.message || String(err)}`, { error: err.message, stack: err.stack }, requestId);
  }
}

/**
 * 一次性服務任務生成
 */
export async function handleGenerateTasksForOneTimeService(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 驗證用戶身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  try {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
    }
    
    const clientServiceId = Number(body?.client_service_id || 0);
    let serviceMonth = body?.service_month; // 格式：YYYY-MM
    
    // 驗證輸入
    if (!Number.isInteger(clientServiceId) || clientServiceId <= 0) {
      return errorResponse(422, "VALIDATION_ERROR", "client_service_id 必填且必須為正整數", null, requestId);
    }
    
    // 驗證客戶服務是否存在並獲取客戶負責人信息
    const clientService = await env.DATABASE.prepare(
      `SELECT cs.client_service_id, cs.service_type, c.assignee_user_id
       FROM ClientServices cs
       LEFT JOIN Clients c ON c.client_id = cs.client_id
       WHERE cs.client_service_id = ? AND cs.is_deleted = 0 AND c.is_deleted = 0
       LIMIT 1`
    ).bind(clientServiceId).first();
    
    if (!clientService) {
      return errorResponse(404, "NOT_FOUND", "客戶服務不存在", null, requestId);
    }
    
    // 權限檢查：只有管理員或客戶負責人可以為該客戶服務生成任務
    if (!user.is_admin && Number(clientService.assignee_user_id) !== Number(user.user_id)) {
      return errorResponse(403, "FORBIDDEN", "無權限為此客戶服務生成任務", null, requestId);
    }
    
    // 如果沒有提供 service_month，使用當前月份
    let targetYear, targetMonth;
    if (serviceMonth && /^\d{4}-\d{2}$/.test(serviceMonth)) {
      const [year, month] = serviceMonth.split('-');
      targetYear = parseInt(year, 10);
      targetMonth = parseInt(month, 10);
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }
    
    // 驗證月份
    if (targetMonth < 1 || targetMonth > 12) {
      return errorResponse(422, "VALIDATION_ERROR", "月份必須在 1-12 之間", null, requestId);
    }
    
    // 生成任務
    const result = await generateTasksForOneTimeService(env, clientServiceId, targetYear, targetMonth);
    
    return successResponse(result, "任務生成完成", requestId);
    
  } catch (err) {
    console.error(`[OneTime Task Generator] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", `任務生成失敗: ${err.message || String(err)}`, null, requestId);
  }
}
