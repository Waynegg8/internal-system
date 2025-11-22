/**
 * 預聚合邏輯：預先計算需要生成的任務
 * 
 * 核心思想：
 * 1. 在生成任務前，先計算所有需要生成的任務並存入 TaskGenerationQueue
 * 2. 生成時只需從 Queue 表讀取，減少複雜的 JOIN 查詢
 * 3. 減少寫入次數，因為可以批量處理
 */

/**
 * 預先計算需要生成的任務並存入 TaskGenerationQueue
 * @param {*} env - Cloudflare environment
 * @param {number} targetYear - 目標年份
 * @param {number} targetMonth - 目標月份
 * @param {object} options - 選項 { now, force, ctx }
 * @returns {Promise<{queuedCount: number, queryCount: number}>}
 */
export async function preAggregateTasks(env, targetYear, targetMonth, options = {}) {
  const { now = new Date(), force = false, ctx = null } = options;
  const monthLabel = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const startTime = Date.now();
  
  const MAX_D1_QUERIES = 50;
  let queryCount = 0;
  const trackQuery = () => {
    queryCount++;
    if (queryCount > MAX_D1_QUERIES) {
      console.warn(`[PreAggregation] 超過 D1 查詢次數限制（${MAX_D1_QUERIES} 次）`);
    }
    return queryCount;
  };
  
  console.log(`[PreAggregation] 開始為 ${monthLabel} 預聚合任務，force=${force}`);
  
  // 1. 檢查是否已經有預聚合數據
  const checkExisting = await env.DATABASE.prepare(`
    SELECT COUNT(*) as count 
    FROM TaskGenerationQueue 
    WHERE target_year = ? AND target_month = ? AND status = 'pending'
  `).bind(targetYear, targetMonth).first();
  trackQuery();
  
  const existingCount = checkExisting?.count || 0;
  if (existingCount > 0 && !force) {
    console.log(`[PreAggregation] 已存在 ${existingCount} 個待處理的預聚合任務，跳過重新計算`);
    return { queuedCount: existingCount, queryCount, skipped: true };
  }
  
  // 2. 清除舊的預聚合數據（如果 force 模式）
  if (force && existingCount > 0) {
    await env.DATABASE.prepare(`
      DELETE FROM TaskGenerationQueue 
      WHERE target_year = ? AND target_month = ?
    `).bind(targetYear, targetMonth).run();
    trackQuery();
    console.log(`[PreAggregation] 已清除舊的預聚合數據`);
  }
  
  // 3. 查詢所有需要生成的任務（單一查詢獲取所有數據）
  const respectServiceFlag = (env && env.USE_SERVICE_AUTO_FLAG === '0') ? false : true;
  
  const allDataSql = `
    SELECT 
      cs.client_service_id, cs.client_id, cs.service_id,
      cs.service_type, cs.execution_months, cs.use_for_auto_generate,
      tc.config_id, tc.task_name, tc.assignee_user_id,
      tc.estimated_hours, tc.advance_days, tc.due_rule, tc.due_value, tc.days_due, tc.stage_order,
      tc.execution_frequency, tc.execution_months as config_execution_months, tc.effective_month,
      tc.generation_time_rule, tc.generation_time_params, tc.is_fixed_deadline,
      c.company_name, s.service_name
    FROM ClientServices cs
    INNER JOIN Clients c ON cs.client_id = c.client_id AND c.is_deleted = 0
    INNER JOIN Services s ON cs.service_id = s.service_id
    INNER JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id
      AND tc.is_deleted = 0 
      AND tc.auto_generate = 1
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
    ORDER BY cs.client_id, cs.client_service_id, tc.stage_order ASC, tc.config_id ASC
  `;
  
  const bindParams = force ? [] : [targetYear, targetMonth];
  const allData = await env.DATABASE.prepare(allDataSql);
  const boundQuery = bindParams.length > 0 ? allData.bind(...bindParams) : allData;
  const result = await boundQuery.all();
  trackQuery();
  
  const allDataRows = (result.results || []).length;
  console.log(`[PreAggregation] 查詢獲取 ${allDataRows} 行數據，使用 ${queryCount} 次查詢`);
  
  if (allDataRows === 0) {
    return { queuedCount: 0, queryCount, skipped: false };
  }
  
  // 4. 處理數據並計算生成時間和截止日期
  // 導入必要的工具函數
  const { 
    calculateGenerationTime, 
    calculateDueDate, 
    formatDate, 
    isFixedDeadlineTask 
  } = await import('../../utils/dateCalculators.js');
  
  const queueItems = [];
  const processedServices = new Set(); // 避免重複（每個服務只生成一個任務）
  
  for (const row of result.results || []) {
    const serviceKey = `${row.client_service_id}_${row.config_id}`;
    if (processedServices.has(serviceKey)) continue;
    processedServices.add(serviceKey);
    
    // 只處理第一階段配置（stage_order最小的）
    // 這裡假設數據已按 stage_order 排序
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
          console.warn("[PreAggregation] 無法解析 generation_time_params", err);
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
    
    queueItems.push({
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
      status: 'pending'
    });
  }
  
  console.log(`[PreAggregation] 計算出 ${queueItems.length} 個待生成任務`);
  
  if (queueItems.length === 0) {
    return { queuedCount: 0, queryCount, skipped: false };
  }
  
  // 5. 批量插入到 TaskGenerationQueue（分批處理以避免 SQL 變數限制）
  const BATCH_SIZE = 100; // 每個項目約10個參數，100個項目 = 1000個參數
  let insertedCount = 0;
  
  for (let i = 0; i < queueItems.length; i += BATCH_SIZE) {
    if (queryCount >= MAX_D1_QUERIES) {
      console.log(`[PreAggregation] 達到查詢次數限制，停止插入。已插入 ${insertedCount} 個任務`);
      break;
    }
    
    const batch = queueItems.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    
    for (const item of batch) {
      values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
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
        item.status
      );
    }
    
    try {
      await env.DATABASE.prepare(`
        INSERT INTO TaskGenerationQueue 
        (client_id, client_service_id, service_id, config_id, target_year, target_month, 
         generation_time, due_date, is_fixed_deadline, status)
        VALUES ${values.join(', ')}
        ON CONFLICT(client_service_id, config_id, target_year, target_month) DO NOTHING
      `).bind(...params).run();
      trackQuery();
      insertedCount += batch.length;
    } catch (err) {
      console.error(`[PreAggregation] 批量插入失敗:`, err);
      // 如果 ON CONFLICT 不支持，嘗試逐個插入
      for (const item of batch) {
        try {
          await env.DATABASE.prepare(`
            INSERT OR IGNORE INTO TaskGenerationQueue 
            (client_id, client_service_id, service_id, config_id, target_year, target_month, 
             generation_time, due_date, is_fixed_deadline, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            item.client_id, item.client_service_id, item.service_id, item.config_id,
            item.target_year, item.target_month, item.generation_time, item.due_date,
            item.is_fixed_deadline, item.status
          ).run();
          trackQuery();
          insertedCount++;
        } catch (singleErr) {
          console.error(`[PreAggregation] 單個插入失敗:`, singleErr);
        }
      }
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`[PreAggregation] 完成：預聚合 ${insertedCount} 個任務，使用 ${queryCount} 次查詢，耗時 ${(duration / 1000).toFixed(2)} 秒`);
  
  return { queuedCount: insertedCount, queryCount, skipped: false };
}

/**
 * 從 TaskGenerationQueue 生成任務
 * @param {*} env - Cloudflare environment
 * @param {number} targetYear - 目標年份
 * @param {number} targetMonth - 目標月份
 * @param {object} options - 選項 { now, force, ctx }
 * @returns {Promise<{generatedCount: number, skippedCount: number, queryCount: number}>}
 */
export async function generateTasksFromQueue(env, targetYear, targetMonth, options = {}) {
  const { now = new Date(), force = false, ctx = null } = options;
  const monthLabel = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const startTime = Date.now();
  
  const MAX_D1_QUERIES = 50;
  let queryCount = 0;
  const trackQuery = () => {
    queryCount++;
    if (queryCount > MAX_D1_QUERIES) {
      console.warn(`[GenerateFromQueue] 超過 D1 查詢次數限制（${MAX_D1_QUERIES} 次）`);
    }
    return queryCount;
  };
  
  console.log(`[GenerateFromQueue] 開始從 Queue 生成任務 for ${monthLabel}`);
  
  // 1. 從 Queue 獲取待處理任務（單一查詢）
  const queueItems = await env.DATABASE.prepare(`
    SELECT 
      q.queue_id, q.client_id, q.client_service_id, q.service_id, q.config_id,
      q.generation_time, q.due_date, q.is_fixed_deadline,
      tc.task_name, tc.task_description, tc.assignee_user_id,
      tc.estimated_hours, tc.stage_order, tc.notes,
      cs.service_type, c.company_name, s.service_name
    FROM TaskGenerationQueue q
    INNER JOIN ClientServiceTaskConfigs tc ON q.config_id = tc.config_id
    INNER JOIN ClientServices cs ON q.client_service_id = cs.client_service_id
    INNER JOIN Clients c ON q.client_id = c.client_id
    INNER JOIN Services s ON q.service_id = s.service_id
    WHERE q.target_year = ? AND q.target_month = ? 
      AND q.status = 'pending'
    ORDER BY q.client_id, q.client_service_id, q.queue_id
    LIMIT 1000
  `).bind(targetYear, targetMonth).all();
  trackQuery();
  
  const items = queueItems.results || [];
  console.log(`[GenerateFromQueue] 從 Queue 獲取 ${items.length} 個待處理任務`);
  
  if (items.length === 0) {
    return { generatedCount: 0, skippedCount: 0, queryCount };
  }
  
  // 2. 批量插入任務
  const { formatDate } = await import('../../utils/dateCalculators.js');
  const nowIso = now.toISOString();
  const tasksToInsert = [];
  const taskConfigMap = new Map(); // 收集配置信息
  
  for (const item of items) {
    // 檢查是否已存在任務
    const existing = await env.DATABASE.prepare(`
      SELECT task_id FROM ActiveTasks 
      WHERE client_service_id = ? AND service_year = ? AND service_month = ? AND is_deleted = 0
      LIMIT 1
    `).bind(item.client_service_id, targetYear, targetMonth).first();
    trackQuery();
    
    if (existing) {
      // 更新 Queue 狀態為 completed
      await env.DATABASE.prepare(`
        UPDATE TaskGenerationQueue 
        SET status = 'completed', processed_at = ?
        WHERE queue_id = ?
      `).bind(nowIso, item.queue_id).run();
      trackQuery();
      continue;
    }
    
    tasksToInsert.push({
      queue_id: item.queue_id,
      client_id: item.client_id,
      client_service_id: item.client_service_id,
      service_id: item.service_id,
      config_id: item.config_id,
      task_name: item.task_name,
      task_description: item.task_description,
      assignee_user_id: item.assignee_user_id,
      estimated_hours: item.estimated_hours,
      stage_order: item.stage_order,
      notes: item.notes,
      due_date: item.due_date,
      is_fixed_deadline: item.is_fixed_deadline
    });
    
    // 收集配置信息
    if (!taskConfigMap.has(item.config_id)) {
      taskConfigMap.set(item.config_id, {
        config_id: item.config_id,
        stage_order: item.stage_order
      });
    }
  }
  
  console.log(`[GenerateFromQueue] 準備插入 ${tasksToInsert.length} 個任務`);
  
  if (tasksToInsert.length === 0) {
    return { generatedCount: 0, skippedCount: items.length, queryCount };
  }
  
  // 3. 批量插入任務（優化：減少寫入次數）
  const TASK_BATCH_SIZE = 50;
  let generatedCount = 0;
  const insertedTaskIds = [];
  
  for (let i = 0; i < tasksToInsert.length; i += TASK_BATCH_SIZE) {
    if (queryCount >= MAX_D1_QUERIES) {
      console.log(`[GenerateFromQueue] 達到查詢次數限制，停止插入。已插入 ${generatedCount} 個任務`);
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
        task.task_name,
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
    await env.DATABASE.prepare(`
      INSERT INTO ActiveTasks 
      (client_id, client_service_id, service_id, task_config_id, task_type,
       task_description, assignee_user_id, service_year, service_month,
       due_date, original_due_date, estimated_hours, stage_order, notes, status, 
       is_fixed_deadline, created_at, updated_at)
      VALUES ${taskValues.join(', ')}
    `).bind(...taskParams).run();
    trackQuery();
    
    // 查詢剛插入的任務ID
    const clientServiceIds = batch.map(t => t.client_service_id);
    const placeholders = clientServiceIds.map(() => '?').join(',');
    const timeWindowStart = new Date(now.getTime() - 5000).toISOString();
    
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
    trackQuery();
    
    const taskIdMap = new Map();
    for (const task of insertedTasks.results || []) {
      taskIdMap.set(task.client_service_id, task.task_id);
      insertedTaskIds.push(task.task_id);
    }
    
    // 更新 Queue 狀態
    for (const task of batch) {
      const taskId = taskIdMap.get(task.client_service_id);
      if (taskId) {
        await env.DATABASE.prepare(`
          UPDATE TaskGenerationQueue 
          SET status = 'completed', processed_at = ?
          WHERE queue_id = ?
        `).bind(nowIso, task.queue_id).run();
        trackQuery();
        generatedCount++;
      }
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`[GenerateFromQueue] 完成：生成 ${generatedCount} 個任務，使用 ${queryCount} 次查詢，耗時 ${(duration / 1000).toFixed(2)} 秒`);
  
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

