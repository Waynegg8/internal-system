-- ============================================
-- 0007_knowledge.sql
-- 整合自以下遷移文件:
--   - 2025-10-30T000900Z_sop.sql
--   - 2025-10-30T000800Z_attachments.sql
--   - 2025-10-30T001100Z_cms.sql
--   - 2025-11-01T190000Z_create_internal_faq.sql
--   - 2025-11-01T200000Z_create_sop_relations.sql
--   - 2025-11-01T210000Z_create_internal_documents.sql
--   - 2025-11-02T050000Z_add_sop_scope.sql
--   - 2025-11-02T060000Z_add_scope_to_faq_documents.sql
--   - 2025-11-02T070000Z_set_default_scope_for_existing_data.sql
--   - 2025-11-02T090000Z_add_client_id_to_knowledge.sql
--   - 2025-11-02T100000Z_add_date_task_to_documents.sql
--   - 2025-11-08T000000Z_migrate_attachments_to_documents.sql
--   - 2025-11-08T010000Z_migrate_task_template_attachments.sql
-- ============================================

-- ============================================
-- 來源: 2025-10-30T000900Z_sop.sql
-- ============================================

-- SOPDocuments（知識庫 SOP 文件）

CREATE TABLE IF NOT EXISTS SOPDocuments (
  sop_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT,                         -- JSON 陣列字串，如 ["月結","報稅"]
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  -- 從後續遷移移過來的欄位
  scope TEXT DEFAULT 'internal',
  client_id TEXT,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id)
);

CREATE INDEX IF NOT EXISTS idx_sop_published ON SOPDocuments(is_published);
CREATE INDEX IF NOT EXISTS idx_sop_category ON SOPDocuments(category);
CREATE INDEX IF NOT EXISTS idx_sop_creator ON SOPDocuments(created_by);





-- ============================================
-- 來源: 2025-10-30T000800Z_attachments.sql
-- ============================================

-- Attachments (檔案附件)

CREATE TABLE IF NOT EXISTS Attachments (
  attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,              -- client | receipt | sop | task
  entity_id TEXT NOT NULL,
  object_key TEXT NOT NULL,               -- R2 物件鍵（未來上傳/下載用）
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploader_user_id INTEGER NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  CHECK (entity_type IN ('client','receipt','sop','task')),
  FOREIGN KEY (uploader_user_id) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON Attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_at ON Attachments(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_attachments_filename ON Attachments(filename);





-- ============================================
-- 來源: 2025-10-30T001100Z_cms.sql
-- ============================================

-- ExternalArticles (Blog 文章)
CREATE TABLE IF NOT EXISTS ExternalArticles (
  article_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  category TEXT,
  tags TEXT,
  is_published BOOLEAN DEFAULT 0,
  published_at TEXT,
  view_count INTEGER DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ext_articles_category ON ExternalArticles(category);
CREATE INDEX IF NOT EXISTS idx_ext_articles_published ON ExternalArticles(is_published);

-- ExternalFAQ
CREATE TABLE IF NOT EXISTS ExternalFAQ (
  faq_id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ext_faq_category ON ExternalFAQ(category);
CREATE INDEX IF NOT EXISTS idx_ext_faq_published ON ExternalFAQ(is_published);
CREATE INDEX IF NOT EXISTS idx_ext_faq_sort ON ExternalFAQ(sort_order);

-- ResourceCenter（資源下載）
CREATE TABLE IF NOT EXISTS ResourceCenter (
  resource_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT,
  cover_image TEXT,
  is_published BOOLEAN DEFAULT 1,
  download_count INTEGER DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rc_published ON ResourceCenter(is_published);
CREATE INDEX IF NOT EXISTS idx_rc_category ON ResourceCenter(category);
CREATE INDEX IF NOT EXISTS idx_rc_file_type ON ResourceCenter(file_type);

-- ExternalServices（服務介紹）
CREATE TABLE IF NOT EXISTS ExternalServices (
  service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  hero_image TEXT,
  is_published BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ext_services_published ON ExternalServices(is_published);
CREATE INDEX IF NOT EXISTS idx_ext_services_sort ON ExternalServices(sort_order);





-- ============================================
-- 來源: 2025-11-01T190000Z_create_internal_faq.sql
-- ============================================

-- 创建内部常见问答表
-- 2025-11-01

CREATE TABLE IF NOT EXISTS InternalFAQ (
  faq_id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,  -- 与SOP共用分类：accounting, tax, business, internal
  tags TEXT,      -- JSON 数组字串，如 ["月结","报税"]
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  -- 從後續遷移移過來的欄位
  scope TEXT DEFAULT 'internal',
  client_id TEXT,
  FOREIGN KEY (created_by) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_internal_faq_category ON InternalFAQ(category);
CREATE INDEX IF NOT EXISTS idx_internal_faq_deleted ON InternalFAQ(is_deleted);
CREATE INDEX IF NOT EXISTS idx_internal_faq_created_by ON InternalFAQ(created_by);




-- ============================================
-- 來源: 2025-11-01T200000Z_create_sop_relations.sql
-- ============================================

-- 创建SOP关联表（支持多对多）
-- 2025-11-01

-- 1. 任务模板阶段与SOP的多对多关系
CREATE TABLE IF NOT EXISTS TaskTemplateStageSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (stage_id) REFERENCES TaskTemplateStages(stage_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(stage_id, sop_id)
);

CREATE INDEX IF NOT EXISTS idx_template_stage_sops_stage ON TaskTemplateStageSOPs(stage_id);
CREATE INDEX IF NOT EXISTS idx_template_stage_sops_sop ON TaskTemplateStageSOPs(sop_id);

-- 2. 服务组成部分与SOP的多对多关系
CREATE TABLE IF NOT EXISTS ServiceComponentSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (component_id) REFERENCES ServiceComponents(component_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(component_id, sop_id)
);

CREATE INDEX IF NOT EXISTS idx_service_component_sops_component ON ServiceComponentSOPs(component_id);
CREATE INDEX IF NOT EXISTS idx_service_component_sops_sop ON ServiceComponentSOPs(sop_id);

-- 3. 活动任务与SOP的多对多关系（运行时）
CREATE TABLE IF NOT EXISTS ActiveTaskSOPs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE CASCADE,
  UNIQUE(task_id, sop_id)
);

CREATE INDEX IF NOT EXISTS idx_active_task_sops_task ON ActiveTaskSOPs(task_id);
CREATE INDEX IF NOT EXISTS idx_active_task_sops_sop ON ActiveTaskSOPs(sop_id);

-- 4. InternalFAQ与任务/服务的关系（也支持多对多）
CREATE TABLE IF NOT EXISTS TaskTemplateStageFAQs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  faq_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (stage_id) REFERENCES TaskTemplateStages(stage_id) ON DELETE CASCADE,
  FOREIGN KEY (faq_id) REFERENCES InternalFAQ(faq_id) ON DELETE CASCADE,
  UNIQUE(stage_id, faq_id)
);

CREATE INDEX IF NOT EXISTS idx_template_stage_faqs_stage ON TaskTemplateStageFAQs(stage_id);
CREATE INDEX IF NOT EXISTS idx_template_stage_faqs_faq ON TaskTemplateStageFAQs(faq_id);

CREATE TABLE IF NOT EXISTS ServiceComponentFAQs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  component_id INTEGER NOT NULL,
  faq_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (component_id) REFERENCES ServiceComponents(component_id) ON DELETE CASCADE,
  FOREIGN KEY (faq_id) REFERENCES InternalFAQ(faq_id) ON DELETE CASCADE,
  UNIQUE(component_id, faq_id)
);

CREATE INDEX IF NOT EXISTS idx_service_component_faqs_component ON ServiceComponentFAQs(component_id);
CREATE INDEX IF NOT EXISTS idx_service_component_faqs_faq ON ServiceComponentFAQs(faq_id);

CREATE TABLE IF NOT EXISTS ActiveTaskFAQs (
  relation_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  faq_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (faq_id) REFERENCES InternalFAQ(faq_id) ON DELETE CASCADE,
  UNIQUE(task_id, faq_id)
);

CREATE INDEX IF NOT EXISTS idx_active_task_faqs_task ON ActiveTaskFAQs(task_id);
CREATE INDEX IF NOT EXISTS idx_active_task_faqs_faq ON ActiveTaskFAQs(faq_id);

-- 注意：保留原有的单一SOP字段（sop_id）作为向后兼容，但优先使用关联表





-- ============================================
-- 來源: 2025-11-01T210000Z_create_internal_documents.sql
-- ============================================

-- 内部文档资源中心表
CREATE TABLE IF NOT EXISTS InternalDocuments (
  document_id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 文档信息
  title TEXT NOT NULL,                    -- 文档标题
  description TEXT,                       -- 文档描述
  file_name TEXT NOT NULL,                -- 原始文件名
  file_url TEXT NOT NULL,                 -- R2存储的URL
  file_size INTEGER,                      -- 文件大小（字节）
  file_type TEXT,                         -- MIME类型
  
  -- 分类和标签
  category TEXT,                          -- 分类：contract, finance, hr, tax, other
  tags TEXT,                              -- 标签，逗号分隔
  
  -- 元数据
  uploaded_by INTEGER,                    -- 上传者user_id
  created_at TEXT NOT NULL,               -- 创建时间
  updated_at TEXT NOT NULL,               -- 更新时间
  is_deleted INTEGER DEFAULT 0,           -- 软删除标记
  -- 從後續遷移移過來的欄位
  scope TEXT DEFAULT 'internal',
  client_id TEXT,
  year_month TEXT,
  doc_year INTEGER,
  doc_month INTEGER,
  related_task_id INTEGER,
  
  FOREIGN KEY (uploaded_by) REFERENCES Users(user_id),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (related_task_id) REFERENCES ActiveTasks(task_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_internal_documents_category ON InternalDocuments(category);
CREATE INDEX IF NOT EXISTS idx_internal_documents_uploaded_by ON InternalDocuments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_internal_documents_created_at ON InternalDocuments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_documents_is_deleted ON InternalDocuments(is_deleted);




-- ============================================
-- 來源: 2025-11-02T050000Z_add_sop_scope.sql
-- ============================================

-- 為SOP添加作用範圍字段（服務層級 vs 任務層級）
-- 2025-11-02

-- 添加scope字段：service（服務層級）、task（任務層級）
-- 注意：scope 欄位已在 CREATE TABLE 時定義，跳過 ALTER TABLE
-- ALTER TABLE SOPDocuments ADD COLUMN scope TEXT;

-- 創建索引以提升查詢效率
CREATE INDEX IF NOT EXISTS idx_sop_scope ON SOPDocuments(scope);

-- 說明：
-- - scope = 'service'：服務層級SOP，適用於整個服務的通用流程，會自動關聯到該服務的所有任務
-- - scope = 'task'：任務層級SOP，適用於特定任務的詳細步驟，由用戶在創建任務時手動選擇
-- - 必須明確指定scope，不允許為NULL或其他值




-- ============================================
-- 來源: 2025-11-02T060000Z_add_scope_to_faq_documents.sql
-- ============================================

-- 为InternalFAQ和InternalDocuments添加scope字段
-- 2025-11-02

-- 为InternalFAQ添加scope字段
-- 注意：scope 欄位已在 CREATE TABLE 時定義，跳過 ALTER TABLE
-- ALTER TABLE InternalFAQ ADD COLUMN scope TEXT;

-- 为InternalDocuments添加scope字段
-- 注意：scope 欄位將在 CREATE TABLE 時定義，跳過 ALTER TABLE
-- ALTER TABLE InternalDocuments ADD COLUMN scope TEXT;

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_internal_faq_scope ON InternalFAQ(scope);
CREATE INDEX IF NOT EXISTS idx_internal_documents_scope ON InternalDocuments(scope);




-- ============================================
-- 來源: 2025-11-02T070000Z_set_default_scope_for_existing_data.sql
-- ============================================

-- 為現有的知識庫內容設置默認scope值
-- 2025-11-02

-- 為現有的SOP設置默認scope為'task'（任務層級）
UPDATE SOPDocuments 
SET scope = 'task' 
WHERE scope IS NULL;

-- 為現有的FAQ設置默認scope為'task'（任務層級）
UPDATE InternalFAQ 
SET scope = 'task' 
WHERE scope IS NULL;

-- 為現有的資源文檔設置默認scope為'task'（任務層級）
UPDATE InternalDocuments 
SET scope = 'task' 
WHERE scope IS NULL;

-- 說明：
-- 將所有現有的知識庫內容默認設置為任務層級(task)
-- 這樣可以確保現有數據在新系統中仍然可見
-- 管理員可以稍後根據實際情況將部分內容調整為服務層級(service)




-- ============================================
-- 來源: 2025-11-02T090000Z_add_client_id_to_knowledge.sql
-- ============================================

-- 为知识库相关表添加客户关联字段
-- 2025-11-02
-- 注意：如果字段已存在，此迁移可能已经运行过，跳过即可

-- 为SOP文档表添加索引（字段可能已存在）
CREATE INDEX IF NOT EXISTS idx_sop_client_id ON SOPDocuments(client_id);

-- 为FAQ表添加索引（字段可能已存在）
CREATE INDEX IF NOT EXISTS idx_faq_client_id ON InternalFAQ(client_id);

-- 为内部文档表添加索引（字段可能已存在）
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON InternalDocuments(client_id);




-- ============================================
-- 來源: 2025-11-02T100000Z_add_date_task_to_documents.sql
-- ============================================

-- 为知识库文档表添加年月和任务关联字段
-- 2025-11-02
-- 注意：如果字段已存在，此迁移可能已经运行过

-- 添加索引（字段已在 CREATE TABLE 時定義）
CREATE INDEX IF NOT EXISTS idx_internal_documents_year_month ON InternalDocuments(doc_year, doc_month);
CREATE INDEX IF NOT EXISTS idx_internal_documents_task_id ON InternalDocuments(related_task_id);

-- 备注：
-- doc_year: 文档所属年份（例如：2025）
-- doc_month: 文档所属月份（1-12）
-- task_id: 关联的任务ID（如果是从任务上传的）





-- ============================================
-- 來源: 2025-11-08T000000Z_migrate_attachments_to_documents.sql
-- ============================================

-- 遷移附件系統到知識庫
-- 2025-11-08

-- 1. 為 InternalDocuments 添加關聯字段
ALTER TABLE InternalDocuments ADD COLUMN related_entity_type TEXT;
ALTER TABLE InternalDocuments ADD COLUMN related_entity_id TEXT;

-- 2. 創建索引以提升查詢性能
CREATE INDEX IF NOT EXISTS idx_internal_documents_related 
ON InternalDocuments(related_entity_type, related_entity_id);

CREATE INDEX IF NOT EXISTS idx_internal_documents_category_related 
ON InternalDocuments(category, related_entity_type);

-- 3. 遷移現有 Attachments 數據到 InternalDocuments
INSERT INTO InternalDocuments (
  title,
  description,
  file_name,
  file_url,
  file_size,
  file_type,
  category,
  scope,
  related_entity_type,
  related_entity_id,
  uploaded_by,
  created_at,
  updated_at,
  is_deleted
)
SELECT 
  filename as title,
  'Migrated from Attachments' as description,
  filename as file_name,
  object_key as file_url,
  size_bytes as file_size,
  content_type as file_type,
  'attachment' as category,
  'task' as scope,
  entity_type as related_entity_type,
  entity_id as related_entity_id,
  uploader_user_id as uploaded_by,
  uploaded_at as created_at,
  uploaded_at as updated_at,
  is_deleted
FROM Attachments
WHERE entity_type IN ('client', 'receipt', 'task')
  AND is_deleted = 0;

-- 4. 標記 Attachments 表為已廢棄（保留數據以防需要回滾）
-- 不刪除表，只添加註釋
-- DROP TABLE IF EXISTS Attachments;  -- 暫時保留

-- 說明：
-- - 遷移客戶、收據、任務的附件到知識庫
-- - 不遷移 SOP 附件（entity_type='sop'），因為 SOP 本身就在知識庫
-- - related_entity_type 記錄原始的 entity_type
-- - related_entity_id 記錄原始的 entity_id
-- - 所有附件的 category='attachment'，scope='task'





-- ============================================
-- 來源: 2025-11-08T010000Z_migrate_task_template_attachments.sql
-- ============================================

-- 遷移任務模板階段的文檔引用
-- 將 TaskTemplateStages.attachment_id 改為引用 InternalDocuments (資源中心)

-- 1. 創建新字段
ALTER TABLE TaskTemplateStages ADD COLUMN document_id INTEGER;

-- 2. 創建索引
CREATE INDEX IF NOT EXISTS idx_template_stages_document ON TaskTemplateStages(document_id);

-- 3. 說明：
-- - attachment_id（舊）：原本指向 Attachments 表，現已廢棄
-- - document_id（新）：指向 InternalDocuments 表，用於綁定資源中心的文檔
-- - 資源中心文檔：category='resource'，包含範本、法規等可重複使用的檔案
-- - 保留 attachment_id 字段以便回滾
-- 
-- 使用方式：
-- 任務模板可以綁定資源中心的文檔（如：記帳範本.xlsx、稅務申報指南.pdf）
-- 這些文檔在多個任務中共用，不屬於特定任務的附件



