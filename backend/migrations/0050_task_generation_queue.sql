-- 創建任務生成隊列表，預先計算需要生成的任務
-- 這樣可以減少查詢次數，提高生成效率

CREATE TABLE IF NOT EXISTS TaskGenerationQueue (
  queue_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  client_service_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  config_id INTEGER NOT NULL,
  target_year INTEGER NOT NULL,
  target_month INTEGER NOT NULL,
  generation_time TEXT,
  due_date TEXT,
  is_fixed_deadline INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT,
  error_message TEXT,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (config_id) REFERENCES ClientServiceTaskConfigs(config_id),
  UNIQUE(client_service_id, config_id, target_year, target_month)
);

CREATE INDEX IF NOT EXISTS idx_task_generation_queue_status ON TaskGenerationQueue(status, target_year, target_month);
CREATE INDEX IF NOT EXISTS idx_task_generation_queue_client ON TaskGenerationQueue(client_id, target_year, target_month);
CREATE INDEX IF NOT EXISTS idx_task_generation_queue_service ON TaskGenerationQueue(client_service_id, target_year, target_month);


