/**
 * 薪資快取與重算佇列工具
 */

/**
 * 將薪資計算結果寫入快取
 * @param {object} env
 * @param {number} userId
 * @param {string} month YYYY-MM
 * @param {object} payrollData 完整的薪資資料物件
 */
export async function upsertPayrollCache(env, userId, month, payrollData) {
  const dataJson = JSON.stringify(payrollData);

  await env.DATABASE.prepare(`
    INSERT INTO PayrollCache (
      user_id,
      year_month,
      base_salary_cents,
      gross_salary_cents,
      net_salary_cents,
      overtime_cents,
      performance_bonus_cents,
      year_end_bonus_cents,
      transport_cents,
      leave_deduction_cents,
      meal_allowance_cents,
      deduction_cents,
      total_regular_allowance_cents,
      total_irregular_allowance_cents,
      total_regular_bonus_cents,
      total_work_hours,
      total_overtime_hours,
      is_full_attendance,
      data_json,
      needs_recalc,
      last_calculated_at,
      last_error,
      last_error_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), NULL, NULL
    )
    ON CONFLICT(user_id, year_month) DO UPDATE SET
      base_salary_cents = excluded.base_salary_cents,
      gross_salary_cents = excluded.gross_salary_cents,
      net_salary_cents = excluded.net_salary_cents,
      overtime_cents = excluded.overtime_cents,
      performance_bonus_cents = excluded.performance_bonus_cents,
      year_end_bonus_cents = excluded.year_end_bonus_cents,
      transport_cents = excluded.transport_cents,
      leave_deduction_cents = excluded.leave_deduction_cents,
      meal_allowance_cents = excluded.meal_allowance_cents,
      deduction_cents = excluded.deduction_cents,
      total_regular_allowance_cents = excluded.total_regular_allowance_cents,
      total_irregular_allowance_cents = excluded.total_irregular_allowance_cents,
      total_regular_bonus_cents = excluded.total_regular_bonus_cents,
      total_work_hours = excluded.total_work_hours,
      total_overtime_hours = excluded.total_overtime_hours,
      is_full_attendance = excluded.is_full_attendance,
      data_json = excluded.data_json,
      needs_recalc = 0,
      last_calculated_at = datetime('now'),
      last_error = NULL,
      last_error_at = NULL
  `).bind(
    userId,
    month,
    payrollData.baseSalaryCents || 0,
    payrollData.grossSalaryCents || 0,
    payrollData.netSalaryCents || 0,
    payrollData.overtimeCents || 0,
    payrollData.performanceBonusCents || 0,
    payrollData.totalYearEndBonusCents || payrollData.yearEndBonusCents || 0,
    payrollData.transportCents || 0,
    payrollData.leaveDeductionCents || 0,
    payrollData.mealAllowanceCents || 0,
    payrollData.deductionCents || 0,
    payrollData.totalRegularAllowanceCents || 0,
    payrollData.totalIrregularAllowanceCents || 0,
    payrollData.totalRegularBonusCents || 0,
    payrollData.totalWorkHours || payrollData.weightedHours || 0,
    payrollData.totalOvertimeHours || payrollData.effectiveWeightedHours || 0,
    payrollData.isFullAttendance ? 1 : 0,
    dataJson
  ).run();
}

/**
 * 讀取指定月份的快取資料
 * @param {object} env
 * @param {string} month YYYY-MM
 * @returns {Map<number, object>} userId -> row
 */
export async function fetchPayrollCacheMap(env, month) {
  const rows = await env.DATABASE.prepare(
    `SELECT * FROM PayrollCache WHERE year_month = ?`
  ).bind(month).all();

  const map = new Map();
  for (const row of rows.results || []) {
    map.set(Number(row.user_id), row);
  }

  return map;
}

/**
 * 讀取單筆薪資快取
 * @param {object} env
 * @param {number} userId
 * @param {string} month YYYY-MM
 * @returns {object|null}
 */
export async function fetchPayrollCacheRow(env, userId, month) {
  const row = await env.DATABASE.prepare(
    `SELECT * FROM PayrollCache WHERE user_id = ? AND year_month = ?`
  ).bind(userId, month).first();
  return row || null;
}

/**
 * 標記快取需重新計算並加入佇列
 * @param {object} env
 * @param {number} userId
 * @param {string} month
 * @param {string} reason
 */
export async function enqueuePayrollRecalc(env, userId, month, reason = "") {
  await env.DATABASE.batch([
    env.DATABASE.prepare(`
      INSERT INTO PayrollRecalcQueue (
        user_id, year_month, reason, status, attempts, created_at, updated_at
      ) VALUES (?, ?, ?, 'pending', 0, datetime('now'), datetime('now'))
      ON CONFLICT(user_id, year_month) DO UPDATE SET
        status = 'pending',
        reason = CASE 
          WHEN excluded.reason IS NOT NULL AND excluded.reason != '' THEN excluded.reason
          ELSE PayrollRecalcQueue.reason
        END,
        updated_at = datetime('now'),
        last_error = NULL,
        last_error_at = NULL
    `).bind(userId, month, reason || ""),
    env.DATABASE.prepare(`
      UPDATE PayrollCache
      SET needs_recalc = 1
      WHERE user_id = ? AND year_month = ?
    `).bind(userId, month),
  ]);
}

/**
 * 從佇列中移除重算紀錄並更新快取旗標
 * @param {object} env
 * @param {number} userId
 * @param {string} month
 */
export async function clearPayrollRecalc(env, userId, month) {
  await env.DATABASE.batch([
    env.DATABASE.prepare(
      `DELETE FROM PayrollRecalcQueue WHERE user_id = ? AND year_month = ?`
    ).bind(userId, month),
    env.DATABASE.prepare(
      `UPDATE PayrollCache 
      SET needs_recalc = 0, last_error = NULL, last_error_at = NULL
       WHERE user_id = ? AND year_month = ?`
    ).bind(userId, month),
  ]);
}

/**
 * 取得待處理的重算佇列
 * @param {object} env
 * @param {object} opts
 * @param {string|null} opts.month
 * @param {number} opts.limit
 * @returns {Array<object>}
 */
export async function fetchPendingRecalcQueue(env, { month = null, limit = 10 } = {}) {
  const params = [];
  let sql = `
    SELECT queue_id, user_id, year_month, reason, status, attempts, last_error
    FROM PayrollRecalcQueue
    WHERE status IN ('pending', 'error', 'processing')
  `;

  if (month) {
    sql += ` AND year_month = ?`;
    params.push(month);
  }

  sql += ` ORDER BY updated_at ASC, queue_id ASC LIMIT ?`;
  params.push(limit);

  const rows = await env.DATABASE.prepare(sql).bind(...params).all();
  return rows.results || [];
}

/**
 * 將佇列標記為處理中
 * @param {object} env
 * @param {number} queueId
 */
export async function markQueueProcessing(env, queueId) {
  await env.DATABASE.prepare(`
    UPDATE PayrollRecalcQueue
    SET status = 'processing',
        attempts = attempts + 1,
        last_attempt_at = datetime('now'),
        updated_at = datetime('now')
    WHERE queue_id = ?
  `).bind(queueId).run();
}

/**
 * 處理成功
 * @param {object} env
 * @param {number} queueId
 * @param {number} userId
 * @param {string} month
 */
export async function markQueueSuccess(env, queueId, userId, month) {
  await env.DATABASE.batch([
    env.DATABASE.prepare(
      `DELETE FROM PayrollRecalcQueue WHERE queue_id = ?`
    ).bind(queueId),
    env.DATABASE.prepare(
      `UPDATE PayrollCache
       SET needs_recalc = 0,
           last_error = NULL,
           last_error_at = NULL
       WHERE user_id = ? AND year_month = ?`
    ).bind(userId, month),
  ]);
}

/**
 * 處理失敗
 * @param {object} env
 * @param {number} queueId
 * @param {number} userId
 * @param {string} month
 * @param {string} errorMessage
 */
export async function markQueueError(env, queueId, userId, month, errorMessage) {
  const message = (errorMessage || "").toString().slice(0, 500);

  await env.DATABASE.batch([
    env.DATABASE.prepare(`
      UPDATE PayrollRecalcQueue
      SET status = 'error',
          last_error = ?,
          last_error_at = datetime('now'),
          updated_at = datetime('now')
      WHERE queue_id = ?
    `).bind(message, queueId),
    env.DATABASE.prepare(`
      UPDATE PayrollCache
      SET needs_recalc = 1,
          last_error = ?,
          last_error_at = datetime('now')
      WHERE user_id = ? AND year_month = ?
    `).bind(message, userId, month),
  ]);
}

/**
 * 解析快取資料
 * @param {object} row
 * @returns {object|null}
 */
export function parsePayrollCacheRow(row) {
  if (!row || !row.data_json) return null;
  try {
    return JSON.parse(row.data_json);
  } catch (err) {
    console.error("[PayrollCache] 解析 data_json 失敗:", err);
    return null;
  }
}


