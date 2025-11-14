/**
 * 任務自動生成器（重構版）
 * 基於 ClientServiceTaskConfigs，直接生成 ActiveTasks
 */

const SYSTEM_TRIGGER = "system:auto_generate";

function parseJsonArray(value) {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.warn("[TaskGenerator] 無法解析 JSON 陣列", value, err);
    return null;
  }
}

/**
 * 計算截止日期
 */
function calculateDueDate(config, targetYear, targetMonth) {
  const dueRule = config.due_rule;
  const dueValue = config.due_value;

  let dueDate;

  switch (dueRule) {
    case "end_of_month":
      // 當月最後一天
      dueDate = new Date(targetYear, targetMonth, 0);
      break;

    case "specific_day":
      // 當月指定日
      dueDate = new Date(targetYear, targetMonth - 1, dueValue || 1);
      break;

    case "next_month_day":
      // 次月指定日
      dueDate = new Date(targetYear, targetMonth, dueValue || 1);
      break;

    case "days_after_start":
      // 從月初起算天數
      dueDate = new Date(targetYear, targetMonth - 1, 1);
      dueDate.setDate(dueDate.getDate() + (dueValue || 30));
      break;

    default:
      dueDate = new Date(targetYear, targetMonth, 0);
  }

  return dueDate;
}

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
function shouldGenerateInMonth(config, month) {
  const frequency = config.execution_frequency || config.delivery_frequency;
  const executionMonths = parseJsonArray(config.execution_months);

  // 如果指定了具體月份（優先使用）
  if (executionMonths && Array.isArray(executionMonths)) {
    return executionMonths.includes(month);
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

/**
 * 格式化日期
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
  const { now = new Date(), force = false } = options;
  const monthLabel = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
  console.log(`[TaskGenerator] 開始為 ${monthLabel} 生成任務`);

  let generatedCount = 0;
  let skippedCount = 0;

  // 獲取所有啟用的客戶服務
  const clientServices = await env.DATABASE.prepare(
    `SELECT cs.client_service_id, cs.client_id, cs.service_id, cs.status,
            c.company_name, s.service_name, s.service_code
     FROM ClientServices cs
     JOIN Clients c ON cs.client_id = c.client_id
     JOIN Services s ON cs.service_id = s.service_id
     WHERE cs.is_deleted = 0 AND c.is_deleted = 0 AND cs.status = 'active'`
  ).all();

  for (const cs of clientServices.results || []) {
    // 獲取該客戶服務的任務配置
    const configs = await env.DATABASE.prepare(
      `SELECT config_id, task_name, task_description, assignee_user_id,
              estimated_hours, advance_days, due_rule, due_value, stage_order,
              delivery_frequency, delivery_months, auto_generate, notes,
              execution_frequency, execution_months, effective_month
       FROM ClientServiceTaskConfigs
       WHERE client_service_id = ? AND is_deleted = 0 AND auto_generate = 1
       ORDER BY stage_order ASC, config_id ASC`
    )
      .bind(cs.client_service_id)
      .all();

    const configList = (configs.results || []).filter(c => Number(c.auto_generate ?? 1) !== 0);
    if (!configList.length) {
      skippedCount++;
      continue;
    }

    const sortedConfigs = [...configList].sort((a, b) => {
      const orderA = Number.isFinite(a.stage_order) && a.stage_order > 0 ? Number(a.stage_order) : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(b.stage_order) && b.stage_order > 0 ? Number(b.stage_order) : Number.MAX_SAFE_INTEGER;
      if (orderA === orderB) {
        return Number(a.config_id) - Number(b.config_id);
      }
      return orderA - orderB;
    });

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
    if (!isConfigEffectiveInMonth(primaryConfig, targetYear, targetMonth)) {
      skippedCount++;
      continue;
    }

    // 檢查是否應該在這個月份生成（以第一階段為基準）
    if (!shouldGenerateInMonth(primaryConfig, targetMonth)) {
      skippedCount++;
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
      .bind(cs.client_service_id, targetYear, targetMonth)
      .first();

    if (existing) {
      skippedCount++;
      continue;
    }

    // 計算截止日期（以第一階段設定為主）
    const dueDate = calculateDueDate(primaryConfig, targetYear, targetMonth);
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      console.warn("[TaskGenerator] dueDate 計算錯誤，跳過 client_service_id", cs.client_service_id);
      skippedCount++;
      continue;
    }

    const advanceDays = Number.isFinite(primaryConfig.advance_days)
      ? Number(primaryConfig.advance_days)
      : 7;
    const thresholdDate = new Date(dueDate);
    thresholdDate.setDate(thresholdDate.getDate() - Math.max(advanceDays, 0));

    if (!force && now < thresholdDate) {
      skippedCount++;
      continue;
    }

    const formattedDueDate = formatDate(dueDate);
    const nowIso = new Date().toISOString();

    // 創建任務（以第一階段配置為基準）
    const createResult = await env.DATABASE.prepare(
      `INSERT INTO ActiveTasks 
       (client_id, client_service_id, service_id, task_config_id, task_type,
        task_description, assignee_user_id, service_year, service_month,
        due_date, original_due_date, estimated_hours, stage_order, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress', ?)`
    )
      .bind(
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
        nowIso
      )
      .run();

    const taskId = createResult.meta?.last_row_id;

    if (!taskId) {
      console.warn("[TaskGenerator] 任務建立失敗，未取得 task_id");
      skippedCount++;
      continue;
    }

    // 建立階段資料
    for (const stageDef of stageDefinitions) {
      const isFirstStage = stageDef === primaryStage;
      await env.DATABASE.prepare(
        `INSERT INTO ActiveTaskStages (
          task_id, stage_name, stage_order, status, delay_days, started_at, triggered_at, triggered_by, notes
        ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`
      )
        .bind(
          taskId,
          stageDef.name,
          stageDef.order,
          isFirstStage ? 'in_progress' : 'pending',
          isFirstStage ? nowIso : null,
          isFirstStage ? nowIso : null,
          isFirstStage ? 'system:auto_generate' : null,
          stageDef.config?.notes || null
        )
        .run();
    }

    await env.DATABASE.prepare(
      `UPDATE ActiveTasks
       SET status = 'in_progress',
           original_due_date = COALESCE(original_due_date, ?),
           updated_at = ?
       WHERE task_id = ?`
    ).bind(formattedDueDate, nowIso, taskId).run();

    // 複製任務配置的 SOP 到 ActiveTask（僅以第一階段配置為主）
    try {
      const configSops = await env.DATABASE.prepare(
        `SELECT sop_id, sort_order FROM TaskConfigSOPs WHERE config_id = ?`
      )
        .bind(primaryConfig.config_id)
        .all();

      for (const sop of configSops.results || []) {
        await env.DATABASE.prepare(
          `INSERT INTO ActiveTaskSOPs (task_id, sop_id, sort_order) VALUES (?, ?, ?)`
        )
          .bind(taskId, sop.sop_id, sop.sort_order)
          .run();
      }
    } catch (err) {
      console.warn("[TaskGenerator] 無法複製 SOP，task_id=", taskId, err);
    }

    await logTaskEvent(env, {
      taskId,
      configId: primaryConfig.config_id,
      eventType: "auto_generated",
      payload: {
        dueDate: formattedDueDate,
        advanceDays,
        serviceYear: targetYear,
        serviceMonth: targetMonth,
        stageCount: stageDefinitions.length,
        generatedAt: nowIso,
      },
    });

    generatedCount++;
  }

  console.log(
    `[TaskGenerator] 完成：生成 ${generatedCount} 個任務，跳過 ${skippedCount} 個`
  );

  return { generatedCount, skippedCount };
}

