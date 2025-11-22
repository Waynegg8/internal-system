# E2E 測試說明

## 運行測試

### ⚠️ 重要：編碼設置

**為了正確顯示中文，請在運行測試前設置 UTF-8 編碼：**

在 PowerShell 中執行：

```powershell
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
```

### 方法 1：直接使用 Playwright（推薦，需要先設置編碼）

```powershell
# 先設置編碼（見上方）
npx playwright test tests/e2e/clients/template-application-br2.4.6.spec.ts --reporter=list --workers=1 --timeout=120000
```

### 方法 2：使用 npm 腳本

```bash
npm test tests/e2e/clients/template-application-br2.4.6.spec.ts
```

### 方法 3：運行所有測試

```bash
npm test
```

## 編碼問題解決方案

### 方案 1：在 PowerShell 中設置（最可靠）

在運行測試前，執行以下命令：

```powershell
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
```

然後運行測試：

```powershell
npx playwright test tests/e2e/clients/template-application-br2.4.6.spec.ts --reporter=list --workers=1 --timeout=120000
```

### 方案 2：VS Code 終端設置

1. 打開 VS Code 設置（`Ctrl+,`）
2. 搜索 `terminal.integrated.encoding`
3. 設置為 `utf8` 或 `utf8bom`

### 方案 3：使用 Windows Terminal

Windows Terminal 默認支持 UTF-8，建議使用 Windows Terminal 運行測試。

## 注意事項

- **編碼問題不影響測試執行**：即使顯示亂碼，測試仍會正常執行
- **測試結果正確**：所有 12 個測試都已通過驗證
- **測試環境**：測試會在正式環境（`https://v2.horgoscpa.com`）執行
- **自動清理**：測試會自動創建和清理測試數據

## 測試文件結構

- `tests/e2e/clients/` - 客戶相關測試
- `tests/e2e/settings/` - 設定相關測試
- `tests/e2e/utils/` - 測試工具函數

## 注意事項

- 測試會在正式環境（`https://v2.horgoscpa.com`）執行
- 測試會自動創建和清理測試數據
- 確保有適當的權限訪問測試環境
