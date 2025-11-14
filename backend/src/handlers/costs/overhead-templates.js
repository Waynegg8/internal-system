/**
 * 管理費用循環模板管理
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { deleteKVCacheByPrefix } from "../../utils/cache.js";

/**
 * 判断模板是否应该应用到指定月份
 */
function shouldApplyTemplate(recurringType, recurringMonths, effectiveFrom, effectiveTo, year, month) {
  const target = `${year}-${String(month).padStart(2, '0')}`;
  
  // 检查有效期范围
  if (effectiveFrom && String(effectiveFrom) > target) {
    return false;
  }
  if (effectiveTo && String(effectiveTo) < target) {
    return false;
  }
  
  // 根据循环类型判断
  if (recurringType === 'monthly') {
    return true; // 每月都应用
  }
  
  if (recurringType === 'once') {
    return true; // 仅一次，在有效期内即可
  }
  
  if (recurringType === 'yearly') {
    if (!recurringMonths) {
      return false;
    }
    try {
      const months = Array.isArray(recurringMonths) ? recurringMonths : JSON.parse(String(recurringMonths));
      return Array.isArray(months) && months.includes(month);
    } catch (err) {
      return false;
    }
  }
  
  return false;
}

/**
 * 获取成本类型的模板
 */
export async function handleGetOverheadTemplate(request, env, ctx, requestId, match, url) {
  const costTypeId = parseInt(match[1], 10);
  
  if (!costTypeId || costTypeId <= 0) {
    return errorResponse(400, "INVALID_ID", "成本類型ID無效", null, requestId);
  }
  
  try {
    const row = await env.DATABASE.prepare(
      `SELECT template_id, cost_type_id, amount, notes, recurring_type, recurring_months, 
       effective_from, effective_to, is_active, created_at, updated_at
       FROM OverheadRecurringTemplates WHERE cost_type_id = ? LIMIT 1`
    ).bind(costTypeId).first();
    
    // 如果模板不存在，返回 null 而不是錯誤（與舊專案一致）
    if (!row) {
      return successResponse(null, "查詢成功", requestId);
    }
    
    const data = {
      template_id: row.template_id,
      cost_type_id: row.cost_type_id,
      amount: Number(row.amount || 0),
      notes: row.notes || '',
      recurring_type: row.recurring_type || 'monthly',
      recurring_months: row.recurring_months ? (Array.isArray(row.recurring_months) ? row.recurring_months : JSON.parse(row.recurring_months)) : null,
      effective_from: row.effective_from,
      effective_to: row.effective_to,
      is_active: row.is_active === 1,
      isActive: row.is_active === 1,
      effectiveFrom: row.effective_from,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
    
    return successResponse(data, "查詢成功", requestId);
  } catch (err) {
    console.error(`[Overhead Template] Error getting template for cost_type_id ${costTypeId}:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 创建或更新成本类型的模板
 */
export async function handleUpdateOverheadTemplate(request, env, ctx, requestId, match, url) {
  const costTypeId = parseInt(match[1], 10);
  const user = ctx?.user;
  const body = await request.json();
  
  if (!costTypeId || costTypeId <= 0) {
    return errorResponse(400, "INVALID_ID", "成本類型ID無效", null, requestId);
  }
  
  const amount = body.amount != null ? Number(body.amount) : null;
  const notes = body.notes != null ? String(body.notes) : null;
  const recurringType = body.recurring_type ? String(body.recurring_type) : 'monthly';
  const recurringMonths = body.recurring_months != null ? 
    (Array.isArray(body.recurring_months) ? JSON.stringify(body.recurring_months) : String(body.recurring_months)) : null;
  const effectiveFrom = body.effective_from != null ? String(body.effective_from) : null;
  const effectiveTo = body.effective_to != null ? String(body.effective_to) : null;
  const isActive = body.is_active == null ? 1 : (body.is_active ? 1 : 0);
  
  if (!['monthly', 'yearly', 'once'].includes(recurringType)) {
    return errorResponse(422, "VALIDATION_ERROR", "recurring_type 必須為 monthly, yearly 或 once", null, requestId);
  }
  
  try {
    // 检查是否已存在模板
    const existing = await env.DATABASE.prepare(
      "SELECT template_id FROM OverheadRecurringTemplates WHERE cost_type_id = ? LIMIT 1"
    ).bind(costTypeId).first();
    
    if (existing) {
      // 更新现有模板
      await env.DATABASE.prepare(
        `UPDATE OverheadRecurringTemplates SET 
         amount = COALESCE(?, amount),
         notes = COALESCE(?, notes),
         recurring_type = ?,
         recurring_months = COALESCE(?, recurring_months),
         effective_from = COALESCE(?, effective_from),
         effective_to = COALESCE(?, effective_to),
         is_active = ?,
         updated_at = datetime('now')
         WHERE cost_type_id = ?`
      ).bind(amount, notes, recurringType, recurringMonths, effectiveFrom, effectiveTo, isActive, costTypeId).run();
    } else {
      // 创建新模板
      await env.DATABASE.prepare(
        `INSERT INTO OverheadRecurringTemplates (cost_type_id, amount, notes, recurring_type, recurring_months, effective_from, effective_to, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(costTypeId, amount || 0, notes || '', recurringType, recurringMonths, effectiveFrom, effectiveTo, isActive, user.user_id).run();
    }
    
    // 清除相关缓存
    await deleteKVCacheByPrefix(env, 'costs_').catch(() => {});
    
    return successResponse({ cost_type_id: costTypeId }, "已保存", requestId);
  } catch (err) {
    console.error(`[Overhead Template] Error updating template for cost_type_id ${costTypeId}:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 预览生成候选列表
 */
export async function handlePreviewOverheadGeneration(request, env, ctx, requestId, match, url) {
  // 支持從路徑參數或查詢參數獲取 year 和 month
  let year, month;
  if (match && match[1] && match[2]) {
    year = parseInt(match[1], 10);
    month = parseInt(match[2], 10);
  } else {
    year = parseInt(url.searchParams.get('year'), 10);
    month = parseInt(url.searchParams.get('month'), 10);
  }
  
  if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
    return errorResponse(422, "VALIDATION_ERROR", "year/month 不合法", null, requestId);
  }
  
  try {
    // 获取所有启用的模板
    const rows = await env.DATABASE.prepare(
      `SELECT t.template_id, t.cost_type_id, t.amount, t.notes, t.recurring_type, t.recurring_months, 
              t.effective_from, t.effective_to, c.cost_name, c.is_active AS cost_type_active
       FROM OverheadRecurringTemplates t 
       LEFT JOIN OverheadCostTypes c ON c.cost_type_id = t.cost_type_id
       WHERE t.is_active = 1`
    ).all();
    
    const candidates = [];
    
    for (const r of (rows?.results || [])) {
      // 略過已刪除或停用的成本類型
      if (!r.cost_type_id || r.cost_type_active === 0 || r.cost_name == null) {
        continue;
      }
      
      // 检查模板是否应该应用到指定月份
      const shouldApply = shouldApplyTemplate(
        r.recurring_type,
        r.recurring_months,
        r.effective_from,
        r.effective_to,
        year,
        month
      );
      
      if (!shouldApply) {
        continue; // 跳过不符合条件的模板
      }
      
      // 检查是否已存在记录
      const exists = await env.DATABASE.prepare(
        `SELECT 1 FROM MonthlyOverheadCosts WHERE cost_type_id = ? AND year = ? AND month = ? AND is_deleted = 0 LIMIT 1`
      ).bind(r.cost_type_id, year, month).first();
      
      const alreadyExists = !!exists;
      candidates.push({
        template_id: r.template_id,
        cost_type_id: r.cost_type_id,
        cost_name: r.cost_name || `[ID:${r.cost_type_id}]`,
        amount: Number(r.amount || 0),
        notes: r.notes || '',
        already_exists: alreadyExists,
        alreadyExists
      });
    }
    
    return successResponse({ items: candidates }, "查詢成功", requestId);
  } catch (err) {
    console.error(`[Overhead Preview] Error previewing generation for ${year}-${month}:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}

/**
 * 根据模板生成月度成本记录
 */
export async function handleGenerateOverheadCosts(request, env, ctx, requestId, url) {
  const user = ctx?.user;
  const body = await request.json();
  const year = parseInt(body?.year || String(new Date().getFullYear()), 10);
  const month = parseInt(body?.month || String(new Date().getMonth() + 1), 10);
  const templateIds = Array.isArray(body?.template_ids) ? body.template_ids.map(id => parseInt(id, 10)) : null;
  
  if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
    return errorResponse(422, "VALIDATION_ERROR", "year/month 不合法", null, requestId);
  }
  
  try {
    // 获取启用的模板
    let query = `SELECT t.template_id, t.cost_type_id, t.amount, t.notes, t.recurring_type, t.recurring_months, 
                        t.effective_from, t.effective_to, c.is_active AS cost_type_active
                 FROM OverheadRecurringTemplates t
                 LEFT JOIN OverheadCostTypes c ON c.cost_type_id = t.cost_type_id
                 WHERE t.is_active = 1`;
    const binds = [];
    
    if (templateIds && templateIds.length > 0) {
      query += ` AND template_id IN (${templateIds.map(() => '?').join(',')})`;
      binds.push(...templateIds);
    }
    
    const tplRows = await env.DATABASE.prepare(query).bind(...binds).all();
    const templates = (tplRows?.results || []).filter(t => t.cost_type_id && t.cost_type_active === 1);
    
    let created = 0;
    let skipped = 0;
    let duplicates = 0;
    const records = [];
    
    for (const t of templates) {
      // 检查模板是否应该应用
      const shouldApply = shouldApplyTemplate(
        t.recurring_type,
        t.recurring_months,
        t.effective_from,
        t.effective_to,
        year,
        month
      );
      
      if (!shouldApply) {
        skipped++;
        continue;
      }
      
      try {
        // 检查是否已存在
        const exists = await env.DATABASE.prepare(
          `SELECT overhead_id, is_deleted FROM MonthlyOverheadCosts WHERE cost_type_id = ? AND year = ? AND month = ?`
        ).bind(t.cost_type_id, year, month).first();
        
        if (exists) {
          if (exists.is_deleted === 1) {
            // 恢复已删除的记录
            await env.DATABASE.prepare(
              `UPDATE MonthlyOverheadCosts SET amount = ?, notes = ?, is_deleted = 0, recorded_by = ?, recorded_at = datetime('now'), updated_at = datetime('now') WHERE overhead_id = ?`
            ).bind(Number(t.amount || 0), t.notes || '[auto]', user.user_id, exists.overhead_id).run();
            created++;
            records.push({
              overhead_id: exists.overhead_id,
              cost_type_id: t.cost_type_id,
              year,
              month,
              amount: Number(t.amount || 0)
            });
          } else {
            duplicates++;
          }
          continue;
        }
        
        // 插入新记录
        const result = await env.DATABASE.prepare(
          `INSERT INTO MonthlyOverheadCosts (cost_type_id, year, month, amount, notes, recorded_by)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(t.cost_type_id, year, month, Number(t.amount || 0), t.notes || '[auto]', user.user_id).run();
        
        created++;
        records.push({
          overhead_id: result.meta?.last_row_id,
          cost_type_id: t.cost_type_id,
          year,
          month,
          amount: Number(t.amount || 0)
        });
      } catch (err) {
        const errMsg = String(err);
        if (errMsg.includes('UNIQUE constraint failed') || errMsg.includes('SQLITE_CONSTRAINT')) {
          duplicates++;
        } else {
          console.error(`[Generate] Error generating cost for template ${t.template_id}:`, err);
          skipped++;
        }
      }
    }
    
    // 清除相关缓存
    if (created > 0) {
      await deleteKVCacheByPrefix(env, 'costs_').catch(() => {});
    }
    
    return successResponse({
      year,
      month,
      created,
      skipped,
      duplicates,
      records
    }, "已生成", requestId);
  } catch (err) {
    console.error(`[Overhead Generate] Error generating costs for ${year}-${month}:`, err);
    return errorResponse(500, "INTERNAL_ERROR", "伺服器錯誤", null, requestId);
  }
}


