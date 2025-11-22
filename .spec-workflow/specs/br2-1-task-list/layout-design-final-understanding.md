# 任務列表頁面布局設計 - 最終理解確認

根據您的確認，我對最終布局設計的理解如下：

## 最終布局結構

```
FilterCard
├─ 第一行（分為兩個子行，無視覺分隔，僅靠間距自然分隔）
│  ├─ 子行1: [搜尋框] [開始月份] [結束月份] [負責人] [標籤] [狀態] [到期狀態] [隱藏已完成✓]
│  └─ 子行2: [服務類型] [標籤多選] [是否可開始] [我的任務] [刷新] [批量分配]
│
└─ 第二行: [全選客戶] [一鍵展開] [33總任務] [33進行中] [0已完成] [14逾期] [33可開始]
   (連續排列，無分隔線，統一間距 8px)
```

## 關鍵設計決策確認

### ✅ 1. 第一行的兩個子行
- **不需要視覺分隔** - 無 border、無背景色區分
- **僅靠間距自然分隔** - 兩個子行之間 `margin-top: 6px`
- **重點：確保搜索欄及篩選框內文字可以完整顯示**
  - 所有輸入框和選擇框設置足夠的 `min-width`
  - 優先保證文字完整顯示，而非強制單行
  - 使用 `white-space: nowrap` 和 `overflow: visible` 確保文字不被截斷

### ✅ 2. 第二行布局
- **連續排列** - `justify-content: flex-start`, `gap: 8px`
- 所有項目（全選客戶、一鍵展開、統計摘要）連續排列在同一行
- 無 `space-between`，無額外分隔

### ✅ 3. 統計摘要位置
- **移到第二行**，與客戶選擇控制連續排列
- **不需要分隔線** - 統計摘要與客戶選擇控制之間無視覺分隔
- 統計項目之間用 `|` 分隔

### ✅ 4. 響應式設計
- **無須理會複雜的響應式邏輯**
- **重點：確保搜索欄及篩選框內文字可以完整顯示**
- 如果空間不足，允許換行以保證文字完整
- 優先保證文字完整顯示和可讀性

## 具體實現要點

### CSS 關鍵樣式

```css
/* 第一行容器 - 包含兩個子行 */
.filter-row-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 第一子行：基本篩選項目 */
.filter-row-main-first {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap; /* 優先不換行，但保證文字完整 */
  width: 100%;
}

/* 第二子行：高級篩選 + 操作按鈕 */
.filter-row-main-second {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap; /* 優先不換行，但保證文字完整 */
  width: 100%;
  margin-top: 6px; /* 與第一子行的間距，無其他視覺分隔 */
}

/* 重點：確保搜索欄及篩選框內文字完整顯示 */
.filter-item input,
.filter-item .ant-select-selector {
  min-width: fit-content !important;
  white-space: nowrap;
  overflow: visible;
  text-overflow: ellipsis; /* 僅在真正無法顯示時才省略 */
}

/* 第二行：客戶選擇控制 + 統計摘要（連續排列） */
.filter-row-toolbar {
  display: flex;
  align-items: center;
  gap: 8px; /* 連續排列，統一間距 */
  padding-top: 6px;
  margin-top: 6px;
  border-top: 1px solid #f0f0f0; /* 僅與第一行分隔 */
  flex-wrap: nowrap;
  justify-content: flex-start; /* 從左開始連續排列 */
}

/* 統計摘要 - 連續排列在第二行，無額外左邊距 */
.stats-wrapper-inline {
  flex: 0 0 auto;
  height: 28px;
  margin-left: 0; /* 無額外左邊距，與客戶選擇控制連續排列 */
}
```

### 項目寬度規格（確保文字完整顯示）

**第一子行項目：**
- 搜尋框：`min-width: 140px`, `max-width: 200px`
- 開始/結束月份：`min-width: 110px` (確保日期完整顯示)
- 負責人：`min-width: 120px` (確保人名完整顯示)
- 標籤：`min-width: 120px`
- 狀態：`min-width: 110px`
- 到期狀態：`min-width: 130px` (確保「即將到期（≤3天）」完整)
- 隱藏已完成：`flex: 0 0 auto` (根據內容)

**第二子行項目：**
- 服務類型：`min-width: 140px`, `flex-shrink: 1`
- 標籤多選：`min-width: 140px`, `flex-shrink: 1`
- 是否可開始：`min-width: 120px`, `flex-shrink: 1`
- 我的任務：`flex: 0 0 auto`
- 刷新/批量分配：`flex: 0 0 auto`

## 驗收標準

### 必須達成的目標
1. ✅ **搜索欄及篩選框內文字可以完整顯示，不被截斷**
2. ✅ 第一行分為兩個子行，無視覺分隔
3. ✅ 第二行連續排列，無分隔線
4. ✅ 統計摘要與客戶選擇控制連續排列
5. ✅ 整體布局緊湊，無明顯空白區域

### 響應式處理
- 優先保證文字完整顯示
- 必要時允許換行
- 無需複雜的響應式斷點邏輯

## 確認

請確認我的理解是否正確，特別是：
1. ✅ 第一行分為兩個子行，無視覺分隔
2. ✅ 第二行連續排列（justify-content: flex-start）
3. ✅ 統計摘要與客戶選擇控制之間無分隔線
4. ✅ **重點：確保搜索欄及篩選框內文字可以完整顯示**
5. ✅ 響應式無須理會複雜邏輯，重點是保證文字完整

確認後將按照此設計進行實現。


