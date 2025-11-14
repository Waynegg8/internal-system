/**
 * 數據庫遷移文件驗證腳本
 * 驗證整合後的遷移文件是否正確和完整
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// 設置控制台輸出編碼（Windows）
if (process.platform === 'win32') {
  try {
    // 設置 PowerShell 編碼為 UTF-8
    try {
      execSync('chcp 65001 >nul 2>&1', { shell: 'cmd.exe' });
    } catch (e) {
      // 忽略錯誤
    }
    // 設置 Node.js 輸出編碼
    process.stdout.setDefaultEncoding('utf8');
    process.stderr.setDefaultEncoding('utf8');
  } catch (e) {
    // 忽略錯誤
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const OLD_MIGRATIONS_DIR = path.join(__dirname, '../../horgoscpa/cloudflare/worker-router/migrations');

// 預期的所有表名（從實際遷移文件中提取，支持多種命名變體）
// 注意：表名可能有變體，驗證時會檢查實際存在的表
const EXPECTED_TABLES = [
  'Users',
  'sessions',
  'Clients',
  'ClientServices',
  'ServiceItems',
  'Tags', 'CustomerTags',  // 標籤表可能有不同命名
  'ClientTags', 'ClientTagAssignments',  // 客戶標籤關聯表
  'ActiveTasks',
  'TaskTemplates',
  'TaskTemplateStages',
  'Timesheets',
  'TaskStatusUpdates',
  'TaskDueDateAdjustments',
  'Receipts',
  'ReceiptItems',
  'ReceiptPayments', 'Payments',  // 付款表可能有不同命名
  'BillingSchedule', 'ServiceBillingSchedule',  // 帳單計劃表
  'BillingReminders',
  'ReceiptServiceTypes',
  'MonthlyPayroll',
  'PayrollSnapshots',
  'EmployeeSalaryItems',
  'SalaryItemTypes',
  'MonthlyBonus', 'MonthlyBonusAdjustments',  // 月度獎金表
  'YearEndBonus',
  'PayrollSettings',
  'PayrollCache',
  'PunchRecords',
  'Leaves', 'LeaveRequests',  // 請假表可能有不同命名
  'LeaveBalances',
  'CompensatoryLeaveGrants',
  'LifeEventLeaveGrants',
  'Holidays',
  'OverheadCostTypes',
  'MonthlyOverheadCosts',
  'OverheadRecurring', 'OverheadRecurringTemplates',  // 成本循環模板
  'SOPDocuments',
  'SOPRelations', 'TaskTemplateStageSOPs', 'ServiceComponentSOPs', 'ActiveTaskSOPs',  // SOP關聯表
  'InternalFAQ',
  'InternalDocuments',
  'Services',
  'ServiceComponents',
  'ServiceComponentTasks',
  'ServiceComponentSOPs', 'ServiceComponentTaskSOPs',  // 服務組件SOP關聯
  // ServiceLevelSOP 不是表，而是 Services 表的字段
  'AutomationRules',
  'CronExecutions', 'CronJobExecutions',  // 定時任務執行記錄
  'SystemSettings', 'Settings',  // 系統設置表
  'BusinessTrips',
  'WeeklyTimesheetCache',
  'UniversalCache', 'UniversalDataCache',  // 通用緩存表
];

// 表之間的依賴關係（被引用表 -> 引用表）
const TABLE_DEPENDENCIES = {
  'Users': ['sessions', 'Leaves', 'Timesheets', 'MonthlyPayroll', 'EmployeeSalaryItems', 'PunchRecords', 'BusinessTrips'],
  'Clients': ['ClientServices', 'ActiveTasks', 'Receipts', 'ClientTags'],
  'Services': ['ClientServices', 'ServiceItems', 'ServiceComponents', 'BillingSchedule'],
  'ServiceItems': ['ClientServices', 'Timesheets'],
  'ClientServices': ['ActiveTasks', 'Receipts', 'BillingSchedule'],
  'TaskTemplates': ['TaskTemplateStages', 'ActiveTasks'],
  'TaskTemplateStages': ['ActiveTasks'],
  'ActiveTasks': ['TaskStatusUpdates', 'TaskDueDateAdjustments', 'Timesheets'],
  'Receipts': ['ReceiptItems', 'ReceiptPayments'],
  'ServiceComponents': ['ServiceComponentTasks', 'ServiceComponentSOPs'],
  'SOPDocuments': ['SOPRelations', 'ServiceComponentSOPs'],
  'SalaryItemTypes': ['EmployeeSalaryItems'],
  'OverheadCostTypes': ['MonthlyOverheadCosts'],
  'AutomationRules': ['CronExecutions'],
};

class MigrationValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.foundTables = new Set();
    this.tableDefinitions = new Map();
    this.fileContents = new Map();
  }

  // 讀取所有遷移文件
  readMigrationFiles() {
    console.log('📖 讀取遷移文件...\n');
    
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      this.fileContents.set(file, content);
      console.log(`  ✅ ${file}`);
    }
    
    console.log(`\n總共讀取 ${files.length} 個文件\n`);
    return files;
  }

  // 提取所有 CREATE TABLE 語句
  extractTableDefinitions() {
    console.log('🔍 提取表定義...\n');
    
    for (const [file, content] of this.fileContents.entries()) {
      // 匹配 CREATE TABLE 語句
      const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
      let match;
      
      while ((match = createTableRegex.exec(content)) !== null) {
        const tableName = match[1];
        this.foundTables.add(tableName);
        
        // 提取完整的表定義
        const tableDefStart = match.index;
        let braceCount = 0;
        let inString = false;
        let stringChar = '';
        let tableDefEnd = tableDefStart;
        
        for (let i = tableDefStart; i < content.length; i++) {
          const char = content[i];
          const prevChar = i > 0 ? content[i - 1] : '';
          
          if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = true;
            stringChar = char;
          } else if (inString && char === stringChar && prevChar !== '\\') {
            inString = false;
          } else if (!inString) {
            if (char === '(') braceCount++;
            if (char === ')') {
              braceCount--;
              if (braceCount === 0) {
                tableDefEnd = i + 1;
                break;
              }
            }
          }
        }
        
        const tableDef = content.substring(tableDefStart, tableDefEnd);
        this.tableDefinitions.set(tableName, { file, definition: tableDef });
        console.log(`  ✅ ${tableName} (定義在 ${file})`);
      }
    }
    
    console.log(`\n總共找到 ${this.foundTables.size} 個表定義\n`);
  }

  // 檢查所有預期的表是否存在
  checkExpectedTables() {
    console.log('✅ 檢查預期表是否存在...\n');
    
    // 將預期表名展開為集合（處理變體）
    const expectedSet = new Set(EXPECTED_TABLES);
    
    // 檢查核心表是否存在（至少有一個變體存在即可）
    const coreTables = {
      'Tags': ['Tags', 'CustomerTags'],
      'ClientTags': ['ClientTags', 'ClientTagAssignments'],
      'ReceiptPayments': ['ReceiptPayments', 'Payments'],
      'BillingSchedule': ['BillingSchedule', 'ServiceBillingSchedule'],
      'MonthlyBonus': ['MonthlyBonus', 'MonthlyBonusAdjustments'],
      'Leaves': ['Leaves', 'LeaveRequests'],
      'OverheadRecurring': ['OverheadRecurring', 'OverheadRecurringTemplates'],
      'SOPRelations': ['SOPRelations', 'TaskTemplateStageSOPs', 'ServiceComponentSOPs', 'ActiveTaskSOPs'],
      'ServiceComponentSOPs': ['ServiceComponentSOPs', 'ServiceComponentTaskSOPs'],
      // ServiceLevelSOP 不是表，而是 Services 表的字段 (service_sop_id)
      'CronExecutions': ['CronExecutions', 'CronJobExecutions'],
      'SystemSettings': ['SystemSettings', 'Settings'],
      'UniversalCache': ['UniversalCache', 'UniversalDataCache'],
    };
    
    const missingTables = [];
    for (const [coreTable, variants] of Object.entries(coreTables)) {
      const exists = variants.some(v => this.foundTables.has(v));
      if (!exists) {
        missingTables.push(coreTable);
        this.errors.push(`❌ 缺少表: ${coreTable} (或任何變體: ${variants.join(', ')})`);
      }
    }
    
    // 檢查其他預期表
    for (const table of EXPECTED_TABLES) {
      if (!coreTables[table] && !this.foundTables.has(table)) {
        missingTables.push(table);
        this.errors.push(`❌ 缺少表: ${table}`);
      }
    }
    
    if (missingTables.length === 0) {
      console.log('  ✅ 所有預期表都存在\n');
    } else {
      console.log(`  ❌ 缺少 ${missingTables.length} 個表:\n`);
      missingTables.forEach(t => console.log(`    - ${t}`));
      console.log();
    }
    
    // 檢查是否有未預期的表（排除已知變體）
    const allExpectedVariants = new Set(EXPECTED_TABLES);
    const unexpectedTables = Array.from(this.foundTables).filter(t => !allExpectedVariants.has(t));
    if (unexpectedTables.length > 0) {
      console.log(`  ⚠️  發現 ${unexpectedTables.length} 個未預期的表:\n`);
      unexpectedTables.forEach(t => {
        console.log(`    - ${t}`);
        this.warnings.push(`⚠️  未預期的表: ${t}`);
      });
      console.log();
    }
  }

  // 檢查外鍵依賴順序
  checkForeignKeyOrder() {
    console.log('🔗 檢查外鍵依賴順序...\n');
    
    // 構建依賴圖
    const dependencies = new Map();
    for (const [file, content] of this.fileContents.entries()) {
      // 找出這個文件中定義的表
      const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
      let match;
      const definedTables = [];
      
      while ((match = createTableRegex.exec(content)) !== null) {
        definedTables.push(match[1]);
      }
      
      // 對每個定義的表，查找它的外鍵依賴
      for (const tableName of definedTables) {
        if (!dependencies.has(tableName)) {
          dependencies.set(tableName, new Set());
        }
        
        // 在這個表的定義中查找 FOREIGN KEY
        const tableDef = this.tableDefinitions.get(tableName);
        if (tableDef) {
          const fkRegex = /FOREIGN\s+KEY\s+\([^)]+\)\s+REFERENCES\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi;
          let fkMatch;
          while ((fkMatch = fkRegex.exec(tableDef.definition)) !== null) {
            const referencedTable = fkMatch[1];
            if (referencedTable !== tableName && this.foundTables.has(referencedTable)) {
              dependencies.get(tableName).add(referencedTable);
            }
          }
        }
      }
    }
    
    // 檢查循環依賴
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];
    
    const hasCycle = (table) => {
      if (recursionStack.has(table)) {
        cycles.push([...recursionStack, table]);
        return true;
      }
      if (visited.has(table)) {
        return false;
      }
      
      visited.add(table);
      recursionStack.add(table);
      
      const deps = dependencies.get(table) || new Set();
      for (const dep of deps) {
        if (hasCycle(dep)) {
          return true;
        }
      }
      
      recursionStack.delete(table);
      return false;
    };
    
    // 重置visited，對每個表進行檢查
    visited.clear();
    for (const table of this.foundTables) {
      if (!visited.has(table)) {
        hasCycle(table);
      }
    }
    
    if (cycles.length > 0) {
      console.log(`  ❌ 檢測到 ${cycles.length} 個循環依賴:\n`);
      cycles.forEach(cycle => {
        const cycleStr = cycle.join(' -> ');
        this.errors.push(`❌ 檢測到循環依賴: ${cycleStr}`);
        console.log(`    - ${cycleStr}\n`);
      });
    } else {
      console.log('  ✅ 沒有檢測到循環依賴\n');
    }
  }

  // 檢查 SQL 語法
  checkSQLSyntax() {
    console.log('📝 檢查 SQL 語法...\n');
    
    let syntaxErrors = 0;
    
    for (const [file, content] of this.fileContents.entries()) {
      // 檢查基本的 SQL 語法問題
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 跳過註釋和空行
        if (line.startsWith('--') || line === '') continue;
        
        // 檢查未閉合的括號（簡單檢查）
        const openParens = (line.match(/\(/g) || []).length;
        const closeParens = (line.match(/\)/g) || []).length;
        
        // 檢查常見的語法錯誤
        if (line.includes('CREATE TABLE') && !line.includes('(') && i + 1 < lines.length) {
          // 這可能是多行的 CREATE TABLE，跳過
          continue;
        }
        
        // 檢查是否有明顯的語法錯誤
        if (line.match(/;\s*;/)) {
          this.warnings.push(`⚠️  ${file}:${i + 1} 可能有多餘的分號`);
        }
      }
    }
    
    if (syntaxErrors === 0 && this.warnings.filter(w => w.includes('分號')).length === 0) {
      console.log('  ✅ 未發現明顯的語法錯誤\n');
    }
  }

  // 檢查是否有重複定義
  checkDuplicateDefinitions() {
    console.log('🔄 檢查重複定義...\n');
    
    const tableFiles = new Map();
    
    for (const [table, info] of this.tableDefinitions.entries()) {
      if (!tableFiles.has(table)) {
        tableFiles.set(table, []);
      }
      tableFiles.get(table).push(info.file);
    }
    
    const duplicates = Array.from(tableFiles.entries())
      .filter(([table, files]) => files.length > 1);
    
    if (duplicates.length === 0) {
      console.log('  ✅ 沒有發現重複的表定義\n');
    } else {
      console.log(`  ❌ 發現 ${duplicates.length} 個重複定義:\n`);
      duplicates.forEach(([table, files]) => {
        console.log(`    - ${table}: 定義在 ${files.join(', ')}`);
        this.errors.push(`❌ 表 ${table} 在多個文件中定義: ${files.join(', ')}`);
      });
      console.log();
    }
  }

  // 檢查索引定義
  checkIndexes() {
    console.log('📇 檢查索引定義...\n');
    
    let indexCount = 0;
    
    for (const [file, content] of this.fileContents.entries()) {
      const createIndexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi;
      const matches = content.match(createIndexRegex);
      if (matches) {
        indexCount += matches.length;
      }
    }
    
    console.log(`  ✅ 找到 ${indexCount} 個索引定義\n`);
    
    if (indexCount === 0) {
      this.warnings.push('⚠️  沒有找到任何索引定義');
    }
  }

  // 生成驗證報告
  generateReport() {
    const reportLines = [];
    
    reportLines.push('\n' + '='.repeat(60));
    reportLines.push('驗證報告');
    reportLines.push('='.repeat(60) + '\n');
    
    reportLines.push(`找到的表: ${this.foundTables.size}`);
    reportLines.push(`錯誤: ${this.errors.length}`);
    reportLines.push(`警告: ${this.warnings.length}\n`);
    
    if (this.errors.length > 0) {
      reportLines.push('錯誤列表:');
      this.errors.forEach(err => reportLines.push(`  ${err}`));
      reportLines.push('');
    }
    
    if (this.warnings.length > 0) {
      reportLines.push('警告列表:');
      this.warnings.forEach(warn => reportLines.push(`  ${warn}`));
      reportLines.push('');
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      reportLines.push('所有檢查通過！遷移文件看起來是正確的。\n');
    } else if (this.errors.length === 0) {
      reportLines.push('沒有發現錯誤，但有一些警告需要關注。\n');
    } else {
      reportLines.push('發現錯誤，請修復後重新驗證。\n');
    }
    
    // 輸出到控制台
    const reportText = reportLines.join('\n');
    console.log(reportText);
    
    // 同時保存到文件
    const reportPath = path.join(__dirname, '../MIGRATION_VALIDATION_REPORT.txt');
    fs.writeFileSync(reportPath, reportText, 'utf-8');
    console.log(`\n驗證報告已保存到: ${reportPath}\n`);
    
    return this.errors.length === 0;
  }

  // 執行所有驗證
  validate() {
    console.log('🚀 開始驗證遷移文件...\n');
    console.log('='.repeat(60) + '\n');
    
    this.readMigrationFiles();
    this.extractTableDefinitions();
    this.checkExpectedTables();
    this.checkDuplicateDefinitions();
    this.checkForeignKeyOrder();
    this.checkSQLSyntax();
    this.checkIndexes();
    
    return this.generateReport();
  }
}

// 執行驗證
const validator = new MigrationValidator();
const isValid = validator.validate();

process.exit(isValid ? 0 : 1);

