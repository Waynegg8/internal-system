-- ============================================
-- 0043_receipt_edit_history.sql
-- ReceiptEditHistory 表用於記錄收據編輯歷史
-- ============================================

-- ReceiptEditHistory 表
CREATE TABLE IF NOT EXISTS ReceiptEditHistory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  modified_by INTEGER NOT NULL,
  modified_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (receipt_id) REFERENCES Receipts(receipt_id),
  FOREIGN KEY (modified_by) REFERENCES Users(user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_receipt_edit_history_receipt_id ON ReceiptEditHistory(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_edit_history_modified_at ON ReceiptEditHistory(modified_at);


