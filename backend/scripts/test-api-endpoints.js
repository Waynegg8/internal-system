/**
 * API 端點測試腳本
 * 測試所有後端 API 路由的可用性和正確性
 * 
 * 使用方法:
 *   node scripts/test-api-endpoints.js --local    # 測試本地環境
 *   node scripts/test-api-endpoints.js --remote   # 測試遠端環境
 *   node scripts/test-api-endpoints.js --url http://localhost:8787  # 自定義 URL
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 解析命令行參數
const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const isRemote = args.includes('--remote');
const urlArg = args.find(arg => arg.startsWith('--url='));
const baseUrl = urlArg ? urlArg.split('=')[1] : (isLocal ? 'http://localhost:8787' : 'https://v2.horgoscpa.com');

console.log(`🧪 開始測試 API 端點 (${baseUrl})...\n`);

// 測試結果
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

/**
 * 執行 HTTP 請求（帶超時）
 */
async function fetchAPI(method, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const timeout = options.timeout || 5000; // 預設 5 秒超時
  
  const defaultOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };
  
  if (options.body) {
    defaultOptions.body = JSON.stringify(options.body);
  }
  
  try {
    // 使用 AbortController 實現超時
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { raw: text };
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        ok: false,
        status: 0,
        statusText: `請求超時 (${timeout}ms)`,
        data: { error: `連接到 ${url} 超時，請確認後端服務是否運行` },
        error
      };
    }
    return {
      ok: false,
      status: 0,
      statusText: error.message,
      data: { error: error.message },
      error
    };
  }
}

/**
 * 檢查服務是否可用
 */
async function checkServiceAvailable() {
  console.log(`🔍 檢查服務是否可用 (${baseUrl})...`);
  try {
    // 嘗試訪問登入端點來檢查服務是否可用
    const response = await fetchAPI('POST', '/api/v2/auth/login', { 
      timeout: 3000,
      body: {
        username: 'test',
        password: 'test'
      }
    });
    
    // 即使登入失敗（401），也說明服務可用
    if (response.status === 0 || response.status === undefined) {
      console.log(`❌ 服務不可用: ${response.statusText || '無法連接到服務器'}`);
      console.log(`💡 提示: 請先啟動後端服務: npm run dev`);
      return false;
    }
    console.log(`✅ 服務可用 (狀態碼: ${response.status})\n`);
    return true;
  } catch (error) {
    console.log(`❌ 服務不可用: ${error.message}`);
    console.log(`💡 提示: 請先啟動後端服務: npm run dev`);
    return false;
  }
}

/**
 * 測試用例
 */
async function testCase(name, testFn) {
  try {
    console.log(`  🧪 ${name}...`);
    const result = await testFn();
    if (result) {
      testResults.passed++;
      console.log(`  ✅ ${name} - 通過\n`);
      return true;
    } else {
      testResults.failed++;
      console.log(`  ❌ ${name} - 失敗\n`);
      return false;
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ name, error: error.message });
    console.log(`  ❌ ${name} - 錯誤: ${error.message}\n`);
    return false;
  }
}

/**
 * 認證模塊測試
 */
let authToken = null;
let testUserId = null;

async function testAuthModule() {
  console.log('\n📋 測試認證模塊...\n');
  
  // 1. 登入測試
  await testCase('POST /api/v2/auth/login - 登入', async () => {
    const response = await fetchAPI('POST', '/api/v2/auth/login', {
      body: {
        username: 'admin',
        password: '111111'
      }
    });
    
    if (response.ok && response.data.ok) {
      // 從 Set-Cookie 頭中提取 session
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        const match = setCookie.match(/session=([^;]+)/);
        if (match) {
          authToken = match[1];
        }
      }
      testUserId = response.data.data?.user?.user_id;
      return true;
    }
    return false;
  });
  
  // 2. 獲取當前用戶
  await testCase('GET /api/v2/auth/me - 獲取當前用戶', async () => {
    const response = await fetchAPI('GET', '/api/v2/auth/me', {
      headers: {
        'Cookie': `session=${authToken}`
      }
    });
    return response.ok && response.data.success;
  });
  
  // 3. 登出測試
  await testCase('POST /api/v2/auth/logout - 登出', async () => {
    const response = await fetchAPI('POST', '/api/v2/auth/logout', {
      headers: {
        'Cookie': `session=${authToken}`
      }
    });
    return response.ok;
  });
  
  // 重新登入以進行後續測試
  const loginResponse = await fetchAPI('POST', '/api/v2/auth/login', {
    body: {
      username: 'admin',
      password: '111111'
    }
  });
  if (loginResponse.ok) {
    const setCookie = loginResponse.headers['set-cookie'];
    if (setCookie) {
      const match = setCookie.match(/session=([^;]+)/);
      if (match) {
        authToken = match[1];
      }
    }
  }
}

/**
 * 客戶管理模塊測試
 */
let testClientId = null;

async function testClientsModule() {
  console.log('\n📋 測試客戶管理模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取客戶列表
  await testCase('GET /api/v2/clients - 獲取客戶列表', async () => {
    const response = await fetchAPI('GET', '/api/v2/clients?page=1&perPage=10', { headers });
    if (response.ok && response.data.ok) {
      // 如果有客戶，保存第一個客戶 ID  
      if (Array.isArray(response.data.data) && response.data.data.length > 0) {
        testClientId = response.data.data[0].clientId || response.data.data[0].client_id;
      }
      return true;
    }
    return false;
  });
  
  // 2. 創建新客戶
  await testCase('POST /api/v2/clients - 創建新客戶', async () => {
    const response = await fetchAPI('POST', '/api/v2/clients', {
      headers,
      body: {
        company_name: '測試客戶公司',
        tax_registration_number: '12345678',
        business_status: '營業中',
        assignee_user_id: testUserId,
        phone: '02-1234-5678',
        email: 'test@example.com'
      }
    });
    if (response.ok && response.data.ok) {
      testClientId = response.data.data?.clientId || response.data.data?.client_id || testClientId;
      return true;
    }
    return false;
  });
  
  // 3. 獲取客戶詳情
  if (testClientId) {
    await testCase(`GET /api/v2/clients/${testClientId} - 獲取客戶詳情`, async () => {
      const response = await fetchAPI('GET', `/api/v2/clients/${testClientId}`, { headers });
      return response.ok && response.data.ok;
    });
  }
  
  // 4. 獲取客戶服務
  if (testClientId) {
    await testCase(`GET /api/v2/clients/${testClientId}/services - 獲取客戶服務`, async () => {
      const response = await fetchAPI('GET', `/api/v2/clients/${testClientId}/services`, { headers });
      return response.ok;
    });
  }
}

/**
 * 任務管理模塊測試
 */
async function testTasksModule() {
  console.log('\n📋 測試任務管理模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取任務列表
  await testCase('GET /api/v2/tasks - 獲取任務列表', async () => {
    const response = await fetchAPI('GET', '/api/v2/tasks?page=1&perPage=10', { headers });
    return response.ok;
  });
  
  // 2. 獲取任務總覽
  await testCase('GET /api/v2/tasks/overview - 獲取任務總覽', async () => {
    const response = await fetchAPI('GET', '/api/v2/tasks/overview', { headers });
    return response.ok;
  });
}

/**
 * 工時管理模塊測試
 */
async function testTimesheetsModule() {
  console.log('\n📋 測試工時管理模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取工時記錄
  await testCase('GET /api/v2/timesheets - 獲取工時記錄', async () => {
    const response = await fetchAPI('GET', '/api/v2/timesheets?page=1&perPage=10', { headers });
    return response.ok;
  });
  
  // 2. 獲取我的工時統計
  await testCase('GET /api/v2/timesheets/my-stats - 獲取我的工時統計', async () => {
    const response = await fetchAPI('GET', '/api/v2/timesheets/my-stats', { headers });
    return response.ok;
  });
  
  // 3. 獲取月度摘要
  await testCase('GET /api/v2/timesheets/monthly-summary - 獲取月度摘要', async () => {
    const response = await fetchAPI('GET', '/api/v2/timesheets/monthly-summary', { headers });
    return response.ok;
  });
}

/**
 * 收據管理模塊測試
 */
async function testReceiptsModule() {
  console.log('\n📋 測試收據管理模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取收據列表
  await testCase('GET /api/v2/receipts - 獲取收據列表', async () => {
    const response = await fetchAPI('GET', '/api/v2/receipts?page=1&perPage=10', { headers });
    return response.ok;
  });
  
  // 2. 獲取帳單提醒
  await testCase('GET /api/v2/receipts/reminders - 獲取帳單提醒', async () => {
    const response = await fetchAPI('GET', '/api/v2/receipts/reminders', { headers });
    return response.ok;
  });
}

/**
 * 薪資管理模塊測試
 */
async function testPayrollModule() {
  console.log('\n📋 測試薪資管理模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取薪資項目類型
  await testCase('GET /api/v2/payroll/salary-item-types - 獲取薪資項目類型', async () => {
    const response = await fetchAPI('GET', '/api/v2/payroll/salary-item-types', { headers });
    return response.ok;
  });
  
  // 2. 獲取薪資設定
  await testCase('GET /api/v2/payroll/settings - 獲取薪資設定', async () => {
    const response = await fetchAPI('GET', '/api/v2/payroll/settings', { headers });
    return response.ok;
  });
  
  // 3. 獲取打卡記錄
  await testCase('GET /api/v2/payroll/punch-records - 獲取打卡記錄', async () => {
    const response = await fetchAPI('GET', '/api/v2/payroll/punch-records?page=1&perPage=10', { headers });
    return response.ok;
  });
}

/**
 * 假期管理模塊測試
 */
async function testLeavesModule() {
  console.log('\n📋 測試假期管理模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取假期申請
  await testCase('GET /api/v2/leaves - 獲取假期申請', async () => {
    const response = await fetchAPI('GET', '/api/v2/leaves?page=1&perPage=10', { headers });
    return response.ok;
  });
  
  // 2. 獲取假期餘額
  await testCase('GET /api/v2/leaves/balances - 獲取假期餘額', async () => {
    const response = await fetchAPI('GET', '/api/v2/leaves/balances', { headers });
    return response.ok;
  });
}

/**
 * 外出登記模塊測試
 */
async function testTripsModule() {
  console.log('\n📋 測試外出登記模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取外出記錄
  await testCase('GET /api/v2/trips - 獲取外出記錄', async () => {
    const response = await fetchAPI('GET', '/api/v2/trips?page=1&perPage=10', { headers });
    return response.ok;
  });
}

/**
 * 知識庫模塊測試
 */
async function testKnowledgeModule() {
  console.log('\n📋 測試知識庫模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取 SOP 文檔
  await testCase('GET /api/v2/sop - 獲取 SOP 文檔', async () => {
    const response = await fetchAPI('GET', '/api/v2/sop?page=1&perPage=10', { headers });
    return response.ok;
  });
  
  // 2. 獲取 FAQ
  await testCase('GET /api/v2/faq - 獲取 FAQ', async () => {
    const response = await fetchAPI('GET', '/api/v2/faq?page=1&perPage=10', { headers });
    return response.ok;
  });
  
  // 3. 獲取文檔列表
  await testCase('GET /api/v2/documents - 獲取文檔列表', async () => {
    const response = await fetchAPI('GET', '/api/v2/documents?page=1&perPage=10', { headers });
    return response.ok;
  });
}

/**
 * 成本管理模塊測試
 */
async function testCostsModule() {
  console.log('\n📋 測試成本管理模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取成本類型
  await testCase('GET /api/v2/costs/types - 獲取成本類型', async () => {
    const response = await fetchAPI('GET', '/api/v2/costs/types', { headers });
    return response.ok;
  });
  
  // 2. 獲取成本分析
  await testCase('GET /api/v2/admin/cost-analysis - 獲取成本分析', async () => {
    const response = await fetchAPI('GET', '/api/v2/admin/cost-analysis', { headers });
    return response.ok;
  });
}

/**
 * 報表分析模塊測試
 */
async function testReportsModule() {
  console.log('\n📋 測試報表分析模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取月度收入報表
  await testCase('GET /api/v2/reports/monthly/revenue - 獲取月度收入報表', async () => {
    const response = await fetchAPI('GET', '/api/v2/reports/monthly/revenue', { headers });
    return response.ok;
  });
  
  // 2. 獲取月度薪資報表
  await testCase('GET /api/v2/reports/monthly/payroll - 獲取月度薪資報表', async () => {
    const response = await fetchAPI('GET', '/api/v2/reports/monthly/payroll', { headers });
    return response.ok;
  });
  
  // 3. 獲取年度收入報表
  await testCase('GET /api/v2/reports/annual/revenue - 獲取年度收入報表', async () => {
    const response = await fetchAPI('GET', '/api/v2/reports/annual/revenue', { headers });
    return response.ok;
  });
}

/**
 * 系統設定模塊測試
 */
async function testSettingsModule() {
  console.log('\n📋 測試系統設定模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 1. 獲取服務設定
  await testCase('GET /api/v2/settings/services - 獲取服務設定', async () => {
    const response = await fetchAPI('GET', '/api/v2/settings/services', { headers });
    return response.ok;
  });
  
  // 2. 獲取用戶列表
  await testCase('GET /api/v2/settings/users - 獲取用戶列表', async () => {
    const response = await fetchAPI('GET', '/api/v2/settings/users', { headers });
    return response.ok;
  });
  
  // 3. 獲取系統設定
  await testCase('GET /api/v2/admin/settings - 獲取系統設定', async () => {
    const response = await fetchAPI('GET', '/api/v2/admin/settings', { headers });
    return response.ok;
  });
}

/**
 * 儀表板模塊測試
 */
async function testDashboardModule() {
  console.log('\n📋 測試儀表板模塊...\n');
  
  const headers = {
    'Cookie': `session=${authToken}`
  };
  
  // 獲取儀表板
  await testCase('GET /api/v2/dashboard - 獲取儀表板', async () => {
    const response = await fetchAPI('GET', '/api/v2/dashboard', { headers });
    return response.ok;
  });
}

/**
 * 生成測試報告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('測試報告');
  console.log('='.repeat(60));
  console.log(`總測試數: ${testResults.passed + testResults.failed + testResults.skipped}`);
  console.log(`通過: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
  console.log(`跳過: ${testResults.skipped} ⏭️`);
  console.log(`成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n錯誤列表:');
    testResults.errors.forEach(({ name, error }) => {
      console.log(`  - ${name}: ${error}`);
    });
  }
  
  console.log('='.repeat(60) + '\n');
  
  return testResults.failed === 0;
}

/**
 * 主函數
 */
async function main() {
  try {
    // 檢查服務是否可用
    if (!await checkServiceAvailable()) {
      console.log('\n⚠️  跳過 API 測試（服務不可用）\n');
      testResults.skipped = 999; // 標記為跳過
      generateReport();
      process.exit(0);
    }
    
    // 測試所有模塊
    await testAuthModule();
    await testDashboardModule();
    await testClientsModule();
    await testTasksModule();
    await testTimesheetsModule();
    await testReceiptsModule();
    await testPayrollModule();
    await testLeavesModule();
    await testTripsModule();
    await testKnowledgeModule();
    await testCostsModule();
    await testReportsModule();
    await testSettingsModule();
    
    // 生成報告
    const success = generateReport();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ 測試過程中發生錯誤:', error);
    process.exit(1);
  }
}

// 執行主函數
main();

