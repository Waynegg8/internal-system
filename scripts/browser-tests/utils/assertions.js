/**
 * 斷言輔助函數
 * 
 * 提供各種驗證和斷言功能
 */

/**
 * 測試結果類型
 */
export class TestResult {
  constructor(testId, testName) {
    this.id = testId
    this.name = testName
    this.status = 'pending' // pending, passed, failed, skipped
    this.duration = 0
    this.error = null
    this.screenshot = null
    this.startTime = Date.now()
  }
  
  pass() {
    this.status = 'passed'
    this.duration = Date.now() - this.startTime
    console.log(`✅ [${this.id}] ${this.name} - 通過 (${this.duration}ms)`)
  }
  
  fail(error, screenshot = null) {
    this.status = 'failed'
    this.duration = Date.now() - this.startTime
    this.error = error
    this.screenshot = screenshot
    console.log(`❌ [${this.id}] ${this.name} - 失敗: ${error}`)
  }
  
  skip(reason) {
    this.status = 'skipped'
    this.duration = Date.now() - this.startTime
    this.error = reason
    console.log(`⏭️  [${this.id}] ${this.name} - 跳過: ${reason}`)
  }
}

/**
 * 基本斷言：相等
 */
export function assertEquals(actual, expected, message = '') {
  if (actual === expected) {
    return true
  }
  throw new Error(`${message}\n期望: ${expected}\n實際: ${actual}`)
}

/**
 * 基本斷言：不相等
 */
export function assertNotEquals(actual, expected, message = '') {
  if (actual !== expected) {
    return true
  }
  throw new Error(`${message}\n期望不等於: ${expected}\n實際: ${actual}`)
}

/**
 * 基本斷言：真值
 */
export function assertTrue(condition, message = '') {
  if (condition) {
    return true
  }
  throw new Error(`${message}\n期望: true\n實際: ${condition}`)
}

/**
 * 基本斷言：假值
 */
export function assertFalse(condition, message = '') {
  if (!condition) {
    return true
  }
  throw new Error(`${message}\n期望: false\n實際: ${condition}`)
}

/**
 * 基本斷言：包含
 */
export function assertContains(haystack, needle, message = '') {
  if (typeof haystack === 'string' && haystack.includes(needle)) {
    return true
  }
  if (Array.isArray(haystack) && haystack.includes(needle)) {
    return true
  }
  throw new Error(`${message}\n期望包含: ${needle}\n實際: ${haystack}`)
}

/**
 * 基本斷言：不包含
 */
export function assertNotContains(haystack, needle, message = '') {
  if (typeof haystack === 'string' && !haystack.includes(needle)) {
    return true
  }
  if (Array.isArray(haystack) && !haystack.includes(needle)) {
    return true
  }
  throw new Error(`${message}\n期望不包含: ${needle}\n實際: ${haystack}`)
}

/**
 * 基本斷言：陣列長度
 */
export function assertLength(array, expectedLength, message = '') {
  if (Array.isArray(array) && array.length === expectedLength) {
    return true
  }
  throw new Error(`${message}\n期望長度: ${expectedLength}\n實際長度: ${array.length}`)
}

/**
 * 基本斷言：大於
 */
export function assertGreaterThan(actual, expected, message = '') {
  if (actual > expected) {
    return true
  }
  throw new Error(`${message}\n期望大於: ${expected}\n實際: ${actual}`)
}

/**
 * 基本斷言：小於
 */
export function assertLessThan(actual, expected, message = '') {
  if (actual < expected) {
    return true
  }
  throw new Error(`${message}\n期望小於: ${expected}\n實際: ${actual}`)
}

/**
 * 基本斷言：範圍內
 */
export function assertInRange(actual, min, max, message = '') {
  if (actual >= min && actual <= max) {
    return true
  }
  throw new Error(`${message}\n期望範圍: ${min} - ${max}\n實際: ${actual}`)
}

/**
 * 斷言：HTTP 狀態碼
 */
export function assertHttpStatus(statusCode, expected = 200, message = '') {
  if (statusCode === expected) {
    return true
  }
  throw new Error(`${message}\nHTTP 狀態碼期望: ${expected}\n實際: ${statusCode}`)
}

/**
 * 斷言：元素存在
 */
export function assertElementExists(snapshot, text, message = '') {
  if (snapshot && snapshot.includes(text)) {
    return true
  }
  throw new Error(`${message}\n元素不存在: ${text}`)
}

/**
 * 斷言：元素不存在
 */
export function assertElementNotExists(snapshot, text, message = '') {
  if (snapshot && !snapshot.includes(text)) {
    return true
  }
  throw new Error(`${message}\n元素應不存在但存在: ${text}`)
}

/**
 * 斷言：API 請求成功
 */
export function assertApiSuccess(response, message = '') {
  if (response && (response.ok || response.status === 200)) {
    return true
  }
  throw new Error(`${message}\nAPI 請求失敗: ${response ? response.status : 'no response'}`)
}

/**
 * 斷言：無錯誤訊息
 */
export function assertNoErrors(errors, message = '') {
  if (!errors || errors.length === 0) {
    return true
  }
  throw new Error(`${message}\n發現錯誤: ${errors.join(', ')}`)
}

/**
 * 斷言：表單驗證錯誤
 */
export function assertValidationError(snapshot, fieldName, message = '') {
  const hasError = snapshot && (
    snapshot.includes(`請輸入${fieldName}`) ||
    snapshot.includes(`請選擇${fieldName}`) ||
    snapshot.includes('必填') ||
    snapshot.includes('不能為空')
  )
  
  if (hasError) {
    return true
  }
  throw new Error(`${message}\n期望出現驗證錯誤: ${fieldName}`)
}

/**
 * 斷言：成功訊息
 */
export function assertSuccessMessage(snapshot, message = '') {
  const hasSuccess = snapshot && (
    snapshot.includes('成功') ||
    snapshot.includes('已完成') ||
    snapshot.includes('已更新') ||
    snapshot.includes('已新增') ||
    snapshot.includes('已刪除')
  )
  
  if (hasSuccess) {
    return true
  }
  throw new Error(`${message}\n期望出現成功訊息`)
}

/**
 * 斷言：錯誤訊息
 */
export function assertErrorMessage(snapshot, message = '') {
  const hasError = snapshot && (
    snapshot.includes('錯誤') ||
    snapshot.includes('失敗') ||
    snapshot.includes('無法') ||
    snapshot.includes('請重試')
  )
  
  if (hasError) {
    return true
  }
  throw new Error(`${message}\n期望出現錯誤訊息`)
}

/**
 * 斷言：載入狀態
 */
export function assertLoading(snapshot, message = '') {
  const isLoading = snapshot && (
    snapshot.includes('載入中') ||
    snapshot.includes('loading') ||
    snapshot.includes('Loading')
  )
  
  if (isLoading) {
    return true
  }
  throw new Error(`${message}\n期望出現載入狀態`)
}

/**
 * 斷言：空狀態
 */
export function assertEmptyState(snapshot, message = '') {
  const isEmpty = snapshot && (
    snapshot.includes('暫無') ||
    snapshot.includes('沒有') ||
    snapshot.includes('無資料') ||
    snapshot.includes('empty')
  )
  
  if (isEmpty) {
    return true
  }
  throw new Error(`${message}\n期望出現空狀態提示`)
}

/**
 * 執行測試並捕獲錯誤
 */
export async function runTest(testResult, testFn) {
  try {
    await testFn()
    testResult.pass()
  } catch (error) {
    testResult.fail(error.message)
  }
  return testResult
}

/**
 * 批量執行測試
 */
export async function runTests(tests) {
  const results = []
  
  for (const test of tests) {
    const result = await runTest(test.result, test.fn)
    results.push(result)
  }
  
  return results
}

/**
 * 計算測試統計
 */
export function calculateStats(results) {
  const stats = {
    total: results.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    totalDuration: 0,
    passRate: 0
  }
  
  results.forEach(result => {
    stats.totalDuration += result.duration
    
    switch (result.status) {
      case 'passed':
        stats.passed++
        break
      case 'failed':
        stats.failed++
        break
      case 'skipped':
        stats.skipped++
        break
    }
  })
  
  stats.passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) : 0
  
  return stats
}

