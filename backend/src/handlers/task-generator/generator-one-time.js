/**
 * 一次性服務任務生成器
 * 用於在一次性服務保存後立即生成任務
 */

import { successResponse, errorResponse } from "../../utils/response.js";
// 導入日期計算工具
import { calculateDueDate, formatDate } from "../../utils/dateCalculators.js";

const SYSTEM_TRIGGER = "system:one_time_generate";

/**
 * 為一次性服務生成任務
 * @param {D1Database} env.DATABASE - D1 數據庫實例
 * @param {number} clientServiceId - 客戶服務 ID
 * @param {number} targetYear - 目標年份
 * @param {number} targetMonth - 目標月份 (1-12)
 * @returns {Promise<{generated: number, skipped: number, errors: Array}>}
 */
export async function generateTasksForOneTimeService(env, clientServiceId, targetYear, targetMonth) {
  // 導入監控工具
  let recordGenerationStart, recordGenerationComplete, recordGenerationError;
  try {
    const monitoring = await import("../../utils/monitoring.js");
    recordGenerationStart = monitoring.recordGenerationStart;
    recordGenerationComplete = monitoring.recordGenerationComplete;
    recordGenerationError = monitoring.recordGenerationError;
  } catch (err) {
    console.warn("[OneTimeGenerator] 監控工具載入失敗，繼續執行但不記錄監控:", err);
  }

  // 記錄生成開始
  const startTime = Date.now();
  const monitoringId = recordGenerationStart
    ? await recordGenerationStart(env.DATABASE, 'one-time', targetYear, targetMonth, { clientServiceId })
    : null;

  const generated = [];
  const skipped = [];
  const errors = [];

  try {
    // 驗證客戶服務存在且為一次性服務
    const cs = await env.DATABASE.prepare(
      `SELECT cs.client_service_id, cs.client_id, cs.service_id, cs.service_type, s.service_name
       FROM ClientServices cs
       JOIN Services s ON s.service_id = cs.service_id
       WHERE cs.client_service_id = ? AND cs.is_deleted = 0`
    ).bind(clientServiceId).first();

    if (!cs) {
      const errorMsg = `客戶服務 ${clientServiceId} 不存在`;
      errors.push({ message: errorMsg });
      if (recordGenerationError) {
        await recordGenerationError(env.DATABASE, monitoringId, errorMsg, { clientServiceId });
      }
      const durationMs = Date.now() - startTime;
      if (recordGenerationComplete) {
        await recordGenerationComplete(env.DATABASE, monitoringId, { total: 0, generated: 0, skipped: 0, errors: 1 }, durationMs, [errorMsg]);
      }
      return { generated: 0, skipped: 0, errors };
    }

    if (cs.service_type !== 'one-time') {
      const errorMsg = `客戶服務 ${clientServiceId} 不是一次性服務`;
      errors.push({ message: errorMsg });
      if (recordGenerationError) {
        await recordGenerationError(env.DATABASE, monitoringId, errorMsg, { clientServiceId, service_type: cs.service_type });
      }
      const durationMs = Date.now() - startTime;
      if (recordGenerationComplete) {
        await recordGenerationComplete(env.DATABASE, monitoringId, { total: 0, generated: 0, skipped: 0, errors: 1 }, durationMs, [errorMsg]);
      }
      return { generated: 0, skipped: 0, errors };
    }

    // 獲取該服務的所有任務配置
    const configs = await env.DATABASE.prepare(
      `SELECT 
        tc.config_id,
        tc.task_name,
        tc.task_description,
        tc.assignee_user_id,
        tc.estimated_hours,
        tc.advance_days,
        tc.due_rule,
        tc.due_value,
        tc.days_due,
        tc.stage_order,
        tc.notes
       FROM ClientServiceTaskConfigs tc
       WHERE tc.client_service_id = ? 
         AND tc.is_deleted = 0
       ORDER BY tc.stage_order ASC`
    ).bind(clientServiceId).all();

    if (!configs.results || configs.results.length === 0) {
      const errorMsg = '該服務沒有任務配置';
      const errorObj = { message: errorMsg };
      errors.push(errorObj);
      if (recordGenerationError) {
        await recordGenerationError(env.DATABASE, monitoringId, errorMsg, { clientServiceId });
      }
      const durationMs = Date.now() - startTime;
      if (recordGenerationComplete) {
        await recordGenerationComplete(env.DATABASE, monitoringId, { total: 0, generated: 0, skipped: 0, errors: 1 }, durationMs, [errorMsg]);
      }
      return { generated: 0, skipped: 0, errors: [errorObj] };
    }

    // 檢查是否已存在該客戶服務在當月的任務
    const existing = await env.DATABASE.prepare(
      `SELECT task_id FROM ActiveTasks
       WHERE client_service_id = ?
         AND service_year = ?
         AND service_month = ?
         AND is_deleted = 0
       LIMIT 1`
    ).bind(clientServiceId, targetYear, targetMonth).first();

    if (existing) {
      skipped.push({ message: `該服務在 ${targetYear}-${targetMonth} 已有任務存在` });
      return { generated: 0, skipped: skipped.length, errors };
    }

    // 按 stage_order 分組配置
    const stageGroups = new Map();
    for (const config of configs.results) {
      const order = config.stage_order || 1;
      if (!stageGroups.has(order)) {
        stageGroups.set(order, []);
      }
      stageGroups.get(order).push(config);
    }

    // 獲取第一階段的配置（用於計算到期日）
    const sortedOrders = Array.from(stageGroups.keys()).sort((a, b) => a - b);
    const firstOrder = sortedOrders[0];
    const firstStageConfigs = stageGroups.get(firstOrder);
    const primaryConfig = firstStageConfigs[0];

    // 計算到期日
    const dueDate = calculateDueDate(primaryConfig, targetYear, targetMonth);
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      errors.push({ message: '到期日計算錯誤' });
      return { generated: 0, skipped: 0, errors };
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
      errors.push({ message: '任務建立失敗，未取得 task_id' });
      return { generated: 0, skipped: 0, errors };
    }

    // 建立所有階段的資料
    for (const order of sortedOrders) {
      const stageConfigs = stageGroups.get(order);
      for (const stageConfig of stageConfigs) {
        const isFirstStage = stageConfig === primaryConfig;
        try {
          await env.DATABASE.prepare(
            `INSERT INTO ActiveTaskStages (
              task_id, stage_name, stage_order, status, delay_days, started_at, triggered_at, triggered_by, notes
            ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`
          )
            .bind(
              taskId,
              stageConfig.task_name,
              stageConfig.stage_order,
              isFirstStage ? 'in_progress' : 'pending',
              isFirstStage ? nowIso : null,
              isFirstStage ? nowIso : null,
              isFirstStage ? SYSTEM_TRIGGER : null,
              stageConfig.notes || null
            )
            .run();
        } catch (err) {
          console.error(`[OneTimeGenerator] 建立階段失敗:`, err);
          errors.push({ message: `建立階段失敗: ${stageConfig.task_name}`, error: String(err) });
        }
      }
    }

    // 複製任務配置的 SOP 到 ActiveTask
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
      console.warn("[OneTimeGenerator] 無法複製 SOP，task_id=", taskId, err);
    }

    // 記錄任務生成事件
    try {
      await env.DATABASE.prepare(
        `INSERT INTO TaskEventLogs (task_id, event_type, triggered_by, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(
          taskId,
          'auto_generated',
          SYSTEM_TRIGGER,
          JSON.stringify({
            dueDate: formattedDueDate,
            serviceYear: targetYear,
            serviceMonth: targetMonth,
            stageCount: sortedOrders.length,
            generatedAt: nowIso,
            source: 'one_time_service'
          }),
          nowIso
        )
        .run();
    } catch (err) {
      console.warn("[OneTimeGenerator] 無法記錄事件，task_id=", taskId, err);
    }

    // 清除任務緩存
    await env.DATABASE.prepare(`DELETE FROM KV_Cache WHERE key LIKE ?`)
      .bind(`tasks_list%`)
      .run()
      .catch(() => {});

    generated.push({ taskId, taskName: primaryConfig.task_name });

    return {
      generated: generated.length,
      skipped: skipped.length,
      errors: errors.length > 0 ? errors : []
    };
  } catch (err) {
    console.error("[OneTimeGenerator] 生成任務失敗:", err);
    const errorMsg = `生成任務失敗: ${err.message || String(err)}`;
    errors.push({ message: errorMsg });
    
    // 記錄錯誤和完成狀態
    if (recordGenerationError) {
      await recordGenerationError(env.DATABASE, monitoringId, err, { clientServiceId });
    }
    const durationMs = Date.now() - startTime;
    if (recordGenerationComplete) {
      await recordGenerationComplete(
        env.DATABASE,
        monitoringId,
        { total: 0, generated: 0, skipped: 0, errors: 1 },
        durationMs,
        [errorMsg]
      );
    }
    
    return { generated: 0, skipped: 0, errors };
  }

  // 記錄生成完成
  const durationMs = Date.now() - startTime;
  const totalTasks = generated.length + skipped.length;
  const errorMessages = errors.map(e => e.message || String(e));
  
  if (recordGenerationComplete) {
    await recordGenerationComplete(
      env.DATABASE,
      monitoringId,
      {
        total: totalTasks,
        generated: generated.length,
        skipped: skipped.length,
        errors: errors.length
      },
      durationMs,
      errorMessages
    );
  }

  return { generated: generated.length, skipped: skipped.length, errors };
}

