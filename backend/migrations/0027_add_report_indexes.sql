-- ============================================
-- 報表相關查詢索引強化
-- ============================================

CREATE INDEX IF NOT EXISTS idx_receipts_service_month
  ON Receipts(service_month)
  WHERE is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_receipts_client_service_month
  ON Receipts(client_id, service_month)
  WHERE is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_payments_receipt_id
  ON Payments(receipt_id)
  WHERE is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_timesheets_client_month
  ON Timesheets(client_id, substr(work_date, 1, 7))
  WHERE is_deleted = 0;

CREATE INDEX IF NOT EXISTS idx_timesheets_user_month
  ON Timesheets(user_id, substr(work_date, 1, 7))
  WHERE is_deleted = 0;




