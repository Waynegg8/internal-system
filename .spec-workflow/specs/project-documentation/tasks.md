# Tasks Document

本文件將專案文檔化的設計轉換為具體的實現任務。由於這是現有專案的文檔化工作，任務主要聚焦於文檔的維護、更新和改進。

- [ ] 1. 審查並更新功能盤點清單
  - File: .spec-workflow/specs/features-inventory.md
  - 審查現有功能盤點清單的完整性
  - 確認所有功能模組、API 端點、資料庫表都已記錄
  - 更新任何遺漏的功能或變更
  - Purpose: 確保功能盤點清單的完整性和準確性
  - _Leverage: 現有的 features-inventory.md 文件_
  - _Requirements: BR1-BR8_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer specializing in software documentation | Task: Review and update the features inventory document to ensure all 14 functional modules, 100+ API endpoints, and 50+ database tables are accurately documented | Restrictions: Must verify against actual codebase, do not add non-existent features, maintain consistent formatting | Success: Features inventory is complete and accurate, all modules are properly documented with correct API endpoints and database tables_

- [x] 2. 審查並更新技術棧規範
  - File: .spec-workflow/specs/tech-stack.md
  - 驗證技術棧描述的準確性
  - 確認所有依賴套件版本正確
  - 更新架構圖和技術決策說明
  - Purpose: 確保技術棧文檔反映實際使用的技術
  - _Leverage: 現有的 tech-stack.md 文件, package.json, backend/package.json_
  - _Requirements: TR1-TR7_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Architect specializing in technology stack documentation | Task: Review and update the tech stack document to ensure all technologies, dependencies, and architectural decisions are accurately documented | Restrictions: Must verify against actual package.json files, do not document unused technologies, maintain technical accuracy | Success: Tech stack document accurately reflects all technologies in use, dependency versions are correct, architecture diagrams are up-to-date_ 

- [ ] 3. 審查並更新需求規範
  - File: .spec-workflow/specs/project-documentation/requirements.md
  - 驗證需求描述的完整性
  - 確認所有業務需求、技術需求、用戶需求都已記錄
  - 更新驗收標準和成功標準
  - Purpose: 確保需求文檔完整且準確
  - _Leverage: 現有的 requirements.md 文件_
  - _Requirements: BR1-BR8, TR1-TR7, UR1-UR4, NFR1-NFR5_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Business Analyst specializing in requirements documentation | Task: Review and update the requirements document to ensure all business, technical, and user requirements are accurately documented with proper acceptance criteria | Restrictions: Must align with actual system functionality, do not document unimplemented features as requirements, maintain requirement traceability | Success: Requirements document is complete with all requirements properly categorized, acceptance criteria are clear and measurable, requirements align with system capabilities_

- [ ] 4. 審查並更新設計規範
  - File: .spec-workflow/specs/project-documentation/design.md
  - 驗證架構設計描述的準確性
  - 確認 API 設計、資料模型、UI 設計都已記錄
  - 更新設計決策記錄
  - Purpose: 確保設計文檔完整且準確
  - _Leverage: 現有的 design.md 文件, 實際代碼結構_
  - _Requirements: 所有設計相關需求_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Software Architect specializing in system design documentation | Task: Review and update the design document to ensure all architectural decisions, API designs, data models, and UI designs are accurately documented | Restrictions: Must verify against actual codebase structure, do not document non-existent designs, maintain design decision traceability | Success: Design document accurately reflects system architecture, all API endpoints are documented, data models match database schema, design decisions are properly recorded_

- [x] 5. 建立規範文件索引和導航
  - File: .spec-workflow/specs/README.md
  - 更新 README 文件，提供完整的文件導航
  - 添加文件之間的關聯說明
  - 建立文件使用指南
  - Purpose: 幫助開發人員快速找到需要的文檔
  - _Leverage: 現有的 README.md 文件_
  - _Requirements: 文檔可用性需求_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer specializing in documentation organization | Task: Update the README file to provide comprehensive navigation and usage guide for all specification documents | Restrictions: Must maintain clear structure, do not duplicate content, ensure easy navigation | Success: README provides clear navigation to all documents, usage guidelines are helpful, document relationships are clearly explained_

- [ ] 6. 驗證文檔與實際代碼的一致性
  - Files: 所有規範文件
  - 對比文檔描述與實際代碼實現
  - 識別並記錄不一致之處
  - 更新文檔以反映實際實現
  - Purpose: 確保文檔準確反映系統實際狀態
  - _Leverage: 所有規範文件, 實際代碼庫_
  - _Requirements: 所有需求_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer specializing in documentation verification | Task: Verify consistency between documentation and actual codebase, identify discrepancies, and update documentation accordingly | Restrictions: Must verify against actual code, do not document non-existent features, maintain accuracy | Success: Documentation accurately reflects codebase, all discrepancies are identified and resolved, documentation is consistent with implementation_

- [x] 7. 建立文檔維護流程
  - File: .spec-workflow/specs/README.md (更新)
  - 定義文檔更新頻率
  - 建立文檔審查流程
  - 設定文檔版本控制規則
  - Purpose: 確保文檔持續更新和維護
  - _Leverage: 現有的 README.md 文件_
  - _Requirements: NFR4 (可維護性要求)_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Project Manager specializing in documentation processes | Task: Establish documentation maintenance process including update frequency, review procedures, and version control rules | Restrictions: Must be practical and sustainable, do not create overly complex processes, ensure team can follow | Success: Documentation maintenance process is clearly defined, update frequency is reasonable, review procedures are established, version control rules are documented_

## 代碼對齊任務

- [x] 8. 對齊 BR1.1: 客戶列表管理
  - Files: 
    - `src/components/clients/ClientListTable.vue`
    - `src/views/clients/ClientsList.vue`
    - `backend/src/handlers/clients/client-crud.js`
    - `backend/migrations/0034_add_client_contact_person.sql`
  - 合併客戶編號和統編欄位為統一編號，格式化顯示（企業客戶去掉前綴00顯示8碼，個人客戶顯示10碼），使用等寬字體
  - 檢查並新增 contact_person_1 欄位到資料庫（如果不存在）
  - 前端刪除按鈕只對管理員顯示
  - 驗證所有功能是否符合規範要求
  - Purpose: 將現有代碼與 BR1.1 需求規範對齊
  - _Leverage: 現有的 ClientListTable.vue, ClientsList.vue, client-crud.js_
  - _Requirements: BR1.1_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer specializing in code alignment | Task: Align existing client list management code with BR1.1 requirements, including unified ID display, contact person field, and admin-only delete button | Restrictions: Must follow existing code patterns, maintain backward compatibility, verify database schema, follow design.md standards | Success: Client list displays unified ID correctly, contact_person_1 field is available, delete button is only visible to admins, all changes align with requirements.md_


## BR1 對齊與落地任務

- [x] 9. 對齊 BR1.2: 客戶服務項目管理
  - Files:
    - `src/views/clients/ClientServices.vue`
    - `src/stores/clientAdd.js`
    - `backend/src/handlers/clients/client-crud.js`
  - 對齊服務類型（定期 / 一次性）與狀態顯示；檢查新增/編輯/刪除流程與驗證；確保服務清單顯示服務名稱、狀態、年度總額、任務配置數量、服務類型、執行次數
  - Purpose: 將現有代碼與 BR1.2 需求規範對齊（清單、CRUD、驗證）
  - _Leverage: ClientServices.vue, clientAdd.js, client-crud.js_
  - _Requirements: BR1.2, BR1.3.2（清單對齊）_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer | Task: Align client services list and CRUD with BR1.2, ensuring correct fields, validation, and derived counts | Restrictions: Reuse existing store patterns, do not introduce breaking API changes, keep UI consistent with Ant Design | Success: Services list shows all required fields, CRUD works with validation, counts/labels accurate_

- [x] 10. 對齊 BR1.3: 客戶帳務資訊管理
  - Files:
    - `backend/src/handlers/billing/billing-crud.js`
    - `backend/src/handlers/clients/client-crud.js`
  - 檢查並對齊付款方式、帳務備註與關聯收費設定；確保與服務年度總額、收費計畫關聯一致
  - Purpose: 將帳務資訊與服務/收費邏輯對齊
  - _Leverage: billing-crud.js, client-crud.js_
  - _Requirements: BR1.3_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Engineer | Task: Align billing info fields and linkages with services and annual totals per BR1.3 | Restrictions: Preserve existing API routes, add non-breaking enhancements only, ensure data integrity | Success: Billing info aligns with services and charge plans, validations present, API responses stable_

- [ ] 11. 對齊 BR1.3.1: 客戶詳情-基本資訊分頁
  - Files:
    - `src/views/clients/ClientBasicInfo.vue`
    - `backend/src/handlers/clients/client-crud.js`
  - 驗證並對齊：可編輯（除統編外）、顯示全部欄位、標籤與協作者管理可用；顯示統編唯讀；更新資料應記錄 updated_at；刪除採軟刪除
  - Purpose: 將基本資訊分頁功能與驗收標準全面對齊
  - _Leverage: ClientBasicInfo.vue, client-crud.js_
  - _Requirements: BR1.3.1（含驗收條目）_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer | Task: Align ClientBasicInfo tab behavior with acceptance criteria (readonly taxId, editable others, tags/collaborators, soft-delete, updated_at) | Restrictions: Follow existing UI/validation patterns, avoid breaking fields | Success: All acceptance checks pass manually and in E2E where applicable_

- [ ] 12. 實作 BR1.3.2.7: 服務類型選擇（定期/一次性）
  - Files:
    - `src/views/clients/ClientServices.vue`
    - `backend/src/handlers/clients/client-crud.js`
  - 在服務新增/編輯流程中提供類型切換，並正確持久化
  - Purpose: 讓服務類型可選，並影響後續邏輯
  - _Leverage: ClientServices.vue 表單結構與現有 API_
  - _Requirements: BR1.3.2.7_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend + Backend Developer | Task: Add service type selector with persistence and validation | Restrictions: Keep UX consistent with AntD forms, ensure backend schema/validation alignment | Success: Users can select and save service type, value reflected in listings and API_

- [x] 13. 實作 BR1.3.2.8: 設定服務執行頻率（執行月份）
  - Files:
    - `src/views/clients/ClientServices.vue`
    - `backend/src/handlers/clients/client-crud.js`
  - 於服務層配置執行月份（月度勾選），任務繼承該設定（不在任務層重複設定）
  - Purpose: 將執行頻率提升至服務層並作為任務生成依據
  - _Leverage: 現有頻率欄位/邏輯（若有），設計規範中繼承說明_
  - _Requirements: BR1.3.2.8（與任務繼承規則掛鉤）_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer | Task: Implement execution_months configuration at service level and ensure tasks inherit | Restrictions: Avoid duplicate config at task level, keep APIs backward compatible | Success: Services can set months, tasks generation respects months, UI/DB aligned_

- [x] 14. 實作 BR1.3.2.9: 是否用於自動生成任務（use_for_auto_generate）
  - Files:
    - `src/views/clients/ClientServices.vue`
    - `backend/src/handlers/clients/client-crud.js`
  - 新增/對齊布林開關，作為任務自動生成判斷依據
  - Purpose: 控制是否納入自動任務生成
  - _Leverage: 現有任務生成流程與欄位_
  - _Requirements: BR1.3.2.9_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend-focused Full-stack Developer | Task: Add and persist use_for_auto_generate flag, wire into job creation logic | Restrictions: Do not regress existing generation, feature-flag if necessary | Success: Toggle controls whether tasks are auto-generated from services_

- [ ] 15. 實作 BR1.3.2.10: 一次性服務執行（收費計劃+任務生成一鍵完成）
  - Files:
    - `src/views/clients/ClientServices.vue`
    - `backend/src/handlers/billing/billing-crud.js`
    - `backend/src/handlers/clients/client-crud.js`
  - 在一次性服務上提供「執行」動作：同時建立對應收費與單次任務；狀態/金額/年總額更新
  - Purpose: 一鍵完成一次性服務的收費計畫與任務建立
  - _Leverage: 現有收費 API（billing-crud.js）、服務 API（client-crud.js）_
  - _Requirements: BR1.3.2.10_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer | Task: Implement one-time service execution that creates billing record and a single task atomically | Restrictions: Ensure transactional integrity (best-effort), consistent totals update, clear user feedback | Success: Clicking execute performs both creations successfully and updates totals; idempotency considered_

- [x] 16. 實作 BR1.3.2.11: 任務名稱從任務類型下拉選擇（依服務類型篩選）
  - Files:
    - `src/components/clients/TaskConfiguration.vue`
    - （如需後端）`backend/src/handlers/services.js`（使用現有 GET /api/v2/services/items）
  - 依據所選服務類型，僅顯示該類型可用的任務類型清單；前端改為下拉選擇
  - Purpose: 規範任務名稱來源並避免自由輸入造成不一致
  - _Leverage: 現有任務模板/類型資料（若有），或新增查詢端點_
  - _Requirements: BR1.3.2.11_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Replace free text task name with filtered dropdown by service type; add backend support if needed | Restrictions: Keep API lightweight, caching if list static enough | Success: Users can only pick valid task types from dropdown filtered by service type_

- [ ] 17. 簡化 BR1.3.2.14: 任務開始日與期限（開始日 + 期限天數）
  - Files:
    - `src/views/clients/ClientServices.vue`
    - `backend/src/handlers/clients/client-crud.js`
  - 將目前過於複雜的期限規則，簡化為「任務開始日 + 期限天數」模型，並調整前後端驗證/儲存
  - Purpose: 降低期限設定複雜度，與需求保持一致
  - _Leverage: 現有任務/服務期限欄位與驗證邏輯_
  - _Requirements: BR1.3.2.14_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer | Task: Simplify deadline rules to start_date + days_due and update UI/API/validation accordingly | Restrictions: Provide clear migration path for existing data, avoid breaking queries | Success: New model is enforced end-to-end; UI simpler, API stores and returns simplified fields_

- [-] 18. 對齊 BR1.4: 客戶標籤管理
  - Files:
    - `src/views/clients/ClientBasicInfo.vue`
    - `backend/src/handlers/clients/client-crud.js`
  - 確保標籤新增/移除/顯示流暢，並支援清單過濾；驗證與權限遵循規範
  - Purpose: 將標籤能力對齊 BR1.4 規範
  - _Leverage: 現有標籤 UI 與 API_
  - _Requirements: BR1.4_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer | Task: Align tag management (add/remove/filter) and permissions | Restrictions: Keep UX consistent; reuse existing components | Success: Tag operations work reliably; lists can filter by tag_

- [ ] 19. 對齊 BR1.5: 客戶協作者管理
  - Files:
    - `src/views/clients/ClientBasicInfo.vue`
    - `backend/src/handlers/clients/client-crud.js`
  - 確保新增/移除協作者僅限管理員或客戶負責人；清楚的權限提示與狀態同步
  - Purpose: 落實協作者管理與權限控制
  - _Leverage: 既有權限與角色判斷邏輯_
  - _Requirements: BR1.5_
  - _Prompt: Implement the task for spec project-documentation, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Full-stack Developer | Task: Align collaborator add/remove with permissions and UI feedback | Restrictions: Do not expose privileged actions to non-privileged users | Success: Only allowed users can manage collaborators; UI/API consistent_

