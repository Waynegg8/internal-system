/**
 * 測試數據設置工具
 * 
 * 用於在測試前設置必要的測試數據（客戶、標籤、用戶等）
 */

import type { Page } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || ''

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
async function callAPI(page: Page, method: string, path: string, body?: any): Promise<any> {
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
  const response = await page.request.fetch(`${BASE_URL}${apiPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `session=${cookie}`
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  return await response.json()
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
      tax_registration_number: finalTaxId,
      contact_person_1: clientData.contactPerson1,
      phone: clientData.phone,
      email: clientData.email,
      assignee_user_id: assigneeUserId
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

