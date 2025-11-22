/**
 * BillingPlanModel 單元測試
 * 測試資料模型的驗證和關聯完整性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BillingPlanModel } from '../../../backend/src/models/BillingPlanModel.js'

describe('BillingPlanModel', () => {
  let model
  let mockEnv
  let mockDb
  let prepareCallCount

  beforeEach(() => {
    prepareCallCount = 0
    
    // 創建 mock 資料庫
    mockDb = {
      prepare: vi.fn((sql) => {
        prepareCallCount++
        const sqlLower = sql.toLowerCase()
        
        return {
          bind: vi.fn((...args) => {
            // 默認返回一個完整的查詢對象
            return {
              first: vi.fn().mockResolvedValue(null),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1, changes: 1 } })
            }
          })
        }
      }),
      batch: vi.fn(),
      exec: vi.fn()
    }

    // 創建 mock 環境
    mockEnv = {
      DATABASE: mockDb
    }

    model = new BillingPlanModel(mockEnv)
  })

  describe('驗證函數', () => {
    it('應該在建立計劃時驗證年度參數', async () => {
      const invalidPlanData = {
        clientId: 'CLIENT001',
        billingYear: 1999, // 無效年度
        billingType: 'recurring',
        months: [],
        clientServiceIds: []
      }

      await expect(model.create(invalidPlanData)).rejects.toThrow()
    })

    it('應該在建立計劃時驗證月份參數', async () => {
      const invalidPlanData = {
        clientId: 'CLIENT001',
        billingYear: 2024,
        billingType: 'recurring',
        months: [
          { month: 13, amount: 10000 } // 無效月份
        ],
        clientServiceIds: [1]
      }

      await expect(model.create(invalidPlanData)).rejects.toThrow()
    })

    it('應該在建立計劃時驗證金額參數', async () => {
      const invalidPlanData = {
        clientId: 'CLIENT001',
        billingYear: 2024,
        billingType: 'recurring',
        months: [
          { month: 1, amount: -1000 } // 無效金額
        ],
        clientServiceIds: [1]
      }

      await expect(model.create(invalidPlanData)).rejects.toThrow()
    })
  })

  describe('建立收費計劃', () => {
    it('應該成功建立定期服務收費計劃', async () => {
      // 重置並設置所有需要的 mock
      vi.clearAllMocks()
      prepareCallCount = 0
      
      // 第一次：檢查重複計劃
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null), // 沒有重複
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第二次：查詢服務（定期服務）- 在插入計劃之前驗證服務類型
      // 注意：這個查詢是在插入計劃之前進行的，用於驗證服務類型
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({
            results: [
              { client_service_id: 1, service_type: 'recurring' },
              { client_service_id: 2, service_type: 'recurring' }
            ]
          }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第三次：插入收費計劃
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第四、五次：插入月份明細（2次）
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 2 } })
        }))
      })

      // 第六、七次：插入服務關聯（2次）
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 2 } })
        }))
      })

      // 第八次：查詢建立的計劃（findById）
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            billing_plan_id: 1,
            client_id: 'CLIENT001',
            billing_year: 2024,
            billing_type: 'recurring',
            year_total: 40000
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第九次：查詢月份明細
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({
            results: [
              { billing_plan_month_id: 1, billing_month: 1, billing_amount: 20000 },
              { billing_plan_month_id: 2, billing_month: 2, billing_amount: 20000 }
            ]
          }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第十次：查詢服務關聯
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({
            results: [
              { billing_plan_service_id: 1, client_service_id: 1 },
              { billing_plan_service_id: 2, client_service_id: 2 }
            ]
          }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      const planData = {
        clientId: 'CLIENT001',
        billingYear: 2024,
        billingType: 'recurring',
        paymentDueDays: 30,
        months: [
          { month: 1, amount: 20000 },
          { month: 2, amount: 20000 }
        ],
        clientServiceIds: [1, 2]
      }

      const result = await model.create(planData)

      expect(result).toBeDefined()
      expect(result.billingPlanId).toBe(1)
      expect(result.billingType).toBe('recurring')
      expect(result.yearTotal).toBe(40000)
    })

    it('應該成功建立一次性服務收費計劃', async () => {
      // 重置 prepareCallCount 和清除所有 mock
      prepareCallCount = 0
      vi.clearAllMocks()
      
      // 使用智能 mockImplementation 來處理所有查詢
      // 注意：一次性服務不需要檢查重複計劃（只有定期服務需要）
      let callSequence = 0
      mockDb.prepare.mockImplementation((sql) => {
        callSequence++
        const sqlLower = sql.toLowerCase()
        
        return {
          bind: vi.fn((...args) => {
            // 第一次：驗證服務類型（查詢 ClientServices）
            // 注意：一次性服務不會調用 findByClientAndYear，所以第一次查詢就是驗證服務
            if (callSequence === 1 && sqlLower.includes('clientservices') && sqlLower.includes('client_service_id in')) {
              return {
                first: vi.fn().mockResolvedValue(null),
                all: vi.fn().mockResolvedValue({
                  results: [{ client_service_id: 1, service_type: 'one-time' }]
                }),
                run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
              }
            }
            
            // 第二次：插入收費計劃
            if (callSequence === 2 && sqlLower.includes('insert into billingplans')) {
              return {
                first: vi.fn().mockResolvedValue(null),
                all: vi.fn().mockResolvedValue({ results: [] }),
                run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
              }
            }
            
            // 第三次：插入月份明細
            if (callSequence === 3 && sqlLower.includes('insert into billingplanmonths')) {
              return {
                first: vi.fn().mockResolvedValue(null),
                all: vi.fn().mockResolvedValue({ results: [] }),
                run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
              }
            }
            
            // 第四次：插入服務關聯
            if (callSequence === 4 && sqlLower.includes('insert into billingplanservices')) {
              return {
                first: vi.fn().mockResolvedValue(null),
                all: vi.fn().mockResolvedValue({ results: [] }),
                run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
              }
            }
            
            // 第五次：findById 查詢主記錄
            if (callSequence === 5 && sqlLower.includes('select') && sqlLower.includes('billing_plan_id = ?') && sqlLower.includes('from billingplans')) {
              return {
                first: vi.fn().mockResolvedValue({
                  billing_plan_id: 1,
                  client_id: 'CLIENT001',
                  billing_year: 2024,
                  billing_type: 'one-time',
                  year_total: 50000,
                  billing_date: '2024-03-15',
                  description: '設立費',
                  payment_due_days: 30
                }),
                all: vi.fn().mockResolvedValue({ results: [] }),
                run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
              }
            }
            
            // 第六次：findById 查詢月份明細
            if (callSequence === 6 && sqlLower.includes('billingplanmonths') && sqlLower.includes('billing_plan_id = ?')) {
              return {
                first: vi.fn().mockResolvedValue(null),
                all: vi.fn().mockResolvedValue({
                  results: [
                    { billing_plan_month_id: 1, billing_month: 3, billing_amount: 50000 }
                  ]
                }),
                run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
              }
            }
            
            // 第七次：findById 查詢服務關聯
            if (callSequence === 7 && sqlLower.includes('billingplanservices') && sqlLower.includes('billing_plan_id = ?')) {
              return {
                first: vi.fn().mockResolvedValue(null),
                all: vi.fn().mockResolvedValue({
                  results: [
                    { billing_plan_service_id: 1, client_service_id: 1 }
                  ]
                }),
                run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
              }
            }
            
            // 默認返回
            return {
              first: vi.fn().mockResolvedValue(null),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1, changes: 1 } })
            }
          })
        }
      })

      const planData = {
        clientId: 'CLIENT001',
        billingYear: 2024,
        billingType: 'one-time',
        paymentDueDays: 30,
        billingDate: '2024-03-15',
        description: '設立費',
        months: [
          { month: 3, amount: 50000 }
        ],
        clientServiceIds: [1]
      }

      const result = await model.create(planData)

      expect(result).toBeDefined()
      expect(result.billingPlanId).toBe(1)
      expect(result.billingType).toBe('one-time')
      expect(result.yearTotal).toBe(50000)
      expect(result.billingDate).toBe('2024-03-15')
      expect(result.description).toBe('設立費')
    })

    it('應該拒絕建立重複的定期服務收費計劃', async () => {
      // 重置並設置 mock
      vi.clearAllMocks()
      prepareCallCount = 0
      
      // 第一次：檢查重複計劃 - 返回已存在的計劃
      // 注意：findByClientAndYear 會先查詢主記錄，然後調用 findById
      // 第一次：查詢主記錄（返回已存在的計劃 ID）
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            billing_plan_id: 1
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第二次：findById 查詢主記錄
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            billing_plan_id: 1,
            client_id: 'CLIENT001',
            billing_year: 2024,
            billing_type: 'recurring',
            year_total: 100
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第三次：findById 查詢月份明細
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第四次：findById 查詢服務關聯
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      const planData = {
        clientId: 'CLIENT001',
        billingYear: 2024,
        billingType: 'recurring',
        months: [
          { month: 1, amount: 100 }
        ],
        clientServiceIds: [1]
      }

      await expect(model.create(planData)).rejects.toThrow('already exists')
    })
  })

  describe('驗證必填欄位', () => {
    it('應該驗證必填欄位', async () => {
      await expect(model.create({
        clientId: 'CLIENT001',
        billingYear: 2024,
        billingType: 'invalid' // 無效類型
      })).rejects.toThrow()
    })

    it('應該驗證一次性服務的必填欄位', async () => {
      await expect(model.create({
        clientId: 'CLIENT001',
        billingYear: 2024,
        billingType: 'one-time',
        clientServiceIds: [1]
        // 缺少 billingDate
      })).rejects.toThrow('billingDate is required')
    })
  })

  describe('查詢收費計劃', () => {
    it('應該根據客戶和年度查詢計劃', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      // 重置 mock
      vi.clearAllMocks()
      prepareCallCount = 0

      // 第一次：findByClientAndYear 查詢主記錄（返回 billing_plan_id）
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            billing_plan_id: 1
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第二次：findById 查詢計劃主記錄
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            billing_plan_id: 1,
            client_id: clientId,
            billing_year: year,
            billing_type: 'recurring',
            year_total: 240000
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第三次：findById 查詢月份明細
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({
            results: [
              { billing_plan_month_id: 1, billing_month: 1, billing_amount: 20000 }
            ]
          }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      // 第四次：findById 查詢服務關聯
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({
            results: [
              { billing_plan_service_id: 1, client_service_id: 1 }
            ]
          }),
          run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
        }))
      })

      const result = await model.findByClientAndYear(clientId, year, 'recurring')

      expect(result).toBeDefined()
      expect(result.billingPlanId).toBe(1)
      expect(result.billingType).toBe('recurring')
    })
  })

  describe('更新收費計劃', () => {
    it('應該成功更新收費計劃', async () => {
      const planId = 1
      const updateData = {
        paymentDueDays: 45,
        notes: '更新備註'
      }

      // 覆蓋 findById 的查詢
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            billing_plan_id: planId,
            client_id: 'CLIENT001',
            billing_year: 2024,
            billing_type: 'recurring'
          })
        }))
      })

      const result = await model.update(planId, updateData)

      expect(result).toBeDefined()
    })
  })

  describe('刪除收費計劃', () => {
    it('應該成功刪除收費計劃', async () => {
      const planId = 1

      // 覆蓋 findById 的查詢（檢查計劃是否存在）
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            billing_plan_id: planId,
            client_id: 'CLIENT001'
          })
        }))
      })

      const result = await model.delete(planId)

      expect(result).toBe(true)
    })

    it('應該拒絕刪除不存在的計劃', async () => {
      const planId = 999

      // 覆蓋 findById 的查詢（返回 null）
      mockDb.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null)
        }))
      })

      const result = await model.delete(planId)
      expect(result).toBe(false)
    })
  })
})
