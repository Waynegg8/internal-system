# 如何使用 Spec Workflow 進行開發

## 概述

Spec Workflow 是一個規範驅動的開發流程，確保所有開發工作都遵循標準化的流程，並記錄實現細節供未來參考。

---

## 正確的開發流程

### 步驟 1: 查看規範狀態

在開始開發前，先查看規範狀態：

```
請使用 MCP 工具查看規範狀態
```

或告訴 AI：
```
查看 project-documentation 規範的狀態
```

### 步驟 2: 選擇任務

查看 `tasks.md` 文件，選擇要實現的任務。

### 步驟 3: 標記任務為進行中

在 `tasks.md` 中，將任務從 `[ ]` 改為 `[-]`：

```markdown
- [-] 1. 審查並更新功能盤點清單  ← 標記為進行中
```

### 步驟 4: 實現任務

按照任務描述和 `_Prompt` 字段的指引實現代碼。

### 步驟 5: 記錄實現細節

完成任務後，使用 `log-implementation` 工具記錄實現細節：

```
使用 log-implementation 工具記錄：
- taskId: 任務編號（如 "1"）
- summary: 實現摘要
- filesModified: 修改的文件
- filesCreated: 創建的文件
- statistics: 代碼統計（linesAdded, linesRemoved）
- artifacts: 實現的組件、API、函數等詳細信息
```

### 步驟 6: 標記任務為完成

在 `tasks.md` 中，將任務從 `[-]` 改為 `[x]`：

```markdown
- [x] 1. 審查並更新功能盤點清單  ← 標記為完成
```

---

## 給 AI 的指令範例

### 範例 1: 開始實現任務

```
請按照 Spec Workflow 流程實現任務 1：
1. 先將 tasks.md 中的任務 1 標記為進行中 [-]
2. 實現任務（審查並更新功能盤點清單）
3. 使用 log-implementation 記錄實現細節
4. 將任務標記為完成 [x]
```

### 範例 2: 查看規範狀態

```
請查看 project-documentation 規範的當前狀態
```

### 範例 3: 實現多個任務

```
請按照 Spec Workflow 流程實現任務 1-3：
1. 依次標記任務為進行中
2. 實現每個任務
3. 記錄每個任務的實現細節
4. 標記為完成
```

---

## 重要注意事項

### ✅ 正確做法

1. **始終使用 MCP 工具記錄實現**
   - 使用 `log-implementation` 記錄每個任務的實現細節
   - 包含完整的 artifacts 信息（API、組件、函數等）

2. **更新任務狀態**
   - 開始時：`[ ]` → `[-]`
   - 完成時：`[-]` → `[x]`

3. **遵循任務描述**
   - 閱讀 `_Prompt` 字段了解實現指引
   - 遵循 `_Leverage` 字段使用現有代碼
   - 參考 `_Requirements` 字段確保滿足需求

### ❌ 錯誤做法

1. **直接修改文件而不記錄**
   - ❌ 只修改代碼，不更新 tasks.md
   - ❌ 不使用 log-implementation 記錄

2. **跳過任務狀態更新**
   - ❌ 不標記任務為進行中
   - ❌ 不標記任務為完成

3. **不遵循規範流程**
   - ❌ 不查看規範狀態就開始開發
   - ❌ 不閱讀任務描述就實現

---

## Spec Workflow 工具說明

### 1. spec-status
查看規範的當前狀態和進度

```
查看 project-documentation 規範狀態
```

### 2. log-implementation
記錄任務實現細節（**必須使用**）

**參數**:
- `specName`: 規範名稱（如 "project-documentation"）
- `taskId`: 任務編號（如 "1"）
- `summary`: 實現摘要
- `filesModified`: 修改的文件列表
- `filesCreated`: 創建的文件列表
- `statistics`: 代碼統計（linesAdded, linesRemoved）
- `artifacts`: 實現的組件詳細信息（**必須包含**）

**artifacts 必須包含**:
- `apiEndpoints`: API 端點信息
- `components`: UI 組件信息
- `functions`: 函數信息
- `classes`: 類信息
- `integrations`: 整合信息

### 3. approvals
管理規範文件的審批流程（用於創建新規範時）

---

## 完整工作流程示例

### 場景：實現「配置 ESLint」任務

#### 1. 查看狀態
```
請查看 project-documentation 規範狀態
```

#### 2. 開始任務
```
請按照 Spec Workflow 流程實現「配置 ESLint」任務：
1. 在 tasks.md 中找到相關任務並標記為進行中 [-]
2. 實現 ESLint 配置
3. 使用 log-implementation 記錄實現細節
4. 標記任務為完成 [x]
```

#### 3. AI 執行流程
- ✅ 讀取 tasks.md
- ✅ 將任務標記為 `[-]`
- ✅ 創建 `.eslintrc.js` 文件
- ✅ 配置 ESLint 規則
- ✅ 使用 `log-implementation` 記錄：
  ```json
  {
    "taskId": "8",
    "summary": "配置 ESLint 代碼品質工具",
    "filesCreated": [".eslintrc.js", ".eslintignore"],
    "filesModified": ["package.json"],
    "statistics": { "linesAdded": 50, "linesRemoved": 0 },
    "artifacts": {
      "functions": [{
        "name": "eslintConfig",
        "purpose": "ESLint 配置",
        "location": ".eslintrc.js"
      }]
    }
  }
  ```
- ✅ 將任務標記為 `[x]`

---

## 檢查清單

在每次開發任務時，確保：

- [ ] 查看了規範狀態
- [ ] 閱讀了任務描述和 `_Prompt`
- [ ] 將任務標記為進行中 `[-]`
- [ ] 實現了任務代碼
- [ ] 使用了 `log-implementation` 記錄實現細節
- [ ] 包含了完整的 `artifacts` 信息
- [ ] 將任務標記為完成 `[x]`

---

## 常見問題

### Q: 如果直接修改文件，會自動記錄嗎？
**A:** 不會。必須使用 `log-implementation` 工具手動記錄。

### Q: 可以跳過任務狀態更新嗎？
**A:** 不建議。任務狀態更新幫助追蹤進度，並在儀表板中顯示。

### Q: artifacts 信息必須包含嗎？
**A:** 是的。artifacts 信息非常重要，它創建了一個可搜尋的知識庫，幫助未來的 AI 發現現有代碼，避免重複實現。

### Q: 如何查看實現歷史？
**A:** 實現日誌保存在 `.spec-workflow/specs/{spec-name}/Implementation Logs/` 目錄中。

---

## 總結

使用 Spec Workflow 進行開發的關鍵是：
1. **遵循流程**：查看狀態 → 標記進行中 → 實現 → 記錄 → 標記完成
2. **使用工具**：使用 MCP 工具（spec-status, log-implementation）記錄
3. **完整記錄**：包含完整的 artifacts 信息
4. **更新狀態**：及時更新任務狀態

這樣可以確保所有開發工作都被正確記錄和追蹤，為未來的開發提供參考。


