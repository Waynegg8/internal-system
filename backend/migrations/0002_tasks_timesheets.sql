-- ============================================
-- 0002_tasks_timesheets.sql
-- 整合自以下遷移文件:
--   - 2025-10-30T000200Z_tasks.sql
--   - 2025-10-30T000300Z_timesheets.sql
--   - 2025-10-31T020100Z_create_task_templates.sql
--   - 2025-10-31T020400Z_enhance_tasks.sql
--   - 2025-10-31T030000Z_add_client_id_to_task_templates.sql
--   - 2025-10-31T030100Z_add_sop_attachment_to_stages.sql
--   - 2025-11-02T000000Z_add_task_fields.sql
--   - 2025-11-02T000100Z_task_status_updates.sql
--   - 2025-11-02T000200Z_task_due_date_adjustments.sql
--   - 2025-11-02T020000Z_add_status_fields.sql
--   - 2025-11-02T080000Z_remove_pending_status.sql
-- ============================================

-- ============================================
-- 來源: 2025-10-30T000200Z_tasks.sql
-- ============================================

-- 任務管理（最小可用：清單 API 所需）

-- ClientServices（最小欄位集合，供 JOIN 客戶）
CREATE TABLE IF NOT EXISTS ClientServices (
  client_service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  service_id INTEGER,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  -- 從 0001_core_tables.sql 移過來的欄位
  suspended_at TEXT,
  resumed_at TEXT,
  suspension_reason TEXT,
  suspension_effective_date TEXT,
  auto_renew BOOLEAN DEFAULT 1,
  cancelled_at TEXT,
  cancelled_by INTEGER,
  service_cycle TEXT DEFAULT 'monthly',
  task_template_id INTEGER,
  auto_generate_tasks BOOLEAN DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_client_services_client ON ClientServices(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_status ON ClientServices(status);
CREATE INDEX IF NOT EXISTS idx_client_services_suspend_effective ON ClientServices(suspension_effective_date);
CREATE INDEX IF NOT EXISTS idx_client_services_cycle ON ClientServices(service_cycle);
CREATE INDEX IF NOT EXISTS idx_client_services_template ON ClientServices(task_template_id);

-- ActiveTasks（任務主表）
CREATE TABLE IF NOT EXISTS ActiveTasks (
  task_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_service_id INTEGER NOT NULL,
  template_id INTEGER,
  task_name TEXT NOT NULL,
  start_date TEXT,
  due_date TEXT,
  completed_date TEXT,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  assignee_user_id INTEGER,
  related_sop_id INTEGER,
  client_specific_sop_id INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_active_tasks_assignee ON ActiveTasks(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_active_tasks_status ON ActiveTasks(status);
CREATE INDEX IF NOT EXISTS idx_active_tasks_due_date ON ActiveTasks(due_date);

-- ActiveTaskStages（任務階段）
CREATE TABLE IF NOT EXISTS ActiveTaskStages (
  active_stage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  started_at TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_active_stages_task ON ActiveTaskStages(task_id);
CREATE INDEX IF NOT EXISTS idx_active_stages_order ON ActiveTaskStages(task_id, stage_order);





-- ============================================
-- 來源: 2025-10-30T000300Z_timesheets.sql
-- ============================================

-- Timesheets（工時記錄）

CREATE TABLE IF NOT EXISTS Timesheets (
  timesheet_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,              -- YYYY-MM-DD
  client_id TEXT,                       -- 可為空（非客戶工時）
  service_name TEXT,                    -- 服務名稱文字（簡化）
  work_type TEXT NOT NULL,              -- normal | ot-weekday | ot-rest | holiday | etc.
  hours REAL NOT NULL,                  -- 0.5 的倍數
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_timesheets_user_date ON Timesheets(user_id, work_date);
CREATE INDEX IF NOT EXISTS idx_timesheets_client ON Timesheets(client_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_type ON Timesheets(work_type);





-- ============================================
-- 來源: 2025-10-31T020100Z_create_task_templates.sql
-- ============================================

-- 创建任务模板表
CREATE TABLE IF NOT EXISTS TaskTemplates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL,
  service_id INTEGER,
  description TEXT,
  sop_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id)
);

CREATE INDEX IF NOT EXISTS idx_task_templates_service ON TaskTemplates(service_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_active ON TaskTemplates(is_active);

-- 创建任务模板阶段表
CREATE TABLE IF NOT EXISTS TaskTemplateStages (
  stage_id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  description TEXT,
  estimated_hours REAL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (template_id) REFERENCES TaskTemplates(template_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_stages_template ON TaskTemplateStages(template_id);
CREATE INDEX IF NOT EXISTS idx_template_stages_order ON TaskTemplateStages(template_id, stage_order);




-- ============================================
-- 來源: 2025-10-31T020400Z_enhance_tasks.sql
-- ============================================

-- 增强ActiveTasks表（添加服务关联和收据生成标记）

ALTER TABLE ActiveTasks ADD COLUMN can_generate_receipt BOOLEAN DEFAULT 0;
-- 是否可以生成收据（最后阶段完成后设为1）

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_can_generate_receipt ON ActiveTasks(can_generate_receipt);
CREATE INDEX IF NOT EXISTS idx_tasks_client_service ON ActiveTasks(client_service_id);




-- ============================================
-- 來源: 2025-10-31T030000Z_add_client_id_to_task_templates.sql
-- ============================================

-- 为TaskTemplates表添加client_id字段，支持客户专属模板

ALTER TABLE TaskTemplates ADD COLUMN client_id INTEGER;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_templates_client ON TaskTemplates(client_id);

-- 添加外键约束（如果数据库支持）
-- FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE SET NULL




-- ============================================
-- 來源: 2025-10-31T030100Z_add_sop_attachment_to_stages.sql
-- ============================================

-- 为TaskTemplateStages添加SOP和附件连结

ALTER TABLE TaskTemplateStages ADD COLUMN sop_id INTEGER;
ALTER TABLE TaskTemplateStages ADD COLUMN attachment_id INTEGER;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_template_stages_sop ON TaskTemplateStages(sop_id);
CREATE INDEX IF NOT EXISTS idx_template_stages_attachment ON TaskTemplateStages(attachment_id);

-- 添加外键约束（注释形式，供参考）
-- FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE SET NULL
-- FOREIGN KEY (attachment_id) REFERENCES Attachments(attachment_id) ON DELETE SET NULL




-- ============================================
-- 來源: 2025-11-02T000000Z_add_task_fields.sql
-- ============================================

-- ActiveTasks 表增加字段：支持依赖关系、期限调整、状态说明

-- 依赖关系
ALTER TABLE ActiveTasks ADD COLUMN prerequisite_task_id INTEGER;
-- 前置任务ID（任务依赖）

-- 工作量评估
ALTER TABLE ActiveTasks ADD COLUMN estimated_work_days INTEGER DEFAULT 3;
-- 预估工作天数（用于自动调整到期日）

ALTER TABLE ActiveTasks ADD COLUMN original_due_date TEXT;
-- 原始到期日（保留历史记录）

-- 期限调整
ALTER TABLE ActiveTasks ADD COLUMN due_date_adjusted BOOLEAN DEFAULT 0;
-- 到期日是否被调整过

ALTER TABLE ActiveTasks ADD COLUMN adjustment_reason TEXT;
-- 调整原因

ALTER TABLE ActiveTasks ADD COLUMN adjustment_count INTEGER DEFAULT 0;
-- 调整次数统计

ALTER TABLE ActiveTasks ADD COLUMN last_adjustment_date TEXT;
-- 最后调整日期

ALTER TABLE ActiveTasks ADD COLUMN can_start_date TEXT;
-- 实际可以开始的日期（前置任务完成日期）

-- 状态说明
ALTER TABLE ActiveTasks ADD COLUMN status_note TEXT;
-- 状态说明/进度说明

ALTER TABLE ActiveTasks ADD COLUMN blocker_reason TEXT;
-- 阻塞原因（如果任务被阻塞）

ALTER TABLE ActiveTasks ADD COLUMN overdue_reason TEXT;
-- 逾期原因（如果任务逾期）

ALTER TABLE ActiveTasks ADD COLUMN last_status_update TEXT;
-- 最后更新状态说明的时间

ALTER TABLE ActiveTasks ADD COLUMN expected_completion_date TEXT;
-- 预计完成日期

ALTER TABLE ActiveTasks ADD COLUMN is_overdue BOOLEAN DEFAULT 0;
-- 是否逾期（快速查询）

ALTER TABLE ActiveTasks ADD COLUMN completed_at TEXT;
-- 完成时间（用于计算前置任务完成时间）

-- 注意：component_id 已存在于数据库中
-- 注意：service_month 已在 2025-11-01T220000Z_add_service_month.sql 中添加

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_active_tasks_prerequisite ON ActiveTasks(prerequisite_task_id);
CREATE INDEX IF NOT EXISTS idx_active_tasks_overdue ON ActiveTasks(is_overdue);
CREATE INDEX IF NOT EXISTS idx_active_tasks_completed_at ON ActiveTasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_active_tasks_adjustment_date ON ActiveTasks(last_adjustment_date);
-- 注意：idx_active_tasks_component 可能已存在
-- 注意：idx_active_tasks_service_month 已在 2025-11-01T220000Z_add_service_month.sql 中创建




-- ============================================
-- 來源: 2025-11-02T000100Z_task_status_updates.sql
-- ============================================

-- 任务状态更新记录表（保留完整历史）

CREATE TABLE IF NOT EXISTS TaskStatusUpdates (
  update_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  
  -- 基本信息
  status TEXT NOT NULL,
  updated_by INTEGER NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  
  -- 三种说明
  progress_note TEXT,        -- 进度说明（进行中时填写）
  blocker_reason TEXT,       -- 阻塞原因（被阻塞时必填）
  overdue_reason TEXT,       -- 逾期原因（逾期时必填）
  
  -- 预计完成
  expected_completion_date TEXT,
  
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_status_updates_task ON TaskStatusUpdates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_status_updates_time ON TaskStatusUpdates(updated_at);
CREATE INDEX IF NOT EXISTS idx_task_status_updates_by ON TaskStatusUpdates(updated_by);




-- ============================================
-- 來源: 2025-11-02T000200Z_task_due_date_adjustments.sql
-- ============================================

-- 任务到期日调整记录表

CREATE TABLE IF NOT EXISTS TaskDueDateAdjustments (
  adjustment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  
  -- 调整信息
  old_due_date TEXT NOT NULL,
  new_due_date TEXT NOT NULL,
  days_changed INTEGER NOT NULL, -- 负数=提前，正数=延后
  
  -- 原因与类型
  adjustment_reason TEXT, -- 调整原因（创建时修改预设期限需要填写）
  adjustment_type TEXT NOT NULL, -- initial_create/manual_adjust/system_auto/overdue_adjust
  
  -- 申请人
  requested_by INTEGER NOT NULL,
  requested_at TEXT DEFAULT (datetime('now')),
  
  -- 系统判定标记
  is_overdue_adjustment BOOLEAN DEFAULT 0, -- 是否在逾期后调整
  is_initial_creation BOOLEAN DEFAULT 0,   -- 是否是初始创建时的调整
  is_system_auto BOOLEAN DEFAULT 0,        -- 是否是系统自动调整
  
  FOREIGN KEY (task_id) REFERENCES ActiveTasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_adjustments_task ON TaskDueDateAdjustments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_adjustments_time ON TaskDueDateAdjustments(requested_at);
CREATE INDEX IF NOT EXISTS idx_task_adjustments_type ON TaskDueDateAdjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_task_adjustments_by ON TaskDueDateAdjustments(requested_by);




-- ============================================
-- 來源: 2025-11-02T020000Z_add_status_fields.sql
-- ============================================

-- 添加 old_status 和 new_status 字段到 TaskStatusUpdates 表
ALTER TABLE TaskStatusUpdates ADD COLUMN old_status TEXT;
ALTER TABLE TaskStatusUpdates ADD COLUMN new_status TEXT;

-- 迁移现有数据：将 status 字段的值复制到 new_status
UPDATE TaskStatusUpdates SET new_status = status WHERE new_status IS NULL;




-- ============================================
-- 來源: 2025-11-02T080000Z_remove_pending_status.sql
-- ============================================

-- 移除 pending 状态，统一使用 in_progress
-- 理由：待开始和进行中没有实质区别，简化状态管理

-- 1. 更新 ActiveTasks 表中所有 pending 状态为 in_progress
UPDATE ActiveTasks 
SET status = 'in_progress' 
WHERE status = 'pending';

-- 2. 更新 ActiveTaskStages 表中所有 pending 状态为 in_progress
UPDATE ActiveTaskStages 
SET status = 'in_progress' 
WHERE status = 'pending';

-- 注意：由于 SQLite 不支持 ALTER COLUMN DEFAULT，
-- 新的默认值将在应用层和后续迁移中处理



