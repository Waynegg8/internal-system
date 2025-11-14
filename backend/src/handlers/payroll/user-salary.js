/**
 * 用户薪资管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取员工薪资设定
 */
export async function handleGetUserSalary(request, env, ctx, requestId, match, url) {
  const userId = match[1];
  
  // 读取员工基本信息
  let user;
  try {
    user = await env.DATABASE.prepare(`
      SELECT user_id, username, name, base_salary, salary_notes
      FROM Users
      WHERE user_id = ? AND is_deleted = 0
    `).bind(userId).first();
  } catch (dbError) {
    console.error('[User Salary] Database query error (user):', dbError);
    return successResponse({ items: [], baseSalary: 0, salaryNotes: "" }, "查詢成功（空結果）", requestId);
  }
  
  if (!user) {
    return errorResponse(404, "NOT_FOUND", "員工不存在", null, requestId);
  }
  
  // 读取员工的薪资项目
  let salaryItems;
  try {
    salaryItems = await env.DATABASE.prepare(`
      SELECT 
        esi.employee_item_id,
        esi.item_type_id,
        esi.amount_cents,
        esi.effective_date,
        esi.expiry_date,
        esi.notes,
        esi.is_active,
        esi.recurring_type,
        esi.recurring_months,
        sit.item_code,
        sit.item_name,
        sit.category
      FROM EmployeeSalaryItems esi
      JOIN SalaryItemTypes sit ON sit.item_type_id = esi.item_type_id
      WHERE esi.user_id = ?
      ORDER BY sit.display_order, esi.employee_item_id
    `).bind(userId).all();
  } catch (dbError) {
    console.error('[User Salary] Database query error (items):', dbError);
    salaryItems = { results: [] };
  }
  
  const items = (salaryItems.results || []).map(item => ({
    employeeItemId: item.employee_item_id,
    itemTypeId: item.item_type_id,
    itemCode: item.item_code,
    itemName: item.item_name,
    category: item.category,
    amountCents: item.amount_cents || 0,
    effectiveDate: item.effective_date,
    expiryDate: item.expiry_date,
    notes: item.notes || "",
    isActive: Boolean(item.is_active),
    recurringType: item.recurring_type || 'monthly',
    recurringMonths: item.recurring_months || null
  }));
  
  // 注意：base_salary是以元為單位，需要轉換為分
  return successResponse({
    userId: user.user_id,
    username: user.username,
    name: user.name,
    baseSalaryCents: (user.base_salary || 0) * 100,
    salaryNotes: user.salary_notes || "",
    salaryItems: items
  }, "查詢成功", requestId);
}

/**
 * 更新员工薪资设定
 */
export async function handleUpdateUserSalary(request, env, ctx, requestId, match, url) {
  const userId = match[1];
  const body = await request.json();
  
  // 支持多種命名格式，注意：base_salary是以元為單位，不是分
  const baseSalaryCents = body.base_salary_cents !== undefined ? body.base_salary_cents : body.baseSalaryCents;
  const baseSalary = baseSalaryCents !== undefined ? Math.round(baseSalaryCents / 100) : undefined;
  const notes = body.notes !== undefined ? body.notes : body.salaryNotes;
  const items = body.items !== undefined ? body.items : body.salaryItems;
  
  // 验证数据
  if (baseSalary !== undefined && (typeof baseSalary !== 'number' || baseSalary < 0)) {
    return errorResponse(400, "VALIDATION_ERROR", "底薪必須為非負數", null, requestId);
  }
  
  // 更新底薪和备注
  if (baseSalary !== undefined || notes !== undefined) {
    const updates = [];
    const binds = [];
    
    if (baseSalary !== undefined) {
      updates.push("base_salary = ?");
      binds.push(baseSalary);
    }
    if (notes !== undefined) {
      updates.push("salary_notes = ?");
      binds.push(notes || "");
    }
    
    if (updates.length > 0) {
      updates.push("updated_at = ?");
      binds.push(new Date().toISOString());
      binds.push(userId);
      await env.DATABASE.prepare(
        `UPDATE Users SET ${updates.join(", ")} WHERE user_id = ?`
      ).bind(...binds).run();
    }
  }
  
  // 更新薪资项目
  if (Array.isArray(items)) {
    // 先删除所有现有项目
    await env.DATABASE.prepare(
      `DELETE FROM EmployeeSalaryItems WHERE user_id = ?`
    ).bind(userId).run();
    
    const monthsToRecalc = new Set();
    const addMonth = (value) => {
      if (!value) return;
      if (typeof value === "string") {
        const month = value.slice(0, 7);
        if (/^\d{4}-\d{2}$/.test(month)) {
          monthsToRecalc.add(month);
        }
      }
    };
    
    // 插入新项目
    for (const item of items) {
      const itemTypeId = item.item_type_id !== undefined ? item.item_type_id : item.itemTypeId;
      const amountCents = item.amount_cents !== undefined ? item.amount_cents : item.amountCents;
      const effectiveDate = item.effective_date !== undefined ? item.effective_date : item.effectiveDate;
      const expiryDate = item.expiry_date !== undefined ? item.expiry_date : item.expiryDate;
      const period = item.period !== undefined ? item.period : item.payment_period;
      const months = item.months !== undefined ? item.months : item.selected_months;
      
      if (!itemTypeId || amountCents === undefined) continue;
      
      await env.DATABASE.prepare(`
        INSERT INTO EmployeeSalaryItems 
        (user_id, item_type_id, amount_cents, effective_date, expiry_date, 
         notes, is_active, recurring_type, recurring_months, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        itemTypeId,
        amountCents,
        effectiveDate || null,
        expiryDate || null,
        item.notes || null,
        item.isActive !== false ? 1 : 0,
        period || 'monthly',
        months ? (typeof months === 'string' ? months : JSON.stringify(months)) : null,
        ctx.user?.userId || userId
      ).run();
      
      addMonth(effectiveDate);
      addMonth(expiryDate);
      if (months) {
        try {
          const parsed = typeof months === "string" ? JSON.parse(months) : months;
          if (Array.isArray(parsed)) {
            parsed.forEach(addMonth);
          }
        } catch (err) {
          console.warn("[User Salary] 無法解析 recurring months:", months, err);
        }
      }
    }
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    monthsToRecalc.add(currentMonth);
    
    try {
      const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
      monthsToRecalc.forEach((month) => {
        const dateStr = `${month}-01`;
        triggerPayrollRecalculation(env, userId, dateStr, ctx, "salary_item").catch(() => {});
      });
    } catch (err) {
      console.error("[Payroll] 觸發薪資重算失敗:", err);
    }
  }
  
  return successResponse({ userId }, "已更新", requestId);
}

