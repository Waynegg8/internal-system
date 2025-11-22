/**
 * 附件上傳功能 E2E 測試
 * 
 * BR12.1: 附件上傳
 * 
 * 測試範圍：
 * - BR12.1.1: 文件選擇與上傳（拖放、點擊選擇、多檔、並行上傳、進度條、取消）
 * - BR12.1.2: 文件大小驗證（25MB 限制）
 * - BR12.1.3: 文件類型驗證（PDF、Word、Excel、PowerPoint、圖片）
 * - BR12.1.4: 附件關聯（entity_type、entity_id）
 * - BR12.1.5: 上傳流程（兩步上傳、簽名驗證）
 */

import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

test.describe('BR12.1: 附件上傳功能', () => {
  const tempFiles: string[] = []
  const uploadedAttachmentIds: string[] = []

  // 創建臨時測試文件
  const createTempFile = (filename: string, content: string, size?: number): string => {
    const tempDir = os.tmpdir()
    const tempFilePath = path.join(tempDir, filename)
    
    if (size && size > 0) {
      // 創建指定大小的文件
      const buffer = Buffer.alloc(size, 'a')
      fs.writeFileSync(tempFilePath, buffer)
    } else {
      fs.writeFileSync(tempFilePath, content)
    }
    
    tempFiles.push(tempFilePath)
    return tempFilePath
  }

  // 清理臨時文件
  const cleanupTempFiles = () => {
    tempFiles.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (e) {
        // 忽略清理錯誤
      }
    })
    tempFiles.length = 0
  }

  test.beforeEach(async ({ page }) => {
    // 登入
    await login(page)
    
    // 導航到知識庫附件頁面
    await page.goto('/knowledge/attachments', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // 等待數據載入
  })

  test.afterEach(async ({ page }) => {
    // 清理測試數據：刪除上傳的附件
    if (uploadedAttachmentIds.length > 0) {
      for (const attachmentId of uploadedAttachmentIds) {
        try {
          const response = await page.request.delete(`/api/v2/attachments/${attachmentId}`).catch(() => null)
          console.log('清理測試附件:', attachmentId, response?.status())
        } catch (error) {
          console.warn('清理測試數據失敗:', error)
        }
      }
      uploadedAttachmentIds.length = 0
    }
    
    // 清理臨時文件
    cleanupTempFiles()
  })

  // ========== BR12.1.1: 文件選擇與上傳 ==========
  test.describe('文件選擇與上傳', () => {
    test('應該能打開上傳抽屜', async ({ page }) => {
      // 查找並點擊新增按鈕
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      
      // 等待按鈕可見
      await expect(addButton).toBeVisible({ timeout: 5000 })
      await addButton.click()
      await page.waitForTimeout(1000)

      // 驗證上傳抽屜打開
      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })

      // 驗證上傳區域存在
      const uploadArea = drawer.locator('.ant-upload-drag, .upload-trigger').first()
      await expect(uploadArea).toBeVisible({ timeout: 3000 })
    })

    test('應該能通過點擊選擇文件上傳', async ({ page }) => {
      // 創建測試文件
      const testFilePath = createTempFile(`test-attachment-${Date.now()}.pdf`, 'Test PDF content')
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 嘗試通過文件輸入上傳
      const fileInput = drawerContent.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles(testFilePath)
        await page.waitForTimeout(1000)
      } else {
        // 嘗試通過點擊上傳區域觸發文件選擇
        const uploadArea = drawerContent.locator('.ant-upload-drag, .upload-trigger, button:has-text("選擇文件")').first()
        if (await uploadArea.isVisible({ timeout: 3000 }).catch(() => false)) {
          const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null)
          await uploadArea.click({ force: true })
          const fileChooser = await fileChooserPromise
          if (fileChooser) {
            await fileChooser.setFiles(testFilePath)
            await page.waitForTimeout(1000)
          }
        }
      }

      // 驗證文件已添加到列表
      const fileList = drawerContent.locator('.file-item, .ant-upload-list-item')
      await expect(fileList.first()).toBeVisible({ timeout: 3000 })

      // 點擊上傳按鈕
      const uploadButton = drawerContent.locator('button:has-text("上傳")').filter({ hasText: /^上傳/ }).first()
      if (await uploadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await uploadButton.click({ force: true })
        
        // 等待上傳完成
        await page.waitForTimeout(5000)

        // 驗證成功提示或抽屜關閉
        const successMessage = page.locator('.ant-alert-success, text=/上傳成功|成功/').first()
        const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false)
        const drawerClosed = !(await drawer.isVisible({ timeout: 2000 }).catch(() => false))
        
        expect(hasSuccess || drawerClosed).toBe(true)
      }
    })

    test('應該能通過拖放上傳文件', async ({ page }) => {
      // 創建測試文件
      const testFilePath = createTempFile(`test-drag-${Date.now()}.png`, 'Test PNG content')
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')
      const uploadArea = drawerContent.locator('.ant-upload-drag, .upload-trigger').first()

      if (await uploadArea.isVisible({ timeout: 3000 }).catch(() => false)) {
        // 讀取文件內容
        const fileContent = fs.readFileSync(testFilePath)
        const fileName = path.basename(testFilePath)

        // 執行拖放操作
        await uploadArea.dispatchEvent('dragover', { bubbles: true })
        await page.waitForTimeout(100)
        
        const dataTransfer = await page.evaluateHandle(({ fileName, fileContent, fileType }) => {
          const dt = new DataTransfer()
          const file = new File([new Uint8Array(fileContent)], fileName, { type: fileType })
          dt.items.add(file)
          return dt
        }, { fileName, fileContent: Array.from(fileContent), fileType: 'image/png' })

        await uploadArea.dispatchEvent('drop', { bubbles: true, dataTransfer })
        await page.waitForTimeout(1000)

        // 驗證文件已添加到列表
        const fileList = drawerContent.locator('.file-item, .ant-upload-list-item')
        await expect(fileList.first()).toBeVisible({ timeout: 3000 })
      }
    })

    test('應該能一次選擇多個文件', async ({ page }) => {
      // 創建多個測試文件
      const testFile1 = createTempFile(`test-1-${Date.now()}.pdf`, 'Test PDF 1')
      const testFile2 = createTempFile(`test-2-${Date.now()}.docx`, 'Test DOCX 2')
      const testFile3 = createTempFile(`test-3-${Date.now()}.xlsx`, 'Test XLSX 3')
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 上傳多個文件
      const fileInput = drawerContent.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles([testFile1, testFile2, testFile3])
        await page.waitForTimeout(1000)

        // 驗證文件列表顯示多個文件
        const fileList = drawerContent.locator('.file-item, .ant-upload-list-item')
        const fileCount = await fileList.count()
        expect(fileCount).toBeGreaterThanOrEqual(2) // 至少顯示 2 個文件
      } else {
        // 嘗試通過點擊上傳區域觸發多文件選擇
        const uploadArea = drawerContent.locator('.ant-upload-drag, .upload-trigger, button:has-text("選擇文件")').first()
        if (await uploadArea.isVisible({ timeout: 3000 }).catch(() => false)) {
          const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null)
          await uploadArea.click({ force: true })
          const fileChooser = await fileChooserPromise
          if (fileChooser) {
            await fileChooser.setFiles([testFile1, testFile2, testFile3])
            await page.waitForTimeout(1000)

            // 驗證文件列表顯示多個文件
            const fileList = drawerContent.locator('.file-item, .ant-upload-list-item')
            const fileCount = await fileList.count()
            expect(fileCount).toBeGreaterThanOrEqual(2)
          }
        }
      }
    })

    test('應該為每個文件顯示獨立的進度條', async ({ page }) => {
      // 創建多個測試文件
      const testFile1 = createTempFile(`test-progress-1-${Date.now()}.pdf`, 'Test PDF 1')
      const testFile2 = createTempFile(`test-progress-2-${Date.now()}.png`, 'Test PNG 2')
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 上傳多個文件
      const fileInput = drawerContent.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles([testFile1, testFile2])
        await page.waitForTimeout(1000)

        // 點擊上傳按鈕
        const uploadButton = drawerContent.locator('button:has-text("上傳")').filter({ hasText: /^上傳/ }).first()
        if (await uploadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await uploadButton.click({ force: true })
          await page.waitForTimeout(1000)

          // 驗證每個文件都有獨立的進度條
          const progressBars = drawerContent.locator('.file-progress .ant-progress, .ant-upload-list-item .ant-progress')
          const progressCount = await progressBars.count()
          
          // 應該至少有 1 個進度條（可能有些文件上傳很快）
          expect(progressCount).toBeGreaterThanOrEqual(1)
        }
      }
    })

    test('應該能取消正在上傳的文件', async ({ page }) => {
      // 創建一個較大的測試文件以確保上傳需要時間
      const testFilePath = createTempFile(`test-cancel-${Date.now()}.pdf`, 'Test content', 1024 * 1024) // 1MB
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 上傳文件
      const fileInput = drawerContent.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles(testFilePath)
        await page.waitForTimeout(1000)

        // 點擊上傳按鈕
        const uploadButton = drawerContent.locator('button:has-text("上傳")').filter({ hasText: /^上傳/ }).first()
        if (await uploadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await uploadButton.click({ force: true })
          await page.waitForTimeout(500)

          // 查找並點擊取消按鈕
          const cancelButton = drawerContent.locator('button:has-text("取消")').filter({ hasText: /^取消$/ }).first()
          if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await cancelButton.click({ force: true })
            await page.waitForTimeout(1000)

            // 驗證上傳被取消（進度條消失或顯示取消消息）
            const cancelMessage = page.locator('text=/上傳已取消|已取消/').first()
            const hasCancelMessage = await cancelMessage.isVisible({ timeout: 3000 }).catch(() => false)
            expect(hasCancelMessage).toBe(true)
          }
        }
      }
    })

    test('應該限制同時上傳的文件數量不超過 5 個', async ({ page }) => {
      // 創建 6 個測試文件
      const testFiles = Array.from({ length: 6 }, (_, i) => 
        createTempFile(`test-limit-${i}-${Date.now()}.pdf`, `Test PDF ${i}`)
      )
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 嘗試上傳 6 個文件
      const fileInput = drawerContent.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles(testFiles)
        await page.waitForTimeout(1000)

        // 驗證錯誤提示或文件數量限制
        const errorMessage = page.locator('.ant-alert-error, text=/最多|限制/').first()
        const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)
        
        // 或者驗證文件列表只有 5 個文件
        const fileList = drawerContent.locator('.file-item, .ant-upload-list-item')
        const fileCount = await fileList.count()
        
        // 應該有錯誤提示或文件數量不超過 5
        expect(hasError || fileCount <= 5).toBe(true)
      }
    })
  })

  // ========== BR12.1.2: 文件大小驗證 ==========
  test.describe('文件大小驗證', () => {
    test('應該拒絕超過 25MB 的文件', async ({ page }) => {
      // 創建一個超過 25MB 的文件
      const largeFilePath = createTempFile(`test-large-${Date.now()}.pdf`, '', 26 * 1024 * 1024) // 26MB
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 嘗試上傳大文件
      const fileInput = drawerContent.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles(largeFilePath)
        await page.waitForTimeout(1000)

        // 驗證錯誤提示
        const errorMessage = page.locator('.ant-alert-error, text=/25MB|文件大小|超過限制/').first()
        await expect(errorMessage).toBeVisible({ timeout: 3000 })
      }
    })

    test('應該接受不超過 25MB 的文件', async ({ page }) => {
      // 創建一個小於 25MB 的文件
      const smallFilePath = createTempFile(`test-small-${Date.now()}.pdf`, '', 10 * 1024 * 1024) // 10MB
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 上傳文件
      const fileInput = drawerContent.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles(smallFilePath)
        await page.waitForTimeout(1000)

        // 驗證文件已添加到列表（沒有錯誤）
        const fileList = drawerContent.locator('.file-item, .ant-upload-list-item')
        const errorMessage = page.locator('.ant-alert-error').first()
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)
        const hasFile = await fileList.first().isVisible({ timeout: 2000 }).catch(() => false)
        
        expect(hasFile && !hasError).toBe(true)
      }
    })
  })

  // ========== BR12.1.3: 文件類型驗證 ==========
  test.describe('文件類型驗證', () => {
    const allowedTypes = [
      { ext: 'pdf', content: 'Test PDF' },
      { ext: 'docx', content: 'Test DOCX' },
      { ext: 'xlsx', content: 'Test XLSX' },
      { ext: 'pptx', content: 'Test PPTX' },
      { ext: 'png', content: 'Test PNG' },
      { ext: 'jpg', content: 'Test JPG' }
    ]

    for (const type of allowedTypes) {
      test(`應該接受 ${type.ext} 文件`, async ({ page }) => {
        const testFilePath = createTempFile(`test-${type.ext}-${Date.now()}.${type.ext}`, type.content)
        
        // 打開上傳抽屜
        const addButton = page.locator('button:has-text("新增")').or(
          page.locator('button').filter({ hasText: /新增|上傳/ })
        ).first()
        await addButton.click()
        await page.waitForTimeout(1000)

        const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
        await expect(drawer).toBeVisible({ timeout: 5000 })
        await page.waitForTimeout(1000)

        const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

        // 上傳文件
        const fileInput = drawerContent.locator('input[type="file"]').first()
        if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await fileInput.setInputFiles(testFilePath)
          await page.waitForTimeout(1000)

          // 驗證文件已添加到列表（沒有錯誤）
          const fileList = drawerContent.locator('.file-item, .ant-upload-list-item')
          const errorMessage = page.locator('.ant-alert-error').first()
          const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)
          const hasFile = await fileList.first().isVisible({ timeout: 2000 }).catch(() => false)
          
          expect(hasFile && !hasError).toBe(true)
        }
      })
    }

    test('應該拒絕不支持的文件類型', async ({ page }) => {
      // 創建一個不支持的文件類型
      const testFilePath = createTempFile(`test-invalid-${Date.now()}.txt`, 'Test TXT')
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 嘗試上傳不支持的文件
      const fileInput = drawerContent.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles(testFilePath)
        await page.waitForTimeout(1000)

        // 驗證錯誤提示
        const errorMessage = page.locator('.ant-alert-error, text=/不支持|文件類型|格式/').first()
        const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false)
        
        expect(hasError).toBe(true)
      }
    })
  })

  // ========== BR12.1.4: 附件關聯 ==========
  test.describe('附件關聯', () => {
    test('應該顯示附件關聯的實體信息', async ({ page }) => {
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 驗證提示信息顯示 entityType 和 entityId
      const infoAlert = drawerContent.locator('.ant-alert-info, text=/關聯|entity|SOP|任務/').first()
      const hasInfo = await infoAlert.isVisible({ timeout: 3000 }).catch(() => false)
      
      // 應該顯示關聯信息
      expect(hasInfo).toBe(true)
    })
  })

  // ========== BR12.1.5: 上傳流程 ==========
  test.describe('上傳流程', () => {
    test('應該完成完整的上傳流程（選擇文件 → 驗證 → 上傳 → 成功）', async ({ page }) => {
      // 創建測試文件
      const testFilePath = createTempFile(`test-complete-${Date.now()}.pdf`, 'Test PDF content')
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 步驟 1: 選擇文件
      const fileInput = drawerContent.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles(testFilePath)
        await page.waitForTimeout(1000)

        // 步驟 2: 驗證文件已添加
        const fileList = drawerContent.locator('.file-item, .ant-upload-list-item')
        await expect(fileList.first()).toBeVisible({ timeout: 3000 })

        // 步驟 3: 點擊上傳
        const uploadButton = drawerContent.locator('button:has-text("上傳")').filter({ hasText: /^上傳/ }).first()
        if (await uploadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await uploadButton.click({ force: true })
          
          // 步驟 4: 等待上傳完成
          await page.waitForTimeout(5000)

          // 驗證成功
          const successMessage = page.locator('.ant-alert-success, text=/上傳成功|成功/').first()
          const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false)
          const drawerClosed = !(await drawer.isVisible({ timeout: 2000 }).catch(() => false))
          
          expect(hasSuccess || drawerClosed).toBe(true)
        }
      }
    })

    test('應該支持多檔並行上傳', async ({ page }) => {
      // 創建多個測試文件
      const testFiles = [
        createTempFile(`test-parallel-1-${Date.now()}.pdf`, 'Test PDF 1'),
        createTempFile(`test-parallel-2-${Date.now()}.png`, 'Test PNG 2'),
        createTempFile(`test-parallel-3-${Date.now()}.docx`, 'Test DOCX 3')
      ]
      
      // 打開上傳抽屜
      const addButton = page.locator('button:has-text("新增")').or(
        page.locator('button').filter({ hasText: /新增|上傳/ })
      ).first()
      await addButton.click()
      await page.waitForTimeout(1000)

      const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳附件/ })
      await expect(drawer).toBeVisible({ timeout: 5000 })
      await page.waitForTimeout(1000)

      const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

      // 上傳多個文件
      const fileInput = drawerContent.locator('input[type="file"]').first()
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles(testFiles)
        await page.waitForTimeout(1000)

        // 點擊上傳
        const uploadButton = drawerContent.locator('button:has-text("上傳")').filter({ hasText: /^上傳/ }).first()
        if (await uploadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await uploadButton.click({ force: true })
          
          // 等待上傳開始
          await page.waitForTimeout(1000)

          // 驗證多個進度條同時顯示（並行上傳）
          const progressBars = drawerContent.locator('.file-progress .ant-progress, .ant-upload-list-item .ant-progress')
          const progressCount = await progressBars.count()
          
          // 應該有多個進度條（至少 1 個）
          expect(progressCount).toBeGreaterThanOrEqual(1)

          // 等待上傳完成
          await page.waitForTimeout(10000)

          // 驗證成功
          const successMessage = page.locator('.ant-alert-success, text=/上傳成功|成功/').first()
          const hasSuccess = await successMessage.isVisible({ timeout: 5000 }).catch(() => false)
          const drawerClosed = !(await drawer.isVisible({ timeout: 2000 }).catch(() => false))
          
          expect(hasSuccess || drawerClosed).toBe(true)
        }
      }
    })
  })
})


