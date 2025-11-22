/**
 * 生成生產規模測試數據
 * 通過SQL直接插入，快速創建測試數據
 */

const fs = require('fs');
const { execSync } = require('child_process');

const CLIENT_COUNT = 10; // 先測試10個客戶
const SERVICES_PER_CLIENT = 7;
const TASKS_PER_SERVICE = 6;

console.log(`生成測試數據：${CLIENT_COUNT}客戶 × ${SERVICES_PER_CLIENT}服務 × ${TASKS_PER_SERVICE}任務`);

const sqlStatements = [];

// 1. 插入客戶
for (let i = 1; i <= CLIENT_COUNT; i++) {
  const clientId = `TEST${String(i).padStart(6, '0')}`;
  const taxId = String(90000000 + i).padStart(8, '0');
  sqlStatements.push(
    `INSERT INTO Clients (client_id, company_name, tax_id, contact_person, contact_phone, contact_email, address, is_deleted, created_at, updated_at) VALUES ('${clientId}', '測試客戶${String(i).padStart(6, '0')}有限公司', '${taxId}', '測試聯絡人', '0912345678', 'test${String(i).padStart(6, '0')}@test.com', '測試地址', 0, datetime('now'), datetime('now'));`
  );
}

// 2. 插入客戶服務
for (let i = 1; i <= CLIENT_COUNT; i++) {
  const clientId = `TEST${String(i).padStart(6, '0')}`;
  for (let j = 1; j <= SERVICES_PER_CLIENT; j++) {
    sqlStatements.push(
      `INSERT INTO ClientServices (client_id, service_id, status, service_type, execution_months, use_for_auto_generate, is_deleted, created_at, updated_at) VALUES ('${clientId}', 83, 'active', 'recurring', '[1,2,3,4,5,6,7,8,9,10,11,12]', 1, 0, datetime('now'), datetime('now'));`
    );
  }
}

// 寫入SQL文件
const sqlFile = 'backend/scripts/insert-test-data-generated.sql';
fs.writeFileSync(sqlFile, sqlStatements.join('\n'), 'utf8');
console.log(`已生成 ${sqlStatements.length} 條SQL語句到 ${sqlFile}`);

// 執行SQL
console.log('執行SQL插入數據...');
try {
  const output = execSync(
    `npx wrangler d1 execute horgoscpa-db-v2 --remote --file ${sqlFile}`,
    { encoding: 'utf8', cwd: process.cwd() }
  );
  console.log('執行成功');
  console.log(output);
} catch (error) {
  console.error('執行失敗:', error.stdout || error.message);
  process.exit(1);
}

// 3. 獲取client_service_id並插入任務配置
console.log('獲取client_service_id...');
try {
  const result = execSync(
    `npx wrangler d1 execute horgoscpa-db-v2 --remote --command "SELECT cs.client_service_id FROM ClientServices cs INNER JOIN Clients c ON cs.client_id = c.client_id WHERE c.client_id LIKE 'TEST%' AND cs.is_deleted = 0 AND c.is_deleted = 0" --json`,
    { encoding: 'utf8', cwd: process.cwd() }
  );
  
  const data = JSON.parse(result);
  const serviceIds = data[0]?.results?.map(r => r.client_service_id) || [];
  console.log(`找到 ${serviceIds.length} 個服務`);
  
  // 插入任務配置
  const taskSqlStatements = [];
  for (const serviceId of serviceIds) {
    for (let stage = 1; stage <= TASKS_PER_SERVICE; stage++) {
      const generationRule = stage % 3 === 1 ? 'prev_month_last_x_days' : 'service_month_start';
      const generationParams = stage % 3 === 1 ? '{"days":3}' : '{}';
      const isFixedDeadline = stage === 3 ? 1 : 0;
      
      taskSqlStatements.push(
        `INSERT INTO ClientServiceTaskConfigs (client_service_id, task_name, task_description, stage_order, generation_time_rule, generation_time_params, days_due, is_fixed_deadline, auto_generate, is_deleted, created_at, updated_at) VALUES (${serviceId}, '測試任務-${stage}', '測試任務描述-${stage}', ${stage}, '${generationRule}', '${generationParams}', 30, ${isFixedDeadline}, 1, 0, datetime('now'), datetime('now'));`
      );
    }
  }
  
  const taskSqlFile = 'backend/scripts/insert-test-tasks-generated.sql';
  fs.writeFileSync(taskSqlFile, taskSqlStatements.join('\n'), 'utf8');
  console.log(`已生成 ${taskSqlStatements.length} 條任務配置SQL到 ${taskSqlFile}`);
  
  // 執行任務配置插入
  const taskOutput = execSync(
    `npx wrangler d1 execute horgoscpa-db-v2 --remote --file ${taskSqlFile}`,
    { encoding: 'utf8', cwd: process.cwd() }
  );
  console.log('任務配置插入成功');
  
  // 驗證
  const verifyOutput = execSync(
    `npx wrangler d1 execute horgoscpa-db-v2 --remote --command "SELECT COUNT(*) as count FROM ClientServiceTaskConfigs tc INNER JOIN ClientServices cs ON tc.client_service_id = cs.client_service_id INNER JOIN Clients c ON cs.client_id = c.client_id WHERE c.client_id LIKE 'TEST%' AND tc.is_deleted = 0" --json`,
    { encoding: 'utf8', cwd: process.cwd() }
  );
  const verifyData = JSON.parse(verifyOutput);
  console.log(`驗證：實際插入 ${verifyData[0]?.results?.[0]?.count || 0} 個任務配置`);
  
} catch (error) {
  console.error('獲取服務ID或插入任務配置失敗:', error.stdout || error.message);
}


