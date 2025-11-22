-- 插入100個測試客戶
-- 分批插入，每批20個客戶，避免SQL變量限制

-- 第一批：客戶1-20
INSERT INTO Clients (client_id, company_name, tax_registration_number, business_status, phone, email, is_deleted, created_at, updated_at) VALUES
('PERF_TEST_001', '性能測試客戶001有限公司', '90000001', 'active', '0912345678', 'perf_test_001@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_002', '性能測試客戶002有限公司', '90000002', 'active', '0912345678', 'perf_test_002@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_003', '性能測試客戶003有限公司', '90000003', 'active', '0912345678', 'perf_test_003@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_004', '性能測試客戶004有限公司', '90000004', 'active', '0912345678', 'perf_test_004@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_005', '性能測試客戶005有限公司', '90000005', 'active', '0912345678', 'perf_test_005@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_006', '性能測試客戶006有限公司', '90000006', 'active', '0912345678', 'perf_test_006@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_007', '性能測試客戶007有限公司', '90000007', 'active', '0912345678', 'perf_test_007@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_008', '性能測試客戶008有限公司', '90000008', 'active', '0912345678', 'perf_test_008@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_009', '性能測試客戶009有限公司', '90000009', 'active', '0912345678', 'perf_test_009@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_010', '性能測試客戶010有限公司', '90000010', 'active', '0912345678', 'perf_test_010@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_011', '性能測試客戶011有限公司', '90000011', 'active', '0912345678', 'perf_test_011@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_012', '性能測試客戶012有限公司', '90000012', 'active', '0912345678', 'perf_test_012@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_013', '性能測試客戶013有限公司', '90000013', 'active', '0912345678', 'perf_test_013@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_014', '性能測試客戶014有限公司', '90000014', 'active', '0912345678', 'perf_test_014@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_015', '性能測試客戶015有限公司', '90000015', 'active', '0912345678', 'perf_test_015@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_016', '性能測試客戶016有限公司', '90000016', 'active', '0912345678', 'perf_test_016@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_017', '性能測試客戶017有限公司', '90000017', 'active', '0912345678', 'perf_test_017@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_018', '性能測試客戶018有限公司', '90000018', 'active', '0912345678', 'perf_test_018@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_019', '性能測試客戶019有限公司', '90000019', 'active', '0912345678', 'perf_test_019@test.com', 0, datetime('now'), datetime('now')),
('PERF_TEST_020', '性能測試客戶020有限公司', '90000020', 'active', '0912345678', 'perf_test_020@test.com', 0, datetime('now'), datetime('now'));


