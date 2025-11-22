/**
 * 工时记录CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { WORK_TYPES, calculateWeightedHours, getDateType, validateWorkTypeForDateType } from "./utils.js";
import { invalidateCacheByDataType, extractYearFromDate } from "../../utils/cache-invalidation.js";

/**
 * 获取工时记录列表
 */
export async function handleGetTimesheets(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const params = url.searchParams;
  const startDate = (params.get("start_date") || "").trim();
  const endDate = (params.get("end_date") || "").trim();
  const filterUserId = (params.get("user_id") || "").trim();
  
  const where = ["t.is_deleted = 0"];
  const binds = [];
  
  // 权限控制：员工只能看自己的
  if (!user.is_admin) {
    where.push("t.user_id = ?");
    binds.push(String(user.user_id));
  } else if (filterUserId) {
    // 管理員可以通過 user_id 參數篩選特定員工
    where.push("t.user_id = ?");
    binds.push(String(filterUserId));
  }
  
  // 日期范围筛选
  if (startDate) {
    where.push("t.work_date >= ?");
    binds.push(startDate);
  }
  if (endDate) {
    where.push("t.work_date <= ?");
    binds.push(endDate);
  }
  
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  
  const rows = await env.DATABASE.prepare(
    `SELECT t.timesheet_id, t.user_id, t.work_date, t.client_id, t.service_id, t.task_type, t.work_type, t.hours, t.note,
            u.name as user_name, u.username,
            c.company_name as client_name
     FROM Timesheets t
     LEFT JOIN Users u ON t.user_id = u.user_id
     LEFT JOIN Clients c ON t.client_id = c.client_id AND c.is_deleted = 0
     ${whereSql}
     ORDER BY t.work_date ASC, t.timesheet_id ASC`
  ).bind(...binds).all();
  
  const data = (rows?.results || []).map(r => {
    const workTypeId = parseInt(r.work_type) || 1;
    const workType = WORK_TYPES[workTypeId];
    return {
      log_id: r.timesheet_id,
      timesheet_id: r.timesheet_id,
      user_id: r.user_id,
      user_name: r.user_name || r.username || '未知',
      work_date: r.work_date,
      client_id: r.client_id || "",
      client_name: r.client_name || "",
      service_id: parseInt(r.service_id) || 1,
      task_type: r.task_type || "",
      service_item_id: 1, // 向後兼容（前端可能仍需要）
      work_type: String(workTypeId), // 保留原始字符串格式
      work_type_id: workTypeId,
      work_type_name: workType ? workType.name : '未知',
      hours: Number(r.hours || 0),
      notes: r.note || "",
    };
  });
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 获取单条工时记录
 */
export async function handleGetTimesheetDetail(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const timesheetId = match[1];
  
  const row = await env.DATABASE.prepare(
    `SELECT t.timesheet_id, t.user_id, t.work_date, t.client_id, t.service_id, t.task_type, t.work_type, t.hours, t.note,
            u.name as user_name
     FROM Timesheets t
     LEFT JOIN Users u ON t.user_id = u.user_id
     WHERE t.timesheet_id = ? AND t.is_deleted = 0`
  ).bind(timesheetId).first();
  
  if (!row) {
    return errorResponse(404, "NOT_FOUND", "工時記錄不存在", null, requestId);
  }
  
  // 权限检查
  if (!user.is_admin && String(row.user_id) !== String(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限查看此記錄", null, requestId);
  }
  
  const data = {
    log_id: row.timesheet_id,
    timesheet_id: row.timesheet_id,
    user_id: row.user_id,
    user_name: row.user_name || '未知',
    work_date: row.work_date,
    client_id: row.client_id || "",
    service_id: parseInt(row.service_id) || 1,
    task_type: row.task_type || "",
    service_item_id: 1, // 向後兼容
    work_type_id: parseInt(row.work_type) || 1,
    hours: Number(row.hours || 0),
    notes: row.note || "",
  };
  
  return successResponse(data, "查詢成功", requestId);
}

/**
 * 创建或更新工时记录
 */
export async function handleCreateOrUpdateTimesheet(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const body = await request.json();
  
  const work_date = String(body?.work_date || "").trim();
  const client_id = String(body?.client_id || "").trim();
  const service_id = parseInt(body?.service_id) || 0;
  const task_type = String(body?.task_type || body?.service_item_name || "").trim();
  const work_type_id = parseInt(body?.work_type_id) || 0;
  const hours = Number(body?.hours);
  const notes = String(body?.notes || "").trim();
  const timesheet_id = body?.timesheet_id ? parseInt(body.timesheet_id) : null;
  
  // 验证
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date)) {
    errors.push({ field: "work_date", message: "日期格式必須為 YYYY-MM-DD" });
  }
  if (!client_id) errors.push({ field: "client_id", message: "請選擇客戶" });
  if (!service_id) errors.push({ field: "service_id", message: "請選擇服務項目" });
  // task_type 為可選，如果沒提供則使用空字串
  if (!work_type_id || !WORK_TYPES[work_type_id]) {
    errors.push({ field: "work_type_id", message: "請選擇有效的工時類型" });
  }
  if (!Number.isFinite(hours) || hours <= 0) {
    errors.push({ field: "hours", message: "工時必須大於 0" });
  }
  if (Math.abs(hours * 2 - Math.round(hours * 2)) > 1e-9) {
    errors.push({ field: "hours", message: "工時必須是 0.5 的倍數" });
  }
  if (hours > 12) {
    errors.push({ field: "hours", message: "工時不可超過 12 小時" });
  }
  
  const workType = WORK_TYPES[work_type_id];
  if (workType && workType.maxHours && hours > workType.maxHours) {
    errors.push({ field: "hours", message: `${workType.name}最多只能填 ${workType.maxHours} 小時` });
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  // 判断日期类型并验证
  const dateType = await getDateType(env, work_date);
  const dateTypeNames = {
    'workday': '工作日',
    'restday': '休息日',
    'weekly_restday': '例假日',
    'national_holiday': '國定假日'
  };
  
  if (!validateWorkTypeForDateType(work_type_id, dateType)) {
    const dateTypeName = dateTypeNames[dateType] || dateType;
    return errorResponse(422, "VALIDATION_ERROR", 
      `${work_date}（${dateTypeName}）不可使用「${workType.name}」`,
      [{ field: "work_type_id", message: `該日期類型為${dateTypeName}，請選擇適合的工時類型` }],
      requestId
    );
  }
  
  // 驗證加班前置條件：只有工作日的加班需要先填滿正常工時（正常工時 + 請假 >= 8 小時）
  if (workType.isOvertime && dateType === 'workday') {
    // 查詢當天的請假時數（簡化查詢，因為同一天只會有一筆請假記錄）
    const leaveRows = await env.DATABASE.prepare(
      `SELECT unit, amount, start_date, end_date
       FROM LeaveRequests
       WHERE user_id = ? 
         AND start_date <= ? 
         AND end_date >= ? 
         AND status IN ('approved', 'pending') 
         AND is_deleted = 0`
    ).bind(String(user.user_id), work_date, work_date).all();
    
    let leaveHours = 0;
    (leaveRows?.results || []).forEach(r => {
      if (r.unit === 'day') {
        // 按天請假，檢查該日期是否在請假範圍內
        if (r.start_date <= work_date && r.end_date >= work_date) {
          leaveHours += 8; // 一天按 8 小時計算
        }
      } else {
        // 按小時請假，檢查是否為同一天
        if (r.start_date === work_date) {
          leaveHours += Number(r.amount || 0);
        }
      }
    });
    
    // 查詢當天已填的正常工時（排除當前的 timesheet_id，如果是在更新）
    const normalHoursRow = await env.DATABASE.prepare(
      `SELECT COALESCE(SUM(hours), 0) AS s 
       FROM Timesheets 
       WHERE user_id = ? AND work_date = ? AND CAST(work_type AS INTEGER) = 1 AND is_deleted = 0 
         ${timesheet_id ? 'AND timesheet_id != ?' : ''}`
    ).bind(String(user.user_id), work_date, ...(timesheet_id ? [timesheet_id] : [])).first();
    
    const existingNormalHours = Number(normalHoursRow?.s || 0);
    const totalNormalWork = leaveHours + existingNormalHours;
    const STANDARD_NORMAL_HOURS = 8;
    
    if (totalNormalWork < STANDARD_NORMAL_HOURS - 1e-9) {
      const shortage = STANDARD_NORMAL_HOURS - totalNormalWork;
      return errorResponse(422, "VALIDATION_ERROR",
        `${work_date}（工作日）：尚未填滿正常工時，不可填寫加班類型。請先填滿 ${shortage.toFixed(1)} 小時的正常工時（使用「一般」工時類型）`,
        [{ field: "work_type_id", message: `正常工時 + 請假 = ${totalNormalWork.toFixed(1)} 小時，尚缺 ${shortage.toFixed(1)} 小時` }],
        requestId
      );
    }
  }
  
  // 驗證加班類型的前置條件（如「平日OT後2h」需要先有「平日OT前2h」）
  if (workType.requiresTypes && Array.isArray(workType.requiresTypes)) {
    const requiredTypeChecks = await Promise.all(
      workType.requiresTypes.map(async (reqTypeId) => {
        const reqCheck = await env.DATABASE.prepare(
          `SELECT COALESCE(SUM(hours), 0) AS s 
           FROM Timesheets 
           WHERE user_id = ? AND work_date = ? AND work_type = ? AND is_deleted = 0 
             ${timesheet_id ? 'AND timesheet_id != ?' : ''}`
        ).bind(String(user.user_id), work_date, String(reqTypeId), ...(timesheet_id ? [timesheet_id] : [])).first();
        
        return {
          typeId: reqTypeId,
          hasRequired: Number(reqCheck?.s || 0) > 0,
          totalHours: Number(reqCheck?.s || 0)
        };
      })
    );
    
    const missingRequirements = requiredTypeChecks.filter(check => !check.hasRequired);
    
    if (missingRequirements.length > 0) {
      const requiredTypeNames = missingRequirements.map(req => {
        const reqType = WORK_TYPES[req.typeId];
        return reqType ? reqType.name : `類型${req.typeId}`;
      }).join('、');
      
      return errorResponse(422, "VALIDATION_ERROR",
        `使用「${workType.name}」前，請先填寫：${requiredTypeNames}`,
        [{ field: "work_type_id", message: `「${workType.name}」需要先填寫 ${requiredTypeNames}` }],
        requestId
      );
    }
  }
  
  // 计算加权工时
  const weighted_hours = calculateWeightedHours(work_type_id, hours);
  
  let log_id;
  let isUpdate = false;
  
  // 如果提供了 timesheet_id，直接更新
  if (timesheet_id) {
    const existingRow = await env.DATABASE.prepare(
      `SELECT timesheet_id FROM Timesheets 
       WHERE timesheet_id = ? AND user_id = ? AND is_deleted = 0`
    ).bind(timesheet_id, String(user.user_id)).first();
    
    if (existingRow) {
      log_id = timesheet_id;
      isUpdate = true;
      
      // 验证修改后当日总工时
      const oldData = await env.DATABASE.prepare(
        `SELECT hours, work_type FROM Timesheets WHERE timesheet_id = ?`
      ).bind(log_id).first();
      
      const oldHours = Number(oldData?.hours || 0);
      const oldWorkType = oldData?.work_type;
      const oldWorkTypeObj = WORK_TYPES[parseInt(oldWorkType) || 1];
      const hoursDiff = hours - oldHours;
      
      // 檢查正常工時是否超過 8 小時限制（同一員工同一天所有正常工時總和）
      if (!workType.isOvertime) {
        // 查詢當天的請假時數（工作日驗證：正常工時 + 請假不應超過 8 小時）
        const leaveRows = await env.DATABASE.prepare(
          `SELECT unit, amount, start_date, end_date
           FROM LeaveRequests
           WHERE user_id = ? 
             AND start_date <= ? 
             AND end_date >= ? 
             AND status IN ('approved', 'pending') 
             AND is_deleted = 0`
        ).bind(String(user.user_id), work_date, work_date).all();
        
        let leaveHoursForDay = 0;
        (leaveRows?.results || []).forEach(r => {
          if (r.unit === 'day') {
            // 按天請假，檢查該日期是否在請假範圍內
            if (r.start_date <= work_date && r.end_date >= work_date) {
              leaveHoursForDay += 8; // 一天按 8 小時計算
            }
          } else {
            // 按小時請假，檢查是否為同一天
            if (r.start_date === work_date) {
              leaveHoursForDay += Number(r.amount || 0);
            }
          }
        });
        
        const normalHoursSumRow = await env.DATABASE.prepare(
          `SELECT COALESCE(SUM(hours), 0) AS s 
           FROM Timesheets 
           WHERE user_id = ? AND work_date = ? AND CAST(work_type AS INTEGER) = 1 AND is_deleted = 0 AND timesheet_id != ?`
        ).bind(String(user.user_id), work_date, log_id).first();
        
        const otherNormalHours = Number(normalHoursSumRow?.s || 0);
        const totalNormalHours = otherNormalHours + hours;
        const STANDARD_NORMAL_HOURS = 8;
        
        // 驗證：工作日「正常工時 + 請假」不應超過 8 小時
        const dateType = await getDateType(env, work_date);
        if (dateType === 'workday') {
          const totalNormalAndLeave = totalNormalHours + leaveHoursForDay;
          if (totalNormalAndLeave > STANDARD_NORMAL_HOURS + 1e-9) {
            const remaining = Math.max(0, STANDARD_NORMAL_HOURS - leaveHoursForDay - otherNormalHours);
            return errorResponse(422, "VALIDATION_ERROR",
              `${work_date}（工作日）：正常工時 + 請假時數不可超過 8 小時。目前：正常工時 ${otherNormalHours} 小時，請假 ${leaveHoursForDay} 小時，嘗試新增 ${hours} 小時，總計 ${totalNormalAndLeave} 小時。您最多還可以填 ${remaining.toFixed(1)} 小時正常工時`,
              [{ field: "hours", message: `正常工時 + 請假 = ${totalNormalAndLeave} 小時，超過 8 小時限制` }],
              requestId
            );
          }
        }
        
        if (totalNormalHours > STANDARD_NORMAL_HOURS + 1e-9) {
          return errorResponse(422, "VALIDATION_ERROR",
            `正常工時已滿（上限 ${STANDARD_NORMAL_HOURS} 小時）。該日已有 ${otherNormalHours} 小時正常工時，最多還可填 ${Math.max(0, STANDARD_NORMAL_HOURS - otherNormalHours).toFixed(1)} 小時正常工時，或使用加班類型記錄額外工時`,
            [{ field: "hours", message: `正常工時上限 ${STANDARD_NORMAL_HOURS} 小時，當前累加後為 ${totalNormalHours.toFixed(1)} 小時` }],
            requestId
          );
        }
      }
      
      if (hoursDiff > 0) {
        const sumRow = await env.DATABASE.prepare(
          `SELECT COALESCE(SUM(hours), 0) AS s 
           FROM Timesheets 
           WHERE user_id = ? AND work_date = ? AND is_deleted = 0`
        ).bind(String(user.user_id), work_date).first();
        
        const currentTotal = Number(sumRow?.s || 0);
        if (currentTotal + hoursDiff > 12 + 1e-9) {
          return errorResponse(422, "VALIDATION_ERROR", "修改後每日工時合計不可超過 12 小時",
            [{ field: "hours", message: "超過每日上限" }], requestId);
        }
      }
      
      await env.DATABASE.prepare(
        `UPDATE Timesheets 
         SET client_id = ?, service_id = ?, task_type = ?, 
             work_type = ?, hours = ?, note = ?, updated_at = ?
         WHERE timesheet_id = ?`
      ).bind(client_id, service_id, task_type, String(work_type_id), hours, notes, new Date().toISOString(), log_id).run();
    }
  }
  
  // 如果没有提供 timesheet_id 或无效，检查是否已存在相同组合
  if (!log_id) {
    const duplicateRow = await env.DATABASE.prepare(
      `SELECT timesheet_id 
       FROM Timesheets 
       WHERE user_id = ? AND work_date = ? AND client_id = ? 
         AND service_id = ? AND COALESCE(task_type, '') = ? AND work_type = ? AND is_deleted = 0`
    ).bind(String(user.user_id), work_date, client_id, service_id, task_type, String(work_type_id)).first();
    
    if (duplicateRow) {
      // 如果已存在相同组合，累加工时
      log_id = duplicateRow.timesheet_id;
      isUpdate = true;
      
      const existingRow = await env.DATABASE.prepare(
        `SELECT hours FROM Timesheets WHERE timesheet_id = ?`
      ).bind(log_id).first();
      
      const existingHours = Number(existingRow?.hours || 0);
      const newTotalHours = existingHours + hours;
      
      if (workType.maxHours && newTotalHours > workType.maxHours) {
        return errorResponse(422, "VALIDATION_ERROR",
          `累加後「${workType.name}」工時為 ${newTotalHours} 小時，超過上限 ${workType.maxHours} 小時`,
          [{ field: "hours", message: `該日已有 ${existingHours} 小時，最多還可填 ${workType.maxHours - existingHours} 小時` }],
          requestId
        );
      }
      
      // 檢查正常工時是否超過 8 小時限制（同一員工同一天所有正常工時總和）
      if (!workType.isOvertime) {
        // 查詢當天的請假時數（工作日驗證：正常工時 + 請假不應超過 8 小時）
        const leaveRows = await env.DATABASE.prepare(
          `SELECT unit, amount, start_date, end_date
           FROM LeaveRequests
           WHERE user_id = ? 
             AND start_date <= ? 
             AND end_date >= ? 
             AND status IN ('approved', 'pending') 
             AND is_deleted = 0`
        ).bind(String(user.user_id), work_date, work_date).all();
        
        let leaveHoursForDay = 0;
        (leaveRows?.results || []).forEach(r => {
          if (r.unit === 'day') {
            if (r.start_date <= work_date && r.end_date >= work_date) {
              leaveHoursForDay += 8;
            }
          } else {
            if (r.start_date === work_date) {
              leaveHoursForDay += Number(r.amount || 0);
            }
          }
        });
        
        const normalHoursSumRow = await env.DATABASE.prepare(
          `SELECT COALESCE(SUM(hours), 0) AS s 
           FROM Timesheets 
           WHERE user_id = ? AND work_date = ? AND CAST(work_type AS INTEGER) = 1 AND is_deleted = 0 AND timesheet_id != ?`
        ).bind(String(user.user_id), work_date, log_id).first();
        
        const otherNormalHours = Number(normalHoursSumRow?.s || 0);
        const totalNormalHours = otherNormalHours + newTotalHours;
        
        // 驗證：工作日「正常工時 + 請假」不應超過 8 小時
        const dateType = await getDateType(env, work_date);
        if (dateType === 'workday') {
          const totalNormalAndLeave = totalNormalHours + leaveHoursForDay;
          const STANDARD_NORMAL_HOURS = 8;
          if (totalNormalAndLeave > STANDARD_NORMAL_HOURS + 1e-9) {
            const remaining = Math.max(0, STANDARD_NORMAL_HOURS - leaveHoursForDay - otherNormalHours);
            return errorResponse(422, "VALIDATION_ERROR",
              `${work_date}（工作日）：正常工時 + 請假時數不可超過 8 小時。目前：正常工時 ${otherNormalHours} 小時，請假 ${leaveHoursForDay} 小時，累加後正常工時 ${totalNormalHours} 小時，總計 ${totalNormalAndLeave} 小時。您最多還可以填 ${remaining.toFixed(1)} 小時正常工時`,
              [{ field: "hours", message: `正常工時 + 請假 = ${totalNormalAndLeave} 小時，超過 8 小時限制` }],
              requestId
            );
          }
        }
        
        const STANDARD_NORMAL_HOURS = 8;
        if (totalNormalHours > STANDARD_NORMAL_HOURS + 1e-9) {
          return errorResponse(422, "VALIDATION_ERROR",
            `正常工時已滿（上限 ${STANDARD_NORMAL_HOURS} 小時）。該日已有 ${otherNormalHours} 小時正常工時，最多還可填 ${Math.max(0, STANDARD_NORMAL_HOURS - otherNormalHours).toFixed(1)} 小時正常工時，或使用加班類型記錄額外工時`,
            [{ field: "hours", message: `正常工時上限 ${STANDARD_NORMAL_HOURS} 小時，當前累加後為 ${totalNormalHours.toFixed(1)} 小時` }],
            requestId
          );
        }
      }
      
      const sumRow = await env.DATABASE.prepare(
        `SELECT COALESCE(SUM(hours), 0) AS s 
         FROM Timesheets 
         WHERE user_id = ? AND work_date = ? AND is_deleted = 0 AND timesheet_id != ?`
      ).bind(String(user.user_id), work_date, log_id).first();
      
      const otherHoursTotal = Number(sumRow?.s || 0);
      const dailyTotal = otherHoursTotal + newTotalHours;
      
      if (dailyTotal > 12 + 1e-9) {
        return errorResponse(422, "VALIDATION_ERROR",
          `累加後當日總工時為 ${dailyTotal.toFixed(1)} 小時，超過上限 12 小時`,
          [{ field: "hours", message: `當日已有 ${otherHoursTotal.toFixed(1)} 小時，本記錄已有 ${existingHours} 小時` }],
          requestId
        );
      }
      
      await env.DATABASE.prepare(
        `UPDATE Timesheets SET hours = hours + ?, note = ?, updated_at = ? WHERE timesheet_id = ?`
      ).bind(hours, notes, new Date().toISOString(), log_id).run();
    }
  }
  
  // 如果都不存在，创建新记录
  if (!log_id) {
    // 檢查正常工時是否超過 8 小時限制（同一員工同一天所有正常工時總和）
    if (!workType.isOvertime) {
      // 查詢當天的請假時數（工作日驗證：正常工時 + 請假不應超過 8 小時）
      const leaveRows = await env.DATABASE.prepare(
        `SELECT unit, amount, start_date, end_date
         FROM LeaveRequests
         WHERE user_id = ? 
           AND start_date <= ? 
           AND end_date >= ? 
           AND status IN ('approved', 'pending') 
           AND is_deleted = 0`
      ).bind(String(user.user_id), work_date, work_date).all();
      
      let leaveHoursForDay = 0;
      (leaveRows?.results || []).forEach(r => {
        if (r.unit === 'day') {
          if (r.start_date <= work_date && r.end_date >= work_date) {
            leaveHoursForDay += 8;
          }
        } else {
          if (r.start_date === work_date) {
            leaveHoursForDay += Number(r.amount || 0);
          }
        }
      });
      
      const normalHoursSumRow = await env.DATABASE.prepare(
        `SELECT COALESCE(SUM(hours), 0) AS s 
         FROM Timesheets 
         WHERE user_id = ? AND work_date = ? AND CAST(work_type AS INTEGER) = 1 AND is_deleted = 0`
      ).bind(String(user.user_id), work_date).first();
      
      const otherNormalHours = Number(normalHoursSumRow?.s || 0);
      const totalNormalHours = otherNormalHours + hours;
      const STANDARD_NORMAL_HOURS = 8;
      
      // 驗證：工作日「正常工時 + 請假」不應超過 8 小時
      if (dateType === 'workday') {
        const totalNormalAndLeave = totalNormalHours + leaveHoursForDay;
        if (totalNormalAndLeave > STANDARD_NORMAL_HOURS + 1e-9) {
          const remaining = Math.max(0, STANDARD_NORMAL_HOURS - leaveHoursForDay - otherNormalHours);
          return errorResponse(422, "VALIDATION_ERROR",
            `${work_date}（工作日）：正常工時 + 請假時數不可超過 8 小時。目前：正常工時 ${otherNormalHours} 小時，請假 ${leaveHoursForDay} 小時，嘗試新增 ${hours} 小時，總計 ${totalNormalAndLeave} 小時。您最多還可以填 ${remaining.toFixed(1)} 小時正常工時`,
            [{ field: "hours", message: `正常工時 + 請假 = ${totalNormalAndLeave} 小時，超過 8 小時限制` }],
            requestId
          );
        }
      }
      
      if (totalNormalHours > STANDARD_NORMAL_HOURS + 1e-9) {
        return errorResponse(422, "VALIDATION_ERROR",
          `正常工時已滿（上限 ${STANDARD_NORMAL_HOURS} 小時）。該日已有 ${otherNormalHours} 小時正常工時，最多還可填 ${Math.max(0, STANDARD_NORMAL_HOURS - otherNormalHours).toFixed(1)} 小時正常工時，或使用加班類型記錄額外工時`,
          [{ field: "hours", message: `正常工時上限 ${STANDARD_NORMAL_HOURS} 小時，當前累加後為 ${totalNormalHours.toFixed(1)} 小時` }],
          requestId
        );
      }
    }
    
    // 验证当日总工时
    const sumRow = await env.DATABASE.prepare(
      `SELECT COALESCE(SUM(hours), 0) AS s 
       FROM Timesheets 
       WHERE user_id = ? AND work_date = ? AND is_deleted = 0`
    ).bind(String(user.user_id), work_date).first();
    
    const currentTotal = Number(sumRow?.s || 0);
    if (currentTotal + hours > 12 + 1e-9) {
      return errorResponse(422, "VALIDATION_ERROR", "當日總工時不可超過 12 小時",
        [{ field: "hours", message: `當日已有 ${currentTotal.toFixed(1)} 小時，最多還可填 ${Math.max(0, 12 - currentTotal).toFixed(1)} 小時` }],
        requestId
      );
    }
    
    // 验证同一工时类型的累计
    if (workType.maxHours) {
      const workTypeSum = await env.DATABASE.prepare(
        `SELECT COALESCE(SUM(hours), 0) AS s 
         FROM Timesheets 
         WHERE user_id = ? AND work_date = ? AND work_type = ? AND is_deleted = 0`
      ).bind(String(user.user_id), work_date, String(work_type_id)).first();
      
      const currentWorkTypeTotal = Number(workTypeSum?.s || 0);
      if (currentWorkTypeTotal + hours > workType.maxHours + 1e-9) {
        return errorResponse(422, "VALIDATION_ERROR",
          `「${workType.name}」當日累計不可超過 ${workType.maxHours} 小時`,
          [{ field: "hours", message: `當日已有 ${currentWorkTypeTotal} 小時，最多還可填 ${workType.maxHours - currentWorkTypeTotal} 小時` }],
          requestId
        );
      }
    }
    
    const now = new Date().toISOString();
    await env.DATABASE.prepare(
      `INSERT INTO Timesheets (user_id, work_date, client_id, service_id, task_type, work_type, hours, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(String(user.user_id), work_date, client_id, service_id, task_type, String(work_type_id), hours, notes, now, now).run();
    
    const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
    log_id = idRow?.id;
  }
  
  // 清除周缓存（異步執行，不阻塞響應）
  const weekStart = new Date(work_date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().substring(0, 10);
  const clearWeekCachePromise = env.DATABASE.prepare(
    `UPDATE WeeklyTimesheetCache SET invalidated = 1 WHERE user_id = ? AND week_start_date = ?`
  ).bind(String(user.user_id), weekStartStr).run().catch(() => {});
  
  // 清除儀表板緩存（異步執行，不阻塞響應）
  // 緩存鍵格式: dashboard:userId=X&ym=YYYY-MM&...
  const ym = work_date.substring(0, 7);  // 例如: "2025-11"
  const { deleteDashboardCacheByMonth } = await import("../../utils/cache.js");
  const clearDashboardCachePromise = deleteDashboardCacheByMonth(env, ym).catch((err) => {
    console.error(`[Timesheets] 清除儀表板緩存失敗:`, err);
  });
  
  // 觸發重新計算薪資（異步執行）
  const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
  const triggerPayrollPromise = triggerPayrollRecalculation(env, user.user_id, work_date, ctx, 'overtime').catch(() => {});
  
  // 失效相關年度報表快取
  const year = extractYearFromDate(work_date);
  const invalidateReportCachePromise = year
    ? invalidateCacheByDataType(env, "timesheets", year).catch((err) => {
        console.warn("[Timesheets] 失效年度報表快取失敗:", err);
      })
    : Promise.resolve();

  // 使用 waitUntil 確保異步任務完成（但不阻塞響應）
  if (ctx?.waitUntil) {
    ctx.waitUntil(Promise.all([
      clearWeekCachePromise,
      clearDashboardCachePromise,
      triggerPayrollPromise,
      invalidateReportCachePromise
    ]).catch(() => {}));
  } else {
    // 如果沒有 waitUntil（測試環境），等待完成但不阻塞太久
    await Promise.race([
      Promise.all([clearWeekCachePromise, clearDashboardCachePromise, triggerPayrollPromise, invalidateReportCachePromise]),
      new Promise(resolve => setTimeout(resolve, 5000))  // 最多等待 5 秒
    ]).catch(() => {});
  }
  
  return successResponse({
    timesheet_id: log_id,
    is_update: isUpdate,
    work_date,
    hours,
    weighted_hours
  }, isUpdate ? "已更新" : "已建立", requestId);
}

/**
 * 删除工时记录
 */
export async function handleDeleteTimesheet(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const timesheetId = match[1];
  
  // 检查记录是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT timesheet_id, user_id, work_date FROM Timesheets WHERE timesheet_id = ? AND is_deleted = 0`
  ).bind(timesheetId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "工時記錄不存在", null, requestId);
  }
  
  // 权限检查
  if (!user.is_admin && String(existing.user_id) !== String(user.user_id)) {
    return errorResponse(403, "FORBIDDEN", "無權限刪除此記錄", null, requestId);
  }
  
  // 软删除
  await env.DATABASE.prepare(
    `UPDATE Timesheets SET is_deleted = 1, updated_at = ? WHERE timesheet_id = ?`
  ).bind(new Date().toISOString(), timesheetId).run();
  
  // 清除周缓存（異步執行，不阻塞響應）
  const weekStart = new Date(existing.work_date);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStartStr = weekStart.toISOString().substring(0, 10);
  const clearWeekCachePromise = env.DATABASE.prepare(
    `UPDATE WeeklyTimesheetCache SET invalidated = 1 WHERE user_id = ? AND week_start_date = ?`
  ).bind(String(existing.user_id), weekStartStr).run().catch(() => {});
  
  // 清除儀表板緩存（異步執行，不阻塞響應）
  // 緩存鍵格式: dashboard:userId=X&ym=YYYY-MM&...
  const ym = existing.work_date.substring(0, 7);  // 例如: "2025-11"
  const { deleteDashboardCacheByMonth } = await import("../../utils/cache.js");
  const clearDashboardCachePromise = deleteDashboardCacheByMonth(env, ym).catch((err) => {
    console.error(`[Timesheets] 清除儀表板緩存失敗:`, err);
  });
  
  // 觸發重新計算薪資（異步執行）
  const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
  const triggerPayrollPromise = triggerPayrollRecalculation(env, existing.user_id, existing.work_date, ctx, 'overtime').catch(() => {});
  
  // 失效相關年度報表快取
  const year = extractYearFromDate(existing.work_date);
  const invalidateReportCachePromise = year
    ? invalidateCacheByDataType(env, "timesheets", year).catch((err) => {
        console.warn("[Timesheets] 失效年度報表快取失敗:", err);
      })
    : Promise.resolve();

  // 使用 waitUntil 確保異步任務完成（但不阻塞響應）
  if (ctx?.waitUntil) {
    ctx.waitUntil(Promise.all([
      clearWeekCachePromise,
      clearDashboardCachePromise,
      triggerPayrollPromise,
      invalidateReportCachePromise
    ]).catch(() => {}));
  } else {
    // 如果沒有 waitUntil（測試環境），等待完成但不阻塞太久
    await Promise.race([
      Promise.all([clearWeekCachePromise, clearDashboardCachePromise, triggerPayrollPromise, invalidateReportCachePromise]),
      new Promise(resolve => setTimeout(resolve, 5000))  // 最多等待 5 秒
    ]).catch(() => {});
  }
  
  return successResponse({ timesheet_id: timesheetId }, "已刪除", requestId);
}

