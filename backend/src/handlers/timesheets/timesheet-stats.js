/**
 * 工时统计功能
 */

import { successResponse } from "../../utils/response.js";

/**
 * 获取我的工时统计
 */
export async function handleGetMyStats(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const params = url.searchParams;
  const month = params.get("month") || new Date().toISOString().substring(0, 7);
  
  const [year, monthNum] = month.split('-');
  const startDate = `${year}-${monthNum}-01`;
  const nextMonth = parseInt(monthNum) === 12 ? `${parseInt(year) + 1}-01` : `${year}-${String(parseInt(monthNum) + 1).padStart(2, '0')}`;
  const endDate = `${nextMonth}-01`;
  
  const rows = await env.DATABASE.prepare(
    `SELECT work_type, hours FROM Timesheets
     WHERE user_id = ? AND work_date >= ? AND work_date < ? AND is_deleted = 0`
  ).bind(user.user_id, startDate, endDate).all();
  
  let totalHours = 0;
  let overtimeHours = 0;
  (rows?.results || []).forEach(log => {
    const hours = parseFloat(log.hours) || 0;
    totalHours += hours;
    if (log.work_type && parseInt(log.work_type) > 1) {
      overtimeHours += hours;
    }
  });
  
  const data = {
    month,
    total_hours: Math.round(totalHours * 10) / 10,
    overtime_hours: Math.round(overtimeHours * 10) / 10,
    weighted_hours: Math.round(totalHours * 10) / 10,
    leave_hours: 0
  };
  
  return successResponse(data, "查詢成功", requestId);
}






