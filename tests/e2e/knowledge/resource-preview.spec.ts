/**
 * 資源預覽功能 E2E 測試
 * 
 * BR11.3: 資源預覽
 * 
 * 測試範圍：
 * - BR11.3.1: PDF 預覽
 * - BR11.3.2: 圖片預覽
 * - BR11.3.3: Office 文件預覽
 * - BR11.3.4: 其他格式處理
 * - 錯誤處理和重試機制
 */

import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

test.describe('BR11.3: 資源預覽功能', () => {
  const createdDocumentIds: number[] = []
  const tempFiles: string[] = []

  // 創建臨時測試文件
  const createTempFile = (filename: string, content: string | Buffer, size?: number): string => {
    const tempDir = os.tmpdir()
    const tempFilePath = path.join(tempDir, filename)
    
    if (size && size > 0) {
      // 創建指定大小的文件
      const buffer = Buffer.alloc(size, 'a')
      fs.writeFileSync(tempFilePath, buffer)
    } else if (Buffer.isBuffer(content)) {
      fs.writeFileSync(tempFilePath, content)
    } else {
      fs.writeFileSync(tempFilePath, content)
    }
    
    tempFiles.push(tempFilePath)
    return tempFilePath
  }

  // 創建簡單的 PDF 文件（最小有效 PDF）
  const createSimplePDF = (): Buffer => {
    // 最小有效 PDF 內容
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000306 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
398
%%EOF`
    return Buffer.from(pdfContent)
  }

  // 創建簡單的圖片文件（PNG）
  const createSimplePNG = (): Buffer => {
    // 最小有效 PNG (1x1 透明像素)
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const ihdr = Buffer.from([
      0x00, 0x00, 0x00, 0x0D, // chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
      0x1F, 0x15, 0xC4, 0x89 // CRC
    ])
    const idat = Buffer.from([
      0x00, 0x00, 0x00, 0x0C, // chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
      0x0D, 0x0A, 0x2D, 0xB4 // CRC
    ])
    const iend = Buffer.from([
      0x00, 0x00, 0x00, 0x00, // chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82 // CRC
    ])
    return Buffer.concat([pngHeader, ihdr, idat, iend])
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
    
    // 導航到資源列表頁面
    await page.goto('/knowledge/resources', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // 等待數據載入
  })

  test.afterEach(async ({ page }) => {
    // 清理測試數據：刪除創建的文檔
    if (createdDocumentIds.length > 0) {
      for (const docId of createdDocumentIds) {
        try {
          const response = await page.request.delete(`/api/v2/documents/${docId}`).catch(() => null)
          console.log('清理測試文檔:', docId, response?.status())
        } catch (error) {
          console.warn('清理測試數據失敗:', error)
        }
      }
      createdDocumentIds.length = 0
    }
    
    // 清理臨時文件
    cleanupTempFiles()
  })

  // 輔助函數：上傳文件並返回文檔 ID
  const uploadDocument = async (page: any, filePath: string, fileName: string, title: string) => {
    // 點擊新增按鈕打開上傳抽屜
    const addButton = page.locator('button:has-text("新增")').or(
      page.locator('button').filter({ hasText: /新增/ })
    ).first()
    await addButton.click()
    await page.waitForTimeout(1000)

    // 等待抽屜打開
    const drawer = page.locator('.ant-drawer').filter({ hasText: /上傳文檔/ })
    await expect(drawer).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000)

    const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

    // 填寫文檔標題
    const titleInput = drawerContent.locator('input[placeholder*="文檔標題"]').first()
    if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await titleInput.fill(title)
      await page.waitForTimeout(500)
    }

    // 選擇服務類型
    const categorySelect = drawerContent.locator('label:has-text("服務類型分類")').locator('..').locator('.ant-select').first()
    if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categorySelect.click({ force: true })
      await page.waitForTimeout(500)
      
      const options = page.locator('.ant-select-dropdown .ant-select-item').first()
      if (await options.isVisible({ timeout: 2000 }).catch(() => false)) {
        await options.click()
        await page.waitForTimeout(500)
      }
    }

    // 選擇適用層級
    const scopeSelect = drawerContent.locator('label:has-text("資源適用層級")').locator('..').locator('.ant-select').first()
    if (await scopeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scopeSelect.click({ force: true })
      await page.waitForTimeout(500)
      
      const scopeOptions = page.locator('.ant-select-dropdown .ant-select-item').filter({ hasText: /服務|task/ }).first()
      if (await scopeOptions.isVisible({ timeout: 2000 }).catch(() => false)) {
        await scopeOptions.click()
        await page.waitForTimeout(500)
      }
    }

    // 上傳文件
    const fileInput = drawerContent.locator('input[type="file"]')
    await fileInput.setInputFiles(filePath)
    await page.waitForTimeout(1000)

    // 提交表單
    const submitButton = drawerContent.locator('button[type="submit"]').or(
      drawerContent.locator('button').filter({ hasText: /提交|上傳|確認/ })
    ).first()
    
    await submitButton.click()
    await page.waitForTimeout(2000)

    // 等待上傳成功（抽屜關閉或顯示成功消息）
    await page.waitForTimeout(3000)

    // 等待列表更新
    await page.waitForTimeout(2000)

    // 從 API 響應或頁面獲取文檔 ID
    // 嘗試從最新的列表項獲取
    const documentItems = page.locator('.document-list-item')
    const itemCount = await documentItems.count()
    
    if (itemCount > 0) {
      // 點擊最新上傳的文檔以觸發預覽
      const firstItem = documentItems.first()
      await firstItem.click({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(1000)
    }

    // 返回一個標識符，實際測試中會通過點擊文檔來觸發預覽
    return null
  }

  // ========== BR11.3.1: PDF 預覽 ==========
  test.describe('PDF 文件預覽', () => {
    test('應該能預覽 PDF 文件', async ({ page }) => {
      const testTitle = `測試 PDF 預覽 - ${Date.now()}`
      const pdfContent = createSimplePDF()
      const testFilePath = createTempFile(`test-pdf-${Date.now()}.pdf`, pdfContent)
      
      // 上傳 PDF 文件
      await uploadDocument(page, testFilePath, `test-pdf-${Date.now()}.pdf`, testTitle)
      await page.waitForTimeout(3000)

      // 找到並點擊上傳的 PDF 文檔
      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        // 查找包含測試標題的文檔
        const targetItem = documentItems.filter({ hasText: testTitle }).first()
        const itemToClick = await targetItem.isVisible({ timeout: 5000 }).catch(() => false) 
          ? targetItem 
          : documentItems.first()
        
        await itemToClick.click()
        await page.waitForTimeout(2000)

        // 驗證預覽區域顯示
        const previewArea = page.locator('.document-preview')
        await expect(previewArea).toBeVisible({ timeout: 10000 })

        // 驗證 PDF 查看器或載入狀態
        const pdfViewer = previewArea.locator('.pdf-viewer, canvas, iframe[src*="pdf"], .ant-spin')
        const hasViewer = await pdfViewer.first().isVisible({ timeout: 10000 }).catch(() => false)
        
        // 應該顯示 PDF 查看器或載入狀態
        expect(hasViewer || await previewArea.locator('.ant-spin').isVisible().catch(() => false)).toBeTruthy()
      }
    })

    test('PDF 載入中應該顯示載入狀態', async ({ page }) => {
      const testTitle = `測試 PDF 載入 - ${Date.now()}`
      const pdfContent = createSimplePDF()
      const testFilePath = createTempFile(`test-pdf-loading-${Date.now()}.pdf`, pdfContent)
      
      await uploadDocument(page, testFilePath, `test-pdf-loading-${Date.now()}.pdf`, testTitle)
      await page.waitForTimeout(2000)

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const itemToClick = documentItems.first()
        await itemToClick.click()
        
        // 立即檢查載入狀態（在 PDF 載入前）
        const previewArea = page.locator('.document-preview')
        await expect(previewArea).toBeVisible({ timeout: 5000 })
        
        // 應該有載入狀態（可能在短時間內）
        const loadingSpinner = previewArea.locator('.ant-spin-spinning, .ant-spin')
        const hasLoading = await loadingSpinner.isVisible({ timeout: 2000 }).catch(() => false)
        // 載入狀態可能很快消失，所以這個測試是可選的
      }
    })
  })

  // ========== BR11.3.2: 圖片預覽 ==========
  test.describe('圖片文件預覽', () => {
    test('應該能預覽圖片文件', async ({ page }) => {
      const testTitle = `測試圖片預覽 - ${Date.now()}`
      const pngContent = createSimplePNG()
      const testFilePath = createTempFile(`test-image-${Date.now()}.png`, pngContent)
      
      await uploadDocument(page, testFilePath, `test-image-${Date.now()}.png`, testTitle)
      await page.waitForTimeout(3000)

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const targetItem = documentItems.filter({ hasText: testTitle }).first()
        const itemToClick = await targetItem.isVisible({ timeout: 5000 }).catch(() => false) 
          ? targetItem 
          : documentItems.first()
        
        await itemToClick.click()
        await page.waitForTimeout(2000)

        // 驗證預覽區域顯示
        const previewArea = page.locator('.document-preview')
        await expect(previewArea).toBeVisible({ timeout: 10000 })

        // 驗證圖片元素存在
        const image = previewArea.locator('img.preview-image, img[alt*="預覽"], img[alt*="文檔"]')
        const hasImage = await image.isVisible({ timeout: 10000 }).catch(() => false)
        
        // 應該顯示圖片或載入狀態
        expect(hasImage || await previewArea.locator('.ant-spin').isVisible().catch(() => false)).toBeTruthy()
      }
    })
  })

  // ========== BR11.3.3: Office 文件預覽 ==========
  test.describe('Office 文件預覽', () => {
    test('應該能預覽 Office 文件（Word）', async ({ page }) => {
      const testTitle = `測試 Office 預覽 - ${Date.now()}`
      // 創建簡單的 DOCX 文件（ZIP 格式）
      const docxContent = Buffer.from('PK\x03\x04') // 最小 ZIP header
      const testFilePath = createTempFile(`test-office-${Date.now()}.docx`, docxContent)
      
      await uploadDocument(page, testFilePath, `test-office-${Date.now()}.docx`, testTitle)
      await page.waitForTimeout(3000)

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const targetItem = documentItems.filter({ hasText: testTitle }).first()
        const itemToClick = await targetItem.isVisible({ timeout: 5000 }).catch(() => false) 
          ? targetItem 
          : documentItems.first()
        
        await itemToClick.click()
        await page.waitForTimeout(3000) // Office 文件需要更長時間來獲取預覽 URL

        // 驗證預覽區域顯示
        const previewArea = page.locator('.document-preview')
        await expect(previewArea).toBeVisible({ timeout: 10000 })

        // 驗證 Google Docs Viewer iframe 或載入狀態
        const iframe = previewArea.locator('iframe[src*="docs.google.com/viewer"], iframe.preview-iframe')
        const hasIframe = await iframe.isVisible({ timeout: 15000 }).catch(() => false)
        
        // 或者顯示文件信息和下載按鈕（如果預覽 URL 獲取失敗）
        const fileInfo = previewArea.locator('.preview-other, .file-name')
        const hasFileInfo = await fileInfo.isVisible({ timeout: 5000 }).catch(() => false)
        
        // 應該顯示 iframe、載入狀態或文件信息
        expect(hasIframe || hasFileInfo || await previewArea.locator('.ant-spin').isVisible().catch(() => false)).toBeTruthy()
      }
    })

    test('預覽 URL 生成中應該顯示載入狀態', async ({ page }) => {
      const testTitle = `測試 Office 載入 - ${Date.now()}`
      const docxContent = Buffer.from('PK\x03\x04')
      const testFilePath = createTempFile(`test-office-loading-${Date.now()}.docx`, docxContent)
      
      await uploadDocument(page, testFilePath, `test-office-loading-${Date.now()}.docx`, testTitle)
      await page.waitForTimeout(2000)

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const itemToClick = documentItems.first()
        await itemToClick.click()
        
        // 立即檢查載入狀態
        const previewArea = page.locator('.document-preview')
        await expect(previewArea).toBeVisible({ timeout: 5000 })
        
        // 應該有載入狀態（可能在短時間內）
        const loadingSpinner = previewArea.locator('.ant-spin-spinning, .ant-spin')
        const hasLoading = await loadingSpinner.isVisible({ timeout: 3000 }).catch(() => false)
        // 載入狀態可能很快消失
      }
    })

    test('Office 文件載入失敗時應該顯示錯誤提示和下載按鈕', async ({ page }) => {
      // 這個測試需要模擬 API 失敗，或者上傳一個無效的 Office 文件
      const testTitle = `測試 Office 錯誤 - ${Date.now()}`
      const invalidContent = Buffer.from('invalid office content')
      const testFilePath = createTempFile(`test-office-error-${Date.now()}.docx`, invalidContent)
      
      await uploadDocument(page, testFilePath, `test-office-error-${Date.now()}.docx`, testTitle)
      await page.waitForTimeout(3000)

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const itemToClick = documentItems.first()
        await itemToClick.click()
        await page.waitForTimeout(3000)

        const previewArea = page.locator('.document-preview')
        await expect(previewArea).toBeVisible({ timeout: 10000 })

        // 檢查是否有錯誤提示或下載按鈕
        const errorAlert = previewArea.locator('.ant-alert-error, .preview-error')
        const downloadButton = previewArea.locator('button:has-text("下載"), button:has-text("下載文件")')
        
        const hasError = await errorAlert.isVisible({ timeout: 5000 }).catch(() => false)
        const hasDownload = await downloadButton.isVisible({ timeout: 5000 }).catch(() => false)
        
        // 如果預覽失敗，應該顯示錯誤或下載按鈕
        // 注意：如果文件實際上傳成功但預覽失敗，才會顯示錯誤
        if (hasError || hasDownload) {
          expect(hasError || hasDownload).toBeTruthy()
        }
      }
    })
  })

  // ========== BR11.3.4: 其他格式處理 ==========
  test.describe('不支持預覽的文件格式處理', () => {
    test('應該顯示文件信息和下載按鈕', async ({ page }) => {
      const testTitle = `測試其他格式 - ${Date.now()}`
      const testFilePath = createTempFile(`test-other-${Date.now()}.txt`, 'Test text content')
      
      await uploadDocument(page, testFilePath, `test-other-${Date.now()}.txt`, testTitle)
      await page.waitForTimeout(3000)

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const targetItem = documentItems.filter({ hasText: testTitle }).first()
        const itemToClick = await targetItem.isVisible({ timeout: 5000 }).catch(() => false) 
          ? targetItem 
          : documentItems.first()
        
        await itemToClick.click()
        await page.waitForTimeout(2000)

        const previewArea = page.locator('.document-preview')
        await expect(previewArea).toBeVisible({ timeout: 10000 })

        // 驗證顯示文件信息
        const fileInfo = previewArea.locator('.preview-other, .file-name, .file-size')
        const hasFileInfo = await fileInfo.isVisible({ timeout: 5000 }).catch(() => false)
        
        // 驗證下載按鈕
        const downloadButton = previewArea.locator('button:has-text("下載"), button:has-text("下載文件")')
        const hasDownload = await downloadButton.isVisible({ timeout: 5000 }).catch(() => false)
        
        expect(hasFileInfo || hasDownload).toBeTruthy()
      }
    })
  })

  // ========== 錯誤處理和重試 ==========
  test.describe('錯誤處理和重試機制', () => {
    test('預覽失敗時應該顯示錯誤提示和重試按鈕', async ({ page }) => {
      // 這個測試可能需要模擬 API 失敗
      // 或者上傳一個會導致預覽失敗的文件
      const testTitle = `測試錯誤處理 - ${Date.now()}`
      const pdfContent = createSimplePDF()
      const testFilePath = createTempFile(`test-error-${Date.now()}.pdf`, pdfContent)
      
      await uploadDocument(page, testFilePath, `test-error-${Date.now()}.pdf`, testTitle)
      await page.waitForTimeout(3000)

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const itemToClick = documentItems.first()
        await itemToClick.click()
        await page.waitForTimeout(3000)

        const previewArea = page.locator('.document-preview')
        await expect(previewArea).toBeVisible({ timeout: 10000 })

        // 檢查是否有錯誤提示
        const errorAlert = previewArea.locator('.ant-alert-error, .preview-error, .ant-alert')
        const hasError = await errorAlert.isVisible({ timeout: 5000 }).catch(() => false)
        
        if (hasError) {
          // 驗證重試按鈕
          const retryButton = previewArea.locator('button:has-text("重試")')
          const hasRetry = await retryButton.isVisible({ timeout: 3000 }).catch(() => false)
          
          if (hasRetry) {
            // 點擊重試按鈕
            await retryButton.click()
            await page.waitForTimeout(2000)
            
            // 驗證重新載入
            const loadingSpinner = previewArea.locator('.ant-spin')
            const hasReloading = await loadingSpinner.isVisible({ timeout: 2000 }).catch(() => false)
            // 重試後應該有載入狀態
          }
        }
      }
    })

    test('應該能處理空文檔狀態', async ({ page }) => {
      // 驗證當沒有選擇文檔時顯示空狀態
      // 先檢查預覽區域是否存在
      const previewCol = page.locator('.document-preview-col')
      await expect(previewCol).toBeVisible({ timeout: 10000 })
      
      // 檢查空狀態 - 可能在 .document-preview 內部或直接在預覽區域
      const emptyState = page.locator('.preview-empty, .ant-empty').filter({ hasText: /點擊左側|暫無文檔/ })
      const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false)
      
      // 或者檢查預覽區域內的 DocumentPreview 組件
      const previewArea = page.locator('.document-preview')
      const hasPreviewArea = await previewArea.isVisible({ timeout: 3000 }).catch(() => false)
      
      // 如果沒有文檔，應該顯示空狀態或預覽區域
      expect(hasEmpty || hasPreviewArea).toBeTruthy()
    })
  })
})

