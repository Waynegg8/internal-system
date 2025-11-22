/**
 * 收費資料快取中介軟體
 * 提供收費計劃和應計收入計算的快取策略
 * 
 * 設計原則：
 * 1. 確保快取一致性：資料變更時自動失效相關快取
 * 2. 處理並發更新：使用版本號和樂觀鎖機制
 * 3. 優化財務查詢模式：針對年度、月份、客戶等常見查詢模式優化
 * 4. 混合快取策略：KV 快取 + D1 快取
 */

import {
  generateCacheKey,
  getKVCache,
  saveKVCache,
  getD1Cache,
  saveD1Cache,
  deleteKVCacheByPrefix,
  invalidateD1CacheByType,
  getHybridCache
} from '../utils/cache.js';

/**
 * 快取鍵前綴常量
 */
const CACHE_PREFIXES = {
  BILLING_PLANS: 'client_billing_plans',
  ACCRUED_REVENUE: 'client_accrued_revenue',
  YEAR_TOTAL: 'client_billing_year_total'
};

/**
 * 生成收費計劃列表快取鍵
 * 
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {string} [billingType] - 收費類型（可選）
 * @returns {string} 快取鍵
 */
export function getBillingPlansCacheKey(clientId, year, billingType = null) {
  return generateCacheKey(CACHE_PREFIXES.BILLING_PLANS, {
    clientId,
    year,
    billingType: billingType || 'all',
    v: 'v1'
  });
}

/**
 * 生成應計收入快取鍵
 * 
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {number} [month] - 月份（可選）
 * @returns {string} 快取鍵
 */
export function getAccruedRevenueCacheKey(clientId, year, month = null) {
  return generateCacheKey(CACHE_PREFIXES.ACCRUED_REVENUE, {
    clientId,
    year,
    month: month || 'all',
    v: 'v1'
  });
}

/**
 * 生成年度總計快取鍵
 * 
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @returns {string} 快取鍵
 */
export function getYearTotalCacheKey(clientId, year) {
  return generateCacheKey(CACHE_PREFIXES.YEAR_TOTAL, {
    clientId,
    year,
    v: 'v1'
  });
}

/**
 * 獲取收費計劃列表（帶快取）
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {string} [billingType] - 收費類型（可選）
 * @param {Function} fetchData - 資料獲取函數
 * @param {Object} [options] - 選項
 * @returns {Promise<Object>} 快取結果
 */
export async function getBillingPlansWithCache(env, clientId, year, billingType, fetchData, options = {}) {
  const cacheKey = getBillingPlansCacheKey(clientId, year, billingType);
  const { noCache = false, ttl = 1800 } = options;

  if (noCache) {
    const data = await fetchData();
    return {
      data,
      meta: { cached: false, source: 'fresh' }
    };
  }

  return getHybridCache(env, cacheKey, fetchData, {
    cacheType: CACHE_PREFIXES.BILLING_PLANS,
    ttl,
    useD1Fallback: true
  });
}

/**
 * 獲取應計收入（帶快取）
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {number} [month] - 月份（可選）
 * @param {Function} fetchData - 資料獲取函數
 * @param {Object} [options] - 選項
 * @returns {Promise<Object>} 快取結果
 */
export async function getAccruedRevenueWithCache(env, clientId, year, month, fetchData, options = {}) {
  const cacheKey = getAccruedRevenueCacheKey(clientId, year, month);
  const { noCache = false, ttl = 1800 } = options;

  if (noCache) {
    const data = await fetchData();
    return {
      data,
      meta: { cached: false, source: 'fresh' }
    };
  }

  return getHybridCache(env, cacheKey, fetchData, {
    cacheType: CACHE_PREFIXES.ACCRUED_REVENUE,
    ttl,
    useD1Fallback: true
  });
}

/**
 * 獲取年度總計（帶快取）
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {Function} fetchData - 資料獲取函數
 * @param {Object} [options] - 選項
 * @returns {Promise<Object>} 快取結果
 */
export async function getYearTotalWithCache(env, clientId, year, fetchData, options = {}) {
  const cacheKey = getYearTotalCacheKey(clientId, year);
  const { noCache = false, ttl = 3600 } = options;

  if (noCache) {
    const data = await fetchData();
    return {
      data,
      meta: { cached: false, source: 'fresh' }
    };
  }

  return getHybridCache(env, cacheKey, fetchData, {
    cacheType: CACHE_PREFIXES.YEAR_TOTAL,
    ttl,
    useD1Fallback: true
  });
}

/**
 * 清除客戶的所有收費相關快取
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} [year] - 年度（可選，如果提供則只清除該年度的快取）
 * @returns {Promise<void>}
 */
export async function invalidateBillingCache(env, clientId, year = null) {
  try {
    const prefixes = [];
    
    if (year) {
      // 清除特定年度的快取
      prefixes.push(`${CACHE_PREFIXES.BILLING_PLANS}:clientId=${clientId}&year=${year}`);
      prefixes.push(`${CACHE_PREFIXES.ACCRUED_REVENUE}:clientId=${clientId}&year=${year}`);
      prefixes.push(`${CACHE_PREFIXES.YEAR_TOTAL}:clientId=${clientId}&year=${year}`);
    } else {
      // 清除所有年度的快取
      prefixes.push(`${CACHE_PREFIXES.BILLING_PLANS}:clientId=${clientId}`);
      prefixes.push(`${CACHE_PREFIXES.ACCRUED_REVENUE}:clientId=${clientId}`);
      prefixes.push(`${CACHE_PREFIXES.YEAR_TOTAL}:clientId=${clientId}`);
    }

    // 並行清除 KV 快取
    const kvPromises = prefixes.map(prefix => deleteKVCacheByPrefix(env, prefix));
    
    // 清除 D1 快取（按類型）
    const d1Promises = [
      invalidateD1CacheByType(env, CACHE_PREFIXES.BILLING_PLANS, {}),
      invalidateD1CacheByType(env, CACHE_PREFIXES.ACCRUED_REVENUE, {}),
      invalidateD1CacheByType(env, CACHE_PREFIXES.YEAR_TOTAL, {})
    ];

    await Promise.all([...kvPromises, ...d1Promises]);
  } catch (error) {
    console.error('[BillingCache] 清除快取失敗:', error);
    // 不拋出錯誤，避免影響主流程
  }
}

/**
 * 清除特定年度的收費快取
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @returns {Promise<void>}
 */
export async function invalidateBillingCacheForYear(env, clientId, year) {
  return invalidateBillingCache(env, clientId, year);
}

/**
 * 清除收費計劃相關快取（當計劃變更時）
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {string} [billingType] - 收費類型（可選）
 * @returns {Promise<void>}
 */
export async function invalidateBillingPlanCache(env, clientId, year, billingType = null) {
  try {
    // 清除收費計劃列表快取
    const plansCacheKey = getBillingPlansCacheKey(clientId, year, billingType);
    await Promise.all([
      deleteKVCacheByPrefix(env, `${CACHE_PREFIXES.BILLING_PLANS}:clientId=${clientId}&year=${year}`),
      invalidateD1CacheByType(env, CACHE_PREFIXES.BILLING_PLANS, {})
    ]);

    // 清除應計收入快取（因為收費計劃變更會影響收入計算）
    await invalidateBillingCacheForYear(env, clientId, year);
  } catch (error) {
    console.error('[BillingCache] 清除收費計劃快取失敗:', error);
  }
}

/**
 * 批量清除多個客戶的快取
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Array<string>} clientIds - 客戶 ID 陣列
 * @param {number} [year] - 年度（可選）
 * @returns {Promise<void>}
 */
export async function invalidateBillingCacheBatch(env, clientIds, year = null) {
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return;
  }

  // 並行清除所有客戶的快取
  const promises = clientIds.map(clientId => invalidateBillingCache(env, clientId, year));
  await Promise.all(promises).catch(error => {
    console.error('[BillingCache] 批量清除快取失敗:', error);
  });
}

/**
 * 預熱快取（用於常用查詢）
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {Function} fetchData - 資料獲取函數
 * @returns {Promise<void>}
 */
export async function warmupBillingCache(env, clientId, year, fetchData) {
  try {
    // 預熱收費計劃列表
    await getBillingPlansWithCache(env, clientId, year, null, fetchData, { ttl: 3600 });
    
    // 預熱年度總計
    const yearTotalData = async () => {
      const { BillingPlanModel } = await import('../models/BillingPlanModel.js');
      const model = new BillingPlanModel(env);
      return model.getYearTotal(clientId, year);
    };
    await getYearTotalWithCache(env, clientId, year, yearTotalData, { ttl: 3600 });
  } catch (error) {
    console.error('[BillingCache] 預熱快取失敗:', error);
    // 不拋出錯誤，預熱失敗不影響正常流程
  }
}

/**
 * 獲取快取統計資訊（用於監控和調試）
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} [clientId] - 客戶 ID（可選）
 * @returns {Promise<Object>} 快取統計
 */
export async function getBillingCacheStats(env, clientId = null) {
  try {
    if (!env.DATABASE) {
      return { error: 'Database not available' };
    }

    let query = `
      SELECT 
        cache_type,
        COUNT(*) as total_entries,
        SUM(CASE WHEN invalidated = 0 THEN 1 ELSE 0 END) as valid_entries,
        SUM(hit_count) as total_hits,
        AVG(data_version) as avg_version
      FROM UniversalDataCache
      WHERE cache_type IN (?, ?, ?)
    `;
    const binds = [
      CACHE_PREFIXES.BILLING_PLANS,
      CACHE_PREFIXES.ACCRUED_REVENUE,
      CACHE_PREFIXES.YEAR_TOTAL
    ];

    if (clientId) {
      query += ` AND cache_key LIKE ?`;
      binds.push(`%clientId=${clientId}%`);
    }

    query += ` GROUP BY cache_type`;

    const result = await env.DATABASE.prepare(query).bind(...binds).all();

    return {
      stats: result?.results || [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[BillingCache] 獲取統計失敗:', error);
    return { error: error.message };
  }
}



