/**
 * 瀏覽器測試配置
 * 
 * 此檔案包含所有測試的配置資訊
 */

export const config = {
  // 部署 URL（可由環境變數覆寫 TEST_BASE_URL）
  baseUrl: process.env.TEST_BASE_URL || 'https://v2.horgoscpa.com',
  
  // 測試帳號（從 seed-test-data.js 獲取）
  accounts: {
    admin: {
      username: 'admin',
      password: '111111',
      isAdmin: true
    },
    user: {
      username: 'liu',  // 劉會計
      password: '111111',
      isAdmin: false
    }
  },
  
  // 超時設定（毫秒）
  timeouts: {
    pageLoad: 30000,      // 頁面載入超時
    apiRequest: 10000,    // API 請求超時
    elementWait: 5000,    // 元素等待超時
    userAction: 1000      // 使用者操作響應超時
  },
  
  // 測試資料設定
  testData: {
    clientPrefix: 'TEST_',
    taskPrefix: 'TEST_TASK_',
    cleanupAfterTest: true
  },
  
  // 報告設定
  report: {
    outputDir: './test-results',
    screenshotDir: './test-results/screenshots',
    generateHtml: true,
    generateJson: true
  },
  
  // 瀏覽器設定
  browser: {
    headless: false,      // 顯示瀏覽器視窗
    viewport: {
      width: 1920,
      height: 1080
    }
  }
}

