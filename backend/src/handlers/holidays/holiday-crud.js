/**
 * 假日管理基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, getD1Cache, saveD1Cache, deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";

/**
 * 获取假日列表
 */
export async function handleGetHolidays(request, env, ctx, requestId, url) {
  const params = url.searchParams;
  const startDate = (params.get("start_date") || "").trim();
  const endDate = (params.get("end_date") || "").trim();
  
  const cacheKey = generateCacheKey('holidays_all', { start: startDate, end: endDate });
  const kvCached = await getKVCache(env, cacheKey);
  
  if (kvCached?.data) {
    return successResponse(kvCached.data, "查詢成功（KV缓存）", requestId, {
      ...kvCached.meta,
      cache_source: 'kv'
    });
  }
  
  const d1Cached = await getD1Cache(env, cacheKey);
  if (d1Cached?.data) {
    saveKVCache(env, cacheKey, 'holidays_all', d1Cached.data, { ttl: 3600 }).catch(() => {});
    return successResponse(d1Cached.data, "查詢成功（D1缓存）", requestId, {
      ...d1Cached.meta,
      cache_source: 'd1'
    });
  }
  
  const where = [];
  const binds = [];
  
  if (startDate) {
    where.push("holiday_date >= ?");
    binds.push(startDate);
  }
  if (endDate) {
    where.push("holiday_date <= ?");
    binds.push(endDate);
  }
  
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  
  const rows = await env.DATABASE.prepare(
    `SELECT holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday
     FROM Holidays
     ${whereSql}
     ORDER BY holiday_date ASC`
  ).bind(...binds).all();
  
  // 調試：記錄查詢結果
  console.log('[Holidays] Query results:', {
    count: rows?.results?.length || 0,
    hasMore: rows?.meta?.has_more || false,
    lastRowId: rows?.meta?.last_row_id || null
  });
  
  const data = (rows?.results || []).map(r => ({
    holiday_date: r.holiday_date,
    date: r.holiday_date,
    name: r.name || "",
    is_national_holiday: Boolean(r.is_national_holiday),
    is_weekly_restday: Boolean(r.is_weekly_restday),
    is_makeup_workday: Boolean(r.is_makeup_workday),
  }));
  
  await Promise.all([
    saveKVCache(env, cacheKey, 'holidays_all', data, { ttl: 3600 }),
    saveD1Cache(env, cacheKey, 'holidays_all', data, {})
  ]).catch(() => {});
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 创建假日（支持单笔和批量）
 */
export async function handleCreateHoliday(request, env, ctx, requestId, url) {
  const body = await request.json();
  
  if (Array.isArray(body)) {
    const affectedMonths = new Set();
    // 批量导入
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    const errors = [];
    const skipped = [];
    
    for (const holiday of body) {
      const { holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday } = holiday;
      
      if (!holiday_date || !name) {
        failCount++;
        errors.push(`日期 ${holiday_date || '未知'} 缺少必填欄位`);
        continue;
      }
      
      try {
        // 先檢查該日期是否已存在
        const existing = await env.DATABASE.prepare(
          `SELECT holiday_date FROM Holidays WHERE holiday_date = ?`
        ).bind(holiday_date).first();
        
        if (existing) {
          skipCount++;
          skipped.push(`日期 ${holiday_date} 已存在，跳過`);
          continue;
        }
        
        await env.DATABASE.prepare(
          `INSERT INTO Holidays (holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          holiday_date,
          name,
          is_national_holiday ? 1 : 0,
          is_weekly_restday ? 1 : 0,
          is_makeup_workday ? 1 : 0
        ).run();
        successCount++;
        affectedMonths.add(holiday_date.slice(0, 7));
      } catch (err) {
        failCount++;
        errors.push(`日期 ${holiday_date}: ${String(err)}`);
      }
    }
    
    // 清除缓存
    await Promise.all([
      deleteKVCacheByPrefix(env, 'holidays_all'),
      invalidateD1CacheByType(env, 'holidays_all')
    ]).catch(() => {});

    await triggerHolidayPayrollRecalculation(env, ctx, affectedMonths);
    
    return successResponse({
      successCount,
      skipCount,
      failCount,
      errors: errors.slice(0, 10),
      skipped: skipped.slice(0, 10)
    }, `批量導入完成：成功 ${successCount} 筆，跳過 ${skipCount} 筆（已存在），失敗 ${failCount} 筆`, requestId);
  } else {
    // 单笔新增
    const { holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday } = body;
    
    if (!holiday_date || !name) {
      return errorResponse(400, "VALIDATION_ERROR", "日期和名稱為必填項", null, requestId);
    }
    
    await env.DATABASE.prepare(
      `INSERT INTO Holidays (holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      holiday_date,
      name,
      is_national_holiday ? 1 : 0,
      is_weekly_restday ? 1 : 0,
      is_makeup_workday ? 1 : 0
    ).run();
    
    // 清除缓存
    await Promise.all([
      deleteKVCacheByPrefix(env, 'holidays_all'),
      invalidateD1CacheByType(env, 'holidays_all')
    ]).catch(() => {});

    await triggerHolidayPayrollRecalculation(env, ctx, new Set([holiday_date.slice(0, 7)]));
    
    return successResponse({ holiday_date, name }, "新增成功", requestId);
  }
}

/**
 * 更新假日
 */
export async function handleUpdateHoliday(request, env, ctx, requestId, match, url) {
  const holiday_date = match[1];
  const body = await request.json();
  const { name, is_national_holiday, is_weekly_restday, is_makeup_workday } = body;
  
  if (!name) {
    return errorResponse(400, "VALIDATION_ERROR", "名稱為必填項", null, requestId);
  }
  
  await env.DATABASE.prepare(
    `UPDATE Holidays 
     SET name = ?, is_national_holiday = ?, is_weekly_restday = ?, is_makeup_workday = ?, updated_at = datetime('now')
     WHERE holiday_date = ?`
  ).bind(name, is_national_holiday ? 1 : 0, is_weekly_restday ? 1 : 0, is_makeup_workday ? 1 : 0, holiday_date).run();
  
  // 清除缓存
  await Promise.all([
    deleteKVCacheByPrefix(env, 'holidays_all'),
    invalidateD1CacheByType(env, 'holidays_all')
  ]).catch(() => {});

  await triggerHolidayPayrollRecalculation(env, ctx, new Set([holiday_date.slice(0, 7)]));
  
  return successResponse({ holiday_date, name }, "更新成功", requestId);
}

/**
 * 删除假日
 */
export async function handleDeleteHoliday(request, env, ctx, requestId, match, url) {
  const holiday_date = match[1];
  
  await env.DATABASE.prepare(
    `DELETE FROM Holidays WHERE holiday_date = ?`
  ).bind(holiday_date).run();
  
  // 清除缓存
  await Promise.all([
    deleteKVCacheByPrefix(env, 'holidays_all'),
    invalidateD1CacheByType(env, 'holidays_all')
  ]).catch(() => {});

  await triggerHolidayPayrollRecalculation(env, ctx, new Set([holiday_date.slice(0, 7)]));
  
  return successResponse({ holiday_date }, "刪除成功", requestId);
}

async function triggerHolidayPayrollRecalculation(env, ctx, monthSet) {
  if (!monthSet || monthSet.size === 0) {
    return;
  }
  
  let users;
  try {
    users = await env.DATABASE.prepare(
      `SELECT user_id FROM Users WHERE is_deleted = 0`
    ).all();
  } catch (err) {
    console.error("[Holidays] 查詢使用者失敗，無法觸發薪資重算:", err);
    return;
  }
  
  const userRows = users?.results || [];
  if (userRows.length === 0) {
    return;
  }
  
  const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
  const jobs = [];
  
  for (const month of monthSet) {
    const refDate = `${month}-01`;
    for (const row of userRows) {
      jobs.push(triggerPayrollRecalculation(env, row.user_id, refDate, ctx, "holiday"));
    }
  }
  
  const runner = Promise.allSettled(jobs).then((results) => {
    const rejected = results.filter(r => r.status === "rejected");
    if (rejected.length) {
      console.error("[Holidays] 觸發薪資重算部分失敗:", rejected.length);
    }
  });
  
  if (ctx && ctx.waitUntil) {
    ctx.waitUntil(runner);
  } else {
    await runner;
  }
}

