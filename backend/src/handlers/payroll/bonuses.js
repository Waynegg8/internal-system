/**
 * 奖金管理（年度绩效奖金、年终奖金）
 */

import { successResponse, errorResponse } from "../../utils/response.js";

/**
 * 获取年度绩效奖金
 */
export async function handleGetYearlyBonus(request, env, ctx, requestId, match, url) {
  const year = match[1];
  
  const users = await env.DATABASE.prepare(`
    SELECT user_id, username, name, base_salary
    FROM Users
    WHERE is_deleted = 0
    ORDER BY user_id
  `).all();
  
  // 获取该年的绩效调整记录
  const bonuses = await env.DATABASE.prepare(`
    SELECT user_id, month, bonus_amount_cents, notes
    FROM MonthlyBonusAdjustments
    WHERE substr(month, 1, 4) = ?
  `).bind(year).all();
  
  const bonusMap = {};
  (bonuses.results || []).forEach(b => {
    if (!bonusMap[b.user_id]) bonusMap[b.user_id] = {};
    bonusMap[b.user_id][b.month] = {
      bonusAmountCents: b.bonus_amount_cents,
      notes: b.notes || ""
    };
  });
  
  // 一次性查詢所有員工的績效獎金項目（優化：避免 N+1 查詢）
  const perfItems = await env.DATABASE.prepare(`
    SELECT esi.user_id, esi.amount_cents, esi.effective_date, esi.expiry_date,
           esi.recurring_type, esi.recurring_months
    FROM EmployeeSalaryItems esi
    JOIN SalaryItemTypes sit ON sit.item_type_id = esi.item_type_id
    WHERE sit.item_code = 'PERFORMANCE'
      AND esi.is_active = 1
    ORDER BY esi.user_id, esi.effective_date DESC
  `).all();
  
  // 構建績效項目映射（按用戶ID）
  const perfItemsMap = {};
  (perfItems.results || []).forEach(item => {
    if (!perfItemsMap[item.user_id]) {
      perfItemsMap[item.user_id] = [];
    }
    perfItemsMap[item.user_id].push(item);
  });
  
  // 獲取每個員工的默認績效金額
  const employeeData = [];
  for (const user of (users.results || [])) {
    const userPerfItems = perfItemsMap[user.user_id] || [];
    const monthlyDefaults = {};
    const monthlyAdjustments = {};
    
    console.log(`[YearlyBonus] 處理員工 ${user.user_id} (${user.name})，績效項目數: ${userPerfItems.length}`);
    
    for (let m = 1; m <= 12; m++) {
      const month = `${year}-${String(m).padStart(2, '0')}`;
      // 計算該月的第一天和最後一天
      const firstDay = `${month}-01`;
      const lastDay = new Date(parseInt(year), m, 0).getDate();
      const lastDayStr = `${month}-${String(lastDay).padStart(2, '0')}`;
      
      // 找出該月份有效的績效項目
      let defaultBonusCents = 0;
      // 找出該月份有效的項目
      // 邏輯：生效日期 <= 該月最後一天，且（失效日期為空 或 失效日期 >= 該月第一天）
      for (const item of userPerfItems) {
        const effectiveDate = item.effective_date;
        const expiryDate = item.expiry_date;
        
        // 檢查是否在有效期內
        // 生效日期必須 <= 該月最後一天（表示該項目在該月之前或該月生效）
        // 失效日期必須為空 或 >= 該月第一天（表示該項目在該月之後或該月才失效）
        if (effectiveDate && effectiveDate <= lastDayStr) {
          if (!expiryDate || expiryDate >= firstDay) {
            defaultBonusCents = item.amount_cents || 0;
            console.log(`[YearlyBonus] 員工 ${user.user_id} ${month} 找到預設值: ${defaultBonusCents} (生效: ${effectiveDate}, 失效: ${expiryDate || 'null'})`);
            break; // 已經按日期倒序排列，找到第一個就是最新的
          }
        }
      }
      
      // 保存預設值
      monthlyDefaults[m] = defaultBonusCents;
      
      // 保存調整值
      const adjusted = bonusMap[user.user_id]?.[month];
      if (adjusted) {
        monthlyAdjustments[m] = {
          bonusAmountCents: adjusted.bonusAmountCents,
          bonus_amount_cents: adjusted.bonusAmountCents,
          notes: adjusted.notes || ""
        };
        console.log(`[YearlyBonus] 員工 ${user.user_id} ${month} 找到調整值: ${adjusted.bonusAmountCents}`);
      }
    }
    
    console.log(`[YearlyBonus] 員工 ${user.user_id} monthlyDefaults:`, monthlyDefaults);
    console.log(`[YearlyBonus] 員工 ${user.user_id} monthlyAdjustments:`, monthlyAdjustments);
    
    employeeData.push({
      userId: user.user_id,
      username: user.username,
      name: user.name,
      baseSalary: user.base_salary || 0,
      monthlyDefaults,
      monthly_defaults: monthlyDefaults,
      monthlyAdjustments,
      monthly_adjustments: monthlyAdjustments
    });
  }
  
  console.log(`[YearlyBonus] 返回 ${employeeData.length} 個員工的數據`);
  
  return successResponse({ year, employees: employeeData }, "查詢成功", requestId);
}

/**
 * 保存年度绩效奖金
 */
export async function handleUpdateYearlyBonus(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const year = match[1];
  const body = await request.json();
  const adjustments = body?.adjustments || [];
  
  if (!Array.isArray(adjustments)) {
    return errorResponse(400, "BAD_REQUEST", "調整數據格式錯誤", null, requestId);
  }
  
  // 使用事務批量處理：先刪除，再批量插入
  const statements = [];
  
  // 第一步：刪除該年的所有調整記錄
  statements.push(
    env.DATABASE.prepare(
      `DELETE FROM MonthlyBonusAdjustments WHERE substr(month, 1, 4) = ?`
    ).bind(year)
  );
  
  // 第二步：批量插入新的調整記錄
  for (const adj of adjustments) {
    if (adj.bonusAmountCents === null || adj.bonusAmountCents === undefined) continue;
    if (!adj.month || !adj.userId) continue;
    
    // 構造正確的月份格式 YYYY-MM
    const monthStr = `${year}-${String(adj.month).padStart(2, '0')}`;
    
    statements.push(
      env.DATABASE.prepare(`
        INSERT INTO MonthlyBonusAdjustments 
        (user_id, month, bonus_amount_cents, notes, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        adj.userId,
        monthStr,
        adj.bonusAmountCents,
        adj.notes || null,
        String(user.user_id)
      )
    );
  }
  
  // 批量執行所有語句
  await env.DATABASE.batch(statements);
  
  // 觸發薪資重新計算（績效獎金調整需要完整重新計算）
  try {
    if (adjustments.length > 0) {
      const { enqueuePayrollRecalc } = await import("../../utils/payroll-cache.js");
      const { recalculateEmployeePayroll } = await import("../../utils/payroll-recalculate.js");
      const recalcTargets = new Set();
      for (const adj of adjustments) {
        if (!adj || !adj.userId) continue;
        const monthStr = `${year}-${String(adj.month).padStart(2, '0')}`;
        recalcTargets.add(`${adj.userId}|${monthStr}`);
      }
      
      // 立即標記需要重新計算，並嘗試立即處理
      const recalcPromises = [];
      recalcTargets.forEach((key) => {
        const [userId, monthStr] = key.split("|");
        const userIdNum = Number(userId);
        
        // 標記需要重新計算
        const enqueuePromise = enqueuePayrollRecalc(env, userIdNum, monthStr, "performance_bonus_adjusted").catch((err) => {
          console.error(`[YearlyBonus] 標記員工 ${userIdNum} ${monthStr} 需要重新計算失敗:`, err);
        });
        
        // 嘗試立即重新計算（不阻塞響應）
        if (ctx && ctx.waitUntil) {
          const recalcPromise = enqueuePromise.then(async () => {
            try {
              await recalculateEmployeePayroll(env, userIdNum, monthStr);
              console.log(`[YearlyBonus] 員工 ${userIdNum} ${monthStr} 薪資重新計算完成`);
            } catch (err) {
              console.error(`[YearlyBonus] 員工 ${userIdNum} ${monthStr} 薪資重新計算失敗:`, err);
            }
          });
          ctx.waitUntil(recalcPromise);
          recalcPromises.push(recalcPromise);
        } else {
          recalcPromises.push(enqueuePromise);
        }
      });
      
      // 等待所有標記完成（但不等待重新計算完成）
      await Promise.allSettled(recalcPromises);
    }
  } catch (err) {
    console.error("[YearlyBonus] 觸發薪資重新計算失敗:", err);
  }
  
  return successResponse({ updated: adjustments.length }, "已保存", requestId);
}

/**
 * 获取年终奖金
 */
export async function handleGetYearEndBonus(request, env, ctx, requestId, match, url) {
  const year = parseInt(match[1]);
  
  const users = await env.DATABASE.prepare(`
    SELECT user_id, username, name, base_salary
    FROM Users
    WHERE is_deleted = 0
    ORDER BY user_id
  `).all();
  
  // 获取该年的年终奖金记录
  const bonuses = await env.DATABASE.prepare(`
    SELECT user_id, amount_cents, payment_month, notes
    FROM YearEndBonus
    WHERE year = ?
  `).bind(year).all();
  
  const bonusMap = {};
  (bonuses.results || []).forEach(b => {
    bonusMap[b.user_id] = {
      amountCents: b.amount_cents,
      paymentMonth: b.payment_month,
      notes: b.notes || ""
    };
  });
  
  const employeeData = (users.results || []).map(user => {
    const bonus = bonusMap[user.user_id];
    return {
      userId: user.user_id,
      username: user.username,
      name: user.name,
      // 注意：base_salary是以元為單位，需要轉換為分
      baseSalaryCents: (user.base_salary || 0) * 100,
      base_salary_cents: (user.base_salary || 0) * 100,
      amountCents: bonus?.amountCents || 0,
      amount_cents: bonus?.amountCents || 0,
      paymentMonth: bonus?.paymentMonth || null,
      payment_month: bonus?.paymentMonth || null,
      notes: bonus?.notes || ""
    };
  });
  
  const totalCents = employeeData.reduce((sum, e) => sum + e.amountCents, 0);
  const count = employeeData.filter(e => e.amountCents > 0).length;
  const averageCents = count > 0 ? Math.round(totalCents / count) : 0;
  
  return successResponse({
    year,
    employees: employeeData,
    summary: {
      totalCents,
      count,
      averageCents
    }
  }, "查詢成功", requestId);
}

/**
 * 保存年终奖金
 */
export async function handleUpdateYearEndBonus(request, env, ctx, requestId, match, url) {
  const user = ctx?.user;
  const year = parseInt(match[1]);
  const body = await request.json();
  const bonuses = body?.bonuses || [];
  
  if (!Array.isArray(bonuses)) {
    return errorResponse(400, "BAD_REQUEST", "獎金數據格式錯誤", null, requestId);
  }
  
  // 先删除该年的所有奖金记录
  await env.DATABASE.prepare(
    `DELETE FROM YearEndBonus WHERE year = ?`
  ).bind(year).run().catch(() => {});
  
  // 插入新的奖金记录
  for (const bonus of bonuses) {
    if (!bonus.amountCents || bonus.amountCents <= 0) continue;
    if (!bonus.userId) continue;
    
    await env.DATABASE.prepare(`
      INSERT INTO YearEndBonus 
      (user_id, year, amount_cents, payment_month, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      bonus.userId,
      year,
      bonus.amountCents,
      bonus.paymentMonth || null,
      bonus.notes || null,
      String(user.user_id)
    ).run().catch(() => {});
  }
  
  // 觸發薪資重新計算
  try {
    if (bonuses.length > 0) {
      const { triggerPayrollRecalculation } = await import("../../utils/payroll-recalculate.js");
      const recalcTargets = new Set();
      for (const bonus of bonuses) {
        if (!bonus || !bonus.userId || !bonus.paymentMonth) continue;
        recalcTargets.add(`${bonus.userId}|${bonus.paymentMonth}`);
      }
      recalcTargets.forEach((key) => {
        const [userId, monthStr] = key.split("|");
        const dateStr = `${monthStr}-01`;
        triggerPayrollRecalculation(env, Number(userId), dateStr, ctx, "bonus").catch(() => {});
      });
    }
  } catch (err) {
    console.error("[YearEndBonus] 觸發薪資重新計算失敗:", err);
  }
  
  return successResponse({ updated: bonuses.length }, "已保存", requestId);
}

