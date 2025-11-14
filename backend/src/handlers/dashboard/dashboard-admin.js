/**
 * 管理员视图仪表板指标
 */

export async function getAdminMetrics(env, ym, financeYm, financeMode, today, params = {}) {
  const res = {
    employeeHours: [],
    employeeTasks: [],
    financialStatus: null,
    revenueTrend: [],
    recentActivities: [],
    teamMembers: [],
    receiptsPendingTasks: []
  };
  
  // Employee hours
  try {
    // 計算本月工作日數（週一-週五，排除國定假日）
    const [year, monthNum] = ym.split('-');
    console.log(`[Dashboard] 計算員工工時，月份: ${ym}, year: ${year}, monthNum: ${monthNum}`);
    const firstDay = `${year}-${monthNum}-01`;
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
    
    // 查詢國定假日
    const holidays = await env.DATABASE.prepare(
      `SELECT holiday_date FROM Holidays 
       WHERE holiday_date >= ? AND holiday_date <= ? AND is_national_holiday = 1`
    ).bind(firstDay, lastDayStr).all();
    
    const holidaySet = new Set((holidays?.results || []).map(h => h.holiday_date));
    
    // 計算工作日數（只到今天為止）
    const todayStr = today || new Date().toISOString().split('T')[0];
    const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);
    const isCurrentMonth = todayYear === parseInt(year) && todayMonth === parseInt(monthNum);
    const maxDayForWorkdays = isCurrentMonth ? Math.min(lastDay, todayDay) : lastDay; // 如果是當前月份，只計算到今天
    
    let workdays = 0;
    for (let d = 1; d <= maxDayForWorkdays; d++) {
      const dateStr = `${year}-${monthNum}-${String(d).padStart(2, '0')}`;
      const date = new Date(dateStr + 'T00:00:00');
      const dayOfWeek = date.getDay();
      // 週一-週五（1-5）且非國定假日
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidaySet.has(dateStr)) {
        workdays++;
      }
    }
    const expectedNormalHours = workdays * 8;
    
    // 計算工時查詢的截止日期（當前月份只到今天，其他月份到月底）
    const maxDateForQuery = isCurrentMonth ? todayStr : lastDayStr;
    
    // 查詢工時和請假（只到今天為止）
    const result = await env.DATABASE.prepare(
      `SELECT u.user_id, u.name, u.username,
              COALESCE(SUM(CASE WHEN t.work_date <= ? THEN t.hours ELSE 0 END), 0) AS total,
              COALESCE(SUM(CASE WHEN t.work_date <= ? AND CAST(t.work_type AS INTEGER) = 1 THEN t.hours ELSE 0 END), 0) AS normal,
              COALESCE(SUM(CASE WHEN t.work_date <= ? AND CAST(t.work_type AS INTEGER) >= 2 THEN t.hours ELSE 0 END), 0) AS overtime
       FROM Users u
       LEFT JOIN Timesheets t ON t.user_id = u.user_id AND t.is_deleted = 0 AND substr(t.work_date, 1, 7) = ?
       WHERE u.is_deleted = 0
       GROUP BY u.user_id, u.name, u.username
       ORDER BY total DESC, u.name ASC`
    ).bind(maxDateForQuery, maxDateForQuery, maxDateForQuery, ym).all();
    
    // 查詢請假時數（只到今天為止，且只計算工作日）
    // 注意：這裡先不計算總請假時數，而是通過 userLeaveHoursMap 來計算（只計算工作日）
    const leaveResults = await env.DATABASE.prepare(
      `SELECT user_id, 0 AS leave_hours
       FROM Users
       WHERE is_deleted = 0
       GROUP BY user_id`
    ).all();
    
    const leaveMap = new Map();
    (leaveResults?.results || []).forEach(r => {
      leaveMap.set(r.user_id, Number(r.leave_hours || 0));
    });
    
    // 生成工作日日期列表（只到今天為止）
    const maxDay = isCurrentMonth ? Math.min(lastDay, todayDay) : lastDay; // 如果是當前月份，只計算到今天
    
    const workdayDates = [];
    for (let d = 1; d <= maxDay; d++) {
      const dateStr = `${year}-${monthNum}-${String(d).padStart(2, '0')}`;
      const date = new Date(dateStr + 'T00:00:00');
      const dayOfWeek = date.getDay();
      // 週一-週五（1-5）且非國定假日
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidaySet.has(dateStr)) {
        workdayDates.push(dateStr);
      }
    }
    
    // 查詢每個員工每個工作日的正常工時總和（只到今天為止）
    // 注意：這裡需要查詢所有工時記錄（不僅僅是正常工時），然後按日期分組計算正常工時總和
    // 移除 HAVING 子句，因為即使某天沒有正常工時，也需要知道（用於計算缺工時）
    const timesheetDailyResult = await env.DATABASE.prepare(
      `SELECT user_id, work_date, 
              COALESCE(SUM(CASE WHEN CAST(work_type AS INTEGER) = 1 THEN hours ELSE 0 END), 0) AS daily_normal_hours
       FROM Timesheets
       WHERE substr(work_date, 1, 7) = ? 
         AND work_date <= ?
         AND is_deleted = 0
       GROUP BY user_id, work_date`
    ).bind(ym, maxDateForQuery).all();
    
    console.log(`[Dashboard] 查詢到的每日正常工時記錄數量: ${timesheetDailyResult?.results?.length || 0}`);
    // 調試：輸出 11/05 的工時記錄
    (timesheetDailyResult?.results || []).forEach(r => {
      if (r.work_date === '2025-11-05' && (r.user_id === 50 || r.user_id === 51 || r.user_id === 52)) {
        console.log(`[Dashboard] 員工 ${r.user_id} 在 2025-11-05 的正常工時: ${r.daily_normal_hours} 小時`);
      }
    });
    
    // 查詢每個員工請假的日期
    const leaveDatesResult = await env.DATABASE.prepare(
      `SELECT user_id, start_date, end_date, unit, amount
       FROM LeaveRequests
       WHERE start_date <= ? AND end_date >= ?
         AND status IN ('approved', 'pending')
         AND is_deleted = 0`
    ).bind(lastDayStr, firstDay).all();
    
    // 建立每個員工每個工作日的正常工時總和 Map
    const userDailyNormalHoursMap = new Map();
    (timesheetDailyResult?.results || []).forEach(r => {
      const userId = r.user_id;
      const dateStr = r.work_date;
      const hours = Number(r.daily_normal_hours || 0);
      if (!userDailyNormalHoursMap.has(userId)) {
        userDailyNormalHoursMap.set(userId, new Map());
      }
      // 即使 hours 為 0，也要記錄（用於區分「有記錄但為0」和「沒有記錄」）
      userDailyNormalHoursMap.get(userId).set(dateStr, hours);
      // 調試日誌：記錄查詢到的工時記錄
      if (userId === 50 || userId === 51 || userId === 52) {
        console.log(`[Dashboard] 查詢到員工 ${userId} 在 ${dateStr} 有 ${hours} 小時正常工時`);
      }
    });
    
    // 建立每個員工每個工作日的請假時數 Map（而不只是日期集合，以處理部分請假）
    const userLeaveHoursMap = new Map();  // Map<userId, Map<dateStr, hours>>
    (leaveDatesResult?.results || []).forEach(r => {
      const userId = r.user_id;
      const startDateStr = r.start_date; // 保持為字符串
      const endDateStr = r.end_date; // 保持為字符串
      const isDayUnit = r.unit === 'day';
      const amount = Number(r.amount || 0);
      
      if (!userLeaveHoursMap.has(userId)) {
        userLeaveHoursMap.set(userId, new Map());
      }
      const userLeaveHours = userLeaveHoursMap.get(userId);
      
      // 如果是按天請假，展開 start_date 到 end_date 之間的所有日期，每天8小時
      if (isDayUnit) {
        // 使用本地時間創建日期對象，避免時區問題
        const startParts = startDateStr.split('-').map(Number);
        const endParts = endDateStr.split('-').map(Number);
        const startDateObj = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const endDateObj = new Date(endParts[0], endParts[1] - 1, endParts[2]);
        
        // 遍歷從 start_date 到 end_date 的每一天
        const currentDate = new Date(startDateObj);
        while (currentDate <= endDateObj) {
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          // 只計算在查詢月份內且到今天為止的日期，且必須是工作日
          if (dateStr >= firstDay && dateStr <= lastDayStr && dateStr <= maxDateForQuery) {
            // 檢查是否為工作日（週一-週五且非國定假日）
            const dateParts = dateStr.split('-').map(Number);
            const checkDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            const dayOfWeek = checkDate.getDay();
            const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5 && !holidaySet.has(dateStr);
            
            if (isWorkday) {
              const existingHours = userLeaveHours.get(dateStr) || 0;
              userLeaveHours.set(dateStr, existingHours + 8); // 按天請假每天8小時
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // 如果是按小時請假，記錄該日期的請假時數（且必須是工作日）
        const dateStr = startDateStr;
        const leaveHours = Number(r.amount || 0);
        if (dateStr >= firstDay && dateStr <= lastDayStr && dateStr <= maxDateForQuery) {
          // 檢查是否為工作日（週一-週五且非國定假日）
          const dateParts = dateStr.split('-').map(Number);
          const checkDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
          const dayOfWeek = checkDate.getDay();
          const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5 && !holidaySet.has(dateStr);
          
          if (isWorkday) {
            const existingHours = userLeaveHours.get(dateStr) || 0;
            userLeaveHours.set(dateStr, existingHours + leaveHours);
          }
        }
      }
    });
    
    // 計算每個員工缺少正常工時的日期和時數
    res.employeeHours = (result?.results || []).map(r => {
      const userId = r.user_id;
      const normal = Number(r.normal || 0);
      
      // 計算每個工作日的缺少工時（考慮部分請假的情況）
      const dailyNormalHoursMap = userDailyNormalHoursMap.get(userId) || new Map();
      const dailyLeaveHoursMap = userLeaveHoursMap.get(userId) || new Map();
      
      // 重新計算請假時數（只計算工作日）
      // 重要：這裡累加的是 dailyLeaveHoursMap 中的所有值，這些值已經只包含工作日
      const leaveHours = Array.from(dailyLeaveHoursMap.values()).reduce((sum, hours) => sum + hours, 0);
      
      // 重新計算正常工時（只計算工作日）
      // 問題：normal 是從 SQL 查詢出來的，包含了所有日期（包括非工作日）的正常工時
      // 但我們需要的是只計算工作日的正常工時
      let normalWorkdaysOnly = 0;
      const missingDates = [];
      let totalMissingHours = 0;
      const STANDARD_HOURS_PER_DAY = 8;
      
      // 關鍵發現：leaveHours 是從 dailyLeaveHoursMap 累加的，而 dailyLeaveHoursMap 只包含工作日的請假
      // 但在 workdayDates.forEach 中，我們對每個工作日分別計算
      // 問題可能在於：如果某個工作日同時有正常工時和請假，但在計算 normalWorkdaysOnly 時，我們只加了 dailyNormalHours
      // 而 leaveHours 已經包含了 dailyLeaveHours，所以總計 = normalWorkdaysOnly + leaveHours + totalMissingHours
      // 但這可能導致 double counting 或者 missing counting
      
      // 正確的計算邏輯：
      // 對於每個工作日：
      // - 正常工時 + 請假應該 <= 8 小時（這是業務規則，前後端已禁止超過 8 小時）
      // - 如果 normal + leave < 8，那麼 missing = 8 - (normal + leave)
      //   - normalWorkdaysOnly += dailyNormalHours（實際填寫的正常工時）
      //   - leaveHours 已經包含了 dailyLeaveHours（因為它是從 dailyLeaveHoursMap 累加的）
      //   - totalMissingHours += (8 - totalFilledHours)
      // - 如果 normal + leave = 8，那麼 missing = 0
      //   - normalWorkdaysOnly += dailyNormalHours（實際填寫的正常工時）
      //   - leaveHours 已經包含了 dailyLeaveHours
      //   - totalMissingHours += 0
      // - 如果發現 normal + leave > 8，這是數據異常，記錄錯誤但正常計算
      //   - normalWorkdaysOnly += (8 - dailyLeaveHours)（只計算到 8 小時）
      //   - leaveHours 已經包含了 dailyLeaveHours，但這會導致總計 > 8
      //   - 這是一個問題！
      // 最終：normalWorkdaysOnly + leaveHours + totalMissingHours = workdayDates.length * 8
      
      // 修正後的邏輯：
      // 為了確保一致性，我們應該重新計算 leaveHours，只包含工作日在 workdayDates.forEach 中處理過的日期
      let recalculatedLeaveHours = 0;
      
      workdayDates.forEach(dateStr => {
        const dailyNormalHours = dailyNormalHoursMap.get(dateStr) || 0;  // 該日期填寫的正常工時
        const dailyLeaveHours = dailyLeaveHoursMap.get(dateStr) || 0;  // 該日期的請假時數
        const totalFilledHours = dailyNormalHours + dailyLeaveHours;  // 正常工時 + 請假時數
        
        // 如果 totalFilledHours > 8，這是數據異常（正常工時 + 請假不應該超過 8）
        // 應該通過前後端驗證禁止，但如果仍有異常數據，記錄錯誤
        if (totalFilledHours > STANDARD_HOURS_PER_DAY) {
          console.error(`[Dashboard] 錯誤：員工 ${userId} (${r.name || r.username}) 在 ${dateStr} 的總工時超過 8 小時：正常 ${dailyNormalHours} + 請假 ${dailyLeaveHours} = ${totalFilledHours}。這是數據異常，應通過前後端驗證禁止。`);
          // 為了計算一致性，我們只計算到 8 小時
          if (dailyLeaveHours > 0) {
            normalWorkdaysOnly += STANDARD_HOURS_PER_DAY - dailyLeaveHours;
            recalculatedLeaveHours += dailyLeaveHours;  // 包含請假時數（但總計會被限制在 8 小時）
          } else {
            normalWorkdaysOnly += STANDARD_HOURS_PER_DAY;
            // 沒有請假，所以 recalculatedLeaveHours 不加
          }
          // 不計入缺工時（因為已經超過 8 小時）
        } else if (totalFilledHours < STANDARD_HOURS_PER_DAY) {
          // 如果 totalFilledHours < 8，那麼缺工時 = 8 - totalFilledHours
          const missingHoursForDay = STANDARD_HOURS_PER_DAY - totalFilledHours;
          totalMissingHours += missingHoursForDay;
          missingDates.push({
            date: dateStr,
            missingHours: missingHoursForDay
          });
          normalWorkdaysOnly += dailyNormalHours;  // 計算實際填寫的正常工時
          recalculatedLeaveHours += dailyLeaveHours;  // 累加請假時數
          // 調試日誌：記錄缺工時的日期
          if (userId === 50 || userId === 51 || userId === 52) {
            console.log(`[Dashboard] 員工 ${userId} (${r.name || r.username}) 在 ${dateStr} 缺工時: 正常工時 ${dailyNormalHours}小時, 請假 ${dailyLeaveHours}小時, 總計 ${totalFilledHours}小時, 缺 ${missingHoursForDay}小時`);
          }
        } else {
          // totalFilledHours === 8，完全填滿
          normalWorkdaysOnly += dailyNormalHours;  // 計算實際填寫的正常工時
          recalculatedLeaveHours += dailyLeaveHours;  // 累加請假時數
          // 不計入缺工時（因為已經達到 8 小時）
        }
      });
      
      // 使用重新計算的請假時數（只包含工作日的請假）
      const finalLeaveHours = recalculatedLeaveHours;
      
      // 驗證：workdayDates.length 應該等於 workdays
      if (workdayDates.length !== workdays) {
        console.warn(`[Dashboard] 警告：員工 ${userId} (${r.name || r.username}) 的工作日列表長度 (${workdayDates.length}) 與工作日數 (${workdays}) 不一致！`);
      }
      
      // 驗證：正常工時 + 請假 + 尚缺 應該等於 應有
      // 應有 = workdayDates.length * 8
      // 正常工時（工作日）+ 請假（工作日）+ 尚缺（工作日）= 應有
      const calculatedTotal = normalWorkdaysOnly + finalLeaveHours + totalMissingHours;
      const actualExpected = workdayDates.length * 8; // 使用 workdayDates.length 作為真實的工作日數
      
      // 驗證：正常工時 + 請假 + 尚缺 應該等於 應有
      // 每個工作日：normal + leave + missing = 8
      // 總計：normalWorkdaysOnly + leaveHours + totalMissingHours = workdayDates.length * 8
      
      if (Math.abs(calculatedTotal - actualExpected) > 0.01) {
        console.error(`[Dashboard] 錯誤：員工 ${userId} (${r.name || r.username}) 的工時計算不一致: 
          正常工時（工作日）${normalWorkdaysOnly} + 請假（工作日）${finalLeaveHours}（原：${leaveHours}） + 尚缺 ${totalMissingHours} = ${calculatedTotal}, 
          應有（工作日數=${workdayDates.length} × 8）=${actualExpected}, 
          差異 ${calculatedTotal - actualExpected}`);
        console.error(`[Dashboard] 原始 normal（所有日期）=${normal}, workdays=${workdays}, expectedNormalHours=${expectedNormalHours}`);
        
        // 詳細檢查每個工作日的情況
        workdayDates.forEach(dateStr => {
          const dailyNormal = dailyNormalHoursMap.get(dateStr) || 0;
          const dailyLeave = dailyLeaveHoursMap.get(dateStr) || 0;
          const dailyTotal = dailyNormal + dailyLeave;
          if (dailyTotal > 8) {
            console.error(`[Dashboard] 警告：員工 ${userId} (${r.name || r.username}) 在 ${dateStr} 的總工時超過 8 小時：正常 ${dailyNormal} + 請假 ${dailyLeave} = ${dailyTotal}`);
          }
        });
      }
      
      // 調試日誌：輸出該員工的所有工時記錄
      if (userId === 50 || userId === 51 || userId === 52) {
        console.log(`[Dashboard] 員工 ${userId} (${r.name || r.username}): workdays=${workdays}, workdayDates.length=${workdayDates.length}, expectedNormalHours=${expectedNormalHours}`);
        console.log(`[Dashboard] 員工 ${userId} (${r.name || r.username}) 的工作日列表:`, workdayDates.slice(0, 10).join(', '), `...共${workdayDates.length}天`);
        console.log(`[Dashboard] 員工 ${userId} (${r.name || r.username}) 的工時記錄:`, Array.from(dailyNormalHoursMap.entries()).map(([date, hours]) => `${date}: ${hours}小時`).join(', ') || '無');
        console.log(`[Dashboard] 員工 ${userId} (${r.name || r.username}) 的請假時數:`, Array.from(dailyLeaveHoursMap.entries()).map(([date, hours]) => `${date}: ${hours}小時`).join(', ') || '無');
        console.log(`[Dashboard] 員工 ${userId} (${r.name || r.username}) 計算出的缺工時日期:`, missingDates.map(m => `${m.date} (缺${m.missingHours}小時)`).join(', ') || '無');
        console.log(`[Dashboard] 員工 ${userId} (${r.name || r.username}) 正常工時（所有日期）=${normal}, 正常工時（工作日）=${normalWorkdaysOnly}`);
        
        // 特別檢查 11/5
        if (workdayDates.includes('2025-11-05')) {
          const dailyNormal = dailyNormalHoursMap.get('2025-11-05') || 0;
          const dailyLeave = dailyLeaveHoursMap.get('2025-11-05') || 0;
          const totalFilled = dailyNormal + dailyLeave;
          console.log(`[Dashboard] 員工 ${userId} (${r.name || r.username}) 在 2025-11-05: 正常工時=${dailyNormal}, 請假=${dailyLeave}, 總計=${totalFilled}, 缺=${8 - totalFilled}`);
        } else {
          console.log(`[Dashboard] 員工 ${userId} (${r.name || r.username}) 在 2025-11-05 不在工作日列表中！`);
        }
      }
      
      // 按日期排序
      missingDates.sort((a, b) => a.date.localeCompare(b.date));
      
      // 使用只計算工作日的正常工時和實際的工作日數
      // actualExpected 已在上面聲明，這裡直接使用
      
      return {
        userId: userId,
        name: r.name || r.username || '未命名',
        total: Number(r.total || 0),
        normal: normalWorkdaysOnly, // 使用只計算工作日的正常工時
        overtime: Number(r.overtime || 0),
        leaveHours: finalLeaveHours,
        expectedNormalHours: actualExpected, // 使用 workdayDates.length * 8（已在上面計算）
        missingNormalHours: totalMissingHours,
        missingDates: missingDates.slice(0, 20) // 返回包含 date 和 missingHours 的物件陣列
      };
    });
    
    console.log(`[Dashboard] 計算完成，員工數量: ${res.employeeHours.length}`);
  } catch (error) {
    console.error('[Dashboard] Employee hours error:', error);
    console.error('[Dashboard] Employee hours error stack:', error.stack);
    // 即使有錯誤，也要返回空數組，而不是 undefined
    if (!res.employeeHours) {
      res.employeeHours = [];
    }
  }
  
  // Employee tasks (各员工任务状态：已完成/进行中/逾期)
  try {
    // 先获取基本统计
    const summaryRows = await env.DATABASE.prepare(
      `SELECT u.user_id, u.name, u.username,
              COUNT(CASE WHEN t.status = 'completed' AND t.service_month = ? THEN 1 END) AS completed
       FROM Users u
       LEFT JOIN ActiveTasks t ON t.assignee_user_id = u.user_id AND t.is_deleted = 0
       WHERE u.is_deleted = 0
       GROUP BY u.user_id, u.name, u.username`
    ).bind(ym).all();
    
    // 获取未完成任务的月份分布详情
    const detailRows = await env.DATABASE.prepare(
      `SELECT u.user_id, 
              t.service_month,
              t.status,
              CASE WHEN t.status NOT IN ('completed','cancelled') AND t.due_date < ? THEN 1 ELSE 0 END as is_overdue,
              COUNT(*) as count
       FROM Users u
       LEFT JOIN ActiveTasks t ON t.assignee_user_id = u.user_id 
              AND t.is_deleted = 0 
              AND t.status NOT IN ('completed', 'cancelled')
       WHERE u.is_deleted = 0 AND t.task_id IS NOT NULL
       GROUP BY u.user_id, t.service_month, t.status, is_overdue`
    ).bind(today).all();
    
    // 构建用户任务映射
    const userTasksMap = {};
    (summaryRows?.results || []).forEach(r => {
      userTasksMap[r.user_id] = {
        userId: r.user_id,
        name: r.name || r.username,
        completed: Number(r.completed || 0),
        inProgress: {},
        overdue: {}
      };
    });
    
    // 填充月份分布详情
    (detailRows?.results || []).forEach(r => {
      const user = userTasksMap[r.user_id];
      if (!user) return;
      
      const month = r.service_start_month || substr(r.receipt_date, 1, 7) || '未知';
      const count = Number(r.count || 0);
      
      if (r.is_overdue === 1) {
        user.overdue[month] = (user.overdue[month] || 0) + count;
      } else if (r.status === 'in_progress') {
        user.inProgress[month] = (user.inProgress[month] || 0) + count;
      }
    });
    
    res.employeeTasks = Object.values(userTasksMap).sort((a, b) => {
      const aOverdue = Object.values(a.overdue).reduce((sum, n) => sum + n, 0);
      const bOverdue = Object.values(b.overdue).reduce((sum, n) => sum + n, 0);
      const aInProgress = Object.values(a.inProgress).reduce((sum, n) => sum + n, 0);
      const bInProgress = Object.values(b.inProgress).reduce((sum, n) => sum + n, 0);
      return (bOverdue - aOverdue) || (bInProgress - aInProgress);
    });
  } catch (err) {
    console.error('[Dashboard] Employee tasks query error:', err);
  }
  
  // Financial status - 根据finMode返回对应数据
  try {
    const currentYear = financeYm.split('-')[0];
    
    // 现金流数据（实时，不分月份）
    const arRow = await env.DATABASE.prepare(
      `SELECT SUM(total_amount) AS ar FROM Receipts WHERE is_deleted = 0 AND status IN ('unpaid','partial')`
    ).first();
    const overdueRow = await env.DATABASE.prepare(
      `SELECT SUM(total_amount) AS od FROM Receipts WHERE is_deleted = 0 AND status IN ('unpaid','partial') AND due_date < ?`
    ).bind(today).first();
    const ar = Math.round(Number(arRow?.ar || 0));
    const overdue = Math.round(Number(overdueRow?.od || 0));
    
    let monthData = null;
    let ytdData = null;
    
    if (financeMode === 'month') {
      // 月度数据
      const monthPaidRow = await env.DATABASE.prepare(
        `SELECT SUM(total_amount) AS paid FROM Receipts WHERE is_deleted = 0 AND status = 'paid' AND substr(receipt_date,1,7) = ?`
      ).bind(financeYm).first();
      const monthRevRow = await env.DATABASE.prepare(
        `SELECT SUM(total_amount) AS revenue FROM Receipts WHERE is_deleted = 0 AND status != 'cancelled' AND substr(receipt_date,1,7) = ?`
      ).bind(financeYm).first();
      let monthCost = 0;
      try {
        const pr = await env.DATABASE.prepare(`SELECT SUM(total_cents) AS c FROM MonthlyPayroll mp JOIN PayrollRuns pr ON pr.run_id = mp.run_id WHERE pr.month = ?`).bind(financeYm).first();
        monthCost = Math.round(Number(pr?.c || 0) / 100);
      } catch (_) {}
      
      const monthRevenue = Math.round(Number(monthRevRow?.revenue || 0));
      const monthPaid = Math.round(Number(monthPaidRow?.paid || 0));
      const monthProfit = monthRevenue - monthCost;
      const monthMargin = monthRevenue > 0 ? Math.round((monthProfit / monthRevenue) * 1000) / 10 : 0;
      const monthCollectionRate = monthRevenue > 0 ? Math.round((monthPaid / monthRevenue) * 1000) / 10 : 0;
      
      monthData = {
        period: financeYm,
        revenue: monthRevenue,
        cost: monthCost,
        profit: monthProfit,
        margin: monthMargin,
        ar,
        paid: monthPaid,
        overdue,
        collectionRate: monthCollectionRate
      };
    } else {
      // 年度累计数据（截至今日）
      const ytdPaidRow = await env.DATABASE.prepare(
        `SELECT SUM(total_amount) AS paid FROM Receipts WHERE is_deleted = 0 AND status = 'paid' AND substr(receipt_date,1,4) = ? AND receipt_date <= ?`
      ).bind(currentYear, today).first();
      const ytdRevRow = await env.DATABASE.prepare(
        `SELECT SUM(total_amount) AS revenue FROM Receipts WHERE is_deleted = 0 AND status != 'cancelled' AND substr(receipt_date,1,4) = ? AND receipt_date <= ?`
      ).bind(currentYear, today).first();
      let ytdCost = 0;
      try {
        const pr = await env.DATABASE.prepare(`SELECT SUM(total_cents) AS c FROM MonthlyPayroll mp JOIN PayrollRuns pr ON pr.run_id = mp.run_id WHERE substr(pr.month,1,4) = ?`).bind(currentYear).first();
        ytdCost = Math.round(Number(pr?.c || 0) / 100);
      } catch (_) {}
      
      const ytdRevenue = Math.round(Number(ytdRevRow?.revenue || 0));
      const ytdPaid = Math.round(Number(ytdPaidRow?.paid || 0));
      const ytdProfit = ytdRevenue - ytdCost;
      const ytdMargin = ytdRevenue > 0 ? Math.round((ytdProfit / ytdRevenue) * 1000) / 10 : 0;
      const ytdCollectionRate = ytdRevenue > 0 ? Math.round((ytdPaid / ytdRevenue) * 1000) / 10 : 0;
      
      ytdData = {
        period: `${currentYear}年累計`,
        revenue: ytdRevenue,
        cost: ytdCost,
        profit: ytdProfit,
        margin: ytdMargin,
        ar,
        paid: ytdPaid,
        overdue,
        collectionRate: ytdCollectionRate
      };
    }
    
    res.financialStatus = { 
      month: monthData,
      ytd: ytdData
    };
  } catch (err) {
    console.error('[Dashboard] Financial status query error:', err);
  }
  
  // Revenue trend (last 6 months)
  try {
    const rows = await env.DATABASE.prepare(
      `SELECT strftime('%Y-%m', receipt_date) AS ym, SUM(total_amount) AS revenue,
              SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END) AS paid
       FROM Receipts WHERE is_deleted = 0 AND status != 'cancelled'
       GROUP BY ym ORDER BY ym DESC LIMIT 6`
    ).all();
    const list = (rows?.results || []).map(r => ({ month: r.ym, revenue: Number(r.revenue || 0), paid: Number(r.paid || 0) }));
    res.revenueTrend = list.sort((a,b)=> a.month.localeCompare(b.month));
  } catch (_) {}
  
  // Recent Activities (任务调整、状态更新、假期申请、工时提醒)
  try {
    const days = parseInt(params.get?.('activity_days') || '3', 10);
    const filterUserId = params.get?.('activity_user_id');
    const filterType = params.get?.('activity_type');
    
    // 构建用户筛选条件
    const userFilter = filterUserId ? `AND adj.requested_by = ${filterUserId}` : '';
    const userFilter2 = filterUserId ? `AND su.updated_by = ${filterUserId}` : '';
    const userFilter3 = filterUserId ? `AND l.user_id = ${filterUserId}` : '';
    
    // 查询任务期限调整
    const adjustments = await env.DATABASE.prepare(`
      SELECT 
        adj.adjustment_id,
        adj.requested_at as activity_time,
        adj.old_due_date,
        adj.new_due_date,
        adj.adjustment_reason as reason,
        adj.requested_by,
        u.name as user_name,
        COALESCE(t.task_description, t.task_type) as task_name,
        t.task_id,
        t.status as current_status,
        t.due_date as current_due_date,
        t.assignee_user_id,
        assignee.name as assignee_name,
        c.company_name as client_name,
        s.service_name
      FROM TaskDueDateAdjustments adj
      JOIN Users u ON u.user_id = adj.requested_by
      JOIN ActiveTasks t ON t.task_id = adj.task_id
      LEFT JOIN Users assignee ON assignee.user_id = t.assignee_user_id
      LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
      LEFT JOIN Clients c ON c.client_id = c.client_id
      LEFT JOIN Services s ON s.service_id = cs.service_id
      WHERE adj.requested_at >= datetime('now', '-${days} days')
        AND adj.old_due_date IS NOT NULL 
        AND adj.new_due_date IS NOT NULL
        AND adj.adjustment_type IS NOT NULL
        ${userFilter}
      ORDER BY adj.requested_at DESC
      LIMIT 30
    `).all();
    
    // 查询任务状态更新
    const statusUpdates = await env.DATABASE.prepare(`
      SELECT 
        su.update_id,
        su.updated_at as activity_time,
        su.old_status,
        su.new_status,
        su.progress_note,
        su.blocker_reason,
        su.overdue_reason,
        su.updated_by,
        u.name as user_name,
        COALESCE(t.task_description, t.task_type) as task_name,
        t.task_id,
        t.status as current_status,
        t.due_date as current_due_date,
        t.assignee_user_id,
        assignee.name as assignee_name,
        c.company_name as client_name,
        s.service_name
      FROM TaskStatusUpdates su
      LEFT JOIN Users u ON u.user_id = su.updated_by
      LEFT JOIN ActiveTasks t ON t.task_id = su.task_id
      LEFT JOIN Users assignee ON assignee.user_id = t.assignee_user_id
      LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
      LEFT JOIN Clients c ON c.client_id = c.client_id
      LEFT JOIN Services s ON s.service_id = cs.service_id
      WHERE su.updated_at >= datetime('now', '-${days} days')
        AND su.old_status IS NOT NULL
        AND su.new_status IS NOT NULL
        ${userFilter2}
      ORDER BY su.updated_at DESC
      LIMIT 30
    `).all();
    
    // 查询假期申请
    const leaveApplications = await env.DATABASE.prepare(`
      SELECT 
        l.leave_id,
        l.submitted_at as activity_time,
        l.leave_type,
        l.start_date,
        l.end_date,
        l.unit as leave_unit,
        l.amount as leave_days,
        l.status as leave_status,
        l.reason,
        l.user_id,
        u.name as user_name
      FROM LeaveRequests l
      LEFT JOIN Users u ON u.user_id = l.user_id
      WHERE l.is_deleted = 0 AND l.submitted_at >= datetime('now', '-${days} days')
        ${userFilter3}
      ORDER BY l.submitted_at DESC
      LIMIT 30
    `).all();
    
    // 查询工时缺失提醒
    let timesheetReminders = [];
    try {
      const checkDays = days; // 移除 Math.min 限制，允許檢查完整天數
      const todayDate = new Date();
      const dates = [];
      
      console.log(`[Dashboard] 檢查工時缺失，天數: ${checkDays}, 今日: ${todayDate.toISOString()}`);
      
      // 获取国定假日列表
      const holidaysResult = await env.DATABASE.prepare(`
        SELECT holiday_date 
        FROM Holidays 
        WHERE holiday_date >= date('now', '-${checkDays} days') 
          AND holiday_date <= date('now')
      `).all();
      const holidays = new Set((holidaysResult?.results || []).map(h => h.holiday_date));
      console.log(`[Dashboard] 國定假日數量: ${holidays.size}, 假日列表: ${Array.from(holidays).join(', ')}`);
      
      for (let i = 1; i <= checkDays; i++) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().slice(0, 10);
        
        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
          dates.push(dateStr);
        }
      }
      
      console.log(`[Dashboard] 生成的工作日日期列表 (${dates.length}天): ${dates.join(', ')}`);
      
      if (dates.length > 0) {
        const userFilterForTimesheet = filterUserId ? `AND u.user_id = ${filterUserId}` : '';
        
        const missingTimesheets = await env.DATABASE.prepare(`
          SELECT 
            u.user_id,
            u.name as user_name,
            d.work_date
          FROM Users u
          JOIN (${dates.map(d => `SELECT '${d}' as work_date`).join(' UNION ALL ')}) d
          LEFT JOIN Timesheets t ON t.user_id = u.user_id AND t.work_date = d.work_date AND t.is_deleted = 0
          WHERE u.is_deleted = 0 
            AND d.work_date >= u.start_date
            AND t.timesheet_id IS NULL
            ${userFilterForTimesheet}
          ORDER BY d.work_date DESC, u.name ASC
          LIMIT 30
        `).all();
        
        console.log(`[Dashboard] 工時缺失查詢結果: ${missingTimesheets?.results?.length || 0} 筆記錄`);
        
        const groupedByUser = {};
        (missingTimesheets?.results || []).forEach(r => {
          if (!groupedByUser[r.user_id]) {
            groupedByUser[r.user_id] = {
              user_id: r.user_id,
              user_name: r.user_name,
              missing_dates: []
            };
          }
          groupedByUser[r.user_id].missing_dates.push(r.work_date);
        });
        
        timesheetReminders = Object.values(groupedByUser).map(item => ({
          activity_type: 'timesheet_reminder',
          user_id: item.user_id,
          user_name: item.user_name,
          missing_dates: item.missing_dates,
          missing_count: item.missing_dates.length,
          activity_time: todayDate.toISOString()
        }));
        
        console.log(`[Dashboard] 工時提醒數量: ${timesheetReminders.length}`);
        if (timesheetReminders.length > 0) {
          console.log(`[Dashboard] 第一筆工時提醒:`, JSON.stringify(timesheetReminders[0], null, 2));
        }
      }
    } catch (err) {
      console.error('[Dashboard] Timesheet reminders error:', err);
      console.error('[Dashboard] Error stack:', err.stack);
    }
    
    // 合并并排序
    const allActivities = [
      ...(adjustments?.results || []).map(a => ({...a, activity_type: 'due_date_adjustment'})),
      ...(statusUpdates?.results || []).map(s => ({...s, activity_type: 'status_update'})),
      ...(leaveApplications?.results || []).map(l => ({...l, activity_type: 'leave_application'})),
      ...timesheetReminders
    ].sort((a, b) => (b.activity_time || '').localeCompare(a.activity_time || ''));
    
    console.log(`[Dashboard] 合併後活動總數: ${allActivities.length}`);
    console.log(`[Dashboard] 各類型數量 - 任務調整: ${adjustments?.results?.length || 0}, 狀態更新: ${statusUpdates?.results?.length || 0}, 假期申請: ${leaveApplications?.results?.length || 0}, 工時提醒: ${timesheetReminders.length}`);
    
    // 根据类型筛选
    let filteredActivities = allActivities;
    if (filterType) {
      filteredActivities = allActivities.filter(act => act.activity_type === filterType);
      console.log(`[Dashboard] 類型篩選 '${filterType}' 後數量: ${filteredActivities.length}`);
    }
    
    // 格式化活动记录
    res.recentActivities = filteredActivities.slice(0, 15).map(act => {
      let time = '';
      if (act.activity_time) {
        let dateStr = act.activity_time;
        if (dateStr.includes(' ') && !dateStr.includes('T')) {
          dateStr = dateStr.replace(' ', 'T') + 'Z';
        }
        time = new Date(dateStr).toLocaleString('zh-TW', { 
          timeZone: 'Asia/Taipei',
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      const statusMap = {
        'pending': '待開始',
        'in_progress': '進行中',
        'completed': '已完成',
        'cancelled': '已取消'
      };
      
      const currentStatus = statusMap[act.current_status] || act.current_status || '—';
      const currentDueDate = act.current_due_date ? act.current_due_date.slice(5) : '—';
      const assigneeName = act.assignee_name || '未分配';
      const serviceName = act.service_name || '—';
      
      if (act.activity_type === 'due_date_adjustment') {
        const oldDate = act.old_due_date ? act.old_due_date.slice(5) : '';
        const newDate = act.new_due_date ? act.new_due_date.slice(5) : '';
        return {
          activity_type: 'due_date_adjustment',
          text: `${act.user_name} 調整了任務期限`,
          taskName: act.task_name,
          clientName: act.client_name || '—',
          serviceName: serviceName,
          change: `${oldDate} → ${newDate}`,
          reason: act.reason || '',
          currentStatus: currentStatus,
          currentDueDate: currentDueDate,
          assigneeName: assigneeName,
          time: time,
          link: `/tasks/${act.task_id}`
        };
      } else if (act.activity_type === 'status_update') {
        const oldStatus = statusMap[act.old_status] || act.old_status;
        const newStatus = statusMap[act.new_status] || act.new_status;
        
        let note = '';
        if (act.blocker_reason) note = `🚫 ${act.blocker_reason}`;
        else if (act.overdue_reason) note = `⏰ ${act.overdue_reason}`;
        else if (act.progress_note) note = `💬 ${act.progress_note}`;
        
        return {
          activity_type: 'status_update',
          text: `${act.user_name} 更新了任務狀態`,
          taskName: act.task_name,
          clientName: act.client_name || '—',
          serviceName: serviceName,
          change: `${oldStatus} → ${newStatus}`,
          note: note,
          currentStatus: currentStatus,
          currentDueDate: currentDueDate,
          assigneeName: assigneeName,
          time: time,
          link: `/tasks/${act.task_id}`
        };
      } else if (act.activity_type === 'leave_application') {
        const leaveTypeMap = {
          'annual': '特休',
          'sick': '病假',
          'personal': '事假',
          'comp': '補休',
          'maternity': '產假',
          'paternity': '陪產假',
          'marriage': '婚假',
          'bereavement': '喪假',
          'unpaid': '無薪假'
        };
        const leaveType = leaveTypeMap[act.leave_type] || act.leave_type;
        
        const startDate = act.start_date ? act.start_date.slice(5) : '';
        const endDate = act.end_date ? act.end_date.slice(5) : '';
        const leaveDays = act.leave_days || 0;
        const leaveUnit = act.leave_unit || 'day';
        
        return {
          activity_type: 'leave_application',
          text: `${act.user_name} 申請${leaveType}`,
          leaveType: leaveType,
          leaveDays: leaveDays,
          leaveUnit: leaveUnit,
          period: `${startDate} ~ ${endDate}`,
          reason: act.reason || '',
          userName: act.user_name,
          time: time,
          link: `/leaves`
        };
      } else if (act.activity_type === 'timesheet_reminder') {
        const missingDates = (act.missing_dates || []).map(d => d.slice(5)).join(', ');
        return {
          activity_type: 'timesheet_reminder',
          text: `${act.user_name} 尚未填寫工時`,
          userName: act.user_name,
          missingCount: act.missing_count || 0,
          missingDates: missingDates,
          time: time,
          link: `/timesheets`
        };
      }
      return null;
    }).filter(Boolean);
    
  } catch (err) {
    console.error('[Dashboard] Recent activities error:', err);
    res.recentActivities = [];
  }
  
  // Team Members (所有用户列表，用于筛选)
  try {
    const usersResult = await env.DATABASE.prepare(`
      SELECT user_id, name, email
      FROM Users
      WHERE is_deleted = 0
      ORDER BY name ASC
    `).all();
    res.teamMembers = (usersResult?.results || []).map(u => ({
      userId: u.user_id,
      name: u.name,
      email: u.email
    }));
  } catch (err) {
    console.error('[Dashboard] Team members error:', err);
    res.teamMembers = [];
  }
  
  // Receipts pending tasks (收据已开但任务未完成的提醒)
  try {
    const receipts = await env.DATABASE.prepare(`
      SELECT 
        r.receipt_id,
        r.receipt_id as receipt_number,
        r.due_date as receipt_due_date,
        r.status as receipt_status,
        c.client_id,
        c.company_name,
        cs.client_service_id,
        s.service_name,
        COUNT(DISTINCT t.task_id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.task_id END) as completed_tasks
      FROM Receipts r
      JOIN ClientServices cs ON cs.client_service_id = r.client_service_id
      JOIN Clients c ON c.client_id = cs.client_id
      LEFT JOIN Services s ON s.service_id = cs.service_id
      LEFT JOIN ActiveTasks t ON t.client_service_id = cs.client_service_id 
        AND (t.service_month = r.service_start_month OR t.service_month = substr(r.receipt_date, 1, 7))
        AND t.is_deleted = 0
      WHERE r.is_deleted = 0
        AND r.status IN ('pending', 'partial')
      GROUP BY r.receipt_id
      HAVING completed_tasks < total_tasks AND total_tasks > 0
      ORDER BY r.due_date ASC
      LIMIT 10
    `).all();
    
    res.receiptsPendingTasks = (receipts.results || []).map(r => ({
      receipt_id: r.receipt_id,
      receipt_number: r.receipt_number,
      receipt_due_date: r.receipt_due_date,
      receipt_status: r.receipt_status,
      client_id: r.client_id,
      client_name: r.company_name,
      service_name: r.service_name || '',
      total_tasks: Number(r.total_tasks || 0),
      completed_tasks: Number(r.completed_tasks || 0),
      pending_tasks: Number(r.total_tasks || 0) - Number(r.completed_tasks || 0)
    }));
  } catch (err) {
    console.error('[Dashboard] Receipts pending tasks error:', err);
    res.receiptsPendingTasks = [];
  }
  
  return res;
}
