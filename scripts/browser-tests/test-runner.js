/**
 * 主測試執行器
 * 
 * 統一管理和執行所有測試
 */

import { config } from './config.js'
import { TestReport, generateJsonReport, generateHtmlReport, generateSummaryReport, printProgress } from './utils/reporter.js'

/**
 * 測試執行器類
 */
export class TestRunner {
  constructor() {
    this.reports = []
    this.currentReport = null
  }
  
  /**
   * 初始化測試環境
   */
  async initialize() {
    console.log('🚀 初始化測試環境...')
    console.log(`瀏覽器設定: ${config.browser.viewport.width}x${config.browser.viewport.height}`)
    console.log(`報告輸出: ${config.report.outputDir}`)
    
    // 創建報告目錄（在實際執行時）
    console.log('📁 創建報告目錄...')
  }
  
  /**
   * 開始新的測試檔案
   */
  startTestFile(testFile, pageName) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📝 開始測試: ${testFile}`)
    console.log(`📄 頁面: ${pageName}`)
    console.log('='.repeat(80))
    
    this.currentReport = new TestReport(testFile, pageName)
    return this.currentReport
  }
  
  /**
   * 結束當前測試檔案
   */
  async endTestFile() {
    if (!this.currentReport) return
    
    this.currentReport.finalize()
    this.reports.push(this.currentReport)
    
    const summary = this.currentReport.getSummary()
    
    console.log(`\n${'='.repeat(80)}`)
    console.log(`✅ 測試完成: ${this.currentReport.testFile}`)
    console.log(`總計: ${summary.total} | 通過: ${summary.passed} | 失敗: ${summary.failed} | 跳過: ${summary.skipped}`)
    console.log(`通過率: ${summary.passRate}% | 耗時: ${this.currentReport.duration.toFixed(2)}秒`)
    console.log('='.repeat(80))
    
    // 生成報告
    if (config.report.generateJson) {
      const jsonReport = await generateJsonReport(this.currentReport)
      console.log(`📊 JSON 報告: ${jsonReport.filename}`)
    }
    
    if (config.report.generateHtml) {
      const htmlReport = await generateHtmlReport(this.currentReport)
      console.log(`📊 HTML 報告: ${htmlReport.filename}`)
    }
    
    this.currentReport = null
  }
  
  /**
   * 執行所有測試
   */
  async runAllTests(testFiles) {
    console.log('\n' + '🎯'.repeat(40))
    console.log('開始執行全部測試')
    console.log('🎯'.repeat(40) + '\n')
    
    const totalFiles = testFiles.length
    let currentFile = 0
    
    for (const testFile of testFiles) {
      currentFile++
      printProgress(currentFile, totalFiles, testFile.name)
      
      try {
        // 動態載入測試檔案並執行
        // 在實際環境中，這裡會使用 import() 動態載入
        console.log(`載入測試: ${testFile.path}`)
        
        // 執行測試（實際執行時會呼叫測試檔案的 run 函數）
        // await testFile.run(this)
        
      } catch (error) {
        console.error(`❌ 測試檔案執行失敗: ${testFile.path}`)
        console.error(error)
      }
    }
    
    // 生成彙總報告
    const summary = await generateSummaryReport(this.reports)
    
    return summary
  }
  
  /**
   * 清理測試環境
   */
  async cleanup() {
    console.log('\n🧹 清理測試環境...')
    
    if (config.testData.cleanupAfterTest) {
      console.log('🗑️  清理測試資料...')
      // 實際清理邏輯
    }
    
    console.log('✅ 清理完成')
  }
}

/**
 * 主執行函數
 */
export async function main() {
  const runner = new TestRunner()
  
  try {
    // 初始化
    await runner.initialize()
    
    // 定義所有測試檔案
    const testFiles = [
      { name: '認證測試', path: './auth/test-login.js' },
      { name: '儀表板測試', path: './dashboard/test-dashboard.js' },
      { name: '客戶列表測試', path: './clients/test-clients-list.js' },
      // ... 更多測試檔案
    ]
    
    // 執行所有測試
    const summary = await runner.runAllTests(testFiles)
    
    // 清理
    await runner.cleanup()
    
    // 返回結果
    return summary
    
  } catch (error) {
    console.error('❌ 測試執行器錯誤:', error)
    throw error
  }
}

// 如果直接執行此檔案
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

