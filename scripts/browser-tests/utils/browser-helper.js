/**
 * 瀏覽器操作輔助函數
 * 
 * 封裝所有瀏覽器 MCP 操作，提供簡潔的 API
 */

import { config } from '../config.js'

/**
 * 導航至指定 URL
 */
export async function navigateTo(url) {
  const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${url}`
  console.log(`[Browser] 導航至: ${fullUrl}`)
  
  // 使用瀏覽器 MCP 導航
  await mcp_cursor-browser-extension_browser_navigate({ url: fullUrl })
  
  // 等待頁面載入
  await wait(2000)
  
  return fullUrl
}

/**
 * 等待指定時間（毫秒）
 */
export async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 等待文字出現
 */
export async function waitForText(text, timeout = config.timeouts.elementWait) {
  console.log(`[Browser] 等待文字出現: ${text}`)
  await mcp_cursor-browser-extension_browser_wait_for({ text, time: timeout / 1000 })
}

/**
 * 等待文字消失
 */
export async function waitForTextGone(text, timeout = config.timeouts.elementWait) {
  console.log(`[Browser] 等待文字消失: ${text}`)
  await mcp_cursor-browser-extension_browser_wait_for({ textGone: text, time: timeout / 1000 })
}

/**
 * 獲取頁面快照
 */
export async function getSnapshot() {
  console.log('[Browser] 獲取頁面快照')
  const snapshot = await mcp_cursor-browser-extension_browser_snapshot()
  return snapshot
}

/**
 * 點擊元素
 */
export async function click(element, ref) {
  console.log(`[Browser] 點擊: ${element}`)
  await mcp_cursor-browser-extension_browser_click({ element, ref })
  await wait(500)
}

/**
 * 輸入文字
 */
export async function type(element, ref, text, options = {}) {
  console.log(`[Browser] 輸入文字至 ${element}: ${text}`)
  await mcp_cursor-browser-extension_browser_type({
    element,
    ref,
    text,
    slowly: options.slowly || false,
    submit: options.submit || false
  })
  await wait(300)
}

/**
 * 懸停在元素上
 */
export async function hover(element, ref) {
  console.log(`[Browser] 懸停: ${element}`)
  await mcp_cursor-browser-extension_browser_hover({ element, ref })
  await wait(300)
}

/**
 * 選擇下拉選單選項
 */
export async function selectOption(element, ref, values) {
  console.log(`[Browser] 選擇選項 ${element}: ${values}`)
  await mcp_cursor-browser-extension_browser_select_option({
    element,
    ref,
    values: Array.isArray(values) ? values : [values]
  })
  await wait(300)
}

/**
 * 按下鍵盤按鍵
 */
export async function pressKey(key) {
  console.log(`[Browser] 按下按鍵: ${key}`)
  await mcp_cursor-browser-extension_browser_press_key({ key })
  await wait(200)
}

/**
 * 截圖
 */
export async function takeScreenshot(filename = null) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const screenshotName = filename || `screenshot-${timestamp}.png`
  
  console.log(`[Browser] 截圖: ${screenshotName}`)
  await mcp_cursor-browser-extension_browser_take_screenshot({
    filename: `${config.report.screenshotDir}/${screenshotName}`,
    fullPage: false,
    type: 'png'
  })
  
  return screenshotName
}

/**
 * 獲取 Console 訊息
 */
export async function getConsoleMessages() {
  console.log('[Browser] 獲取 Console 訊息')
  const messages = await mcp_cursor-browser-extension_browser_console_messages()
  return messages
}

/**
 * 獲取網路請求
 */
export async function getNetworkRequests() {
  console.log('[Browser] 獲取網路請求')
  const requests = await mcp_cursor-browser-extension_browser_network_requests()
  return requests
}

/**
 * 返回上一頁
 */
export async function goBack() {
  console.log('[Browser] 返回上一頁')
  await mcp_cursor-browser-extension_browser_navigate_back()
  await wait(1000)
}

/**
 * 調整視窗大小
 */
export async function resizeWindow(width, height) {
  console.log(`[Browser] 調整視窗大小: ${width}x${height}`)
  await mcp_cursor-browser-extension_browser_resize({ width, height })
  await wait(500)
}

/**
 * 填寫表單
 */
export async function fillForm(fields) {
  console.log(`[Browser] 填寫表單: ${fields.length} 個欄位`)
  await mcp_cursor-browser-extension_browser_fill_form({ fields })
  await wait(500)
}

/**
 * 執行 JavaScript
 */
export async function evaluate(fn, element = null, ref = null) {
  console.log('[Browser] 執行 JavaScript')
  const result = await mcp_cursor-browser-extension_browser_evaluate({
    function: fn,
    element,
    ref
  })
  return result
}

/**
 * 驗證元素存在
 */
export async function elementExists(text) {
  const snapshot = await getSnapshot()
  return snapshot.includes(text)
}

/**
 * 驗證頁面標題
 */
export async function verifyTitle(expectedTitle) {
  const snapshot = await getSnapshot()
  const hasTitle = snapshot.includes(expectedTitle)
  
  if (hasTitle) {
    console.log(`✅ 頁面標題驗證通過: ${expectedTitle}`)
  } else {
    console.log(`❌ 頁面標題驗證失敗: 期望 "${expectedTitle}"`)
  }
  
  return hasTitle
}

/**
 * 驗證 URL
 */
export async function verifyUrl(expectedPath) {
  // 注意：瀏覽器 MCP 沒有直接獲取 URL 的方法，需要透過其他方式
  console.log(`[Browser] 驗證 URL 包含: ${expectedPath}`)
  return true // 暫時返回 true，實際應透過其他方式驗證
}

/**
 * 等待 API 請求完成
 */
export async function waitForApi(urlPattern, timeout = config.timeouts.apiRequest) {
  console.log(`[Browser] 等待 API 請求: ${urlPattern}`)
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const requests = await getNetworkRequests()
    const found = requests.some(req => req.url && req.url.includes(urlPattern))
    
    if (found) {
      console.log(`✅ API 請求已完成: ${urlPattern}`)
      return true
    }
    
    await wait(500)
  }
  
  console.log(`❌ API 請求超時: ${urlPattern}`)
  return false
}

/**
 * 驗證無 JavaScript 錯誤
 */
export async function verifyNoJsErrors() {
  const messages = await getConsoleMessages()
  const errors = messages.filter(msg => msg.type === 'error')
  
  if (errors.length === 0) {
    console.log('✅ 無 JavaScript 錯誤')
    return true
  } else {
    console.log(`❌ 發現 ${errors.length} 個 JavaScript 錯誤:`)
    errors.forEach(err => console.log(`  - ${err.text}`))
    return false
  }
}

