# Technology Stack

## Project Type

Web Application（會計師事務所內部管理系統）

本專案是一個完整的企業級 Web 應用系統，採用前後端分離架構，為會計師事務所提供客戶管理、任務追蹤、財務管理、人力資源等核心業務功能。

## Core Technologies

### Primary Language(s)

- **Language**: JavaScript (ES6+)
- **Runtime**: 
  - 前端：瀏覽器環境（現代瀏覽器支援 ES6+）
  - 後端：Cloudflare Workers Runtime（基於 V8 引擎）
- **Language-specific tools**: 
  - npm（套件管理）
  - Vite（前端建置工具）
  - Wrangler（Cloudflare Workers 開發與部署工具）

### Key Dependencies/Libraries

#### 前端框架與庫
- **Vue 3.3.4+**: 核心前端框架，使用 Composition API 模式
- **Ant Design Vue 4.0.0+**: UI 組件庫，提供完整的企業級組件
- **Pinia 2.1.7+**: 狀態管理庫，替代 Vuex
- **Vue Router 4.2.5+**: 前端路由管理
- **Axios 1.6.2+**: HTTP 客戶端，用於 API 請求
- **Day.js 1.11.10+**: 日期處理庫
- **Quill 2.0.3+**: 富文本編輯器（用於 SOP、FAQ 等內容編輯）
- **PDF.js 5.4.394+**: PDF 預覽與處理

#### 後端框架與工具
- **Cloudflare Workers**: 無伺服器運行環境，提供邊緣計算能力
- **@modelcontextprotocol/sdk 0.5.0+**: MCP 協議支援
- **undici 5.29.0+**: 高性能 HTTP 客戶端

#### 開發工具
- **Vite 5.0.8+**: 前端建置工具，提供快速開發體驗
- **TypeScript 5.3.3+**: 類型檢查（可選，部分文件使用）
- **Wrangler 4.47.0+**: Cloudflare Workers 開發與部署工具
- **@playwright/test 1.40.0+**: E2E 測試框架

### Application Architecture

**前後端分離架構**：
- **前端**：單頁應用（SPA），使用 Vue 3 + Vite 建置，部署到 Cloudflare Pages
- **後端**：RESTful API 服務，使用 Cloudflare Workers 運行，提供統一的 API 端點
- **通信協議**：HTTP/REST，使用 JSON 格式進行數據交換
- **認證機制**：Cookie-based Session 認證

**模組化設計**：
- 前端按功能模組組織（components、views、stores、api）
- 後端按業務領域組織（handlers 按功能模組分組）
- 清晰的層級分離：UI 層 → API 層 → Handler 層 → 資料庫層

### Data Storage

- **Primary storage**: Cloudflare D1 (SQLite)
  - 關係型資料庫，支援 SQL 查詢
  - 提供本地和遠端兩種環境
  - 支援資料庫遷移（migrations）
- **Caching**: Cloudflare KV
  - 用於快取報表數據、設定等
  - 快取鍵格式：`{type}:{key}`（如 `monthly:{year}:{month}:{reportType}`）
- **File Storage**: Cloudflare R2
  - 用於存儲附件、資源等文件
  - 支援預簽名 URL 上傳
- **Data formats**: JSON（API 請求/回應）、SQL（資料庫查詢）

### External Integrations

- **APIs**: 
  - Cloudflare Workers API（運行環境）
  - Cloudflare D1 API（資料庫操作）
  - Cloudflare KV API（快取操作）
  - Cloudflare R2 API（文件存儲）
- **Protocols**: HTTP/REST
- **Authentication**: Cookie-based Session（JWT Token 存儲在 Cookie 中）

### Monitoring & Dashboard Technologies

- **Dashboard Framework**: Vue 3 + Ant Design Vue
- **Real-time Communication**: 輪詢（Polling，每 5 分鐘自動刷新）
- **Visualization Libraries**: Ant Design Vue 內建圖表組件
- **State Management**: Pinia（集中式狀態管理）

## Development Environment

### Build & Development Tools

- **Build System**: 
  - 前端：Vite（開發模式：`npm run dev`，建置：`npm run build`）
  - 後端：Wrangler（開發模式：`npm run dev`，部署：`npm run deploy`）
- **Package Management**: npm
- **Development workflow**: 
  - 前端：Vite 提供熱模組替換（HMR），即時反映代碼變更
  - 後端：Wrangler 提供本地開發伺服器，支援本地 D1 資料庫
  - 支援本地和遠端兩種開發模式

### Code Quality Tools

- **Static Analysis**: TypeScript（部分文件使用，提供類型檢查）
- **Formatting**: 遵循 ESLint 和 Prettier 規範（如配置）
- **Testing Framework**: 
  - Playwright（E2E 測試）
  - 測試腳本位於 `scripts/browser-tests/`
- **Documentation**: Markdown 文檔（Spec Workflow 系統）

### Version Control & Collaboration

- **VCS**: Git
- **Branching Strategy**: 功能分支開發（Feature Branch）
- **Code Review Process**: 通過 Spec Workflow Dashboard 進行文檔審查和批准

### Dashboard Development

- **Live Reload**: Vite HMR 提供即時更新
- **Port Management**: 
  - 前端開發伺服器：預設端口（Vite 自動分配）
  - 後端開發伺服器：8787（Wrangler）
- **Multi-Instance Support**: 支援同時運行多個開發實例

## Deployment & Distribution

- **Target Platform(s)**: Cloudflare 邊緣網路
- **Distribution Method**: 
  - 前端：Cloudflare Pages（靜態網站託管）
  - 後端：Cloudflare Workers（無伺服器函數）
- **Installation Requirements**: 
  - Node.js 環境（開發時）
  - Cloudflare 帳戶（部署時）
  - Wrangler CLI（部署工具）
- **Update Mechanism**: 
  - 前端：通過 `wrangler pages deploy` 部署到 Cloudflare Pages
  - 後端：通過 `wrangler deploy` 部署到 Cloudflare Workers
  - 支援多環境部署（test、production branches）

## Technical Requirements & Constraints

### Performance Requirements

- **API 響應時間**: < 500ms（正常操作），< 2 秒（複雜計算如薪資結算）
- **頁面載入時間**: < 3 秒
- **報表查詢時間**: < 700ms（使用快取時）
- **文件上傳時間**: < 5 秒（25MB 文件）
- **資料庫查詢**: 複雜查詢 < 2 秒

### Compatibility Requirements

- **Platform Support**: 
  - 瀏覽器：現代瀏覽器（Chrome、Edge 最新版本）
  - 後端：Cloudflare Workers Runtime（全球邊緣節點）
- **Dependency Versions**: 
  - Node.js: 建議 18+ 版本
  - npm: 建議 9+ 版本
- **Standards Compliance**: 
  - HTTP/HTTPS 協議
  - RESTful API 設計規範
  - SQL 標準（SQLite 方言）

### Security & Compliance

- **Security Requirements**: 
  - Cookie-based Session 認證
  - 參數化查詢防止 SQL 注入
  - 前端和後端雙重輸入驗證
  - XSS 防護（Vue 自動轉義）
  - 文件上傳驗證（大小、類型）
  - 預簽名 URL 上傳（R2）
- **Compliance Standards**: 
  - 財務數據安全
  - 審計追蹤（完整的數據變更記錄）
  - 軟刪除機制保留歷史記錄
- **Threat Model**: 
  - SQL 注入防護
  - XSS 攻擊防護
  - CSRF 防護（Cookie SameSite 屬性）
  - 未授權訪問防護（權限控制）

### Scalability & Reliability

- **Expected Load**: 
  - 用戶數：小型會計師事務所（3 名員工）
  - 請求量：日常操作（任務管理、工時填報等）
  - 數據量：客戶、任務、收據等業務數據
- **Availability Requirements**: 
  - 目標：99.9% 可用性
  - Cloudflare 全球邊緣網路提供高可用性
  - 自動故障轉移和負載均衡
- **Growth Projections**: 
  - 支援資料庫擴展（D1 支援）
  - 支援快取擴展（KV 支援）
  - 支援文件存儲擴展（R2 支援）

## Technical Decisions & Rationale

### Decision Log

1. **選擇 Cloudflare Workers 作為後端運行環境**：
   - **原因**：無伺服器架構，無需管理伺服器，自動擴展，全球邊緣網路提供低延遲
   - **替代方案考慮**：傳統伺服器（如 Node.js + Express），但需要管理基礎設施
   - **權衡**：犧牲部分伺服器端功能（如長時間運行的進程），換取簡化的部署和運維

2. **選擇 Cloudflare D1 (SQLite) 作為資料庫**：
   - **原因**：與 Cloudflare Workers 深度整合，無需額外的資料庫連接管理，支援本地和遠端環境
   - **替代方案考慮**：PostgreSQL、MySQL 等傳統資料庫，但需要額外的連接和配置
   - **權衡**：SQLite 的並發性能限制，但對於小型事務所足夠使用

3. **選擇 Vue 3 Composition API**：
   - **原因**：更好的邏輯復用、類型推斷、代碼組織，符合現代前端開發趨勢
   - **替代方案考慮**：Vue 2 Options API，但 Composition API 提供更好的開發體驗
   - **權衡**：學習曲線，但長期維護性更好

4. **選擇 Ant Design Vue 作為 UI 組件庫**：
   - **原因**：完整的企業級組件、良好的文檔、與 Vue 3 兼容
   - **替代方案考慮**：Element Plus、Vuetify 等，但 Ant Design Vue 更適合企業應用
   - **權衡**：組件樣式較重，但提供完整的企業級功能

5. **選擇 Pinia 作為狀態管理庫**：
   - **原因**：Vue 3 官方推薦，比 Vuex 更簡潔，更好的 TypeScript 支援
   - **替代方案考慮**：Vuex，但 Pinia 提供更好的開發體驗
   - **權衡**：需要遷移現有 Vuex 代碼（如適用），但長期維護性更好

6. **使用 Cloudflare KV 作為快取層**：
   - **原因**：與 Cloudflare Workers 深度整合，全球邊緣快取，低延遲
   - **替代方案考慮**：Redis，但需要額外的基礎設施
   - **權衡**：KV 的數據一致性限制（最終一致性），但對於報表快取足夠使用

7. **使用 Cloudflare R2 作為文件存儲**：
   - **原因**：與 Cloudflare 生態系統整合，無出口費用，支援預簽名 URL
   - **替代方案考慮**：AWS S3、Google Cloud Storage，但 R2 與 Workers 整合更好
   - **權衡**：功能相對較新，但滿足文件存儲需求

## Known Limitations

- **SQLite 並發限制**：D1 基於 SQLite，在高並發場景下可能出現性能瓶頸，但對於中小型事務所足夠使用
- **Workers 執行時間限制**：Cloudflare Workers 有執行時間限制（CPU 時間），複雜計算可能需要優化或拆分
- **KV 最終一致性**：Cloudflare KV 提供最終一致性，不適合需要強一致性的場景，但對於報表快取足夠使用
- **本地開發環境**：本地 D1 資料庫與遠端資料庫可能存在差異，需要定期同步測試數據
- **文件上傳大小限制**：單個文件限制為 25MB，大文件需要分塊上傳或使用其他方案
