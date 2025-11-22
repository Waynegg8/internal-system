-- ============================================
-- 0032_client_collaborators.sql
-- 客戶協作表：允許多個員工協作處理同一個客戶
-- ============================================

-- 創建客戶協作表
CREATE TABLE IF NOT EXISTS ClientCollaborators (
  collaboration_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  created_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  UNIQUE(client_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_client_collaborators_client ON ClientCollaborators(client_id);
CREATE INDEX IF NOT EXISTS idx_client_collaborators_user ON ClientCollaborators(user_id);










