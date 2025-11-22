/**
 * 應計收入計算引擎單元測試
 * 測試 BR1.3.3.9 計算邏輯的準確性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateRecurringServiceRevenue,
  calculateOneTimeServiceRevenue,
  calculateAccruedRevenue,
  calculateMonthlyAccruedRevenue
} from '../../../backend/src/utils/billing-calculator.js'

describe('Billing Calculator - 應計收入計算引擎', () => {
  let mockEnv

  beforeEach(() => {
    // 創建 mock 環境
    mockEnv = {
      DATABASE: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({
            first: vi.fn(),
            all: vi.fn()
          }))
        }))
      }
    }
  })

  describe('定期服務收入分攤計算', () => {
    it('應該正確計算單一服務的分攤收入（12個月執行）', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      // Mock 定期服務收費計劃
      const mockPlan = {
        billing_plan_id: 1,
        year_total: 240000,
        client_id: clientId,
        billing_year: year
      }

      // Mock 服務資料（12個月執行）
      const mockServices = {
        results: [
          {
            client_service_id: 1,
            service_id: 1,
            service_name: '記帳服務',
            execution_months: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
            service_type: 'recurring'
          }
        ]
      }

      // Mock 月份明細
      const mockMonths = {
        results: Array.from({ length: 12 }, (_, i) => ({
          billing_month: i + 1,
          billing_amount: 20000
        }))
      }

      // 設置 mock 返回值
      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockPlan)
        }))
      })

      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue(mockServices)
        }))
      })

      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue(mockMonths)
        }))
      })

      const result = await calculateRecurringServiceRevenue(mockEnv, clientId, year)

      // 驗證結果
      expect(result.totalRecurringRevenue).toBe(240000)
      expect(result.services).toHaveLength(1)
      expect(result.services[0].executionCount).toBe(12)
      expect(result.services[0].annualAllocatedRevenue).toBe(240000)
      // monthlyRevenue 是數字（每月平均收入），不是對象
      expect(result.services[0].monthlyRevenue).toBe(20000) // 240000 / 12 = 20000
    })

    it('應該正確計算多個服務的分攤收入（按執行次數比例）', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      // Mock 定期服務收費計劃（總收費 240,000）
      const mockPlan = {
        billing_plan_id: 1,
        year_total: 240000,
        client_id: clientId,
        billing_year: year
      }

      // Mock 服務資料
      // 服務A：12個月執行
      // 服務B：6個月執行（1,3,5,7,9,11月）
      const mockServices = {
        results: [
          {
            client_service_id: 1,
            service_id: 1,
            service_name: '記帳服務A',
            execution_months: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
            service_type: 'recurring'
          },
          {
            client_service_id: 2,
            service_id: 2,
            service_name: '記帳服務B',
            execution_months: JSON.stringify([1, 3, 5, 7, 9, 11]),
            service_type: 'recurring'
          }
        ]
      }

      // Mock 月份明細（每月 20,000）
      const mockMonths = {
        results: Array.from({ length: 12 }, (_, i) => ({
          billing_month: i + 1,
          billing_amount: 20000
        }))
      }

      // 設置 mock
      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockPlan)
        }))
      })

      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue(mockServices)
        }))
      })

      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue(mockMonths)
        }))
      })

      const result = await calculateRecurringServiceRevenue(mockEnv, clientId, year)

      // 驗證總收費
      expect(result.totalRecurringRevenue).toBe(240000)

      // 驗證服務數量
      expect(result.services).toHaveLength(2)

      // 驗證執行次數
      expect(result.services[0].executionCount).toBe(12) // 服務A
      expect(result.services[1].executionCount).toBe(6)  // 服務B

      // 驗證分攤收入
      // 總執行次數 = 12 + 6 = 18
      // 服務A分攤 = 240000 × (12/18) = 160000
      // 服務B分攤 = 240000 × (6/18) = 80000
      expect(result.services[0].annualAllocatedRevenue).toBe(160000)
      expect(result.services[1].annualAllocatedRevenue).toBe(80000)

      // 驗證每月應計收入
      // 服務A每月平均 = 160000 ÷ 12 = 13333.33（四捨五入）
      // 注意：monthlyRevenue 是數字（每月平均），不是對象
      expect(result.services[0].monthlyRevenue).toBeCloseTo(13333.33, 2)
      
      // 服務B每月平均 = 80000 ÷ 6 = 13333.33
      expect(result.services[1].monthlyRevenue).toBeCloseTo(13333.33, 2)
      
      // 驗證執行月份
      expect(result.services[0].executionMonths).toContain(1)
      expect(result.services[0].executionMonths).toContain(12)
      expect(result.services[1].executionMonths).toContain(1)
      expect(result.services[1].executionMonths).toContain(3)
      expect(result.services[1].executionMonths).not.toContain(2) // 未執行月份
    })

    it('應該正確處理零執行次數情況（所有服務都沒有執行）', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      // Mock 定期服務收費計劃
      const mockPlan = {
        billing_plan_id: 1,
        year_total: 240000,
        client_id: clientId,
        billing_year: year
      }

      // Mock 服務資料（沒有執行月份）
      const mockServices = {
        results: [
          {
            client_service_id: 1,
            service_id: 1,
            service_name: '記帳服務',
            execution_months: JSON.stringify([]), // 空陣列
            service_type: 'recurring'
          }
        ]
      }

      // 設置 mock
      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockPlan)
        }))
      })

      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue(mockServices)
        }))
      })

      const result = await calculateRecurringServiceRevenue(mockEnv, clientId, year)

      // 驗證總收費保持不變
      expect(result.totalRecurringRevenue).toBe(240000)

      // 驗證服務分攤收入為 0
      expect(result.services).toHaveLength(1)
      expect(result.services[0].executionCount).toBe(0)
      expect(result.services[0].annualAllocatedRevenue).toBe(0)
      expect(result.services[0].monthlyRevenue).toBe(0) // 零執行次數時為 0
    })

    it('應該正確處理沒有收費計劃的情況', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      // Mock 沒有收費計劃
      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(null)
        }))
      })

      const result = await calculateRecurringServiceRevenue(mockEnv, clientId, year)

      expect(result.totalRecurringRevenue).toBe(0)
      expect(result.services).toHaveLength(0)
    })

    it('應該正確處理沒有關聯服務的情況', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      // Mock 收費計劃但沒有服務
      const mockPlan = {
        billing_plan_id: 1,
        year_total: 240000,
        client_id: clientId,
        billing_year: year
      }

      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockPlan)
        }))
      })

      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue({ results: [] })
        }))
      })

      const result = await calculateRecurringServiceRevenue(mockEnv, clientId, year)

      expect(result.totalRecurringRevenue).toBe(240000)
      expect(result.services).toHaveLength(0)
    })
  })

  describe('一次性服務收入計算', () => {
    it('應該正確計算一次性服務收入', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      // Mock 一次性服務收費計劃
      const mockPlans = {
        results: [
          {
            billing_plan_id: 1,
            year_total: 50000,
            billing_date: '2024-03-15',
            description: '設立費',
            client_service_id: 1,
            service_id: 1,
            service_name: '公司設立服務'
          }
        ]
      }

      // Mock 月份明細
      const mockMonths = {
        results: [
          {
            billing_month: 3,
            billing_amount: 50000
          }
        ]
      }

      // 設置 mock
      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue(mockPlans)
        }))
      })

      mockEnv.DATABASE.prepare.mockReturnValueOnce({
        bind: vi.fn(() => ({
          all: vi.fn().mockResolvedValue(mockMonths)
        }))
      })

      const result = await calculateOneTimeServiceRevenue(mockEnv, clientId, year)

      expect(result.services).toHaveLength(1)
      expect(result.services[0].annualRevenue).toBe(50000)
      expect(result.services[0].monthlyRevenue[3]).toBe(50000)
      expect(result.services[0].monthlyRevenue[1] || 0).toBe(0) // 其他月份為 0
    })

    it('應該正確處理多個一次性服務', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      // Mock 多個一次性服務
      const mockPlans = {
        results: [
          {
            billing_plan_id: 1,
            year_total: 50000,
            billing_date: '2024-03-15',
            description: '設立費',
            client_service_id: 1,
            service_id: 1,
            service_name: '公司設立服務'
          },
          {
            billing_plan_id: 2,
            year_total: 30000,
            billing_date: '2024-06-20',
            description: '顧問費',
            client_service_id: 2,
            service_id: 2,
            service_name: '顧問服務'
          }
        ]
      }

      // Mock 月份明細
      const mockMonths1 = {
        results: [{ billing_month: 3, billing_amount: 50000 }]
      }
      const mockMonths2 = {
        results: [{ billing_month: 6, billing_amount: 30000 }]
      }

      // 設置 mock
      let callCount = 0
      mockEnv.DATABASE.prepare.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            bind: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(mockPlans)
            }))
          }
        } else if (callCount === 2) {
          return {
            bind: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(mockMonths1)
            }))
          }
        } else {
          return {
            bind: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(mockMonths2)
            }))
          }
        }
      })

      const result = await calculateOneTimeServiceRevenue(mockEnv, clientId, year)

      expect(result.services).toHaveLength(2)
      expect(result.services[0].annualRevenue).toBe(50000)
      expect(result.services[1].annualRevenue).toBe(30000)
    })
  })

  describe('年度應計收入總表計算', () => {
    it('應該正確計算年度總應計收入', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      mockEnv.DATABASE.prepare.mockImplementation((sql) => {
        const sqlLower = sql.toLowerCase()
        
        return {
          bind: vi.fn((...bindArgs) => {
            // 定期服務收費計劃查詢（calculateRecurringServiceRevenue 的第一個查詢）
            if (sqlLower.includes('billing_type = \'recurring\'') && 
                sqlLower.includes('where') && 
                sqlLower.includes('client_id = ?') &&
                sqlLower.includes('billing_year = ?')) {
              return {
                first: vi.fn().mockResolvedValue({
                  billing_plan_id: 1,
                  year_total: 240000
                }),
                all: vi.fn().mockResolvedValue({ results: [] }),
                run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
              }
            }
            
            // 定期服務關聯查詢（calculateRecurringServiceRevenue 的第二個查詢）
            if (sqlLower.includes('billingplanservices') && 
                sqlLower.includes('billing_plan_id = ?') &&
                sqlLower.includes('inner join clientservices')) {
              return {
                first: vi.fn().mockResolvedValue(null),
                all: vi.fn().mockResolvedValue({
                  results: [{
                    client_service_id: 1,
                    service_id: 1,
                    service_name: '記帳服務',
                    execution_months: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
                    service_type: 'recurring'
                  }]
                }),
                run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
              }
            }
            
            // 定期服務月份明細查詢（calculateRecurringServiceRevenue 的第三個查詢）
            // 使用 bindArgs 來判斷 billing_plan_id = 1
            if (sqlLower.includes('billingplanmonths') && 
                sqlLower.includes('billing_plan_id = ?') &&
                sqlLower.includes('order by billing_month') &&
                !sqlLower.includes('from billingplans')) {
              // 檢查 bind 參數中的 billing_plan_id
              if (bindArgs && bindArgs.length > 0 && bindArgs[0] === 1) {
                return {
                  first: vi.fn().mockResolvedValue(null),
                  all: vi.fn().mockResolvedValue({
                    results: Array.from({ length: 12 }, (_, i) => ({
                      billing_month: i + 1,
                      billing_amount: 20000
                    }))
                  }),
                  run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
                }
              }
            }
            
            // 一次性服務收費計劃查詢（calculateOneTimeServiceRevenue 的第一個查詢）
            // 注意：SQL 包含 FROM BillingPlans bp 和 INNER JOIN
            if (sqlLower.includes('from billingplans bp') && 
                sqlLower.includes('billing_type = \'one-time\'') && 
                sqlLower.includes('inner join billingplanservices')) {
              return {
                first: vi.fn().mockResolvedValue(null),
                all: vi.fn().mockResolvedValue({
                  results: [{
                    billing_plan_id: 2,
                    year_total: 50000,
                    billing_date: '2024-03-15',
                    description: '設立費',
                    client_service_id: 2,
                    service_id: 2,
                    service_name: '設立服務'
                  }]
                }),
                run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
              }
            }
            
            // 一次性服務月份明細查詢（calculateOneTimeServiceRevenue 的 Promise.all 中調用）
            // 使用 bindArgs 來判斷 billing_plan_id = 2
            if (sqlLower.includes('billingplanmonths') && 
                sqlLower.includes('billing_plan_id = ?') &&
                sqlLower.includes('order by billing_month')) {
              // 檢查 bind 參數中的 billing_plan_id
              if (bindArgs && bindArgs.length > 0 && bindArgs[0] === 2) {
                return {
                  first: vi.fn().mockResolvedValue(null),
                  all: vi.fn().mockResolvedValue({
                    results: [{
                      billing_month: 3,
                      billing_amount: 50000
                    }]
                  }),
                  run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
                }
              }
            }
            
            // 默認返回
            return {
              first: vi.fn().mockResolvedValue(null),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1 } })
            }
          })
        }
      })

      const result = await calculateAccruedRevenue(mockEnv, clientId, year)

      expect(result.clientId).toBe(clientId)
      expect(result.year).toBe(year)
      expect(result.summary.totalRecurringRevenue).toBe(240000)
      expect(result.summary.totalOneTimeRevenue).toBe(50000)
      expect(result.summary.totalAnnualRevenue).toBe(290000)
    })
  })
})

