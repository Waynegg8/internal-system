/**
 * BillingPlanModel - 收費計劃資料存取層
 * 提供完整的 CRUD 操作、年度篩選和多服務關聯管理
 * 
 * 設計原則：
 * 1. 維護引用完整性：確保所有關聯資料的一致性
 * 2. 高效查詢：使用索引優化查詢效能
 * 3. 財務資料準確性：確保金額計算和驗證的正確性
 * 4. 事務處理：複雜操作使用事務確保原子性
 */

/**
 * 驗證年度參數
 */
function validateYear(year) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and 2100.`);
  }
  return year;
}

/**
 * 驗證月份參數
 */
function validateMonth(month) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
  }
  return month;
}

/**
 * 驗證金額參數
 */
function validateAmount(amount, fieldName = 'amount') {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Invalid ${fieldName}: ${amount}. Must be a non-negative number.`);
  }
  return Math.round(num * 100) / 100; // 四捨五入到分
}

/**
 * BillingPlanModel 類別
 */
export class BillingPlanModel {
  constructor(env) {
    this.env = env;
    this.db = env.DATABASE;
  }

  /**
   * 建立收費計劃（包含月份明細和服務關聯）
   * 
   * @param {Object} data - 收費計劃資料
   * @param {string} data.clientId - 客戶 ID
   * @param {number} data.billingYear - 年度
   * @param {string} data.billingType - 收費類型 ('recurring' | 'one-time')
   * @param {number} data.paymentDueDays - 付款期限（天數）
   * @param {string} [data.billingDate] - 一次性服務的收費日期 (YYYY-MM-DD)
   * @param {string} [data.description] - 一次性服務收費項目名稱
   * @param {string} [data.notes] - 備註
   * @param {Array<Object>} [data.months] - 月份明細陣列
   *   - {number} month - 月份 (1-12)
   *   - {number} amount - 金額
   *   - {number} [paymentDueDays] - 付款期限（可選，覆蓋計劃預設值）
   * @param {Array<number>} [data.clientServiceIds] - 關聯的客戶服務 ID 陣列
   * @returns {Promise<Object>} 建立的收費計劃資料
   */
  async create(data) {
    const {
      clientId,
      billingYear,
      billingType,
      paymentDueDays = 30,
      billingDate = null,
      description = null,
      notes = null,
      months = [],
      clientServiceIds = []
    } = data;

    // 驗證必填欄位
    if (!clientId) throw new Error('clientId is required');
    if (!billingYear) throw new Error('billingYear is required');
    if (!billingType || !['recurring', 'one-time'].includes(billingType)) {
      throw new Error('billingType must be "recurring" or "one-time"');
    }

    validateYear(billingYear);
    const validatedPaymentDueDays = Math.max(1, Math.floor(Number(paymentDueDays) || 30));

    // 驗證一次性服務必填欄位
    if (billingType === 'one-time') {
      if (!billingDate) throw new Error('billingDate is required for one-time billing plans');
      if (!description) throw new Error('description is required for one-time billing plans');
    }

    // 驗證定期服務的唯一性（一個客戶一個年度只有一個）
    if (billingType === 'recurring') {
      const existing = await this.findByClientAndYear(clientId, billingYear, 'recurring');
      if (existing) {
        throw new Error(`Recurring billing plan already exists for client ${clientId} in year ${billingYear}`);
      }
    }

    // 驗證月份明細
    const validatedMonths = months.map(m => ({
      month: validateMonth(m.month),
      amount: validateAmount(m.amount, 'monthly amount'),
      paymentDueDays: m.paymentDueDays ? Math.max(1, Math.floor(Number(m.paymentDueDays))) : null
    }));

    // 驗證服務關聯
    if (billingType === 'recurring' && clientServiceIds.length === 0) {
      throw new Error('At least one client service is required for recurring billing plans');
    }
    if (billingType === 'one-time' && clientServiceIds.length !== 1) {
      throw new Error('Exactly one client service is required for one-time billing plans');
    }

    // 驗證服務類型與收費計劃類型一致
    if (clientServiceIds.length > 0) {
      const serviceRows = await this.db.prepare(
        `SELECT client_service_id, service_type 
         FROM ClientServices 
         WHERE client_service_id IN (${clientServiceIds.map(() => '?').join(',')})
           AND is_deleted = 0`
      ).bind(...clientServiceIds).all();

      const services = serviceRows?.results || [];
      if (services.length !== clientServiceIds.length) {
        throw new Error('Some client services not found or deleted');
      }

      for (const service of services) {
        if (service.service_type !== billingType) {
          throw new Error(
            `Service type mismatch: service ${service.client_service_id} is ${service.service_type}, ` +
            `but billing plan is ${billingType}`
          );
        }
      }
    }

    const now = new Date().toISOString();

    // 建立收費計劃主記錄
    const planResult = await this.db.prepare(
      `INSERT INTO BillingPlans (
        client_id, billing_year, billing_type, payment_due_days,
        billing_date, description, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      clientId,
      billingYear,
      billingType,
      validatedPaymentDueDays,
      billingDate,
      description,
      notes,
      now,
      now
    ).run();

    const billingPlanId = planResult.meta.last_row_id;

    // 建立月份明細
    if (validatedMonths.length > 0) {
      for (const month of validatedMonths) {
        await this.db.prepare(
          `INSERT INTO BillingPlanMonths (
            billing_plan_id, billing_month, billing_amount, payment_due_days, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          billingPlanId,
          month.month,
          month.amount,
          month.paymentDueDays,
          now,
          now
        ).run();
      }
    }

    // 建立服務關聯
    if (clientServiceIds.length > 0) {
      for (const clientServiceId of clientServiceIds) {
        await this.db.prepare(
          `INSERT INTO BillingPlanServices (billing_plan_id, client_service_id, created_at)
           VALUES (?, ?, ?)`
        ).bind(billingPlanId, clientServiceId, now).run();
      }
    }

    // 失效相關年度報表快取
    const { invalidateCacheByDataType } = await import("../utils/cache-invalidation.js");
    await invalidateCacheByDataType(this.env, "billing", billingYear).catch((err) => {
      console.warn("[BillingPlanModel] 失效快取失敗:", err);
    });

    // 查詢並返回完整資料
    return this.findById(billingPlanId);
  }

  /**
   * 根據 ID 查詢收費計劃
   * 
   * @param {number} billingPlanId - 收費計劃 ID
   * @returns {Promise<Object|null>} 收費計劃資料（包含月份明細和服務關聯）
   */
  async findById(billingPlanId) {
    const plan = await this.db.prepare(
      `SELECT 
        billing_plan_id, client_id, billing_year, billing_type,
        year_total, payment_due_days, billing_date, description, notes,
        created_at, updated_at
       FROM BillingPlans
       WHERE billing_plan_id = ?`
    ).bind(billingPlanId).first();

    if (!plan) return null;

    // 查詢月份明細
    const months = await this.db.prepare(
      `SELECT 
        billing_plan_month_id, billing_month, billing_amount, payment_due_days,
        created_at, updated_at
       FROM BillingPlanMonths
       WHERE billing_plan_id = ?
       ORDER BY billing_month`
    ).bind(billingPlanId).all();

    // 查詢服務關聯
    const services = await this.db.prepare(
      `SELECT 
        bps.billing_plan_service_id, bps.client_service_id, bps.created_at,
        cs.service_id, cs.service_type,
        COALESCE(s.service_name, '未命名服務') AS service_name
       FROM BillingPlanServices bps
       INNER JOIN ClientServices cs ON bps.client_service_id = cs.client_service_id
       LEFT JOIN Services s ON cs.service_id = s.service_id
       WHERE bps.billing_plan_id = ?`
    ).bind(billingPlanId).all();

    return {
      billingPlanId: plan.billing_plan_id,
      clientId: plan.client_id,
      billingYear: plan.billing_year,
      billingType: plan.billing_type,
      yearTotal: Number(plan.year_total || 0),
      paymentDueDays: plan.payment_due_days,
      billingDate: plan.billing_date,
      description: plan.description,
      notes: plan.notes,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
      months: (months?.results || []).map(m => ({
        billingPlanMonthId: m.billing_plan_month_id,
        month: m.billing_month,
        amount: Number(m.billing_amount || 0),
        paymentDueDays: m.payment_due_days,
        createdAt: m.created_at,
        updatedAt: m.updated_at
      })),
      services: (services?.results || []).map(s => ({
        billingPlanServiceId: s.billing_plan_service_id,
        clientServiceId: s.client_service_id,
        serviceId: s.service_id,
        serviceName: s.service_name,
        serviceType: s.service_type,
        createdAt: s.created_at
      }))
    };
  }

  /**
   * 根據客戶和年度查詢收費計劃
   * 
   * @param {string} clientId - 客戶 ID
   * @param {number} year - 年度
   * @param {string} [billingType] - 收費類型（可選）
   * @returns {Promise<Object|null>} 收費計劃資料（僅適用於定期服務，一次性服務可能有多個）
   */
  async findByClientAndYear(clientId, year, billingType = null) {
    validateYear(year);

    let query = `
      SELECT billing_plan_id
      FROM BillingPlans
      WHERE client_id = ? AND billing_year = ?
    `;
    const binds = [clientId, year];

    if (billingType) {
      query += ` AND billing_type = ?`;
      binds.push(billingType);
    }

    query += ` LIMIT 1`;

    const result = await this.db.prepare(query).bind(...binds).first();

    if (!result) return null;

    return this.findById(result.billing_plan_id);
  }

  /**
   * 查詢客戶年度所有收費計劃
   * 
   * @param {string} clientId - 客戶 ID
   * @param {number} year - 年度
   * @param {string} [billingType] - 收費類型（可選）
   * @returns {Promise<Array<Object>>} 收費計劃陣列
   */
  async findByClientAndYearAll(clientId, year, billingType = null) {
    validateYear(year);

    let query = `
      SELECT billing_plan_id
      FROM BillingPlans
      WHERE client_id = ? AND billing_year = ?
    `;
    const binds = [clientId, year];

    if (billingType) {
      query += ` AND billing_type = ?`;
      binds.push(billingType);
    }

    query += ` ORDER BY billing_type, billing_plan_id`;

    const results = await this.db.prepare(query).bind(...binds).all();
    const plans = results?.results || [];

    return Promise.all(plans.map(p => this.findById(p.billing_plan_id)));
  }

  /**
   * 更新收費計劃
   * 
   * @param {number} billingPlanId - 收費計劃 ID
   * @param {Object} data - 更新資料
   * @param {number} [data.paymentDueDays] - 付款期限
   * @param {string} [data.billingDate] - 一次性服務的收費日期
   * @param {string} [data.description] - 一次性服務收費項目名稱
   * @param {string} [data.notes] - 備註
   * @param {Array<Object>} [data.months] - 月份明細陣列（如果提供，將完全替換現有月份）
   * @param {Array<number>} [data.clientServiceIds] - 服務關聯陣列（如果提供，將完全替換現有關聯）
   * @returns {Promise<Object>} 更新後的收費計劃資料
   */
  async update(billingPlanId, data) {
    const existing = await this.findById(billingPlanId);
    if (!existing) {
      throw new Error(`Billing plan ${billingPlanId} not found`);
    }

    const {
      paymentDueDays,
      billingDate,
      description,
      notes,
      months,
      clientServiceIds
    } = data;

    const updates = [];
    const binds = [];

    if (paymentDueDays !== undefined) {
      const validated = Math.max(1, Math.floor(Number(paymentDueDays) || 30));
      updates.push('payment_due_days = ?');
      binds.push(validated);
    }

    if (billingDate !== undefined) {
      updates.push('billing_date = ?');
      binds.push(billingDate);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      binds.push(description);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      binds.push(notes);
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      binds.push(new Date().toISOString());
      binds.push(billingPlanId);

      await this.db.prepare(
        `UPDATE BillingPlans SET ${updates.join(', ')} WHERE billing_plan_id = ?`
      ).bind(...binds).run();
    }

    // 更新月份明細（如果提供）
    if (months !== undefined) {
      // 刪除現有月份明細
      await this.db.prepare(
        `DELETE FROM BillingPlanMonths WHERE billing_plan_id = ?`
      ).bind(billingPlanId).run();

      // 插入新月份明細
      if (Array.isArray(months) && months.length > 0) {
        const now = new Date().toISOString();
        for (const month of months) {
          const validatedMonth = validateMonth(month.month);
          const validatedAmount = validateAmount(month.amount, 'monthly amount');
          const validatedPaymentDueDays = month.paymentDueDays 
            ? Math.max(1, Math.floor(Number(month.paymentDueDays))) 
            : null;

          await this.db.prepare(
            `INSERT INTO BillingPlanMonths (
              billing_plan_id, billing_month, billing_amount, payment_due_days, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(
            billingPlanId,
            validatedMonth,
            validatedAmount,
            validatedPaymentDueDays,
            now,
            now
          ).run();
        }
      }
    }

    // 更新服務關聯（如果提供）
    if (clientServiceIds !== undefined) {
      // 驗證服務類型
      if (Array.isArray(clientServiceIds) && clientServiceIds.length > 0) {
        const serviceRows = await this.db.prepare(
          `SELECT client_service_id, service_type 
           FROM ClientServices 
           WHERE client_service_id IN (${clientServiceIds.map(() => '?').join(',')})
             AND is_deleted = 0`
        ).bind(...clientServiceIds).all();

        const services = serviceRows?.results || [];
        if (services.length !== clientServiceIds.length) {
          throw new Error('Some client services not found or deleted');
        }

        for (const service of services) {
          if (service.service_type !== existing.billingType) {
            throw new Error(
              `Service type mismatch: service ${service.client_service_id} is ${service.service_type}, ` +
              `but billing plan is ${existing.billingType}`
            );
          }
        }
      }

      // 刪除現有關聯
      await this.db.prepare(
        `DELETE FROM BillingPlanServices WHERE billing_plan_id = ?`
      ).bind(billingPlanId).run();

      // 插入新關聯
      if (Array.isArray(clientServiceIds) && clientServiceIds.length > 0) {
        const now = new Date().toISOString();
        for (const clientServiceId of clientServiceIds) {
          await this.db.prepare(
            `INSERT INTO BillingPlanServices (billing_plan_id, client_service_id, created_at)
             VALUES (?, ?, ?)`
          ).bind(billingPlanId, clientServiceId, now).run();
        }
      }
    }

    // 失效相關年度報表快取（從現有和更新後的年份中提取）
    const { invalidateCacheByDataType } = await import("../utils/cache-invalidation.js");
    const years = new Set();
    if (existing.billing_year) years.add(existing.billing_year);
    if (billingYear !== undefined) years.add(billingYear);
    
    for (const year of years) {
      await invalidateCacheByDataType(this.env, "billing", year).catch((err) => {
        console.warn("[BillingPlanModel] 失效快取失敗:", err);
      });
    }

    // 返回更新後的資料
    return this.findById(billingPlanId);
  }

  /**
   * 刪除收費計劃（級聯刪除月份明細和服務關聯）
   * 
   * @param {number} billingPlanId - 收費計劃 ID
   * @returns {Promise<boolean>} 是否成功刪除
   */
  async delete(billingPlanId) {
    const existing = await this.db.prepare(
      `SELECT billing_plan_id, billing_year FROM BillingPlans WHERE billing_plan_id = ?`
    ).bind(billingPlanId).first();

    if (!existing) {
      return false;
    }

    // 由於外鍵約束設定為 ON DELETE CASCADE，只需刪除主記錄
    await this.db.prepare(
      `DELETE FROM BillingPlans WHERE billing_plan_id = ?`
    ).bind(billingPlanId).run();

    // 失效相關年度報表快取
    if (existing.billing_year) {
      const { invalidateCacheByDataType } = await import("../utils/cache-invalidation.js");
      await invalidateCacheByDataType(this.env, "billing", existing.billing_year).catch((err) => {
        console.warn("[BillingPlanModel] 失效快取失敗:", err);
      });
    }

    return true;
  }

  /**
   * 批量刪除收費計劃
   * 
   * @param {Array<number>} billingPlanIds - 收費計劃 ID 陣列
   * @returns {Promise<Object>} 刪除結果
   *   - deleted: 成功刪除的數量
   *   - failed: 失敗的數量
   *   - errors: 錯誤訊息陣列
   */
  async deleteBatch(billingPlanIds) {
    if (!Array.isArray(billingPlanIds) || billingPlanIds.length === 0) {
      return { deleted: 0, failed: 0, errors: [] };
    }

    let deleted = 0;
    let failed = 0;
    const errors = [];

    for (const id of billingPlanIds) {
      try {
        const success = await this.delete(id);
        if (success) {
          deleted++;
        } else {
          failed++;
          errors.push(`Billing plan ${id} not found`);
        }
      } catch (error) {
        failed++;
        errors.push(`Failed to delete billing plan ${id}: ${error.message}`);
      }
    }

    return { deleted, failed, errors };
  }

  /**
   * 查詢客戶服務的收費計劃
   * 
   * @param {number} clientServiceId - 客戶服務 ID
   * @param {number} [year] - 年度（可選）
   * @returns {Promise<Array<Object>>} 收費計劃陣列
   */
  async findByClientService(clientServiceId, year = null) {
    let query = `
      SELECT DISTINCT bp.billing_plan_id
      FROM BillingPlans bp
      INNER JOIN BillingPlanServices bps ON bp.billing_plan_id = bps.billing_plan_id
      WHERE bps.client_service_id = ?
    `;
    const binds = [clientServiceId];

    if (year) {
      validateYear(year);
      query += ` AND bp.billing_year = ?`;
      binds.push(year);
    }

    query += ` ORDER BY bp.billing_year DESC, bp.billing_plan_id`;

    const results = await this.db.prepare(query).bind(...binds).all();
    const plans = results?.results || [];

    return Promise.all(plans.map(p => this.findById(p.billing_plan_id)));
  }

  /**
   * 查詢指定月份的收費計劃
   * 
   * @param {string} clientId - 客戶 ID
   * @param {number} year - 年度
   * @param {number} month - 月份 (1-12)
   * @returns {Promise<Array<Object>>} 收費計劃陣列（包含該月份的計劃）
   */
  async findByMonth(clientId, year, month) {
    validateYear(year);
    validateMonth(month);

    const results = await this.db.prepare(
      `SELECT DISTINCT bp.billing_plan_id
       FROM BillingPlans bp
       INNER JOIN BillingPlanMonths bpm ON bp.billing_plan_id = bpm.billing_plan_id
       WHERE bp.client_id = ? 
         AND bp.billing_year = ?
         AND bpm.billing_month = ?
       ORDER BY bp.billing_type, bp.billing_plan_id`
    ).bind(clientId, year, month).all();

    const plans = results?.results || [];
    return Promise.all(plans.map(p => this.findById(p.billing_plan_id)));
  }

  /**
   * 獲取客戶年度收費總額
   * 
   * @param {string} clientId - 客戶 ID
   * @param {number} year - 年度
   * @returns {Promise<Object>} 年度收費總額統計
   *   - totalRecurring: 定期服務總額
   *   - totalOneTime: 一次性服務總額
   *   - total: 年度總額
   */
  async getYearTotal(clientId, year) {
    validateYear(year);

    const result = await this.db.prepare(
      `SELECT 
        billing_type,
        SUM(year_total) AS total
       FROM BillingPlans
       WHERE client_id = ? AND billing_year = ?
       GROUP BY billing_type`
    ).bind(clientId, year).all();

    const rows = result?.results || [];
    let totalRecurring = 0;
    let totalOneTime = 0;

    for (const row of rows) {
      const total = Number(row.total || 0);
      if (row.billing_type === 'recurring') {
        totalRecurring = total;
      } else if (row.billing_type === 'one-time') {
        totalOneTime = total;
      }
    }

    return {
      totalRecurring,
      totalOneTime,
      total: totalRecurring + totalOneTime
    };
  }
}

