# Tasks.md 驗證檢查清單

## 檢查項目

### 1. 結構完整性 ✅
- [ ] 文件開頭有標題（# Tasks Document: BRx.x: 模組名稱）
- [ ] 任務使用階層式編號（1.0, 1.1, 1.2 或 1, 2, 3）
- [ ] 每個任務都有 checkbox（- [ ]）
- [ ] 每個任務都有 File 欄位
- [ ] 每個任務都有 Purpose 或描述

### 2. 必填欄位 ✅
- [ ] _Leverage: 列出可重用的現有代碼/工具
- [ ] _Requirements: 對應的需求編號（格式：BRx.x.x 或 Requirement x）
- [ ] _Prompt: 完整的實現指引（包含角色、任務、限制、成功標準）

### 3. 內容正確性 ✅
- [ ] 任務描述與 requirements.md 一致
- [ ] 任務描述與 design.md 一致
- [ ] 文件路徑正確
- [ ] 函數名稱正確
- [ ] 需求編號格式正確

### 4. 完整性檢查 ✅
- [ ] 所有 requirements.md 中的需求都有對應的任務
- [ ] 所有 design.md 中的組件/API 都有對應的任務
- [ ] 包含 E2E 測試任務

---

## 快速檢查腳本

檢查所有 tasks.md 是否包含必填欄位：

```bash
# 檢查所有 tasks.md 是否包含 _Prompt
grep -r "_Prompt:" .spec-workflow/specs/*/tasks.md | wc -l

# 檢查所有 tasks.md 是否包含 _Requirements
grep -r "_Requirements:" .spec-workflow/specs/*/tasks.md | wc -l

# 檢查所有 tasks.md 是否包含 _Leverage
grep -r "_Leverage:" .spec-workflow/specs/*/tasks.md | wc -l
```

