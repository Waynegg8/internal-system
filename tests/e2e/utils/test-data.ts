/**
 * 測試數據設置工具
 * 
 * 用於在測試前設置必要的測試數據（客戶、標籤、用戶等）
 */

import type { Page } from '@playwright/test'

// 從環境變數或 playwright.config.ts 的 baseURL 獲取
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://v2.horgoscpa.com'

/**
 * 獲取認證 Cookie
 */
async function getAuthCookie(page: Page, username: string = 'admin', password: string = '111111'): Promise<string | null> {
  try {
    // 使用與 auth.ts 相同的登入邏輯
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 })
    
    // 等待頁面完全載入
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    
    // 使用與 auth.ts 相同的選擇器
    const usernameInput = page.getByPlaceholder('請輸入帳號')
    const passwordInput = page.getByPlaceholder('請輸入密碼')
    
    // 等待輸入框可見
    await usernameInput.waitFor({ state: 'visible', timeout: 15000 })
    await passwordInput.waitFor({ state: 'visible', timeout: 15000 })
    
    await usernameInput.fill(username)
    await passwordInput.fill(password)
    
    // 找到登入按鈕並點擊
    const loginButton = page.getByRole('button', { name: /登入|登 入/ })
    await loginButton.click()
    
    // 等待跳轉到 dashboard 或 clients 頁面
    await page.waitForURL(/\/(dashboard|clients|tasks)/, { timeout: 15000 })
    
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(c => c.name === 'session')
    return sessionCookie?.value || null
  } catch (error) {
    console.error('獲取認證 Cookie 失敗:', error)
    return null
  }
}

// 緩存認證 Cookie，避免重複登入
let cachedCookie: string | null = null

/**
 * 獲取或重用認證 Cookie
 */
async function getOrCreateAuthCookie(page: Page, username: string = 'admin', password: string = '111111'): Promise<string | null> {
  // 如果已經有緩存的 cookie，先嘗試重用
  if (cachedCookie) {
    // 驗證 cookie 是否仍然有效（可選，這裡直接重用）
    return cachedCookie
  }
  
  // 如果沒有緩存，獲取新的 cookie
  const cookie = await getAuthCookie(page, username, password)
  if (cookie) {
    cachedCookie = cookie
  }
  return cookie
}

/**
 * 調用 API（使用認證）
 */
export async function callAPI(page: Page, method: string, path: string, body?: any): Promise<any> {
  // 重用現有的認證 cookie（如果頁面已經登入）
  let cookie = cachedCookie
  
  // 如果沒有緩存的 cookie，嘗試從頁面的 cookies 中獲取
  if (!cookie) {
    const cookies = await page.context().cookies()
    const sessionCookie = cookies.find(c => c.name === 'session')
    if (sessionCookie) {
      cookie = sessionCookie.value
      cachedCookie = cookie
    }
  }
  
  // 如果還是沒有 cookie，才進行登入
  if (!cookie) {
    cookie = await getOrCreateAuthCookie(page)
    if (!cookie) {
      throw new Error('無法獲取認證 Cookie')
    }
  }

  // API 基礎路徑是 /api/v2
  const apiPath = path.startsWith('/api/v2') ? path : `/api/v2${path}`
  const fullUrl = `${BASE_URL}${apiPath}`
  
  // 根據方法選擇不同的 API
  // 任務生成 API 需要更長的超時時間（30秒，已優化查詢性能）
  const timeout = fullUrl.includes('/admin/tasks/generate') ? 30000 : 30000;
  let response
  if (method === 'GET') {
    response = await page.request.get(fullUrl, {
      headers: {
        'Cookie': `session=${cookie}`
      },
      timeout: timeout
    })
  } else if (method === 'POST') {
    response = await page.request.post(fullUrl, {
      data: body || {},
      headers: {
        'Cookie': `session=${cookie}`
      },
      timeout: timeout
    })
  } else if (method === 'PUT') {
    response = await page.request.put(fullUrl, {
      data: body || {},
      headers: {
        'Cookie': `session=${cookie}`
      },
      timeout: timeout
    })
  } else if (method === 'DELETE') {
    response = await page.request.delete(fullUrl, {
      headers: {
        'Cookie': `session=${cookie}`
      },
      timeout: timeout
    })
  } else {
    // 其他方法使用 fetch
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session=${cookie}`
      }
    }
    if (body !== undefined && body !== null) {
      requestOptions.body = JSON.stringify(body)
    }
    response = await page.request.fetch(fullUrl, requestOptions)
  }

  // 檢查響應狀態
  const status = response.status()
  const responseOk = response.ok()
  
  // 調試：對於預覽 API 記錄詳細信息
  if (fullUrl.includes('/admin/tasks/generate/preview')) {
    console.log(`[callAPI] 預覽 API - status=${status}, ok()=${responseOk}, url=${fullUrl}`)
  }
  
  if (!responseOk) {
    const text = await response.text().catch(() => '')
    let errorData = null
    let errorMsg = `API 請求失敗: ${status} ${response.statusText()}`
    
    if (text) {
      try {
        errorData = JSON.parse(text)
        errorMsg += `, 響應: ${text}`
      } catch (parseErr) {
        // 如果解析失敗，直接使用原始文本
        errorMsg += `, 響應: ${text}`
      }
    }
    
    // 對於 403 或 401，拋出包含詳細信息的錯誤
    if (status === 403 || status === 401) {
      const errorResponse = {
        ok: false,
        code: errorData?.code || (status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED'),
        message: errorData?.message || errorMsg,
        status: status,
        data: errorData
      }
      // 拋出一個可以被測試捕獲的錯誤
      const error = new Error(JSON.stringify(errorResponse))
      error.name = status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED'
      throw error
    }
    
    throw new Error(errorMsg)
  }

  // 獲取響應文本
  const text = await response.text()
  
  // 如果響應為空，返回空對象
  if (!text || text.trim().length === 0) {
    return { ok: false, message: '空響應' }
  }

  // 嘗試解析 JSON
  try {
    return JSON.parse(text)
  } catch (err) {
    throw new Error(`JSON 解析失敗: ${err.message}, 響應文本: ${text.substring(0, 200)}`)
  }
}

/**
 * 創建測試客戶
 */
export async function createTestClient(page: Page, clientData: {
  companyName: string
  taxId?: string
  contactPerson1?: string
  phone?: string
  email?: string
  assigneeUserId?: number | string
}): Promise<string | null> {
  try {
    // 獲取當前用戶 ID（如果沒有指定負責人）
    let assigneeUserId = clientData.assigneeUserId
    if (!assigneeUserId) {
      const usersResponse = await callAPI(page, 'GET', '/api/v2/settings/users')
      if (usersResponse?.ok && usersResponse?.data?.length > 0) {
        assigneeUserId = usersResponse.data[0].user_id || usersResponse.data[0].id
      } else {
        throw new Error('無法獲取用戶列表')
      }
    }

    // 處理統一編號：如果是8碼，自動加前綴00
    let finalTaxId = clientData.taxId
    if (finalTaxId && /^\d{8}$/.test(finalTaxId)) {
      finalTaxId = `00${finalTaxId}`
    }

    const response = await callAPI(page, 'POST', '/clients', {
      companyName: clientData.companyName,
      company_name: clientData.companyName, // 同时发送两种格式以确保兼容性
      tax_registration_number: finalTaxId,
      contact_person_1: clientData.contactPerson1,
      phone: clientData.phone,
      email: clientData.email,
      assigneeUserId: assigneeUserId, // 驼峰格式
      assignee_user_id: assigneeUserId // 下划线格式
    })

    if (response?.ok) {
      return response.data?.clientId || response.data?.client_id || null
    }
    throw new Error(`創建測試客戶 API 返回失敗: ${JSON.stringify(response)}`)
  } catch (error) {
    // 將錯誤上拋，讓測試失敗，而不是僅記錄後繼續
    throw new Error(`創建測試客戶失敗: ${String(error)}`)
  }
}

/**
 * 創建測試標籤
 */
export async function createTestTag(page: Page, tagData: {
  tagName: string
  tagColor?: string
}): Promise<number | null> {
  try {
    const response = await callAPI(page, 'POST', '/tags', {
      tag_name: tagData.tagName,
      tag_color: tagData.tagColor || '#3b82f6'
    })

    if (response?.ok) {
      return response.data?.tag_id || response.data?.id || null
    }
    throw new Error(`創建測試標籤 API 返回失敗: ${JSON.stringify(response)}`)
  } catch (error) {
    throw new Error(`創建測試標籤失敗: ${String(error)}`)
  }
}

/**
 * 為客戶添加標籤
 */
export async function addTagToClient(page: Page, clientId: string, tagId: number): Promise<boolean> {
  try {
    // 先獲取客戶現有標籤
    const clientResponse = await callAPI(page, 'GET', `/clients/${clientId}`)
    if (!clientResponse?.ok) {
      throw new Error(`獲取客戶資料失敗: ${JSON.stringify(clientResponse)}`)
    }

    const currentTagIds = clientResponse.data?.tags?.map((t: any) => t.tag_id || t.id) || []
    const newTagIds = [...currentTagIds, tagId]

    const response = await callAPI(page, 'PUT', `/clients/${clientId}/tags`, {
      tagIds: newTagIds
    })

    if (!response?.ok) {
      throw new Error(`更新客戶標籤失敗: ${JSON.stringify(response)}`)
    }
    return true
  } catch (error) {
    throw new Error(`為客戶添加標籤失敗: ${String(error)}`)
  }
}

/**
 * 創建測試用戶（員工）
 */
export async function createTestUser(page: Page, userData: {
  username: string
  name: string
  password?: string
  email?: string
  isAdmin?: boolean
}): Promise<number | null> {
  try {
    const response = await callAPI(page, 'POST', '/settings/users', {
      username: userData.username,
      name: userData.name,
      password: userData.password || '111111',
      email: userData.email || `${userData.username}@test.com`,
      is_admin: userData.isAdmin ? 1 : 0
    })

    if (response?.ok) {
      return response.data?.user_id || null
    }
    throw new Error(`創建測試用戶 API 返回失敗: ${JSON.stringify(response)}`)
  } catch (error) {
    throw new Error(`創建測試用戶失敗: ${String(error)}`)
  }
}

/**
 * 設置 BR1.1 測試所需的測試數據
 */
export async function setupBR1_1TestData(page: Page): Promise<{
  adminUserId?: number
  employeeUserId?: number
  testClients: Array<{ clientId: string; companyName: string; taxId: string }>
  testTags: Array<{ tagId: number; tagName: string }>
}> {
  const result: {
    adminUserId?: number
    employeeUserId?: number
    testClients: Array<{ clientId: string; companyName: string; taxId: string }>
    testTags: Array<{ tagId: number; tagName: string }>
  } = {
    testClients: [],
    testTags: []
  }

  try {
    // 1. 獲取管理員用戶 ID
    const usersResponse = await callAPI(page, 'GET', '/settings/users')
    if (usersResponse?.ok && usersResponse?.data?.length > 0) {
      const adminUser = usersResponse.data.find((u: any) => u.is_admin || u.username === 'admin')
      if (adminUser) {
        result.adminUserId = adminUser.user_id || adminUser.id
      }
    } else {
      throw new Error(`無法獲取用戶列表: ${JSON.stringify(usersResponse)}`)
    }

    // 2. 創建測試員工（如果不存在）
    const employeeUser = usersResponse?.data?.find((u: any) => u.username === 'test_employee' && !u.is_admin)
    if (!employeeUser) {
      const newEmployeeId = await createTestUser(page, {
        username: 'test_employee',
        name: '測試員工',
        isAdmin: false
      })
      if (newEmployeeId) {
        result.employeeUserId = newEmployeeId
      }
    } else {
      result.employeeUserId = employeeUser.user_id || employeeUser.id
    }

    // 3. 創建測試客戶（企業客戶 - 8碼統一編號）
    const companyClientId = await createTestClient(page, {
      companyName: '測試企業客戶有限公司',
      taxId: '12345678', // 8碼，會自動加前綴00變成0012345678
      contactPerson1: '張三',
      phone: '02-1234-5678',
      email: 'test@company.com',
      assigneeUserId: result.adminUserId
    })
    if (!companyClientId) throw new Error('企業客戶建立失敗（未取得 clientId）')
    result.testClients.push({
      clientId: companyClientId,
      companyName: '測試企業客戶有限公司',
      taxId: '0012345678'
    })

    // 4. 創建測試客戶（個人客戶 - 10碼身分證）
    const personalClientId = await createTestClient(page, {
      companyName: '測試個人客戶',
      taxId: 'A123456789', // 10碼身分證
      contactPerson1: '李四',
      phone: '0912-345-678',
      email: 'personal@test.com',
      assigneeUserId: result.adminUserId
    })
    if (!personalClientId) throw new Error('個人客戶建立失敗（未取得 clientId）')
    result.testClients.push({
      clientId: personalClientId,
      companyName: '測試個人客戶',
      taxId: 'A123456789'
    })

    // 5. 創建測試標籤
    const tag1Id = await createTestTag(page, {
      tagName: '測試標籤1',
      tagColor: '#3b82f6'
    })
    if (!tag1Id) throw new Error('測試標籤1 建立失敗')
    result.testTags.push({ tagId: tag1Id, tagName: '測試標籤1' })

    const tag2Id = await createTestTag(page, {
      tagName: '測試標籤2',
      tagColor: '#10b981'
    })
    if (!tag2Id) throw new Error('測試標籤2 建立失敗')
    result.testTags.push({ tagId: tag2Id, tagName: '測試標籤2' })

    const tag3Id = await createTestTag(page, {
      tagName: '測試標籤3',
      tagColor: '#f59e0b'
    })
    if (!tag3Id) throw new Error('測試標籤3 建立失敗')
    result.testTags.push({ tagId: tag3Id, tagName: '測試標籤3' })

    // 6. 為第一個客戶添加多個標籤（測試標籤顯示邏輯）
    if (companyClientId && tag1Id && tag2Id && tag3Id) {
      await addTagToClient(page, companyClientId, tag1Id)
      await addTagToClient(page, companyClientId, tag2Id)
      await addTagToClient(page, companyClientId, tag3Id)
    }

    // 7. 創建未分配負責人的客戶（測試「未分配」顯示）
    const unassignedClientId = await createTestClient(page, {
      companyName: '未分配負責人測試客戶',
      taxId: '87654321',
      contactPerson1: '王五',
      assigneeUserId: null // 不分配負責人
    })
    if (!unassignedClientId) throw new Error('未分配負責人測試客戶 建立失敗')
    result.testClients.push({
      clientId: unassignedClientId,
      companyName: '未分配負責人測試客戶',
      taxId: '0087654321'
    })

    return result
  } catch (error) {
    // 直接上拋，讓測試在 beforeAll/測試資料建立階段即失敗
    throw new Error(`設置測試數據失敗: ${String(error)}`)
  }
}

/**
 * 創建測試成本項目類型
 */
async function createTestCostItem(page: Page, data: {
  costName: string
  category: 'fixed' | 'variable'
  allocationMethod: 'per_employee' | 'per_hour' | 'per_revenue'
  description?: string
}): Promise<number | null> {
  try {
    const response = await page.request.post(`${BASE_URL}/api/v2/costs/items`, {
      data: {
        cost_name: data.costName,
        category: data.category,
        allocation_method: data.allocationMethod,
        description: data.description || ''
      }
    })

    if (response.ok()) {
      const result = await response.json()
      return result.data?.id || result.id || null
    }
    return null
  } catch (error) {
    console.error('創建測試成本項目類型失敗:', error)
    return null
  }
}

/**
 * 設置成本項目類型測試數據
 */
export async function setupCostItemsTestData(page: Page): Promise<{
  adminUserId?: number
  testCostItems: Array<{
    costTypeId: number
    costCode: string
    costName: string
    category: string
    allocationMethod: string
    description?: string
  }>
}> {
  const result = {
    testCostItems: [] as Array<{
      costTypeId: number
      costCode: string
      costName: string
      category: string
      allocationMethod: string
      description?: string
    }>
  }

  try {
    // 1. 創建固定成本項目類型
    const fixedCostId = await createTestCostItem(page, {
      costName: '測試固定成本項目',
      category: 'fixed',
      allocationMethod: 'per_employee',
      description: '用於測試的固定成本項目'
    })
    if (!fixedCostId) throw new Error('固定成本項目類型建立失敗')
    result.testCostItems.push({
      costTypeId: fixedCostId,
      costCode: 'TEST_FIXED',
      costName: '測試固定成本項目',
      category: 'fixed',
      allocationMethod: 'per_employee',
      description: '用於測試的固定成本項目'
    })

    // 2. 創建變動成本項目類型
    const variableCostId = await createTestCostItem(page, {
      costName: '測試變動成本項目',
      category: 'variable',
      allocationMethod: 'per_hour',
      description: '用於測試的變動成本項目'
    })
    if (!variableCostId) throw new Error('變動成本項目類型建立失敗')
    result.testCostItems.push({
      costTypeId: variableCostId,
      costCode: 'TEST_VARIABLE',
      costName: '測試變動成本項目',
      category: 'variable',
      allocationMethod: 'per_hour',
      description: '用於測試的變動成本項目'
    })

    // 3. 創建按收入分攤的成本項目類型
    const revenueCostId = await createTestCostItem(page, {
      costName: '測試收入分攤項目',
      category: 'variable',
      allocationMethod: 'per_revenue',
      description: '用於測試按收入分攤的成本項目'
    })
    if (!revenueCostId) throw new Error('收入分攤成本項目類型建立失敗')
    result.testCostItems.push({
      costTypeId: revenueCostId,
      costCode: 'TEST_REVENUE',
      costName: '測試收入分攤項目',
      category: 'variable',
      allocationMethod: 'per_revenue',
      description: '用於測試按收入分攤的成本項目'
    })

    return result
  } catch (error) {
    // 直接上拋，讓測試在 beforeAll/測試資料建立階段即失敗
    throw new Error(`設置成本項目類型測試數據失敗: ${String(error)}`)
  }
}

/**
 * 創建測試任務
 */
export async function createTestTask(page: Page, taskData: {
  clientServiceId: number | string
  taskName: string
  serviceMonth?: string
  dueDate?: string
  assigneeUserId?: number | string
  stageNames?: string[]
}): Promise<string | null> {
  try {
    const response = await callAPI(page, 'POST', '/tasks', {
      client_service_id: Number(taskData.clientServiceId),
      task_name: taskData.taskName,
      service_month: taskData.serviceMonth,
      due_date: taskData.dueDate,
      assignee_user_id: taskData.assigneeUserId ? Number(taskData.assigneeUserId) : null,
      stage_names: taskData.stageNames || []
    })

    if (response?.ok) {
      return response.data?.taskId || response.data?.task_id || null
    }
    throw new Error(`創建測試任務 API 返回失敗: ${JSON.stringify(response)}`)
  } catch (error) {
    throw new Error(`創建測試任務失敗: ${String(error)}`)
  }
}

/**
 * 設置 BR2.1 測試所需的測試數據
 */
export async function setupBR2_1TestData(page: Page): Promise<{
  adminUserId?: number
  employeeUserId?: number
  testClients: Array<{ clientId: string; companyName: string; taxId: string }>
  testClientServices: Array<{ clientServiceId: string; clientId: string; serviceId: number }>
  testTasks: Array<{ taskId: string; taskName: string; serviceMonth: string; canStart: boolean; totalStages: number }>
}> {
  const result: {
    adminUserId?: number
    employeeUserId?: number
    testClients: Array<{ clientId: string; companyName: string; taxId: string }>
    testClientServices: Array<{ clientServiceId: string; clientId: string; serviceId: number }>
    testTasks: Array<{ taskId: string; taskName: string; serviceMonth: string; canStart: boolean; totalStages: number }>
  } = {
    testClients: [],
    testClientServices: [],
    testTasks: []
  }

  try {
    // 1. 獲取管理員用戶 ID
    const usersResponse = await callAPI(page, 'GET', '/settings/users')
    if (usersResponse?.ok && usersResponse?.data?.length > 0) {
      const adminUser = usersResponse.data.find((u: any) => u.is_admin || u.username === 'admin')
      if (adminUser) {
        result.adminUserId = adminUser.user_id || adminUser.id
      }
    } else {
      throw new Error(`無法獲取用戶列表: ${JSON.stringify(usersResponse)}`)
    }

    // 2. 創建測試客戶
    const testClientId = await createTestClient(page, {
      companyName: '任務列表測試客戶',
      taxId: '99999999',
      contactPerson1: '測試聯絡人',
      assigneeUserId: result.adminUserId
    })
    if (!testClientId) throw new Error('測試客戶建立失敗')
    result.testClients.push({
      clientId: testClientId,
      companyName: '任務列表測試客戶',
      taxId: '0099999999'
    })

    // 3. 獲取服務列表並創建客戶服務
    const servicesResponse = await callAPI(page, 'GET', '/settings/services')
    if (!servicesResponse?.ok || !servicesResponse?.data?.length) {
      throw new Error('無法獲取服務列表')
    }
    const firstService = servicesResponse.data[0]
    const serviceId = firstService.service_id || firstService.id

    // 創建客戶服務
    const clientServiceResponse = await callAPI(page, 'POST', `/clients/${testClientId}/services`, {
      service_id: serviceId,
      start_date: new Date().toISOString().split('T')[0]
    })
    if (!clientServiceResponse?.ok) {
      throw new Error(`創建客戶服務失敗: ${JSON.stringify(clientServiceResponse)}`)
    }
    // 嘗試多種可能的返回格式
    // 嘗試多種可能的返回格式
    let clientServiceId = clientServiceResponse.data?.clientServiceId || 
                          clientServiceResponse.data?.client_service_id || 
                          clientServiceResponse.data?.id ||
                          clientServiceResponse.data?.service_id
    
    // 如果沒有直接返回 ID，嘗試從客戶詳情中獲取
    if (!clientServiceId) {
      await page.waitForTimeout(1000) // 等待一下確保數據已寫入
      const clientDetailResponse = await callAPI(page, 'GET', `/clients/${testClientId}`)
      if (clientDetailResponse?.ok && clientDetailResponse?.data?.services?.length > 0) {
        const lastService = clientDetailResponse.data.services[clientDetailResponse.data.services.length - 1]
        clientServiceId = lastService.client_service_id || lastService.clientServiceId || lastService.id
      }
    }
    
    if (!clientServiceId) {
      throw new Error('無法獲取客戶服務 ID')
    }
    
    result.testClientServices.push({
      clientServiceId: String(clientServiceId),
      clientId: testClientId,
      serviceId: serviceId
    })

    // 4. 創建測試任務（無階段，可開始）
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const task1Id = await createTestTask(page, {
      clientServiceId: clientServiceId,
      taskName: '可開始任務（無階段）',
      serviceMonth: currentMonth,
      assigneeUserId: result.adminUserId
    })
    if (!task1Id) throw new Error('任務1建立失敗')
    result.testTasks.push({
      taskId: task1Id,
      taskName: '可開始任務（無階段）',
      serviceMonth: currentMonth,
      canStart: true,
      totalStages: 0
    })

    // 5. 創建測試任務（有階段，第一階段未完成，可開始）
    const task2Id = await createTestTask(page, {
      clientServiceId: clientServiceId,
      taskName: '可開始任務（有階段）',
      serviceMonth: currentMonth,
      assigneeUserId: result.adminUserId,
      stageNames: ['階段1', '階段2', '階段3']
    })
    if (!task2Id) throw new Error('任務2建立失敗')
    result.testTasks.push({
      taskId: task2Id,
      taskName: '可開始任務（有階段）',
      serviceMonth: currentMonth,
      canStart: true,
      totalStages: 3
    })

    // 6. 創建測試任務（有階段，第一階段已完成，第二階段未完成，不可開始）
    const task3Id = await createTestTask(page, {
      clientServiceId: clientServiceId,
      taskName: '不可開始任務（階段1已完成）',
      serviceMonth: currentMonth,
      assigneeUserId: result.adminUserId,
      stageNames: ['階段1', '階段2', '階段3']
    })
    if (!task3Id) throw new Error('任務3建立失敗')
    
    // 更新第一階段為已完成
    await callAPI(page, 'PUT', `/tasks/${task3Id}/stages/1`, {
      status: 'completed'
    })
    
    result.testTasks.push({
      taskId: task3Id,
      taskName: '不可開始任務（階段1已完成）',
      serviceMonth: currentMonth,
      canStart: false,
      totalStages: 3
    })

    return result
  } catch (error) {
    throw new Error(`設置 BR2.1 測試數據失敗: ${String(error)}`)
  }
}

/**
 * 清理 BR2.1 測試數據
 */
export async function cleanupBR2_1TestData(page: Page, testData: {
  testClients: Array<{ clientId: string }>
  testClientServices: Array<{ clientServiceId: string }>
  testTasks: Array<{ taskId: string }>
}): Promise<void> {
  try {
    // 1. 刪除測試任務（軟刪除）
    for (const task of testData.testTasks || []) {
      try {
        await callAPI(page, 'DELETE', `/tasks/${task.taskId}`)
      } catch (err) {
        console.warn(`刪除測試任務 ${task.taskId} 失敗:`, err)
      }
    }

    // 2. 刪除測試客戶服務（軟刪除）
    for (const service of testData.testClientServices || []) {
      try {
        // 需要從客戶詳情中獲取服務 ID
        const clientId = testData.testClients?.[0]?.clientId
        if (clientId) {
          await callAPI(page, 'DELETE', `/clients/${clientId}/services/${service.clientServiceId}`)
        }
      } catch (err) {
        console.warn(`刪除測試客戶服務 ${service.clientServiceId} 失敗:`, err)
      }
    }

    // 3. 刪除測試客戶（軟刪除）
    for (const client of testData.testClients || []) {
      try {
        await callAPI(page, 'DELETE', `/clients/${client.clientId}`)
      } catch (err) {
        console.warn(`刪除測試客戶 ${client.clientId} 失敗:`, err)
      }
    }

    console.log('BR2.1 測試數據清理完成')
  } catch (error) {
    console.error('清理 BR2.1 測試數據失敗:', error)
    // 不拋出錯誤，因為清理失敗不應該影響測試結果
  }
}

/**
 * 清理測試數據（可選，用於測試後清理）
 */
export async function cleanupTestData(page: Page, testData: {
  testClients: Array<{ clientId: string }>
  testTags: Array<{ tagId: number }>
}): Promise<void> {
  // 注意：根據業務規則，刪除客戶是軟刪除，這裡只做標記
  // 實際清理可能需要直接操作資料庫
  // 暫時不實現，因為測試環境可以接受測試數據保留
}

/**
 * 創建測試客戶服務
 */
export async function createTestClientService(page: Page, data: {
  clientId: string
  serviceId: number
  startDate?: string
  serviceType?: 'recurring' | 'one-time'
}): Promise<string | null> {
  try {
    const response = await callAPI(page, 'POST', `/clients/${data.clientId}/services`, {
      service_id: data.serviceId,
      start_date: data.startDate || new Date().toISOString().split('T')[0],
      service_type: data.serviceType || 'recurring'
    })

    if (response?.ok) {
      return response.data?.clientServiceId || 
             response.data?.client_service_id || 
             response.data?.id || null
    }
    throw new Error(`創建測試客戶服務 API 返回失敗: ${JSON.stringify(response)}`)
  } catch (error) {
    throw new Error(`創建測試客戶服務失敗: ${String(error)}`)
  }
}

/**
 * 創建測試 SOP
 */
export async function createTestSOP(page: Page, data: {
  title: string
  category: string
  scope: 'service' | 'task'
  clientId?: string
}): Promise<number | null> {
  try {
    const response = await callAPI(page, 'POST', '/settings/sops', {
      title: data.title,
      category: data.category,
      scope: data.scope,
      client_id: data.clientId || null
    })

    if (response?.ok) {
      return response.data?.sop_id || response.data?.id || null
    }
    throw new Error(`創建測試 SOP API 返回失敗: ${JSON.stringify(response)}`)
  } catch (error) {
    throw new Error(`創建測試 SOP 失敗: ${String(error)}`)
  }
}

/**
 * 創建測試服務項目（任務類型）
 */
export async function createTestServiceItem(page: Page, data: {
  serviceId: number
  itemName: string
}): Promise<number | null> {
  try {
    const response = await callAPI(page, 'POST', `/settings/services/${data.serviceId}/items`, {
      item_name: data.itemName
    })

    if (response?.ok) {
      return response.data?.item_id || response.data?.id || null
    }
    throw new Error(`創建測試服務項目 API 返回失敗: ${JSON.stringify(response)}`)
  } catch (error) {
    throw new Error(`創建測試服務項目失敗: ${String(error)}`)
  }
}

/**
 * 設置 BR2.3 測試所需的測試數據
 */
export async function setupBR2_3TestData(page: Page): Promise<{
  adminUserId?: number
  employeeUserId?: number
  testClients: Array<{ clientId: string; companyName: string; taxId: string }>
  testClientServices: Array<{ 
    clientServiceId: string
    clientId: string
    serviceId: number
    serviceType: 'recurring' | 'one-time'
  }>
  testServiceItems: Array<{ itemId: number; itemName: string; serviceId: number }>
  testSOPs: Array<{ sopId: number; title: string; category: string; scope: string }>
}> {
  const result: {
    adminUserId?: number
    employeeUserId?: number
    testClients: Array<{ clientId: string; companyName: string; taxId: string }>
    testClientServices: Array<{ 
      clientServiceId: string
      clientId: string
      serviceId: number
      serviceType: 'recurring' | 'one-time'
    }>
    testServiceItems: Array<{ itemId: number; itemName: string; serviceId: number }>
    testSOPs: Array<{ sopId: number; title: string; category: string; scope: string }>
  } = {
    testClients: [],
    testClientServices: [],
    testServiceItems: [],
    testSOPs: []
  }

  try {
    // 1. 獲取管理員用戶 ID
    const usersResponse = await callAPI(page, 'GET', '/settings/users')
    if (usersResponse?.ok && usersResponse?.data?.length > 0) {
      const adminUser = usersResponse.data.find((u: any) => u.is_admin || u.username === 'admin')
      if (adminUser) {
        result.adminUserId = adminUser.user_id || adminUser.id
      }
    } else {
      throw new Error(`無法獲取用戶列表: ${JSON.stringify(usersResponse)}`)
    }

    // 2. 創建測試員工（如果不存在）
    const employeeUser = usersResponse?.data?.find((u: any) => u.username === 'test_employee_br23' && !u.is_admin)
    if (!employeeUser) {
      const newEmployeeId = await createTestUser(page, {
        username: 'test_employee_br23',
        name: 'BR2.3測試員工',
        isAdmin: false
      })
      if (newEmployeeId) {
        result.employeeUserId = newEmployeeId
      }
    } else {
      result.employeeUserId = employeeUser.user_id || employeeUser.id
    }

    // 3. 創建測試客戶（定期服務）
    const recurringClientId = await createTestClient(page, {
      companyName: 'BR2.3定期服務測試客戶',
      taxId: '11111111',
      contactPerson1: '測試聯絡人1',
      assigneeUserId: result.adminUserId
    })
    if (!recurringClientId) throw new Error('定期服務測試客戶建立失敗')
    result.testClients.push({
      clientId: recurringClientId,
      companyName: 'BR2.3定期服務測試客戶',
      taxId: '0011111111'
    })

    // 4. 創建測試客戶（一次性服務）
    const oneTimeClientId = await createTestClient(page, {
      companyName: 'BR2.3一次性服務測試客戶',
      taxId: '22222222',
      contactPerson1: '測試聯絡人2',
      assigneeUserId: result.adminUserId
    })
    if (!oneTimeClientId) throw new Error('一次性服務測試客戶建立失敗')
    result.testClients.push({
      clientId: oneTimeClientId,
      companyName: 'BR2.3一次性服務測試客戶',
      taxId: '0022222222'
    })

    // 5. 獲取服務列表並創建客戶服務
    const servicesResponse = await callAPI(page, 'GET', '/settings/services')
    if (!servicesResponse?.ok || !servicesResponse?.data?.length) {
      throw new Error('無法獲取服務列表')
    }
    const firstService = servicesResponse.data[0]
    const serviceId = firstService.service_id || firstService.id
    const serviceCode = firstService.service_code || firstService.code || 'TEST_SERVICE'

    // 創建定期服務
    const recurringServiceId = await createTestClientService(page, {
      clientId: recurringClientId,
      serviceId: serviceId,
      serviceType: 'recurring'
    })
    if (!recurringServiceId) throw new Error('定期服務建立失敗')
    result.testClientServices.push({
      clientServiceId: String(recurringServiceId),
      clientId: recurringClientId,
      serviceId: serviceId,
      serviceType: 'recurring'
    })

    // 創建一次性服務
    const oneTimeServiceId = await createTestClientService(page, {
      clientId: oneTimeClientId,
      serviceId: serviceId,
      serviceType: 'one-time'
    })
    if (!oneTimeServiceId) throw new Error('一次性服務建立失敗')
    result.testClientServices.push({
      clientServiceId: String(oneTimeServiceId),
      clientId: oneTimeClientId,
      serviceId: serviceId,
      serviceType: 'one-time'
    })

    // 6. 創建測試服務項目（任務類型）
    const item1Id = await createTestServiceItem(page, {
      serviceId: serviceId,
      itemName: 'BR2.3測試任務類型1'
    })
    if (!item1Id) throw new Error('測試服務項目1建立失敗')
    result.testServiceItems.push({
      itemId: item1Id,
      itemName: 'BR2.3測試任務類型1',
      serviceId: serviceId
    })

    const item2Id = await createTestServiceItem(page, {
      serviceId: serviceId,
      itemName: 'BR2.3測試任務類型2'
    })
    if (!item2Id) throw new Error('測試服務項目2建立失敗')
    result.testServiceItems.push({
      itemId: item2Id,
      itemName: 'BR2.3測試任務類型2',
      serviceId: serviceId
    })

    // 7. 創建測試 SOP（服務層級）
    const serviceSOPId = await createTestSOP(page, {
      title: 'BR2.3測試服務SOP',
      category: serviceCode,
      scope: 'service',
      clientId: recurringClientId
    })
    if (!serviceSOPId) throw new Error('測試服務SOP建立失敗')
    result.testSOPs.push({
      sopId: serviceSOPId,
      title: 'BR2.3測試服務SOP',
      category: serviceCode,
      scope: 'service'
    })

    // 8. 創建測試 SOP（任務層級）
    const taskSOPId = await createTestSOP(page, {
      title: 'BR2.3測試任務SOP',
      category: serviceCode,
      scope: 'task'
    })
    if (!taskSOPId) throw new Error('測試任務SOP建立失敗')
    result.testSOPs.push({
      sopId: taskSOPId,
      title: 'BR2.3測試任務SOP',
      category: serviceCode,
      scope: 'task'
    })

    return result
  } catch (error) {
    throw new Error(`設置 BR2.3 測試數據失敗: ${String(error)}`)
  }
}

/**
 * 清理 BR2.3 測試數據
 */
export async function cleanupBR2_3TestData(page: Page, testData: {
  testClients: Array<{ clientId: string }>
  testClientServices: Array<{ clientServiceId: string; clientId: string }>
  testServiceItems: Array<{ itemId: number }>
  testSOPs: Array<{ sopId: number }>
}): Promise<void> {
  try {
    // 1. 刪除測試客戶服務（軟刪除）
    for (const service of testData.testClientServices || []) {
      try {
        await callAPI(page, 'DELETE', `/clients/${service.clientId}/services/${service.clientServiceId}`)
      } catch (err) {
        console.warn(`刪除測試客戶服務 ${service.clientServiceId} 失敗:`, err)
      }
    }

    // 2. 刪除測試客戶（軟刪除）
    for (const client of testData.testClients || []) {
      try {
        await callAPI(page, 'DELETE', `/clients/${client.clientId}`)
      } catch (err) {
        console.warn(`刪除測試客戶 ${client.clientId} 失敗:`, err)
      }
    }

    // 3. 刪除測試服務項目
    for (const item of testData.testServiceItems || []) {
      try {
        await callAPI(page, 'DELETE', `/settings/services/items/${item.itemId}`)
      } catch (err) {
        console.warn(`刪除測試服務項目 ${item.itemId} 失敗:`, err)
      }
    }

    // 4. 刪除測試 SOP
    for (const sop of testData.testSOPs || []) {
      try {
        await callAPI(page, 'DELETE', `/settings/sops/${sop.sopId}`)
      } catch (err) {
        console.warn(`刪除測試 SOP ${sop.sopId} 失敗:`, err)
      }
    }

    console.log('BR2.3 測試數據清理完成')
  } catch (error) {
    console.error('清理 BR2.3 測試數據失敗:', error)
  }
}

/**
 * 創建測試任務模板
 */
async function createTestTaskTemplate(page: Page, templateData: {
  templateName: string
  serviceId: number
  clientId?: string
  description?: string
  tasks?: Array<{
    task_name: string
    stage_order: number
    estimated_hours?: number
  }>
}): Promise<number | null> {
  try {
    const response = await callAPI(page, 'POST', '/task-templates', {
      template_name: templateData.templateName,
      service_id: templateData.serviceId,
      client_id: templateData.clientId || null,
      description: templateData.description || null,
      tasks: templateData.tasks || []
    })

    if (response?.ok) {
      return response.data?.template_id || response.data?.templateId || response.data?.id || null
    }
    throw new Error(`創建測試任務模板 API 返回失敗: ${JSON.stringify(response)}`)
  } catch (error) {
    throw new Error(`創建測試任務模板失敗: ${String(error)}`)
  }
}

/**
 * 設置 BR2.4.1 測試所需的測試數據
 */
export async function setupBR2_4_1TestData(page: Page): Promise<{
  adminUserId?: number
  employeeUserId?: number
  testServices: Array<{ serviceId: number; serviceName: string }>
  testClients: Array<{ clientId: string; companyName: string }>
  testTemplates: Array<{ templateId: number; templateName: string; serviceId: number; clientId?: string }>
}> {
  const result: {
    adminUserId?: number
    employeeUserId?: number
    testServices: Array<{ serviceId: number; serviceName: string }>
    testClients: Array<{ clientId: string; companyName: string }>
    testTemplates: Array<{ templateId: number; templateName: string; serviceId: number; clientId?: string }>
  } = {
    testServices: [],
    testClients: [],
    testTemplates: []
  }

  try {
    // 1. 獲取管理員用戶 ID
    const usersResponse = await callAPI(page, 'GET', '/settings/users')
    if (usersResponse?.ok && usersResponse?.data?.length > 0) {
      const adminUser = usersResponse.data.find((u: any) => u.is_admin || u.username === 'admin')
      if (adminUser) {
        result.adminUserId = adminUser.user_id || adminUser.id
      }
    } else {
      throw new Error(`無法獲取用戶列表: ${JSON.stringify(usersResponse)}`)
    }

    // 2. 獲取服務列表
    const servicesResponse = await callAPI(page, 'GET', '/settings/services')
    if (!servicesResponse?.ok || !servicesResponse?.data?.length) {
      throw new Error('無法獲取服務列表')
    }
    
    // 使用前兩個服務（如果存在）
    const services = servicesResponse.data.slice(0, 2)
    for (const service of services) {
      const serviceId = service.service_id || service.id
      const serviceName = service.service_name || service.name
      result.testServices.push({
        serviceId: serviceId,
        serviceName: serviceName
      })
    }

    // 3. 創建測試客戶
    const testClientId = await createTestClient(page, {
      companyName: 'BR2.4.1測試客戶',
      taxId: '88888888',
      contactPerson1: '測試聯絡人',
      assigneeUserId: result.adminUserId
    })
    if (!testClientId) throw new Error('測試客戶建立失敗')
    result.testClients.push({
      clientId: testClientId,
      companyName: 'BR2.4.1測試客戶'
    })

    // 4. 創建測試任務模板（統一模板）
    if (result.testServices.length > 0) {
      const unifiedTemplateId = await createTestTaskTemplate(page, {
        templateName: 'BR2.4.1測試統一模板',
        serviceId: result.testServices[0].serviceId,
        description: 'BR2.4.1測試統一模板描述',
        tasks: [
          {
            task_name: '測試任務1',
            stage_order: 1,
            estimated_hours: 2
          },
          {
            task_name: '測試任務2',
            stage_order: 2,
            estimated_hours: 3
          }
        ]
      })
      if (unifiedTemplateId) {
        result.testTemplates.push({
          templateId: unifiedTemplateId,
          templateName: 'BR2.4.1測試統一模板',
          serviceId: result.testServices[0].serviceId
        })
      }

      // 5. 創建測試任務模板（客戶專屬模板）
      const clientSpecificTemplateId = await createTestTaskTemplate(page, {
        templateName: 'BR2.4.1測試客戶專屬模板',
        serviceId: result.testServices[0].serviceId,
        clientId: testClientId,
        description: 'BR2.4.1測試客戶專屬模板描述',
        tasks: [
          {
            task_name: '客戶專屬任務1',
            stage_order: 1,
            estimated_hours: 1
          }
        ]
      })
      if (clientSpecificTemplateId) {
        result.testTemplates.push({
          templateId: clientSpecificTemplateId,
          templateName: 'BR2.4.1測試客戶專屬模板',
          serviceId: result.testServices[0].serviceId,
          clientId: testClientId
        })
      }

      // 6. 如果有第二個服務，創建另一個統一模板
      if (result.testServices.length > 1) {
        const secondTemplateId = await createTestTaskTemplate(page, {
          templateName: 'BR2.4.1測試模板2',
          serviceId: result.testServices[1].serviceId,
          description: 'BR2.4.1測試模板2描述'
        })
        if (secondTemplateId) {
          result.testTemplates.push({
            templateId: secondTemplateId,
            templateName: 'BR2.4.1測試模板2',
            serviceId: result.testServices[1].serviceId
          })
        }
      }
    }

    return result
  } catch (error) {
    throw new Error(`設置 BR2.4.1 測試數據失敗: ${String(error)}`)
  }
}

/**
 * 清理 BR2.4.1 測試數據
 */
export async function cleanupBR2_4_1TestData(page: Page, testData: {
  testTemplates?: Array<{ templateId: number }>
  testClients?: Array<{ clientId: string }>
}): Promise<void> {
  try {
    // 1. 刪除測試任務模板
    if (testData.testTemplates && testData.testTemplates.length > 0) {
      for (const template of testData.testTemplates) {
        try {
          await callAPI(page, 'DELETE', `/task-templates/${template.templateId}`)
        } catch (err) {
          console.warn(`刪除測試任務模板 ${template.templateId} 失敗:`, err)
        }
      }
    }

    // 2. 刪除測試客戶
    if (testData.testClients && testData.testClients.length > 0) {
      for (const client of testData.testClients) {
        try {
          await callAPI(page, 'DELETE', `/clients/${client.clientId}`)
        } catch (err) {
          console.warn(`刪除測試客戶 ${client.clientId} 失敗:`, err)
        }
      }
    }

    console.log('BR2.4.1 測試數據清理完成')
  } catch (error) {
    console.error('清理 BR2.4.1 測試數據失敗:', error)
  }
}

/**
 * 設置 BR2.4.4 測試所需的測試數據（包括被使用和未被使用的模板）
 */
export async function setupBR2_4_4TestData(page: Page): Promise<{
  adminUserId?: number
  employeeUserId?: number
  testServices: Array<{ serviceId: number; serviceName: string }>
  testClients: Array<{ clientId: string; companyName: string }>
  testTemplates: Array<{ templateId: number; templateName: string; serviceId: number; clientId?: string }>
  testClientServices: Array<{ clientServiceId: string; clientId: string; serviceId: number; templateId?: number }>
}> {
  const result: {
    adminUserId?: number
    employeeUserId?: number
    testServices: Array<{ serviceId: number; serviceName: string }>
    testClients: Array<{ clientId: string; companyName: string }>
    testTemplates: Array<{ templateId: number; templateName: string; serviceId: number; clientId?: string }>
    testClientServices: Array<{ clientServiceId: string; clientId: string; serviceId: number; templateId?: number }>
  } = {
    testServices: [],
    testClients: [],
    testTemplates: [],
    testClientServices: []
  }

  try {
    // 1. 獲取管理員用戶 ID
    const usersResponse = await callAPI(page, 'GET', '/settings/users')
    if (usersResponse?.ok && usersResponse?.data?.length > 0) {
      const adminUser = usersResponse.data.find((u: any) => u.is_admin || u.username === 'admin')
      if (adminUser) {
        result.adminUserId = adminUser.user_id || adminUser.id
      }
    } else {
      throw new Error(`無法獲取用戶列表: ${JSON.stringify(usersResponse)}`)
    }

    // 2. 獲取服務列表
    const servicesResponse = await callAPI(page, 'GET', '/settings/services')
    if (!servicesResponse?.ok || !servicesResponse?.data?.length) {
      throw new Error('無法獲取服務列表')
    }
    
    // 使用第一個服務
    const firstService = servicesResponse.data[0]
    const serviceId = firstService.service_id || firstService.id
    const serviceName = firstService.service_name || firstService.name
    result.testServices.push({
      serviceId: serviceId,
      serviceName: serviceName
    })

    // 3. 創建測試客戶
    const testClientId = await createTestClient(page, {
      companyName: 'BR2.4.4測試客戶',
      taxId: '77777777',
      contactPerson1: '測試聯絡人',
      assigneeUserId: result.adminUserId
    })
    if (!testClientId) throw new Error('測試客戶建立失敗')
    result.testClients.push({
      clientId: testClientId,
      companyName: 'BR2.4.4測試客戶'
    })

    // 4. 創建未被使用的模板（用於測試成功刪除）
    const unusedTemplateId = await createTestTaskTemplate(page, {
      templateName: `BR2.4.4未使用模板_${Date.now()}`,
      serviceId: serviceId,
      description: 'BR2.4.4未使用模板描述',
      tasks: [
        {
          task_name: '未使用任務1',
          stage_order: 1,
          estimated_hours: 2
        }
      ]
    })
    if (unusedTemplateId) {
      result.testTemplates.push({
        templateId: unusedTemplateId,
        templateName: `BR2.4.4未使用模板_${Date.now()}`,
        serviceId: serviceId
      })
    }

    // 5. 創建被使用的模板（用於測試刪除失敗）
    const usedTemplateId = await createTestTaskTemplate(page, {
      templateName: `BR2.4.4已使用模板_${Date.now()}`,
      serviceId: serviceId,
      description: 'BR2.4.4已使用模板描述',
      tasks: [
        {
          task_name: '已使用任務1',
          stage_order: 1,
          estimated_hours: 1
        }
      ]
    })
    if (usedTemplateId) {
      result.testTemplates.push({
        templateId: usedTemplateId,
        templateName: `BR2.4.4已使用模板_${Date.now()}`,
        serviceId: serviceId
      })

      // 6. 創建使用該模板的客戶服務
      const clientServiceId = await createTestClientService(page, {
        clientId: testClientId,
        serviceId: serviceId,
        serviceType: 'recurring'
      })
      if (clientServiceId) {
        result.testClientServices.push({
          clientServiceId: clientServiceId,
          clientId: testClientId,
          serviceId: serviceId,
          templateId: usedTemplateId
        })

        // 7. 更新客戶服務以使用該模板
        try {
          await callAPI(page, 'PUT', `/clients/${testClientId}/services/${clientServiceId}`, {
            task_template_id: usedTemplateId
          })
        } catch (error) {
          console.warn('更新客戶服務模板失敗:', error)
          // 不阻止測試繼續
        }
      }
    }

    return result
  } catch (error) {
    throw new Error(`設置 BR2.4.4 測試數據失敗: ${String(error)}`)
  }
}

/**
 * 清理 BR2.4.4 測試數據
 */
export async function cleanupBR2_4_4TestData(page: Page, testData: {
  testTemplates?: Array<{ templateId: number }>
  testClients?: Array<{ clientId: string }>
  testClientServices?: Array<{ clientServiceId: string }>
}): Promise<void> {
  try {
    // 1. 刪除客戶服務（先刪除，因為它們可能使用模板）
    if (testData.testClientServices && testData.testClientServices.length > 0) {
      for (const clientService of testData.testClientServices) {
        try {
          // 獲取客戶 ID（從 clientServiceId 中提取或從 testData 中獲取）
          const clientId = testData.testClients?.[0]?.clientId
          if (clientId) {
            await callAPI(page, 'DELETE', `/clients/${clientId}/services/${clientService.clientServiceId}`)
          }
        } catch (err) {
          console.warn(`刪除測試客戶服務 ${clientService.clientServiceId} 失敗:`, err)
        }
      }
    }

    // 2. 刪除測試任務模板
    if (testData.testTemplates && testData.testTemplates.length > 0) {
      for (const template of testData.testTemplates) {
        try {
          await callAPI(page, 'DELETE', `/task-templates/${template.templateId}`)
        } catch (err) {
          console.warn(`刪除測試任務模板 ${template.templateId} 失敗:`, err)
        }
      }
    }

    // 3. 刪除測試客戶
    if (testData.testClients && testData.testClients.length > 0) {
      for (const client of testData.testClients) {
        try {
          await callAPI(page, 'DELETE', `/clients/${client.clientId}`)
        } catch (err) {
          console.warn(`刪除測試客戶 ${client.clientId} 失敗:`, err)
        }
      }
    }

    console.log('BR2.4.4 測試數據清理完成')
  } catch (error) {
    console.error('清理 BR2.4.4 測試數據失敗:', error)
  }
}

/**
 * 設置 BR2.4.5 測試所需的測試數據（包括階段管理）
 */
export async function setupBR2_4_5TestData(page: Page): Promise<{
  adminUserId?: number
  employeeUserId?: number
  testServices: Array<{ serviceId: number; serviceName: string }>
  testClients: Array<{ clientId: string; companyName: string }>
  testTemplates: Array<{ templateId: number; templateName: string; serviceId: number; clientId?: string }>
  testClientServices: Array<{ clientServiceId: string; clientId: string; serviceId: number; templateId?: number }>
}> {
  const result: {
    adminUserId?: number
    employeeUserId?: number
    testServices: Array<{ serviceId: number; serviceName: string }>
    testClients: Array<{ clientId: string; companyName: string }>
    testTemplates: Array<{ templateId: number; templateName: string; serviceId: number; clientId?: string }>
    testClientServices: Array<{ clientServiceId: string; clientId: string; serviceId: number; templateId?: number }>
  } = {
    testServices: [],
    testClients: [],
    testTemplates: [],
    testClientServices: []
  }

  try {
    // 1. 獲取管理員用戶 ID
    const usersResponse = await callAPI(page, 'GET', '/settings/users')
    if (usersResponse?.ok && usersResponse?.data?.length > 0) {
      const adminUser = usersResponse.data.find((u: any) => u.is_admin || u.username === 'admin')
      if (adminUser) {
        result.adminUserId = adminUser.user_id || adminUser.id
      }
    } else {
      throw new Error(`無法獲取用戶列表: ${JSON.stringify(usersResponse)}`)
    }

    // 2. 獲取服務列表
    const servicesResponse = await callAPI(page, 'GET', '/settings/services')
    if (!servicesResponse?.ok || !servicesResponse?.data?.length) {
      throw new Error('無法獲取服務列表')
    }
    
    // 使用第一個服務
    const firstService = servicesResponse.data[0]
    const serviceId = firstService.service_id || firstService.id
    const serviceName = firstService.service_name || firstService.name
    result.testServices.push({
      serviceId: serviceId,
      serviceName: serviceName
    })

    // 3. 創建測試客戶
    const testClientId = await createTestClient(page, {
      companyName: 'BR2.4.5測試客戶',
      taxId: '88888888',
      contactPerson1: '測試聯絡人',
      assigneeUserId: result.adminUserId
    })
    if (!testClientId) throw new Error('測試客戶建立失敗')
    result.testClients.push({
      clientId: testClientId,
      companyName: 'BR2.4.5測試客戶'
    })

    // 4. 創建帶有多個階段的測試任務模板（用於測試階段管理）
    const templateWithStagesId = await createTestTaskTemplate(page, {
      templateName: `BR2.4.5階段管理模板_${Date.now()}`,
      serviceId: serviceId,
      description: 'BR2.4.5階段管理測試模板',
      tasks: [
        {
          task_name: '階段1任務',
          stage_order: 1,
          estimated_hours: 2
        },
        {
          task_name: '階段2任務',
          stage_order: 2,
          estimated_hours: 3
        },
        {
          task_name: '階段3任務',
          stage_order: 3,
          estimated_hours: 1
        }
      ]
    })
    if (templateWithStagesId) {
      result.testTemplates.push({
        templateId: templateWithStagesId,
        templateName: `BR2.4.5階段管理模板_${Date.now()}`,
        serviceId: serviceId
      })

      // 5. 創建使用該模板的客戶服務（用於測試同步功能）
      const clientServiceId = await createTestClientService(page, {
        clientId: testClientId,
        serviceId: serviceId,
        serviceType: 'recurring'
      })
      if (clientServiceId) {
        result.testClientServices.push({
          clientServiceId: clientServiceId,
          clientId: testClientId,
          serviceId: serviceId,
          templateId: templateWithStagesId
        })

        // 6. 更新客戶服務以使用該模板
        try {
          await callAPI(page, 'PUT', `/clients/${testClientId}/services/${clientServiceId}`, {
            task_template_id: templateWithStagesId
          })
        } catch (error) {
          console.warn('更新客戶服務模板失敗:', error)
          // 不阻止測試繼續
        }
      }
    }

    // 7. 創建另一個未被使用的模板（用於測試沒有同步的情況）
    const unusedTemplateId = await createTestTaskTemplate(page, {
      templateName: `BR2.4.5未使用模板_${Date.now()}`,
      serviceId: serviceId,
      description: 'BR2.4.5未使用測試模板',
      tasks: [
        {
          task_name: '未使用任務1',
          stage_order: 1,
          estimated_hours: 1
        }
      ]
    })
    if (unusedTemplateId) {
      result.testTemplates.push({
        templateId: unusedTemplateId,
        templateName: `BR2.4.5未使用模板_${Date.now()}`,
        serviceId: serviceId
      })
    }

    return result
  } catch (error) {
    throw new Error(`設置 BR2.4.5 測試數據失敗: ${String(error)}`)
  }
}

/**
 * 清理 BR2.4.5 測試數據
 */
export async function cleanupBR2_4_5TestData(page: Page, testData: {
  testTemplates?: Array<{ templateId: number }>
  testClients?: Array<{ clientId: string }>
  testClientServices?: Array<{ clientServiceId: string }>
}): Promise<void> {
  try {
    // 1. 刪除客戶服務（先刪除，因為它們可能使用模板）
    if (testData.testClientServices && testData.testClientServices.length > 0) {
      for (const clientService of testData.testClientServices) {
        try {
          // 獲取客戶 ID（從 clientServiceId 中提取或從 testData 中獲取）
          const clientId = testData.testClients?.[0]?.clientId
          if (clientId) {
            await callAPI(page, 'DELETE', `/clients/${clientId}/services/${clientService.clientServiceId}`)
          }
        } catch (err) {
          console.warn(`刪除測試客戶服務 ${clientService.clientServiceId} 失敗:`, err)
        }
      }
    }

    // 2. 刪除測試任務模板
    if (testData.testTemplates && testData.testTemplates.length > 0) {
      for (const template of testData.testTemplates) {
        try {
          await callAPI(page, 'DELETE', `/task-templates/${template.templateId}`)
        } catch (err) {
          console.warn(`刪除測試任務模板 ${template.templateId} 失敗:`, err)
        }
      }
    }

    // 3. 刪除測試客戶
    if (testData.testClients && testData.testClients.length > 0) {
      for (const client of testData.testClients) {
        try {
          await callAPI(page, 'DELETE', `/clients/${client.clientId}`)
        } catch (err) {
          console.warn(`刪除測試客戶 ${client.clientId} 失敗:`, err)
        }
      }
    }

    console.log('BR2.4.5 測試數據清理完成')
  } catch (error) {
    console.error('清理 BR2.4.5 測試數據失敗:', error)
  }
}

/**
 * 設置 BR2.4.6 測試所需的測試數據（包括模板套用）
 */
export async function setupBR2_4_6TestData(page: Page): Promise<{
  adminUserId?: number
  employeeUserId?: number
  testServices: Array<{ serviceId: number; serviceName: string }>
  testClients: Array<{ clientId: string; companyName: string }>
  testTemplates: Array<{ templateId: number; templateName: string; serviceId: number; clientId?: string; isClientSpecific: boolean }>
  testClientServices: Array<{ clientServiceId: string; clientId: string; serviceId: number }>
}> {
  const result: {
    adminUserId?: number
    employeeUserId?: number
    testServices: Array<{ serviceId: number; serviceName: string }>
    testClients: Array<{ clientId: string; companyName: string }>
    testTemplates: Array<{ templateId: number; templateName: string; serviceId: number; clientId?: string; isClientSpecific: boolean }>
    testClientServices: Array<{ clientServiceId: string; clientId: string; serviceId: number }>
  } = {
    testServices: [],
    testClients: [],
    testTemplates: [],
    testClientServices: []
  }

  try {
    // 1. 獲取管理員用戶 ID
    const usersResponse = await callAPI(page, 'GET', '/settings/users')
    if (usersResponse?.ok && usersResponse?.data?.length > 0) {
      const adminUser = usersResponse.data.find((u: any) => u.is_admin || u.username === 'admin')
      if (adminUser) {
        result.adminUserId = adminUser.user_id || adminUser.id
      }
    } else {
      throw new Error(`無法獲取用戶列表: ${JSON.stringify(usersResponse)}`)
    }

    // 2. 獲取服務列表
    const servicesResponse = await callAPI(page, 'GET', '/settings/services')
    if (!servicesResponse?.ok || !servicesResponse?.data?.length) {
      throw new Error('無法獲取服務列表')
    }
    
    // 使用第一個服務
    const firstService = servicesResponse.data[0]
    const serviceId = firstService.service_id || firstService.id
    const serviceName = firstService.service_name || firstService.name
    result.testServices.push({
      serviceId: serviceId,
      serviceName: serviceName
    })

    // 3. 創建測試客戶（使用唯一的統一編號）
    const uniqueTaxId = `9999${Date.now().toString().slice(-4)}` // 使用時間戳確保唯一性
    const testClientId = await createTestClient(page, {
      companyName: `BR2.4.6測試客戶_${Date.now()}`,
      taxId: uniqueTaxId,
      contactPerson1: '測試聯絡人',
      assigneeUserId: result.adminUserId
    })
    if (!testClientId) throw new Error('測試客戶建立失敗')
    result.testClients.push({
      clientId: testClientId,
      companyName: 'BR2.4.6測試客戶'
    })

    // 4. 創建統一模板（用於測試統一模板顯示）
    const unifiedTemplateId = await createTestTaskTemplate(page, {
      templateName: `BR2.4.6統一模板_${Date.now()}`,
      serviceId: serviceId,
      description: 'BR2.4.6統一模板描述',
      tasks: [
        {
          task_name: '統一模板任務1',
          stage_order: 1,
          estimated_hours: 2
        },
        {
          task_name: '統一模板任務2',
          stage_order: 2,
          estimated_hours: 3
        }
      ]
    })
    if (unifiedTemplateId) {
      result.testTemplates.push({
        templateId: unifiedTemplateId,
        templateName: `BR2.4.6統一模板_${Date.now()}`,
        serviceId: serviceId,
        isClientSpecific: false
      })
    }

    // 5. 創建客戶專屬模板（用於測試客戶專屬模板優先顯示）
    const clientSpecificTemplateId = await createTestTaskTemplate(page, {
      templateName: `BR2.4.6客戶專屬模板_${Date.now()}`,
      serviceId: serviceId,
      clientId: testClientId,
      description: 'BR2.4.6客戶專屬模板描述',
      tasks: [
        {
          task_name: '客戶專屬任務1',
          stage_order: 1,
          estimated_hours: 1
        },
        {
          task_name: '客戶專屬任務2',
          stage_order: 2,
          estimated_hours: 2
        },
        {
          task_name: '客戶專屬任務3',
          stage_order: 3,
          estimated_hours: 1
        }
      ]
    })
    if (clientSpecificTemplateId) {
      result.testTemplates.push({
        templateId: clientSpecificTemplateId,
        templateName: `BR2.4.6客戶專屬模板_${Date.now()}`,
        serviceId: serviceId,
        clientId: testClientId,
        isClientSpecific: true
      })
    }

    // 6. 創建客戶服務（用於測試模板套用）
    const clientServiceId = await createTestClientService(page, {
      clientId: testClientId,
      serviceId: serviceId,
      serviceType: 'recurring'
    })
    if (clientServiceId) {
      result.testClientServices.push({
        clientServiceId: clientServiceId,
        clientId: testClientId,
        serviceId: serviceId
      })
    }

    return result
  } catch (error) {
    throw new Error(`設置 BR2.4.6 測試數據失敗: ${String(error)}`)
  }
}

/**
 * 清理 BR2.4.6 測試數據
 */
export async function cleanupBR2_4_6TestData(page: Page, testData: {
  testTemplates?: Array<{ templateId: number }>
  testClients?: Array<{ clientId: string }>
  testClientServices?: Array<{ clientServiceId: string }>
}): Promise<void> {
  try {
    // 1. 刪除客戶服務（先刪除，因為它們可能使用模板）
    if (testData.testClientServices && testData.testClientServices.length > 0) {
      for (const clientService of testData.testClientServices) {
        try {
          // 獲取客戶 ID（從 clientServiceId 中提取或從 testData 中獲取）
          const clientId = testData.testClients?.[0]?.clientId
          if (clientId) {
            await callAPI(page, 'DELETE', `/clients/${clientId}/services/${clientService.clientServiceId}`)
          }
        } catch (err) {
          console.warn(`刪除測試客戶服務 ${clientService.clientServiceId} 失敗:`, err)
        }
      }
    }

    // 2. 刪除測試任務模板
    if (testData.testTemplates && testData.testTemplates.length > 0) {
      for (const template of testData.testTemplates) {
        try {
          await callAPI(page, 'DELETE', `/task-templates/${template.templateId}`)
        } catch (err) {
          console.warn(`刪除測試任務模板 ${template.templateId} 失敗:`, err)
        }
      }
    }

    // 3. 刪除測試客戶
    if (testData.testClients && testData.testClients.length > 0) {
      for (const client of testData.testClients) {
        try {
          await callAPI(page, 'DELETE', `/clients/${client.clientId}`)
        } catch (err) {
          console.warn(`刪除測試客戶 ${client.clientId} 失敗:`, err)
        }
      }
    }

    console.log('BR2.4.6 測試數據清理完成')
  } catch (error) {
    console.error('清理 BR2.4.6 測試數據失敗:', error)
  }
}

