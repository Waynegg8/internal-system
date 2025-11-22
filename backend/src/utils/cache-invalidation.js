/**
 * 報表快取失效機制
 * 當源數據變更時，自動標記相關年度報表快取為無效
 */

import { deleteReportCache } from "./report-cache.js";

/**
 * 年度報表類型列表
 */
const ANNUAL_REPORT_TYPES = [
  "annual-revenue",
  "annual-payroll",
  "annual-employee-performance",
  "annual-client-profitability",
];

/**
 * 根據數據類型確定受影響的年度報表類型
 * @param {string} dataType - 數據類型：'receipts', 'payroll', 'timesheets', 'overhead', 'billing'
 * @returns {string[]} 受影響的年度報表類型列表
 */
function getAffectedReportTypes(dataType) {
  switch (dataType) {
    case "receipts":
      // 收據變更影響：年度收款、年度員工產值、年度客戶毛利
      return [
        "annual-revenue",
        "annual-employee-performance",
        "annual-client-profitability",
      ];
    case "payroll":
      // 薪資變更影響：年度薪資、年度員工產值、年度客戶毛利
      return [
        "annual-payroll",
        "annual-employee-performance",
        "annual-client-profitability",
      ];
    case "timesheets":
      // 工時變更影響：年度員工產值、年度客戶毛利
      return [
        "annual-employee-performance",
        "annual-client-profitability",
      ];
    case "overhead":
      // 管理費變更影響：年度員工產值、年度客戶毛利
      return [
        "annual-employee-performance",
        "annual-client-profitability",
      ];
    case "billing":
      // 收費計劃變更影響：年度客戶毛利（使用 BR1 邏輯）
      return ["annual-client-profitability"];
    default:
      // 未知類型，失效所有年度報表
      return ANNUAL_REPORT_TYPES;
  }
}

/**
 * 失效指定年份的年度報表快取
 * @param {Object} env - Cloudflare 環境變量
 * @param {number} year - 年份 (2000-2100)
 * @param {string[]} reportTypes - 要失效的報表類型列表（可選，預設為所有年度報表）
 * @returns {Promise<void>}
 */
export async function invalidateAnnualReportCache(env, year, reportTypes = null) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    console.warn(`[CacheInvalidation] 無效的年份: ${year}`);
    return;
  }

  const typesToInvalidate = reportTypes || ANNUAL_REPORT_TYPES;

  console.log(
    `[CacheInvalidation] 失效 ${year} 年度的年度報表快取:`,
    typesToInvalidate.join(", ")
  );

  // 並行失效所有相關報表快取
  const invalidationPromises = typesToInvalidate.map(async (reportType) => {
    try {
      await deleteReportCache(env, reportType, year, null, true);
      console.log(
        `[CacheInvalidation] 已失效: ${reportType} (${year})`
      );
    } catch (err) {
      console.error(
        `[CacheInvalidation] 失效快取失敗: ${reportType} (${year})`,
        err
      );
    }
  });

  await Promise.all(invalidationPromises);
}

/**
 * 根據數據變更失效相關年度報表快取
 * @param {Object} env - Cloudflare 環境變量
 * @param {string} dataType - 數據類型：'receipts', 'payroll', 'timesheets', 'overhead', 'billing'
 * @param {number|string} yearOrDate - 年份（數字）或日期字符串（YYYY-MM-DD 或 YYYY-MM）
 * @returns {Promise<void>}
 */
export async function invalidateCacheByDataType(
  env,
  dataType,
  yearOrDate
) {
  let year;

  // 解析年份
  if (typeof yearOrDate === "number") {
    year = yearOrDate;
  } else if (typeof yearOrDate === "string") {
    // 嘗試從日期字符串中提取年份
    const yearMatch = yearOrDate.match(/^(\d{4})/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    } else {
      console.warn(
        `[CacheInvalidation] 無法從日期字符串中提取年份: ${yearOrDate}`
      );
      return;
    }
  } else {
    console.warn(
      `[CacheInvalidation] 無效的年份或日期參數: ${yearOrDate}`
    );
    return;
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    console.warn(`[CacheInvalidation] 無效的年份: ${year}`);
    return;
  }

  // 獲取受影響的報表類型
  const affectedTypes = getAffectedReportTypes(dataType);

  console.log(
    `[CacheInvalidation] 數據類型 "${dataType}" 變更，失效 ${year} 年度的報表快取:`,
    affectedTypes.join(", ")
  );

  // 失效相關報表快取
  await invalidateAnnualReportCache(env, year, affectedTypes);
}

/**
 * 批量失效多個年份的年度報表快取
 * @param {Object} env - Cloudflare 環境變量
 * @param {string} dataType - 數據類型
 * @param {number[]} years - 年份列表
 * @returns {Promise<void>}
 */
export async function invalidateCacheByDataTypeForYears(
  env,
  dataType,
  years
) {
  if (!Array.isArray(years) || years.length === 0) {
    return;
  }

  // 去重年份
  const uniqueYears = [...new Set(years)].filter(
    (y) => Number.isInteger(y) && y >= 2000 && y <= 2100
  );

  if (uniqueYears.length === 0) {
    return;
  }

  // 獲取受影響的報表類型
  const affectedTypes = getAffectedReportTypes(dataType);

  console.log(
    `[CacheInvalidation] 批量失效 ${dataType} 相關報表快取，年份:`,
    uniqueYears.join(", "),
    "報表類型:",
    affectedTypes.join(", ")
  );

  // 並行失效所有年份的快取
  const invalidationPromises = uniqueYears.map(async (year) => {
    await invalidateAnnualReportCache(env, year, affectedTypes);
  });

  await Promise.all(invalidationPromises);
}

/**
 * 從日期字符串或日期對象中提取年份
 * @param {string|Date|number} dateInput - 日期輸入（YYYY-MM-DD, YYYY-MM, Date 對象，或年份數字）
 * @returns {number|null} 年份，如果無法提取則返回 null
 */
export function extractYearFromDate(dateInput) {
  if (typeof dateInput === "number") {
    return dateInput >= 2000 && dateInput <= 2100 ? dateInput : null;
  }

  if (dateInput instanceof Date) {
    return dateInput.getFullYear();
  }

  if (typeof dateInput === "string") {
    const yearMatch = dateInput.match(/^(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      return year >= 2000 && year <= 2100 ? year : null;
    }
  }

  return null;
}



