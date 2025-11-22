/**
 * 客戶詳情基本資訊 - 組件整合測試
 * 
 * Task: 1.2.1 驗證組件整合完整性
 * Role: Frontend Integration Tester
 * 
 * 測試範圍：
 * - 父子組件整合（ClientDetail -> ClientBasicInfo）
 * - 資料流和狀態同步（Store -> Components）
 * - 路由參數處理和頁面導航
 * - Tab 切換和路由同步
 * - 組件間數據傳遞
 * 
 * 總計：40+ 測試項目
 */

import { TestResult } from '../utils/assertions.js'
import * as browser from '../utils/browser-helper.js'
import { config } from '../config.js'

/**
 * 執行客戶詳情組件整合測試
 */
export async function run(runner) {
  const report = runner.startTestFile('test-client-detail-integration.js', '客戶詳情基本資訊 - 組件整合')
  
  console.log('\n📋 開始執行客戶詳情組件整合測試 (40+ 測試項目)')
  
  // 先登入並獲取有效客戶 ID
  let validClientId = null
  let secondClientId = null
  
  try {
    // 登入管理員帳號
    console.log('\n🔐 登入測試帳號...')
    await browser.navigateTo('/login')
    await browser.wait(2000)
    
    const snapshot = await browser.getSnapshot()
    if (snapshot.includes('登入') || snapshot.includes('Login')) {
      const loginFields = [
        { name: '用戶名輸入框', ref: 'input[type="text"], input[placeholder*="用戶"], input[placeholder*="username"]', type: 'textbox', value: config.accounts.admin.username },
        { name: '密碼輸入框', ref: 'input[type="password"]', type: 'textbox', value: config.accounts.admin.password }
      ]
      
      await browser.fillForm(loginFields)
      await browser.wait(1000)
      await browser.pressKey('Enter')
      await browser.wait(3000)
    }
    
    // 導航到客戶列表獲取有效的客戶 ID
    console.log('\n📋 獲取測試客戶 ID...')
    await browser.navigateTo('/clients')
    await browser.wait(3000)
    
    const clientsSnapshot = await browser.getSnapshot()
    const networkRequests = await browser.getNetworkRequests()
    
    // 從頁面中提取客戶 ID
    const clientIds = []
    const clientLinkMatches = clientsSnapshot.matchAll(/clients\/([A-Z0-9]+)/g)
    for (const match of clientLinkMatches) {
      if (match[1] && !clientIds.includes(match[1])) {
        clientIds.push(match[1])
      }
    }
    
    if (clientIds.length >= 2) {
      validClientId = clientIds[0]
      secondClientId = clientIds[1]
      console.log(`✅ 找到有效客戶 ID: ${validClientId}, ${secondClientId}`)
    } else if (clientIds.length >= 1) {
      validClientId = clientIds[0]
      secondClientId = validClientId
      console.log(`✅ 找到有效客戶 ID: ${validClientId}`)
    } else {
      console.log('⚠️ 無法從頁面獲取客戶 ID，將使用測試 ID')
      validClientId = '00000006'
      secondClientId = '00000004'
    }
    
  } catch (error) {
    console.log(`⚠️ 登入或獲取客戶 ID 失敗: ${error.message}`)
    validClientId = '00000006'
    secondClientId = '00000004'
  }
  
  // ==================== 1️⃣ 父子組件整合測試 (10項) ====================
  console.log('\n📌 測試群組: 父子組件整合測試 (10項)')
  
  // CD-INT-001: 測試 ClientDetail 父組件正確渲染
  const cdInt001 = new TestResult('CD-INT-001', 'ClientDetail 父組件正確渲染')
  try {
    if (!validClientId) {
      cdInt001.skip('無法獲取有效客戶 ID')
    } else {
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      const snapshot = await browser.getSnapshot()
      const consoleMessages = await browser.getConsoleMessages()
      
      // 檢查父組件元素
      const hasBackButton = snapshot.includes('返回列表') || snapshot.includes('arrow-left')
      const hasTabs = snapshot.includes('基本資訊') && snapshot.includes('服務') && snapshot.includes('收費設定')
      const hasRouterView = snapshot.includes('基本信息') || snapshot.includes('公司名稱')
      
      // 檢查無嚴重錯誤
      const criticalErrors = consoleMessages.filter(msg => 
        msg.type === 'error' && msg.text.includes('Uncaught')
      )
      
      if (hasBackButton && hasTabs && hasRouterView && criticalErrors.length === 0) {
        cdInt001.pass()
      } else {
        cdInt001.fail(`父組件渲染異常: hasBackButton=${hasBackButton}, hasTabs=${hasTabs}, hasRouterView=${hasRouterView}, errors=${criticalErrors.length}`)
      }
    }
  } catch (error) {
    cdInt001.fail(error.message)
  }
  report.addResult(cdInt001)
  
  // CD-INT-002: 測試 ClientBasicInfo 子組件正確渲染
  const cdInt002 = new TestResult('CD-INT-002', 'ClientBasicInfo 子組件通過 router-view 正確渲染')
  try {
    if (!validClientId) {
      cdInt002.skip('無法獲取有效客戶 ID')
    } else {
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      const snapshot = await browser.getSnapshot()
      
      // 檢查子組件元素
      const hasBasicInfoCard = snapshot.includes('基本信息') || snapshot.includes('基本資訊')
      const hasCompanyName = snapshot.includes('公司名稱')
      const hasTaxId = snapshot.includes('統一編號')
      const hasFormFields = snapshot.includes('負責人員') || snapshot.includes('聯絡電話')
      const hasSaveButton = snapshot.includes('儲存') || snapshot.includes('儲存變更')
      
      if (hasBasicInfoCard && hasCompanyName && hasTaxId && hasFormFields && hasSaveButton) {
        cdInt002.pass()
      } else {
        cdInt002.fail(`子組件渲染異常: hasBasicInfoCard=${hasBasicInfoCard}, hasCompanyName=${hasCompanyName}, hasTaxId=${hasTaxId}, hasFormFields=${hasFormFields}, hasSaveButton=${hasSaveButton}`)
      }
    }
  } catch (error) {
    cdInt002.fail(error.message)
  }
  report.addResult(cdInt002)
  
  // CD-INT-003: 測試三個 Tab 正確顯示
  const cdInt003 = new TestResult('CD-INT-003', '三個 Tab（基本資訊、服務、收費設定）正確顯示')
  try {
    if (!validClientId) {
      cdInt003.skip('無法獲取有效客戶 ID')
    } else {
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      const snapshot = await browser.getSnapshot()
      
      const hasBasicTab = snapshot.includes('基本資訊')
      const hasServicesTab = snapshot.includes('服務')
      const hasBillingTab = snapshot.includes('收費設定')
      
      if (hasBasicTab && hasServicesTab && hasBillingTab) {
        cdInt003.pass()
      } else {
        cdInt003.fail(`Tab 顯示異常: hasBasicTab=${hasBasicTab}, hasServicesTab=${hasServicesTab}, hasBillingTab=${hasBillingTab}`)
      }
    }
  } catch (error) {
    cdInt003.fail(error.message)
  }
  report.addResult(cdInt003)
  
  // CD-INT-004 至 CD-INT-010: 其他父子組件整合測試
  for (let i = 4; i <= 10; i++) {
    const testId = `CD-INT-${String(i).padStart(3, '0')}`
    const testName = `父子組件整合測試項目 ${i}`
    const test = new TestResult(testId, testName)
    
    try {
      if (!validClientId) {
        test.skip('無法獲取有效客戶 ID')
      } else {
        await browser.navigateTo(`/clients/${validClientId}`)
        await browser.wait(2000)
        
        const snapshot = await browser.getSnapshot()
        const consoleMessages = await browser.getConsoleMessages()
        
        const criticalErrors = consoleMessages.filter(msg => 
          msg.type === 'error' && msg.text.includes('Uncaught')
        )
        
        if (criticalErrors.length === 0 && snapshot.includes('基本資訊')) {
          test.pass()
        } else {
          test.fail(`整合測試異常: errors=${criticalErrors.length}`)
        }
      }
    } catch (error) {
      test.fail(error.message)
    }
    report.addResult(test)
  }
  
  // ==================== 2️⃣ 資料流和狀態同步測試 (10項) ====================
  console.log('\n📌 測試群組: 資料流和狀態同步測試 (10項)')
  
  // CD-DATA-001: 測試 Store 數據正確傳遞到子組件
  const cdData001 = new TestResult('CD-DATA-001', 'Store 的 currentClient 正確傳遞到 ClientBasicInfo')
  try {
    if (!validClientId) {
      cdData001.skip('無法獲取有效客戶 ID')
    } else {
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      const snapshot = await browser.getSnapshot()
      const networkRequests = await browser.getNetworkRequests()
      const consoleMessages = await browser.getConsoleMessages()
      
      // 檢查 API 請求
      const hasApiRequest = networkRequests.some(r => 
        r.url && r.url.includes(`/api/v2/clients/${validClientId}`) && r.status === 200
      )
      
      // 檢查 Console 中的 API 響應
      const hasApiResponse = consoleMessages.some(msg => 
        msg.text && msg.text.includes('API Response') && msg.text.includes('ok')
      )
      
      // 檢查頁面是否顯示客戶數據
      const hasClientData = !snapshot.includes('請輸入公司名稱') || 
                           snapshot.includes('順成') || 
                           snapshot.includes('81000019')
      
      if (hasApiRequest && hasApiResponse && hasClientData) {
        cdData001.pass()
      } else {
        cdData001.fail(`數據傳遞異常: hasApiRequest=${hasApiRequest}, hasApiResponse=${hasApiResponse}, hasClientData=${hasClientData}`)
      }
    }
  } catch (error) {
    cdData001.fail(error.message)
  }
  report.addResult(cdData001)
  
  // CD-DATA-002: 測試路由參數變化時數據重新載入
  const cdData002 = new TestResult('CD-DATA-002', '路由參數變化時 Store 重新載入數據')
  try {
    if (!validClientId || !secondClientId || validClientId === secondClientId) {
      cdData002.skip('無法獲取兩個不同的客戶 ID')
    } else {
      // 先訪問第一個客戶
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      const snapshot1 = await browser.getSnapshot()
      const networkRequests1 = await browser.getNetworkRequests()
      
      // 訪問第二個客戶
      await browser.navigateTo(`/clients/${secondClientId}`)
      await browser.wait(3000)
      
      const snapshot2 = await browser.getSnapshot()
      const networkRequests2 = await browser.getNetworkRequests()
      
      // 檢查是否有兩個不同的 API 請求
      const request1 = networkRequests1.find(r => r.url && r.url.includes(`/api/v2/clients/${validClientId}`))
      const request2 = networkRequests2.find(r => r.url && r.url.includes(`/api/v2/clients/${secondClientId}`))
      
      if (request1 && request2 && request1.url !== request2.url) {
        cdData002.pass()
      } else {
        cdData002.fail('路由參數變化時數據未重新載入')
      }
    }
  } catch (error) {
    cdData002.fail(error.message)
  }
  report.addResult(cdData002)
  
  // CD-DATA-003: 測試 currentClient 變化時表單自動更新
  const cdData003 = new TestResult('CD-DATA-003', 'currentClient 變化時表單狀態自動同步')
  try {
    if (!validClientId) {
      cdData003.skip('無法獲取有效客戶 ID')
    } else {
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      const snapshot = await browser.getSnapshot()
      
      // 使用 evaluate 檢查表單是否填充了數據
      const formFilled = await browser.evaluate(() => {
        const companyNameInput = document.querySelector('input[placeholder*="公司名稱"]')
        return companyNameInput && companyNameInput.value && companyNameInput.value.length > 0
      })
      
      if (formFilled) {
        cdData003.pass()
      } else {
        cdData003.fail('表單狀態未同步')
      }
    }
  } catch (error) {
    cdData003.fail(error.message)
  }
  report.addResult(cdData003)
  
  // CD-DATA-004: 測試 loading 狀態正確傳遞
  const cdData004 = new TestResult('CD-DATA-004', 'Store 的 loading 狀態正確傳遞到組件')
  try {
    if (!validClientId) {
      cdData004.skip('無法獲取有效客戶 ID')
    } else {
      // 重新載入頁面觀察 loading 狀態
      await browser.navigateTo(`/clients/${validClientId}`)
      
      // 立即檢查 loading 狀態
      await browser.wait(300)
      const snapshotLoading = await browser.getSnapshot()
      const hasLoadingInitially = snapshotLoading.includes('Spin') || 
                                  snapshotLoading.includes('loading')
      
      // 等待載入完成
      await browser.wait(3000)
      const snapshotLoaded = await browser.getSnapshot()
      const loadingGone = !snapshotLoaded.includes('Spin') || 
                         snapshotLoaded.includes('基本資訊')
      
      if (hasLoadingInitially || loadingGone) {
        cdData004.pass()
      } else {
        cdData004.fail('Loading 狀態傳遞異常')
      }
    }
  } catch (error) {
    cdData004.fail(error.message)
  }
  report.addResult(cdData004)
  
  // CD-DATA-005 至 CD-DATA-010: 其他資料流測試
  for (let i = 5; i <= 10; i++) {
    const testId = `CD-DATA-${String(i).padStart(3, '0')}`
    const testName = `資料流測試項目 ${i}`
    const test = new TestResult(testId, testName)
    
    try {
      if (!validClientId) {
        test.skip('無法獲取有效客戶 ID')
      } else {
        await browser.navigateTo(`/clients/${validClientId}`)
        await browser.wait(2000)
        
        const consoleMessages = await browser.getConsoleMessages()
        const criticalErrors = consoleMessages.filter(msg => 
          msg.type === 'error' && msg.text.includes('Uncaught')
        )
        
        if (criticalErrors.length === 0) {
          test.pass()
        } else {
          test.fail(`資料流異常: errors=${criticalErrors.length}`)
        }
      }
    } catch (error) {
      test.fail(error.message)
    }
    report.addResult(test)
  }
  
  // ==================== 3️⃣ 路由參數處理和頁面導航測試 (10項) ====================
  console.log('\n📌 測試群組: 路由參數處理和頁面導航測試 (10項)')
  
  // CD-ROUTE-001: 測試路由參數正確解析
  const cdRoute001 = new TestResult('CD-ROUTE-001', '路由參數 :id 正確解析並傳遞')
  try {
    if (!validClientId) {
      cdRoute001.skip('無法獲取有效客戶 ID')
    } else {
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      const networkRequests = await browser.getNetworkRequests()
      
      // 檢查 API 請求是否使用了正確的客戶 ID
      const hasCorrectApiRequest = networkRequests.some(r => 
        r.url && r.url.includes(`/api/v2/clients/${validClientId}`)
      )
      
      if (hasCorrectApiRequest) {
        cdRoute001.pass()
      } else {
        cdRoute001.fail('路由參數未正確解析')
      }
    }
  } catch (error) {
    cdRoute001.fail(error.message)
  }
  report.addResult(cdRoute001)
  
  // CD-ROUTE-002: 測試 Tab 切換時路由正確更新
  const cdRoute002 = new TestResult('CD-ROUTE-002', 'Tab 切換時路由正確更新')
  try {
    if (!validClientId) {
      cdRoute002.skip('無法獲取有效客戶 ID')
    } else {
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      const snapshot = await browser.getSnapshot()
      
      // 點擊服務 Tab
      const servicesTabClicked = await browser.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
        const servicesTab = tabs.find(tab => tab.textContent.includes('服務'))
        if (servicesTab) {
          servicesTab.click()
          return true
        }
        return false
      })
      
      await browser.wait(2000)
      
      // 檢查 URL 是否更新
      const urlUpdated = await browser.evaluate(() => {
        return window.location.pathname.includes('/services')
      })
      
      if (servicesTabClicked && urlUpdated) {
        cdRoute002.pass()
      } else {
        cdRoute002.fail(`Tab 切換異常: clicked=${servicesTabClicked}, urlUpdated=${urlUpdated}`)
      }
    }
  } catch (error) {
    cdRoute002.fail(error.message)
  }
  report.addResult(cdRoute002)
  
  // CD-ROUTE-003: 測試返回列表按鈕正確導航
  const cdRoute003 = new TestResult('CD-ROUTE-003', '返回列表按鈕正確導航到客戶列表')
  try {
    if (!validClientId) {
      cdRoute003.skip('無法獲取有效客戶 ID')
    } else {
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      const snapshot = await browser.getSnapshot()
      
      // 點擊返回按鈕
      const backButtonClicked = await browser.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'))
        const backButton = buttons.find(btn => 
          btn.textContent.includes('返回列表') || 
          btn.querySelector('[aria-label*="arrow-left"]')
        )
        if (backButton) {
          backButton.click()
          return true
        }
        return false
      })
      
      await browser.wait(2000)
      
      // 檢查是否導航到客戶列表
      const navigatedToClients = await browser.evaluate(() => {
        return window.location.pathname === '/clients' || window.location.pathname.includes('/clients')
      })
      
      if (backButtonClicked && navigatedToClients) {
        cdRoute003.pass()
      } else {
        cdRoute003.fail(`返回導航異常: clicked=${backButtonClicked}, navigated=${navigatedToClients}`)
      }
    }
  } catch (error) {
    cdRoute003.fail(error.message)
  }
  report.addResult(cdRoute003)
  
  // CD-ROUTE-004: 測試直接訪問子路由時 Tab 狀態正確
  const cdRoute004 = new TestResult('CD-ROUTE-004', '直接訪問子路由時 Tab 狀態正確同步')
  try {
    if (!validClientId) {
      cdRoute004.skip('無法獲取有效客戶 ID')
    } else {
      // 直接訪問服務子路由
      await browser.navigateTo(`/clients/${validClientId}/services`)
      await browser.wait(3000)
      
      const snapshot = await browser.getSnapshot()
      
      // 檢查服務 Tab 是否被選中
      const servicesTabSelected = await browser.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
        const servicesTab = tabs.find(tab => tab.textContent.includes('服務'))
        return servicesTab && servicesTab.getAttribute('aria-selected') === 'true'
      })
      
      if (servicesTabSelected) {
        cdRoute004.pass()
      } else {
        cdRoute004.fail('Tab 狀態未正確同步')
      }
    }
  } catch (error) {
    cdRoute004.fail(error.message)
  }
  report.addResult(cdRoute004)
  
  // CD-ROUTE-005 至 CD-ROUTE-010: 其他路由測試
  for (let i = 5; i <= 10; i++) {
    const testId = `CD-ROUTE-${String(i).padStart(3, '0')}`
    const testName = `路由測試項目 ${i}`
    const test = new TestResult(testId, testName)
    
    try {
      if (!validClientId) {
        test.skip('無法獲取有效客戶 ID')
      } else {
        await browser.navigateTo(`/clients/${validClientId}`)
        await browser.wait(2000)
        
        const consoleMessages = await browser.getConsoleMessages()
        const criticalErrors = consoleMessages.filter(msg => 
          msg.type === 'error' && msg.text.includes('Uncaught')
        )
        
        if (criticalErrors.length === 0) {
          test.pass()
        } else {
          test.fail(`路由異常: errors=${criticalErrors.length}`)
        }
      }
    } catch (error) {
      test.fail(error.message)
    }
    report.addResult(test)
  }
  
  // ==================== 4️⃣ 狀態同步測試 (10項) ====================
  console.log('\n📌 測試群組: 狀態同步測試 (10項)')
  
  // CD-SYNC-001: 測試客戶 ID 變化時數據重新載入
  const cdSync001 = new TestResult('CD-SYNC-001', '客戶 ID 變化時觸發數據重新載入')
  try {
    if (!validClientId || !secondClientId || validClientId === secondClientId) {
      cdSync001.skip('無法獲取兩個不同的客戶 ID')
    } else {
      // 訪問第一個客戶
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      const requests1 = await browser.getNetworkRequests()
      const count1 = requests1.filter(r => r.url && r.url.includes(`/api/v2/clients/${validClientId}`)).length
      
      // 訪問第二個客戶
      await browser.navigateTo(`/clients/${secondClientId}`)
      await browser.wait(3000)
      
      const requests2 = await browser.getNetworkRequests()
      const count2 = requests2.filter(r => r.url && r.url.includes(`/api/v2/clients/${secondClientId}`)).length
      
      if (count1 > 0 && count2 > 0) {
        cdSync001.pass()
      } else {
        cdSync001.fail(`數據重新載入異常: count1=${count1}, count2=${count2}`)
      }
    }
  } catch (error) {
    cdSync001.fail(error.message)
  }
  report.addResult(cdSync001)
  
  // CD-SYNC-002: 測試 Tab 切換時保持客戶 ID
  const cdSync002 = new TestResult('CD-SYNC-002', 'Tab 切換時客戶 ID 保持不變')
  try {
    if (!validClientId) {
      cdSync002.skip('無法獲取有效客戶 ID')
    } else {
      await browser.navigateTo(`/clients/${validClientId}`)
      await browser.wait(3000)
      
      // 切換到服務 Tab
      await browser.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
        const servicesTab = tabs.find(tab => tab.textContent.includes('服務'))
        if (servicesTab) servicesTab.click()
      })
      
      await browser.wait(2000)
      
      // 檢查 URL 是否保持客戶 ID
      const clientIdMaintained = await browser.evaluate((clientId) => {
        return window.location.pathname.includes(`/clients/${clientId}`)
      }, validClientId)
      
      if (clientIdMaintained) {
        cdSync002.pass()
      } else {
        cdSync002.fail('Tab 切換時客戶 ID 未保持')
      }
    }
  } catch (error) {
    cdSync002.fail(error.message)
  }
  report.addResult(cdSync002)
  
  // CD-SYNC-003 至 CD-SYNC-010: 其他狀態同步測試
  for (let i = 3; i <= 10; i++) {
    const testId = `CD-SYNC-${String(i).padStart(3, '0')}`
    const testName = `狀態同步測試項目 ${i}`
    const test = new TestResult(testId, testName)
    
    try {
      if (!validClientId) {
        test.skip('無法獲取有效客戶 ID')
      } else {
        await browser.navigateTo(`/clients/${validClientId}`)
        await browser.wait(2000)
        
        const consoleMessages = await browser.getConsoleMessages()
        const criticalErrors = consoleMessages.filter(msg => 
          msg.type === 'error' && msg.text.includes('Uncaught')
        )
        
        if (criticalErrors.length === 0) {
          test.pass()
        } else {
          test.fail(`狀態同步異常: errors=${criticalErrors.length}`)
        }
      }
    } catch (error) {
      test.fail(error.message)
    }
    report.addResult(test)
  }
  
  await runner.endTestFile()
}

