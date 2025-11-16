import { test, expect } from '@playwright/test';
import { login, clearCacheAndLogout } from './utils/auth';

test.describe('BR1.3.1: 股東/董監事資訊表格編輯器', () => {
  test.beforeEach(async ({ page }) => {
    await clearCacheAndLogout(page);
    await login(page, { role: 'admin' });
  });

  test('新增股東與董監事、保存並確認欄位存在', async ({ page }) => {
    // 前往新增頁面
    await page.goto('/clients/add/basic');
    await expect(page.getByRole('tab', { name: '基本信息' })).toBeVisible();

    // 填必填欄位：公司名稱、統一編號（使用唯一值）、負責人員
    const uniqueSuffix = Date.now().toString().slice(-6);
    await page.getByPlaceholder('請輸入公司名稱').fill(`E2E_股東董監_${uniqueSuffix}`);
    await page.getByPlaceholder('企業客戶：8碼數字；個人客戶：10碼身分證').fill('12345679'); // 企業8碼，後端自動補00

    // 選擇負責人員（選第一個）
    const assigneeCombobox = page.getByRole('combobox').first();
    await assigneeCombobox.click();
    // 使用鍵盤選擇第一個選項（避免浮層不可見問題）
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // 新增股東
    await page.getByRole('button', { name: '+ 新增股東' }).click();
    // 填寫股東 1
    await page.getByPlaceholder('請輸入股東姓名').fill('王大明');
    // 選擇持股類型（在股東編輯器區域內的第一個下拉）
    const shareholderSelectTrigger = page.locator('.shareholders-editor .ant-select').first().locator('.ant-select-selector');
    await shareholderSelectTrigger.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    // 比例/股數/金額
    // 使用 spinbutton 定位三個輸入
    const spinbuttons = page.getByRole('spinbutton');
    // 順序：持股比例、持股數、持股金額
    await spinbuttons.nth(0).fill('12.5');
    await spinbuttons.nth(1).fill('1000');
    await spinbuttons.nth(2).fill('500000');

    // 新增董監事
    await page.getByRole('button', { name: '+ 新增董監事' }).click();
    // 填寫董監事 1
    // 姓名
    await page.getByPlaceholder('請輸入姓名').fill('李小華');
    // 職務（在董監事編輯器區域內的第一個下拉）
    const directorSelectTrigger = page.locator('.directors-supervisors-editor .ant-select').first().locator('.ant-select-selector');
    await directorSelectTrigger.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    // 日期為可選欄位，略過不填；是否為現任預設為是

    // 保存基本資訊
    await page.getByRole('button', { name: '保存基本資訊' }).click();

    // 確認成功提示或按鈕狀態恢復（無錯誤彈窗）
    await expect(page.getByRole('button', { name: '保存基本資訊' })).toBeEnabled({ timeout: 10000 });

    // 基本檢查：新增的區塊仍可見
    await expect(page.getByText('股東持股資訊')).toBeVisible();
    await expect(page.getByText('董監事資訊')).toBeVisible();
    await expect(page.getByPlaceholder('請輸入股東姓名')).toHaveValue('王大明');
    await expect(page.getByPlaceholder('請輸入姓名')).toHaveValue('李小華');
  });

  test('可刪除股東/董監事項目', async ({ page }) => {
    await page.goto('/clients/add/basic');
    await page.getByRole('tab', { name: '基本信息' }).isVisible();

    await page.getByRole('button', { name: '+ 新增股東' }).click();
    await expect(page.getByText('股東 1')).toBeVisible();
    await page.getByRole('button', { name: '刪除' }).first().click();
    // 刪除後提示空狀態
    await expect(page.getByText('暫無股東資訊，點擊上方按鈕新增')).toBeVisible();

    await page.getByRole('button', { name: '+ 新增董監事' }).click();
    await expect(page.getByText('董監事 1')).toBeVisible();
    // 第二個刪除按鈕屬於董監事卡片
    await page.getByRole('button', { name: '刪除' }).first().click();
    await expect(page.getByText('暫無董監事資訊，點擊上方按鈕新增')).toBeVisible();
  });
});


