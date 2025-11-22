/**
 * BR1.2.3: 客戶新增 - 帳務設定分頁 - API 整合測試
 * 
 * 測試範圍：
 * - 所有收費計劃 API Handler 函數（包含批量刪除）
 * - 數據驗證和錯誤處理
 * - 多服務關聯和多月份設定
 * - 事務完整性
 * 
 * 驗收標準：
 * - BR1.2.3.1: 設定付款方式
 * - BR1.2.3.2: 新增收費計劃（選擇年度、勾選月份、填寫金額、關聯服務）
 * - BR1.2.3.3: 編輯收費計劃（修改月份金額、關聯服務）
 * - BR1.2.3.4: 刪除收費計劃
 * - BR1.2.3.5: 批量刪除收費記錄
 * - BR1.2.3.6: 關聯多個服務到收費計劃
 * - BR1.2.3.7: 為每個勾選的月份填寫不同金額
 * - BR1.2.3.8: 獨立保存帳務設定
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  handleGetServiceBilling,
  handleCreateBilling,
  handleUpdateBilling,
  handleBatchDeleteBilling
} from '../../../backend/src/handlers/billing/billing-crud.js'

describe('BR1.2.3: 客戶新增 - 帳務設定分頁 - API 整合測試', () => {
  let mockEnv
  let mockCtx
  let mockRequest
  let mockRequestId
  let mockUrl
  let mockMatch

  // Mock 數據庫查詢結果
  let mockDbResults = {
    service: null,
    schedules: [],
    client: null,
    lastInsertId: null
  }

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()

    // Mock 環境變數
    mockEnv = {
      DATABASE: {
        prepare: vi.fn((query) => {
          const stmt = {
            bind: vi.fn((...args) => {
              stmt._binds = args
              return stmt
            }),
            first: vi.fn(async () => {
              // 根據查詢返回不同的結果
              if (query.includes('SELECT cs.client_service_id')) {
                return mockDbResults.service
              }
              if (query.includes('SELECT schedule_id')) {
                return mockDbResults.schedules[0] || null
              }
              if (query.includes('SELECT client_id FROM ClientServices')) {
                return mockDbResults.client
              }
              if (query.includes('SELECT last_insert_rowid()')) {
                return { id: mockDbResults.lastInsertId || 1 }
              }
              if (query.includes('SELECT sbs.schedule_id')) {
                return mockDbResults.schedules.length > 0 ? mockDbResults.schedules : null
              }
              return null
            }),
            all: vi.fn(async () => {
              if (query.includes('SELECT schedule_id')) {
                return { results: mockDbResults.schedules }
              }
              if (query.includes('SELECT sbs.schedule_id')) {
                return { results: mockDbResults.schedules }
              }
              return { results: [] }
            }),
            run: vi.fn(async () => ({ success: true })),
            _binds: []
          }
          return stmt
        }),
        batch: vi.fn(async (statements) => {
          return { success: true }
        }),
        exec: vi.fn(async (sql) => {
          return { success: true }
        })
      },
      CACHE: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
      }
    }

    // Mock 上下文（包含用戶信息）
    mockCtx = {
      user: {
        user_id: 1,
        username: 'admin',
        is_admin: true
      }
    }

    // Mock 請求 ID
    mockRequestId = 'test-request-id-123'

    // Mock URL
    mockUrl = {
      pathname: '/api/v2/billing'
    }

    // Mock Match（用於路由參數）
    mockMatch = ['/api/v2/billing/service/1', '1']

    // 重置數據庫結果
    mockDbResults = {
      service: {
        client_service_id: 1,
        client_id: 'CLIENT001',
        assignee_user_id: 1
      },
      schedules: [],
      client: {
        client_id: 'CLIENT001'
      },
      lastInsertId: 1
    }
  })

  // ========== 測試組 1: GET /api/v2/billing/service/:serviceId ==========
  describe('GET /api/v2/billing/service/:serviceId - 獲取服務收費明細', () => {
    it('應該成功獲取服務的收費明細', async () => {
      // 設置 mock 數據
      mockDbResults.service = {
        client_service_id: 1,
        client_id: 'CLIENT001',
        assignee_user_id: 1
      }
      mockDbResults.schedules = [
        {
          schedule_id: 1,
          billing_type: 'monthly',
          billing_month: 1,
          billing_amount: 5000,
          payment_due_days: 30,
          billing_date: null,
          description: null,
          notes: '測試備註',
          billing_year: 2024,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          schedule_id: 2,
          billing_type: 'monthly',
          billing_month: 2,
          billing_amount: 6000,
          payment_due_days: 30,
          billing_date: null,
          description: null,
          notes: '',
          billing_year: 2024,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]

      mockRequest = {
        method: 'GET',
        json: vi.fn()
      }

      const response = await handleGetServiceBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockMatch,
        mockUrl
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.data.schedules).toHaveLength(2)
      expect(data.data.schedules[0].billing_amount).toBe(5000)
      expect(data.data.schedules[1].billing_amount).toBe(6000)
      expect(data.data.year_total).toBe(11000)
    })

    it('應該在服務不存在時返回 404', async () => {
      mockDbResults.service = null

      mockRequest = {
        method: 'GET',
        json: vi.fn()
      }

      const response = await handleGetServiceBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockMatch,
        mockUrl
      )

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toContain('服務不存在')
    })

    it('應該在無權限時返回 403', async () => {
      mockDbResults.service = {
        client_service_id: 1,
        client_id: 'CLIENT001',
        assignee_user_id: 2 // 不同的負責人
      }
      mockCtx.user.is_admin = false
      mockCtx.user.user_id = 1

      mockRequest = {
        method: 'GET',
        json: vi.fn()
      }

      const response = await handleGetServiceBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockMatch,
        mockUrl
      )

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toContain('無權限')
    })
  })

  // ========== 測試組 2: POST /api/v2/billing - 創建收費計劃 ==========
  describe('POST /api/v2/billing - 創建收費計劃', () => {
    it('應該成功創建月度收費計劃', async () => {
      mockDbResults.service = {
        client_service_id: 1,
        client_id: 'CLIENT001',
        service_id: 1,
        service_name: '記帳服務'
      }
      mockDbResults.lastInsertId = 100

      mockRequest = {
        method: 'POST',
        json: vi.fn(async () => ({
          client_service_id: 1,
          billing_type: 'monthly',
          billing_year: 2024,
          billing_month: 1,
          billing_amount: 5000,
          payment_due_days: 30,
          notes: '測試備註'
        }))
      }

      const response = await handleCreateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.data.schedule_id).toBe(100)
    })

    it('應該成功創建一次性收費計劃', async () => {
      mockDbResults.service = {
        client_service_id: 1,
        client_id: 'CLIENT001',
        service_id: 1,
        service_name: '設立服務'
      }
      mockDbResults.lastInsertId = 101

      mockRequest = {
        method: 'POST',
        json: vi.fn(async () => ({
          client_service_id: 1,
          billing_type: 'one-time',
          billing_date: '2024-03-15',
          description: '設立費',
          billing_amount: 10000,
          payment_due_days: 30,
          notes: '一次性收費'
        }))
      }

      const response = await handleCreateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.data.schedule_id).toBe(101)
    })

    it('應該驗證必填欄位（client_service_id）', async () => {
      mockRequest = {
        method: 'POST',
        json: vi.fn(async () => ({
          billing_type: 'monthly',
          billing_month: 1,
          billing_amount: 5000
        }))
      }

      const response = await handleCreateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toBe('輸入有誤')
      expect(data.errors).toBeDefined()
      expect(data.errors.some(e => e.message.includes('必填'))).toBe(true)
    })

    it('應該驗證收費類型', async () => {
      mockRequest = {
        method: 'POST',
        json: vi.fn(async () => ({
          client_service_id: 1,
          billing_type: 'invalid-type',
          billing_month: 1,
          billing_amount: 5000
        }))
      }

      const response = await handleCreateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toBe('輸入有誤')
      expect(data.errors).toBeDefined()
      expect(data.errors.some(e => e.message.includes('收費類型'))).toBe(true)
    })

    it('應該驗證月份範圍（1-12）', async () => {
      mockRequest = {
        method: 'POST',
        json: vi.fn(async () => ({
          client_service_id: 1,
          billing_type: 'monthly',
          billing_month: 13, // 無效月份
          billing_amount: 5000
        }))
      }

      const response = await handleCreateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toBe('輸入有誤')
      expect(data.errors).toBeDefined()
      expect(data.errors.some(e => e.message.includes('月份'))).toBe(true)
    })

    it('應該驗證一次性收費必須提供日期和說明', async () => {
      mockRequest = {
        method: 'POST',
        json: vi.fn(async () => ({
          client_service_id: 1,
          billing_type: 'one-time',
          billing_amount: 10000
          // 缺少 billing_date 和 description
        }))
      }

      const response = await handleCreateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.ok).toBe(false)
    })
  })

  // ========== 測試組 3: PUT /api/v2/billing/:id - 更新收費計劃 ==========
  describe('PUT /api/v2/billing/:id - 更新收費計劃', () => {
    it('應該成功更新收費金額', async () => {
      mockDbResults.schedules = [{
        schedule_id: 1,
        client_service_id: 1,
        billing_type: 'monthly'
      }]
      mockDbResults.client = {
        client_id: 'CLIENT001'
      }

      mockRequest = {
        method: 'PUT',
        json: vi.fn(async () => ({
          billing_amount: 8000
        }))
      }

      mockMatch = ['/api/v2/billing/1', '1']

      const response = await handleUpdateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockMatch,
        mockUrl
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(String(data.data.schedule_id)).toBe('1')
    })

    it('應該在記錄不存在時返回 404', async () => {
      mockDbResults.schedules = []

      mockRequest = {
        method: 'PUT',
        json: vi.fn(async () => ({
          billing_amount: 8000
        }))
      }

      mockMatch = ['/api/v2/billing/999', '999']

      const response = await handleUpdateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockMatch,
        mockUrl
      )

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toContain('不存在')
    })

    it('應該驗證金額必須為非負數', async () => {
      mockDbResults.schedules = [{
        schedule_id: 1,
        client_service_id: 1,
        billing_type: 'monthly'
      }]

      mockRequest = {
        method: 'PUT',
        json: vi.fn(async () => ({
          billing_amount: -1000 // 負數
        }))
      }

      mockMatch = ['/api/v2/billing/1', '1']

      const response = await handleUpdateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockMatch,
        mockUrl
      )

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toContain('金額')
    })

    it('應該允許更新一次性收費的日期和說明', async () => {
      mockDbResults.schedules = [{
        schedule_id: 1,
        client_service_id: 1,
        billing_type: 'one-time'
      }]
      mockDbResults.client = {
        client_id: 'CLIENT001'
      }

      mockRequest = {
        method: 'PUT',
        json: vi.fn(async () => ({
          billing_date: '2024-04-15',
          description: '更新後的說明'
        }))
      }

      mockMatch = ['/api/v2/billing/1', '1']

      const response = await handleUpdateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockMatch,
        mockUrl
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
    })
  })

  // ========== 測試組 4: DELETE /api/v2/billing/batch - 批量刪除 ==========
  describe('DELETE /api/v2/billing/batch - 批量刪除收費計劃', () => {
    it('應該成功批量刪除收費計劃', async () => {
      mockDbResults.schedules = [
        {
          schedule_id: 1,
          client_service_id: 1,
          client_id: 'CLIENT001',
          assignee_user_id: 1
        },
        {
          schedule_id: 2,
          client_service_id: 1,
          client_id: 'CLIENT001',
          assignee_user_id: 1
        }
      ]

      mockRequest = {
        method: 'DELETE',
        json: vi.fn(async () => ({
          schedule_ids: [1, 2]
        }))
      }

      const response = await handleBatchDeleteBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.data.deleted_count).toBe(2)
      expect(data.data.deleted_ids).toEqual([1, 2])
      
      // 驗證使用了 batch 方法進行事務處理
      expect(mockEnv.DATABASE.batch).toHaveBeenCalled()
    })

    it('應該驗證 schedule_ids 必須為陣列', async () => {
      mockRequest = {
        method: 'DELETE',
        json: vi.fn(async () => ({
          schedule_ids: 'not-an-array'
        }))
      }

      const response = await handleBatchDeleteBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toContain('不能為空')
    })

    it('應該驗證 schedule_ids 不能為空', async () => {
      mockRequest = {
        method: 'DELETE',
        json: vi.fn(async () => ({
          schedule_ids: []
        }))
      }

      const response = await handleBatchDeleteBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toContain('不能為空')
    })

    it('應該驗證所有 ID 必須為正整數', async () => {
      mockRequest = {
        method: 'DELETE',
        json: vi.fn(async () => ({
          schedule_ids: [1, -1, 0, 'invalid']
        }))
      }

      const response = await handleBatchDeleteBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(422)
      const data = await response.json()
      expect(data.ok).toBe(false)
    })

    it('應該在記錄不存在時返回 404', async () => {
      mockDbResults.schedules = []

      mockRequest = {
        method: 'DELETE',
        json: vi.fn(async () => ({
          schedule_ids: [999, 1000]
        }))
      }

      const response = await handleBatchDeleteBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toContain('未找到')
    })

    it('應該在無權限時返回 403', async () => {
      mockDbResults.schedules = [
        {
          schedule_id: 1,
          client_service_id: 1,
          client_id: 'CLIENT001',
          assignee_user_id: 2 // 不同的負責人
        }
      ]
      mockCtx.user.is_admin = false
      mockCtx.user.user_id = 1

      mockRequest = {
        method: 'DELETE',
        json: vi.fn(async () => ({
          schedule_ids: [1]
        }))
      }

      const response = await handleBatchDeleteBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toContain('無權限')
    })

    it('應該驗證用戶身份（未登入）', async () => {
      mockCtx.user = null

      mockRequest = {
        method: 'DELETE',
        json: vi.fn(async () => ({
          schedule_ids: [1]
        }))
      }

      const response = await handleBatchDeleteBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toContain('未登入')
    })

    it('應該處理部分記錄不存在的情況', async () => {
      mockDbResults.schedules = [
        {
          schedule_id: 1,
          client_service_id: 1,
          client_id: 'CLIENT001',
          assignee_user_id: 1
        }
        // schedule_id 2 不存在
      ]

      mockRequest = {
        method: 'DELETE',
        json: vi.fn(async () => ({
          schedule_ids: [1, 2]
        }))
      }

      const response = await handleBatchDeleteBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.ok).toBe(false)
      expect(data.message).toContain('不存在')
    })

    it('應該使用事務處理確保原子性', async () => {
      mockDbResults.schedules = [
        {
          schedule_id: 1,
          client_service_id: 1,
          client_id: 'CLIENT001',
          assignee_user_id: 1
        },
        {
          schedule_id: 2,
          client_service_id: 1,
          client_id: 'CLIENT001',
          assignee_user_id: 1
        }
      ]

      mockRequest = {
        method: 'DELETE',
        json: vi.fn(async () => ({
          schedule_ids: [1, 2]
        }))
      }

      const response = await handleBatchDeleteBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(200)
      
      // 驗證事務處理：應該調用 BEGIN 和 COMMIT
      // 注意：由於 mock 的限制，我們主要驗證 batch 方法被調用
      expect(mockEnv.DATABASE.batch).toHaveBeenCalled()
    })
  })

  // ========== 測試組 5: 多服務關聯和多月份設定 ==========
  describe('多服務關聯和多月份設定', () => {
    it('應該支持為不同月份設定不同金額', async () => {
      // 這個測試主要驗證創建多個收費計劃（每個月份一個）
      mockDbResults.service = {
        client_service_id: 1,
        client_id: 'CLIENT001',
        service_id: 1,
        service_name: '記帳服務'
      }
      mockDbResults.lastInsertId = 100

      // 創建 1 月收費計劃
      mockRequest = {
        method: 'POST',
        json: vi.fn(async () => ({
          client_service_id: 1,
          billing_type: 'monthly',
          billing_year: 2024,
          billing_month: 1,
          billing_amount: 5000,
          payment_due_days: 30
        }))
      }

      const response1 = await handleCreateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response1.status).toBe(200)

      // 創建 2 月收費計劃（不同金額）
      mockDbResults.lastInsertId = 101
      mockRequest.json = vi.fn(async () => ({
        client_service_id: 1,
        billing_type: 'monthly',
        billing_year: 2024,
        billing_month: 2,
        billing_amount: 6000, // 不同金額
        payment_due_days: 30
      }))

      const response2 = await handleCreateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response2.status).toBe(200)
      const data2 = await response2.json()
      expect(data2.data.schedule_id).toBe(101)
    })
  })

  // ========== 測試組 6: 錯誤處理 ==========
  describe('錯誤處理', () => {
    it('應該處理 JSON 解析錯誤', async () => {
      // 注意：handleCreateBilling 沒有 try-catch 包圍 request.json()
      // 所以 JSON 解析錯誤會直接拋出，這在實際環境中會被上層錯誤處理器捕獲
      // 這裡我們測試的是如果 JSON 解析失敗，函數會拋出錯誤
      mockRequest = {
        method: 'POST',
        json: vi.fn(async () => {
          throw new Error('Invalid JSON')
        })
      }

      // 期望函數會拋出錯誤
      await expect(
        handleCreateBilling(
          mockRequest,
          mockEnv,
          mockCtx,
          mockRequestId,
          mockUrl
        )
      ).rejects.toThrow('Invalid JSON')
    })

    it('應該處理數據庫錯誤', async () => {
      // Mock 數據庫錯誤
      mockEnv.DATABASE.prepare = vi.fn(() => {
        const stmt = {
          bind: vi.fn(() => stmt),
          first: vi.fn(async () => {
            throw new Error('Database error')
          }),
          all: vi.fn(async () => {
            throw new Error('Database error')
          }),
          run: vi.fn(async () => {
            throw new Error('Database error')
          })
        }
        return stmt
      })

      mockRequest = {
        method: 'POST',
        json: vi.fn(async () => ({
          client_service_id: 1,
          billing_type: 'monthly',
          billing_month: 1,
          billing_amount: 5000
        }))
      }

      const response = await handleCreateBilling(
        mockRequest,
        mockEnv,
        mockCtx,
        mockRequestId,
        mockUrl
      )

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.ok).toBe(false)
    })
  })
})

