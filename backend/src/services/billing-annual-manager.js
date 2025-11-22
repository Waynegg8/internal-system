/**
 * BillingAnnualManager - 年度收費計劃自動化管理服務
 * 提供年度切換時的自動收費計劃建立和複製功能
 * 
 * 設計原則：
 * 1. 只複製定期服務收費計劃，不複製一次性服務
 * 2. 保留所有原始計劃資料（月份、金額、關聯服務）
 * 3. 處理年度過渡的邊緣情況
 * 4. 確保資料一致性和完整性
 */

import { BillingPlanModel } from '../models/BillingPlanModel.js';

/**
 * 檢查並建立年度收費計劃
 * 如果該年度還沒有定期服務收費計劃，自動從上一年度複製
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} targetYear - 目標年度
 * @param {Object} [options] - 選項
 * @param {boolean} [options.force] - 是否強制重新建立（即使已存在）
 * @returns {Promise<Object>} 操作結果
 *   - created: 是否建立了新計劃
 *   - billingPlan: 收費計劃資料（如果已存在或新建立）
 *   - copiedFrom: 複製來源年度（如果從上一年度複製）
 */
export async function checkAndCreateAnnualBillingPlans(env, clientId, targetYear, options = {}) {
  const { force = false } = options;

  // 驗證年度參數
  if (!Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 2100) {
    throw new Error(`Invalid targetYear: ${targetYear}. Year must be between 2000 and 2100.`);
  }

  if (!clientId) {
    throw new Error('clientId is required');
  }

  const model = new BillingPlanModel(env);

  // 檢查目標年度是否已有定期服務收費計劃
  const existingPlan = await model.findByClientAndYear(clientId, targetYear, 'recurring');

  if (existingPlan && !force) {
    return {
      created: false,
      billingPlan: existingPlan,
      copiedFrom: null
    };
  }

  // 如果強制重新建立，先刪除現有計劃
  if (existingPlan && force) {
    await model.delete(existingPlan.billingPlanId);
  }

  // 查詢上一年度的定期服務收費計劃
  const previousYear = targetYear - 1;
  const previousPlan = await model.findByClientAndYear(clientId, previousYear, 'recurring');

  if (!previousPlan) {
    // 如果上一年度沒有定期服務收費計劃，返回空結果
    return {
      created: false,
      billingPlan: null,
      copiedFrom: null,
      message: `No recurring billing plan found for previous year ${previousYear}`
    };
  }

  // 複製上一年度的定期服務收費計劃
  const copiedPlan = await copyPreviousYearRecurringPlans(
    env,
    clientId,
    previousYear,
    targetYear
  );

  return {
    created: true,
    billingPlan: copiedPlan,
    copiedFrom: previousYear
  };
}

/**
 * 複製上一年度的定期服務收費計劃到新年度
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} sourceYear - 來源年度
 * @param {number} targetYear - 目標年度
 * @returns {Promise<Object>} 新建立的收費計劃資料
 */
export async function copyPreviousYearRecurringPlans(env, clientId, sourceYear, targetYear) {
  // 驗證年度參數
  if (!Number.isInteger(sourceYear) || sourceYear < 2000 || sourceYear > 2100) {
    throw new Error(`Invalid sourceYear: ${sourceYear}. Year must be between 2000 and 2100.`);
  }
  if (!Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 2100) {
    throw new Error(`Invalid targetYear: ${targetYear}. Year must be between 2000 and 2100.`);
  }
  if (sourceYear >= targetYear) {
    throw new Error(`sourceYear (${sourceYear}) must be less than targetYear (${targetYear})`);
  }

  if (!clientId) {
    throw new Error('clientId is required');
  }

  const model = new BillingPlanModel(env);

  // 查詢來源年度的定期服務收費計劃
  const sourcePlan = await model.findByClientAndYear(clientId, sourceYear, 'recurring');

  if (!sourcePlan) {
    throw new Error(`No recurring billing plan found for client ${clientId} in year ${sourceYear}`);
  }

  // 檢查目標年度是否已有定期服務收費計劃
  const existingPlan = await model.findByClientAndYear(clientId, targetYear, 'recurring');
  if (existingPlan) {
    throw new Error(
      `Recurring billing plan already exists for client ${clientId} in year ${targetYear}. ` +
      `Use update or delete first.`
    );
  }

  // 驗證來源計劃關聯的服務是否仍然存在且為定期服務
  const validServiceIds = [];
  const invalidServiceIds = [];

  for (const service of sourcePlan.services) {
    // 檢查服務是否存在且為定期服務
    const serviceCheck = await env.DATABASE.prepare(
      `SELECT client_service_id, service_type, is_deleted
       FROM ClientServices
       WHERE client_service_id = ?`
    ).bind(service.clientServiceId).first();

    if (!serviceCheck || serviceCheck.is_deleted) {
      invalidServiceIds.push({
        clientServiceId: service.clientServiceId,
        reason: 'Service not found or deleted'
      });
      continue;
    }

    if (serviceCheck.service_type !== 'recurring') {
      invalidServiceIds.push({
        clientServiceId: service.clientServiceId,
        reason: `Service type changed from recurring to ${serviceCheck.service_type}`
      });
      continue;
    }

    validServiceIds.push(service.clientServiceId);
  }

  // 如果所有服務都無效，拋出錯誤
  if (validServiceIds.length === 0) {
    throw new Error(
      `Cannot copy billing plan: all associated services are invalid or no longer recurring. ` +
      `Invalid services: ${invalidServiceIds.map(s => `${s.clientServiceId} (${s.reason})`).join(', ')}`
    );
  }

  // 如果有部分服務無效，記錄警告但繼續複製有效服務
  if (invalidServiceIds.length > 0) {
    console.warn(
      `[BillingAnnualManager] Some services are invalid when copying from ${sourceYear} to ${targetYear}:`,
      invalidServiceIds
    );
  }

  // 準備複製資料
  const copyData = {
    clientId,
    billingYear: targetYear,
    billingType: 'recurring',
    paymentDueDays: sourcePlan.paymentDueDays,
    notes: sourcePlan.notes || null,
    months: sourcePlan.months.map(m => ({
      month: m.month,
      amount: m.amount,
      paymentDueDays: m.paymentDueDays
    })),
    clientServiceIds: validServiceIds
  };

  // 建立新的收費計劃
  const newPlan = await model.create(copyData);

  return newPlan;
}

/**
 * 批量檢查並建立多個客戶的年度收費計劃
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Array<string>} clientIds - 客戶 ID 陣列
 * @param {number} targetYear - 目標年度
 * @param {Object} [options] - 選項
 * @param {boolean} [options.force] - 是否強制重新建立
 * @returns {Promise<Object>} 批量操作結果
 *   - total: 總客戶數
 *   - created: 成功建立的數量
 *   - skipped: 跳過的數量（已存在）
 *   - failed: 失敗的數量
 *   - results: 詳細結果陣列
 */
export async function checkAndCreateAnnualBillingPlansBatch(
  env,
  clientIds,
  targetYear,
  options = {}
) {
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return {
      total: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      results: []
    };
  }

  const results = await Promise.all(
    clientIds.map(async (clientId) => {
      try {
        const result = await checkAndCreateAnnualBillingPlans(env, clientId, targetYear, options);
        return {
          clientId,
          success: true,
          created: result.created,
          billingPlanId: result.billingPlan?.billingPlanId || null,
          copiedFrom: result.copiedFrom,
          error: null
        };
      } catch (error) {
        console.error(`[BillingAnnualManager] Failed to create plan for client ${clientId}:`, error);
        return {
          clientId,
          success: false,
          created: false,
          billingPlanId: null,
          copiedFrom: null,
          error: error.message
        };
      }
    })
  );

  const created = results.filter(r => r.success && r.created).length;
  const skipped = results.filter(r => r.success && !r.created).length;
  const failed = results.filter(r => !r.success).length;

  return {
    total: clientIds.length,
    created,
    skipped,
    failed,
    results
  };
}

/**
 * 驗證年度過渡資料一致性
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} sourceYear - 來源年度
 * @param {number} targetYear - 目標年度
 * @returns {Promise<Object>} 驗證結果
 *   - isValid: 是否有效
 *   - warnings: 警告訊息陣列
 *   - errors: 錯誤訊息陣列
 */
export async function validateYearTransition(env, clientId, sourceYear, targetYear) {
  const warnings = [];
  const errors = [];

  // 驗證年度參數
  if (!Number.isInteger(sourceYear) || sourceYear < 2000 || sourceYear > 2100) {
    errors.push(`Invalid sourceYear: ${sourceYear}`);
  }
  if (!Number.isInteger(targetYear) || targetYear < 2000 || targetYear > 2100) {
    errors.push(`Invalid targetYear: ${targetYear}`);
  }
  if (sourceYear >= targetYear) {
    errors.push(`sourceYear (${sourceYear}) must be less than targetYear (${targetYear})`);
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      warnings,
      errors
    };
  }

  const model = new BillingPlanModel(env);

  // 檢查來源年度是否有定期服務收費計劃
  const sourcePlan = await model.findByClientAndYear(clientId, sourceYear, 'recurring');
  if (!sourcePlan) {
    warnings.push(`No recurring billing plan found for source year ${sourceYear}`);
    return {
      isValid: true,
      warnings,
      errors
    };
  }

  // 檢查目標年度是否已有定期服務收費計劃
  const targetPlan = await model.findByClientAndYear(clientId, targetYear, 'recurring');
  if (targetPlan) {
    warnings.push(`Recurring billing plan already exists for target year ${targetYear}`);
  }

  // 驗證來源計劃關聯的服務
  for (const service of sourcePlan.services) {
    const serviceCheck = await env.DATABASE.prepare(
      `SELECT client_service_id, service_type, is_deleted
       FROM ClientServices
       WHERE client_service_id = ?`
    ).bind(service.clientServiceId).first();

    if (!serviceCheck) {
      errors.push(`Service ${service.clientServiceId} not found`);
    } else if (serviceCheck.is_deleted) {
      warnings.push(`Service ${service.clientServiceId} is deleted`);
    } else if (serviceCheck.service_type !== 'recurring') {
      warnings.push(
        `Service ${service.clientServiceId} type changed from recurring to ${serviceCheck.service_type}`
      );
    }
  }

  // 檢查是否有月份明細
  if (sourcePlan.months.length === 0) {
    warnings.push(`Source plan has no month details`);
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * 獲取客戶的年度收費計劃狀態
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @returns {Promise<Object>} 年度狀態
 *   - year: 年度
 *   - hasRecurringPlan: 是否有定期服務收費計劃
 *   - hasOneTimePlans: 是否有一次服務收費計劃
 *   - recurringPlan: 定期服務收費計劃資料（如果存在）
 *   - oneTimePlans: 一次性服務收費計劃陣列
 *   - canAutoCreate: 是否可以自動建立（上一年度有定期服務計劃且本年度沒有）
 */
export async function getAnnualBillingStatus(env, clientId, year) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and 2100.`);
  }

  if (!clientId) {
    throw new Error('clientId is required');
  }

  const model = new BillingPlanModel(env);

  // 查詢本年度所有收費計劃
  const allPlans = await model.findByClientAndYearAll(clientId, year);

  const recurringPlan = allPlans.find(p => p.billingType === 'recurring') || null;
  const oneTimePlans = allPlans.filter(p => p.billingType === 'one-time');

  // 檢查是否可以自動建立
  let canAutoCreate = false;
  if (!recurringPlan) {
    const previousYear = year - 1;
    const previousPlan = await model.findByClientAndYear(clientId, previousYear, 'recurring');
    canAutoCreate = previousPlan !== null;
  }

  return {
    year,
    hasRecurringPlan: recurringPlan !== null,
    hasOneTimePlans: oneTimePlans.length > 0,
    recurringPlan,
    oneTimePlans,
    canAutoCreate
  };
}



