import type { Page, BrowserContext } from '@playwright/test'

/**
 * 清除緩存並登出
 * 確保每次測試前都從乾淨的狀態開始
 */
export async function clearCacheAndLogout(page: Page) {
  try {
    // 清除所有 cookies
    await page.context().clearCookies()
    
    // 清除 localStorage
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    // 清除緩存（如果可能）
    await page.evaluate(() => {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name))
        })
      }
    })
    
    // 等待一下確保清除完成
    await page.waitForTimeout(500)
  } catch (error) {
    // 如果清除失敗，繼續執行（可能是第一次訪問）
    console.warn('清除緩存時發生錯誤（可忽略）:', error)
  }
}

export async function login(page: Page, opts: { username?: string; password?: string } = {}) {
  const username = opts.username ?? process.env.TEST_ADMIN_USER ?? 'admin'
  const password = opts.password ?? process.env.TEST_ADMIN_PASSWORD ?? '111111'

  // 先清除緩存和登出，確保從乾淨狀態開始
  await clearCacheAndLogout(page)

  await page.goto('/login', { waitUntil: 'networkidle' })
  
  // Use getByPlaceholder for Ant Design Vue inputs (more reliable than name attribute)
  await page.getByPlaceholder('請輸入帳號').fill(username)
  await page.getByPlaceholder('請輸入密碼').fill(password)
  await page.getByRole('button', { name: /登入|登 入/ }).click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

export async function withAuthenticatedPage(
  context: BrowserContext,
  opts: { username?: string; password?: string } = {}
) {
  const page = await context.newPage()
  await login(page, opts)
  return page
}



