/**
 * 本地測試終極預聚合方案
 * 使用本地 D1 數據庫進行完整測試
 */

import { syncTaskGenerationTemplates, generateQueueFromTemplates } from './src/handlers/task-generator/pre-aggregation-ultimate.js';

// 模擬 Cloudflare Workers 環境
const mockEnv = {
  DATABASE: null // 將從 wrangler d1 獲取
};

// 創建測試數據
async function setupTestData(env) {
  console.log('[測試] 開始設置測試數據...');
  
  // 1. 創建測試客戶
  await env.DATABASE.prepare(`
    INSERT OR IGNORE INTO Clients (client_id, company_name, tax_registration_number, assignee_user_id, is_deleted)
    VALUES ('test_client_001', '測試客戶001', '12345678', 1, 0)
  `).run();
  
  // 2. 創建測試服務
  await env.DATABASE.prepare(`
    INSERT OR IGNORE INTO Services (service_id, service_name, service_code, is_deleted)
    VALUES (1, '測試服務', 'TEST001', 0)
  `).run();
  
  // 3. 創建客戶服務
  await env.DATABASE.prepare(`
    INSERT OR IGNORE INTO ClientServices 
    (client_service_id, client_id, service_id, status, service_type, use_for_auto_generate, is_deleted)
    VALUES (1, 'test_client_001', 1, 'active', 'recurring', 1, 0)
  `).run();
  
  // 4. 創建任務配置
  await env.DATABASE.prepare(`
    INSERT OR IGNORE INTO ClientServiceTaskConfigs 
    (config_id, client_service_id, task_name, task_description, stage_order, 
     generation_time_rule, generation_time_params, due_rule, days_due, 
     execution_frequency, auto_generate, is_deleted)
    VALUES 
    (1, 1, '測試任務1', '測試任務描述1', 1, 'month_start', '{}', 'days_after_generation', 7, 'monthly', 1, 0),
    (2, 1, '測試任務2', '測試任務描述2', 2, 'month_start', '{}', 'days_after_generation', 14, 'monthly', 1, 0)
  `).run();
  
  console.log('[測試] 測試數據設置完成');
}

// 測試 syncTaskGenerationTemplates
async function testSyncTemplates(env) {
  console.log('\n[測試] ===== 測試 syncTaskGenerationTemplates =====');
  
  try {
    const result = await syncTaskGenerationTemplates(env, { force: false });
    
    console.log('[測試] syncTaskGenerationTemplates 結果:', {
      syncedCount: result.syncedCount,
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      unchangedCount: result.unchangedCount,
      queryCount: result.queryCount
    });
    
    // 驗證結果
    const checks = [
      { name: '返回 syncedCount', pass: typeof result.syncedCount === 'number' },
      { name: '返回 createdCount', pass: typeof result.createdCount === 'number' },
      { name: '返回 updatedCount', pass: typeof result.updatedCount === 'number' },
      { name: '返回 unchangedCount', pass: typeof result.unchangedCount === 'number' },
      { name: '返回 queryCount', pass: typeof result.queryCount === 'number' },
      { name: 'queryCount <= 50', pass: result.queryCount <= 50 },
      { name: 'syncedCount = createdCount + updatedCount', pass: result.syncedCount === result.createdCount + result.updatedCount }
    ];
    
    // 檢查模板是否創建
    const templates = await env.DATABASE.prepare(`
      SELECT COUNT(*) as count FROM TaskGenerationTemplates WHERE is_active = 1
    `).first();
    
    checks.push({ 
      name: '模板已創建', 
      pass: templates?.count > 0 
    });
    
    console.log('\n[測試] 驗證結果:');
    const passed = checks.filter(c => c.pass).length;
    checks.forEach(c => {
      console.log((c.pass ? '✅' : '❌') + ' ' + c.name);
    });
    
    console.log(`\n[測試] 通過率: ${passed}/${checks.length} (${(passed/checks.length*100).toFixed(1)}%)`);
    
    return { passed, total: checks.length, result };
  } catch (err) {
    console.error('[測試] syncTaskGenerationTemplates 失敗:', err);
    throw err;
  }
}

// 測試 generateQueueFromTemplates
async function testGenerateQueue(env) {
  console.log('\n[測試] ===== 測試 generateQueueFromTemplates =====');
  
  const targetYear = 2025;
  const targetMonth = 11;
  
  try {
    const result = await generateQueueFromTemplates(env, targetYear, targetMonth, { 
      now: new Date(), 
      force: true 
    });
    
    console.log('[測試] generateQueueFromTemplates 結果:', {
      queuedCount: result.queuedCount,
      queryCount: result.queryCount,
      skipped: result.skipped
    });
    
    // 驗證結果
    const checks = [
      { name: '返回 queuedCount', pass: typeof result.queuedCount === 'number' },
      { name: '返回 queryCount', pass: typeof result.queryCount === 'number' },
      { name: '返回 skipped', pass: typeof result.skipped === 'boolean' || typeof result.skipped === 'undefined' },
      { name: 'queryCount <= 50', pass: result.queryCount <= 50 }
    ];
    
    // 檢查 Queue 是否創建
    const queueItems = await env.DATABASE.prepare(`
      SELECT COUNT(*) as count 
      FROM TaskGenerationQueue 
      WHERE target_year = ? AND target_month = ?
    `).bind(targetYear, targetMonth).first();
    
    checks.push({ 
      name: 'Queue 項目已創建', 
      pass: queueItems?.count > 0 
    });
    
    // 驗證 queuedCount 與實際插入數量一致
    if (queueItems?.count !== undefined) {
      checks.push({ 
        name: 'queuedCount 與實際數量一致', 
        pass: result.queuedCount === queueItems.count 
      });
    }
    
    console.log('\n[測試] 驗證結果:');
    const passed = checks.filter(c => c.pass).length;
    checks.forEach(c => {
      console.log((c.pass ? '✅' : '❌') + ' ' + c.name);
    });
    
    console.log(`\n[測試] 通過率: ${passed}/${checks.length} (${(passed/checks.length*100).toFixed(1)}%)`);
    
    return { passed, total: checks.length, result };
  } catch (err) {
    console.error('[測試] generateQueueFromTemplates 失敗:', err);
    throw err;
  }
}

// 測試模板複用
async function testTemplateReuse(env) {
  console.log('\n[測試] ===== 測試模板複用機制 =====');
  
  try {
    // 第一次運行
    const result1 = await syncTaskGenerationTemplates(env, { force: false });
    console.log('[測試] 第一次運行:', {
      createdCount: result1.createdCount,
      updatedCount: result1.updatedCount,
      unchangedCount: result1.unchangedCount
    });
    
    // 第二次運行（應該複用模板）
    const result2 = await syncTaskGenerationTemplates(env, { force: false });
    console.log('[測試] 第二次運行:', {
      createdCount: result2.createdCount,
      updatedCount: result2.updatedCount,
      unchangedCount: result2.unchangedCount
    });
    
    const checks = [
      { name: '第二次運行 createdCount = 0', pass: result2.createdCount === 0 },
      { name: '第二次運行 updatedCount = 0', pass: result2.updatedCount === 0 },
      { name: '第二次運行 unchangedCount > 0', pass: result2.unchangedCount > 0 },
      { name: '模板複用機制正常', pass: result2.unchangedCount > 0 && result2.createdCount === 0 }
    ];
    
    console.log('\n[測試] 驗證結果:');
    const passed = checks.filter(c => c.pass).length;
    checks.forEach(c => {
      console.log((c.pass ? '✅' : '❌') + ' ' + c.name);
    });
    
    console.log(`\n[測試] 通過率: ${passed}/${checks.length} (${(passed/checks.length*100).toFixed(1)}%)`);
    
    return { passed, total: checks.length };
  } catch (err) {
    console.error('[測試] 模板複用測試失敗:', err);
    throw err;
  }
}

// 主測試函數
async function runTests() {
  console.log('=== 終極預聚合方案本地測試 ===\n');
  
  // 注意：這個測試需要在 Cloudflare Workers 環境中運行
  // 或者需要模擬 D1 數據庫連接
  console.log('[測試] 注意：此測試需要實際的 D1 數據庫連接');
  console.log('[測試] 建議使用 wrangler dev 或實際部署環境進行測試');
  
  // 嘗試從 wrangler 獲取本地數據庫
  try {
    const { getBindings } = await import('wrangler');
    const bindings = await getBindings();
    if (bindings && bindings.DATABASE) {
      mockEnv.DATABASE = bindings.DATABASE;
      console.log('[測試] 成功獲取本地 D1 數據庫連接');
    } else {
      throw new Error('無法獲取 D1 數據庫連接');
    }
  } catch (err) {
    console.log('[測試] 無法直接獲取 D1 連接，將使用 wrangler d1 execute 進行測試');
    console.log('[測試] 請手動運行測試腳本或使用 wrangler dev');
    return;
  }
  
  try {
    // 設置測試數據
    await setupTestData(mockEnv);
    
    // 運行測試
    const test1 = await testSyncTemplates(mockEnv);
    const test2 = await testGenerateQueue(mockEnv);
    const test3 = await testTemplateReuse(mockEnv);
    
    // 總結
    const totalPassed = test1.passed + test2.passed + test3.passed;
    const totalChecks = test1.total + test2.total + test3.total;
    const passRate = (totalPassed / totalChecks * 100).toFixed(1);
    
    console.log('\n=== 測試總結 ===');
    console.log(`總通過率: ${totalPassed}/${totalChecks} (${passRate}%)`);
    
    if (passRate === '100.0') {
      console.log('✅ 所有測試 100% 通過！');
    } else {
      console.log(`❌ 測試未完全通過，需要修復 ${totalChecks - totalPassed} 個問題`);
    }
  } catch (err) {
    console.error('[測試] 測試執行失敗:', err);
    throw err;
  }
}

// 如果直接運行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, setupTestData, testSyncTemplates, testGenerateQueue, testTemplateReuse };


