/**
 * 任務自動生成器（重構版）
 * 基於 ClientServiceTaskConfigs，直接生成 ActiveTasks
 */

// 導入日期計算工具
import { calculateDueDate, calculateGenerationTime, isFixedDeadlineTask, formatDate } from "../../utils/dateCalculators.js";

const SYSTEM_TRIGGER = "system:auto_generate";

function parseJsonArray(value) {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return null;
    // 確保數組元素是數字（用於月份比較）
    return parsed.map(item => {
      const num = Number(item);
      return Number.isInteger(num) ? num : item;
    });
  } catch (err) {
    console.warn("[TaskGenerator] 無法解析 JSON 陣列", value, err);
    return null;
  }
}

// calculateDueDate, calculateGenerationTime, isFixedDeadlineTask, formatDate 已從 dateCalculators.js 導入

/**
 * 檢查配置是否在指定月份生效
 */
function isConfigEffectiveInMonth(config, targetYear, targetMonth) {
  if (!config.effective_month) return true;
  const [effYear, effMonth] = config.effective_month.split("-").map((n) => parseInt(n, 10));
  if (Number.isNaN(effYear) || Number.isNaN(effMonth)) return true;
  if (targetYear < effYear) return false;
  if (targetYear === effYear && targetMonth < effMonth) return false;
  return true;
}

/**
 * 檢查配置是否應該在指定月份生成任務
 */
function shouldGenerateInMonth(config, month, serviceContext) {
  const frequency = config.execution_frequency || config.delivery_frequency;
  const serviceMonths = serviceContext ? parseJsonArray(serviceContext.execution_months) : null;
  const executionMonths = parseJsonArray(config.execution_months);

  // 如果指定了具體月份（優先使用）
  // 確保month是數字進行比較
  const targetMonth = Number(month);
  if (serviceMonths && Array.isArray(serviceMonths) && serviceMonths.length > 0) {
    return serviceMonths.includes(targetMonth);
  }
  if (executionMonths && Array.isArray(executionMonths) && executionMonths.length > 0) {
    return executionMonths.includes(targetMonth);
  }

  // 根據頻率判斷
  switch (frequency) {
    case "monthly":
      return true; // 每月執行

    case "bi-monthly":
      return month % 2 === 1; // 奇數月（1,3,5,7,9,11）

    case "quarterly":
      return [1, 4, 7, 10].includes(month); // 每季第一個月

    case "semi-annual":
      return [1, 7].includes(month); // 半年（1,7月）

    case "annual":
    case "yearly":
      return month === 1; // 年度（僅1月）

    case "one-time":
      return false; // 一次性，不自動生成

    default:
      return true; // 預設每月執行
  }
}

// formatDate 已從 dateCalculators.js 導入

async function logTaskEvent(env, { taskId, configId, eventType, payload, triggeredBy = SYSTEM_TRIGGER }) {
  try {
    await env.DATABASE.prepare(
      `INSERT INTO TaskEventLogs (task_id, config_id, event_type, triggered_by, payload_json)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(taskId, configId, eventType, triggeredBy, JSON.stringify(payload || {}))
      .run();
  } catch (err) {
    console.warn("[TaskGenerator] 無法寫入 TaskEventLogs", err);
  }
}

/**
 * 為指定年月生成任務
 */
export async function generateTasksForMonth(env, targetYear, targetMonth, options = {}) {
  const { now = new Date(), force = false, ctx = null } = options;
  const monthLabel = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  const startTime = Date.now();
  const queryTimings = []; // 記錄每次查詢的時間
  
  // 免費版 Cloudflare Workers 限制：每次 Worker 呼叫最多 50 次 D1 查詢
  const MAX_D1_QUERIES = 50; // 使用免費版上限，force模式下盡可能處理更多
  let queryCount = 0;
  const trackQuery = (queryName = '') => {
    queryCount++;
    if (queryCount > MAX_D1_QUERIES) {
      console.warn(`[TaskGenerator] 警告：超過 D1 查詢次數限制（${MAX_D1_QUERIES} 次），當前已執行 ${queryCount} 次查詢`);
    }
    return queryCount;
  };
  
  const shouldStopDueToQueryLimit = () => {
    return queryCount >= MAX_D1_QUERIES;
  };
  
  // 記錄查詢時間的輔助函數
  const logQueryTime = (queryName, startTime) => {
    const duration = Date.now() - startTime;
    queryTimings.push({ query: queryName, duration, count: queryCount });
    return duration;
  };
  
  console.log(`[TaskGenerator] 開始為 ${monthLabel} 生成任務（免費版限制：最多 ${MAX_D1_QUERIES} 次 D1 查詢），force=${force}`);

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

  // 一個大的 JOIN 查詢獲取所有需要的數據：客戶服務 + 任務配置 + SOP
  // 這樣每個客戶只需要查一次，而不是分別查詢配置、SOP等
  const respectServiceFlag = (env && env.USE_SERVICE_AUTO_FLAG === '0') ? false : true;
  
  // 查詢 1：獲取所有客戶服務及其任務配置和 SOP，同時排除已存在任務
  // 關鍵優化：使用EXISTS子查詢在一個查詢中完成，避免後續額外查詢
  // 這實現真正的增量式生成：只獲取需要生成的數據
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
      -- 關鍵優化：使用EXISTS排除已存在任務，實現真正的增量式生成
      -- force模式下取消增量生成，強制生成所有任務（移除NOT EXISTS檢查）
      ${force ? '' : `AND NOT EXISTS (
        SELECT 1 FROM ActiveTasks at
        WHERE at.client_service_id = cs.client_service_id
          AND at.service_year = ?
          AND at.service_month = ?
          AND at.is_deleted = 0
        LIMIT 1
      )`}
      ${respectServiceFlag ? 'AND (cs.use_for_auto_generate = 1 OR cs.use_for_auto_generate IS NULL)' : ''}
    ORDER BY cs.client_id, cs.client_service_id, tc.stage_order ASC, tc.config_id ASC, sops.sort_order ASC
  `;
  
  const query1Start = Date.now();
  // force模式下不綁定targetYear和targetMonth（因為NOT EXISTS被移除）
  const bindParams = force ? [] : [targetYear, targetMonth];
  const allData = await env.DATABASE.prepare(allDataSql);
  const boundQuery = bindParams.length > 0 ? allData.bind(...bindParams) : allData;
  const result = await boundQuery.all();
  trackQuery('get_all_data');
  const query1Duration = logQueryTime('get_all_data_with_exists', query1Start);
  const allDataRows = (result.results || []).length;
  console.log(`[TaskGenerator] 查詢1-獲取所有數據（EXISTS排除已存在）：${allDataRows} 行，耗時 ${query1Duration}ms`);
  
  // 在內存中組織數據：按客戶服務分組配置和 SOP
  const clientServicesMap = new Map(); // client_service_id -> { cs, configs: [{ config, sops: [] }] }
  const allClientServiceIds = [];
  
  for (const row of result.results || []) {
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
        configs: new Map() // config_id -> { config, sops: [] }
      });
      allClientServiceIds.push(clientServiceId);
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
    
    // 添加 SOP（如果存在）
    if (row.sop_id) {
      serviceData.configs.get(configId).sops.push({
        sop_id: row.sop_id,
        sort_order: row.sort_order
      });
    }
  }
  
  const totalServices = allClientServiceIds.length;
  console.log(`[TaskGenerator] 一個查詢獲取所有數據：${totalServices} 個客戶服務`);

  // 優化：不再需要單獨查詢檢查已存在任務
  // 因為在主查詢中已經使用EXISTS排除了已存在的任務
  // 這減少了至少1次查詢，大幅提升性能
  const existingTasksMap = new Map(); // 保持兼容性，但實際上已經在主查詢中過濾了
  console.log(`[TaskGenerator] 真正的增量式生成：主查詢已排除已存在任務，無需額外檢查，減少1次查詢`);

  console.log(`[TaskGenerator] 初始查詢完成，已使用 ${queryCount} 次 D1 查詢，剩餘 ${MAX_D1_QUERIES - queryCount} 次可用`);

  const nowIso = new Date().toISOString();
  
  // 按客戶分組服務，然後按客戶批量處理
  const clientsMap = new Map(); // client_id -> [serviceData]
  
  for (const [clientServiceId, serviceData] of clientServicesMap.entries()) {
    const clientId = serviceData.cs.client_id;
    if (!clientsMap.has(clientId)) {
      clientsMap.set(clientId, []);
    }
    clientsMap.get(clientId).push(serviceData);
  }
  
  const totalClients = clientsMap.size;
  const totalServicesInMap = Array.from(clientsMap.values()).reduce((sum, services) => sum + services.length, 0);
  console.log(`[TaskGenerator] 按客戶分組：${totalClients} 個客戶，${totalServicesInMap} 個服務（allDataSql返回 ${allDataRows} 行，對應 ${totalServices} 個唯一服務）`);
  
  // 檢查前幾個客戶的服務數量
  const firstFewClients = Array.from(clientsMap.entries()).slice(0, 5);
  for (const [clientId, services] of firstFewClients) {
    console.log(`[TaskGenerator] 客戶 ${clientId} 有 ${services.length} 個服務`);
  }
  
  // 限制每次處理的客戶數量，確保查詢次數在限制內
  // 每個客戶約需 4 次查詢（插入任務 + 查詢 task_id + 插入階段 + 更新任務）
  // 初始查詢約 2 次，剩餘 48 次可處理 12 個客戶
  // 臨時增加以測試批量生成性能
  // force模式下盡可能處理更多客戶
  // 移除客戶數量限制，改為依賴查詢次數限制來控制
  // 這樣可以處理更多客戶，直到真正達到查詢次數限制
  const MAX_CLIENTS_PER_RUN = force ? 1000 : 12; // force模式下不限制客戶數量，依賴查詢次數限制
  const allClients = Array.from(clientsMap.entries());
  const clientsToProcess = allClients.slice(0, MAX_CLIENTS_PER_RUN);
  
  const firstFewClientIds = clientsToProcess.slice(0, 5).map(([id]) => id).join(', ');
  console.log(`[TaskGenerator] 將處理 ${clientsToProcess.length} 個客戶（限制：${MAX_CLIENTS_PER_RUN}），總共 ${totalClients} 個客戶，前5個客戶：${firstFewClientIds}`);
  
  let processedCount = 0;
  
  let clientsProcessedCount = 0;
  let clientsWithTasksCount = 0;
  
  // 按客戶處理
  for (const [clientId, clientServiceDataList] of clientsToProcess) {
    clientsProcessedCount++;
    console.log(`[TaskGenerator] 開始處理客戶 ${clientId} (${clientsProcessedCount}/${clientsToProcess.length})，有 ${clientServiceDataList.length} 個服務`);
    
    // 檢查查詢次數限制 - 在處理每個客戶前檢查
    if (shouldStopDueToQueryLimit()) {
      console.log(`[TaskGenerator] 已達到 D1 查詢次數限制（${queryCount}/${MAX_D1_QUERIES}），提前退出。已處理 ${clientsProcessedCount} 個客戶`);
      break;
    }
    
    // 收集該客戶的所有任務數據
    const tasksToInsert = [];
    let clientSkippedCount = 0;
    
    let servicesProcessedInClient = 0;
    let servicesSkippedInClient = 0;
    
    console.log(`[TaskGenerator] 客戶 ${clientId} 開始處理，共有 ${clientServiceDataList.length} 個服務`);
    
    let servicesAddedToInsert = 0;
    
    for (const serviceData of clientServiceDataList) {
      servicesProcessedInClient++;
      const cs = serviceData.cs;
      const configsMap = serviceData.configs;
      
      const configList = Array.from(configsMap.values())
        .map(item => item.config)
        .filter(c => Number(c.auto_generate ?? 1) !== 0);
      
      console.log(`[TaskGenerator] 處理服務 ${cs.client_service_id}: ${configsMap.size} 個配置，${configList.length} 個auto_generate配置`);
      
      if (!configList.length) {
        skippedCount++;
        clientSkippedCount++;
        servicesSkippedInClient++;
        skipReasons.noConfig++;
        console.log(`[TaskGenerator] 跳過服務 ${cs.client_service_id}: 沒有auto_generate配置`);
        continue;
      }
      
      // 增量式生成：檢查是否已存在該客戶服務在當月的任務
      // 如果已存在，完全跳過，繼續處理下一個
      if (existingTasksMap.has(cs.client_service_id)) {
        skippedCount++;
        clientSkippedCount++;
        skipReasons.existingTask++;
        continue;
      }

      // 配置已經按 stage_order 排序（在 SQL 中 ORDER BY）
      const sortedConfigs = configList;

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
      const primaryConfig = primaryStage.config;

      // 判斷生效月份
      // force模式下跳過此檢查，強制生成
      if (!force && !isConfigEffectiveInMonth(primaryConfig, targetYear, targetMonth)) {
        skippedCount++;
        clientSkippedCount++;
        servicesSkippedInClient++;
        skipReasons.notEffective++;
        console.log(`[TaskGenerator] 跳過服務 ${cs.client_service_id}: 配置未生效 (effective_month=${primaryConfig.effective_month})`);
        continue;
      }

      // 服務層控管：一次性服務永遠跳過，未啟用自動生成在非force模式下跳過
      // force模式下只跳過one-time，不跳過use_for_auto_generate檢查
      if (cs.service_type === 'one-time') {
        skippedCount++;
        clientSkippedCount++;
        servicesSkippedInClient++;
        skipReasons.serviceType++;
        console.log(`[TaskGenerator] 跳過服務 ${cs.client_service_id}: one-time服務永遠跳過`);
        continue;
      }
      if (!force && Number(cs.use_for_auto_generate ?? 0) === 0) {
        skippedCount++;
        clientSkippedCount++;
        servicesSkippedInClient++;
        skipReasons.serviceType++;
        console.log(`[TaskGenerator] 跳過服務 ${cs.client_service_id}: use_for_auto_generate=0, force=${force}`);
        continue;
      }

      // 檢查是否應該在這個月份生成（以第一階段為基準，優先服務層設定）
      // force模式下跳過此檢查，強制生成
      const shouldGenerateInThisMonth = force || shouldGenerateInMonth(primaryConfig, targetMonth, cs);
      if (!shouldGenerateInThisMonth) {
        skippedCount++;
        clientSkippedCount++;
        servicesSkippedInClient++;
        skipReasons.notInMonth++;
        console.log(`[TaskGenerator] 跳過服務 ${cs.client_service_id}: 不應該在這個月份生成 (targetMonth=${targetMonth}, execution_frequency=${primaryConfig.execution_frequency}, execution_months=${primaryConfig.execution_months}, cs.execution_months=${cs.execution_months}, force=${force})`);
        continue;
      }

      // 計算截止日期（以第一階段設定為主）
      const dueDate = calculateDueDate(primaryConfig, targetYear, targetMonth);
      if (!dueDate || Number.isNaN(dueDate.getTime())) {
        skippedCount++;
        clientSkippedCount++;
        servicesSkippedInClient++;
        skipReasons.dueDateError++;
        console.log(`[TaskGenerator] 跳過服務 ${cs.client_service_id}: dueDate計算錯誤`);
        continue;
      }

      // 檢查生成時間是否到達（使用新的 generation_time_rule 或回退到 advance_days）
      let shouldGenerate = false;
      let generationTime = null;
      
      try {
        // 解析生成時間規則參數
        let generationParams = {};
        if (primaryConfig.generation_time_params) {
          try {
            generationParams = typeof primaryConfig.generation_time_params === 'string' 
              ? JSON.parse(primaryConfig.generation_time_params) 
              : primaryConfig.generation_time_params;
          } catch (err) {
            console.warn("[TaskGenerator] 無法解析 generation_time_params", primaryConfig.generation_time_params, err);
          }
        }

        // 如果配置了 generation_time_rule，使用新規則計算生成時間
        if (primaryConfig.generation_time_rule) {
          generationTime = calculateGenerationTime(
            primaryConfig.generation_time_rule,
            generationParams,
            targetYear,
            targetMonth,
            null, // advanceDays
            null  // dueDate
          );
          
          if (generationTime && !Number.isNaN(generationTime.getTime())) {
            // 檢查當前時間是否已到達生成時間（允許當天生成）
            const generationDate = new Date(generationTime);
            generationDate.setHours(0, 0, 0, 0);
            const nowDate = new Date(now);
            nowDate.setHours(0, 0, 0, 0);
            shouldGenerate = force || nowDate >= generationDate;
          } else {
            // 生成時間計算失敗，回退到 advance_days 邏輯
            console.warn("[TaskGenerator] generation_time_rule 計算失敗，回退到 advance_days 邏輯", {
              client_service_id: cs.client_service_id,
              rule: primaryConfig.generation_time_rule,
              params: generationParams
            });
            generationTime = null;
          }
        }

        // 如果沒有配置 generation_time_rule 或計算失敗，回退到 advance_days 邏輯
        if (!generationTime) {
          const advanceDays = Number.isFinite(primaryConfig.advance_days)
            ? Number(primaryConfig.advance_days)
            : 7;
          const thresholdDate = new Date(dueDate);
          thresholdDate.setDate(thresholdDate.getDate() - Math.max(advanceDays, 0));
          shouldGenerate = force || now >= thresholdDate;
          if (shouldGenerate) {
            // 使用 advance_days 邏輯時，生成時間為當前時間
            generationTime = now;
          }
        }
      } catch (err) {
        console.warn("[TaskGenerator] 生成時間檢查異常", cs.client_service_id, err);
        // 發生錯誤時，使用 advance_days 邏輯
        const advanceDays = Number.isFinite(primaryConfig.advance_days)
          ? Number(primaryConfig.advance_days)
          : 7;
        const thresholdDate = new Date(dueDate);
        thresholdDate.setDate(thresholdDate.getDate() - Math.max(advanceDays, 0));
        shouldGenerate = force || now >= thresholdDate;
        if (shouldGenerate) {
          generationTime = now;
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

      // 獲取 is_fixed_deadline 值（從配置繼承）
      const isFixedDeadline = isFixedDeadlineTask(primaryConfig) ? 1 : 0;

      // 從內存中獲取該配置的 SOP（已經在一個查詢中獲取）
      const configData = configsMap.get(primaryConfig.config_id);
      const configSops = configData ? configData.sops : [];

      // 收集任務數據，稍後批量插入
      tasksToInsert.push({
        cs,
        primaryConfig,
        primaryStage,
        stageDefinitions,
        formattedDueDate,
        generationTimeIso,
        isFixedDeadline,
        configSops
      });
    }
    
    // 批量插入該客戶的所有任務
    if (tasksToInsert.length === 0) {
      console.log(`[TaskGenerator] 客戶 ${clientId} 沒有任務需要插入，跳過（跳過了 ${clientSkippedCount} 個服務）`);
      continue;
    }
    
    clientsWithTasksCount++;
    console.log(`[TaskGenerator] 客戶 ${clientId} 準備插入 ${tasksToInsert.length} 個任務（處理了 ${servicesProcessedInClient} 個服務，${servicesAddedToInsert} 個服務通過檢查，跳過了 ${clientSkippedCount} 個服務）`);
    
    try {
      // 1. 批量插入該客戶的所有任務
      const taskValues = [];
      const taskParams = [];
      
      for (const task of tasksToInsert) {
        const { cs, primaryConfig, formattedDueDate, isFixedDeadline } = task;
        // 優化：插入時直接設置status='in_progress'和original_due_date，減少後續更新
        // 18個字段對應18個參數
        taskValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        taskParams.push(
          cs.client_id,                    // 1
          cs.client_service_id,           // 2
          cs.service_id,                  // 3
          primaryConfig.config_id,        // 4
          primaryConfig.task_name,        // 5
          primaryConfig.task_description, // 6
          primaryConfig.assignee_user_id, // 7
          targetYear,                     // 8
          targetMonth,                    // 9
          formattedDueDate,               // 10 due_date
          formattedDueDate,               // 11 original_due_date
          primaryConfig.estimated_hours,  // 12
          primaryConfig.stage_order,      // 13
          primaryConfig.notes,            // 14
          'in_progress',                  // 15 status
          isFixedDeadline,                // 16
          nowIso,                         // 17 created_at
          nowIso                          // 18 updated_at
        );
      }
      
      // 簡單直接：插入任務，然後查詢task_id
      const insertTasksSql = `
        INSERT INTO ActiveTasks 
        (client_id, client_service_id, service_id, task_config_id, task_type,
         task_description, assignee_user_id, service_year, service_month,
         due_date, original_due_date, estimated_hours, stage_order, notes, status, 
         is_fixed_deadline, created_at, updated_at)
        VALUES ${taskValues.join(', ')}
      `;
      
      const insertStart = Date.now();
      await env.DATABASE.prepare(insertTasksSql)
        .bind(...taskParams)
        .run();
      trackQuery();
      const insertDuration = logQueryTime('insert_tasks', insertStart);
      console.log(`[TaskGenerator] 查詢2-插入${tasksToInsert.length}個任務：耗時 ${insertDuration}ms`);
      
      // 優化：使用更精確的條件查詢剛插入的任務 ID
      // 使用ROWID或更精確的時間範圍，減少掃描
      const clientServiceIds = tasksToInsert.map(t => t.cs.client_service_id);
      const placeholders = clientServiceIds.map(() => '?').join(',');
      // 優化：添加時間範圍限制，減少掃描範圍
      const timeWindowStart = new Date(now.getTime() - 5000).toISOString(); // 5秒前
      const queryTaskIdStart = Date.now();
      const insertedTasks = await env.DATABASE.prepare(
        `SELECT task_id, client_service_id 
         FROM ActiveTasks 
         WHERE client_service_id IN (${placeholders})
           AND service_year = ? 
           AND service_month = ?
           AND created_at >= ?
           AND created_at <= ?
         ORDER BY task_id DESC
         LIMIT ?`
      )
        .bind(...clientServiceIds, targetYear, targetMonth, timeWindowStart, nowIso, tasksToInsert.length)
        .all();
      trackQuery();
      const queryTaskIdDuration = logQueryTime('query_task_ids', queryTaskIdStart);
      
      // 建立 task_id 映射
      const taskIdMap = new Map();
      const taskIds = [];
      for (const task of insertedTasks.results || []) {
        taskIdMap.set(task.client_service_id, task.task_id);
        taskIds.push(task.task_id);
      }
      
      console.log(`[TaskGenerator] 查詢3-獲取task_id：${taskIds.length}個，耗時 ${queryTaskIdDuration}ms`);
      
      if (taskIds.length === 0) {
        console.warn(`[TaskGenerator] 客戶 ${clientId} 批量插入任務後未獲取到 task_id`);
        skippedCount += tasksToInsert.length;
        continue;
      }
      
      // 3. 批量插入該客戶的所有階段
      const stageValues = [];
      const stageParams = [];
      
      for (const task of tasksToInsert) {
        const taskId = taskIdMap.get(task.cs.client_service_id);
        if (!taskId) continue;
        
        const { primaryStage, stageDefinitions } = task;
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
            isFirstStage ? 'system:auto_generate' : null,
            stageDef.config?.notes || null
          );
        }
      }
      
      if (stageValues.length > 0) {
        // 分批插入階段（考慮 SQLite 變數限制：999 個，每個階段 9 個參數 = 最多 111 個階段/批次）
        const STAGE_BATCH_SIZE = 111;
        for (let i = 0; i < stageValues.length; i += STAGE_BATCH_SIZE) {
          const batchValues = stageValues.slice(i, i + STAGE_BATCH_SIZE);
          const batchParams = stageParams.slice(i, i + STAGE_BATCH_SIZE);
          
          const insertStagesSql = `
            INSERT INTO ActiveTaskStages 
            (task_id, stage_name, stage_order, status, delay_days, started_at, triggered_at, triggered_by, notes)
            VALUES ${batchValues.join(', ')}
          `;
          
          const insertStagesStart = Date.now();
          await env.DATABASE.prepare(insertStagesSql)
            .bind(...batchParams)
            .run();
          trackQuery();
          const insertStagesDuration = logQueryTime('insert_stages', insertStagesStart);
          console.log(`[TaskGenerator] 查詢${queryCount}-插入${batchValues.length}個階段：耗時 ${insertStagesDuration}ms`);
        }
      }
      
      // 優化：插入時已經設置了status='in_progress'和original_due_date，無需額外更新
      // 這減少1次查詢，大幅提升性能
      // 對於新插入的任務，所有字段在插入時已經設置正確
      
      // 5. 異步插入 SOP 和記錄事件（不計入查詢次數限制）
      for (const task of tasksToInsert) {
        const taskId = taskIdMap.get(task.cs.client_service_id);
        if (!taskId) continue;
        
        const { primaryConfig, stageDefinitions, formattedDueDate, generationTimeIso, isFixedDeadline, configSops } = task;
        
        // 優化：SOP 和事件記錄完全異步，不阻塞主流程
        // 使用 waitUntil 確保不會影響響應時間
        if (configSops.length > 0) {
          const sopInserts = configSops.map(sop =>
            env.DATABASE.prepare(
              `INSERT INTO ActiveTaskSOPs (task_id, sop_id, sort_order) VALUES (?, ?, ?)`
            )
              .bind(taskId, sop.sop_id, sop.sort_order)
              .run()
              .catch(err => {
                console.warn("[TaskGenerator] 無法插入 SOP", err);
                return null;
              })
          );
          
          if (ctx?.waitUntil) {
            ctx.waitUntil(Promise.all(sopInserts).catch(err => console.warn("[TaskGenerator] SOP 插入失敗", err)));
          } else {
            // 如果沒有ctx，異步執行但不等待
            Promise.all(sopInserts).catch(err => console.warn("[TaskGenerator] SOP 插入失敗", err));
          }
        }
        
        // 事件記錄完全異步
        const eventPromise = logTaskEvent(env, {
          taskId,
          configId: primaryConfig.config_id,
          eventType: "auto_generated",
          payload: {
            dueDate: formattedDueDate,
            generationTime: generationTimeIso,
            generationTimeRule: primaryConfig.generation_time_rule || null,
            advanceDays: primaryConfig.advance_days || null,
            serviceYear: targetYear,
            serviceMonth: targetMonth,
            stageCount: stageDefinitions.length,
            generatedAt: nowIso,
            isFixedDeadline: isFixedDeadline,
          },
        }).catch(err => console.warn("[TaskGenerator] 任務事件記錄失敗", err));
        
        if (ctx?.waitUntil) {
          ctx.waitUntil(eventPromise);
        } else {
          // 異步執行但不等待
          eventPromise.catch(() => {});
        }
      }
      
      generatedCount += taskIds.length;
      processedCount += clientServices.length;
      
      console.log(`[TaskGenerator] 客戶 ${clientId} 處理完成：${taskIds.length} 個任務，${stageValues.length} 個階段，跳過 ${clientSkippedCount} 個服務`);
      
    } catch (err) {
      console.error(`[TaskGenerator] 客戶 ${clientId} 批量插入失敗`, err);
      errors.push(`客戶 ${clientId} 批量插入失敗: ${err.message}`);
      skippedCount += tasksToInsert.length;
    }
  }
  
  // 計算實際處理的服務數量
  const actualProcessedServices = processedCount;
  const remainingServices = totalServices - actualProcessedServices;
  const isComplete = remainingServices === 0 || clientsToProcess.length >= totalClients;

  const durationMs = Date.now() - startTime;
  
  // 計算查詢總時間
  const totalQueryTime = queryTimings.reduce((sum, t) => sum + t.duration, 0);
  const processingTime = durationMs - totalQueryTime;
  
  const timePerTask = generatedCount > 0 ? (durationMs / generatedCount) : 0;
  const queryTimePerTask = generatedCount > 0 ? (totalQueryTime / generatedCount) : 0;
  const processingTimePerTask = generatedCount > 0 ? (processingTime / generatedCount) : 0;
  
  console.log(
    `[TaskGenerator] ${monthLabel} 任務生成${isComplete ? '完成' : '部分完成'}：生成 ${generatedCount} 個任務，跳過 ${skippedCount} 個，已處理 ${actualProcessedServices}/${totalServices}，處理了 ${clientsProcessedCount} 個客戶（${clientsWithTasksCount} 個有任務），使用 ${queryCount} 次 D1 查詢，總耗時 ${(durationMs / 1000).toFixed(2)} 秒（查詢 ${(totalQueryTime / 1000).toFixed(2)} 秒，處理 ${(processingTime / 1000).toFixed(2)} 秒）${!isComplete ? `，剩餘 ${remainingServices} 個服務將在下次調用時處理` : ''}`
  );
  console.log(`[TaskGenerator] 跳過原因統計：`, skipReasons);
  
  // 關鍵性能指標：每個任務的平均時間
  if (generatedCount > 0) {
    console.log(
      `[TaskGenerator] 性能指標：每個任務平均 ${timePerTask.toFixed(0)}ms（查詢 ${queryTimePerTask.toFixed(0)}ms，處理 ${processingTimePerTask.toFixed(0)}ms），生成 ${generatedCount} 個任務共 ${(durationMs / 1000).toFixed(2)} 秒`
    );
  }
  
  // 詳細的查詢時間 breakdown
  if (queryTimings.length > 0) {
    console.log(`[TaskGenerator] 查詢時間詳情：${JSON.stringify(queryTimings.map(t => `${t.query}:${t.duration}ms`))}`);
  }

  return { 
    generatedCount, 
    skippedCount,
    errors: errors.length,
    durationMs,
    processedServices: actualProcessedServices,
    totalServices: totalServices,
    remainingServices: remainingServices,
    isComplete: isComplete,
    queryCount: queryCount,
    skipReasons,
    clientsProcessed: clientsProcessedCount,
    clientsWithTasks: clientsWithTasksCount
  };
}

