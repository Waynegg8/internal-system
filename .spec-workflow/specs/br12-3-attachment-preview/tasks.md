# Tasks Document: BR12.3: 附件預覽

## 三方差異分析結果

### 已實現功能

1. **附件預覽組件基本功能** ✅ 已實現
   - `AttachmentPreview.vue` - 基本預覽功能已實現（第1-267行）
   - 文件類型判斷（圖片、PDF、文本、其他，第75-104行）
   - 圖片預覽（基本顯示，第10-12行）
   - PDF 預覽（使用 PdfViewer 組件，第5-7行）
   - 文本文件預覽（基本顯示，第15-19行）
   - 其他類型文件處理（文件信息和下載按鈕，第22-35行）
   - 預覽載入狀態和錯誤處理（第37-43行）
   - Blob URL 內存管理（組件卸載時清理，第237-243行）
   - ⚠️ 注意：圖片預覽沒有縮放控制（放大、縮小、重置按鈕）
   - ⚠️ 注意：圖片預覽沒有拖動查看功能
   - ⚠️ 注意：文本文件沒有大小檢查（超過 5MB 顯示警告）
   - ⚠️ 注意：沒有響應式布局（移動端全屏預覽模式）

2. **PdfViewer 組件** ✅ 已實現
   - `src/components/shared/PdfViewer.vue` - PDF 預覽功能已實現
   - 支持翻頁、縮放、頁碼顯示和錯誤處理

3. **附件下載 API** ✅ 已實現
   - `src/stores/knowledge.js` - `downloadAttachment` 函數已實現
   - 支持錯誤處理和載入狀態管理

### 未實現或部分實現功能

1. **文件類型判斷工具函數** ❌ 未實現
   - `src/utils/fileTypeUtils.js` - 未找到
   - 需要創建統一的文件類型判斷和圖標選擇工具函數

2. **圖片縮放功能** ❌ 未實現
   - `AttachmentPreview.vue` 沒有圖片縮放控制（放大、縮小、重置按鈕）
   - 沒有圖片拖動查看功能

3. **文本文件大小檢查** ❌ 未實現
   - `AttachmentPreview.vue` 沒有文本文件大小檢查（超過 5MB 顯示警告）

4. **響應式布局** ❌ 未實現
   - `AttachmentPreview.vue` 沒有移動端全屏預覽模式

5. **單元測試和整合測試** ❌ 未實現
   - `tests/components/AttachmentPreview.test.js` - 未找到
   - `tests/utils/fileTypeUtils.test.js` - 未找到
   - `tests/integration/attachmentPreview.test.js` - 未找到

---

## 1. 工具函數實現

### 1.1 文件類型判斷工具函數

- [ ] 1.1.1 創建文件類型判斷工具函數 ❌ 未實現
  - File: src/utils/fileTypeUtils.js
  - 實現文件類型判斷邏輯（根據文件擴展名和 MIME 類型判斷為圖片、PDF、文本、其他）
  - 實現文件類型圖標選擇邏輯（根據文件類型返回對應的 Ant Design Icon）
  - 支持所有文件類型：
    - 圖片：`.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.svg`
    - PDF：`.pdf`
    - 文本：`.txt`, `.md`, `.json`, `.xml`, `.csv`, `.log`
    - 其他：其他所有類型
  - _Leverage: @/utils/constants_
  - _Requirements: BR12.3.1, BR12.3.2, BR12.3.3, BR12.3.4_
  - _Status: 待實現（現有 `AttachmentPreview.vue` 中有內聯的文件類型判斷邏輯，需要提取為工具函數）_

---

## 2. 前端組件實現

### 2.1 附件預覽組件增強

- [ ] 2.1.1 增強附件預覽組件圖片縮放功能 ❌ 未實現
  - File: src/components/knowledge/AttachmentPreview.vue
  - 實現圖片縮放控制（放大、縮小、重置按鈕）
  - 實現圖片拖動查看功能（當圖片放大超出視窗時）
  - 保持圖片原始比例
  - _Leverage: Vue 3 Composition API, CSS transforms_
  - _Requirements: BR12.3.1_
  - _Status: 待實現（現有組件只有基本圖片顯示，沒有縮放和拖動功能）_

- [ ] 2.1.2 增強附件預覽組件文本文件處理 ❌ 未實現
  - File: src/components/knowledge/AttachmentPreview.vue
  - 實現文本文件大小檢查（超過 5MB 顯示警告並建議下載）
  - 優化文本顯示性能（大文件處理）
  - _Leverage: File size checking, performance optimization_
  - _Requirements: BR12.3.3_
  - _Status: 待實現（現有組件沒有文本文件大小檢查）_

- [ ] 2.1.3 增強附件預覽組件響應式布局 ❌ 未實現
  - File: src/components/knowledge/AttachmentPreview.vue
  - 實現移動端全屏預覽模式
  - 優化不同屏幕尺寸的布局
  - _Leverage: CSS media queries, responsive design_
  - _Requirements: BR12.3.5_
  - _Status: 待實現（現有組件沒有響應式布局支持）_

### 2.2 PdfViewer 組件

- [x] 2.2.1 驗證 PdfViewer 組件功能 ✅ 已實現
  - File: src/components/shared/PdfViewer.vue
  - 驗證 PDF 翻頁功能（上一頁、下一頁按鈕）- 已實現
  - 驗證 PDF 縮放功能（放大、縮小按鈕）- 已實現
  - 驗證頁碼顯示（當前頁碼和總頁數）- 已實現
  - 驗證 PDF 載入錯誤處理 - 已實現
  - _Leverage: PDF.js_
  - _Requirements: BR12.3.2_
  - _Status: 已完成_

### 2.3 附件下載 API

- [x] 2.3.1 驗證附件下載 API 功能 ✅ 已實現
  - File: src/stores/knowledge.js
  - 驗證附件下載函數（返回 Blob 數據）- 已實現
  - 驗證錯誤處理（網絡錯誤、404、403、500 等）- 已實現
  - 驗證載入狀態管理 - 已實現
  - _Leverage: 現有的 knowledge store_
  - _Requirements: BR12.3.1, BR12.3.2, BR12.3.3_
  - _Status: 已完成_

### 2.4 附件預覽組件基本功能

- [x] 2.4.1 驗證附件預覽組件基本功能 ✅ 已實現
  - File: src/components/knowledge/AttachmentPreview.vue
  - 驗證文件類型判斷邏輯 - 已實現（第75-104行）
  - 驗證圖片預覽功能（基本顯示）- 已實現（第10-12行）
  - 驗證 PDF 預覽功能（使用 PdfViewer 組件）- 已實現（第5-7行）
  - 驗證文本文件預覽功能（基本顯示）- 已實現（第15-19行）
  - 驗證其他類型文件處理（文件信息和下載按鈕）- 已實現（第22-35行）
  - 驗證預覽載入狀態和錯誤處理 - 已實現（第37-43行）
  - 驗證基本響應式布局 - 部分實現（基本布局，但沒有移動端全屏預覽模式）
  - _Leverage: 現有的 AttachmentPreview 組件_
  - _Requirements: BR12.3.1, BR12.3.2, BR12.3.3, BR12.3.4, BR12.3.5_
  - _Status: 已完成（基本功能已實現，但缺少圖片縮放、拖動、文本文件大小檢查、響應式布局）_

---

## 3. 測試

### 3.1 單元測試

- [ ] 3.1.1 創建附件預覽組件單元測試 ❌ 未實現
  - File: tests/components/AttachmentPreview.test.js
  - 測試文件類型判斷邏輯
  - 測試不同文件類型的預覽渲染
  - 測試載入狀態顯示
  - 測試錯誤狀態處理（各種錯誤場景）
  - 測試響應式布局
  - _Leverage: Vitest, Vue Test Utils, 測試工具函數_
  - _Requirements: All_
  - _Status: 待實現_

- [ ] 3.1.2 創建文件類型工具函數單元測試 ❌ 未實現
  - File: tests/utils/fileTypeUtils.test.js
  - 測試各種文件擴展名的類型判斷
  - 測試 MIME 類型的類型判斷
  - 測試文件類型圖標選擇
  - 測試邊界情況（空值、無效格式等）
  - _Leverage: Vitest, 測試工具函數_
  - _Requirements: BR12.3.1, BR12.3.2, BR12.3.3, BR12.3.4_
  - _Status: 待實現_

### 3.2 整合測試

- [ ] 3.2.1 創建附件預覽整合測試 ❌ 未實現
  - File: tests/integration/attachmentPreview.test.js
  - 測試完整預覽流程（選擇附件 → 載入 → 顯示）
  - 測試不同類型文件的預覽
  - 測試錯誤處理流程
  - 測試 API 集成
  - _Leverage: Playwright 或類似 E2E 測試框架_
  - _Requirements: All_
  - _Status: 待實現_

---

## 總結

### 已完成功能
- ✅ 附件預覽組件基本功能（完整實現 - 文件類型判斷、圖片/PDF/文本/其他文件預覽、預覽載入狀態和錯誤處理、Blob URL 內存管理）
- ✅ PdfViewer 組件（完整實現 - 支持翻頁、縮放、頁碼顯示和錯誤處理）
- ✅ 附件下載 API（完整實現 - 支持錯誤處理和載入狀態管理）

### 待完成功能
- ❌ 文件類型判斷工具函數（未實現 - 需要創建 `src/utils/fileTypeUtils.js`，提取現有內聯的文件類型判斷邏輯）
- ❌ 圖片縮放功能（未實現 - 需要實現圖片縮放控制（放大、縮小、重置按鈕）和圖片拖動查看功能）
- ❌ 文本文件大小檢查（未實現 - 需要實現文本文件大小檢查（超過 5MB 顯示警告並建議下載））
- ❌ 響應式布局（未實現 - 需要實現移動端全屏預覽模式和優化不同屏幕尺寸的布局）
- ❌ 單元測試和整合測試（未實現 - 需要建立完整的測試套件）

### 備註
- 部分核心功能已實現，包括：
  - 附件預覽組件：文件類型判斷、圖片/PDF/文本/其他文件預覽、預覽載入狀態和錯誤處理、Blob URL 內存管理
  - PdfViewer 組件：支持翻頁、縮放、頁碼顯示和錯誤處理
  - 附件下載 API：支持錯誤處理和載入狀態管理
- 待補完功能：
  - 文件類型判斷工具函數：需要創建 `src/utils/fileTypeUtils.js`，提取現有內聯的文件類型判斷邏輯為可重用的工具函數
  - 圖片縮放功能：需要實現圖片縮放控制（放大、縮小、重置按鈕）和圖片拖動查看功能（當圖片放大超出視窗時）
  - 文本文件大小檢查：需要實現文本文件大小檢查（超過 5MB 顯示警告並建議下載），優化文本顯示性能（大文件處理）
  - 響應式布局：需要實現移動端全屏預覽模式和優化不同屏幕尺寸的布局
  - 單元測試和整合測試：需要建立完整的測試套件，包括組件單元測試、工具函數單元測試和整合測試
