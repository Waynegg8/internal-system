/**
 * 任務生成監控工具
 * 記錄任務生成的成功率、性能指標和錯誤，提供告警機制
 */

/**
 * 記錄任務生成開始
 * @param {D1Database} db - D1 數據庫實例
 * @param {string} generationType - 生成類型：'manual' | 'auto' | 'one-time'
 * @param {number} targetYear - 目標年份
 * @param {number} targetMonth - 目標月份 (1-12)
 * @param {object} metadata - 額外元數據（可選）
 * @returns {Promise<number>} 監控記錄 ID
 */
export async function recordGenerationStart(db, generationType, targetYear, targetMonth, metadata = {}) {
  try {
    const startTime = new Date().toISOString();
    const result = await db.prepare(`
      INSERT INTO TaskGenerationMonitoring (
        generation_type,
        target_year,
        target_month,
        status,
        started_at,
        metadata
      ) VALUES (?, ?, ?, 'running', ?, ?)
    `).bind(
      generationType,
      targetYear,
      targetMonth,
      startTime,
      JSON.stringify(metadata)
    ).run();

    return result.meta?.last_row_id || null;
  } catch (err) {
    // 監控失敗不應影響主流程
    console.warn('[Monitoring] Failed to record generation start:', err);
    return null;
  }
}

/**
 * 記錄任務生成完成
 * @param {D1Database} db - D1 數據庫實例
 * @param {number} monitoringId - 監控記錄 ID
 * @param {object} stats - 統計信息
 * @param {number} stats.total - 總任務數
 * @param {number} stats.generated - 成功生成的任務數
 * @param {number} stats.skipped - 跳過的任務數
 * @param {number} stats.errors - 錯誤數
 * @param {number} durationMs - 持續時間（毫秒）
 * @param {Array<string>} errorMessages - 錯誤訊息列表（可選）
 */
export async function recordGenerationComplete(
  db,
  monitoringId,
  stats,
  durationMs,
  errorMessages = []
) {
  if (!monitoringId) return;

  try {
    const endTime = new Date().toISOString();
    const successRate = stats.total > 0 
      ? ((stats.generated / stats.total) * 100).toFixed(2) 
      : 0;

    const status = stats.errors > 0 
      ? (stats.generated > 0 ? 'partial' : 'failed') 
      : 'success';

    await db.prepare(`
      UPDATE TaskGenerationMonitoring
      SET 
        status = ?,
        completed_at = ?,
        duration_ms = ?,
        total_tasks = ?,
        generated_tasks = ?,
        skipped_tasks = ?,
        error_count = ?,
        success_rate = ?,
        error_messages = ?,
        updated_at = datetime('now')
      WHERE monitoring_id = ?
    `).bind(
      status,
      endTime,
      durationMs,
      stats.total || 0,
      stats.generated || 0,
      stats.skipped || 0,
      stats.errors || 0,
      successRate,
      JSON.stringify(errorMessages.slice(0, 10)), // 限制錯誤訊息數量
      monitoringId
    ).run();

    // 檢查是否需要告警
    await checkAndTriggerAlerts(db, monitoringId, stats, successRate, durationMs);

  } catch (err) {
    console.warn('[Monitoring] Failed to record generation complete:', err);
  }
}

/**
 * 記錄任務生成錯誤
 * @param {D1Database} db - D1 數據庫實例
 * @param {number} monitoringId - 監控記錄 ID
 * @param {Error|string} error - 錯誤對象或錯誤訊息
 * @param {object} context - 錯誤上下文（可選）
 */
export async function recordGenerationError(db, monitoringId, error, context = {}) {
  if (!monitoringId) return;

  try {
    const errorMessage = error instanceof Error 
      ? error.message 
      : String(error);
    
    const errorStack = error instanceof Error 
      ? error.stack 
      : null;

    await db.prepare(`
      INSERT INTO TaskGenerationErrors (
        monitoring_id,
        error_message,
        error_stack,
        context,
        occurred_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(
      monitoringId,
      errorMessage.slice(0, 500), // 限制長度
      errorStack ? errorStack.slice(0, 2000) : null,
      JSON.stringify(context)
    ).run();

  } catch (err) {
    console.warn('[Monitoring] Failed to record generation error:', err);
  }
}

/**
 * 檢查並觸發告警
 * @param {D1Database} db - D1 數據庫實例
 * @param {number} monitoringId - 監控記錄 ID
 * @param {object} stats - 統計信息
 * @param {number} successRate - 成功率（百分比）
 * @param {number} durationMs - 持續時間（毫秒）
 */
async function checkAndTriggerAlerts(db, monitoringId, stats, successRate, durationMs) {
  try {
    const alerts = [];

    // 檢查成功率告警（低於 80%）
    if (successRate < 80 && stats.total > 0) {
      alerts.push({
        type: 'low_success_rate',
        severity: successRate < 50 ? 'critical' : 'warning',
        message: `任務生成成功率過低: ${successRate}%`,
        threshold: 80,
        actual: successRate
      });
    }

    // 檢查錯誤數告警（超過 5 個錯誤）
    if (stats.errors > 5) {
      alerts.push({
        type: 'high_error_count',
        severity: stats.errors > 20 ? 'critical' : 'warning',
        message: `任務生成錯誤數過多: ${stats.errors} 個錯誤`,
        threshold: 5,
        actual: stats.errors
      });
    }

    // 檢查性能告警（超過 30 秒）
    const durationSeconds = durationMs / 1000;
    if (durationSeconds > 30) {
      alerts.push({
        type: 'slow_generation',
        severity: durationSeconds > 60 ? 'critical' : 'warning',
        message: `任務生成耗時過長: ${durationSeconds.toFixed(2)} 秒`,
        threshold: 30,
        actual: durationSeconds
      });
    }

    // 檢查完全失敗告警
    if (stats.generated === 0 && stats.total > 0) {
      alerts.push({
        type: 'complete_failure',
        severity: 'critical',
        message: '任務生成完全失敗，沒有生成任何任務',
        threshold: 0,
        actual: stats.generated
      });
    }

    // 記錄告警
    if (alerts.length > 0) {
      await db.prepare(`
        INSERT INTO TaskGenerationAlerts (
          monitoring_id,
          alert_type,
          severity,
          message,
          threshold_value,
          actual_value,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        monitoringId,
        alerts[0].type, // 記錄第一個告警（主要告警）
        alerts[0].severity,
        alerts[0].message,
        alerts[0].threshold,
        alerts[0].actual
      ).run();

      // 記錄到控制台（生產環境可以發送到外部告警系統）
      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      if (criticalAlerts.length > 0) {
        console.error('[Monitoring] Critical alerts triggered:', criticalAlerts);
      } else {
        console.warn('[Monitoring] Warnings triggered:', alerts);
      }
    }

  } catch (err) {
    console.warn('[Monitoring] Failed to check alerts:', err);
  }
}

/**
 * 獲取任務生成監控統計
 * @param {D1Database} db - D1 數據庫實例
 * @param {object} options - 查詢選項
 * @param {number} options.days - 查詢最近 N 天的記錄（默認 7）
 * @param {string} options.generationType - 生成類型過濾（可選）
 * @returns {Promise<object>} 統計信息
 */
export async function getGenerationStats(db, options = {}) {
  const { days = 7, generationType = null } = options;

  try {
    let sql = `
      SELECT 
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_runs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial_runs,
        AVG(success_rate) as avg_success_rate,
        AVG(duration_ms) as avg_duration_ms,
        SUM(total_tasks) as total_tasks_processed,
        SUM(generated_tasks) as total_tasks_generated,
        SUM(error_count) as total_errors
      FROM TaskGenerationMonitoring
      WHERE started_at >= datetime('now', '-' || ? || ' days')
    `;

    const params = [days];

    if (generationType) {
      sql += ` AND generation_type = ?`;
      params.push(generationType);
    }

    const result = await db.prepare(sql).bind(...params).first();

    return {
      period_days: days,
      total_runs: result.total_runs || 0,
      successful_runs: result.successful_runs || 0,
      failed_runs: result.failed_runs || 0,
      partial_runs: result.partial_runs || 0,
      avg_success_rate: result.avg_success_rate ? parseFloat(result.avg_success_rate).toFixed(2) : 0,
      avg_duration_ms: result.avg_duration_ms ? parseFloat(result.avg_duration_ms).toFixed(2) : 0,
      total_tasks_processed: result.total_tasks_processed || 0,
      total_tasks_generated: result.total_tasks_generated || 0,
      total_errors: result.total_errors || 0
    };

  } catch (err) {
    console.error('[Monitoring] Failed to get generation stats:', err);
    return null;
  }
}

/**
 * 獲取最近的告警
 * @param {D1Database} db - D1 數據庫實例
 * @param {object} options - 查詢選項
 * @param {number} options.limit - 返回數量限制（默認 10）
 * @param {string} options.severity - 嚴重程度過濾（可選：'critical' | 'warning'）
 * @returns {Promise<Array>} 告警列表
 */
export async function getRecentAlerts(db, options = {}) {
  const { limit = 10, severity = null } = options;

  try {
    let sql = `
      SELECT 
        a.alert_id,
        a.monitoring_id,
        a.alert_type,
        a.severity,
        a.message,
        a.threshold_value,
        a.actual_value,
        a.created_at,
        m.generation_type,
        m.target_year,
        m.target_month
      FROM TaskGenerationAlerts a
      JOIN TaskGenerationMonitoring m ON a.monitoring_id = m.monitoring_id
      WHERE 1=1
    `;

    const params = [];

    if (severity) {
      sql += ` AND a.severity = ?`;
      params.push(severity);
    }

    sql += ` ORDER BY a.created_at DESC LIMIT ?`;
    params.push(limit);

    const result = await db.prepare(sql).bind(...params).all();

    return result.results || [];

  } catch (err) {
    console.error('[Monitoring] Failed to get recent alerts:', err);
    return [];
  }
}

/**
 * 獲取任務生成監控記錄
 * @param {D1Database} db - D1 數據庫實例
 * @param {object} options - 查詢選項
 * @param {number} options.limit - 返回數量限制（默認 20）
 * @param {string} options.status - 狀態過濾（可選）
 * @returns {Promise<Array>} 監控記錄列表
 */
export async function getMonitoringRecords(db, options = {}) {
  const { limit = 20, status = null } = options;

  try {
    let sql = `
      SELECT 
        monitoring_id,
        generation_type,
        target_year,
        target_month,
        status,
        started_at,
        completed_at,
        duration_ms,
        total_tasks,
        generated_tasks,
        skipped_tasks,
        error_count,
        success_rate
      FROM TaskGenerationMonitoring
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY started_at DESC LIMIT ?`;
    params.push(limit);

    const result = await db.prepare(sql).bind(...params).all();

    return result.results || [];

  } catch (err) {
    console.error('[Monitoring] Failed to get monitoring records:', err);
    return [];
  }
}



