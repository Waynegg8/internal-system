/**
 * 臨時診斷端點：檢查資料庫中的婚假餘額記錄
 * 用於診斷刪除操作是否成功
 */

import { errorResponse, successResponse } from "../../utils/response.js";

export async function handleCheckMarriageLeaves(request, env, ctx, requestId, match, url) {
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
    
    // 2. 查詢 LifeEventLeaveGrants 表中的婚假生活事件記錄（不限制 status 和 valid_until）
    const lifeEventRows = await env.DATABASE.prepare(
      `SELECT grant_id, user_id, event_type, leave_type, days_granted, days_used, days_remaining, status, valid_until, event_date
       FROM LifeEventLeaveGrants 
       WHERE event_type = 'marriage' OR leave_type = 'marriage'`
    ).all();
    
    // 2b. 查詢所有 LifeEventLeaveGrants 記錄（用於診斷）
    const allLifeEventRows = await env.DATABASE.prepare(
      `SELECT grant_id, user_id, event_type, leave_type, days_granted, days_used, days_remaining, status, valid_until, event_date
       FROM LifeEventLeaveGrants 
       ORDER BY created_at DESC
       LIMIT 50`
    ).all();
    
    // 3. 查詢 LeaveRequests 表中的婚假申請記錄（僅供參考，不會刪除）
    const requestRows = await env.DATABASE.prepare(
      `SELECT leave_id, user_id, leave_type, start_date, amount, status
       FROM LeaveRequests 
       WHERE leave_type = 'marriage' AND is_deleted = 0`
    ).all();
    
    const balanceRecords = balanceRows?.results || [];
    const lifeEventRecords = lifeEventRows?.results || [];
    const requestRecords = requestRows?.results || [];
    const allLifeEventRecords = allLifeEventRows?.results || [];
    
    return successResponse(
      {
        balances: {
          count: balanceRecords.length,
          records: balanceRecords.map(r => ({
            balance_id: r.balance_id,
            user_id: r.user_id,
            leave_type: r.leave_type,
            year: r.year,
            total: r.total,
            used: r.used,
            remain: r.remain
          }))
        },
        lifeEvents: {
          count: lifeEventRecords.length,
          records: lifeEventRecords.map(r => ({
            grant_id: r.grant_id,
            user_id: r.user_id,
            event_type: r.event_type,
            leave_type: r.leave_type,
            days_granted: r.days_granted,
            days_used: r.days_used,
            days_remaining: r.days_remaining,
            status: r.status,
            valid_until: r.valid_until,
            event_date: r.event_date
          }))
        },
        allLifeEvents: {
          count: allLifeEventRecords.length,
          records: allLifeEventRecords.map(r => ({
            grant_id: r.grant_id,
            user_id: r.user_id,
            event_type: r.event_type,
            leave_type: r.leave_type,
            days_granted: r.days_granted,
            days_used: r.days_used,
            days_remaining: r.days_remaining,
            status: r.status,
            valid_until: r.valid_until,
            event_date: r.event_date
          }))
        },
        requests: {
          count: requestRecords.length,
          records: requestRecords.map(r => ({
            leave_id: r.leave_id,
            user_id: r.user_id,
            leave_type: r.leave_type,
            start_date: r.start_date,
            amount: r.amount,
            status: r.status
          }))
        },
        summary: {
          totalBalances: balanceRecords.length,
          totalLifeEvents: lifeEventRecords.length,
          totalAllLifeEvents: allLifeEventRecords.length,
          totalRequests: requestRecords.length,
          note: "requests 僅供參考，不會被刪除。allLifeEvents 顯示所有生活事件記錄（用於診斷）"
        }
      },
      "查詢完成",
      requestId
    );
  } catch (error) {
    console.error('[Admin] Check marriage leaves error:', error);
    return errorResponse(500, "DATABASE_ERROR", error.message || "查詢婚假記錄失敗", null, requestId);
  }
}

