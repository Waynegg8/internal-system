import type { Page, BrowserContext } from '@playwright/test'

export async function login(page: Page, opts: { username?: string; password?: string } = {}) {
  const username = opts.username ?? process.env.TEST_ADMIN_USER ?? 'admin'
  const password = opts.password ?? process.env.TEST_ADMIN_PASSWORD ?? '111111'

  await page.goto('/login', { waitUntil: 'networkidle' })
  await page.fill('input[name="username"]', username)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
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



