/**
 * 缓存辅助函数
 * 支持 KV 和 D1 混合缓存策略
 */

/**
 * 生成缓存键
 */
export function generateCacheKey(cacheType, params = {}) {
  if (!params || Object.keys(params).length === 0) {
    return cacheType;
  }
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  
  return `${cacheType}:${sortedParams}`;
}

/**
 * 从 KV 获取缓存
 */
export async function getKVCache(env, cacheKey) {
  try {
    if (!env.CACHE) return null;
    
    const cached = await env.CACHE.get(cacheKey, { type: 'json' });
    if (!cached) return null;
    
    // 更新访问统计（异步）
    const stats = {
      hit_count: (cached.meta?.hit_count || 0) + 1,
      last_accessed: new Date().toISOString()
    };
    
    env.CACHE.put(
      cacheKey,
      JSON.stringify({ ...cached, meta: { ...cached.meta, ...stats } }),
      { expirationTtl: 3600 }
    ).catch(() => {});
    
    return {
      data: cached.data,
      meta: {
        cached: true,
        hit_count: stats.hit_count,
        cached_at: cached.meta?.cached_at
      }
    };
  } catch (err) {
    console.error('[KV Cache] 读取失败:', err);
    return null;
  }
}

/**
 * 保存数据到 KV
 */
export async function saveKVCache(env, cacheKey, cacheType, data, options = {}) {
  try {
    if (!env.CACHE) return false;
    
    const now = new Date().toISOString();
    const cacheData = {
      data,
      meta: {
        cached_at: now,
        cache_type: cacheType,
        hit_count: 0,
        version: 1,
        user_id: options.userId || null,
        scope_params: options.scopeParams || null
      }
    };
    
    await env.CACHE.put(cacheKey, JSON.stringify(cacheData), {
      expirationTtl: options.ttl || 3600,
      metadata: {
        type: cacheType,
        cached_at: now
      }
    });
    
    return true;
  } catch (err) {
    console.error('[KV Cache] 保存失败:', err);
    return false;
  }
}

/**
 * 删除 KV 缓存
 */
export async function deleteKVCache(env, cacheKey) {
  try {
    if (!env.CACHE) return;
    await env.CACHE.delete(cacheKey);
  } catch (err) {
    console.error('[KV Cache] 删除失败:', err);
  }
}

/**
 * 批量删除 KV 缓存（按前缀）
 */
export async function deleteKVCacheByPrefix(env, prefix) {
  try {
    if (!env.CACHE) return;
    const list = await env.CACHE.list({ prefix });
    // 限制刪除數量，避免超時
    const keysToDelete = list.keys.slice(0, 100);  // 最多刪除 100 個鍵
    const deletePromises = keysToDelete.map(key => env.CACHE.delete(key.name));
    await Promise.all(deletePromises);
    if (list.keys.length > 100) {
      console.warn(`[KV Cache] 緩存鍵數量超過限制 (${list.keys.length})，只刪除了前 100 個`);
    }
  } catch (err) {
    console.error('[KV Cache] 批量删除失败:', err);
  }
}

/**
 * 刪除特定月份的儀表板緩存
 */
export async function deleteDashboardCacheByMonth(env, ym) {
  try {
    if (!env.CACHE) return;
    // 只清除包含該月份的緩存鍵
    const prefix = 'dashboard:';
    const list = await env.CACHE.list({ prefix });
    const monthPattern = `ym=${ym}`;
    const keysToDelete = list.keys
      .filter(key => key.name.includes(monthPattern))
      .slice(0, 50);  // 最多刪除 50 個鍵（通常是足夠的）
    
    if (keysToDelete.length > 0) {
      const deletePromises = keysToDelete.map(key => env.CACHE.delete(key.name));
      await Promise.all(deletePromises);
      console.log(`[KV Cache] 已刪除 ${keysToDelete.length} 個儀表板緩存鍵 (月份: ${ym})`);
    }
  } catch (err) {
    console.error('[KV Cache] 刪除儀表板緩存失敗:', err);
  }
}

/**
 * 从 D1 获取缓存
 */
export async function getD1Cache(env, cacheKey) {
  try {
    if (!env.DATABASE) return null;
    
    const cache = await env.DATABASE.prepare(
      `SELECT cached_data, last_updated_at, hit_count, data_version
       FROM UniversalDataCache
       WHERE cache_key = ? AND invalidated = 0`
    ).bind(cacheKey).first();
    
    if (!cache) return null;
    
    // 更新访问统计
    await env.DATABASE.prepare(
      `UPDATE UniversalDataCache 
       SET last_accessed_at = datetime('now'), 
           hit_count = hit_count + 1 
       WHERE cache_key = ?`
    ).bind(cacheKey).run();
    
    return {
      data: JSON.parse(cache.cached_data || '{}'),
      meta: {
        cached: true,
        hit_count: (cache.hit_count || 0) + 1,
        version: cache.data_version,
        last_updated: cache.last_updated_at
      }
    };
  } catch (err) {
    console.error('[D1 Cache] 读取失败:', err);
    return null;
  }
}

/**
 * 保存数据到 D1
 */
export async function saveD1Cache(env, cacheKey, cacheType, data, options = {}) {
  try {
    if (!env.DATABASE) return false;
    
    const now = new Date().toISOString();
    const cachedData = JSON.stringify(data);
    const dataSize = new TextEncoder().encode(cachedData).length;
    const userId = options.userId || null;
    const scopeParams = options.scopeParams ? JSON.stringify(options.scopeParams) : null;
    
    await env.DATABASE.prepare(
      `INSERT INTO UniversalDataCache (cache_key, cache_type, cached_data, data_version, invalidated, user_id, scope_params, data_size, last_updated_at, last_accessed_at, created_at)
       VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         cached_data = excluded.cached_data,
         data_version = data_version + 1,
         invalidated = 0,
         data_size = excluded.data_size,
         last_updated_at = excluded.last_updated_at,
         last_accessed_at = excluded.last_accessed_at`
    ).bind(cacheKey, cacheType, cachedData, userId, scopeParams, dataSize, now, now, now).run();
    
    return true;
  } catch (err) {
    console.error('[D1 Cache] 保存失败:', err);
    return false;
  }
}

/**
 * 失效 D1 缓存
 */
export async function invalidateD1Cache(env, cacheKey) {
  try {
    if (!env.DATABASE) return;
    await env.DATABASE.prepare(
      `UPDATE UniversalDataCache SET invalidated = 1 WHERE cache_key = ?`
    ).bind(cacheKey).run();
  } catch (err) {
    console.error('[D1 Cache] 失效失败:', err);
  }
}

/**
 * 批量失效 D1 缓存（按类型）
 */
export async function invalidateD1CacheByType(env, cacheType, filters = {}) {
  try {
    if (!env.DATABASE) return;
    
    let sql = `UPDATE UniversalDataCache SET invalidated = 1 WHERE cache_type = ?`;
    const binds = [cacheType];
    
    if (filters.userId) {
      sql += ` AND user_id = ?`;
      binds.push(filters.userId);
    }
    
    await env.DATABASE.prepare(sql).bind(...binds).run();
  } catch (err) {
    console.error('[D1 Cache] 批量失效失败:', err);
  }
}

/**
 * 混合缓存策略：优先 KV，降级到 D1
 */
export async function getHybridCache(env, cacheKey, fetchData, options = {}) {
  try {
    // 1. 先尝试 KV（极快）
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached) {
      return { ...kvCached, source: 'kv' };
    }
    
    // 2. KV未命中，尝试D1（备份缓存）
    if (options.useD1Fallback !== false) {
      const d1Cached = await getD1Cache(env, cacheKey);
      if (d1Cached) {
        // 异步同步回KV
        saveKVCache(env, cacheKey, options.cacheType, d1Cached.data, options)
          .catch(() => {});
        return { ...d1Cached, source: 'd1' };
      }
    }
    
    // 3. 都未命中，获取新数据
    const freshData = await fetchData();
    
    // 4. 并行保存到KV和D1
    await Promise.all([
      saveKVCache(env, cacheKey, options.cacheType, freshData, options),
      options.useD1Fallback !== false && saveD1Cache(env, cacheKey, options.cacheType, freshData, options)
    ].filter(Boolean));
    
    return {
      data: freshData,
      meta: { cached: false, source: 'fresh' }
    };
  } catch (err) {
    console.error('[Hybrid Cache] 失败:', err);
    // 降级：直接获取数据
    const freshData = await fetchData();
    return {
      data: freshData,
      meta: { cached: false, source: 'error_fallback' }
    };
  }
}



