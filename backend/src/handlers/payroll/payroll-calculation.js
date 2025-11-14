/**
 * 薪资计算功能
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { calculateEmployeePayroll } from "../../utils/payroll-calculator.js";
import {
  fetchPayrollCacheMap,
  fetchPayrollCacheRow,
  parsePayrollCacheRow,
  enqueuePayrollRecalc,
  clearPayrollRecalc
} from "../../utils/payroll-cache.js";

/**
 * 薪资预览（參考舊系統：對每個員工調用 calculateEmployeePayroll 獲取完整數據）
 */
export async function handlePayrollPreview(request, env, ctx, requestId, match, url) {
  const month = match[1];
  
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse(400, "BAD_REQUEST", "月份格式錯誤，應為 YYYY-MM", null, requestId);
  }

  // 解析查詢參數，檢查是否強制重新計算
  const forceRecalculate = url.searchParams.get('force') === 'true' || url.searchParams.get('force') === '1';

  try {
    const activeUsers = await env.DATABASE.prepare(
      `SELECT user_id FROM Users WHERE is_deleted = 0 ORDER BY user_id`
    ).all();

    const userIds = (activeUsers.results || []).map((row) => Number(row.user_id));

    let cacheMap = await fetchPayrollCacheMap(env, month);

    // 獲取佇列中的用戶 ID（用於 meta 信息）
    const queueRows = await env.DATABASE.prepare(
      `SELECT user_id FROM PayrollRecalcQueue 
       WHERE year_month = ? AND status IN ('pending', 'processing', 'error')`
    ).bind(month).all();
    const queueUserIds = new Set((queueRows.results || []).map((row) => Number(row.user_id)));

    // 如果強制重新計算，直接重新計算所有員工
    const recalcTargets = new Set();
    if (forceRecalculate) {
      // 強制重新計算：所有員工都需要重新計算
      console.log(`[PayrollPreview] 強制重新計算所有員工 (${month}), 共 ${userIds.length} 人`);
      userIds.forEach(userId => recalcTargets.add(userId));
    } else {
      // 正常模式：只重新計算標記為需要重新計算的員工（由定時任務或數據變更觸發）
      // 不檢查績效獎金調整記錄，因為每天自動計算會處理
      for (const userId of userIds) {
        const cacheRow = cacheMap.get(userId);
        // 只重新計算沒有快取或標記為需要重新計算的員工
        if (!cacheRow || cacheRow.needs_recalc) {
          recalcTargets.add(userId);
        }
        // 如果佇列中有待處理的記錄，也需要重新計算
        if (queueUserIds.has(userId)) {
          recalcTargets.add(userId);
        }
      }
    }

    if (recalcTargets.size > 0) {
      for (const userId of recalcTargets) {
        try {
          await calculateEmployeePayroll(env, userId, month);
          await clearPayrollRecalc(env, userId, month).catch(() => {});
        } catch (err) {
          const message = err?.message || String(err);
          console.error(`[PayrollPreview] 重算員工 ${userId} 失敗:`, message);
          await env.DATABASE.prepare(
            `UPDATE PayrollCache 
             SET needs_recalc = 1,
                 last_error = ?,
                 last_error_at = datetime('now')
             WHERE user_id = ? AND year_month = ?`
          ).bind(message, userId, month).run();
          await enqueuePayrollRecalc(env, userId, month, `preview_failed:${message.substring(0, 32)}`).catch(() => {});
        }
      }

      cacheMap = await fetchPayrollCacheMap(env, month);
    }

    const usersData = [];
    const fallbackUsers = [];

    for (const userId of userIds) {
      const cacheRow = cacheMap.get(userId);
      const parsed = parsePayrollCacheRow(cacheRow);
      if (parsed) {
        usersData.push(parsed);
      } else {
        fallbackUsers.push(userId);
      }
    }

    for (const userId of fallbackUsers) {
      try {
        const payroll = await calculateEmployeePayroll(env, userId, month);
        if (payroll) {
          usersData.push(payroll);
        }
      } catch (err) {
        console.error(`[PayrollPreview] 無法取得員工 ${userId} 的薪資資料:`, err);
        await enqueuePayrollRecalc(env, userId, month, "fallback_failed").catch(() => {});
      }
    }

    usersData.sort((a, b) => (a.userId || 0) - (b.userId || 0));

    const meta = {
      month,
      totalUsers: userIds.length,
      cacheHits: userIds.length - recalcTargets.size,
      recalculated: Array.from(recalcTargets),
      queueSize: queueUserIds.size,
    };

    return successResponse({
      month,
      users: usersData,
      total: usersData.length,
      meta,
    }, "查詢成功", requestId);
  } catch (error) {
    console.error(`[PayrollPreview] 錯誤:`, error);
    console.error(`[PayrollPreview] 錯誤堆疊:`, error.stack);
    return errorResponse(500, "INTERNAL_ERROR", `查詢薪資預覽失敗: ${error.message}`, { error: error.toString(), stack: error.stack }, requestId);
  }
}

/**
 * 计算单个员工薪资
 */
export async function handleCalculatePayroll(request, env, ctx, requestId, match, url) {
  const body = await request.json();
  const userId = body?.user_id;
  const month = body?.month;
  const forceRecalculate = Boolean(body?.force_recalculate || body?.force || body?.refresh);
  
  if (!userId || !month) {
    return errorResponse(400, "BAD_REQUEST", "缺少必要參數", null, requestId);
  }
  
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return errorResponse(400, "BAD_REQUEST", "月份格式錯誤，應為 YYYY-MM", null, requestId);
  }
  
  try {
    if (!forceRecalculate) {
      const cacheRow = await fetchPayrollCacheRow(env, userId, month);
      if (cacheRow && cacheRow.data_json) {
        const parsed = parsePayrollCacheRow(cacheRow);
        if (parsed && !cacheRow.needs_recalc) {
          return successResponse({
            ...parsed,
            _meta: {
              fromCache: true,
              lastCalculatedAt: cacheRow.last_calculated_at,
            },
          }, "查詢成功", requestId);
        }
      }
    }
    
    const payroll = await calculateEmployeePayroll(env, userId, month);
    if (!payroll) {
      return errorResponse(404, "NOT_FOUND", "員工不存在", null, requestId);
    }
    
    try {
      await clearPayrollRecalc(env, userId, month);
    } catch (err) {
      console.error("[Payroll] 清除重算佇列失敗:", err);
    }
    
    return successResponse(payroll, "計算成功", requestId);
  } catch (err) {
    console.error(`[Payroll] 计算员工 ${userId} 薪资失败:`, err);
    return errorResponse(500, "CALCULATION_ERROR", `計算薪資失敗: ${err.message}`, null, requestId);
  }
}
