-- ============================================
-- 關聯表：股東與董監事
-- 建立表與索引，並嘗試自 Clients 既有 JSON 欄位做一次性資料轉入
-- ============================================

-- 股東表
CREATE TABLE IF NOT EXISTS Shareholders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  share_percentage REAL,
  share_count INTEGER,
  share_amount REAL,
  share_type TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shareholders_client_id ON Shareholders(client_id);
CREATE INDEX IF NOT EXISTS idx_shareholders_client_id_name ON Shareholders(client_id, name);
CREATE INDEX IF NOT EXISTS idx_shareholders_client_id_pct ON Shareholders(client_id, share_percentage);

-- 董監事表
CREATE TABLE IF NOT EXISTS DirectorsSupervisors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position TEXT,
  term_start TEXT,
  term_end TEXT,
  is_current INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ds_client_id ON DirectorsSupervisors(client_id);
CREATE INDEX IF NOT EXISTS idx_ds_client_id_current ON DirectorsSupervisors(client_id, is_current);
CREATE INDEX IF NOT EXISTS idx_ds_client_id_position ON DirectorsSupervisors(client_id, position);

-- 備註：
-- SQLite/D1 中對 JSON 的直接轉表不易以純 SQL 完成；
-- 若需轉移既有 JSON 欄位（Clients.shareholders / Clients.directors_supervisors）資料，
-- 建議在後端程式於讀取時做一次性落庫，或提供一次性遷移腳本。








