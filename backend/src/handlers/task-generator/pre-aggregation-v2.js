/**
 * 徹底重構的預聚合邏輯
 * 
 * 核心思想：
 * 1. 預聚合階段：一次性計算並存儲所有需要的數據（任務信息、SOP、階段等）
 * 2. 生成階段：直接從 Queue 讀取完整數據，只需插入，無需任何額外查詢
 * 3. 超大批次插入：減少查詢和寫入次數
 * 4. 目標：預聚合 1-2 次查詢，生成 2-3 次查詢，總共 < 10 次查詢
 */

/**
 * 徹底預聚合：計算並存儲所有需要的數據
 */
export async function preAggregateTasksV2(env, targetYear, targetMonth, options = {}) {
  const { now = new Date(), force = false, ctx = null } = options;
  const monthLabel = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const startTime = Date.now();
  
  const MAX_D1_QUERIES = 50;
  let queryCount = 0;
  const trackQuery = () => {
    queryCount++;
    if (queryCount > MAX_D1_QUERIES) {
      console.warn(`[PreAggregationV2] 超過 D1 查詢次數限制（${MAX_D1_QUERIES} 次）`);
    }
    return queryCount;
  };
  
  console.log(`[PreAggregationV2] 開始徹底預聚合 for ${monthLabel}，force=${force}`);
  
  // 1. 檢查是否已經有預聚合數據
  const checkExisting = await env.DATABASE.prepare(`
    SELECT COUNT(*) as count 
    FROM TaskGenerationQueue 
    WHERE target_year = ? AND target_month = ? AND status = 'pending'
  `).bind(targetYear, targetMonth).first();
  trackQuery();
  
  const existingCount = checkExisting?.count || 0;
  if (existingCount > 0 && !force) {
    console.log(`[PreAggregationV2] 已存在 ${existingCount} 個待處理的預聚合任務，跳過重新計算`);
    return { queuedCount: existingCount, queryCount, skipped: true };
  }
  
  // 2. 清除舊的預聚合數據（如果 force 模式）
  if (force && existingCount > 0) {
    // 先刪除相關的 SOP 記錄
    await env.DATABASE.prepare(`
      DELETE FROM TaskGenerationQueueSOPs 
      WHERE queue_id IN (
        SELECT queue_id FROM TaskGenerationQueue 
        WHERE target_year = ? AND target_month = ?
      )
    `).bind(targetYear, targetMonth).run();
    trackQuery();
    
    // 再刪除 Queue 記錄
    await env.DATABASE.prepare(`
      DELETE FROM TaskGenerationQueue 
      WHERE target_year = ? AND target_month = ?
    `).bind(targetYear, targetMonth).run();
    trackQuery();
    console.log(`[PreAggregationV2] 已清除舊的預聚合數據`);
  }
  
  // 3. 單一查詢獲取所有需要的數據（包括 SOP）
  const respectServiceFlag = (env && env.USE_SERVICE_AUTO_FLAG === '0') ? false : true;
  
  const allDataSql = `
    SELECT 
      cs.client_service_id, cs.client_id, cs.service_id,
      cs.service_type, cs.execution_months, cs.use_for_auto_generate,
      tc.config_id, tc.task_name, tc.task_description, tc.assignee_user_id,
      tc.estimated_hours, tc.advance_days, tc.due_rule, tc.due_value, tc.days_due, tc.stage_order,
      tc.execution_frequency, tc.execution_months as config_execution_months, tc.effective_month,
      tc.generation_time_rule, tc.generation_time_params, tc.is_fixed_deadline, tc.notes,
      c.company_name, s.service_name,
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
      ${force ? '' : `AND NOT EXISTS (
        SELECT 1 FROM ActiveTasks at
        WHERE at.client_service_id = cs.client_service_id
          AND at.service_year = ?
          AND at.service_month = ?
          AND at.is_deleted = 0
        LIMIT 1
      )`}
      ${respectServiceFlag ? 'AND (cs.use_for_auto_generate = 1 OR cs.use_for_auto_generate IS NULL)' : ''}
      ${force ? '' : 'AND cs.service_type != \'one-time\''}
    ORDER BY cs.client_id, cs.client_service_id, tc.stage_order ASC, tc.config_id ASC, sops.sort_order ASC
  `;
  
  const bindParams = force ? [] : [targetYear, targetMonth];
  const allData = await env.DATABASE.prepare(allDataSql);
  const boundQuery = bindParams.length > 0 ? allData.bind(...bindParams) : allData;
  const result = await boundQuery.all();
  trackQuery();
  
  const allDataRows = (result.results || []).length;
  console.log(`[PreAggregationV2] 查詢獲取 ${allDataRows} 行數據，使用 ${queryCount} 次查詢`);
  
  if (allDataRows === 0) {
    return { queuedCount: 0, queryCount, skipped: false };
  }
  
  // 4. 處理數據並計算所有需要的字段
  const { 
    calculateGenerationTime, 
    calculateDueDate, 
    formatDate, 
    isFixedDeadlineTask 
  } = await import('../../utils/dateCalculators.js');
  
  const queueItems = [];
  const queueSOPs = []; // 存儲 SOP 關聯
  const processedServices = new Set(); // 避免重複（每個服務只生成一個任務）
  const serviceSOPMap = new Map(); // 收集每個服務的 SOP
  
  // 先收集所有 SOP
  for (const row of result.results || []) {
    if (row.sop_id) {
      const key = `${row.client_service_id}_${row.config_id}`;
      if (!serviceSOPMap.has(key)) {
        serviceSOPMap.set(key, []);
      }
      serviceSOPMap.get(key).push({
        sop_id: row.sop_id,
        sort_order: row.sort_order || 0
      });
    }
  }
  
  // 處理每個服務配置
  for (const row of result.results || []) {
    const serviceKey = `${row.client_service_id}_${row.config_id}`;
    if (processedServices.has(serviceKey)) continue;
    processedServices.add(serviceKey);
    
    // 只處理第一階段配置
    const isFirstStage = Number(row.stage_order || 0) === 1 || 
                         !result.results.some(r => 
                           r.client_service_id === row.client_service_id && 
                           r.config_id !== row.config_id && 
                           Number(r.stage_order || 0) < Number(row.stage_order || 0)
                         );
    
    if (!isFirstStage) continue;
    
    // 計算截止日期
    const dueDate = calculateDueDate({
      due_rule: row.due_rule,
      due_value: row.due_value,
      days_due: row.days_due,
      advance_days: row.advance_days
    }, targetYear, targetMonth);
    
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      continue;
    }
    
    // 計算生成時間
    let generationTime = now;
    if (row.generation_time_rule && !force) {
      let generationParams = {};
      if (row.generation_time_params) {
        try {
          generationParams = typeof row.generation_time_params === 'string' 
            ? JSON.parse(row.generation_time_params) 
            : row.generation_time_params;
        } catch (err) {
          console.warn("[PreAggregationV2] 無法解析 generation_time_params", err);
        }
      }
      
      const calculatedTime = calculateGenerationTime(
        row.generation_time_rule,
        generationParams,
        targetYear,
        targetMonth,
        null,
        null
      );
      
      if (calculatedTime && !Number.isNaN(calculatedTime.getTime())) {
        generationTime = calculatedTime;
      }
    }
    
    // force模式下跳過生成時間檢查
    if (!force) {
      const generationDate = new Date(generationTime);
      generationDate.setHours(0, 0, 0, 0);
      const nowDate = new Date(now);
      nowDate.setHours(0, 0, 0, 0);
      if (nowDate < generationDate) {
        continue; // 生成時間未到
      }
    }
    
    // 檢查是否應該在這個月份生成
    if (!force) {
      const shouldGenerate = shouldGenerateInMonth(
        {
          execution_frequency: row.execution_frequency,
          execution_months: row.config_execution_months
        },
        targetMonth,
        {
          execution_months: row.execution_months
        }
      );
      
      if (!shouldGenerate) {
        continue;
      }
    }
    
    // 檢查配置是否生效
    if (!force && row.effective_month) {
      const [effYear, effMonth] = row.effective_month.split("-").map(n => parseInt(n, 10));
      if (!Number.isNaN(effYear) && !Number.isNaN(effMonth)) {
        if (targetYear < effYear || (targetYear === effYear && targetMonth < effMonth)) {
          continue;
        }
      }
    }
    
    // 準備完整的 Queue 項目（包含所有預計算字段）
    const queueItem = {
      client_id: row.client_id,
      client_service_id: row.client_service_id,
      service_id: row.service_id,
      config_id: row.config_id,
      target_year: targetYear,
      target_month: targetMonth,
      generation_time: generationTime.toISOString(),
      due_date: formatDate(dueDate),
      is_fixed_deadline: isFixedDeadlineTask({
        is_fixed_deadline: row.is_fixed_deadline
      }) ? 1 : 0,
      status: 'pending',
      // 新增：存儲完整任務信息
      task_name: row.task_name,
      task_description: row.task_description,
      assignee_user_id: row.assignee_user_id,
      estimated_hours: row.estimated_hours,
      stage_order: row.stage_order,
      notes: row.notes,
      company_name: row.company_name,
      service_name: row.service_name,
      service_type: row.service_type
    };
    
    queueItems.push(queueItem);
    
    // 收集 SOP（將在插入 Queue 後插入）
    const sops = serviceSOPMap.get(serviceKey) || [];
    queueSOPs.push({
      serviceKey,
      configId: row.config_id,
      sops
    });
  }
  
  console.log(`[PreAggregationV2] 計算出 ${queueItems.length} 個待生成任務，${queueSOPs.reduce((sum, q) => sum + q.sops.length, 0)} 個 SOP`);
  
  if (queueItems.length === 0) {
    return { queuedCount: 0, queryCount, skipped: false };
  }
  
  // 5. 批量插入到 TaskGenerationQueue（超大批次）
  const BATCH_SIZE = 200; // 增大批次大小，每個項目約15個參數，200個項目 = 3000個參數（仍在 SQLite 限制內）
  let insertedCount = 0;
  const insertedQueueIds = []; // 記錄插入的 queue_id
  
  for (let i = 0; i < queueItems.length; i += BATCH_SIZE) {
    if (queryCount >= MAX_D1_QUERIES) {
      console.log(`[PreAggregationV2] 達到查詢次數限制，停止插入。已插入 ${insertedCount} 個任務`);
      break;
    }
    
    const batch = queueItems.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    
    for (const item of batch) {
      values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      params.push(
        item.client_id,
        item.client_service_id,
        item.service_id,
        item.config_id,
        item.target_year,
        item.target_month,
        item.generation_time,
        item.due_date,
        item.is_fixed_deadline,
        item.status,
        item.task_name,
        item.task_description,
        item.assignee_user_id,
        item.estimated_hours,
        item.stage_order,
        item.notes,
        item.company_name,
        item.service_name,
        item.service_type
      );
    }
    
    try {
      const insertResult = await env.DATABASE.prepare(`
        INSERT INTO TaskGenerationQueue 
        (client_id, client_service_id, service_id, config_id, target_year, target_month, 
         generation_time, due_date, is_fixed_deadline, status,
         task_name, task_description, assignee_user_id, estimated_hours, stage_order, notes,
         company_name, service_name, service_type)
        VALUES ${values.join(', ')}
      `).bind(...params).run();
      trackQuery();
      
      insertedCount += batch.length;
      
      // 查詢剛插入的 queue_id（使用時間窗口）
      const timeWindowStart = new Date(Date.now() - 5000).toISOString();
      const timeWindowEnd = new Date().toISOString();
      const clientServiceIds = batch.map(t => t.client_service_id);
      const configIds = batch.map(t => t.config_id);
      const placeholders = clientServiceIds.map(() => '?').join(',');
      
      const insertedQueues = await env.DATABASE.prepare(`
        SELECT queue_id, client_service_id, config_id 
        FROM TaskGenerationQueue 
        WHERE client_service_id IN (${placeholders})
          AND config_id IN (${configIds.map(() => '?').join(',')})
          AND target_year = ?
          AND target_month = ?
          AND created_at >= ?
          AND created_at <= ?
        ORDER BY queue_id DESC
        LIMIT ?
      `).bind(...clientServiceIds, ...configIds, targetYear, targetMonth, timeWindowStart, timeWindowEnd, batch.length).all();
      trackQuery();
      
      for (const queue of insertedQueues.results || []) {
        insertedQueueIds.push({
          queue_id: queue.queue_id,
          client_service_id: queue.client_service_id,
          config_id: queue.config_id
        });
      }
    } catch (err) {
      console.error(`[PreAggregationV2] 批量插入失敗:`, err);
      // 如果批量插入失敗，嘗試逐個插入
      for (const item of batch) {
        try {
          const insertResult = await env.DATABASE.prepare(`
            INSERT OR IGNORE INTO TaskGenerationQueue 
            (client_id, client_service_id, service_id, config_id, target_year, target_month, 
             generation_time, due_date, is_fixed_deadline, status,
             task_name, task_description, assignee_user_id, estimated_hours, stage_order, notes,
             company_name, service_name, service_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            item.client_id, item.client_service_id, item.service_id, item.config_id,
            item.target_year, item.target_month, item.generation_time, item.due_date,
            item.is_fixed_deadline, item.status,
            item.task_name, item.task_description, item.assignee_user_id, item.estimated_hours,
            item.stage_order, item.notes, item.company_name, item.service_name, item.service_type
          ).run();
          trackQuery();
          
          if (insertResult.meta.last_row_id) {
            insertedCount++;
            insertedQueueIds.push({
              queue_id: insertResult.meta.last_row_id,
              client_service_id: item.client_service_id,
              config_id: item.config_id
            });
          }
        } catch (singleErr) {
          console.error(`[PreAggregationV2] 單個插入失敗:`, singleErr);
        }
      }
    }
  }
  
  // 6. 批量插入 SOP（如果有的話）
  if (insertedQueueIds.length > 0 && queueSOPs.length > 0) {
    const sopValues = [];
    const sopParams = [];
    const queueIdMap = new Map();
    
    for (const q of insertedQueueIds) {
      queueIdMap.set(`${q.client_service_id}_${q.config_id}`, q.queue_id);
    }
    
    for (const qsop of queueSOPs) {
      const queueId = queueIdMap.get(qsop.serviceKey);
      if (queueId && qsop.sops.length > 0) {
        for (const sop of qsop.sops) {
          sopValues.push('(?, ?, ?)');
          sopParams.push(queueId, sop.sop_id, sop.sort_order);
        }
      }
    }
    
    if (sopValues.length > 0) {
      const SOP_BATCH_SIZE = 500; // SOP 批次可以更大
      for (let i = 0; i < sopValues.length; i += SOP_BATCH_SIZE) {
        if (queryCount >= MAX_D1_QUERIES) break;
        
        const batchValues = sopValues.slice(i, i + SOP_BATCH_SIZE);
        const batchParams = sopParams.slice(i * 3, (i + SOP_BATCH_SIZE) * 3);
        
        try {
          await env.DATABASE.prepare(`
            INSERT OR IGNORE INTO TaskGenerationQueueSOPs (queue_id, sop_id, sort_order)
            VALUES ${batchValues.join(', ')}
          `).bind(...batchParams).run();
          trackQuery();
        } catch (err) {
          console.error(`[PreAggregationV2] SOP 批量插入失敗:`, err);
        }
      }
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`[PreAggregationV2] 完成：預聚合 ${insertedCount} 個任務，使用 ${queryCount} 次查詢，耗時 ${(duration / 1000).toFixed(2)} 秒`);
  
  return { queuedCount: insertedCount, queryCount, skipped: false };
}

/**
 * 從 Queue 高效生成任務（無需額外查詢）
 */
export async function generateTasksFromQueueV2(env, targetYear, targetMonth, options = {}) {
  const { now = new Date(), force = false, ctx = null } = options;
  const monthLabel = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const startTime = Date.now();
  
  const MAX_D1_QUERIES = 50;
  let queryCount = 0;
  const trackQuery = () => {
    queryCount++;
    if (queryCount > MAX_D1_QUERIES) {
      console.warn(`[GenerateFromQueueV2] 超過 D1 查詢次數限制（${MAX_D1_QUERIES} 次）`);
    }
    return queryCount;
  };
  
  console.log(`[GenerateFromQueueV2] 開始從 Queue 高效生成任務 for ${monthLabel}`);
  
  // 1. 從 Queue 獲取待處理任務（單一查詢，包含所有數據，無需 JOIN）
  const queueItems = await env.DATABASE.prepare(`
    SELECT 
      q.queue_id, q.client_id, q.client_service_id, q.service_id, q.config_id,
      q.generation_time, q.due_date, q.is_fixed_deadline,
      q.task_name, q.task_description, q.assignee_user_id,
      q.estimated_hours, q.stage_order, q.notes
    FROM TaskGenerationQueue q
    WHERE q.target_year = ? AND q.target_month = ? 
      AND q.status = 'pending'
    ORDER BY q.client_id, q.client_service_id, q.queue_id
    LIMIT 1000
  `).bind(targetYear, targetMonth).all();
  trackQuery();
  
  const items = queueItems.results || [];
  console.log(`[GenerateFromQueueV2] 從 Queue 獲取 ${items.length} 個待處理任務`);
  
  if (items.length === 0) {
    return { generatedCount: 0, skippedCount: 0, queryCount };
  }
  
  // 2. 批量檢查已存在任務（單一查詢）
  const clientServiceIds = [...new Set(items.map(item => item.client_service_id))];
  const placeholders = clientServiceIds.map(() => '?').join(',');
  
  const existingTasks = await env.DATABASE.prepare(`
    SELECT DISTINCT client_service_id 
    FROM ActiveTasks 
    WHERE client_service_id IN (${placeholders})
      AND service_year = ? 
      AND service_month = ?
      AND is_deleted = 0
  `).bind(...clientServiceIds, targetYear, targetMonth).all();
  trackQuery();
  
  const existingServiceIds = new Set((existingTasks.results || []).map(t => t.client_service_id));
  
  // 3. 過濾出需要生成的任務
  const tasksToInsert = items.filter(item => !existingServiceIds.has(item.client_service_id));
  console.log(`[GenerateFromQueueV2] 準備插入 ${tasksToInsert.length} 個任務（跳過 ${items.length - tasksToInsert.length} 個已存在）`);
  
  if (tasksToInsert.length === 0) {
    // 更新所有 Queue 狀態為 completed
    const queueIds = items.map(item => item.queue_id);
    const queuePlaceholders = queueIds.map(() => '?').join(',');
    await env.DATABASE.prepare(`
      UPDATE TaskGenerationQueue 
      SET status = 'completed', processed_at = ?
      WHERE queue_id IN (${queuePlaceholders})
    `).bind(now.toISOString(), ...queueIds).run();
    trackQuery();
    
    return { generatedCount: 0, skippedCount: items.length, queryCount };
  }
  
  // 4. 超大批次插入任務（單一查詢）
  const nowIso = now.toISOString();
  const TASK_BATCH_SIZE = 200; // 增大批次大小
  let generatedCount = 0;
  const insertedTaskIds = [];
  
  for (let i = 0; i < tasksToInsert.length; i += TASK_BATCH_SIZE) {
    if (queryCount >= MAX_D1_QUERIES) {
      console.log(`[GenerateFromQueueV2] 達到查詢次數限制，停止插入。已插入 ${generatedCount} 個任務`);
      break;
    }
    
    const batch = tasksToInsert.slice(i, i + TASK_BATCH_SIZE);
    const taskValues = [];
    const taskParams = [];
    
    for (const task of batch) {
      taskValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      taskParams.push(
        task.client_id,
        task.client_service_id,
        task.service_id,
        task.config_id,
        task.task_name || '任務', // task_type 字段使用 task_name
        task.task_description,
        task.assignee_user_id,
        targetYear,
        targetMonth,
        task.due_date,
        task.due_date, // original_due_date
        task.estimated_hours,
        task.stage_order,
        task.notes,
        'in_progress',
        task.is_fixed_deadline,
        nowIso,
        nowIso
      );
    }
    
    // 插入任務
    // 使用 task_name 作為 task_type（如果 task_type 字段存在）
    await env.DATABASE.prepare(`
      INSERT INTO ActiveTasks 
      (client_id, client_service_id, service_id, task_config_id, task_type,
       task_description, assignee_user_id, service_year, service_month,
       due_date, original_due_date, estimated_hours, stage_order, notes, status, 
       is_fixed_deadline, created_at, updated_at)
      VALUES ${taskValues.join(', ')}
    `).bind(...taskParams).run();
    trackQuery();
    
    // 查詢剛插入的任務ID（單一查詢）
    const batchClientServiceIds = batch.map(t => t.client_service_id);
    const batchPlaceholders = batchClientServiceIds.map(() => '?').join(',');
    const timeWindowStart = new Date(now.getTime() - 5000).toISOString();
    
    const insertedTasks = await env.DATABASE.prepare(`
      SELECT task_id, client_service_id 
      FROM ActiveTasks 
      WHERE client_service_id IN (${batchPlaceholders})
        AND service_year = ? 
        AND service_month = ?
        AND created_at >= ?
        AND created_at <= ?
      ORDER BY task_id DESC
      LIMIT ?
    `).bind(...batchClientServiceIds, targetYear, targetMonth, timeWindowStart, nowIso, batch.length).all();
    trackQuery();
    
    const taskIdMap = new Map();
    for (const task of insertedTasks.results || []) {
      taskIdMap.set(task.client_service_id, task.task_id);
      insertedTaskIds.push(task.task_id);
    }
    
    // 5. 批量插入階段（從 Queue SOP 表讀取）
    const queueIds = batch.map(t => t.queue_id);
    const queuePlaceholders = queueIds.map(() => '?').join(',');
    
    const queueSOPs = await env.DATABASE.prepare(`
      SELECT qs.queue_id, qs.sop_id, qs.sort_order, q.client_service_id
      FROM TaskGenerationQueueSOPs qs
      INNER JOIN TaskGenerationQueue q ON qs.queue_id = q.queue_id
      WHERE qs.queue_id IN (${queuePlaceholders})
      ORDER BY qs.queue_id, qs.sort_order
    `).bind(...queueIds).all();
    trackQuery();
    
    // 按 task_id 分組 SOP
    const stageValues = [];
    const stageParams = [];
    
    for (const qsop of queueSOPs.results || []) {
      const taskId = taskIdMap.get(qsop.client_service_id);
      if (taskId) {
        stageValues.push('(?, ?, ?)');
        stageParams.push(taskId, qsop.sop_id, qsop.sort_order);
      }
    }
    
    // 批量插入階段
    if (stageValues.length > 0) {
      const STAGE_BATCH_SIZE = 500;
      for (let j = 0; j < stageValues.length; j += STAGE_BATCH_SIZE) {
        if (queryCount >= MAX_D1_QUERIES) break;
        
        const stageBatch = stageValues.slice(j, j + STAGE_BATCH_SIZE);
        const stageBatchParams = stageParams.slice(j * 3, (j + STAGE_BATCH_SIZE) * 3);
        
        await env.DATABASE.prepare(`
          INSERT INTO ActiveTaskStages (task_id, sop_id, sort_order)
          VALUES ${stageBatch.join(', ')}
        `).bind(...stageBatchParams).run();
        trackQuery();
      }
    }
    
    // 6. 批量更新 Queue 狀態（單一查詢）
    await env.DATABASE.prepare(`
      UPDATE TaskGenerationQueue 
      SET status = 'completed', processed_at = ?
      WHERE queue_id IN (${queuePlaceholders})
    `).bind(nowIso, ...queueIds).run();
    trackQuery();
    
    generatedCount += batch.length;
  }
  
  const duration = Date.now() - startTime;
  console.log(`[GenerateFromQueueV2] 完成：生成 ${generatedCount} 個任務，使用 ${queryCount} 次查詢，耗時 ${(duration / 1000).toFixed(2)} 秒`);
  
  return { generatedCount, skippedCount: items.length - generatedCount, queryCount };
}

// 輔助函數
function shouldGenerateInMonth(config, month, serviceContext) {
  const frequency = config.execution_frequency;
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

