/**
 * 收入分攤計算引擎
 * 支援定期服務和一次性服務的年度收入分攤計算
 * 
 * 設計原則：
 * 1. 定期服務：按執行次數比例分攤收費計劃總金額
 * 2. 一次性服務：直接使用收費計劃實際金額
 * 3. 處理零執行次數情況
 * 4. 確保數學準確性（使用適當精度）
 * 5. 防止跨年度資料混亂（嚴格按年度篩選）
 * 6. 優化效能（使用索引、避免重複查詢）
 */

/**
 * 解析 execution_months JSON 字串為月份陣列
 * @param {string|Array|null|undefined} executionMonths - execution_months 欄位值
 * @returns {Array<number>} 月份陣列 (1-12)
 */
function parseExecutionMonths(executionMonths) {
  if (!executionMonths) return [];
  
  try {
    if (typeof executionMonths === 'string') {
      const parsed = JSON.parse(executionMonths);
      if (Array.isArray(parsed)) {
        return parsed.filter(m => Number.isInteger(m) && m >= 1 && m <= 12);
      }
    } else if (Array.isArray(executionMonths)) {
      return executionMonths.filter(m => Number.isInteger(m) && m >= 1 && m <= 12);
    }
  } catch (e) {
    console.warn('Failed to parse execution_months:', executionMonths, e);
  }
  
  return [];
}

/**
 * 計算定期服務收入分攤
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @returns {Promise<Object>} 分攤結果
 *   - totalRecurringRevenue: 定期服務總收費
 *   - services: 各服務的分攤結果陣列
 *     - clientServiceId: 客戶服務 ID
 *     - serviceId: 服務 ID
 *     - serviceName: 服務名稱
 *     - executionCount: 執行次數
 *     - annualAllocatedRevenue: 全年分攤收入
 *     - monthlyRevenue: 每月應計收入（如果該月有執行）
 *     - executionMonths: 執行月份陣列
 */
export async function calculateRecurringServiceRevenue(env, clientId, year) {
  // 1. 查詢該客戶該年度的定期服務收費計劃
  const recurringPlan = await env.DATABASE.prepare(
    `SELECT billing_plan_id, year_total, client_id, billing_year
     FROM BillingPlans
     WHERE client_id = ? 
       AND billing_year = ?
       AND billing_type = 'recurring'
     LIMIT 1`
  ).bind(clientId, year).first();

  if (!recurringPlan) {
    return {
      totalRecurringRevenue: 0,
      services: []
    };
  }

  const billingPlanId = recurringPlan.billing_plan_id;
  const totalRecurringRevenue = Number(recurringPlan.year_total || 0);

  // 2. 查詢該收費計劃關聯的所有定期服務
  const serviceRows = await env.DATABASE.prepare(
    `SELECT 
       bps.client_service_id,
       cs.service_id,
       COALESCE(s.service_name, '未命名服務') AS service_name,
       cs.execution_months,
       cs.service_type
     FROM BillingPlanServices bps
     INNER JOIN ClientServices cs ON bps.client_service_id = cs.client_service_id
     LEFT JOIN Services s ON cs.service_id = s.service_id
     WHERE bps.billing_plan_id = ?
       AND cs.service_type = 'recurring'
       AND cs.is_deleted = 0`
  ).bind(billingPlanId).all();

  const services = serviceRows?.results || [];

  if (services.length === 0) {
    return {
      totalRecurringRevenue,
      services: []
    };
  }

  // 3. 計算每個服務的執行次數
  const serviceData = services.map(service => {
    const executionMonths = parseExecutionMonths(service.execution_months);
    const executionCount = executionMonths.length;
    
    return {
      clientServiceId: service.client_service_id,
      serviceId: service.service_id,
      serviceName: service.service_name,
      executionCount,
      executionMonths: executionMonths.sort((a, b) => a - b)
    };
  });

  // 4. 計算總執行次數
  const totalExecutionCount = serviceData.reduce((sum, s) => sum + s.executionCount, 0);

  // 5. 處理零執行次數情況
  if (totalExecutionCount === 0 || totalRecurringRevenue === 0) {
    return {
      totalRecurringRevenue,
      services: serviceData.map(s => ({
        clientServiceId: s.clientServiceId,
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        executionCount: 0,
        annualAllocatedRevenue: 0,
        monthlyRevenue: 0,
        executionMonths: []
      }))
    };
  }

  // 6. 按執行次數比例分攤收入
  const results = serviceData.map(service => {
    // 計算全年分攤收入（使用高精度計算，最後四捨五入到分）
    const ratio = service.executionCount / totalExecutionCount;
    const annualAllocatedRevenue = Math.round(totalRecurringRevenue * ratio * 100) / 100;
    
    // 計算每月應計收入（如果該月有執行）
    const monthlyRevenue = service.executionCount > 0
      ? Math.round(annualAllocatedRevenue / service.executionCount * 100) / 100
      : 0;

    return {
      clientServiceId: service.clientServiceId,
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      executionCount: service.executionCount,
      annualAllocatedRevenue,
      monthlyRevenue,
      executionMonths: service.executionMonths
    };
  });

  // 7. 驗證分攤總額（允許小額誤差，因為四捨五入）
  const allocatedTotal = results.reduce((sum, s) => sum + s.annualAllocatedRevenue, 0);
  const difference = Math.abs(totalRecurringRevenue - allocatedTotal);
  
  // 如果誤差超過 0.01 元，調整最後一個服務的金額以確保總額正確
  if (difference > 0.01 && results.length > 0) {
    const lastService = results[results.length - 1];
    lastService.annualAllocatedRevenue = Math.round(
      (lastService.annualAllocatedRevenue + (totalRecurringRevenue - allocatedTotal)) * 100
    ) / 100;
    // 重新計算每月應計收入
    if (lastService.executionCount > 0) {
      lastService.monthlyRevenue = Math.round(
        lastService.annualAllocatedRevenue / lastService.executionCount * 100
      ) / 100;
    }
  }

  return {
    totalRecurringRevenue,
    services: results
  };
}

/**
 * 計算一次性服務收入
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @returns {Promise<Object>} 收入結果
 *   - services: 各服務的收入結果陣列
 *     - clientServiceId: 客戶服務 ID
 *     - serviceId: 服務 ID
 *     - serviceName: 服務名稱
 *     - annualRevenue: 全年應計收入
 *     - monthlyRevenue: 每月應計收入物件 { month: amount }
 *     - billingDate: 收費日期
 *     - description: 收費項目名稱
 */
export async function calculateOneTimeServiceRevenue(env, clientId, year) {
  // 1. 查詢該客戶該年度的所有一次性服務收費計劃
  const oneTimePlans = await env.DATABASE.prepare(
    `SELECT 
       bp.billing_plan_id,
       bp.year_total,
       bp.billing_date,
       bp.description,
       bps.client_service_id,
       cs.service_id,
       COALESCE(s.service_name, '未命名服務') AS service_name
     FROM BillingPlans bp
     INNER JOIN BillingPlanServices bps ON bp.billing_plan_id = bps.billing_plan_id
     INNER JOIN ClientServices cs ON bps.client_service_id = cs.client_service_id
     LEFT JOIN Services s ON cs.service_id = s.service_id
     WHERE bp.client_id = ?
       AND bp.billing_year = ?
       AND bp.billing_type = 'one-time'
       AND cs.service_type = 'one-time'
       AND cs.is_deleted = 0`
  ).bind(clientId, year).all();

  const plans = oneTimePlans?.results || [];

  if (plans.length === 0) {
    return {
      services: []
    };
  }

  // 2. 查詢每個收費計劃的月份明細
  const results = await Promise.all(
    plans.map(async (plan) => {
      const billingPlanId = plan.billing_plan_id;
      const annualRevenue = Number(plan.year_total || 0);

      // 查詢月份明細
      const monthRows = await env.DATABASE.prepare(
        `SELECT billing_month, billing_amount
         FROM BillingPlanMonths
         WHERE billing_plan_id = ?
         ORDER BY billing_month`
      ).bind(billingPlanId).all();

      const months = monthRows?.results || [];
      
      // 建立每月應計收入物件
      const monthlyRevenue = {};
      months.forEach(month => {
        monthlyRevenue[month.billing_month] = Number(month.billing_amount || 0);
      });

      return {
        clientServiceId: plan.client_service_id,
        serviceId: plan.service_id,
        serviceName: plan.service_name,
        annualRevenue,
        monthlyRevenue,
        billingDate: plan.billing_date,
        description: plan.description
      };
    })
  );

  return {
    services: results
  };
}

/**
 * 計算客戶年度應計收入總表
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @returns {Promise<Object>} 完整應計收入結果
 *   - clientId: 客戶 ID
 *   - year: 年度
 *   - recurring: 定期服務收入分攤結果
 *   - oneTime: 一次性服務收入結果
 *   - summary: 摘要統計
 *     - totalRecurringRevenue: 定期服務總收費
 *     - totalOneTimeRevenue: 一次性服務總收入
 *     - totalAnnualRevenue: 年度總收入
 */
export async function calculateAccruedRevenue(env, clientId, year) {
  // 驗證年度參數
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and 2100.`);
  }

  // 並行計算定期服務和一次性服務收入
  const [recurringResult, oneTimeResult] = await Promise.all([
    calculateRecurringServiceRevenue(env, clientId, year),
    calculateOneTimeServiceRevenue(env, clientId, year)
  ]);

  // 計算摘要統計
  const totalRecurringRevenue = recurringResult.totalRecurringRevenue || 0;
  const totalOneTimeRevenue = oneTimeResult.services.reduce(
    (sum, s) => sum + (s.annualRevenue || 0), 
    0
  );
  const totalAnnualRevenue = totalRecurringRevenue + totalOneTimeRevenue;

  return {
    clientId,
    year,
    recurring: recurringResult,
    oneTime: oneTimeResult,
    summary: {
      totalRecurringRevenue,
      totalOneTimeRevenue,
      totalAnnualRevenue
    }
  };
}

/**
 * 計算客戶指定月份的應計收入
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @param {number} month - 月份 (1-12)
 * @returns {Promise<Object>} 月份應計收入結果
 *   - clientId: 客戶 ID
 *   - year: 年度
 *   - month: 月份
 *   - recurringRevenue: 定期服務該月應計收入
 *   - oneTimeRevenue: 一次性服務該月應計收入
 *   - totalMonthlyRevenue: 該月總應計收入
 */
export async function calculateMonthlyAccruedRevenue(env, clientId, year, month) {
  // 驗證月份參數
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
  }

  // 計算年度應計收入
  const annualResult = await calculateAccruedRevenue(env, clientId, year);

  // 計算定期服務該月應計收入
  let recurringRevenue = 0;
  for (const service of annualResult.recurring.services) {
    if (service.executionMonths.includes(month)) {
      recurringRevenue += service.monthlyRevenue || 0;
    }
  }

  // 計算一次性服務該月應計收入
  let oneTimeRevenue = 0;
  for (const service of annualResult.oneTime.services) {
    if (service.monthlyRevenue && service.monthlyRevenue[month]) {
      oneTimeRevenue += service.monthlyRevenue[month];
    }
  }

  const totalMonthlyRevenue = recurringRevenue + oneTimeRevenue;

  return {
    clientId,
    year,
    month,
    recurringRevenue: Math.round(recurringRevenue * 100) / 100,
    oneTimeRevenue: Math.round(oneTimeRevenue * 100) / 100,
    totalMonthlyRevenue: Math.round(totalMonthlyRevenue * 100) / 100
  };
}

/**
 * 批量計算多個客戶的年度應計收入
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {Array<string>} clientIds - 客戶 ID 陣列
 * @param {number} year - 年度
 * @returns {Promise<Array<Object>>} 各客戶的應計收入結果陣列
 */
export async function calculateAccruedRevenueForClients(env, clientIds, year) {
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return [];
  }

  // 驗證年度參數
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and 2100.`);
  }

  // 並行計算所有客戶的應計收入
  const results = await Promise.all(
    clientIds.map(clientId => 
      calculateAccruedRevenue(env, clientId, year)
        .catch(error => {
          console.error(`Error calculating revenue for client ${clientId}:`, error);
          return {
            clientId,
            year,
            error: error.message,
            recurring: { totalRecurringRevenue: 0, services: [] },
            oneTime: { services: [] },
            summary: {
              totalRecurringRevenue: 0,
              totalOneTimeRevenue: 0,
              totalAnnualRevenue: 0
            }
          };
        })
    )
  );

  return results;
}

/**
 * 驗證收入分攤計算的準確性
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {string} clientId - 客戶 ID
 * @param {number} year - 年度
 * @returns {Promise<Object>} 驗證結果
 *   - isValid: 是否有效
 *   - errors: 錯誤訊息陣列
 *   - warnings: 警告訊息陣列
 */
export async function validateRevenueCalculation(env, clientId, year) {
  const errors = [];
  const warnings = [];

  try {
    const result = await calculateAccruedRevenue(env, clientId, year);

    // 驗證定期服務分攤總額
    const allocatedTotal = result.recurring.services.reduce(
      (sum, s) => sum + (s.annualAllocatedRevenue || 0),
      0
    );
    const difference = Math.abs(result.recurring.totalRecurringRevenue - allocatedTotal);
    
    if (difference > 0.01) {
      errors.push(
        `定期服務分攤總額不匹配：預期 ${result.recurring.totalRecurringRevenue}，實際 ${allocatedTotal}，差異 ${difference}`
      );
    } else if (difference > 0.001) {
      warnings.push(
        `定期服務分攤總額有小額差異：${difference} 元（可能因四捨五入造成）`
      );
    }

    // 驗證每個定期服務的每月應計收入總和
    for (const service of result.recurring.services) {
      if (service.executionCount > 0) {
        const monthlyTotal = service.monthlyRevenue * service.executionCount;
        const difference = Math.abs(service.annualAllocatedRevenue - monthlyTotal);
        
        if (difference > 0.01) {
          errors.push(
            `服務 ${service.serviceName} (ID: ${service.clientServiceId}) 的每月應計收入總和與全年分攤收入不匹配`
          );
        }
      }
    }

    // 驗證一次性服務年度總額
    for (const service of result.oneTime.services) {
      const monthlyTotal = Object.values(service.monthlyRevenue || {}).reduce(
        (sum, amount) => sum + amount,
        0
      );
      const difference = Math.abs(service.annualRevenue - monthlyTotal);
      
      if (difference > 0.01) {
        errors.push(
          `一次性服務 ${service.serviceName} (ID: ${service.clientServiceId}) 的月份明細總和與年度總額不匹配`
        );
      }
    }

  } catch (error) {
    errors.push(`計算過程發生錯誤：${error.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 計算指定月份所有客戶的應計收入（用於月度報表）
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {number} year - 年度
 * @param {number} month - 月份 (1-12)
 * @param {string} [clientId] - 客戶 ID（可選，如果提供則只計算該客戶）
 * @returns {Promise<Object>} 客戶應計收入映射
 *   - { [clientId]: number } - 客戶 ID 到應計收入的映射
 */
export async function calculateAccruedRevenueByClient(env, year, month, clientId = null) {
  // 驗證參數
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and 2100.`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
  }

  const result = {};

  // 構建查詢條件
  let whereClause = `bp.billing_year = ?`;
  const binds = [year];

  if (clientId) {
    whereClause += ` AND bp.client_id = ?`;
    binds.push(clientId);
  }

  // 查詢所有有收費計劃的客戶（該年度）
  const clientRows = await env.DATABASE.prepare(
    `SELECT DISTINCT bp.client_id
     FROM BillingPlans bp
     WHERE ${whereClause}`
  ).bind(...binds).all();

  const clients = clientRows?.results || [];

  if (clients.length === 0) {
    return result;
  }

  // 並行計算所有客戶的月度應計收入
  const calculations = await Promise.all(
    clients.map(async (row) => {
      try {
        const monthlyRevenue = await calculateMonthlyAccruedRevenue(
          env,
          row.client_id,
          year,
          month
        );
        return {
          clientId: row.client_id,
          revenue: monthlyRevenue.totalMonthlyRevenue
        };
      } catch (error) {
        console.error(`Error calculating revenue for client ${row.client_id}:`, error);
        return {
          clientId: row.client_id,
          revenue: 0
        };
      }
    })
  );

  // 建立客戶 ID 到收入的映射
  for (const calc of calculations) {
    if (calc.revenue > 0) {
      result[calc.clientId] = calc.revenue;
    }
  }

  return result;
}

/**
 * 計算指定年度所有客戶的應計收入（用於年度報表）
 * 
 * @param {Object} env - Cloudflare Workers 環境變數
 * @param {number} year - 年度
 * @param {string} [clientId] - 客戶 ID（可選，如果提供則只計算該客戶）
 * @returns {Promise<Object>} 客戶應計收入映射
 *   - { [clientId]: number } - 客戶 ID 到年度應計收入的映射
 */
export async function calculateAnnualAccruedRevenueByClient(env, year, clientId = null) {
  // 驗證參數
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and 2100.`);
  }

  const result = {};

  // 構建查詢條件
  let whereClause = `bp.billing_year = ?`;
  const binds = [year];

  if (clientId) {
    whereClause += ` AND bp.client_id = ?`;
    binds.push(clientId);
  }

  // 查詢所有有收費計劃的客戶（該年度）
  const clientRows = await env.DATABASE.prepare(
    `SELECT DISTINCT bp.client_id
     FROM BillingPlans bp
     WHERE ${whereClause}`
  ).bind(...binds).all();

  const clients = clientRows?.results || [];

  if (clients.length === 0) {
    return result;
  }

  // 並行計算所有客戶的年度應計收入
  const calculations = await Promise.all(
    clients.map(async (row) => {
      try {
        const annualRevenue = await calculateAccruedRevenue(env, row.client_id, year);
        return {
          clientId: row.client_id,
          revenue: annualRevenue.summary.totalAnnualRevenue
        };
      } catch (error) {
        console.error(`Error calculating annual revenue for client ${row.client_id}:`, error);
        return {
          clientId: row.client_id,
          revenue: 0
        };
      }
    })
  );

  // 建立客戶 ID 到收入的映射
  for (const calc of calculations) {
    if (calc.revenue > 0) {
      result[calc.clientId] = calc.revenue;
    }
  }

  return result;
}

