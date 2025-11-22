/**
 * 修復工時填寫違規的腳本
 * 檢查並修正：
 * 1. 正常工時超過8小時的情況
 * 2. 工作日正常工時+請假未滿8小時卻填寫加班的情況
 */

import { getDateType } from '../src/handlers/timesheets/utils.js';

async function checkAndFixViolations(env) {
  console.log('開始檢查工時違規...');
  
  // 查詢所有11月的工時記錄
  const timesheets = await env.DATABASE.prepare(
    `SELECT timesheet_id, user_id, work_date, work_type, hours, client_id, service_id, task_type, note
     FROM Timesheets
     WHERE work_date >= '2025-11-01' AND work_date <= '2025-11-30' AND is_deleted = 0
     ORDER BY work_date, user_id, work_type`
  ).all();
  
  // 查詢所有11月的請假記錄
  const leaves = await env.DATABASE.prepare(
    `SELECT user_id, start_date, end_date, unit, amount, status
     FROM LeaveRequests
     WHERE start_date <= '2025-11-30' AND end_date >= '2025-11-01'
       AND status IN ('approved', 'pending') AND is_deleted = 0
     ORDER BY user_id, start_date`
  ).all();
  
  // 建立日期-員工-正常工時的映射
  const dailyNormalHours = new Map(); // Map<`${user_id}_${work_date}`, hours>
  const dailyOvertime = []; // Array of { user_id, work_date, timesheet_id, hours }
  
  (timesheets?.results || []).forEach(t => {
    const userId = t.user_id;
    const workDate = t.work_date;
    const workType = parseInt(t.work_type) || 1;
    const hours = parseFloat(t.hours || 0);
    const key = `${userId}_${workDate}`;
    
    if (workType === 1) {
      // 正常工時
      const current = dailyNormalHours.get(key) || 0;
      dailyNormalHours.set(key, current + hours);
    } else if (workType >= 2 && workType <= 3) {
      // 平日加班
      dailyOvertime.push({
        user_id: userId,
        work_date: workDate,
        timesheet_id: t.timesheet_id,
        hours: hours,
        work_type: workType
      });
    }
  });
  
  // 建立日期-員工-請假時數的映射
  const dailyLeaveHours = new Map(); // Map<`${user_id}_${work_date}`, hours>
  
  (leaves?.results || []).forEach(l => {
    const userId = l.user_id;
    const startDate = l.start_date;
    const endDate = l.end_date;
    const unit = l.unit;
    const amount = parseFloat(l.amount || 0);
    
    // 展開請假日期範圍
    const startParts = startDate.split('-').map(Number);
    const endParts = endDate.split('-').map(Number);
    const startDateObj = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    
    const currentDate = new Date(startDateObj);
    while (currentDate <= endDateObj) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // 只處理11月的日期
      if (dateStr >= '2025-11-01' && dateStr <= '2025-11-30') {
        const key = `${userId}_${dateStr}`;
        let leaveHours = 0;
        
        if (unit === 'day') {
          leaveHours = 8; // 按天請假，每天8小時
        } else {
          // 按小時請假，只在開始日期計算
          if (dateStr === startDate) {
            leaveHours = amount;
          }
        }
        
        if (leaveHours > 0) {
          const current = dailyLeaveHours.get(key) || 0;
          dailyLeaveHours.set(key, current + leaveHours);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });
  
  const violations = [];
  
  // 檢查1：正常工時超過8小時
  for (const [key, normalHours] of dailyNormalHours.entries()) {
    if (normalHours > 8 + 1e-9) {
      const [userId, workDate] = key.split('_');
      const dateType = await getDateType(env, workDate);
      if (dateType === 'workday') {
        violations.push({
          type: 'normal_hours_exceed',
          user_id: userId,
          work_date: workDate,
          normal_hours: normalHours,
          message: `正常工時超過8小時：${normalHours}小時`
        });
      }
    }
  }
  
  // 檢查2：工作日正常工時+請假未滿8小時卻填寫加班
  for (const ot of dailyOvertime) {
    const key = `${ot.user_id}_${ot.work_date}`;
    const normalHours = dailyNormalHours.get(key) || 0;
    const leaveHours = dailyLeaveHours.get(key) || 0;
    const totalNormal = normalHours + leaveHours;
    
    const dateType = await getDateType(env, ot.work_date);
    if (dateType === 'workday' && totalNormal < 8 - 1e-9) {
      violations.push({
        type: 'overtime_without_full_normal',
        user_id: ot.user_id,
        work_date: ot.work_date,
        timesheet_id: ot.timesheet_id,
        normal_hours: normalHours,
        leave_hours: leaveHours,
        total_normal: totalNormal,
        overtime_hours: ot.hours,
        message: `正常工時+請假=${totalNormal}小時，未滿8小時卻填寫加班${ot.hours}小時`
      });
    }
  }
  
  console.log(`發現 ${violations.length} 筆違規記錄：`);
  violations.forEach((v, idx) => {
    console.log(`${idx + 1}. [${v.type}] ${v.message}`);
    if (v.type === 'overtime_without_full_normal') {
      console.log(`   timesheet_id: ${v.timesheet_id}`);
    }
  });
  
  return violations;
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  // 需要從環境獲取 DATABASE
  console.log('此腳本需要在 Worker 環境中執行，或通過 wrangler d1 execute 執行 SQL 修正');
}

export { checkAndFixViolations };










