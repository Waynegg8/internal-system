const CACHE_TYPE = "report-cache";

function buildCacheKey(reportType, period) {
  return `report:${reportType}:${period}`;
}

export async function getReportCache(env, reportType, period) {
  const cacheKey = buildCacheKey(reportType, period);
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

export async function setReportCache(env, reportType, period, data) {
  const cacheKey = buildCacheKey(reportType, period);
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

export async function deleteReportCache(env, reportType, period) {
  const cacheKey = buildCacheKey(reportType, period);
  await env.DATABASE.prepare(
    `UPDATE CacheData
     SET is_deleted = 1
     WHERE cache_key = ? AND cache_type = ?`
  ).bind(cacheKey, CACHE_TYPE).run();
}





