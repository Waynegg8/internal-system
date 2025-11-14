/**
 * 仪表板主入口
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { generateCacheKey, getKVCache, saveKVCache } from "../../utils/cache.js";
import { ymToday, todayYmd } from "./utils.js";
import { getEmployeeMetrics } from "./dashboard-employee.js";
import { getAdminMetrics } from "./dashboard-admin.js";

export async function handleDashboard(request, env, ctx, requestId, match, url) {
  const method = request.method.toUpperCase();
  const path = url.pathname;
  const user = ctx?.user;
  
  if (path !== '/api/v2/dashboard' || method !== "GET") {
    return errorResponse(404, "NOT_FOUND", "路由不存在", null, requestId);
  }
  
  try {
    const params = url.searchParams;
    const requestedYm = params.get('ym');
    const ym = requestedYm && /^\d{4}-\d{2}$/.test(requestedYm) ? requestedYm : ymToday();
    const financeYm = params.get('financeYm') && /^\d{4}-\d{2}$/.test(params.get('financeYm')) ? params.get('financeYm') : ym;
    const financeMode = params.get('financeMode') || 'month';
    const activityDays = params.get('activity_days') || '3';
    const activityUserId = params.get('activity_user_id') || '';
    const activityType = params.get('activity_type') || '';
    const today = todayYmd();
    
    // KV缓存
    const cacheKey = `dashboard:userId=${user.user_id}&ym=${ym}&financeYm=${financeYm}&financeMode=${financeMode}&role=${user.is_admin ? 'admin' : 'employee'}&actDays=${activityDays}&actUser=${activityUserId}&actType=${activityType}`;
    
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached?.data) {
      return successResponse(kvCached.data, "查詢成功（KV缓存）", requestId, {
        month: ym,
        financeYm,
        financeMode,
        today,
        ...kvCached.meta,
        cache_source: 'kv'
      });
    }
    
    // 根据用户角色返回不同数据
    let data;
    if (user.is_admin) {
      const adminData = await getAdminMetrics(env, ym, financeYm, financeMode, today, url.searchParams);
      data = {
        role: 'admin',
        admin: adminData
      };
    } else {
      const employeeData = await getEmployeeMetrics(env, user, ym, today);
      data = {
        role: 'employee',
        employee: employeeData
      };
    }
    
    // 保存到缓存（TTL: 8小時，因為每天凌晨2點會自動預先計算，確保到早上10點都有效）
    await saveKVCache(env, cacheKey, 'dashboard', data, { ttl: 28800 }).catch(() => {});
    
    return successResponse(data, "查詢成功", requestId, {
      month: ym,
      financeYm,
      financeMode,
      today
    });
    
  } catch (err) {
    console.error(`[Dashboard] Error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

