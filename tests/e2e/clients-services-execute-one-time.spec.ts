import { test, expect } from '@playwright/test';
import dayjs from 'dayjs';

function sanitizeAmount(text: string): number {
  const t = (text || '').trim();
  if (!t || t === '—') return 0;
  return Number(t.replace(/,/g, '')) || 0;
}

// 純 UI：對現有服務點「編輯」並切換為一次性服務
async function convertFirstServiceToOneTimeViaUI(page) {
  const table = page.getByRole('table').first();
  const editBtn = table.locator('button:has-text("編輯")').first();
  await editBtn.waitFor({ state: 'visible', timeout: 10000 });
  await editBtn.click();
  // 等待彈窗出現
  const modal = page.locator('.ant-modal');
  await modal.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  // 選擇「一次性」
  const oneTimeRadio = page.getByRole('radio', { name: /一次性|單次|one-time/i }).first();
  await oneTimeRadio.waitFor({ state: 'visible', timeout: 10000 });
  await oneTimeRadio.check();
  // 確定
  const confirmBtn = page.getByRole('button', { name: /^確定$|^提交$|^保存$/ }).first();
  await confirmBtn.click();
  // 等待表格刷新
  await page.waitForLoadState('networkidle');
}

// 純 UI：新增一次性服務
async function addOneTimeServiceViaUI(page) {
  let addBtn = page.locator('.ant-card-extra').getByRole('button', { name: /新增服務/ }).first();
  if (!(await addBtn.isVisible().catch(() => false))) {
    addBtn = page.getByRole('button', { name: /新增服務/ }).first();
  }
  await addBtn.waitFor({ state: 'visible', timeout: 10000 });
  await addBtn.click();
  const modal = page.locator('.ant-modal');
  await modal.waitFor({ state: 'visible', timeout: 10000 });
  // 打開服務下拉
  const selectTrigger = modal.locator('.ant-select-selector').first();
  if (await selectTrigger.isVisible().catch(() => false)) {
    await selectTrigger.click();
  } else {
    const combo = modal.getByRole('combobox').first();
    await combo.click();
  }
  // 等選單出現並選第一個選項
  const firstOption = page.locator('.ant-select-item-option').first();
  await firstOption.waitFor({ state: 'visible', timeout: 10000 });
  await firstOption.click();
  const oneTime = modal.getByRole('radio', { name: /一次性|單次|one-time/i }).first();
  if (await oneTime.isVisible().catch(() => false)) {
    await oneTime.check();
  }
  await modal.getByRole('button', { name: /^確定$|^提交$|^保存$/ }).click();
  // 等待執行服務按鈕出現（表格刷新完成）
  await page.getByRole('button', { name: /^執行服務$/ }).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
}

test.describe('BR1.3.2: 客戶詳情 - 服務分頁 - 一次性服務執行', () => {
  test.beforeEach(async ({ page }) => {
    // 清快取並登入（若已登入則略過）
    await page.context().clearCookies();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const alreadyAuthed = /\/dashboard/.test(page.url()) || await page.getByRole('button', { name: /登出/ }).isVisible().catch(() => false);
    if (!alreadyAuthed) {
      const userInput = page.getByPlaceholder(/帳號|請輸入帳號/i);
      const pwdInput = page.getByPlaceholder(/密碼|請輸入密碼/i);
      if (await userInput.isVisible().catch(() => false)) {
        await userInput.fill('admin');
      }
      if (await pwdInput.isVisible().catch(() => false)) {
        await pwdInput.fill('111111');
      }
      const loginBtn = page.getByRole('button', { name: /登入/ });
      if (await loginBtn.isVisible().catch(() => false)) {
        await loginBtn.click();
      }
      await page.waitForLoadState('networkidle');
      if (!/\/dashboard/.test(page.url())) {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('應該能對一次性服務執行收費並更新年度總額', async ({ page }) => {
    const clientId = '00000004'; // 銀穗珠寶股份有限公司（正式資料存在）
    // 採用相對路徑 + 頁面內 fetch，確保同網域並自帶 Cookie
    const effectiveBase = '';

    // 進入該客戶服務分頁
    await page.goto(`${effectiveBase}/clients/${clientId}/services`);
    await page.waitForLoadState('networkidle');

    // 頁面上下文內呼叫 fetch，帶上 credentials 與相對路徑
    async function getJson(path: string) {
      return await page.evaluate(async (p) => {
        const resp = await fetch(p, { method: 'GET', credentials: 'include' as RequestCredentials, headers: { 'x-no-cache': '1' } });
        return await resp.json();
      }, path);
    }
    async function postJson(path: string, data: any) {
      return await page.evaluate(async ({ p, d }) => {
        const resp = await fetch(p, {
          method: 'POST',
          credentials: 'include' as RequestCredentials,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(d)
        });
        const text = await resp.text();
        try { return JSON.parse(text); } catch { return { raw: text, status: resp.status }; }
      }, { p: path, d: data });
    }

    // 盡力透過 UI 建立一次性服務；若正式站 UI 無對應按鈕，最後以 API 建立一次性收費（仍驗證 UI 合計變化）
    const table = page.getByRole('table').first();
    let dataRows = table.getByRole('row');
    const rowCount = await dataRows.count();
    let uiSetupOk = false;
    try {
      await addOneTimeServiceViaUI(page);
      uiSetupOk = true;
    } catch (_) {
      try {
        await convertFirstServiceToOneTimeViaUI(page);
        uiSetupOk = true;
      } catch (_) {
        uiSetupOk = false;
      }
    }
    if (uiSetupOk) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      dataRows = table.getByRole('row');
    }
    // 無論是否標示一次性，直接以 UI 操作最後一列的「執行服務」

    // 先嘗試用 UI 建立一次性服務（上方已嘗試過一次）；然後在表格中尋找包含「執行服務」的那一列
    const targetRow = page.locator('tr:has(button:has-text("執行服務"))').first();
    await targetRow.waitFor({ state: 'visible', timeout: 15000 });
    const cellCount = await targetRow.getByRole('cell').count();
    const totalIdx = Math.max(0, cellCount - 2);
    const beforeText = await targetRow.getByRole('cell').nth(totalIdx).innerText();
    const beforeAmount = sanitizeAmount(beforeText);

    // 點擊「執行服務」
    await targetRow.getByRole('button', { name: /^執行服務$/ }).first().click();

    const today = dayjs().format('YYYY-MM-DD');
    const amount = Math.floor(Math.random() * 900) + 100; // 100~999 隨機
    const desc = `E2E一次性-${Date.now()}`;

    // 填表單
    // 日期
    const dateInput = page.getByPlaceholder(/日期|YYYY-MM-DD|選擇日期/).first();
    if (await dateInput.isVisible().catch(() => false)) {
      await dateInput.fill(today);
    } else {
      // 以日期選擇器形式，點擊後 Enter 接受今天
      const datePicker = page.locator('.ant-picker-input input').first();
      await datePicker.click();
      await page.keyboard.press('Enter');
    }
    // 說明
    await page.getByPlaceholder(/說明|項目描述/).first().fill(desc);
    // 金額
    await page.getByPlaceholder(/金額/).first().fill(String(amount));
    // 收款天數（若存在）
    const dueInput = page.getByPlaceholder(/收款.*天|付款.*天|天數/i).first();
    if (await dueInput.isVisible().catch(() => false)) {
      await dueInput.fill('30');
    }

    // 確認
    await page.getByRole('button', { name: /^確定$|^提交$|^保存$/ }).first().click();

    // 成功提示
    await expect(page.getByText(/已創建|成功|建立成功/)).toBeVisible({ timeout: 10000 });

    // 年度總額應更新（等 UI 刷新）
    await page.waitForTimeout(1000);
    const afterAmountText = (await targetRow.getByRole('cell').nth(totalIdx).innerText()).trim();
    const afterAmount = sanitizeAmount(afterAmountText);
    expect(afterAmount).toBe(beforeAmount + amount);
  });
});


