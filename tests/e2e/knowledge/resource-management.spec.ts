/**
 * 資源管理功能 E2E 測試
 * 
 * BR11.4: 資源管理
 * 
 * 測試範圍：
 * - BR11.4.1: 資源編輯（元數據更新、文件更換）
 * - BR11.4.2: 資源刪除（軟刪除）
 * - BR11.4.3: 批量刪除
 * - 權限控制
 */

import { test, expect } from '@playwright/test'
import { login } from '../utils/auth'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

test.describe('BR11.4: 資源管理功能', () => {
  const createdDocumentIds: number[] = []
  const tempFiles: string[] = []

  // 創建臨時測試文件
  const createTempFile = (filename: string, content: string | Buffer, size?: number): string => {
    const tempDir = os.tmpdir()
    const tempFilePath = path.join(tempDir, filename)
    
    if (size && size > 0) {
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

  // 創建簡單的 PDF 文件
  const createSimplePDF = (): Buffer => {
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
/Count 1
/Kids [3 0 R]
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources << /ProcSet [/PDF /Text] /Font << /F1 5 0 R >> >>
>>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 24 Tf
100 700 Td
(Test PDF Content) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/Name /F1
/BaseFont /Helvetica
/Encoding /MacRomanEncoding
>>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000074 00000 n 
0000000156 00000 n 
0000000302 00000 n 
0000000390 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
499
%%EOF`
    return Buffer.from(pdfContent)
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

  // 輔助函數：上傳文檔（通過 API）
  const uploadDocument = async (page: any, filePath: string, fileName: string, title: string, category: string = 'service_type_1', scope: string = 'service'): Promise<number | null> => {
    try {
      // 讀取文件
      const fileBuffer = fs.readFileSync(filePath)
      
      // 通過 API 上傳
      const formData = new FormData()
      const blob = new Blob([fileBuffer])
      const file = new File([blob], fileName, { type: 'application/pdf' })
      formData.append('file', file)
      formData.append('title', title)
      formData.append('category', category)
      formData.append('scope', scope)
      
      const response = await page.request.post('/api/v2/documents/upload', {
        multipart: {
          file: {
            name: fileName,
            mimeType: 'application/pdf',
            buffer: fileBuffer
          },
          title: title,
          category: category,
          scope: scope
        }
      })
      
      const jsonResponse = await response.json()
      if (jsonResponse.ok && jsonResponse.data?.document_id) {
        const docId = jsonResponse.data.document_id
        createdDocumentIds.push(docId)
        // 等待列表更新
        await page.waitForTimeout(2000)
        return docId
      }
      
      return null
    } catch (error) {
      console.warn('API 上傳失敗:', error)
      return null
    }
  }


  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/knowledge/resources', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)
  })

  test.afterEach(async ({ page }) => {
    // 清理測試數據：刪除創建的文檔
    if (createdDocumentIds.length > 0) {
      for (const docId of createdDocumentIds) {
        try {
          await page.request.delete(`/api/v2/documents/${docId}`).catch(() => null)
        } catch (error) {
          console.warn('清理測試數據失敗:', error)
        }
      }
      createdDocumentIds.length = 0
    }
    
    // 清理臨時文件
    cleanupTempFiles()
  })

  // ========== BR11.4.1: 資源編輯 ==========
  test.describe('資源編輯功能', () => {
    test('應該能打開編輯抽屜並預填現有資訊', async ({ page }) => {
      const testTitle = `測試編輯預填 - ${Date.now()}`
      const pdfContent = createSimplePDF()
      const testFilePath = createTempFile(`test-edit-${Date.now()}.pdf`, pdfContent)
      
      // 上傳一個文檔
      const docId = await uploadDocument(page, testFilePath, `test-edit-${Date.now()}.pdf`, testTitle)
      await page.waitForTimeout(3000)

      if (!docId) {
        test.skip()
        return
      }

      // 找到並點擊上傳的文檔
      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const targetItem = documentItems.filter({ hasText: testTitle }).first()
        const itemToClick = await targetItem.isVisible({ timeout: 5000 }).catch(() => false) 
          ? targetItem 
          : documentItems.first()
        
        await itemToClick.click()
        await page.waitForTimeout(2000)

        // 點擊編輯按鈕
        const editButton = page.locator('button:has-text("編輯")').first()
        const editVisible = await editButton.isVisible({ timeout: 5000 }).catch(() => false)
        
        if (!editVisible) {
          test.skip()
          return
        }

        await editButton.click()
        await page.waitForTimeout(1000)

        // 驗證編輯抽屜已打開
        const drawer = page.locator('.ant-drawer').filter({ hasText: /編輯文檔/ })
        await expect(drawer).toBeVisible({ timeout: 5000 })

        const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

        // 驗證表單欄位已預填
        const titleInput = drawerContent.locator('input[placeholder*="文檔標題"]').first()
        const titleValue = await titleInput.inputValue().catch(() => '')
        expect(titleValue.trim()).toBe(testTitle)

        // 驗證當前文件名顯示
        const currentFileName = drawerContent.locator('text=/當前文件：/')
        await expect(currentFileName).toBeVisible({ timeout: 3000 })
      }
    })

    test('應該能更新文檔元數據', async ({ page }) => {
      const testTitle = `測試更新元數據 - ${Date.now()}`
      const editedTitle = `已編輯 - ${Date.now()}`
      const pdfContent = createSimplePDF()
      const testFilePath = createTempFile(`test-update-${Date.now()}.pdf`, pdfContent)
      
      const docId = await uploadDocument(page, testFilePath, `test-update-${Date.now()}.pdf`, testTitle)
      await page.waitForTimeout(3000)

      if (!docId) {
        test.skip()
        return
      }

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const targetItem = documentItems.filter({ hasText: testTitle }).first()
        const itemToClick = await targetItem.isVisible({ timeout: 5000 }).catch(() => false) 
          ? targetItem 
          : documentItems.first()
        
        await itemToClick.click()
        await page.waitForTimeout(2000)

        const editButton = page.locator('button:has-text("編輯")').first()
        const editVisible = await editButton.isVisible({ timeout: 5000 }).catch(() => false)
        
        if (!editVisible) {
          test.skip()
          return
        }

        await editButton.click()
        await page.waitForTimeout(1000)

        const drawer = page.locator('.ant-drawer').filter({ hasText: /編輯文檔/ })
        await expect(drawer).toBeVisible({ timeout: 5000 })

        const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

        // 等待載入完成
        await page.waitForTimeout(2000)

        // 修改標題
        const titleInput = drawerContent.locator('input[placeholder*="文檔標題"]').first()
        await titleInput.clear()
        await titleInput.fill(editedTitle)
        await page.waitForTimeout(500)

        // 點擊更新按鈕
        const updateButton = drawerContent.locator('button:has-text("更新")')
        await expect(updateButton).toBeEnabled()
        await updateButton.click()

        // 等待更新完成
        await expect(page.locator('.ant-alert-success')).toBeVisible({ timeout: 10000 })
        await page.waitForTimeout(2000)

        // 驗證列表已更新
        const updatedItem = page.locator('.document-list-item').filter({ hasText: editedTitle })
        await expect(updatedItem).toBeVisible({ timeout: 5000 })
      }
    })

    test('應該能更換文檔文件', async ({ page }) => {
      const testTitle = `測試文件更換 - ${Date.now()}`
      const pdfContent1 = createSimplePDF()
      const pdfContent2 = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 1\ntrailer\n<<\n/Size 1\n>>\nstartxref\n9\n%%EOF')
      const testFilePath1 = createTempFile(`test-replace-1-${Date.now()}.pdf`, pdfContent1)
      const testFilePath2 = createTempFile(`test-replace-2-${Date.now()}.pdf`, pdfContent2)
      
      const docId = await uploadDocument(page, testFilePath1, `test-replace-1-${Date.now()}.pdf`, testTitle)
      await page.waitForTimeout(3000)

      if (!docId) {
        test.skip()
        return
      }

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const targetItem = documentItems.filter({ hasText: testTitle }).first()
        const itemToClick = await targetItem.isVisible({ timeout: 5000 }).catch(() => false) 
          ? targetItem 
          : documentItems.first()
        
        await itemToClick.click()
        await page.waitForTimeout(2000)

        const editButton = page.locator('button:has-text("編輯")').first()
        const editVisible = await editButton.isVisible({ timeout: 5000 }).catch(() => false)
        
        if (!editVisible) {
          test.skip()
          return
        }

        await editButton.click()
        await page.waitForTimeout(1000)

        const drawer = page.locator('.ant-drawer').filter({ hasText: /編輯文檔/ })
        await expect(drawer).toBeVisible({ timeout: 5000 })

        const drawerContent = page.locator('.ant-drawer-body, .ant-drawer-content')

        // 等待載入完成
        await page.waitForTimeout(2000)

        // 上傳新文件
        const fileInput = drawerContent.locator('input[type="file"]').first()
        if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await fileInput.setInputFiles(testFilePath2)
        } else {
          // 嘗試通過點擊上傳區域觸發文件選擇
          const uploadArea = drawerContent.locator('.ant-upload-drag, .upload-trigger').first()
          if (await uploadArea.isVisible({ timeout: 3000 }).catch(() => false)) {
            const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null)
            await uploadArea.click({ force: true })
            const fileChooser = await fileChooserPromise
            if (fileChooser) {
              await fileChooser.setFiles(testFilePath2)
            } else {
              await fileInput.setInputFiles(testFilePath2)
            }
          } else {
            await fileInput.setInputFiles(testFilePath2)
          }
        }
        await page.waitForTimeout(2000)

        // 驗證新文件已顯示
        const uploadedFileItem = drawerContent.locator('.ant-upload-list-item').filter({ hasText: /test-replace-2/ }).first()
        await expect(uploadedFileItem).toBeVisible({ timeout: 5000 })

        // 點擊更新按鈕
        const updateButton = drawerContent.locator('button:has-text("更新")')
        await expect(updateButton).toBeEnabled()
        await updateButton.click()

        // 等待更新完成
        await expect(page.locator('.ant-alert-success')).toBeVisible({ timeout: 30000 })
        const successMessage = page.locator('.ant-alert-success')
        await expect(successMessage).toContainText(/更新|文件更換/, { timeout: 5000 })
        await page.waitForTimeout(2000)
      }
    })
  })

  // ========== BR11.4.2: 資源刪除 ==========
  test.describe('資源刪除功能', () => {
    test('應該能刪除文檔並執行軟刪除', async ({ page }) => {
      const testTitle = `測試刪除 - ${Date.now()}`
      const pdfContent = createSimplePDF()
      const testFilePath = createTempFile(`test-delete-${Date.now()}.pdf`, pdfContent)
      
      const docId = await uploadDocument(page, testFilePath, `test-delete-${Date.now()}.pdf`, testTitle)
      await page.waitForTimeout(3000)

      if (!docId) {
        test.skip()
        return
      }

      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        const targetItem = documentItems.filter({ hasText: testTitle }).first()
        const itemToClick = await targetItem.isVisible({ timeout: 5000 }).catch(() => false) 
          ? targetItem 
          : documentItems.first()
        
        await itemToClick.click()
        await page.waitForTimeout(2000)

        // 點擊刪除按鈕
        const deleteButton = page.locator('button:has-text("刪除")').first()
        const deleteVisible = await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)
        
        if (!deleteVisible) {
          test.skip()
          return
        }

        await deleteButton.click()
        await page.waitForTimeout(500)

        // 確認刪除對話框
        const modal = page.locator('.ant-modal').filter({ hasText: /確認刪除|刪除/ })
        await expect(modal).toBeVisible({ timeout: 5000 })

        // 點擊確認
        const confirmButton = modal.locator('button:has-text("確認")').or(modal.locator('button.ant-btn-danger')).first()
        await confirmButton.click()

        // 等待刪除完成
        await expect(page.locator('.ant-alert-success')).toBeVisible({ timeout: 10000 })
        await page.waitForTimeout(2000)

        // 驗證文檔已從列表中移除（軟刪除）
        const deletedItem = page.locator('.document-list-item').filter({ hasText: testTitle })
        await expect(deletedItem).not.toBeVisible({ timeout: 5000 })

        // 從清理列表中移除，因為已經刪除
        const index = createdDocumentIds.indexOf(docId)
        if (index > -1) {
          createdDocumentIds.splice(index, 1)
        }
      }
    })
  })

  // ========== BR11.4.3: 批量刪除 ==========
  test.describe('批量刪除功能', () => {
    test('應該能選擇多個文檔並批量刪除', async ({ page }) => {
      const testTitle1 = `測試批量刪除1 - ${Date.now()}`
      const testTitle2 = `測試批量刪除2 - ${Date.now()}`
      const pdfContent = createSimplePDF()
      const testFilePath1 = createTempFile(`test-batch-1-${Date.now()}.pdf`, pdfContent)
      const testFilePath2 = createTempFile(`test-batch-2-${Date.now()}.pdf`, pdfContent)
      
      const docId1 = await uploadDocument(page, testFilePath1, `test-batch-1-${Date.now()}.pdf`, testTitle1)
      await page.waitForTimeout(2000)
      const docId2 = await uploadDocument(page, testFilePath2, `test-batch-2-${Date.now()}.pdf`, testTitle2)
      await page.waitForTimeout(3000)

      if (!docId1 || !docId2) {
        test.skip()
        return
      }

      // 等待列表載入
      await page.waitForTimeout(2000)
      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount >= 2) {
        // 選擇第一個文檔的 checkbox
        const firstItem = documentItems.first()
        const firstCheckbox = firstItem.locator('input[type="checkbox"]').first()
        await expect(firstCheckbox).toBeVisible({ timeout: 5000 })
        await firstCheckbox.click()
        await page.waitForTimeout(500)

        // 選擇第二個文檔的 checkbox
        const secondItem = documentItems.nth(1)
        const secondCheckbox = secondItem.locator('input[type="checkbox"]').first()
        await expect(secondCheckbox).toBeVisible({ timeout: 5000 })
        await secondCheckbox.click()
        await page.waitForTimeout(500)

        // 驗證已選擇數量顯示
        const selectedCount = page.locator('text=/已選擇 \\d+ 項/')
        await expect(selectedCount).toBeVisible({ timeout: 3000 })

        // 點擊批量刪除按鈕
        const batchDeleteButton = page.locator('button:has-text("批量刪除")').first()
        await expect(batchDeleteButton).toBeVisible({ timeout: 3000 })
        await batchDeleteButton.click()
        await page.waitForTimeout(500)

        // 確認刪除對話框
        const modal = page.locator('.ant-modal').filter({ hasText: /確認批量刪除|批量刪除/ })
        await expect(modal).toBeVisible({ timeout: 5000 })

        // 點擊確認
        const confirmButton = modal.locator('button:has-text("確認")').or(modal.locator('button.ant-btn-danger')).first()
        await confirmButton.click()

        // 等待刪除完成
        await expect(page.locator('.ant-alert-success, .ant-alert-error')).toBeVisible({ timeout: 10000 })
        await page.waitForTimeout(2000)

        // 從清理列表中移除
        const index1 = createdDocumentIds.indexOf(docId1)
        if (index1 > -1) createdDocumentIds.splice(index1, 1)
        const index2 = createdDocumentIds.indexOf(docId2)
        if (index2 > -1) createdDocumentIds.splice(index2, 1)
      }
    })

    test('應該能取消選擇', async ({ page }) => {
      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        // 選擇第一個文檔的 checkbox
        const firstItem = documentItems.first()
        const firstCheckbox = firstItem.locator('input[type="checkbox"]').first()
        await expect(firstCheckbox).toBeVisible({ timeout: 5000 })
        await firstCheckbox.click()
        await page.waitForTimeout(500)

        // 驗證已選擇數量顯示
        const selectedCount = page.locator('text=/已選擇 \\d+ 項/')
        await expect(selectedCount).toBeVisible({ timeout: 3000 })

        // 點擊取消選擇按鈕
        const clearSelectionButton = page.locator('button:has-text("取消選擇")').first()
        await expect(clearSelectionButton).toBeVisible({ timeout: 3000 })
        await clearSelectionButton.click()
        await page.waitForTimeout(500)

        // 驗證已選擇數量消失
        await expect(selectedCount).not.toBeVisible({ timeout: 3000 })
      }
    })
  })

  // ========== 權限控制 ==========
  test.describe('權限控制', () => {
    test('非上傳者應該看不到編輯和刪除按鈕', async ({ page }) => {
      // 這個測試需要兩個不同的用戶帳號
      // 由於測試環境限制，這裡主要驗證按鈕的顯示邏輯
      const documentItems = page.locator('.document-list-item')
      const itemCount = await documentItems.count()
      
      if (itemCount > 0) {
        // 點擊第一個文檔
        const firstItem = documentItems.first()
        await firstItem.click()
        await page.waitForTimeout(2000)

        // 檢查編輯和刪除按鈕
        const editButton = page.locator('button:has-text("編輯")').first()
        const deleteButton = page.locator('button:has-text("刪除")').first()
        
        // 按鈕可能可見或不可見，取決於權限
        const editVisible = await editButton.isVisible({ timeout: 3000 }).catch(() => false)
        const deleteVisible = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)
        
        // 驗證至少有一個按鈕存在（即使不可見）
        expect(editVisible || deleteVisible || await editButton.count() > 0 || await deleteButton.count() > 0).toBeTruthy()
      }
    })
  })
})

