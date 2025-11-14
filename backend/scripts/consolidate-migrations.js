/**
 * 數據庫遷移文件整合腳本
 * 自動讀取原項目的所有遷移文件並整合為統一的遷移腳本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// 設置控制台輸出編碼（Windows）
if (process.platform === 'win32') {
  try {
    // 設置 PowerShell 編碼為 UTF-8
    execSync('chcp 65001 >nul 2>&1', { shell: 'cmd.exe' });
    // 設置 Node.js 輸出編碼
    process.stdout.setDefaultEncoding('utf8');
    process.stderr.setDefaultEncoding('utf8');
  } catch (e) {
    // 忽略錯誤
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 原項目遷移文件目錄
const OLD_MIGRATIONS_DIR = path.join(__dirname, '../../../horgoscpa/cloudflare/worker-router/migrations');
// 新項目遷移文件目錄
const NEW_MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// 按功能模組組織的遷移文件
const MODULE_MIGRATIONS = {
  '0001_core_tables.sql': [
    '2025-10-30T000000Z_init_auth.sql',
    '2025-10-30T000100Z_clients.sql',
    '2025-10-30T001000Z_client_services_lifecycle.sql',
    '2025-10-31T020200Z_refactor_client_services.sql',
  ],
  '0002_tasks_timesheets.sql': [
    '2025-10-30T000200Z_tasks.sql',
    '2025-10-30T000300Z_timesheets.sql',
    '2025-10-31T020100Z_create_task_templates.sql',
    '2025-10-31T020400Z_enhance_tasks.sql',
    '2025-10-31T030000Z_add_client_id_to_task_templates.sql',
    '2025-10-31T030100Z_add_sop_attachment_to_stages.sql',
    '2025-11-02T000000Z_add_task_fields.sql',
    '2025-11-02T000100Z_task_status_updates.sql',
    '2025-11-02T000200Z_task_due_date_adjustments.sql',
    '2025-11-02T020000Z_add_status_fields.sql',
    '2025-11-02T080000Z_remove_pending_status.sql',
  ],
  '0003_financial.sql': [
    '2025-10-30T000500Z_receipts.sql',
    '2025-10-31T020000Z_create_billing_schedule.sql',
    '2025-10-31T020300Z_enhance_receipts.sql',
    '2025-11-01T220000Z_add_service_month.sql',
    '2025-11-01T240000Z_create_receipt_items_payments.sql',
    '2025-11-02T000300Z_add_service_month_to_receipts.sql',
    '2025-11-03T000000Z_add_fee_fields_to_receipt_items.sql',
    '2025-11-03T010000Z_add_withholding_amount.sql',
    '2025-11-06T000000Z_alter_billing_schedule_support_onetime.sql',
    '2025-11-07T000000Z_add_service_period_to_receipts.sql',
    '2025-11-07T100000Z_create_receipt_service_types.sql',
    '2025-11-07T100100Z_create_billing_reminders.sql',
  ],
  '0004_payroll.sql': [
    '2025-10-30T000600Z_payroll.sql',
    '2025-11-01T220000Z_add_user_salary_fields.sql',
    '2025-11-03T020000Z_create_salary_items.sql',
    '2025-11-03T030000Z_create_monthly_bonus.sql',
    '2025-11-03T040000Z_create_yearend_bonus.sql',
    '2025-11-03T040000Z_add_transport_subsidy_to_payroll.sql',
    '2025-11-03T050000Z_add_meal_allowance_to_payroll.sql',
    '2025-11-03T060000Z_create_payroll_settings.sql',
    '2025-11-03T070000Z_update_transport_settings.sql',
    '2025-11-03T080000Z_remove_overtime_multipliers.sql',
    '2025-11-03T090000Z_add_recurring_to_salary_items.sql',
    '2025-11-03T100000Z_change_yearend_payment_to_month.sql',
    '2025-11-03T110000Z_fix_salary_effective_dates.sql',
    '2025-11-03T120000Z_create_punch_records.sql',
    '2025-11-04T000000Z_create_payroll_snapshots.sql',
    '2025-11-05T000000Z_refactor_salary_categories.sql',
    '2025-11-07T000000Z_create_payroll_cache.sql',
  ],
  '0005_leaves.sql': [
    '2025-10-30T000400Z_leaves.sql',
    '2025-10-30T000401Z_compensatory_leave_grants.sql',
    '2025-10-30T001500Z_holidays.sql',
    '2025-10-30T001600Z_update_holidays_2025.sql',
    '2025-10-30T001700Z_add_holidays_2026.sql',
    '2025-11-01T000000Z_add_leave_time_fields.sql',
    '2025-11-01T000100Z_life_event_leave_grants.sql',
    '2025-11-01T000200Z_cleanup_comp_from_leave_balances.sql',
    '2025-11-01T000300Z_init_basic_leave_balances.sql',
    '2025-11-06T001900Z_add_leave_delete_fields.sql',
    '2025-10-31T000000Z_fix_compensatory_leave_fk.sql',
  ],
  '0006_costs.sql': [
    '2025-10-30T000700Z_overhead.sql',
    '2025-11-06T000000Z_overhead_recurring.sql',
  ],
  '0007_knowledge.sql': [
    '2025-10-30T000900Z_sop.sql',
    '2025-10-30T000800Z_attachments.sql',
    '2025-10-30T001100Z_cms.sql',
    '2025-11-01T190000Z_create_internal_faq.sql',
    '2025-11-01T200000Z_create_sop_relations.sql',
    '2025-11-01T210000Z_create_internal_documents.sql',
    '2025-11-02T050000Z_add_sop_scope.sql',
    '2025-11-02T060000Z_add_scope_to_faq_documents.sql',
    '2025-11-02T070000Z_set_default_scope_for_existing_data.sql',
    '2025-11-02T090000Z_add_client_id_to_knowledge.sql',
    '2025-11-02T100000Z_add_date_task_to_documents.sql',
    '2025-11-08T000000Z_migrate_attachments_to_documents.sql',
    '2025-11-08T010000Z_migrate_task_template_attachments.sql',
  ],
  '0008_services.sql': [
    '2025-10-31T000000Z_add_service_structure.sql',
    '2025-11-01T225900Z_create_service_components.sql',
    '2025-11-01T230000Z_service_component_tasks_sops.sql',
    '2025-11-02T040000Z_fix_service_codes.sql',
    '2025-11-07T130000Z_add_service_level_sop.sql',
  ],
  '0009_automation.sql': [
    '2025-10-30T001200Z_automation_rules.sql',
    '2025-10-30T001300Z_system_settings.sql',
    '2025-10-30T001301Z_cron_executions.sql',
    '2025-11-03T030000Z_create_business_trips.sql',
    '2025-11-07T120000Z_add_user_profile_fields.sql',
  ],
  '0010_cache_indexes.sql': [
    '2025-11-02T110000Z_performance_indexes.sql',
    '2025-11-02T120000Z_weekly_cache.sql',
    '2025-11-02T130000Z_universal_cache.sql',
    '2025-11-02T130001Z_update_weekly_cache.sql',
    '2025-11-02T130002Z_add_more_cache_rules.sql',
  ],
  '0011_initial_data.sql': [
    '2025-10-30T001400Z_promote_admin_user.sql',
    '2025-10-31T001800Z_fix_all_passwords.sql',
  ],
};

function readMigrationFile(filename) {
  const filePath = path.join(OLD_MIGRATIONS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  文件不存在: ${filename}`);
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function getAllOldMigrationFiles() {
  if (!fs.existsSync(OLD_MIGRATIONS_DIR)) {
    return [];
  }
  return fs.readdirSync(OLD_MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

function consolidateMigrations() {
  console.log('🚀 開始整合數據庫遷移文件...\n');

  // 確保新遷移目錄存在
  if (!fs.existsSync(NEW_MIGRATIONS_DIR)) {
    fs.mkdirSync(NEW_MIGRATIONS_DIR, { recursive: true });
  }

  // 獲取所有原始遷移文件
  const allOldFiles = getAllOldMigrationFiles();
  console.log(`📋 原項目共有 ${allOldFiles.length} 個遷移文件\n`);

  // 收集所有在MODULE_MIGRATIONS中列出的文件
  const includedFiles = new Set();
  for (const oldFiles of Object.values(MODULE_MIGRATIONS)) {
    oldFiles.forEach(f => includedFiles.add(f));
  }

  // 找出未包含的文件
  const excludedFiles = allOldFiles.filter(f => !includedFiles.has(f));

  let totalFiles = 0;
  let processedFiles = 0;
  let missingFiles = [];

  // 處理每個模組
  for (const [newFile, oldFiles] of Object.entries(MODULE_MIGRATIONS)) {
    console.log(`📝 處理模組: ${newFile}`);
    const consolidated = [];
    
    consolidated.push(`-- ============================================`);
    consolidated.push(`-- ${newFile}`);
    consolidated.push(`-- 整合自以下遷移文件:`);
    oldFiles.forEach(f => consolidated.push(`--   - ${f}`));
    consolidated.push(`-- ============================================\n`);

    for (const oldFile of oldFiles) {
      totalFiles++;
      const content = readMigrationFile(oldFile);
      if (content) {
        consolidated.push(`-- ============================================`);
        consolidated.push(`-- 來源: ${oldFile}`);
        consolidated.push(`-- ============================================\n`);
        consolidated.push(content);
        consolidated.push('\n');
        processedFiles++;
      } else {
        missingFiles.push(oldFile);
      }
    }

    // 寫入整合後的文件
    const outputPath = path.join(NEW_MIGRATIONS_DIR, newFile);
    fs.writeFileSync(outputPath, consolidated.join('\n'), 'utf-8');
    console.log(`✅ 已創建: ${newFile} (包含 ${oldFiles.length} 個原始文件)\n`);
  }

  // 統計報告
  console.log('\n📊 整合完成統計:');
  console.log(`   原項目文件總數: ${allOldFiles.length}`);
  console.log(`   已包含文件數: ${includedFiles.size}`);
  console.log(`   成功處理: ${processedFiles}`);
  console.log(`   缺失文件: ${missingFiles.length}`);
  
  if (excludedFiles.length > 0) {
    console.log(`\n⚠️  未包含的文件 (${excludedFiles.length} 個):`);
    excludedFiles.forEach(f => console.log(`   - ${f}`));
    console.log('\n   注意: 這些文件可能包含數據遷移或更新，請檢查是否需要包含。');
  }
  
  if (missingFiles.length > 0) {
    console.log('\n❌ 缺失的文件:');
    missingFiles.forEach(f => console.log(`   - ${f}`));
    console.log('\n   錯誤: 這些文件在配置中但找不到，請檢查文件路徑。');
  }

  if (excludedFiles.length > 0 || missingFiles.length > 0) {
    console.log('\n⚠️  整合完成，但發現問題，請檢查上述文件。');
    process.exit(1);
  } else {
    console.log('\n✅ 整合完成！所有文件都已成功處理。');
  }
}

// 執行整合
consolidateMigrations();

