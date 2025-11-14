/**
 * 登入功能測試
 * 
 * 測試登入頁面的所有功能
 */

import { TestResult } from '../utils/assertions.js'
import * as browser from '../utils/browser-helper.js'
import { config } from '../config.js'

/**
 * 執行登入測試
 */
export async function run(runner) {
  const report = runner.startTestFile('test-login.js', '登入頁面')
  
  // AUTH-001: 訪問登入頁面
  const test001 = new TestResult('AUTH-001', '訪問登入頁面成功載入')
  try {
    await browser.navigateTo('/login')
    await browser.wait(2000)
    const snapshot = await browser.getSnapshot()
    
    if (snapshot.includes('登入') || snapshot.includes('帳號') || snapshot.includes('密碼')) {
      test001.pass()
    } else {
      test001.fail('登入頁面元素未找到')
    }
  } catch (error) {
    test001.fail(error.message)
  }
  report.addResult(test001)
  
  // AUTH-002: 驗證頁面標題
  const test002 = new TestResult('AUTH-002', '頁面標題正確顯示')
  try {
    const snapshot = await browser.getSnapshot()
    
    if (snapshot.includes('Horgoscpa') || snapshot.includes('登入系統')) {
      test002.pass()
    } else {
      test002.fail('頁面標題不正確')
    }
  } catch (error) {
    test002.fail(error.message)
  }
  report.addResult(test002)
  
  // AUTH-003: 驗證表單元素存在
  const test003 = new TestResult('AUTH-003', '登入表單元素存在')
  try {
    const snapshot = await browser.getSnapshot()
    
    const hasUsernameField = snapshot.includes('帳號') || snapshot.includes('使用者名稱') || snapshot.includes('Email')
    const hasPasswordField = snapshot.includes('密碼')
    const hasSubmitButton = snapshot.includes('登入')
    
    if (hasUsernameField && hasPasswordField && hasSubmitButton) {
      test003.pass()
    } else {
      test003.fail('表單元素不完整')
    }
  } catch (error) {
    test003.fail(error.message)
  }
  report.addResult(test003)
  
  // AUTH-004: 測試空白提交
  const test004 = new TestResult('AUTH-004', '空白表單提交顯示驗證錯誤')
  try {
    const snapshot = await browser.getSnapshot()
    
    // 尋找登入按鈕並點擊
    // 注意：這需要根據實際快照中的 ref 來調整
    // await browser.click('登入按鈕', 'button[type="submit"]')
    // await browser.wait(1000)
    
    // const newSnapshot = await browser.getSnapshot()
    // const hasError = newSnapshot.includes('請輸入') || newSnapshot.includes('不能為空')
    
    // if (hasError) {
    //   test004.pass()
    // } else {
    //   test004.fail('未顯示驗證錯誤')
    // }
    
    // 暫時跳過此測試，等待實際快照
    test004.skip('需要實際快照才能執行')
  } catch (error) {
    test004.fail(error.message)
  }
  report.addResult(test004)
  
  // AUTH-005: 測試使用一般使用者登入
  const test005 = new TestResult('AUTH-005', '使用一般使用者帳號成功登入')
  try {
    // 輸入帳號密碼
    // await browser.type('帳號輸入框', 'input[name="username"]', config.accounts.user.username)
    // await browser.type('密碼輸入框', 'input[name="password"]', config.accounts.user.password)
    // await browser.click('登入按鈕', 'button[type="submit"]')
    
    // 等待跳轉
    // await browser.wait(3000)
    
    // 驗證跳轉至儀表板
    // const snapshot = await browser.getSnapshot()
    // if (snapshot.includes('儀表板') || snapshot.includes('Dashboard')) {
    //   test005.pass()
    // } else {
    //   test005.fail('未成功跳轉至儀表板')
    // }
    
    test005.skip('需要實際快照才能執行')
  } catch (error) {
    test005.fail(error.message)
  }
  report.addResult(test005)
  
  // AUTH-006: 測試使用管理員登入
  const test006 = new TestResult('AUTH-006', '使用管理員帳號成功登入')
  try {
    test006.skip('需要實際快照才能執行')
  } catch (error) {
    test006.fail(error.message)
  }
  report.addResult(test006)
  
  // AUTH-007: 測試錯誤密碼
  const test007 = new TestResult('AUTH-007', '錯誤密碼顯示錯誤訊息')
  try {
    test007.skip('需要實際快照才能執行')
  } catch (error) {
    test007.fail(error.message)
  }
  report.addResult(test007)
  
  // AUTH-008: 測試不存在的帳號
  const test008 = new TestResult('AUTH-008', '不存在的帳號顯示錯誤訊息')
  try {
    test008.skip('需要實際快照才能執行')
  } catch (error) {
    test008.fail(error.message)
  }
  report.addResult(test008)
  
  // 完成測試檔案
  await runner.endTestFile()
}

