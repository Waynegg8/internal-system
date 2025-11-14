/**
 * 測試報告生成器
 * 
 * 生成 JSON 和 HTML 格式的測試報告
 */

import { config } from '../config.js'
import { calculateStats } from './assertions.js'

/**
 * 測試報告類
 */
export class TestReport {
  constructor(testFile, pageName) {
    this.testFile = testFile
    this.page = pageName
    this.timestamp = new Date().toISOString()
    this.duration = 0
    this.results = []
    this.startTime = Date.now()
  }
  
  addResult(result) {
    this.results.push(result)
  }
  
  finalize() {
    this.duration = (Date.now() - this.startTime) / 1000 // 轉換為秒
  }
  
  getSummary() {
    return calculateStats(this.results)
  }
  
  toJSON() {
    return {
      testFile: this.testFile,
      page: this.page,
      timestamp: this.timestamp,
      duration: this.duration,
      summary: this.getSummary(),
      tests: this.results.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        duration: r.duration,
        error: r.error,
        screenshot: r.screenshot
      }))
    }
  }
}

/**
 * 生成 JSON 報告
 */
export async function generateJsonReport(report) {
  const json = JSON.stringify(report.toJSON(), null, 2)
  const filename = `${config.report.outputDir}/${report.testFile.replace('.js', '')}-${Date.now()}.json`
  
  console.log(`📊 生成 JSON 報告: ${filename}`)
  
  // 注意：這裡需要使用 write 工具來寫入檔案
  // 在實際執行時會透過工具寫入
  return { filename, content: json }
}

/**
 * 生成 HTML 報告
 */
export async function generateHtmlReport(report) {
  const summary = report.getSummary()
  
  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>測試報告 - ${report.page}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft JhengHei', sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header .meta {
      opacity: 0.9;
      font-size: 14px;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .stat-card.passed {
      border-left-color: #10b981;
    }
    
    .stat-card.failed {
      border-left-color: #ef4444;
    }
    
    .stat-card.skipped {
      border-left-color: #f59e0b;
    }
    
    .stat-card .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
      font-weight: 600;
    }
    
    .stat-card .value {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
    }
    
    .tests {
      padding: 30px;
    }
    
    .test-item {
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 15px;
      transition: all 0.2s;
    }
    
    .test-item:hover {
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .test-item.passed {
      border-left: 4px solid #10b981;
      background: #f0fdf4;
    }
    
    .test-item.failed {
      border-left: 4px solid #ef4444;
      background: #fef2f2;
    }
    
    .test-item.skipped {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
    }
    
    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    
    .test-id {
      font-family: monospace;
      font-size: 12px;
      background: #e5e7eb;
      padding: 4px 8px;
      border-radius: 4px;
      color: #374151;
      font-weight: 600;
    }
    
    .test-name {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 8px 0;
    }
    
    .test-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .test-status.passed {
      background: #10b981;
      color: white;
    }
    
    .test-status.failed {
      background: #ef4444;
      color: white;
    }
    
    .test-status.skipped {
      background: #f59e0b;
      color: white;
    }
    
    .test-duration {
      font-size: 12px;
      color: #6b7280;
      margin-top: 8px;
    }
    
    .test-error {
      margin-top: 15px;
      padding: 15px;
      background: #fee;
      border-left: 3px solid #ef4444;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      color: #991b1b;
      white-space: pre-wrap;
    }
    
    .test-screenshot {
      margin-top: 15px;
    }
    
    .test-screenshot img {
      max-width: 100%;
      border-radius: 4px;
      border: 1px solid #e5e7eb;
    }
    
    .footer {
      padding: 20px 30px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 測試報告：${report.page}</h1>
      <div class="meta">
        <div>測試檔案：${report.testFile}</div>
        <div>執行時間：${new Date(report.timestamp).toLocaleString('zh-TW')}</div>
        <div>總耗時：${report.duration.toFixed(2)} 秒</div>
      </div>
    </div>
    
    <div class="summary">
      <div class="stat-card">
        <div class="label">總測試數</div>
        <div class="value">${summary.total}</div>
      </div>
      <div class="stat-card passed">
        <div class="label">通過</div>
        <div class="value">${summary.passed}</div>
      </div>
      <div class="stat-card failed">
        <div class="label">失敗</div>
        <div class="value">${summary.failed}</div>
      </div>
      <div class="stat-card skipped">
        <div class="label">跳過</div>
        <div class="value">${summary.skipped}</div>
      </div>
      <div class="stat-card">
        <div class="label">通過率</div>
        <div class="value">${summary.passRate}%</div>
      </div>
    </div>
    
    <div class="tests">
      <h2 style="margin-bottom: 20px; color: #1f2937;">測試項目詳情</h2>
      ${report.results.map(test => `
        <div class="test-item ${test.status}">
          <div class="test-header">
            <div>
              <div class="test-id">${test.id}</div>
              <div class="test-name">${test.name}</div>
            </div>
            <span class="test-status ${test.status}">
              ${test.status === 'passed' ? '✓ 通過' : test.status === 'failed' ? '✗ 失敗' : '⊘ 跳過'}
            </span>
          </div>
          <div class="test-duration">⏱️ 耗時：${test.duration}ms</div>
          ${test.error ? `<div class="test-error">❌ 錯誤訊息：\n${test.error}</div>` : ''}
          ${test.screenshot ? `
            <div class="test-screenshot">
              <img src="${test.screenshot}" alt="測試截圖" />
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    
    <div class="footer">
      <p>測試報告自動生成 © ${new Date().getFullYear()}</p>
      <p style="margin-top: 5px; font-size: 12px;">Powered by Horgoscpa Testing Framework</p>
    </div>
  </div>
</body>
</html>
  `.trim()
  
  const filename = `${config.report.outputDir}/${report.testFile.replace('.js', '')}-${Date.now()}.html`
  
  console.log(`📊 生成 HTML 報告: ${filename}`)
  
  return { filename, content: html }
}

/**
 * 生成彙總報告（多個測試檔案）
 */
export async function generateSummaryReport(reports) {
  const allResults = reports.flatMap(r => r.results)
  const totalStats = calculateStats(allResults)
  
  const summary = {
    timestamp: new Date().toISOString(),
    totalFiles: reports.length,
    totalTests: totalStats.total,
    passed: totalStats.passed,
    failed: totalStats.failed,
    skipped: totalStats.skipped,
    passRate: totalStats.passRate,
    totalDuration: reports.reduce((sum, r) => sum + r.duration, 0),
    reports: reports.map(r => ({
      file: r.testFile,
      page: r.page,
      summary: r.getSummary(),
      duration: r.duration
    }))
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('📊 測試彙總報告')
  console.log('='.repeat(80))
  console.log(`總測試檔案數: ${summary.totalFiles}`)
  console.log(`總測試項目數: ${summary.totalTests}`)
  console.log(`✅ 通過: ${summary.passed}`)
  console.log(`❌ 失敗: ${summary.failed}`)
  console.log(`⏭️  跳過: ${summary.skipped}`)
  console.log(`📈 通過率: ${summary.passRate}%`)
  console.log(`⏱️  總耗時: ${summary.totalDuration.toFixed(2)} 秒`)
  console.log('='.repeat(80) + '\n')
  
  return summary
}

/**
 * 保存報告到檔案
 */
export function saveReport(filename, content) {
  // 此函數會在測試執行器中使用 write 工具來保存檔案
  return { filename, content }
}

/**
 * 打印測試進度
 */
export function printProgress(current, total, testName) {
  const percentage = ((current / total) * 100).toFixed(0)
  const bar = '█'.repeat(Math.floor(current / total * 30))
  const empty = '░'.repeat(30 - Math.floor(current / total * 30))
  
  console.log(`\n[${ bar}${empty}] ${percentage}% (${current}/${total})`)
  console.log(`正在執行: ${testName}`)
}

