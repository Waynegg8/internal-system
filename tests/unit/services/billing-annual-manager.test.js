/**
 * BillingAnnualManager 單元測試
 * 測試年度自動建立和複製邏輯
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// 創建一個全局變數來存儲 mock model 實例
let mockModelInstance = null

// Mock BillingPlanModel - 必須在 import 之前
vi.mock('../../../backend/src/models/BillingPlanModel.js', () => {
  // 創建一個構造函數類
  const MockBillingPlanModel = function() {
    // 返回全局的 mockModelInstance
    if (!mockModelInstance) {
      mockModelInstance = {
        findByClientAndYear: vi.fn(),
        findByClientAndYearAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        getClientServicesByIds: vi.fn()
      }
    }
    return mockModelInstance
  }
  
  return {
    BillingPlanModel: MockBillingPlanModel
  }
})

import {
  checkAndCreateAnnualBillingPlans,
  copyPreviousYearRecurringPlans,
  getAnnualBillingStatus
} from '../../../backend/src/services/billing-annual-manager.js'
import { BillingPlanModel } from '../../../backend/src/models/BillingPlanModel.js'

describe('BillingAnnualManager - 年度收費計劃自動化管理', () => {
  let mockEnv
  let mockModel

  beforeEach(async () => {
    mockEnv = {
      DATABASE: {
        prepare: vi.fn()
      }
    }

    // 重置全局 mockModelInstance
    mockModelInstance = {
      findByClientAndYear: vi.fn(),
      findByClientAndYearAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      getClientServicesByIds: vi.fn()
    }
    
    mockModel = mockModelInstance

    // 清除之前的 mock
    vi.clearAllMocks()
  })

  describe('checkAndCreateAnnualBillingPlans', () => {
    it('應該在目標年度已有計劃時返回現有計劃', async () => {
      const clientId = 'CLIENT001'
      const targetYear = 2024

      const existingPlan = {
        billingPlanId: 1,
        billingYear: targetYear,
        billingType: 'recurring',
        yearTotal: 240000
      }

      mockModel.findByClientAndYear.mockResolvedValue(existingPlan)

      const result = await checkAndCreateAnnualBillingPlans(mockEnv, clientId, targetYear)

      expect(result.created).toBe(false)
      expect(result.billingPlan).toEqual(existingPlan)
      expect(result.copiedFrom).toBeNull()
    })

    it('應該從上一年度複製計劃到新年度', async () => {
      const clientId = 'CLIENT001'
      const targetYear = 2024
      const previousYear = 2023

      // 目標年度沒有計劃
      mockModel.findByClientAndYear.mockResolvedValueOnce(null)

      // 上一年度有計劃（簡化版本，用於 checkAndCreateAnnualBillingPlans）
      // 注意：copyPreviousYearRecurringPlans 會直接使用 findByClientAndYear 返回的計劃的所有屬性
      const previousPlanSimple = {
        billingPlanId: 1,
        billingYear: previousYear,
        billingType: 'recurring',
        yearTotal: 240000,
        paymentDueDays: 30,
        notes: null,
        months: [
          { month: 1, amount: 20000 },
          { month: 2, amount: 20000 }
        ],
        services: [
          { clientServiceId: 1 }
        ]
      }

      // 完整計劃資料（用於 copyPreviousYearRecurringPlans 中的 findById）
      const previousPlanFull = {
        billingPlanId: 1,
        billingYear: previousYear,
        billingType: 'recurring',
        yearTotal: 240000,
        paymentDueDays: 30,
        months: [
          { month: 1, amount: 20000 },
          { month: 2, amount: 20000 }
        ],
        services: [
          { clientServiceId: 1 }
        ]
      }

      // 第二次調用返回上一年度的計劃（用於 checkAndCreateAnnualBillingPlans）
      mockModel.findByClientAndYear.mockResolvedValueOnce(previousPlanSimple)

      // copyPreviousYearRecurringPlans 會再次調用 findByClientAndYear
      // 第一次：查詢來源年度計劃（copyPreviousYearRecurringPlans 會重新查詢）
      mockModel.findByClientAndYear.mockResolvedValueOnce(previousPlanSimple)
      // 第二次：檢查目標年度是否已有計劃（應該沒有）
      mockModel.findByClientAndYear.mockResolvedValueOnce(null)

      // Mock 查詢完整計劃資料（copyPreviousYearRecurringPlans 會調用 findById）
      mockModel.findById.mockResolvedValue(previousPlanFull)

      // Mock 資料庫查詢服務（copyPreviousYearRecurringPlans 會驗證服務）
      mockEnv.DATABASE.prepare.mockReturnValue({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            client_service_id: 1,
            service_type: 'recurring',
            is_deleted: 0
          })
        }))
      })

      // Mock 建立新計劃
      const newPlan = {
        billingPlanId: 2,
        billingYear: targetYear,
        billingType: 'recurring',
        yearTotal: 240000
      }
      mockModel.create.mockResolvedValue(newPlan)

      const result = await checkAndCreateAnnualBillingPlans(mockEnv, clientId, targetYear)

      expect(result.created).toBe(true)
      expect(result.copiedFrom).toBe(previousYear)
      expect(mockModel.create).toHaveBeenCalled()
    })

    it('應該在上一年度沒有計劃時返回空結果', async () => {
      const clientId = 'CLIENT001'
      const targetYear = 2024

      // 目標年度沒有計劃
      mockModel.findByClientAndYear.mockResolvedValueOnce(null)
      // 上一年度也沒有計劃
      mockModel.findByClientAndYear.mockResolvedValueOnce(null)

      const result = await checkAndCreateAnnualBillingPlans(mockEnv, clientId, targetYear)

      expect(result.created).toBe(false)
      expect(result.billingPlan).toBeNull()
      expect(result.copiedFrom).toBeNull()
      expect(result.message).toContain('No recurring billing plan found')
    })

    it('應該在強制模式下重新建立計劃', async () => {
      const clientId = 'CLIENT001'
      const targetYear = 2024

      const existingPlan = {
        billingPlanId: 1,
        billingYear: targetYear
      }

      // 目標年度有計劃
      mockModel.findByClientAndYear.mockResolvedValueOnce(existingPlan)
      
      // 上一年度有計劃（簡化版本）
      // 注意：copyPreviousYearRecurringPlans 會直接使用 findByClientAndYear 返回的計劃的所有屬性
      // 注意：如果 services 是空陣列，validServiceIds 也會是空陣列，會導致錯誤
      // 所以我們需要至少有一個服務
      const previousPlanSimple = {
        billingPlanId: 2,
        billingYear: 2023,
        billingType: 'recurring',
        paymentDueDays: 30,
        notes: null,
        months: [],
        services: [
          { clientServiceId: 1 }
        ]
      }
      
      // 完整計劃資料
      const previousPlanFull = {
        billingPlanId: 2,
        billingYear: 2023,
        billingType: 'recurring',
        months: [],
        services: [
          { clientServiceId: 1 }
        ]
      }
      
      mockModel.findByClientAndYear.mockResolvedValueOnce(previousPlanSimple)
      
      // copyPreviousYearRecurringPlans 會再次調用 findByClientAndYear
      // 第一次：查詢來源年度計劃（copyPreviousYearRecurringPlans 會重新查詢）
      mockModel.findByClientAndYear.mockResolvedValueOnce(previousPlanSimple)
      // 第二次：檢查目標年度是否已有計劃（刪除後應該沒有）
      mockModel.findByClientAndYear.mockResolvedValueOnce(null)
      
      mockModel.findById.mockResolvedValue(previousPlanFull)

      // Mock 資料庫查詢服務
      mockEnv.DATABASE.prepare.mockReturnValue({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            client_service_id: 1,
            service_type: 'recurring',
            is_deleted: 0
          })
        }))
      })

      const newPlan = { billingPlanId: 3, billingYear: targetYear }
      mockModel.create.mockResolvedValue(newPlan)

      const result = await checkAndCreateAnnualBillingPlans(mockEnv, clientId, targetYear, { force: true })

      expect(mockModel.delete).toHaveBeenCalledWith(existingPlan.billingPlanId)
      expect(result.created).toBe(true)
    })

    it('應該驗證年度參數', async () => {
      const clientId = 'CLIENT001'

      // 無效年度
      await expect(
        checkAndCreateAnnualBillingPlans(mockEnv, clientId, 1999)
      ).rejects.toThrow('Invalid targetYear')

      await expect(
        checkAndCreateAnnualBillingPlans(mockEnv, clientId, 2101)
      ).rejects.toThrow('Invalid targetYear')
    })

    it('應該驗證客戶 ID', async () => {
      await expect(
        checkAndCreateAnnualBillingPlans(mockEnv, null, 2024)
      ).rejects.toThrow('clientId is required')
    })
  })

  describe('copyPreviousYearRecurringPlans', () => {
    it('應該正確複製上一年度的計劃', async () => {
      const clientId = 'CLIENT001'
      const sourceYear = 2023
      const targetYear = 2024

      // 簡化版本（findByClientAndYear 返回）
      // 注意：copyPreviousYearRecurringPlans 會直接使用 findByClientAndYear 返回的計劃的所有屬性
      const sourcePlanSimple = {
        billingPlanId: 1,
        billingYear: sourceYear,
        billingType: 'recurring',
        yearTotal: 240000,
        paymentDueDays: 30,
        notes: '備註',
        months: [
          { month: 1, amount: 20000, paymentDueDays: 30 },
          { month: 2, amount: 20000, paymentDueDays: 30 }
        ],
        services: [
          { clientServiceId: 1 },
          { clientServiceId: 2 }
        ]
      }

      // 完整版本（findById 返回）
      const sourcePlanFull = {
        billingPlanId: 1,
        billingYear: sourceYear,
        billingType: 'recurring',
        yearTotal: 240000,
        paymentDueDays: 30,
        notes: '備註',
        months: [
          { month: 1, amount: 20000, paymentDueDays: 30 },
          { month: 2, amount: 20000, paymentDueDays: 30 }
        ],
        services: [
          { clientServiceId: 1 },
          { clientServiceId: 2 }
        ]
      }

      // 第一次：查詢來源年度計劃（copyPreviousYearRecurringPlans 會調用）
      // 注意：copyPreviousYearRecurringPlans 會直接使用 findByClientAndYear 返回的計劃的 services
      mockModel.findByClientAndYear.mockResolvedValueOnce(sourcePlanSimple)
      // 第二次：檢查目標年度是否已有計劃（應該沒有）
      mockModel.findByClientAndYear.mockResolvedValueOnce(null)

      // Mock 資料庫查詢服務（驗證服務是否存在）
      // 需要為每個服務返回結果
      let serviceCallCount = 0
      mockEnv.DATABASE.prepare.mockImplementation(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockImplementation(() => {
            serviceCallCount++
            return Promise.resolve({
              client_service_id: serviceCallCount,
              service_type: 'recurring',
              is_deleted: 0
            })
          })
        }))
      }))

      const newPlan = {
        billingPlanId: 2,
        billingYear: targetYear,
        billingType: 'recurring',
        yearTotal: 240000
      }
      mockModel.create.mockResolvedValue(newPlan)

      const result = await copyPreviousYearRecurringPlans(
        mockEnv,
        clientId,
        sourceYear,
        targetYear
      )

      expect(result).toEqual(newPlan)
      expect(mockModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId,
          billingYear: targetYear,
          billingType: 'recurring',
          paymentDueDays: 30,
          months: sourcePlanFull.months,
          clientServiceIds: [1, 2]
        })
      )
    })

    it('應該只複製定期服務計劃', async () => {
      const clientId = 'CLIENT001'
      const sourceYear = 2023
      const targetYear = 2024

      // 簡化版本（findByClientAndYear 返回）
      // 注意：copyPreviousYearRecurringPlans 會直接使用 findByClientAndYear 返回的計劃的所有屬性
      const sourcePlanSimple = {
        billingPlanId: 1,
        billingYear: sourceYear,
        billingType: 'recurring',
        paymentDueDays: 30,
        notes: null,
        months: [],
        services: [
          { clientServiceId: 1, serviceType: 'recurring' },
          { clientServiceId: 2, serviceType: 'one-time' }
        ]
      }

      // 完整版本（包含一次性服務，應該被過濾）
      const sourcePlanFull = {
        billingPlanId: 1,
        billingYear: sourceYear,
        billingType: 'recurring',
        months: [],
        services: [
          { clientServiceId: 1, serviceType: 'recurring' },
          { clientServiceId: 2, serviceType: 'one-time' } // 應該被過濾
        ]
      }

      // 第一次：查詢來源年度計劃
      mockModel.findByClientAndYear.mockResolvedValueOnce(sourcePlanSimple)
      // 第二次：檢查目標年度是否已有計劃（應該沒有）
      mockModel.findByClientAndYear.mockResolvedValueOnce(null)

      // Mock 資料庫查詢服務（第一個是定期服務，第二個是一次性服務）
      let serviceCallCount = 0
      mockEnv.DATABASE.prepare.mockImplementation(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockImplementation(() => {
            serviceCallCount++
            if (serviceCallCount === 1) {
              return Promise.resolve({
                client_service_id: 1,
                service_type: 'recurring',
                is_deleted: 0
              })
            } else {
              return Promise.resolve({
                client_service_id: 2,
                service_type: 'one-time',
                is_deleted: 0
              })
            }
          })
        }))
      }))

      const newPlan = { billingPlanId: 2, billingYear: targetYear }
      mockModel.create.mockResolvedValue(newPlan)

      await copyPreviousYearRecurringPlans(mockEnv, clientId, sourceYear, targetYear)

      // 驗證只包含定期服務
      const createCall = mockModel.create.mock.calls[0][0]
      expect(createCall.clientServiceIds).toEqual([1]) // 只有定期服務
    })
  })

  describe('getAnnualBillingStatus', () => {
    it('應該正確返回年度收費狀態', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      // Mock findByClientAndYearAll 返回所有計劃
      mockModel.findByClientAndYearAll.mockResolvedValue([
        { billingPlanId: 1, billingType: 'recurring' },
        { billingPlanId: 2, billingType: 'one-time' },
        { billingPlanId: 3, billingType: 'one-time' }
      ])

      const result = await getAnnualBillingStatus(mockEnv, clientId, year)

      expect(result.hasRecurringPlan).toBe(true)
      expect(result.hasOneTimePlans).toBe(true)
      expect(result.canAutoCreate).toBeDefined()
    })

    it('應該在沒有計劃時返回正確狀態', async () => {
      const clientId = 'CLIENT001'
      const year = 2024

      // Mock findByClientAndYearAll 返回空陣列
      mockModel.findByClientAndYearAll.mockResolvedValue([])
      
      // Mock 查詢上一年度（用於判斷 canAutoCreate）
      mockModel.findByClientAndYear.mockResolvedValue(null)

      const result = await getAnnualBillingStatus(mockEnv, clientId, year)

      expect(result.hasRecurringPlan).toBe(false)
      expect(result.hasOneTimePlans).toBe(false)
      expect(result.canAutoCreate).toBe(false)
    })
  })
})

