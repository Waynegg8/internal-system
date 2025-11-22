const CACHE_TYPE = "report-cache";

/**
 * 構建快取鍵
 * 支持三種格式：
 * 1. 月度報表：monthly:{year}:{month}:{reportType}
 * 2. 年度報表：annual:{year}:{reportType}
 * 3. 舊格式（向後兼容）：report:{reportType}:{period}
 * 
 * @param {string} reportType - 報表類型
 * @param {string|number} periodOrYear - 期間字符串（YYYY-MM）或年份（數字）
 * @param {number} [month] - 月份（1-12），如果提供則使用月度格式
 * @param {boolean} [isAnnual] - 是否為年度報表，如果為 true 且 month 為 null，使用年度格式
 * @returns {string} 快取鍵
 */
function buildCacheKey(reportType, periodOrYear, month = null, isAnnual = false) {
  // 如果提供了 month，使用月度格式：monthly:{year}:{month}:{reportType}
  if (month !== null && month !== undefined) {
    const year = Number(periodOrYear);
    const monthNum = Number(month);
    if (Number.isInteger(year) && Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12) {
      return `monthly:${year}:${monthNum}:${reportType}`;
    }
  }
  
  // 如果是年度報表（isAnnual=true 且 month=null），使用年度格式：annual:{year}:{reportType}
  if (isAnnual && (month === null || month === undefined)) {
    const year = typeof periodOrYear === 'number' ? periodOrYear : Number(periodOrYear);
    if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
      return `annual:${year}:${reportType}`;
    }
  }
  
  // 否則使用舊格式：report:{reportType}:{period}
  // 這確保了向後兼容性
  return `report:${reportType}:${periodOrYear}`;
}

export async function getReportCache(env, reportType, periodOrYear, month = null, isAnnual = false) {
  const cacheKey = buildCacheKey(reportType, periodOrYear, month, isAnnual);
  
  // 為了向後兼容，如果使用新格式但找不到，嘗試舊格式
  if (month !== null && month !== undefined) {
    const result = await getReportCacheInternal(env, cacheKey);
    if (result) {
      return result;
    }
    // 嘗試舊格式
    const oldPeriod = typeof periodOrYear === 'number' 
      ? `${periodOrYear}-${String(month).padStart(2, '0')}`
      : periodOrYear;
    const oldCacheKey = buildCacheKey(reportType, oldPeriod);
    return await getReportCacheInternal(env, oldCacheKey);
  } else if (isAnnual) {
    const result = await getReportCacheInternal(env, cacheKey);
    if (result) {
      return result;
    }
    // 嘗試舊格式
    const oldPeriod = typeof periodOrYear === 'number' ? String(periodOrYear) : periodOrYear;
    const oldCacheKey = buildCacheKey(reportType, oldPeriod);
    return await getReportCacheInternal(env, oldCacheKey);
  }
  
  return await getReportCacheInternal(env, cacheKey);
}

async function getReportCacheInternal(env, cacheKey) {
  const row = await env.DATABASE.prepare(
    `SELECT cache_value, created_at
     FROM CacheData
     WHERE cache_key = ? AND cache_type = ? AND is_deleted = 0`
  ).bind(cacheKey, CACHE_TYPE).first();

  if (!row) {
    return null;
  }

  try {
    const payload = JSON.parse(row.cache_value);
    return {
      data: payload.data ?? null,
      computedAt: payload.computedAt ?? row.created_at ?? null,
    };
  } catch (err) {
    console.warn("[ReportCache] 解析緩存失敗，忽略舊資料:", err);
    return null;
  }
}

export async function setReportCache(env, reportType, periodOrYear, data, month = null, isAnnual = false) {
  const cacheKey = buildCacheKey(reportType, periodOrYear, month, isAnnual);
  const record = {
    data,
    computedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(record);

  const existing = await env.DATABASE.prepare(
    `SELECT cache_value
     FROM CacheData
     WHERE cache_key = ? AND cache_type = ? AND is_deleted = 0`
  ).bind(cacheKey, CACHE_TYPE).first();

  if (existing && existing.cache_value === serialized) {
    return {
      updated: false,
      cachedAt: record.computedAt,
    };
  }

  await env.DATABASE.prepare(
    `INSERT INTO CacheData (cache_key, cache_type, cache_value, created_at, expires_at, is_deleted)
     VALUES (?, ?, ?, datetime('now'), NULL, 0)
     ON CONFLICT(cache_key) DO UPDATE SET
       cache_value = excluded.cache_value,
       cache_type = excluded.cache_type,
       created_at = datetime('now'),
       expires_at = NULL,
       is_deleted = 0`
  ).bind(cacheKey, CACHE_TYPE, serialized).run();

  return {
    updated: true,
    cachedAt: record.computedAt,
  };
}

export async function deleteReportCache(env, reportType, periodOrYear, month = null, isAnnual = false) {
  const cacheKey = buildCacheKey(reportType, periodOrYear, month, isAnnual);
  
  // 為了向後兼容，同時刪除舊格式的快取
  if (month !== null && month !== undefined) {
    const oldPeriod = typeof periodOrYear === 'number' 
      ? `${periodOrYear}-${String(month).padStart(2, '0')}`
      : periodOrYear;
    const oldCacheKey = buildCacheKey(reportType, oldPeriod);
    // 刪除新格式
    await env.DATABASE.prepare(
      `UPDATE CacheData
       SET is_deleted = 1
       WHERE cache_key = ? AND cache_type = ?`
    ).bind(cacheKey, CACHE_TYPE).run();
    // 刪除舊格式
    await env.DATABASE.prepare(
      `UPDATE CacheData
       SET is_deleted = 1
       WHERE cache_key = ? AND cache_type = ?`
    ).bind(oldCacheKey, CACHE_TYPE).run();
    return;
  } else if (isAnnual) {
    const oldPeriod = typeof periodOrYear === 'number' ? String(periodOrYear) : periodOrYear;
    const oldCacheKey = buildCacheKey(reportType, oldPeriod);
    // 刪除新格式
    await env.DATABASE.prepare(
      `UPDATE CacheData
       SET is_deleted = 1
       WHERE cache_key = ? AND cache_type = ?`
    ).bind(cacheKey, CACHE_TYPE).run();
    // 刪除舊格式
    await env.DATABASE.prepare(
      `UPDATE CacheData
       SET is_deleted = 1
       WHERE cache_key = ? AND cache_type = ?`
    ).bind(oldCacheKey, CACHE_TYPE).run();
    return;
  }
  
  await env.DATABASE.prepare(
    `UPDATE CacheData
     SET is_deleted = 1
     WHERE cache_key = ? AND cache_type = ?`
  ).bind(cacheKey, CACHE_TYPE).run();
}









