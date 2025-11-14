/**
 * 前端路由測試腳本
 * 測試所有前端路由的可訪問性和頁面渲染
 * 
 * 使用方法:
 *   node scripts/test-frontend-routes.js --url http://localhost:5173
 */

import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 解析命令行參數
const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith('--url='));
const baseUrl = urlArg ? urlArg.split('=')[1] : 'http://localhost:5173';

console.log(`🌐 開始測試前端路由 (${baseUrl})...\n`);

// 測試結果
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// 需要測試的路由列表（從 router/index.js 提取）
const routes = [
  { path: '/login', name: '登入頁', requiresAuth: false },
  { path: '/dashboard', name: '儀表板', requiresAuth: true },
  { path: '/clients', name: '客戶管理', requiresAuth: true },
  { path: '/clients/add', name: '新增客戶', requiresAuth: true },
  { path: '/tasks', name: '任務管理', requiresAuth: true },
  { path: '/tasks/new', name: '新增任務', requiresAuth: true },
  { path: '/tasks/overview', name: '任務總覽', requiresAuth: true },
  { path: '/timesheets', name: '工時管理', requiresAuth: true },
  { path: '/receipts', name: '收據管理', requiresAuth: true },
  { path: '/payroll', name: '薪資管理', requiresAuth: true, requiresAdmin: true },
  { path: '/leaves', name: '假期管理', requiresAuth: true },
  { path: '/costs', name: '成本管理', requiresAuth: true, requiresAdmin: true },
  { path: '/trips', name: '外出登記', requiresAuth: true },
  { path: '/knowledge', name: '知識庫', requiresAuth: true },
  { path: '/settings', name: '系統設定', requiresAuth: true, requiresAdmin: true },
  { path: '/profile', name: '個人資料', requiresAuth: true },
  { path: '/reports', name: '報表分析', requiresAuth: true, requiresAdmin: true },
];

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
 * 測試路由可訪問性（使用 fetch，不依賴瀏覽器）
 */
async function testRouteAccessibility() {
  console.log('\n📋 測試路由可訪問性...\n');
  
  for (const route of routes) {
    await testCase(`${route.name} (${route.path})`, async () => {
      try {
        const response = await fetch(`${baseUrl}${route.path}`, {
          method: 'GET',
          redirect: 'manual' // 不自動跟隨重定向
        });
        
        // 對於需要認證的路由，可能會重定向到登入頁（302/307）或返回 200（已登入）
        // 對於不需要認證的路由，應該返回 200
        if (route.requiresAuth) {
          // 允許重定向（未登入）或 200（已登入）
          return response.status === 200 || response.status === 302 || response.status === 307;
        } else {
          // 不需要認證的路由應該返回 200
          return response.status === 200;
        }
      } catch (error) {
        // 網絡錯誤或其他錯誤
        return false;
      }
    });
  }
}

/**
 * 測試頁面內容（使用 fetch 獲取 HTML）
 */
async function testPageContent() {
  console.log('\n📋 測試頁面內容...\n');
  
  // 只測試登入頁（不需要認證）
  await testCase('登入頁內容', async () => {
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) {
        const html = await response.text();
        // 檢查是否包含基本的 HTML 結構
        return html.includes('<html') || html.includes('<!DOCTYPE') || html.includes('<div');
      }
      return false;
    } catch (error) {
      return false;
    }
  });
}


/**
 * 生成測試報告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('前端路由測試報告');
  console.log('='.repeat(60));
  console.log(`總測試數: ${testResults.passed + testResults.failed}`);
  console.log(`通過: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
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
    await testRouteAccessibility();
    await testPageContent();
    
    const success = generateReport();
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ 測試過程中發生錯誤:', error);
    process.exit(1);
  }
}

// 執行主函數
main();



