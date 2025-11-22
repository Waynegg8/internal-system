/**
 * 客戶收費計劃管理 API
 * 提供完整的收費計劃 CRUD 操作和年度管理功能
 */

import { successResponse, errorResponse } from "../../utils/response.js";
import { BillingPlanModel } from "../../models/BillingPlanModel.js";
import { 
  checkAndCreateAnnualBillingPlans,
  getAnnualBillingStatus 
} from "../../services/billing-annual-manager.js";
import { 
  getBillingPlansWithCache,
  getAccruedRevenueWithCache,
  invalidateBillingPlanCache,
  invalidateBillingCacheForYear
} from "../../middleware/billing-cache.js";
import { 
  calculateAccruedRevenue,
  calculateMonthlyAccruedRevenue,
  validateRevenueCalculation
} from "../../utils/billing-calculator.js";

/**
 * 獲取客戶收費計劃列表
 * GET /api/v2/clients/:id/billing/plans?year=YYYY&billing_type=recurring|one-time
 */
export async function handleBillingPlans(request, env, ctx, requestId, match, url) {
  try {
    const clientId = match?.[1];
    if (!clientId) {
      return errorResponse(400, "BAD_REQUEST", "客戶 ID 不能為空", null, requestId);
    }

    // 驗證客戶存在
    const client = await env.DATABASE.prepare(
      `SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
    ).bind(clientId).first();

    if (!client) {
      return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
    }

    const params = url.searchParams;
    const year = params.get("year") ? parseInt(params.get("year"), 10) : new Date().getFullYear();
    const billingType = params.get("billing_type"); // 'recurring' | 'one-time' | null (全部)

    // 驗證年度
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return errorResponse(400, "BAD_REQUEST", "年度必須在 2000-2100 之間", null, requestId);
    }

    // 驗證收費類型
    if (billingType && !['recurring', 'one-time'].includes(billingType)) {
      return errorResponse(400, "BAD_REQUEST", "billing_type 必須是 'recurring' 或 'one-time'", null, requestId);
    }

    const model = new BillingPlanModel(env);
    const noCache = params.get("no_cache") === "1" || request.headers.get('x-no-cache') === '1';
    const forceNoCacheEnv = env.APP_ENV && env.APP_ENV !== 'prod';

    // 如果查詢定期服務且不存在，嘗試自動建立
    if (billingType === 'recurring' || !billingType) {
      try {
        await checkAndCreateAnnualBillingPlans(env, clientId, year, { force: false });
      } catch (error) {
        // 自動建立失敗不影響查詢，只記錄警告
        console.warn(`[BillingPlans] Auto-create failed for client ${clientId}, year ${year}:`, error.message);
      }
    }

    // 使用快取查詢收費計劃
    const cacheResult = await getBillingPlansWithCache(
      env,
      clientId,
      year,
      billingType || null,
      async () => {
        return await model.findByClientAndYearAll(clientId, year, billingType || null);
      },
      { noCache: noCache || forceNoCacheEnv }
    );

    const plans = cacheResult.data;

    // 格式化返回資料
    const data = plans.map(plan => ({
      billingPlanId: plan.billingPlanId,
      clientId: plan.clientId,
      billingYear: plan.billingYear,
      billingType: plan.billingType,
      yearTotal: plan.yearTotal,
      paymentDueDays: plan.paymentDueDays,
      billingDate: plan.billingDate,
      description: plan.description,
      notes: plan.notes,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      months: plan.months.map(m => ({
        billingPlanMonthId: m.billingPlanMonthId,
        month: m.month,
        amount: m.amount,
        paymentDueDays: m.paymentDueDays
      })),
      services: plan.services.map(s => ({
        billingPlanServiceId: s.billingPlanServiceId,
        clientServiceId: s.clientServiceId,
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        serviceType: s.serviceType
      }))
    }));

    // 獲取年度狀態（用於前端判斷是否可以自動建立）
    const status = await getAnnualBillingStatus(env, clientId, year);

    return successResponse(
      {
        plans: data,
        status: {
          hasRecurringPlan: status.hasRecurringPlan,
          hasOneTimePlans: status.hasOneTimePlans,
          canAutoCreate: status.canAutoCreate
        }
      },
      `查詢成功${cacheResult.meta.cached ? '（快取）' : ''}`,
      requestId,
      {
        ...cacheResult.meta,
        cache_source: cacheResult.source || 'fresh'
      }
    );
  } catch (error) {
    console.error("[BillingPlans] Error:", error);
    
    // 檢查是否為表不存在的錯誤
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('no such table') && errorMessage.includes('BillingPlans')) {
      return errorResponse(
        503, 
        "SERVICE_UNAVAILABLE", 
        "收費計劃功能尚未初始化，請聯繫管理員執行資料庫遷移", 
        { 
          detail: "BillingPlans 表不存在，需要執行 migration 0044_billing_plans_tables.sql",
          migration: "0044_billing_plans_tables.sql"
        }, 
        requestId
      );
    }
    
    return errorResponse(500, "INTERNAL_ERROR", `查詢失敗: ${error.message}`, null, requestId);
  }
}

/**
 * 建立收費計劃
 * POST /api/v2/clients/:id/billing/plans
 */
export async function handleCreateBillingPlan(request, env, ctx, requestId, match, url) {
  try {
    const clientId = match?.[1];
    if (!clientId) {
      return errorResponse(400, "BAD_REQUEST", "客戶 ID 不能為空", null, requestId);
    }

    // 驗證客戶存在
    const client = await env.DATABASE.prepare(
      `SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
    ).bind(clientId).first();

    if (!client) {
      return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
    }

    const body = await request.json();
    const {
      billingYear,
      billingType,
      paymentDueDays,
      billingDate,
      description,
      notes,
      months,
      clientServiceIds
    } = body;

    // 驗證必填欄位
    const errors = [];
    if (!billingYear) errors.push({ field: "billingYear", message: "年度不能為空" });
    if (!billingType) errors.push({ field: "billingType", message: "收費類型不能為空" });
    if (!['recurring', 'one-time'].includes(billingType)) {
      errors.push({ field: "billingType", message: "收費類型必須是 'recurring' 或 'one-time'" });
    }

    // 驗證一次性服務必填欄位
    if (billingType === 'one-time') {
      if (!billingDate) errors.push({ field: "billingDate", message: "一次性服務必須提供收費日期" });
      if (!description) errors.push({ field: "description", message: "一次性服務必須提供收費項目名稱" });
    }

    // 驗證定期服務必填欄位
    if (billingType === 'recurring') {
      if (!Array.isArray(months) || months.length === 0) {
        errors.push({ field: "months", message: "定期服務必須提供至少一個月份的明細" });
      }
      if (!Array.isArray(clientServiceIds) || clientServiceIds.length === 0) {
        errors.push({ field: "clientServiceIds", message: "定期服務必須關聯至少一個服務" });
      }
    }

    // 驗證一次性服務必填欄位
    if (billingType === 'one-time') {
      if (!Array.isArray(clientServiceIds) || clientServiceIds.length !== 1) {
        errors.push({ field: "clientServiceIds", message: "一次性服務必須關聯一個服務" });
      }
    }

    if (errors.length > 0) {
      return errorResponse(422, "VALIDATION_ERROR", "輸入驗證失敗", errors, requestId);
    }

    const model = new BillingPlanModel(env);

    try {
      const plan = await model.create({
        clientId,
        billingYear,
        billingType,
        paymentDueDays: paymentDueDays || 30,
        billingDate: billingDate || null,
        description: description || null,
        notes: notes || null,
        months: months || [],
        clientServiceIds: clientServiceIds || []
      });

      // 清除相關快取
      await invalidateBillingPlanCache(env, clientId, billingYear, billingType);

      return successResponse(plan, "收費計劃建立成功", requestId);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return errorResponse(409, "CONFLICT", error.message, null, requestId);
      }
      if (error.message.includes('not found') || error.message.includes('deleted')) {
        return errorResponse(404, "NOT_FOUND", error.message, null, requestId);
      }
      if (error.message.includes('mismatch') || error.message.includes('required')) {
        return errorResponse(422, "VALIDATION_ERROR", error.message, null, requestId);
      }
      throw error;
    }
  } catch (error) {
    console.error("[CreateBillingPlan] Error:", error);
    
    // 檢查是否為表不存在的錯誤
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('no such table') && errorMessage.includes('BillingPlans')) {
      return errorResponse(
        503, 
        "SERVICE_UNAVAILABLE", 
        "收費計劃功能尚未初始化，請聯繫管理員執行資料庫遷移", 
        { 
          detail: "BillingPlans 表不存在，需要執行 migration 0044_billing_plans_tables.sql",
          migration: "0044_billing_plans_tables.sql"
        }, 
        requestId
      );
    }
    
    return errorResponse(500, "INTERNAL_ERROR", `建立失敗: ${error.message}`, null, requestId);
  }
}

/**
 * 更新收費計劃
 * PUT /api/v2/clients/:id/billing/plans/:planId
 */
export async function handleUpdateBillingPlan(request, env, ctx, requestId, match, url) {
  try {
    const clientId = match?.[1];
    const planId = match?.[2] ? parseInt(match[2], 10) : null;

    if (!clientId) {
      return errorResponse(400, "BAD_REQUEST", "客戶 ID 不能為空", null, requestId);
    }
    if (!planId || !Number.isInteger(planId)) {
      return errorResponse(400, "BAD_REQUEST", "收費計劃 ID 不能為空", null, requestId);
    }

    // 驗證客戶存在
    const client = await env.DATABASE.prepare(
      `SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
    ).bind(clientId).first();

    if (!client) {
      return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
    }

    const body = await request.json();
    const {
      paymentDueDays,
      billingDate,
      description,
      notes,
      months,
      clientServiceIds
    } = body;

    const model = new BillingPlanModel(env);

    // 驗證收費計劃存在且屬於該客戶
    const existing = await model.findById(planId);
    if (!existing) {
      return errorResponse(404, "NOT_FOUND", "收費計劃不存在", null, requestId);
    }
    if (existing.clientId !== clientId) {
      return errorResponse(403, "FORBIDDEN", "收費計劃不屬於該客戶", null, requestId);
    }

    try {
      const plan = await model.update(planId, {
        paymentDueDays,
        billingDate,
        description,
        notes,
        months,
        clientServiceIds
      });

      // 清除相關快取
      await invalidateBillingPlanCache(env, clientId, existing.billingYear, existing.billingType);

      return successResponse(plan, "收費計劃更新成功", requestId);
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('deleted')) {
        return errorResponse(404, "NOT_FOUND", error.message, null, requestId);
      }
      if (error.message.includes('mismatch') || error.message.includes('required')) {
        return errorResponse(422, "VALIDATION_ERROR", error.message, null, requestId);
      }
      throw error;
    }
  } catch (error) {
    console.error("[UpdateBillingPlan] Error:", error);
    
    // 檢查是否為表不存在的錯誤
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('no such table') && errorMessage.includes('BillingPlans')) {
      return errorResponse(
        503, 
        "SERVICE_UNAVAILABLE", 
        "收費計劃功能尚未初始化，請聯繫管理員執行資料庫遷移", 
        { 
          detail: "BillingPlans 表不存在，需要執行 migration 0044_billing_plans_tables.sql",
          migration: "0044_billing_plans_tables.sql"
        }, 
        requestId
      );
    }
    
    return errorResponse(500, "INTERNAL_ERROR", `更新失敗: ${error.message}`, null, requestId);
  }
}

/**
 * 刪除收費計劃
 * DELETE /api/v2/clients/:id/billing/plans/:planIds
 * 支援單個或批量刪除（planIds 可以是單個 ID 或逗號分隔的 ID 列表）
 */
export async function handleDeleteBillingPlan(request, env, ctx, requestId, match, url) {
  try {
    const clientId = match?.[1];
    const planIdsParam = match?.[2];

    if (!clientId) {
      return errorResponse(400, "BAD_REQUEST", "客戶 ID 不能為空", null, requestId);
    }
    if (!planIdsParam) {
      return errorResponse(400, "BAD_REQUEST", "收費計劃 ID 不能為空", null, requestId);
    }

    // 驗證客戶存在
    const client = await env.DATABASE.prepare(
      `SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
    ).bind(clientId).first();

    if (!client) {
      return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
    }

    // 解析計劃 ID（支援單個或批量）
    const planIds = planIdsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => Number.isInteger(id) && id > 0);

    if (planIds.length === 0) {
      return errorResponse(400, "BAD_REQUEST", "無效的收費計劃 ID", null, requestId);
    }

    const model = new BillingPlanModel(env);

    // 驗證所有計劃都存在且屬於該客戶
    for (const planId of planIds) {
      const existing = await model.findById(planId);
      if (!existing) {
        return errorResponse(404, "NOT_FOUND", `收費計劃 ${planId} 不存在`, null, requestId);
      }
      if (existing.clientId !== clientId) {
        return errorResponse(403, "FORBIDDEN", `收費計劃 ${planId} 不屬於該客戶`, null, requestId);
      }
    }

    // 批量刪除
    const result = await model.deleteBatch(planIds);

    // 清除相關快取（需要清除所有受影響年度的快取）
    const affectedYears = new Set();
    for (const planId of planIds) {
      const plan = await model.findById(planId);
      if (plan) {
        affectedYears.add(plan.billingYear);
      }
    }
    
    // 並行清除所有受影響年度的快取
    await Promise.all(
      Array.from(affectedYears).map(year => 
        invalidateBillingPlanCache(env, clientId, year, null)
      )
    );

    if (result.failed > 0) {
      return errorResponse(
        207,
        "PARTIAL_SUCCESS",
        `部分刪除成功：成功 ${result.deleted} 筆，失敗 ${result.failed} 筆`,
        { deleted: result.deleted, failed: result.failed, errors: result.errors },
        requestId
      );
    }

    return successResponse(
      { deleted: result.deleted, failed: result.failed },
      `成功刪除 ${result.deleted} 筆收費計劃`,
      requestId
    );
  } catch (error) {
    console.error("[DeleteBillingPlan] Error:", error);
    
    // 檢查是否為表不存在的錯誤
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('no such table') && errorMessage.includes('BillingPlans')) {
      return errorResponse(
        503, 
        "SERVICE_UNAVAILABLE", 
        "收費計劃功能尚未初始化，請聯繫管理員執行資料庫遷移", 
        { 
          detail: "BillingPlans 表不存在，需要執行 migration 0044_billing_plans_tables.sql",
          migration: "0044_billing_plans_tables.sql"
        }, 
        requestId
      );
    }
    
    return errorResponse(500, "INTERNAL_ERROR", `刪除失敗: ${error.message}`, null, requestId);
  }
}

/**
 * 獲取客戶應計收入
 * GET /api/v2/clients/:id/billing/revenue?year=YYYY&month=M&validate=false
 */
export async function handleAccruedRevenue(request, env, ctx, requestId, match, url) {
  try {
    const clientId = match?.[1];
    if (!clientId) {
      return errorResponse(400, "BAD_REQUEST", "客戶 ID 不能為空", null, requestId);
    }

    // 驗證客戶存在
    const client = await env.DATABASE.prepare(
      `SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
    ).bind(clientId).first();

    if (!client) {
      return errorResponse(404, "NOT_FOUND", "客戶不存在", null, requestId);
    }

    const params = url.searchParams;
    const year = params.get("year") ? parseInt(params.get("year"), 10) : new Date().getFullYear();
    const month = params.get("month") ? parseInt(params.get("month"), 10) : null;
    const validate = params.get("validate") === "true";
    const noCache = params.get("no_cache") === "1" || request.headers.get('x-no-cache') === '1';
    const forceNoCacheEnv = env.APP_ENV && env.APP_ENV !== 'prod';

    // 驗證年度
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return errorResponse(400, "BAD_REQUEST", "年度必須在 2000-2100 之間", null, requestId);
    }

    // 驗證月份（如果提供）
    if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) {
      return errorResponse(400, "BAD_REQUEST", "月份必須在 1-12 之間", null, requestId);
    }

    // 使用快取中介軟體
    const cacheResult = await getAccruedRevenueWithCache(
      env,
      clientId,
      year,
      month,
      async () => {
        // 計算應計收入
        const result = month !== null
          ? await calculateMonthlyAccruedRevenue(env, clientId, year, month)
          : await calculateAccruedRevenue(env, clientId, year);

        // 可選的驗證（僅年度查詢）
        let validation = null;
        if (validate && month === null) {
          validation = await validateRevenueCalculation(env, clientId, year);
        }

        return {
          ...result,
          validation
        };
      },
      {
        noCache: noCache || forceNoCacheEnv,
        ttl: 1800 // 30 分鐘快取
      }
    );

    return successResponse(
      cacheResult.data,
      `查詢成功${cacheResult.meta.cached ? '（快取）' : ''}`,
      requestId,
      {
        ...cacheResult.meta,
        cache_source: cacheResult.source || 'fresh'
      }
    );
  } catch (error) {
    console.error("[AccruedRevenue] Error:", error);
    
    // 檢查是否為表不存在的錯誤
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('no such table') && (errorMessage.includes('BillingPlans') || errorMessage.includes('BillingPlanMonths'))) {
      return errorResponse(
        503, 
        "SERVICE_UNAVAILABLE", 
        "收費計劃功能尚未初始化，請聯繫管理員執行資料庫遷移", 
        { 
          detail: "BillingPlans 相關表不存在，需要執行 migration 0044_billing_plans_tables.sql",
          migration: "0044_billing_plans_tables.sql"
        }, 
        requestId
      );
    }
    
    return errorResponse(500, "INTERNAL_ERROR", `查詢失敗: ${error.message}`, null, requestId);
  }
}

