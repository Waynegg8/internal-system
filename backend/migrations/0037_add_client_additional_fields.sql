-- ============================================
-- 添加客戶額外欄位
-- 支援公司負責人、地址、資本額、股東持股、董監事、主要聯絡方式、LINE ID
-- ============================================

-- 1. 添加公司負責人欄位
ALTER TABLE Clients ADD COLUMN company_owner TEXT;

-- 2. 添加公司地址欄位
ALTER TABLE Clients ADD COLUMN company_address TEXT;

-- 3. 添加資本額欄位（單位：新台幣元）
ALTER TABLE Clients ADD COLUMN capital_amount REAL;

-- 4. 添加股東持股資訊欄位（JSON 格式）
ALTER TABLE Clients ADD COLUMN shareholders TEXT;

-- 5. 添加董監事資訊欄位（JSON 格式）
ALTER TABLE Clients ADD COLUMN directors_supervisors TEXT;

-- 6. 添加主要聯絡方式欄位（選項：'line'、'phone'、'email'、'other'）
ALTER TABLE Clients ADD COLUMN primary_contact_method TEXT;

-- 7. 添加 LINE ID 欄位
ALTER TABLE Clients ADD COLUMN line_id TEXT;

-- 8. 創建索引（如果需要根據這些欄位搜尋）
CREATE INDEX IF NOT EXISTS idx_clients_company_owner ON Clients(company_owner) WHERE company_owner IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_primary_contact_method ON Clients(primary_contact_method) WHERE primary_contact_method IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_line_id ON Clients(line_id) WHERE line_id IS NOT NULL;

