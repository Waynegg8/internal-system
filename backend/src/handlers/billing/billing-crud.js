/**
 * 账单管理基本CRUD操作
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 获取服务的收费明细
 */
export async function handleGetServiceBilling(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const clientServiceId = match[1];
  
  // 检查服务是否存在且有权限访问
  const service = await env.DATABASE.prepare(
    `SELECT cs.client_service_id, cs.client_id, c.assignee_user_id
     FROM ClientServices cs
     LEFT JOIN Clients c ON c.client_id = cs.client_id
     WHERE cs.client_service_id = ? AND cs.is_deleted = 0`
  ).bind(clientServiceId).first();
  
  if (!service) {
    return errorResponse(404, "NOT_FOUND", "服務不存在", null, requestId);
  }
  
  // 权限检查：管理员或负责人可查看
  if (!user.is_admin && service.assignee_user_id !== user.user_id) {
    return errorResponse(403, "FORBIDDEN", "無權限訪問", null, requestId);
  }
  
  const rows = await env.DATABASE.prepare(
    `SELECT schedule_id, billing_type, billing_month, billing_amount, 
            payment_due_days, billing_date, description, notes, billing_year,
            created_at, updated_at
     FROM ServiceBillingSchedule
     WHERE client_service_id = ?
     ORDER BY billing_type ASC, billing_month ASC`
  ).bind(clientServiceId).all();
  
  const data = (rows?.results || []).map(r => ({
    schedule_id: r.schedule_id,
    billing_type: r.billing_type || 'monthly',
    billing_year: r.billing_year ?? null,
    billing_month: r.billing_month,
    billing_amount: Number(r.billing_amount || 0),
    payment_due_days: Number(r.payment_due_days || 30),
    billing_date: r.billing_date || null,
    description: r.description || null,
    notes: r.notes || "",
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
  
  // 计算年度总额
  const yearTotal = data.reduce((sum, item) => sum + item.billing_amount, 0);
  const currentYear = new Date().getFullYear();
  const yearTotalCurrent = data
    .filter(i => i.billing_type === 'one-time' ? ((i.billing_date || '').startsWith(String(currentYear))) : ((i.billing_year || currentYear) === currentYear))
    .reduce((sum, item) => sum + item.billing_amount, 0);
  
  return successResponse({
    schedules: data,
    year_total: yearTotal,
    year_total_current: yearTotalCurrent,
    meta: { client_service_id: clientServiceId, year: currentYear }
  }, "查詢成功", requestId);
}

/**
 * 创建收费明细
 */
export async function handleCreateBilling(request, env, ctx, requestId, url) {
  const body = await request.json();
  const clientServiceId = parseInt(body?.client_service_id || 0);
  const billingType = String(body?.billing_type || "monthly").trim();
  const billingYear = body?.billing_year ? parseInt(body.billing_year, 10) : null;
  const billingMonth = parseInt(body?.billing_month, 10);
  const billingAmount = parseFloat(body?.billing_amount);
  const paymentDueDays = parseInt(body?.payment_due_days || 30, 10);
  const notes = String(body?.notes || "").trim();
  const billingDate = String(body?.billing_date || "").trim();
  const description = String(body?.description || "").trim();
  // 可選：是否在一次性收費時同時建立單一任務（預設：true）
  const createTask = body?.create_task !== false;
  
  const errors = [];
  if (!clientServiceId) errors.push({ field: "client_service_id", message: "必填" });
  if (!['monthly', 'one-time', 'recurring'].includes(billingType)) {
    errors.push({ field: "billing_type", message: "收費類型必須為monthly、recurring或one-time" });
  }
  
  if (billingType === 'monthly') {
    if (!Number.isInteger(billingMonth) || billingMonth < 1 || billingMonth > 12) {
      errors.push({ field: "billing_month", message: "月份必須在1-12之間" });
    }
  } else if (billingType === 'one-time') {
    if (!billingDate) errors.push({ field: "billing_date", message: "一次性收費必須提供日期" });
    if (!description) errors.push({ field: "description", message: "一次性收費必須提供說明" });
  }
  
  if (isNaN(billingAmount) || billingAmount < 0) {
    errors.push({ field: "billing_amount", message: "金額必須為非負數" });
  }
  if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
    errors.push({ field: "payment_due_days", message: "收款期限必須大於0" });
  }
  
  if (errors.length > 0) {
    return errorResponse(422, "VALIDATION_ERROR", "輸入有誤", errors, requestId);
  }
  
  const now = new Date().toISOString();
  try {
    // 檢查服務是否存在（取得 client_id 與 service_id 用於建立任務）
    const service = await env.DATABASE.prepare(
      `SELECT cs.client_service_id, cs.client_id, cs.service_id, cs.service_type, s.service_name
       FROM ClientServices cs
       LEFT JOIN Services s ON s.service_id = cs.service_id
       WHERE cs.client_service_id = ? AND cs.is_deleted = 0`
    ).bind(clientServiceId).first();
    
    if (!service) {
      return errorResponse(404, "NOT_FOUND", "服務不存在", null, requestId);
    }
    // 與服務型態對齊：一次性服務不允許新增 monthly/recurring 收費
    if (service.service_type === 'one-time' && (billingType === 'monthly' || billingType === 'recurring')) {
      return errorResponse(422, "VALIDATION_ERROR", "一次性服務不可設定月度收費", [{ field: "billing_type", message: "不允許" }], requestId);
    }
    
    // 唯一性檢查
    if (billingType === 'monthly' || billingType === 'recurring') {
      const finalBillingYearForCheck = billingYear || new Date().getFullYear()
      let existing = null;
      try {
        existing = await env.DATABASE.prepare(
          `SELECT schedule_id FROM ServiceBillingSchedule 
           WHERE client_service_id = ? AND billing_year = ? AND billing_month = ? AND billing_type IN ('monthly', 'recurring')`
        ).bind(clientServiceId, finalBillingYearForCheck, billingMonth).first();
      } catch (colErr) {
        // 回退：舊表沒有 billing_year 欄位
        existing = await env.DATABASE.prepare(
          `SELECT schedule_id FROM ServiceBillingSchedule 
           WHERE client_service_id = ? AND billing_month = ? AND billing_type IN ('monthly', 'recurring')`
        ).bind(clientServiceId, billingMonth).first();
      }
      if (existing) {
        return errorResponse(422, "DUPLICATE", "該月份已設定收費", 
          [{ field: "billing_month", message: "該月份已存在" }], requestId);
      }
    } else if (billingType === 'one-time') {
      const existing = await env.DATABASE.prepare(
        `SELECT schedule_id FROM ServiceBillingSchedule 
         WHERE client_service_id = ? AND billing_type = 'one-time' 
         AND billing_date = ? AND COALESCE(description,'') = ?`
      ).bind(clientServiceId, billingDate, description).first();
      
      if (existing) {
        return errorResponse(422, "DUPLICATE", "該日期與說明的一次性收費已存在",
          [{ field: "billing_date", message: "重複" }], requestId);
      }
    }
    
    const finalBillingYear = (billingType === 'monthly' || billingType === 'recurring') 
      ? (billingYear || new Date().getFullYear())
      : null
    const insertBillingType = (billingType === 'recurring' ? 'monthly' : billingType);

    // 事務開始（最佳努力）
    try { await env.DATABASE.exec?.("BEGIN"); } catch (_) { /* D1 舊版可能不支援 exec */ try { await env.DATABASE.prepare("BEGIN").run(); } catch(_){} }

    // 1) 建立收費排程
    await env.DATABASE.prepare(
      `INSERT INTO ServiceBillingSchedule 
       (client_service_id, billing_type, billing_year, billing_month, billing_amount, 
        payment_due_days, billing_date, description, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      clientServiceId,
      insertBillingType,
      finalBillingYear,
      (billingType === 'monthly' || billingType === 'recurring') ? billingMonth : 0,
      billingAmount,
      paymentDueDays,
      billingType === 'one-time' ? billingDate : null,
      billingType === 'one-time' ? description : null,
      notes,
      now,
      now
    ).run();

    // 2) 若為一次性且需建立任務：建立一筆對應任務（避免重複：若有相同月份與名稱任務則略過）
    if (billingType === 'one-time' && createTask) {
      // 依 billing_date 推導 service_month
      const [yyyy, mm] = (billingDate || '').split('-');
      const serviceYear = parseInt(yyyy || String(new Date().getFullYear()), 10);
      const serviceMonthNum = parseInt(mm || "1", 10);
      const taskName = description || (service.service_name ? `${service.service_name}-一次性` : "一次性服務");

      // 基於相同 client_service_id + service_year + service_month + task_type 作為冪等判斷
      const existedTask = await env.DATABASE.prepare(
        `SELECT task_id FROM ActiveTasks 
         WHERE client_service_id = ? AND service_year = ? AND service_month = ? AND task_type = ? LIMIT 1`
      ).bind(clientServiceId, serviceYear, serviceMonthNum, taskName).first();

      if (!existedTask) {
        await env.DATABASE.prepare(
          `INSERT INTO ActiveTasks (
            client_id, client_service_id, service_id, task_type, assignee_user_id, 
            status, service_year, service_month, due_date, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?, ?, ?)`
        ).bind(
          service.client_id,
          clientServiceId,
          service.service_id,
          taskName,
          null,
          serviceYear,
          serviceMonthNum,
          null,
          notes || '',
          now
        ).run();
      }
    }

    // 提交事務
    try { await env.DATABASE.exec?.("COMMIT"); } catch (_) { try { await env.DATABASE.prepare("COMMIT").run(); } catch(_){} }
  } catch (e) {
    // 回滾事務
    try { await env.DATABASE.exec?.("ROLLBACK"); } catch (_) { try { await env.DATABASE.prepare("ROLLBACK").run(); } catch(_){} }
    // 兼容舊版本資料表（無 billing_year 欄位）
    const insertBillingTypeFallback = (billingType === 'recurring' ? 'monthly' : billingType);
    try {
      // 先插入收費（回退欄位集）
      await env.DATABASE.prepare(
        `INSERT INTO ServiceBillingSchedule 
         (client_service_id, billing_type, billing_month, billing_amount, 
          payment_due_days, billing_date, description, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        clientServiceId,
        insertBillingTypeFallback,
        (billingType === 'monthly' || billingType === 'recurring') ? billingMonth : 0,
        billingAmount,
        paymentDueDays,
        billingType === 'one-time' ? billingDate : null,
        billingType === 'one-time' ? description : null,
        notes,
        now,
        now
      ).run();

      // 盡力維持「同成同敗」：若為一次性且需建立任務，嘗試建立；失敗則刪除剛插入的收費
      if (billingType === 'one-time' && createTask) {
        // 取服務資訊
        const serviceForFallback = await env.DATABASE.prepare(
          `SELECT cs.client_id, cs.service_id, s.service_name
           FROM ClientServices cs
           LEFT JOIN Services s ON s.service_id = cs.service_id
           WHERE cs.client_service_id = ?`
        ).bind(clientServiceId).first();

        // 以日期推導服務年月
        const [yyyy, mm] = (billingDate || '').split('-');
        const serviceYear = parseInt(yyyy || String(new Date().getFullYear()), 10);
        const serviceMonthNum = parseInt(mm || "1", 10);
        const taskName = description || (serviceForFallback?.service_name ? `${serviceForFallback.service_name}-一次性` : "一次性服務");

        try {
          const existedTask = await env.DATABASE.prepare(
            `SELECT task_id FROM ActiveTasks 
             WHERE client_service_id = ? AND service_year = ? AND service_month = ? AND task_type = ? LIMIT 1`
          ).bind(clientServiceId, serviceYear, serviceMonthNum, taskName).first();

          if (!existedTask) {
            await env.DATABASE.prepare(
              `INSERT INTO ActiveTasks (
                client_id, client_service_id, service_id, task_type, assignee_user_id, 
                status, service_year, service_month, due_date, notes, created_at
              ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?, ?, ?)`
            ).bind(
              serviceForFallback?.client_id,
              clientServiceId,
              serviceForFallback?.service_id,
              taskName,
              null,
              serviceYear,
              serviceMonthNum,
              null,
              notes || '',
              now
            ).run();
          }
        } catch (taskErr) {
          // 任務建立失敗 → 刪除剛才插入的收費以維持原子性
          try {
            const scheduleRow = await env.DATABASE.prepare(
              `SELECT schedule_id FROM ServiceBillingSchedule 
               WHERE client_service_id = ? AND billing_type = ? 
               AND COALESCE(billing_date,'') = COALESCE(?, '') 
               AND COALESCE(description,'') = COALESCE(?, '') 
               ORDER BY schedule_id DESC LIMIT 1`
            ).bind(clientServiceId, insertBillingTypeFallback, billingType === 'one-time' ? billingDate : null, billingType === 'one-time' ? description : null).first();
            if (scheduleRow?.schedule_id) {
              await env.DATABASE.prepare(
                `DELETE FROM ServiceBillingSchedule WHERE schedule_id = ?`
              ).bind(scheduleRow.schedule_id).run();
            }
          } catch (_) { /* 刪除失敗則忽略 */ }
          return errorResponse(500, "INTERNAL_ERROR", `建立一次性任務失敗: ${taskErr?.message || taskErr}`, null, requestId);
        }
      }
    } catch (e2) {
      // 最小欄位集回退（適配更舊結構/約束）
      try {
        await env.DATABASE.prepare(
          `INSERT INTO ServiceBillingSchedule 
           (client_service_id, billing_type, billing_month, billing_amount, payment_due_days, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          clientServiceId,
          insertBillingTypeFallback,
          (billingType === 'monthly' || billingType === 'recurring') ? (billingMonth || 0) : 0,
          billingAmount,
          paymentDueDays,
          now,
          now
        ).run();
        // 同上：若需任務，嘗試建立；失敗則刪除剛插入記錄
        if (billingType === 'one-time' && createTask) {
          try {
            const serviceForFallback2 = await env.DATABASE.prepare(
              `SELECT cs.client_id, cs.service_id, s.service_name
               FROM ClientServices cs
               LEFT JOIN Services s ON s.service_id = cs.service_id
               WHERE cs.client_service_id = ?`
            ).bind(clientServiceId).first();
            const [yyyy2, mm2] = (billingDate || '').split('-');
            const serviceYear2 = parseInt(yyyy2 || String(new Date().getFullYear()), 10);
            const serviceMonthNum2 = parseInt(mm2 || "1", 10);
            const taskName2 = description || (serviceForFallback2?.service_name ? `${serviceForFallback2.service_name}-一次性` : "一次性服務");

            const existedTask2 = await env.DATABASE.prepare(
              `SELECT task_id FROM ActiveTasks 
               WHERE client_service_id = ? AND service_year = ? AND service_month = ? AND task_type = ? LIMIT 1`
            ).bind(clientServiceId, serviceYear2, serviceMonthNum2, taskName2).first();
            if (!existedTask2) {
              await env.DATABASE.prepare(
                `INSERT INTO ActiveTasks (
                  client_id, client_service_id, service_id, task_type, assignee_user_id, 
                  status, service_year, service_month, due_date, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?, ?, ?)`
              ).bind(
                serviceForFallback2?.client_id,
                clientServiceId,
                serviceForFallback2?.service_id,
                taskName2,
                null,
                serviceYear2,
                serviceMonthNum2,
                null,
                notes || '',
                now
              ).run();
            }
          } catch (taskErr2) {
            try {
              const scheduleRow2 = await env.DATABASE.prepare(
                `SELECT schedule_id FROM ServiceBillingSchedule 
                 WHERE client_service_id = ? AND billing_type = ? 
                 ORDER BY schedule_id DESC LIMIT 1`
              ).bind(clientServiceId, insertBillingTypeFallback).first();
              if (scheduleRow2?.schedule_id) {
                await env.DATABASE.prepare(
                  `DELETE FROM ServiceBillingSchedule WHERE schedule_id = ?`
                ).bind(scheduleRow2.schedule_id).run();
              }
            } catch (_) {}
            return errorResponse(500, "INTERNAL_ERROR", `建立一次性任務失敗: ${taskErr2?.message || taskErr2}`, null, requestId);
          }
        }
      } catch (e3) {
        return errorResponse(500, "INTERNAL_ERROR_DETAIL", `INSERT failed: ${e3?.message || e3}`, null, requestId);
      }
    }
  }
  
  try {
    const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
    
    // 清除相关缓存
    const serviceRow = await env.DATABASE.prepare(
      `SELECT client_id FROM ClientServices WHERE client_service_id = ?`
    ).bind(clientServiceId).first();
    if (serviceRow?.client_id) {
      await deleteKVCacheByPrefix(env, `client_detail:clientId=${serviceRow.client_id}`).catch(() => {});
    }
    
    return successResponse({ schedule_id: idRow?.id }, "已創建", requestId);
  } catch (err) {
    return errorResponse(500, "INTERNAL_ERROR", `建立收費成功但回傳處理失敗：${err?.message || err}`, null, requestId);
  }
}

/**
 * 更新收费明细
 */
export async function handleUpdateBilling(request, env, ctx, requestId, match, url) {
  const scheduleId = match[1];
  const body = await request.json();
  
  // 检查记录是否存在
  const existing = await env.DATABASE.prepare(
    `SELECT schedule_id, client_service_id, billing_type FROM ServiceBillingSchedule WHERE schedule_id = ?`
  ).bind(scheduleId).first();
  
  if (!existing) {
    return errorResponse(404, "NOT_FOUND", "收費明細不存在", null, requestId);
  }
  
  const updates = [];
  const binds = [];
  
  if (body.hasOwnProperty('billing_amount')) {
    const billingAmount = parseFloat(body.billing_amount);
    if (isNaN(billingAmount) || billingAmount < 0) {
      return errorResponse(422, "VALIDATION_ERROR", "金額必須為非負數", null, requestId);
    }
    updates.push("billing_amount = ?");
    binds.push(billingAmount);
  }
  if (body.hasOwnProperty('payment_due_days')) {
    const paymentDueDays = parseInt(body.payment_due_days, 10);
    if (!Number.isInteger(paymentDueDays) || paymentDueDays < 1) {
      return errorResponse(422, "VALIDATION_ERROR", "收款期限必須大於0", null, requestId);
    }
    updates.push("payment_due_days = ?");
    binds.push(paymentDueDays);
  }
  if (body.hasOwnProperty('notes')) {
    updates.push("notes = ?");
    binds.push(String(body.notes || "").trim());
  }
  // 僅針對一次性收費允許修改日期與說明（避免破壞月度唯一性）
  if (existing.billing_type === 'one-time') {
    if (body.hasOwnProperty('billing_date')) {
      const billingDate = String(body.billing_date || "").trim();
      if (!billingDate) {
        return errorResponse(422, "VALIDATION_ERROR", "一次性收費必須提供日期", null, requestId);
      }
      updates.push("billing_date = ?");
      binds.push(billingDate);
    }
    if (body.hasOwnProperty('description')) {
      const description = String(body.description || "").trim();
      if (!description) {
        return errorResponse(422, "VALIDATION_ERROR", "一次性收費必須提供說明", null, requestId);
      }
      updates.push("description = ?");
      binds.push(description);
    }
  }
  
  if (updates.length === 0) {
    return errorResponse(400, "BAD_REQUEST", "沒有可更新的欄位", null, requestId);
  }
  
  updates.push("updated_at = ?");
  binds.push(new Date().toISOString());
  binds.push(scheduleId);
  
  await env.DATABASE.prepare(
    `UPDATE ServiceBillingSchedule SET ${updates.join(", ")} WHERE schedule_id = ?`
  ).bind(...binds).run();
  
  // 清除相关缓存
  const service = await env.DATABASE.prepare(
    `SELECT client_id FROM ClientServices WHERE client_service_id = ?`
  ).bind(existing.client_service_id).first();
  
  if (service) {
    await deleteKVCacheByPrefix(env, `client_detail:clientId=${service.client_id}`).catch(() => {});
  }
  
  return successResponse({ schedule_id: scheduleId }, "已更新", requestId);
}

/**
 * 批量刪除收費計劃
 */
export async function handleBatchDeleteBilling(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  
  // 驗證用戶身份
  if (!user || !user.user_id) {
    return errorResponse(401, "UNAUTHORIZED", "未登入或身份驗證失敗", null, requestId);
  }
  
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return errorResponse(400, "BAD_REQUEST", "請求格式錯誤", null, requestId);
  }
  
  const scheduleIds = body?.schedule_ids || [];
  
  // 驗證輸入參數
  if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) {
    return errorResponse(422, "VALIDATION_ERROR", "收費計劃ID列表不能為空", 
      [{ field: "schedule_ids", message: "必須提供至少一個收費計劃ID" }], requestId);
  }
  
  // 驗證所有 ID 都是有效的數字
  const validScheduleIds = scheduleIds
    .map(id => parseInt(id, 10))
    .filter(id => Number.isInteger(id) && id > 0);
  
  if (validScheduleIds.length === 0) {
    return errorResponse(422, "VALIDATION_ERROR", "無效的收費計劃ID", 
      [{ field: "schedule_ids", message: "所有ID必須為正整數" }], requestId);
  }
  
  if (validScheduleIds.length !== scheduleIds.length) {
    return errorResponse(422, "VALIDATION_ERROR", "部分收費計劃ID無效", 
      [{ field: "schedule_ids", message: "所有ID必須為正整數" }], requestId);
  }
  
  try {
    // 檢查所有記錄是否存在，並獲取相關的服務資訊用於權限檢查
    const schedules = await env.DATABASE.prepare(
      `SELECT sbs.schedule_id, sbs.client_service_id, cs.client_id, c.assignee_user_id
       FROM ServiceBillingSchedule sbs
       LEFT JOIN ClientServices cs ON cs.client_service_id = sbs.client_service_id
       LEFT JOIN Clients c ON c.client_id = cs.client_id
       WHERE sbs.schedule_id IN (${validScheduleIds.map(() => '?').join(',')})`
    ).bind(...validScheduleIds).all();
    
    if (!schedules?.results || schedules.results.length === 0) {
      return errorResponse(404, "NOT_FOUND", "未找到任何收費計劃記錄", null, requestId);
    }
    
    // 檢查是否有不存在的記錄
    const foundIds = new Set(schedules.results.map(s => s.schedule_id));
    const missingIds = validScheduleIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      return errorResponse(404, "NOT_FOUND", 
        `以下收費計劃不存在: ${missingIds.join(', ')}`, null, requestId);
    }
    
    // 權限檢查：管理員或客戶負責人可以刪除
    const unauthorizedSchedules = schedules.results.filter(s => {
      if (user.is_admin) return false; // 管理員有權限
      return Number(s.assignee_user_id) !== Number(user.user_id);
    });
    
    if (unauthorizedSchedules.length > 0) {
      const unauthorizedIds = unauthorizedSchedules.map(s => s.schedule_id).join(', ');
      return errorResponse(403, "FORBIDDEN", 
        `無權限刪除以下收費計劃: ${unauthorizedIds}`, null, requestId);
    }
    
    // 獲取所有受影響的客戶ID，用於清除緩存
    const affectedClientIds = new Set(
      schedules.results.map(s => s.client_id).filter(id => id)
    );
    
    // 開始事務處理
    try { 
      await env.DATABASE.exec?.("BEGIN"); 
    } catch (_) { 
      try { 
        await env.DATABASE.prepare("BEGIN").run(); 
      } catch(_){}
    }
    
    // 批量刪除
    const deleteStatements = validScheduleIds.map(id => 
      env.DATABASE.prepare(
        `DELETE FROM ServiceBillingSchedule WHERE schedule_id = ?`
      ).bind(id)
    );
    
    try {
      await env.DATABASE.batch(deleteStatements);
    } catch (batchErr) {
      // 回滾事務
      try { 
        await env.DATABASE.exec?.("ROLLBACK"); 
      } catch (_) { 
        try { 
          await env.DATABASE.prepare("ROLLBACK").run(); 
        } catch(_){}
      }
      console.error('[BatchDeleteBilling] 批量刪除失敗:', batchErr);
      return errorResponse(500, "INTERNAL_ERROR", 
        `批量刪除失敗: ${batchErr?.message || batchErr}`, null, requestId);
    }
    
    // 提交事務
    try { 
      await env.DATABASE.exec?.("COMMIT"); 
    } catch (_) { 
      try { 
        await env.DATABASE.prepare("COMMIT").run(); 
      } catch(_){}
    }
    
    // 清除相關緩存
    await Promise.all(
      Array.from(affectedClientIds).map(clientId => 
        deleteKVCacheByPrefix(env, `client_detail:clientId=${clientId}`).catch(() => {})
      )
    );
    
    return successResponse({
      deleted_count: validScheduleIds.length,
      deleted_ids: validScheduleIds
    }, `已成功刪除 ${validScheduleIds.length} 筆收費計劃`, requestId);
    
  } catch (err) {
    console.error('[BatchDeleteBilling] Error:', err);
    return errorResponse(500, "INTERNAL_ERROR", 
      `批量刪除處理失敗: ${err?.message || err}`, null, requestId);
  }
}






