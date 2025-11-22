/**
 * 任務統計摘要 Handler
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache } from "../../utils/cache.js";

/**
 * 構建篩選條件（與 handleGetTasks 相同的邏輯）
 */
function buildFilterConditions(user, params, where, binds) {
  if (!user.is_admin) {
    where.push("t.assignee_user_id = ?");
    binds.push(String(user.user_id));
  }
  
  const q = (params.get("q") || "").trim();
  if (q) {
    where.push("(t.task_type LIKE ? OR c.company_name LIKE ? OR c.tax_registration_number LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  
  const status = (params.get("status") || "").trim();
  if (status && ["in_progress", "completed", "cancelled"].includes(status)) {
    where.push("t.status = ?");
    binds.push(status);
  }
  
  const due = (params.get("due") || "").trim();
  if (due === "overdue") {
    where.push("date(t.due_date) < date('now') AND t.status != 'completed'");
  }
  if (due === "soon") {
    where.push("date(t.due_date) BETWEEN date('now') AND date('now','+3 days')");
  }
  
  const serviceYear = (params.get("service_year") || "").trim();
  const serviceMonth = (params.get("service_month") || "").trim();
  // 修正：使用 service_year 和 service_month 兩個獨立字段進行篩選
  if (serviceYear && serviceMonth) {
    where.push("t.service_year = ? AND t.service_month = ?");
    binds.push(parseInt(serviceYear), parseInt(serviceMonth));
  } else if (serviceYear) {
    where.push("t.service_year = ?");
    binds.push(parseInt(serviceYear));
  }
  
  const hideCompleted = params.get("hide_completed") === "1";
  if (hideCompleted) {
    where.push("t.status != 'completed'");
  }
  
  const canStart = params.get("can_start");
  if (canStart === "true" || canStart === "false") {
    const canStartValue = canStart === "true" ? 1 : 0;
    where.push(`(
      CASE 
        WHEN (SELECT COUNT(1) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id) = 0 THEN 1
        WHEN (SELECT MIN(stg.stage_order) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id AND stg.status != 'completed') IS NULL THEN 1
        WHEN (SELECT MIN(stg.stage_order) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id AND stg.status != 'completed') = 1 THEN 1
        ELSE CASE 
          WHEN (
            SELECT COUNT(1) 
            FROM ActiveTaskStages stg 
            WHERE stg.task_id = t.task_id 
            AND stg.stage_order < (
              SELECT MIN(stg2.stage_order) 
              FROM ActiveTaskStages stg2 
              WHERE stg2.task_id = t.task_id 
              AND stg2.status != 'completed'
            )
            AND stg.status != 'completed'
          ) = 0 THEN 1
          ELSE 0
        END
      END
    ) = ?`);
    binds.push(canStartValue);
  }
}

/**
 * 獲取任務統計摘要
 */
export async function handleGetTasksStats(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 驗證用戶身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const params = url.searchParams;
  
  // 生成緩存鍵
  const cacheKey = generateCacheKey('tasks_stats', {
    q: (params.get("q") || "").trim(),
    status: (params.get("status") || "").trim(),
    due: (params.get("due") || "").trim(),
    serviceYear: (params.get("service_year") || "").trim(),
    serviceMonth: (params.get("service_month") || "").trim(),
    hideCompleted: params.get("hide_completed") === "1" ? '1' : '0',
    canStart: params.get("can_start") || '',
    userId: user.is_admin ? 'all' : String(user.user_id)
  });
  
  // 檢查緩存
  const kvCached = await getKVCache(env, cacheKey);
  if (kvCached?.data) {
    return successResponse(kvCached.data, "查詢成功（KV缓存）", requestId, {
      cache_source: 'kv'
    });
  }
  
  // 構建 WHERE 條件
  const where = ["t.is_deleted = 0"];
  const binds = [];
  
  buildFilterConditions(user, params, where, binds);
  
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  
  try {
    // 計算統計數據
    // 使用單個查詢計算所有統計，提高性能
    const statsRow = await env.DATABASE.prepare(
      `SELECT 
        COUNT(1) AS total,
        -- 進行中任務數：包含 in_progress 和 pending 狀態
        SUM(CASE WHEN t.status IN ('in_progress', 'pending') THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE 
          WHEN t.due_date IS NOT NULL 
          AND date(t.due_date) < date('now') 
          AND t.status NOT IN ('completed', 'cancelled') 
          THEN 1 
          ELSE 0 
        END) AS overdue,
        SUM(
          CASE 
            -- No stages: can start
            WHEN (SELECT COUNT(1) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id) = 0 THEN 1
            -- All stages completed: can start
            WHEN (SELECT MIN(stg.stage_order) FROM ActiveTaskStages stg WHERE stg.task_id = t.task_id AND stg.status != 'completed') IS NULL THEN 1
            -- 修正：根據 requirements.md「所有前置階段的所有任務都必須是已完成」
            -- 任務可開始的條件：當前階段的所有前置階段都已完成
            -- 如果第一個階段（stage_order = 1）還沒完成，則該階段的任務可以開始
            -- 如果第一個階段已完成，但第二個階段還沒完成，則第二個階段的任務可以開始
            -- 以此類推
            ELSE CASE 
              -- 獲取當前任務的第一個未完成階段
              WHEN (
                SELECT COUNT(1) 
                FROM ActiveTaskStages stg 
                WHERE stg.task_id = t.task_id 
                AND stg.stage_order < COALESCE((
                  SELECT MIN(stg2.stage_order) 
                  FROM ActiveTaskStages stg2 
                  WHERE stg2.task_id = t.task_id 
                  AND stg2.status != 'completed'
                ), 999)
                AND stg.status != 'completed'
              ) = 0 THEN 1
              ELSE 0
            END
          END
        ) AS can_start
       FROM ActiveTasks t
       LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
       LEFT JOIN Clients c ON c.client_id = cs.client_id
       ${whereSql}`
    ).bind(...binds).first();
    
    // 處理統計結果，確保所有值都是數字
    const stats = {
      total: Number(statsRow?.total || 0),
      in_progress: Number(statsRow?.in_progress || 0),
      completed: Number(statsRow?.completed || 0),
      overdue: Number(statsRow?.overdue || 0),
      can_start: Number(statsRow?.can_start || 0)
    };
    
    // 保存到緩存
    await saveKVCache(env, cacheKey, 'tasks_stats', stats, { ttl: 1800 }).catch(() => {});
    
    return successResponse(stats, "查詢成功", requestId);
  } catch (err) {
    console.error(`[Tasks Stats] Query error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}


