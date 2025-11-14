/**
 * 重新计算假期余额
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 重新计算用户的假期余额
 */
export async function handleRecalculateLeaveBalances(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  
  // 验证用户身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  const userId = parseInt(match[1], 10);
  
  // 权限检查：只能计算自己的，或管理员可以计算任何人
  if (!user.is_admin && userId !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "沒有權限", null, requestId);
  }
  
  try {
    // 获取用户信息
    const userInfo = await env.DATABASE.prepare(`
      SELECT user_id, start_date as hire_date, gender 
      FROM Users 
      WHERE user_id = ? AND is_deleted = 0
    `).bind(userId).first();
    
    if (!userInfo) {
      return errorResponse(404, "NOT_FOUND", "用戶不存在", null, requestId);
    }
    
    if (!userInfo.hire_date) {
      return errorResponse(422, "VALIDATION_ERROR", "用戶尚未設定到職日，無法計算假期額度", null, requestId);
    }
    
    // 计算特休额度（根据到职日）
    const hireDate = new Date(userInfo.hire_date);
    const today = new Date();
    const monthsWorked = (today.getFullYear() - hireDate.getFullYear()) * 12 + 
                         (today.getMonth() - hireDate.getMonth());
    
    let annualLeaveDays = 0;
    if (monthsWorked >= 6 && monthsWorked < 12) {
      annualLeaveDays = 3; // 满6个月未满1年：3天
    } else if (monthsWorked >= 12) {
      const years = Math.floor(monthsWorked / 12);
      if (years < 1) annualLeaveDays = 3;
      else if (years === 1) annualLeaveDays = 7;
      else if (years === 2) annualLeaveDays = 10;
      else if (years >= 3 && years <= 5) annualLeaveDays = 14;
      else if (years >= 6 && years <= 10) annualLeaveDays = 15;
      else annualLeaveDays = 15 + Math.min(years - 10, 20); // 10年以上每年加1天，最多30天
    }
    
    // 更新或插入假期余额
    const now = new Date().toISOString();
    const currentYear = today.getFullYear();
    
    // 特休
    await env.DATABASE.prepare(`
      INSERT INTO LeaveBalances (user_id, leave_type, year, total, used, remain, created_at, updated_at)
      VALUES (?, 'annual', ?, ?, 0, ?, ?, ?)
      ON CONFLICT(user_id, leave_type, year) 
      DO UPDATE SET total = ?, remain = ?, updated_at = ?
    `).bind(
      userId, currentYear, annualLeaveDays, annualLeaveDays, now, now,
      annualLeaveDays, annualLeaveDays, now
    ).run();
    
    // 病假（固定30天）
    await env.DATABASE.prepare(`
      INSERT INTO LeaveBalances (user_id, leave_type, year, total, used, remain, created_at, updated_at)
      VALUES (?, 'sick', ?, 30, 0, 30, ?, ?)
      ON CONFLICT(user_id, leave_type, year) 
      DO UPDATE SET total = 30, remain = 30, updated_at = ?
    `).bind(userId, currentYear, now, now, now).run();
    
    // 事假（固定14天）
    await env.DATABASE.prepare(`
      INSERT INTO LeaveBalances (user_id, leave_type, year, total, used, remain, created_at, updated_at)
      VALUES (?, 'personal', ?, 14, 0, 14, ?, ?)
      ON CONFLICT(user_id, leave_type, year) 
      DO UPDATE SET total = 14, remain = 14, updated_at = ?
    `).bind(userId, currentYear, now, now, now).run();
    
    return successResponse({
      user_id: String(userId),
      annual_leave: annualLeaveDays,
      sick_leave: 30,
      personal_leave: 14
    }, "假期額度已重新計算", requestId);
  } catch (err) {
    console.error(`[Leaves] Recalculate balances error:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

