# Spec Workflow MCP

這個目錄包含 Spec Workflow MCP 的規範和配置。

## 快速啟動

### 1. 啟動儀表板

```bash
npm run spec:dashboard
```

訪問: http://localhost:5000

### 2. 啟動 MCP 伺服器（在另一個終端）

```bash
npm run spec:server
```

## 目錄結構

```
.spec-workflow/
├── README.md              # 本檔案
└── specs/                 # 規範文件目錄
    └── project-refactoring.md  # 主規範
```

## 使用方式

1. 儀表板會自動檢測此目錄中的規範
2. 通過 AI 對話創建新規範
3. 在儀表板中追蹤進度

詳細使用說明請參考: `../SPEC_WORKFLOW_GUIDE.md`





