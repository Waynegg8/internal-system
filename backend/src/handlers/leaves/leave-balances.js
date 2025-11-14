/**
 * 假期余额管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache, getD1Cache, saveD1Cache } from "../../utils/cache.js";

/**
 * 确保用户有基本假期余额记录
 */
export async function ensureBasicLeaveBalances(env, userId, year) {
  await env.DATABASE.prepare(
    `INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at) 
     VALUES (?, 'sick', ?, 30, 0, 30, datetime('now'))`
  ).bind(userId, year).run();
  
  await env.DATABASE.prepare(
    `INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at) 
     VALUES (?, 'personal', ?, 14, 0, 14, datetime('now'))`
  ).bind(userId, year).run();
}

/**
 * 获取假期余额
 */
export async function handleGetLeaveBalances(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const params = url.searchParams;
  const year = parseInt(params.get("year") || String(new Date().getFullYear()), 10);
  const queryUserId = params.get("user_id");
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return new Response(JSON.stringify({
      ok: false,
      error: "UNAUTHORIZED",
      message: "未登入或身份驗證失敗"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  try {
    // 确定查询的用户ID：管理员可以指定，员工只能查自己
    let targetUserId = String(user.user_id);
    if (queryUserId && user.is_admin) {
      targetUserId = String(queryUserId);
    }
    
    const bypass = (params.get('fresh') || params.get('nocache')) === '1';
    const cacheKey = generateCacheKey('leaves_balances', { userId: targetUserId, year });
    
    if (!bypass) {
      const kvCached = await getKVCache(env, cacheKey);
      if (kvCached?.data) {
        return successResponse(kvCached.data, "成功（KV缓存）", requestId, {
          ...kvCached.meta,
          cache_source: 'kv'
        });
      }
      
      const d1Cached = await getD1Cache(env, cacheKey);
      if (d1Cached?.data) {
        saveKVCache(env, cacheKey, 'leaves_balances', d1Cached.data, { ttl: 3600 }).catch(() => {});
        return successResponse(d1Cached.data, "成功（D1缓存）", requestId, {
          ...d1Cached.meta,
          cache_source: 'd1'
        });
      }
    }
    
    // 确保用户有基本假期余额记录
    await ensureBasicLeaveBalances(env, targetUserId, year);
    
    // 排除補休類型（補休由 CompensatoryLeaveGrants 計算）
    const rows = await env.DATABASE.prepare(
      `SELECT leave_type, year, total, used, remain 
       FROM LeaveBalances 
       WHERE user_id = ? AND year = ? AND leave_type != 'comp'`
    ).bind(targetUserId, year).all();
    
    const data = (rows?.results || []).map(r => ({
      type: r.leave_type,
      year: Number(r.year),
      total: Number(r.total),
      used: Number(r.used),
      remain: Number(r.remain)
    }));
    
    // 補休餘額從 CompensatoryLeaveGrants 計算
    const compRow = await env.DATABASE.prepare(
      `SELECT SUM(hours_remaining) as total 
       FROM CompensatoryLeaveGrants 
       WHERE user_id = ? AND status = 'active' AND hours_remaining > 0`
    ).bind(targetUserId).first();
    
    const compRemain = Number(compRow?.total || 0);
    if (compRemain > 0) {
      data.push({ type: 'comp', year, total: compRemain, used: 0, remain: compRemain });
    }
    
    // 添加生活事件假期餘額
    const lifeEventRows = await env.DATABASE.prepare(
      `SELECT event_type, leave_type, days_granted, days_used, days_remaining, valid_until
       FROM LifeEventLeaveGrants 
       WHERE user_id = ? AND status = 'active' AND days_remaining > 0 
       AND date(valid_until) >= date('now')`
    ).bind(targetUserId).all();
    
    (lifeEventRows?.results || []).forEach(r => {
      data.push({
        type: r.leave_type,
        year,
        total: Number(r.days_granted || 0),
        used: Number(r.days_used || 0),
        remain: Number(r.days_remaining || 0),
        validUntil: r.valid_until
      });
    });
    
    await Promise.all([
      saveKVCache(env, cacheKey, 'leaves_balances', data, { ttl: 3600 }),
      saveD1Cache(env, cacheKey, 'leaves_balances', data, {})
    ]).catch(() => {});
    
    return successResponse(data, "成功", requestId, { year, userId: targetUserId });
  } catch (error) {
    console.error('[Leaves] Get leave balances error:', error);
    return errorResponse(500, "DATABASE_ERROR", error.message || "查詢假期餘額失敗", null, requestId);
  }
}

