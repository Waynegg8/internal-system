import { calculateWeightedHours } from "./work-types.js";
import { 
  calculateMonthlyAccruedRevenue,
  calculateRecurringServiceRevenue,
  calculateOneTimeServiceRevenue,
  calculateAnnualAccruedRevenueByClient
} from "../../utils/billing-calculator.js";

/**
 * 取得某月份各客戶的應計收入總額（使用 BR1.3.3 規則）
 * 
 * 此函數已重構為使用 BR1.3.3 應計收入計算邏輯，取代原有的收據查詢方式。
 * 保持向後兼容性：函數簽名和返回格式不變。
 * 
 * @param {string} targetMonth - 目標月份，格式：YYYY-MM (例如：'2024-03')
 * @param {Object} env - Cloudflare Workers 環境變數
 * @returns {Promise<Object>} 客戶應計收入映射物件
 *   - key: 客戶 ID (clientId)
 *   - value: 該客戶該月的應計收入總額（數字）
 * 
 * @example
 * // 計算 2024 年 3 月所有客戶的應計收入
 * const revenues = await getMonthlyRevenueByClient('2024-03', env);
 * // 結果: { 'CLIENT001': 70000, 'CLIENT002': 50000, ... }
 */
export async function getMonthlyRevenueByClient(targetMonth, env) {
  // 驗證 targetMonth 格式 (YYYY-MM)
  if (!targetMonth || typeof targetMonth !== 'string') {
    throw new Error(`Invalid targetMonth: ${targetMonth}. Must be a string in YYYY-MM format.`);
  }

  // 解析年份和月份
  const parts = targetMonth.split('-');
  if (parts.length !== 2) {
    throw new Error(`Invalid targetMonth format: ${targetMonth}. Expected YYYY-MM format.`);
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  // 驗證年份和月份
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year in targetMonth: ${year}. Year must be between 2000 and 2100.`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month in targetMonth: ${month}. Month must be between 1 and 12.`);
  }

  // 使用 BR1.3.3 邏輯計算應計收入
  const detailedRevenueMap = await calculateAccruedRevenueByClient(env, year, month);

  // 轉換為向後兼容的格式：{ [clientId]: number }
  const result = {};
  for (const [clientId, revenueData] of Object.entries(detailedRevenueMap)) {
    if (clientId && revenueData) {
      // 提取 totalMonthlyRevenue，如果不存在則使用 0
      result[clientId] = Number(revenueData.totalMonthlyRevenue || 0);
    }
  }

  return result;
}

/**
 * 取得某年度各客戶的應計收入總額（使用 BR1.3.3 規則）
 * 
 * 此函數已重構為使用 BR1.3.3 應計收入計算邏輯，取代原有的收據查詢方式。
 * 保持向後兼容性：函數簽名和返回格式不變。
 * 
 * @param {number|string} year - 年度 (例如：2024)
 * @param {Object} env - Cloudflare Workers 環境變數
 * @returns {Promise<Object>} 客戶應計收入映射物件
 *   - key: 客戶 ID (clientId)
 *   - value: 該客戶該年度的應計收入總額（數字）
 * 
 * @example
 * // 計算 2024 年所有客戶的應計收入
 * const revenues = await getAnnualRevenueByClient(2024, env);
 * // 結果: { 'CLIENT001': 840000, 'CLIENT002': 600000, ... }
 */
export async function getAnnualRevenueByClient(year, env) {
  // 驗證年度參數
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
  if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and 2100.`);
  }

  // 使用 BR1.3.3 邏輯計算年度應計收入
  const annualRevenueMap = await calculateAnnualAccruedRevenueByClient(env, yearNum);

  // 轉換為向後兼容的格式：{ [clientId]: number }
  // calculateAnnualAccruedRevenueByClient 已經返回正確格式，直接返回即可
  return annualRevenueMap;
}

/**
 * 按服務類型分攤客戶收入（使用 BR1.3.3 規則）
 * 
 * 此函數已重構為使用 BR1.3.3 應計收入計算邏輯：
 * - 定期服務：按 execution_months 執行次數比例分攤收費計劃總金額
 * - 一次性服務：直接使用收費計劃實際金額
 * 
 * @param {string} clientId - 客戶 ID
 * @param {string} targetMonth - 目標月份，格式：YYYY-MM (例如：'2024-03')
 * @param {number} totalRevenue - 客戶該月總收入（用於計算百分比，實際收入從收費計劃計算）
 * @param {Object} env - Cloudflare Workers 環境變數
 * @returns {Promise<Array>} 服務類型收入分攤明細陣列
 *   - serviceId: 服務 ID
 *   - serviceName: 服務名稱
 *   - hours: 工時（保留欄位，設為 0，因為不再使用工時計算）
 *   - weightedHours: 加權工時（保留欄位，設為 0，因為不再使用工時計算）
 *   - revenue: 該服務該月應計收入
 *   - revenuePercentage: 該服務收入佔總收入的百分比
 */
export async function allocateRevenueByServiceType(clientId, targetMonth, totalRevenue, env) {
  // 驗證 targetMonth 格式 (YYYY-MM)
  if (!targetMonth || typeof targetMonth !== 'string') {
    throw new Error(`Invalid targetMonth: ${targetMonth}. Must be a string in YYYY-MM format.`);
  }

  // 解析年份和月份
  const parts = targetMonth.split('-');
  if (parts.length !== 2) {
    throw new Error(`Invalid targetMonth format: ${targetMonth}. Expected YYYY-MM format.`);
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  // 驗證年份和月份
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year in targetMonth: ${year}. Year must be between 2000 and 2100.`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month in targetMonth: ${month}. Month must be between 1 and 12.`);
  }

  // 使用 BR1.3.3 邏輯計算年度應計收入
  const [recurringResult, oneTimeResult] = await Promise.all([
    calculateRecurringServiceRevenue(env, clientId, year),
    calculateOneTimeServiceRevenue(env, clientId, year)
  ]);

  const serviceDetails = [];
  const serviceMap = new Map();

  // 處理定期服務：按執行次數比例分攤
  for (const service of recurringResult.services || []) {
    // 檢查該月是否有執行
    if (service.executionMonths && service.executionMonths.includes(month)) {
      const serviceId = service.serviceId || 0;
      const serviceName = service.serviceName || '未命名服務';
      const monthlyRevenue = service.monthlyRevenue || 0;

      // 如果該服務已存在（可能有多個收費計劃），累加收入
      if (serviceMap.has(serviceId)) {
        const existing = serviceMap.get(serviceId);
        existing.revenue += monthlyRevenue;
      } else {
        serviceMap.set(serviceId, {
          serviceId,
          serviceName,
          hours: 0, // 不再使用工時計算
          weightedHours: 0, // 不再使用工時計算
          revenue: monthlyRevenue
        });
      }
    }
  }

  // 處理一次性服務：直接使用收費計劃實際金額
  for (const service of oneTimeResult.services || []) {
    // 檢查該月是否有收費
    if (service.monthlyRevenue && service.monthlyRevenue[month]) {
      const serviceId = service.serviceId || 0;
      const serviceName = service.serviceName || '未命名服務';
      const monthlyRevenue = service.monthlyRevenue[month] || 0;

      // 如果該服務已存在（可能有多個收費計劃），累加收入
      if (serviceMap.has(serviceId)) {
        const existing = serviceMap.get(serviceId);
        existing.revenue += monthlyRevenue;
      } else {
        serviceMap.set(serviceId, {
          serviceId,
          serviceName,
          hours: 0, // 不再使用工時計算
          weightedHours: 0, // 不再使用工時計算
          revenue: monthlyRevenue
        });
      }
    }
  }

  // 如果沒有服務或總收入為 0，返回空陣列
  if (serviceMap.size === 0 || totalRevenue === 0) {
    return [];
  }

  // 計算每個服務的收入百分比並構建結果陣列
  for (const [serviceId, service] of serviceMap) {
    const revenuePercentage = totalRevenue > 0
      ? (service.revenue / totalRevenue) * 100
      : 0;

    serviceDetails.push({
      serviceId,
      serviceName: service.serviceName,
      hours: 0, // 保留欄位，設為 0
      weightedHours: 0, // 保留欄位，設為 0
      revenue: Number(service.revenue.toFixed(2)),
      revenuePercentage: Number(revenuePercentage.toFixed(1))
    });
  }

  // 按收入降序排序
  serviceDetails.sort((a, b) => b.revenue - a.revenue);
  return serviceDetails;
}

/**
 * 計算指定月份所有客戶的應計收入（使用 BR1.3.3 規則）
 * 
 * 遵循 BR1.3.3 收入分攤規則：
 * - 定期服務：按執行次數比例分攤收費計劃總金額
 * - 一次性服務：直接使用收費計劃實際金額
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {number} year - 年度 (2000-2100)
 * @param {number} month - 月份 (1-12)
 * @returns {Promise<Object>} 客戶應計收入映射物件
 *   - key: 客戶 ID (clientId)
 *   - value: 該客戶該月的應計收入物件
 *     - clientId: 客戶 ID
 *     - year: 年度
 *     - month: 月份
 *     - recurringRevenue: 定期服務該月應計收入
 *     - oneTimeRevenue: 一次性服務該月應計收入
 *     - totalMonthlyRevenue: 該月總應計收入
 * 
 * @example
 * // 計算 2024 年 3 月所有客戶的應計收入
 * const revenues = await calculateAccruedRevenueByClient(env, 2024, 3);
 * // 結果: { 'CLIENT001': { clientId: 'CLIENT001', year: 2024, month: 3, ... }, ... }
 */
export async function calculateAccruedRevenueByClient(env, year, month) {
  // 驗證年度參數
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and 2100.`);
  }

  // 驗證月份參數
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
  }

  // 1. 查詢該年度有收費計劃的所有客戶
  // 查詢定期服務收費計劃的客戶（定期服務在該月份可能有執行）
  const recurringClientsRows = await env.DATABASE.prepare(
    `SELECT DISTINCT bp.client_id
     FROM BillingPlans bp
     INNER JOIN BillingPlanServices bps ON bp.billing_plan_id = bps.billing_plan_id
     INNER JOIN ClientServices cs ON bps.client_service_id = cs.client_service_id
     WHERE bp.billing_year = ?
       AND bp.billing_type = 'recurring'
       AND cs.is_deleted = 0
       AND cs.execution_months IS NOT NULL
       AND cs.execution_months != '[]'
       AND cs.execution_months != ''`
  ).bind(year).all();

  // 查詢一次性服務收費計劃的客戶（該月份有收費）
  const oneTimeClientsRows = await env.DATABASE.prepare(
    `SELECT DISTINCT bp.client_id
     FROM BillingPlans bp
     INNER JOIN BillingPlanMonths bpm ON bp.billing_plan_id = bpm.billing_plan_id
     WHERE bp.billing_year = ?
       AND bp.billing_type = 'one-time'
       AND bpm.billing_month = ?
       AND bpm.billing_amount > 0`
  ).bind(year, month).all();

  // 合併所有客戶 ID（去重）
  const clientIdSet = new Set();
  for (const row of recurringClientsRows?.results || []) {
    if (row.client_id) {
      clientIdSet.add(row.client_id);
    }
  }
  for (const row of oneTimeClientsRows?.results || []) {
    if (row.client_id) {
      clientIdSet.add(row.client_id);
    }
  }

  const clientIds = Array.from(clientIdSet);

  if (clientIds.length === 0) {
    return {};
  }

  // 2. 並行計算每個客戶的月度應計收入
  const revenuePromises = clientIds.map(async (clientId) => {
    try {
      const monthlyRevenue = await calculateMonthlyAccruedRevenue(env, clientId, year, month);
      return { clientId, monthlyRevenue };
    } catch (error) {
      // 處理邊緣情況：客戶資料缺失、收費計劃異常等
      console.error(`Error calculating monthly revenue for client ${clientId} (${year}-${month}):`, error);
      
      // 返回零收入結果，確保函數不會因為單個客戶的錯誤而失敗
      return {
        clientId,
        monthlyRevenue: {
          clientId,
          year,
          month,
          recurringRevenue: 0,
          oneTimeRevenue: 0,
          totalMonthlyRevenue: 0,
          error: error.message
        }
      };
    }
  });

  const results = await Promise.all(revenuePromises);

  // 3. 構建結果映射物件
  const revenueMap = {};
  for (const { clientId, monthlyRevenue } of results) {
    if (clientId && monthlyRevenue) {
      revenueMap[clientId] = {
        clientId: monthlyRevenue.clientId || clientId,
        year: monthlyRevenue.year || year,
        month: monthlyRevenue.month || month,
        recurringRevenue: monthlyRevenue.recurringRevenue || 0,
        oneTimeRevenue: monthlyRevenue.oneTimeRevenue || 0,
        totalMonthlyRevenue: monthlyRevenue.totalMonthlyRevenue || 0
      };

      // 如果有錯誤，添加錯誤訊息（用於調試）
      if (monthlyRevenue.error) {
        revenueMap[clientId].error = monthlyRevenue.error;
      }
    }
  }

  return revenueMap;
}

