-- ============================================
-- 創建 CacheData 表用於 D1 緩存
-- ============================================

CREATE TABLE IF NOT EXISTS CacheData (
  cache_key TEXT PRIMARY KEY,
  cache_type TEXT NOT NULL,
  cache_value TEXT NOT NULL,  -- JSON 格式
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT,            -- 可選的過期時間
  is_deleted INTEGER DEFAULT 0
);

-- 創建索引以優化查詢和清理
CREATE INDEX IF NOT EXISTS idx_cache_type ON CacheData(cache_type) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_cache_expires ON CacheData(expires_at) WHERE is_deleted = 0 AND expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cache_created ON CacheData(created_at) WHERE is_deleted = 0;





