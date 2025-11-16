import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 測試配置
 * 
 * 使用說明：
 * 1. Codegen（錄製測試）：npm run test:codegen
 * 2. UI Mode（視覺化測試）：npm run test:ui
 * 3. 執行測試：npm test
 */
export default defineConfig({
  // 測試目錄
  testDir: './tests/e2e',
  
  // 測試超時時間（30秒）
  timeout: 30 * 1000,
  
  // 預期測試失敗時的處理
  expect: {
    timeout: 5000
  },
  
  // 並行執行設定
  fullyParallel: true,
  
  // CI 模式下失敗時不重試
  forbidOnly: !!process.env.CI,
  
  // CI 模式下重試次數
  retries: process.env.CI ? 2 : 0,
  
  // 並行 worker 數量
  workers: process.env.CI ? 1 : undefined,
  
  // 報告設定
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  // 共用設定
  use: {
    // 基礎 URL（必須透過環境變數設定，因為每次部署 URL 會變動）
    // 使用方式：
    //   1. 自動獲取: npm run test:get-url
    //   2. 手動設定: $env:PLAYWRIGHT_BASE_URL="https://xxx.pages.dev"; npm test
    baseURL: process.env.PLAYWRIGHT_BASE_URL || (() => {
      console.error('\n❌ 錯誤: 未設定 PLAYWRIGHT_BASE_URL 環境變數')
      console.error('\n   解決方式:')
      console.error('   1. 自動獲取最新部署 URL: npm run test:get-url')
      console.error('   2. 手動設定: $env:PLAYWRIGHT_BASE_URL="https://xxx.pages.dev"; npm test')
      console.error('')
      process.exit(1)
      return ''
    })(),
    
    // 截圖設定
    screenshot: 'only-on-failure',
    
    // 錄影設定（失敗時錄影）
    video: 'retain-on-failure',
    
    // 追蹤設定（失敗時追蹤）
    trace: 'retain-on-failure',
    
    // 瀏覽器設定
    viewport: { width: 1920, height: 1080 },
    
    // 動作超時
    actionTimeout: 10000,
  },

  // 專案設定（不同瀏覽器）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 可以取消註解來測試其他瀏覽器
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // 不使用本地伺服器（直接測試遠端）
  // 如需本地測試，可設定環境變數：PLAYWRIGHT_BASE_URL=http://localhost:5173
})

