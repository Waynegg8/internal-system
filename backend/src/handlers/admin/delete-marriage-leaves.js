/**
 * 臨時管理端點：刪除資料庫中的婚假餘額記錄
 * 注意：此端點僅供管理員使用，完成後應刪除此文件
 * 
 * 刪除的內容：
 * 1. LeaveBalances 表中 leave_type = 'marriage' 的餘額記錄
 * 2. LifeEventLeaveGrants 表中 event_type = 'marriage' 或 leave_type = 'marriage' 的生活事件記錄
 * 
 * 注意：不會刪除 LeaveRequests 表中的請假申請記錄
 */

import { errorResponse, successResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix, invalidateD1CacheByType } from "../../utils/cache.js";

export async function handleDeleteMarriageLeaves(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 驗證管理員權限
  if (!user || !user.is_admin) {
    return errorResponse(403, "FORBIDDEN", "僅管理員可執行此操作", null, requestId);
  }
  
  try {
    // 1. 查詢 LeaveBalances 表中的婚假餘額
    const balanceRows = await env.DATABASE.prepare(
      `SELECT balance_id, user_id, leave_type, year, total, used, remain
       FROM LeaveBalances 
       WHERE leave_type = 'marriage'`
    ).all();
    
    // 2. 查詢 LifeEventLeaveGrants 表中的婚假生活事件記錄
    const lifeEventRows = await env.DATABASE.prepare(
      `SELECT grant_id, user_id, event_type, leave_type, days_granted, days_used, days_remaining, status
       FROM LifeEventLeaveGrants 
       WHERE event_type = 'marriage' OR leave_type = 'marriage'`
    ).all();
    
    const balanceRecords = balanceRows?.results || [];
    const lifeEventRecords = lifeEventRows?.results || [];
    
    if (balanceRecords.length === 0 && lifeEventRecords.length === 0) {
      return successResponse(
        { 
          balancesDeleted: 0,
          lifeEventsDeleted: 0,
          balanceRecords: [],
          lifeEventRecords: []
        },
        "未找到婚假餘額記錄",
        requestId
      );
    }
    
    // 3. 刪除 LeaveBalances 表中的婚假餘額
    const deleteBalanceResult = await env.DATABASE.prepare(
      `DELETE FROM LeaveBalances 
       WHERE leave_type = 'marriage'`
    ).run();
    
    // 4. 刪除 LifeEventLeaveGrants 表中的婚假生活事件記錄
    const deleteLifeEventResult = await env.DATABASE.prepare(
      `DELETE FROM LifeEventLeaveGrants 
       WHERE event_type = 'marriage' OR leave_type = 'marriage'`
    ).run();
    
    const balancesDeleted = deleteBalanceResult.meta?.changes || 0;
    const lifeEventsDeleted = deleteLifeEventResult.meta?.changes || 0;
    
    // 5. 清除相關快取
    await Promise.all([
      deleteKVCacheByPrefix(env, 'leaves_'),
      invalidateD1CacheByType(env, 'leaves_balances'),
      invalidateD1CacheByType(env, 'leaves_list')
    ]).catch(err => {
      console.error('[Admin] Cache invalidation error:', err);
    });
    
    return successResponse(
      {
        balancesDeleted,
        lifeEventsDeleted,
        totalDeleted: balancesDeleted + lifeEventsDeleted,
        balanceRecords: balanceRecords.map(r => ({
          balance_id: r.balance_id,
          user_id: r.user_id,
          leave_type: r.leave_type,
          year: r.year,
          total: r.total,
          used: r.used,
          remain: r.remain
        })),
        lifeEventRecords: lifeEventRecords.map(r => ({
          grant_id: r.grant_id,
          user_id: r.user_id,
          event_type: r.event_type,
          leave_type: r.leave_type,
          days_granted: r.days_granted,
          days_used: r.days_used,
          days_remaining: r.days_remaining,
          status: r.status
        }))
      },
      `已刪除 ${balancesDeleted} 筆婚假餘額記錄和 ${lifeEventsDeleted} 筆婚假生活事件記錄`,
      requestId
    );
  } catch (error) {
    console.error('[Admin] Delete marriage leave balances error:', error);
    return errorResponse(500, "DATABASE_ERROR", error.message || "刪除婚假餘額失敗", null, requestId);
  }
}

