# Tasks Document: BR3.1: 收據列表

- [x] 1.1. 驗證收據列表 API Handler - 修正參數名稱並實現所有篩選功能
  - File: backend/src/handlers/receipts/receipt-crud.js
  - Function: handleGetReceipts
  - 已完成：修正 page_size 參數名稱，實現客戶篩選 (client_id)，實現月份/年度篩選 (billing_month, billing_year)，實現逾期判斷邏輯和逾期天數計算
  - Purpose: 提供收據列表查詢 API，支援所有 requirements.md 中定義的篩選條件
  - _Leverage: backend/src/utils/response.js, backend/src/router/receipts.js_
  - _Requirements: BR3.1.1, BR3.1.2, BR3.1.3, BR3.1.4, BR3.1.5, BR3.1.6, BR3.1.7, BR3.1.8, BR3.1.9, BR3.1.10_

- [x] 2.1. 驗證前端 API 調用函數
  - File: src/api/receipts.js
  - 已完成：API 調用函數已實現，支援所有篩選參數
  - _Leverage: @/utils/apiHelpers, axios_
  - _Requirements: BR3.1.1, BR3.1.2, BR3.1.3, BR3.1.4, BR3.1.5, BR3.1.6, BR3.1.7, BR3.1.8, BR3.1.9, BR3.1.10_

- [x] 3.1. 驗證收據列表前端頁面
  - File: src/views/receipts/ReceiptsList.vue
  - 已完成：頁面佈局、路由配置、子組件整合、數據載入、錯誤處理、篩選條件管理、分頁管理、客戶列表載入
  - _Leverage: src/components/receipts/ReceiptFilters.vue, src/components/receipts/ReceiptTable.vue, src/api/receipts.js, src/api/clients.js, @/utils/apiHelpers_
  - _Requirements: BR3.1.1, BR3.1.8, BR3.1.9_

- [x] 4.1. 驗證收據篩選組件 - 添加客戶篩選和月份/年度篩選
  - File: src/components/receipts/ReceiptFilters.vue
  - 已完成：關鍵詞搜尋、狀態篩選、收據類型篩選、日期範圍篩選、客戶篩選下拉框、月份/年度篩選
  - _Leverage: Ant Design Vue components (Input, Select, DatePicker)_
  - _Requirements: BR3.1.2, BR3.1.3, BR3.1.4, BR3.1.5, BR3.1.6, BR3.1.7_

- [x] 5.1. 驗證收據表格組件 - 更新逾期標記顯示
  - File: src/components/receipts/ReceiptTable.vue
  - 已完成：收據列表表格展示、逾期標記和逾期天數顯示、分頁組件、收據點擊事件、加載狀態、空數據提示
  - _Leverage: Ant Design Vue Table and Pagination components, @/utils/formatters_
  - _Requirements: BR3.1.1, BR3.1.8, BR3.1.9, BR3.1.10_

- [x] 6.1. 驗證收據狀態標籤組件
  - File: src/components/receipts/ReceiptStatusTag.vue
  - 已完成：不同狀態的標籤顯示、顏色標記、逾期天數顯示
  - _Leverage: Ant Design Vue Tag component_
  - _Requirements: BR3.1.10_

- [x] 7.1. 驗證收據列表 Pinia Store - 更新篩選參數
  - File: src/stores/receipts.js
  - 已完成：收據列表狀態管理、篩選條件狀態管理（包含新增的 client_id, billing_month, billing_year）、分頁狀態管理
  - _Leverage: Pinia_
  - _Requirements: BR3.1.1_

- [ ] 8. 實現 E2E 測試
  - File: tests/e2e/receipts/receipt-list.spec.ts
  - 測試收據列表載入
  - 測試關鍵詞搜尋
  - Purpose: 確保收據列表功能完整可用，所有篩選、搜尋和分頁功能正常運作
  - 測試狀態篩選
  - 測試收據類型篩選
  - 測試日期範圍篩選
  - 測試客戶篩選
  - 測試月份/年度篩選
  - 測試分頁功能
  - 測試逾期標記顯示
  - 測試收據點擊跳轉
  - _Leverage: Playwright, tests/utils/test-data.ts_
  - _Requirements: BR3.1.1, BR3.1.2, BR3.1.3, BR3.1.4, BR3.1.5, BR3.1.6, BR3.1.7, BR3.1.8, BR3.1.9, BR3.1.10_
  - _Prompt: Role: QA Engineer with expertise in E2E testing and Playwright | Task: Create E2E tests for receipt list functionality including loading, keyword search, status filtering, receipt type filtering, date range filtering, client filtering, month/year filtering, pagination, overdue marker display, and receipt click navigation. Use Playwright framework and test data utilities from tests/utils/test-data.ts | Restrictions: Must use Playwright, must test all filter types, must test pagination, must test overdue markers, must use test data utilities, must handle async operations correctly | Success: All E2E tests pass, all filter types are tested, pagination is tested, overdue markers are tested, navigation is tested_