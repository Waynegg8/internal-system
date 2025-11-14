-- ============================================
-- 0008_services.sql
-- 整合自以下遷移文件:
--   - 2025-10-31T000000Z_add_service_structure.sql
--   - 2025-11-01T225900Z_create_service_components.sql
--   - 2025-11-01T230000Z_service_component_tasks_sops.sql
--   - 2025-11-02T040000Z_fix_service_codes.sql
--   - 2025-11-07T130000Z_add_service_level_sop.sql
-- ============================================

-- ============================================
-- 來源: 2025-10-31T000000Z_add_service_structure.sql
-- ============================================

-- 服務項目結構擴充
-- 新增服務項目和服務子項目表，並更新 Timesheets 表支援兩層結構

-- 1. 創建服務項目主表
CREATE TABLE IF NOT EXISTS Services (
  service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  service_code TEXT UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_active ON Services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_code ON Services(service_code);

-- 2. 創建服務子項目表
CREATE TABLE IF NOT EXISTS ServiceItems (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  item_code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES Services(service_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_service_items_service ON ServiceItems(service_id);
CREATE INDEX IF NOT EXISTS idx_service_items_active ON ServiceItems(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_items_code ON ServiceItems(service_id, item_code);

-- 3. 更新 Timesheets 表（添加新欄位）
-- 注意：SQLite 的 ALTER TABLE 不支援直接修改欄位，需要重建表
-- 但為了保持向後相容性，我們先添加新欄位，保留舊的 service_name 欄位

ALTER TABLE Timesheets ADD COLUMN service_id INTEGER;
ALTER TABLE Timesheets ADD COLUMN service_item_id INTEGER;

-- 添加外鍵索引（SQLite 在 ALTER TABLE 後無法添加 FOREIGN KEY，僅添加索引）
CREATE INDEX IF NOT EXISTS idx_timesheets_service ON Timesheets(service_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_service_item ON Timesheets(service_item_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_client_service ON Timesheets(client_id, service_id, service_item_id);

-- 4. 插入預設服務項目
INSERT INTO Services (service_id, service_name, service_code, description, sort_order) VALUES
  (1, '記帳服務', 'ACCOUNTING', '提供日常帳務處理、憑證整理、帳簿登載等服務', 1),
  (2, '稅務申報', 'TAX_FILING', '提供各類稅務申報服務，包含營所稅、營業稅、綜所稅等', 2),
  (3, '顧問諮詢', 'CONSULTING', '提供稅務諮詢、財務規劃、內控顧問等專業服務', 3),
  (4, '工商登記', 'BUSINESS_REG', '提供公司設立、變更、解散等工商登記服務', 4),
  (5, '審計服務', 'AUDIT', '提供財務簽證、稅務查核等審計服務', 5);

-- 5. 插入預設服務子項目

-- 記帳服務子項目
INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order) VALUES
  (1, '收集憑證', 'ACC_COLLECT', '收集整理客戶提供的各類原始憑證', 1),
  (1, '輸入帳務', 'ACC_INPUT', '將憑證資料輸入會計系統', 2),
  (1, '月結對帳', 'ACC_RECONCILE', '執行月底結帳與帳務對帳作業', 3),
  (1, '報表產製', 'ACC_REPORT', '產製財務報表與管理報表', 4);

-- 稅務申報子項目
INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order) VALUES
  (2, '營所稅申報', 'TAX_BUSINESS', '營利事業所得稅結算申報', 1),
  (2, '營業稅申報', 'TAX_VAT', '營業稅申報（401、403表）', 2),
  (2, '個人綜所稅', 'TAX_PERSONAL', '個人綜合所得稅申報', 3),
  (2, '扣繳申報', 'TAX_WITHHOLD', '各類所得扣繳申報', 4);

-- 顧問諮詢子項目
INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order) VALUES
  (3, '稅務諮詢', 'CONS_TAX', '提供稅務相關問題諮詢', 1),
  (3, '財務規劃', 'CONS_FIN', '協助客戶進行財務規劃', 2),
  (3, '內控顧問', 'CONS_CONTROL', '提供內部控制制度建立與改善建議', 3),
  (3, '公司設立', 'CONS_SETUP', '協助公司設立規劃與諮詢', 4);

-- 工商登記子項目
INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order) VALUES
  (4, '公司設立登記', 'REG_SETUP', '辦理公司設立登記', 1),
  (4, '公司變更登記', 'REG_CHANGE', '辦理公司各項變更登記', 2),
  (4, '公司解散登記', 'REG_DISSOLVE', '辦理公司解散與清算登記', 3),
  (4, '商業登記', 'REG_BUSINESS', '辦理商業登記相關事項', 4);

-- 審計服務子項目
INSERT INTO ServiceItems (service_id, item_name, item_code, description, sort_order) VALUES
  (5, '財務簽證', 'AUDIT_FIN', '財務報表查核簽證', 1),
  (5, '稅務查核', 'AUDIT_TAX', '稅務查核簽證', 2),
  (5, '專案審計', 'AUDIT_PROJECT', '特定項目專案審計', 3),
  (5, '內部稽核', 'AUDIT_INTERNAL', '內部稽核作業', 4);

-- 6. 更新 ClientServices 表的 service_id 關聯
-- 為現有的 ClientServices 記錄設定預設的 service_id（如果為 NULL）
UPDATE ClientServices SET service_id = 1 WHERE service_id IS NULL AND is_deleted = 0;






-- ============================================
-- 來源: 2025-11-01T225900Z_create_service_components.sql
-- ============================================

-- 创建服务组成部分表
-- 2025-11-01

CREATE TABLE IF NOT EXISTS ServiceComponents (
  component_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  service_id INTEGER,
  service_item_id INTEGER,
  component_name TEXT NOT NULL,
  delivery_frequency TEXT DEFAULT 'monthly',
  delivery_months TEXT,
  task_template_id INTEGER,
  auto_generate_task BOOLEAN DEFAULT 1,
  advance_days INTEGER DEFAULT 7,
  due_date_rule TEXT,
  due_date_value INTEGER,
  due_date_offset_days INTEGER DEFAULT 0,
  estimated_hours REAL,
  sop_id INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (service_item_id) REFERENCES ServiceItems(item_id),
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(template_id),
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id)
);

CREATE INDEX IF NOT EXISTS idx_service_components_client_service ON ServiceComponents(client_service_id);
CREATE INDEX IF NOT EXISTS idx_service_components_service ON ServiceComponents(service_id);
CREATE INDEX IF NOT EXISTS idx_service_components_item ON ServiceComponents(service_item_id);
CREATE INDEX IF NOT EXISTS idx_service_components_template ON ServiceComponents(task_template_id);
CREATE INDEX IF NOT EXISTS idx_service_components_active ON ServiceComponents(is_active);




-- ============================================
-- 來源: 2025-11-01T230000Z_service_component_tasks_sops.sql
-- ============================================

-- 服务组成任务配置表（存储手动配置的任务及其SOP）
-- 2025-11-01

-- 服务组成任务配置
CREATE TABLE IF NOT EXISTS ServiceComponentTasks (
  config_id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id INTEGER NOT NULL,
  task_order INTEGER NOT NULL,
  task_name TEXT NOT NULL,
  assignee_user_id INTEGER,
  notes TEXT,
  due_rule TEXT DEFAULT 'end_of_month',
  due_value INTEGER,
  estimated_hours REAL,
  advance_days INTEGER DEFAULT 7,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (component_id) REFERENCES ServiceComponents(component_id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_user_id) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_service_component_tasks_component ON ServiceComponentTasks(component_id);

-- 服务组成任务配置的SOP关联（任务层级的SOP）
CREATE TABLE IF NOT EXISTS ServiceComponentTaskSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_config_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_config_id) REFERENCES ServiceComponentTasks(config_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(task_config_id, sop_id)
);

CREATE INDEX IF NOT EXISTS idx_service_component_task_sops_task ON ServiceComponentTaskSOPs(task_config_id);
CREATE INDEX IF NOT EXISTS idx_service_component_task_sops_sop ON ServiceComponentTaskSOPs(sop_id);




-- ============================================
-- 來源: 2025-11-02T040000Z_fix_service_codes.sql
-- ============================================

-- 修正服務類型代碼，與SOP分類保持一致
-- 2025-11-02

-- 統一使用小寫，與knowledge.html中的category選項保持一致
UPDATE Services SET service_code = 'accounting' WHERE service_code = 'ACCOUNTING';
UPDATE Services SET service_code = 'tax' WHERE service_code = 'TAX_FILING';
UPDATE Services SET service_code = 'consulting' WHERE service_code = 'CONSULTING';

-- 確保其他可能的服務類型也使用小寫
-- 如果未來新增服務，請使用與knowledge.html一致的category值：
-- accounting（記帳流程）
-- tax（稅務流程）
-- business（工商登記）
-- hr（人事管理）
-- finance（財務管理）
-- internal（內部流程）
-- other（其他）




-- ============================================
-- 來源: 2025-11-07T130000Z_add_service_level_sop.sql
-- ============================================

-- 為服務項目添加服務層級SOP
-- 2025-11-07

-- 添加service_sop_id字段到Services表
ALTER TABLE Services ADD COLUMN service_sop_id INTEGER;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_services_sop ON Services(service_sop_id);

-- 說明：
-- service_sop_id：服務層級的SOP，代表整個服務的通用流程
-- 當創建任務模板時，會自動繼承該服務的service_sop_id
-- 每個任務還可以在TaskTemplateStages中設置任務層級的SOP（sop_id和attachment_id）



