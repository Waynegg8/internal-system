/**
 * 終極預聚合方案：基於數據穩定性的徹底重構
 * 
 * 核心思想：
 * 1. 客戶服務配置建立後變動不大
 * 2. 第一個月完整計算後，後續月份應該複用模板，而非重新計算
 * 3. SOP 綁定後只會編輯，不太會新增刪除
 * 4. 充分利用數據穩定性，大幅減少工作量
 * 
 * 工作流程：
 * 1. 第一次：完整計算並創建模板
 * 2. 後續月份：檢測變更，只重新計算變更的配置
 * 3. 應用模板：從模板生成 Queue，無需複雜計算
 * 4. 生成任務：從 Queue 直接插入，無需額外查詢
 */

// 在 Cloudflare Workers 環境中使用 Web Crypto API
// import crypto from 'crypto'; // Node.js crypto，在 Workers 中不可用

/**
 * 計算配置的哈希值，用於檢測變更
 */
/**
 * 計算配置的哈希值，用於檢測變更
 * 在 Cloudflare Workers 中使用 Web Crypto API
 */
async function calculateConfigHash(config) {
  const relevantFields = {
    task_name: config.task_name,
    task_description: config.task_description,
    assignee_user_id: config.assignee_user_id,
    estimated_hours: config.estimated_hours,
    stage_order: config.stage_order,
    notes: config.notes,
    generation_time_rule: config.generation_time_rule,
    generation_time_params: config.generation_time_params,
    due_rule: config.due_rule,
    due_value: config.due_value,
    days_due: config.days_due,
    advance_days: config.advance_days,
    is_fixed_deadline: config.is_fixed_deadline,
    execution_frequency: config.execution_frequency,
    execution_months: config.execution_months,
    effective_month: config.effective_month,
    auto_generate: config.auto_generate
  };
  
  const data = JSON.stringify(relevantFields);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 32); // 使用前32字符作為哈希（類似 MD5 長度）
}

// 同步版本（用於非異步上下文）
function calculateConfigHashSync(config) {
  const relevantFields = {
    task_name: config.task_name,
    task_description: config.task_description,
    assignee_user_id: config.assignee_user_id,
    estimated_hours: config.estimated_hours,
    stage_order: config.stage_order,
    notes: config.notes,
    generation_time_rule: config.generation_time_rule,
    generation_time_params: config.generation_time_params,
    due_rule: config.due_rule,
    due_value: config.due_value,
    days_due: config.days_due,
    advance_days: config.advance_days,
    is_fixed_deadline: config.is_fixed_deadline,
    execution_frequency: config.execution_frequency,
    execution_months: config.execution_months,
    effective_month: config.effective_month,
    auto_generate: config.auto_generate
  };
  
  // 簡單的字符串哈希（用於快速比較）
  const str = JSON.stringify(relevantFields);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * 創建或更新任務生成模板
 * 只在配置變更時才重新計算
 */
export async function syncTaskGenerationTemplates(env, options = {}) {
  const { force = false, ctx = null } = options;
  const startTime = Date.now();
  
  const MAX_D1_QUERIES = 50;
  let queryCount = 0;
  const trackQuery = () => {
    queryCount++;
    if (queryCount > MAX_D1_QUERIES) {
      console.warn(`[SyncTemplates] 超過 D1 查詢次數限制（${MAX_D1_QUERIES} 次）`);
    }
    return queryCount;
  };
  
  console.log(`[SyncTemplates] 開始同步任務生成模板，force=${force}`);
  
  // 1. 獲取所有需要自動生成的配置
  const respectServiceFlag = (env && env.USE_SERVICE_AUTO_FLAG === '0') ? false : true;
  
  const allConfigsSql = `
    SELECT 
      cs.client_service_id, cs.client_id, cs.service_id,
      cs.service_type, cs.execution_months, cs.use_for_auto_generate,
      tc.config_id, tc.task_name, tc.task_description, tc.assignee_user_id,
      tc.estimated_hours, tc.advance_days, tc.due_rule, tc.due_value, tc.days_due, tc.stage_order,
      tc.execution_frequency, tc.execution_months as config_execution_months, tc.effective_month,
      tc.generation_time_rule, tc.generation_time_params, tc.is_fixed_deadline, tc.notes, tc.auto_generate,
      c.company_name, s.service_name
    FROM ClientServices cs
    INNER JOIN Clients c ON cs.client_id = c.client_id AND c.is_deleted = 0
    INNER JOIN Services s ON cs.service_id = s.service_id
    INNER JOIN ClientServiceTaskConfigs tc ON tc.client_service_id = cs.client_service_id
      AND tc.is_deleted = 0 
      AND tc.auto_generate = 1
    WHERE cs.is_deleted = 0 
      AND cs.status = 'active'
      ${respectServiceFlag ? 'AND (cs.use_for_auto_generate = 1 OR cs.use_for_auto_generate IS NULL)' : ''}
      AND cs.service_type != 'one-time'
    ORDER BY cs.client_id, cs.client_service_id, tc.stage_order ASC, tc.config_id ASC
  `;
  
  const allConfigs = await env.DATABASE.prepare(allConfigsSql).all();
  trackQuery();
  
  const configs = allConfigs.results || [];
  console.log(`[SyncTemplates] 獲取 ${configs.length} 個需要自動生成的配置`);
  
  if (configs.length === 0) {
    return { syncedCount: 0, updatedCount: 0, createdCount: 0, queryCount };
  }
  
  // 2. 獲取現有模板
  const existingTemplates = await env.DATABASE.prepare(`
    SELECT template_id, client_service_id, config_id, config_hash, template_version
    FROM TaskGenerationTemplates
    WHERE is_active = 1
  `).all();
  trackQuery();
  
  const templateMap = new Map();
  for (const t of existingTemplates.results || []) {
    const key = `${t.client_service_id}_${t.config_id}`;
    templateMap.set(key, t);
  }
  
  // 3. 處理每個配置
  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  const templatesToUpdate = [];
  const templatesToCreate = [];
  const templateSOPs = new Map(); // 收集 SOP
  
  // 先獲取所有 SOP
  const configIds = [...new Set(configs.map(c => c.config_id))];
  const sopPlaceholders = configIds.map(() => '?').join(',');
  
  const allSOPs = await env.DATABASE.prepare(`
    SELECT tcs.config_id, tcs.sop_id, tcs.sort_order, s.sop_name, s.sop_url
    FROM TaskConfigSOPs tcs
    LEFT JOIN SOPs s ON tcs.sop_id = s.sop_id
    WHERE tcs.config_id IN (${sopPlaceholders})
    ORDER BY tcs.config_id, tcs.sort_order
  `).bind(...configIds).all();
  trackQuery();
  
  const sopMap = new Map();
  for (const sop of allSOPs.results || []) {
    if (!sopMap.has(sop.config_id)) {
      sopMap.set(sop.config_id, []);
    }
    sopMap.get(sop.config_id).push({
      sop_id: sop.sop_id,
      sort_order: sop.sort_order,
      sop_name: sop.sop_name,
      sop_url: sop.sop_url
    });
  }
  
  // 處理每個配置
  for (const config of configs) {
    const key = `${config.client_service_id}_${config.config_id}`;
    const configHash = calculateConfigHashSync(config); // 使用同步版本
    const existing = templateMap.get(key);
    
    // 檢查是否需要更新
    if (existing) {
      if (existing.config_hash === configHash && !force) {
        // 配置未變更，跳過
        unchangedCount++;
        continue;
      }
      
      // 配置變更，需要更新
      templatesToUpdate.push({
        template_id: existing.template_id,
        config,
        configHash,
        version: existing.template_version + 1
      });
      updatedCount++;
    } else {
      // 新配置，需要創建
      templatesToCreate.push({
        config,
        configHash
      });
      createdCount++;
    }
    
    // 收集 SOP
    const sops = sopMap.get(config.config_id) || [];
    if (sops.length > 0) {
      templateSOPs.set(key, sops);
    }
  }
  
  console.log(`[SyncTemplates] 需要創建 ${createdCount} 個，更新 ${updatedCount} 個，未變更 ${unchangedCount} 個`);
  
  // 4. 批量創建新模板
  if (templatesToCreate.length > 0) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < templatesToCreate.length; i += BATCH_SIZE) {
      if (queryCount >= MAX_D1_QUERIES) break;
      
      const batch = templatesToCreate.slice(i, i + BATCH_SIZE);
      const values = [];
      const params = [];
      
      for (const item of batch) {
        const c = item.config;
        values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'); // 30 placeholders
        params.push(
          c.client_id,
          c.client_service_id,
          c.config_id,
          c.service_id,
          c.task_name,
          c.task_description,
          c.assignee_user_id,
          c.estimated_hours,
          c.stage_order,
          c.notes,
          c.generation_time_rule,
          c.generation_time_params,
          c.due_rule,
          c.due_value,
          c.days_due,
          c.advance_days,
          c.is_fixed_deadline,
          c.execution_frequency,
          c.config_execution_months,
          c.effective_month,
          c.auto_generate,
          c.company_name,
          c.service_name,
          c.service_type,
          c.execution_months,
          1, // template_version
          item.configHash,
          null, // last_calculated_at
          null, // last_applied_month
          1 // is_active
        );
      }
      
      try {
        const result = await env.DATABASE.prepare(`
          INSERT INTO TaskGenerationTemplates 
          (client_id, client_service_id, config_id, service_id,
           task_name, task_description, assignee_user_id, estimated_hours, stage_order, notes,
           generation_time_rule, generation_time_params, due_rule, due_value, days_due, advance_days, is_fixed_deadline,
           execution_frequency, execution_months, effective_month, auto_generate,
           company_name, service_name, service_type, service_execution_months,
           template_version, config_hash, last_calculated_at, last_applied_month, is_active)
          VALUES ${values.join(', ')}
        `).bind(...params).run();
        trackQuery();
        
        // 查詢剛插入的 template_id
        const clientServiceIds = batch.map(item => item.config.client_service_id);
        const configIds = batch.map(item => item.config.config_id);
        const placeholders = clientServiceIds.map(() => '?').join(',');
        const configPlaceholders = configIds.map(() => '?').join(',');
        
        const insertedTemplates = await env.DATABASE.prepare(`
          SELECT template_id, client_service_id, config_id
          FROM TaskGenerationTemplates
          WHERE client_service_id IN (${placeholders})
            AND config_id IN (${configPlaceholders})
            AND is_active = 1
          ORDER BY template_id DESC
          LIMIT ?
        `).bind(...clientServiceIds, ...configIds, batch.length).all();
        trackQuery();
        
        // 插入 SOP
        const sopValues = [];
        const sopParams = [];
        const templateIdMap = new Map();
        
        for (const t of insertedTemplates.results || []) {
          const key = `${t.client_service_id}_${t.config_id}`;
          templateIdMap.set(key, t.template_id);
        }
        
        for (const item of batch) {
          const key = `${item.config.client_service_id}_${item.config.config_id}`;
          const templateId = templateIdMap.get(key);
          const sops = templateSOPs.get(key) || [];
          
          if (templateId && sops.length > 0) {
            for (const sop of sops) {
              sopValues.push('(?, ?, ?, ?, ?)');
              sopParams.push(templateId, sop.sop_id, sop.sort_order, sop.sop_name, sop.sop_url);
            }
          }
        }
        
        if (sopValues.length > 0) {
          const SOP_BATCH_SIZE = 500;
          for (let j = 0; j < sopValues.length; j += SOP_BATCH_SIZE) {
            if (queryCount >= MAX_D1_QUERIES) break;
            
            const sopBatch = sopValues.slice(j, j + SOP_BATCH_SIZE);
            const sopBatchParams = sopParams.slice(j * 5, (j + SOP_BATCH_SIZE) * 5);
            
            await env.DATABASE.prepare(`
              INSERT OR REPLACE INTO TaskGenerationTemplateSOPs 
              (template_id, sop_id, sort_order, sop_name, sop_url)
              VALUES ${sopBatch.join(', ')}
            `).bind(...sopBatchParams).run();
            trackQuery();
          }
        }
      } catch (err) {
        console.error(`[SyncTemplates] 批量創建失敗:`, err);
      }
    }
  }
  
  // 5. 批量更新現有模板
  if (templatesToUpdate.length > 0) {
    for (const item of templatesToUpdate) {
      if (queryCount >= MAX_D1_QUERIES) break;
      
      const c = item.config;
      await env.DATABASE.prepare(`
        UPDATE TaskGenerationTemplates
        SET task_name = ?, task_description = ?, assignee_user_id = ?, estimated_hours = ?, 
            stage_order = ?, notes = ?,
            generation_time_rule = ?, generation_time_params = ?, 
            due_rule = ?, due_value = ?, days_due = ?, advance_days = ?, is_fixed_deadline = ?,
            execution_frequency = ?, execution_months = ?, effective_month = ?, auto_generate = ?,
            company_name = ?, service_name = ?, service_type = ?, service_execution_months = ?,
            template_version = ?, config_hash = ?, updated_at = datetime('now')
        WHERE template_id = ?
      `).bind(
        c.task_name, c.task_description, c.assignee_user_id, c.estimated_hours, c.stage_order, c.notes,
        c.generation_time_rule, c.generation_time_params,
        c.due_rule, c.due_value, c.days_due, c.advance_days, c.is_fixed_deadline,
        c.execution_frequency, c.config_execution_months, c.effective_month, c.auto_generate,
        c.company_name, c.service_name, c.service_type, c.execution_months,
        item.version, item.configHash, item.template_id
      ).run();
      trackQuery();
      
      // 更新 SOP（刪除舊的，插入新的）
      const sops = templateSOPs.get(`${c.client_service_id}_${c.config_id}`) || [];
      
      await env.DATABASE.prepare(`
        DELETE FROM TaskGenerationTemplateSOPs WHERE template_id = ?
      `).bind(item.template_id).run();
      trackQuery();
      
      if (sops.length > 0) {
        const sopValues = [];
        const sopParams = [];
        for (const sop of sops) {
          sopValues.push('(?, ?, ?, ?, ?)');
          sopParams.push(item.template_id, sop.sop_id, sop.sort_order, sop.sop_name, sop.sop_url);
        }
        
        await env.DATABASE.prepare(`
          INSERT INTO TaskGenerationTemplateSOPs 
          (template_id, sop_id, sort_order, sop_name, sop_url)
          VALUES ${sopValues.join(', ')}
        `).bind(...sopParams).run();
        trackQuery();
      }
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`[SyncTemplates] 完成：創建 ${createdCount} 個，更新 ${updatedCount} 個，未變更 ${unchangedCount} 個，使用 ${queryCount} 次查詢，耗時 ${(duration / 1000).toFixed(2)} 秒`);
  
  return { syncedCount: createdCount + updatedCount, createdCount, updatedCount, unchangedCount, queryCount };
}

/**
 * 從模板生成 Queue（極致高效）
 * 只需要應用模板規則，計算生成時間和截止日期，無需複雜查詢
 */
export async function generateQueueFromTemplates(env, targetYear, targetMonth, options = {}) {
  const { now = new Date(), force = false, ctx = null } = options;
  const monthLabel = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const startTime = Date.now();
  
  const MAX_D1_QUERIES = 50;
  let queryCount = 0;
  const trackQuery = () => {
    queryCount++;
    if (queryCount > MAX_D1_QUERIES) {
      console.warn(`[GenerateQueueFromTemplates] 超過 D1 查詢次數限制（${MAX_D1_QUERIES} 次）`);
    }
    return queryCount;
  };
  
  console.log(`[GenerateQueueFromTemplates] 開始從模板生成 Queue for ${monthLabel}`);
  
  // 1. 檢查是否已有 Queue 數據
  const checkExisting = await env.DATABASE.prepare(`
    SELECT COUNT(*) as count 
    FROM TaskGenerationQueue 
    WHERE target_year = ? AND target_month = ? AND status = 'pending'
  `).bind(targetYear, targetMonth).first();
  trackQuery();
  
  const existingCount = checkExisting?.count || 0;
  if (existingCount > 0 && !force) {
    console.log(`[GenerateQueueFromTemplates] 已存在 ${existingCount} 個待處理的 Queue 項目，跳過`);
    return { queuedCount: existingCount, queryCount, skipped: true };
  }
  
  // 2. 清除舊的 Queue 數據（如果 force 模式）
  if (force && existingCount > 0) {
    await env.DATABASE.prepare(`
      DELETE FROM TaskGenerationQueueSOPs 
      WHERE queue_id IN (
        SELECT queue_id FROM TaskGenerationQueue 
        WHERE target_year = ? AND target_month = ?
      )
    `).bind(targetYear, targetMonth).run();
    trackQuery();
    
    await env.DATABASE.prepare(`
      DELETE FROM TaskGenerationQueue 
      WHERE target_year = ? AND target_month = ?
    `).bind(targetYear, targetMonth).run();
    trackQuery();
  }
  
  // 3. 從模板獲取所有活躍模板（單一查詢，包含所有數據）
  const templates = await env.DATABASE.prepare(`
    SELECT 
      t.template_id, t.client_id, t.client_service_id, t.service_id, t.config_id,
      t.task_name, t.task_description, t.assignee_user_id, t.estimated_hours, t.stage_order, t.notes,
      t.generation_time_rule, t.generation_time_params, t.due_rule, t.due_value, t.days_due, t.advance_days,
      t.is_fixed_deadline, t.execution_frequency, t.execution_months, t.effective_month,
      t.company_name, t.service_name, t.service_type, t.service_execution_months,
      t.template_version, t.config_hash
    FROM TaskGenerationTemplates t
    WHERE t.is_active = 1
    ORDER BY t.client_id, t.client_service_id, t.stage_order, t.config_id
  `).all();
  trackQuery();
  
  const templateList = templates.results || [];
  console.log(`[GenerateQueueFromTemplates] 獲取 ${templateList.length} 個活躍模板`);
  
  if (templateList.length === 0) {
    return { queuedCount: 0, queryCount, skipped: false };
  }
  
  // 4. 檢查已存在的任務（批量查詢）
  const clientServiceIds = [...new Set(templateList.map(t => t.client_service_id))];
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
  
  // 5. 導入日期計算工具
  const { 
    calculateGenerationTime, 
    calculateDueDate, 
    formatDate, 
    isFixedDeadlineTask 
  } = await import('../../utils/dateCalculators.js');
  
  // 6. 處理每個模板，計算生成時間和截止日期
  const queueItems = [];
  const queueSOPs = [];
  
  for (const template of templateList) {
    // 跳過已存在的任務（除非 force）
    if (!force && existingServiceIds.has(template.client_service_id)) {
      continue;
    }
    
    // 檢查是否應該在這個月份生成
    if (!force && !shouldGenerateInMonth(template, targetMonth)) {
      continue;
    }
    
    // 檢查配置是否生效
    if (!force && template.effective_month) {
      const [effYear, effMonth] = template.effective_month.split("-").map(n => parseInt(n, 10));
      if (!Number.isNaN(effYear) && !Number.isNaN(effMonth)) {
        if (targetYear < effYear || (targetYear === effYear && targetMonth < effMonth)) {
          continue;
        }
      }
    }
    
    // 計算截止日期
    const dueDate = calculateDueDate({
      due_rule: template.due_rule,
      due_value: template.due_value,
      days_due: template.days_due,
      advance_days: template.advance_days
    }, targetYear, targetMonth);
    
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      continue;
    }
    
    // 計算生成時間
    let generationTime = now;
    if (template.generation_time_rule && !force) {
      let generationParams = {};
      if (template.generation_time_params) {
        try {
          generationParams = typeof template.generation_time_params === 'string' 
            ? JSON.parse(template.generation_time_params) 
            : template.generation_time_params;
        } catch (err) {
          console.warn("[GenerateQueueFromTemplates] 無法解析 generation_time_params", err);
        }
      }
      
      const calculatedTime = calculateGenerationTime(
        template.generation_time_rule,
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
    
    // 準備 Queue 項目（所有數據都來自模板，無需額外查詢）
    queueItems.push({
      template_id: template.template_id,
      template_version: template.template_version,
      client_id: template.client_id,
      client_service_id: template.client_service_id,
      service_id: template.service_id,
      config_id: template.config_id,
      target_year: targetYear,
      target_month: targetMonth,
      generation_time: generationTime.toISOString(),
      due_date: formatDate(dueDate),
      is_fixed_deadline: template.is_fixed_deadline,
      status: 'pending',
      task_name: template.task_name,
      task_description: template.task_description,
      assignee_user_id: template.assignee_user_id,
      estimated_hours: template.estimated_hours,
      stage_order: template.stage_order,
      notes: template.notes,
      company_name: template.company_name,
      service_name: template.service_name,
      service_type: template.service_type
    });
  }
  
  console.log(`[GenerateQueueFromTemplates] 計算出 ${queueItems.length} 個待生成任務`);
  
  if (queueItems.length === 0) {
    return { queuedCount: 0, queryCount, skipped: false };
  }
  
  // 7. 批量插入 Queue（超大批次）
  const BATCH_SIZE = 200;
  let insertedCount = 0;
  const insertedQueueIds = [];
  
  console.log(`[GenerateQueueFromTemplates] 準備批量插入 ${queueItems.length} 個 Queue 項目`);
  
  for (let i = 0; i < queueItems.length; i += BATCH_SIZE) {
    if (queryCount >= MAX_D1_QUERIES) break;
    
    const batch = queueItems.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    
    for (const item of batch) {
      values.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      params.push(
        item.template_id,
        item.template_version,
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
      await env.DATABASE.prepare(`
        INSERT INTO TaskGenerationQueue 
        (template_id, template_version, client_id, client_service_id, service_id, config_id, 
         target_year, target_month, generation_time, due_date, is_fixed_deadline, status,
         task_name, task_description, assignee_user_id, estimated_hours, stage_order, notes,
         company_name, service_name, service_type)
        VALUES ${values.join(', ')}
      `).bind(...params).run();
      trackQuery();
      
      // 查詢剛插入的 queue_id
      const clientServiceIds = batch.map(t => t.client_service_id);
      const configIds = batch.map(t => t.config_id);
      const placeholders = clientServiceIds.map(() => '?').join(',');
      const configPlaceholders = configIds.map(() => '?').join(',');
      const timeWindowStart = new Date(Date.now() - 5000).toISOString();
      const timeWindowEnd = new Date().toISOString();
      
      const insertedQueues = await env.DATABASE.prepare(`
        SELECT queue_id, client_service_id, config_id, template_id
        FROM TaskGenerationQueue 
        WHERE client_service_id IN (${placeholders})
          AND config_id IN (${configPlaceholders})
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
          template_id: queue.template_id
        });
      }
      
      insertedCount += insertedQueues.results?.length || 0;
    } catch (err) {
      console.error(`[GenerateQueueFromTemplates] 批量插入失敗:`, err);
    }
  }
  
  // 8. 批量插入 SOP（從模板 SOP 表讀取，無需 JOIN）
  if (insertedQueueIds.length > 0) {
    const templateIds = [...new Set(insertedQueueIds.map(q => q.template_id))];
    const templatePlaceholders = templateIds.map(() => '?').join(',');
    
    const templateSOPs = await env.DATABASE.prepare(`
      SELECT template_id, sop_id, sort_order
      FROM TaskGenerationTemplateSOPs
      WHERE template_id IN (${templatePlaceholders})
      ORDER BY template_id, sort_order
    `).bind(...templateIds).all();
    trackQuery();
    
    const templateSOPMap = new Map();
    for (const tsop of templateSOPs.results || []) {
      if (!templateSOPMap.has(tsop.template_id)) {
        templateSOPMap.set(tsop.template_id, []);
      }
      templateSOPMap.get(tsop.template_id).push(tsop);
    }
    
    const sopValues = [];
    const sopParams = [];
    
    for (const queue of insertedQueueIds) {
      const sops = templateSOPMap.get(queue.template_id) || [];
      for (const sop of sops) {
        sopValues.push('(?, ?, ?)');
        sopParams.push(queue.queue_id, sop.sop_id, sop.sort_order);
      }
    }
    
    if (sopValues.length > 0) {
      const SOP_BATCH_SIZE = 500;
      for (let i = 0; i < sopValues.length; i += SOP_BATCH_SIZE) {
        if (queryCount >= MAX_D1_QUERIES) break;
        
        const batch = sopValues.slice(i, i + SOP_BATCH_SIZE);
        const batchParams = sopParams.slice(i * 3, (i + SOP_BATCH_SIZE) * 3);
        
        await env.DATABASE.prepare(`
          INSERT OR IGNORE INTO TaskGenerationQueueSOPs (queue_id, sop_id, sort_order)
          VALUES ${batch.join(', ')}
        `).bind(...batchParams).run();
        trackQuery();
      }
    }
  }
  
  // 9. 更新模板的 last_applied_month
  const appliedTemplateIds = [...new Set(insertedQueueIds.map(q => q.template_id))];
  if (appliedTemplateIds.length > 0) {
    const appliedPlaceholders = appliedTemplateIds.map(() => '?').join(',');
    await env.DATABASE.prepare(`
      UPDATE TaskGenerationTemplates
      SET last_applied_month = ?, last_calculated_at = datetime('now')
      WHERE template_id IN (${appliedPlaceholders})
    `).bind(monthLabel, ...appliedTemplateIds).run();
    trackQuery();
  }
  
  const duration = Date.now() - startTime;
  console.log(`[GenerateQueueFromTemplates] 完成：生成 ${insertedCount} 個 Queue 項目，使用 ${queryCount} 次查詢，耗時 ${(duration / 1000).toFixed(2)} 秒`);
  
  return { queuedCount: insertedCount, queryCount, skipped: false };
}

// 輔助函數
function shouldGenerateInMonth(template, month) {
  const frequency = template.execution_frequency;
  const serviceMonths = parseJsonArray(template.service_execution_months);
  const executionMonths = parseJsonArray(template.execution_months);
  
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

