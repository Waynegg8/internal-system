/**
 * 優化版任務生成邏輯
 * 採用預聚合和簡化查詢策略，減少查詢次數，提高生成效率
 * 
 * 核心優化：
 * 1. 單一查詢獲取所有數據（已實現）
 * 2. 減少每個客戶的查詢次數（從4次減到2-3次）
 * 3. force模式下跳過所有不必要的檢查
 * 4. 優化批量插入邏輯
 */

import { calculateGenerationTime, calculateDueDate, formatDate, isFixedDeadlineTask } from '../../utils/dateCalculators.js';

const SYSTEM_TRIGGER = 'system:auto_generate';

/**
 * 為指定年月生成任務（優化版）
 * 重點：減少查詢次數，提高處理效率
 */
export async function generateTasksForMonthOptimized(env, targetYear, targetMonth, options = {}) {
  const { now = new Date(), force = false, ctx } = options;
  const monthLabel = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const startTime = Date.now();
  const queryTimings = [];
  
  // 免費版 Cloudflare Workers 限制：每次 Worker 呼叫最多 50 次 D1 查詢
  const MAX_D1_QUERIES = 50;
  let queryCount = 0;
  const trackQuery = (queryName = '') => {
    queryCount++;
    if (queryCount > MAX_D1_QUERIES) {
      console.warn(`[TaskGenerator] 超過 D1 查詢次數限制（${MAX_D1_QUERIES} 次），當前已執行 ${queryCount} 次查詢`);
      return { exceeded: true, count: queryCount };
    }
    return queryCount;
  };
  
  const logQueryTime = (queryName, startTime) => {
    const duration = Date.now() - startTime;
    queryTimings.push({ query: queryName, duration, count: queryCount });
    return duration;
  };
  
  console.log(`[TaskGenerator Optimized] 開始為 ${monthLabel} 生成任務，force=${force}`);

  let generatedCount = 0;
  let skippedCount = 0;
  const errors = [];
  const skipReasons = {
    noConfig: 0,
    existingTask: 0,
    notEffective: 0,
    serviceType: 0,
    notInMonth: 0,
    dueDateError: 0,
    generationTime: 0
  };

  const respectServiceFlag = (env && env.USE_SERVICE_AUTO_FLAG === '0') ? false : true;
  const nowIso = new Date().toISOString();
  
  // 優化1：單一查詢獲取所有需要生成的任務數據
  // 包含所有必要的字段，減少後續查詢
  const allDataSql = `
    SELECT 
      cs.client_service_id, cs.client_id, cs.service_id, cs.status,
      cs.service_type, cs.execution_months, cs.use_for_auto_generate,
      c.company_name, s.service_name, s.service_code,
      tc.config_id, tc.task_name, tc.task_description, tc.assignee_user_id,
      tc.estimated_hours, tc.advance_days, tc.due_rule, tc.due_value, tc.days_due, tc.stage_order,
      tc.delivery_frequency, tc.delivery_months, tc.auto_generate, tc.notes,
      tc.execution_frequency, tc.execution_months, tc.effective_month,
      tc.generation_time_rule, tc.generation_time_params, tc.is_fixed_deadline,
      sops.sop_id, sops.sort_order
    FROM ClientServices cs
    INNER JOIN Clients c ON cs.client_id = c.client_id AND c.is_deleted = 0
    INNER JOIN Services s ON cs.service_id = s.service_id
    INNER JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id
      AND tc.is_deleted = 0 
      AND tc.auto_generate = 1
    LEFT JOIN TaskConfigSOPs sops ON sops.config_id = tc.config_id
    WHERE cs.is_deleted = 0 
      AND cs.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM ActiveTasks at
        WHERE at.client_service_id = cs.client_service_id
          AND at.service_year = ?
          AND at.service_month = ?
          AND at.is_deleted = 0
        LIMIT 1
      )
      ${respectServiceFlag ? 'AND (cs.use_for_auto_generate = 1 OR cs.use_for_auto_generate IS NULL)' : ''}
      ${force ? '' : 'AND cs.service_type != \'one-time\''}
    ORDER BY cs.client_id, cs.client_service_id, tc.stage_order ASC, tc.config_id ASC, sops.sort_order ASC
  `;
  
  const query1Start = Date.now();
  const allData = await env.DATABASE.prepare(allDataSql).bind(targetYear, targetMonth).all();
  const trackResult = trackQuery('get_all_data');
  if (trackResult && trackResult.exceeded) {
    return { generatedCount: 0, skippedCount: 0, errors: ['查詢次數超過限制'], queryCount, isComplete: false };
  }
  const query1Duration = logQueryTime('get_all_data', query1Start);
  const allDataRows = (allData.results || []).length;
  console.log(`[TaskGenerator Optimized] 查詢1-獲取所有數據：${allDataRows} 行，耗時 ${query1Duration}ms`);
  
  // 組織數據：按客戶服務分組
  const clientServicesMap = new Map(); // client_service_id -> { cs, configs: Map<config_id, {config, sops}> }
  
  for (const row of allData.results || []) {
    const clientServiceId = row.client_service_id;
    
    if (!clientServicesMap.has(clientServiceId)) {
      clientServicesMap.set(clientServiceId, {
        cs: {
          client_service_id: clientServiceId,
          client_id: row.client_id,
          service_id: row.service_id,
          status: row.status,
          service_type: row.service_type,
          execution_months: row.execution_months,
          use_for_auto_generate: row.use_for_auto_generate,
          company_name: row.company_name,
          service_name: row.service_name,
          service_code: row.service_code
        },
        configs: new Map()
      });
    }
    
    const serviceData = clientServicesMap.get(clientServiceId);
    const configId = row.config_id;
    
    if (!serviceData.configs.has(configId)) {
      serviceData.configs.set(configId, {
        config: {
          config_id: configId,
          client_service_id: clientServiceId,
          task_name: row.task_name,
          task_description: row.task_description,
          assignee_user_id: row.assignee_user_id,
          estimated_hours: row.estimated_hours,
          advance_days: row.advance_days,
          due_rule: row.due_rule,
          due_value: row.due_value,
          days_due: row.days_due,
          stage_order: row.stage_order,
          delivery_frequency: row.delivery_frequency,
          delivery_months: row.delivery_months,
          auto_generate: row.auto_generate,
          notes: row.notes,
          execution_frequency: row.execution_frequency,
          execution_months: row.execution_months,
          effective_month: row.effective_month,
          generation_time_rule: row.generation_time_rule,
          generation_time_params: row.generation_time_params,
          is_fixed_deadline: row.is_fixed_deadline
        },
        sops: []
      });
    }
    
    if (row.sop_id) {
      serviceData.configs.get(configId).sops.push({
        sop_id: row.sop_id,
        sort_order: row.sort_order
      });
    }
  }
  
  const totalServices = clientServicesMap.size;
  console.log(`[TaskGenerator Optimized] 共 ${totalServices} 個客戶服務需要處理`);
  
  // 按客戶分組
  const clientsMap = new Map(); // client_id -> [serviceData]
  for (const [clientServiceId, serviceData] of clientServicesMap.entries()) {
    const clientId = serviceData.cs.client_id;
    if (!clientsMap.has(clientId)) {
      clientsMap.set(clientId, []);
    }
    clientsMap.get(clientId).push(serviceData);
  }
  
  const totalClients = clientsMap.size;
  console.log(`[TaskGenerator Optimized] 按客戶分組：${totalClients} 個客戶，${totalServices} 個服務`);
  
  // 優化2：不限制客戶數量，依賴查詢次數限制
  const clientsToProcess = Array.from(clientsMap.entries());
  let clientsProcessedCount = 0;
  let clientsWithTasksCount = 0;
  
  // 優化3：收集所有任務數據，然後批量插入
  const allTasksToInsert = [];
  const allStagesToInsert = [];
  const allSOPsToInsert = [];
  
  for (const [clientId, clientServiceDataList] of clientsToProcess) {
    // 檢查查詢次數限制
    if (queryCount >= MAX_D1_QUERIES) {
      console.log(`[TaskGenerator Optimized] 已達到 D1 查詢次數限制（${queryCount}/${MAX_D1_QUERIES}），停止處理。已處理 ${clientsProcessedCount} 個客戶`);
      break;
    }
    
    clientsProcessedCount++;
    let clientSkippedCount = 0;
    
    for (const serviceData of clientServiceDataList) {
      const cs = serviceData.cs;
      const configsMap = serviceData.configs;
      
      const configList = Array.from(configsMap.values())
        .map(item => item.config)
        .filter(c => Number(c.auto_generate ?? 1) !== 0);
      
      if (!configList.length) {
        skippedCount++;
        clientSkippedCount++;
        skipReasons.noConfig++;
        continue;
      }
      
      // force模式下跳過大部分檢查
      const sortedConfigs = configList.sort((a, b) => (a.stage_order || 0) - (b.stage_order || 0));
      const primaryConfig = sortedConfigs[0];
      
      // 只檢查one-time（永遠跳過）
      if (cs.service_type === 'one-time') {
        skippedCount++;
        clientSkippedCount++;
        skipReasons.serviceType++;
        continue;
      }
      
      // force模式下跳過其他檢查
      if (!force) {
        // 非force模式下的檢查
        if (!isConfigEffectiveInMonth(primaryConfig, targetYear, targetMonth)) {
          skippedCount++;
          clientSkippedCount++;
          skipReasons.notEffective++;
          continue;
        }
        
        if (Number(cs.use_for_auto_generate ?? 0) === 0) {
          skippedCount++;
          clientSkippedCount++;
          skipReasons.serviceType++;
          continue;
        }
        
        const shouldGenerateInThisMonth = shouldGenerateInMonth(primaryConfig, targetMonth, cs);
        if (!shouldGenerateInThisMonth) {
          skippedCount++;
          clientSkippedCount++;
          skipReasons.notInMonth++;
          continue;
        }
      }
      
      // 計算截止日期
      const dueDate = calculateDueDate(primaryConfig, targetYear, targetMonth);
      if (!dueDate || Number.isNaN(dueDate.getTime())) {
        skippedCount++;
        clientSkippedCount++;
        skipReasons.dueDateError++;
        continue;
      }
      
      // force模式下跳過生成時間檢查
      let shouldGenerate = force;
      let generationTime = now;
      
      if (!force) {
        // 非force模式下的生成時間檢查
        let generationParams = {};
        if (primaryConfig.generation_time_params) {
          try {
            generationParams = typeof primaryConfig.generation_time_params === 'string' 
              ? JSON.parse(primaryConfig.generation_time_params) 
              : primaryConfig.generation_time_params;
          } catch (err) {
            console.warn("[TaskGenerator] 無法解析 generation_time_params", err);
          }
        }
        
        if (primaryConfig.generation_time_rule) {
          generationTime = calculateGenerationTime(
            primaryConfig.generation_time_rule,
            generationParams,
            targetYear,
            targetMonth,
            null,
            null
          );
          
          if (generationTime && !Number.isNaN(generationTime.getTime())) {
            const generationDate = new Date(generationTime);
            generationDate.setHours(0, 0, 0, 0);
            const nowDate = new Date(now);
            nowDate.setHours(0, 0, 0, 0);
            shouldGenerate = nowDate >= generationDate;
          } else {
            const advanceDays = Number.isFinite(primaryConfig.advance_days) ? Number(primaryConfig.advance_days) : 7;
            const thresholdDate = new Date(dueDate);
            thresholdDate.setDate(thresholdDate.getDate() - Math.max(advanceDays, 0));
            shouldGenerate = now >= thresholdDate;
            if (shouldGenerate) {
              generationTime = now;
            }
          }
        } else {
          const advanceDays = Number.isFinite(primaryConfig.advance_days) ? Number(primaryConfig.advance_days) : 7;
          const thresholdDate = new Date(dueDate);
          thresholdDate.setDate(thresholdDate.getDate() - Math.max(advanceDays, 0));
          shouldGenerate = now >= thresholdDate;
          if (shouldGenerate) {
            generationTime = now;
          }
        }
      }
      
      if (!shouldGenerate) {
        skippedCount++;
        clientSkippedCount++;
        skipReasons.generationTime++;
        continue;
      }
      
      const formattedDueDate = formatDate(dueDate);
      const generationTimeIso = generationTime ? generationTime.toISOString() : nowIso;
      const isFixedDeadline = isFixedDeadlineTask(primaryConfig) ? 1 : 0;
      
      // 構建階段定義
      const stageDefinitions = [];
      const usedOrders = new Set();
      let fallbackOrder = 1;
      
      for (const cfg of sortedConfigs) {
        let order = Number.isFinite(cfg.stage_order) && cfg.stage_order > 0 ? Number(cfg.stage_order) : null;
        if (!order || usedOrders.has(order)) {
          while (usedOrders.has(fallbackOrder)) {
            fallbackOrder += 1;
          }
          order = fallbackOrder;
        }
        usedOrders.add(order);
        fallbackOrder = order + 1;
        stageDefinitions.push({
          config: cfg,
          order,
          name: cfg.task_name || `階段 ${order}`,
        });
      }
      
      const primaryStage = stageDefinitions[0];
      const configData = configsMap.get(primaryConfig.config_id);
      const configSops = configData ? configData.sops : [];
      
      // 收集任務數據（暫時不插入，等待批量插入）
      allTasksToInsert.push({
        cs,
        primaryConfig,
        primaryStage,
        stageDefinitions,
        formattedDueDate,
        generationTimeIso,
        isFixedDeadline,
        configSops,
        clientId
      });
    }
  }
  
  console.log(`[TaskGenerator Optimized] 收集了 ${allTasksToInsert.length} 個任務待插入，跳過 ${skippedCount} 個服務`);
  
  // 優化4：批量插入所有任務，減少查詢次數
  if (allTasksToInsert.length === 0) {
    return {
      generatedCount: 0,
      skippedCount,
      errors: errors.length,
      processedServices: 0,
      totalServices,
      remainingServices: totalServices,
      isComplete: true,
      queryCount,
      queryTimings,
      skipReasons,
      clientsProcessed: clientsProcessedCount,
      clientsWithTasks: 0
    };
  }
  
  // 批量插入任務（分批處理以避免SQL變數限制）
  const TASK_BATCH_SIZE = 50; // 每個任務18個參數，50個任務 = 900個參數，安全範圍內
  let insertedTaskIds = [];
  
  for (let i = 0; i < allTasksToInsert.length; i += TASK_BATCH_SIZE) {
    if (queryCount >= MAX_D1_QUERIES) {
      console.log(`[TaskGenerator Optimized] 達到查詢次數限制，停止插入。已插入 ${insertedTaskIds.length} 個任務`);
      break;
    }
    
    const batch = allTasksToInsert.slice(i, i + TASK_BATCH_SIZE);
    const taskValues = [];
    const taskParams = [];
    
    for (const task of batch) {
      const { cs, primaryConfig, formattedDueDate, isFixedDeadline } = task;
      taskValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      taskParams.push(
        cs.client_id,
        cs.client_service_id,
        cs.service_id,
        primaryConfig.config_id,
        primaryConfig.task_name,
        primaryConfig.task_description,
        primaryConfig.assignee_user_id,
        targetYear,
        targetMonth,
        formattedDueDate,
        formattedDueDate,
        primaryConfig.estimated_hours,
        primaryConfig.stage_order,
        primaryConfig.notes,
        'in_progress',
        isFixedDeadline,
        nowIso,
        nowIso
      );
    }
    
    const insertStart = Date.now();
    await env.DATABASE.prepare(`
      INSERT INTO ActiveTasks 
      (client_id, client_service_id, service_id, task_config_id, task_type,
       task_description, assignee_user_id, service_year, service_month,
       due_date, original_due_date, estimated_hours, stage_order, notes, status, 
       is_fixed_deadline, created_at, updated_at)
      VALUES ${taskValues.join(', ')}
    `).bind(...taskParams).run();
    
    const trackResult = trackQuery('insert_tasks_batch');
    if (trackResult && trackResult.exceeded) {
      break;
    }
    logQueryTime('insert_tasks_batch', insertStart);
    
    // 查詢剛插入的任務ID
    const clientServiceIds = batch.map(t => t.cs.client_service_id);
    const placeholders = clientServiceIds.map(() => '?').join(',');
    const timeWindowStart = new Date(now.getTime() - 5000).toISOString();
    
    const selectStart = Date.now();
    const insertedTasks = await env.DATABASE.prepare(`
      SELECT task_id, client_service_id 
      FROM ActiveTasks 
      WHERE client_service_id IN (${placeholders})
        AND service_year = ? 
        AND service_month = ?
        AND created_at >= ?
        AND created_at <= ?
      ORDER BY task_id DESC
      LIMIT ?
    `).bind(...clientServiceIds, targetYear, targetMonth, timeWindowStart, nowIso, batch.length).all();
    
    const trackResult2 = trackQuery('select_task_ids');
    if (trackResult2 && trackResult2.exceeded) {
      break;
    }
    logQueryTime('select_task_ids', selectStart);
    
    const taskIdMap = new Map();
    for (const task of insertedTasks.results || []) {
      taskIdMap.set(task.client_service_id, task.task_id);
      insertedTaskIds.push(task.task_id);
    }
    
    // 插入階段和SOP
    const stageValues = [];
    const stageParams = [];
    const sopInserts = [];
    
    for (const task of batch) {
      const taskId = taskIdMap.get(task.cs.client_service_id);
      if (!taskId) continue;
      
      const { primaryStage, stageDefinitions, configSops } = task;
      for (const stageDef of stageDefinitions) {
        const isFirstStage = stageDef === primaryStage;
        stageValues.push('(?, ?, ?, ?, 0, ?, ?, ?, ?)');
        stageParams.push(
          taskId,
          stageDef.name,
          stageDef.order,
          isFirstStage ? 'in_progress' : 'pending',
          isFirstStage ? nowIso : null,
          isFirstStage ? nowIso : null,
          isFirstStage ? SYSTEM_TRIGGER : null,
          stageDef.config?.notes || null
        );
      }
      
      for (const sop of configSops) {
        sopInserts.push({ taskId, sopId: sop.sop_id, sortOrder: sop.sort_order });
      }
    }
    
    // 批量插入階段
    if (stageValues.length > 0) {
      const STAGE_BATCH_SIZE = 111; // 每個階段9個參數，111個階段 = 999個參數
      for (let j = 0; j < stageValues.length; j += STAGE_BATCH_SIZE) {
        const batchValues = stageValues.slice(j, j + STAGE_BATCH_SIZE);
        const batchParams = stageParams.slice(j, j + STAGE_BATCH_SIZE);
        
        const stagesStart = Date.now();
        await env.DATABASE.prepare(`
          INSERT INTO ActiveTaskStages 
          (task_id, stage_name, stage_order, status, delay_days, started_at, triggered_at, triggered_by, notes)
          VALUES ${batchValues.join(', ')}
        `).bind(...batchParams).run();
        
        const trackResult3 = trackQuery('insert_stages_batch');
        if (trackResult3 && trackResult3.exceeded) {
          break;
        }
        logQueryTime('insert_stages_batch', stagesStart);
      }
    }
    
    // 異步插入SOP（不計入查詢次數限制）
    for (const { taskId, sopId, sortOrder } of sopInserts) {
      if (ctx?.waitUntil) {
        ctx.waitUntil(
          env.DATABASE.prepare(`INSERT INTO ActiveTaskSOPs (task_id, sop_id, sort_order) VALUES (?, ?, ?)`)
            .bind(taskId, sopId, sortOrder)
            .run()
            .catch(err => console.warn("[TaskGenerator] SOP插入失敗", err))
        );
      }
    }
    
    generatedCount += batch.length;
    clientsWithTasksCount++;
  }
  
  const durationMs = Date.now() - startTime;
  const isComplete = queryCount < MAX_D1_QUERIES && clientsProcessedCount >= totalClients;
  
  console.log(`[TaskGenerator Optimized] 完成：生成 ${generatedCount} 個任務，跳過 ${skippedCount} 個，使用 ${queryCount} 次查詢，耗時 ${(durationMs / 1000).toFixed(2)} 秒`);
  console.log(`[TaskGenerator Optimized] 跳過原因統計：`, skipReasons);
  
  return {
    generatedCount,
    skippedCount,
    errors: errors.length,
    processedServices: generatedCount + skippedCount,
    totalServices,
    remainingServices: totalServices - (generatedCount + skippedCount),
    isComplete,
    queryCount,
    queryTimings,
    skipReasons,
    clientsProcessed: clientsProcessedCount,
    clientsWithTasks: clientsWithTasksCount
  };
}

// 輔助函數
function isConfigEffectiveInMonth(config, targetYear, targetMonth) {
  if (!config.effective_month) return true;
  const [effYear, effMonth] = config.effective_month.split("-").map(n => parseInt(n, 10));
  if (Number.isNaN(effYear) || Number.isNaN(effMonth)) return true;
  if (targetYear < effYear) return false;
  if (targetYear === effYear && targetMonth < effMonth) return false;
  return true;
}

function shouldGenerateInMonth(config, month, serviceContext) {
  const frequency = config.execution_frequency || config.delivery_frequency;
  const serviceMonths = serviceContext ? parseJsonArray(serviceContext.execution_months) : null;
  const executionMonths = parseJsonArray(config.execution_months);
  
  const targetMonth = Number(month);
  if (serviceMonths && Array.isArray(serviceMonths) && serviceMonths.length > 0) {
    return serviceMonths.includes(targetMonth);
  }
  if (executionMonths && Array.isArray(executionMonths) && executionMonths.length > 0) {
    return executionMonths.includes(targetMonth);
  }
  
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
    default:
      return false;
  }
}

function parseJsonArray(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(Number);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(Number) : null;
  } catch {
    return null;
  }
}


