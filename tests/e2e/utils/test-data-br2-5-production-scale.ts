/**
 * BR2.5 生產規模測試數據設置工具
 * 
 * 用於設置接近生產環境數據量的測試數據
 * 目標：50-100客戶，每個客戶7-8個服務，每個服務6-7個任務配置
 */

import type { Page } from '@playwright/test'
import { callAPI, createTestClient, createTestUser } from './test-data'

/**
 * 設置生產規模的 BR2.5 測試數據
 * 
 * @param page Playwright Page 對象
 * @param options 配置選項
 * @returns 測試數據
 */
export async function setupBR2_5ProductionScaleTestData(
  page: Page,
  options: {
    clientCount?: number // 客戶數量，默認50
    servicesPerClient?: number // 每個客戶的服務數量，默認7
    tasksPerService?: number // 每個服務的任務配置數量，默認6
  } = {}
): Promise<{
  adminUserId?: number
  employeeUserId?: number
  testClients: Array<{ clientId: string; companyName: string; taxId: string }>
  testClientServices: Array<{ 
    clientServiceId: number
    clientId: string
    serviceId: number
    serviceName: string
    serviceType: 'recurring' | 'one-time'
  }>
  testTaskConfigs: Array<{
    configId: number
    clientServiceId: number
    taskName: string
    generationTimeRule?: string
    generationTimeParams?: string
    isFixedDeadline?: boolean
  }>
}> {
  const {
    clientCount = 50, // 默認50個客戶（生產環境100個的一半，用於測試）
    servicesPerClient = 7, // 每個客戶7個服務
    tasksPerService = 6 // 每個服務6個任務配置
  } = options

  const result: {
    adminUserId?: number
    employeeUserId?: number
    testClients: Array<{ clientId: string; companyName: string; taxId: string }>
    testClientServices: Array<{ 
      clientServiceId: number
      clientId: string
      serviceId: number
      serviceName: string
      serviceType: 'recurring' | 'one-time'
    }>
    testTaskConfigs: Array<{
      configId: number
      clientServiceId: number
      taskName: string
      generationTimeRule?: string
      generationTimeParams?: string
      isFixedDeadline?: boolean
    }>
  } = {
    testClients: [],
    testClientServices: [],
    testTaskConfigs: []
  }

  try {
    console.log(`[BR2.5 Production Scale] 開始設置測試數據：${clientCount}個客戶，每個${servicesPerClient}個服務，每個${tasksPerService}個任務配置`)

    // 1. 獲取管理員用戶 ID
    const usersResponse = await callAPI(page, 'GET', '/settings/users')
    if (!usersResponse?.ok || !usersResponse?.data?.length) {
      throw new Error('無法獲取用戶列表')
    }
    
    const adminUser = usersResponse.data.find((u: any) => u.is_admin || u.isAdmin)
    if (adminUser) {
      result.adminUserId = adminUser.user_id || adminUser.id
    } else {
      // 創建測試管理員
      const newAdminId = await createTestUser(page, {
        username: `test_admin_br2_5_scale_${Date.now()}`,
        name: '測試管理員（BR2.5生產規模）',
        isAdmin: true
      })
      if (newAdminId) {
        result.adminUserId = newAdminId
      }
    }

    // 2. 獲取服務列表
    const servicesResponse = await callAPI(page, 'GET', '/settings/services')
    if (!servicesResponse?.ok || !servicesResponse?.data?.length) {
      throw new Error('無法獲取服務列表')
    }
    
    const recurringServices = servicesResponse.data.filter((s: any) => s.service_type === 'recurring')
    if (recurringServices.length === 0) {
      throw new Error('沒有可用的定期服務')
    }

    // 3. 創建客戶和服務（批量創建以提高效率）
    const timestamp = Date.now()
    const baseTaxId = String(timestamp).slice(-8)
    
    console.log(`[BR2.5 Production Scale] 開始創建 ${clientCount} 個客戶...`)
    
    for (let i = 0; i < clientCount; i++) {
      const clientIndex = i + 1
      const uniqueTaxId = `${baseTaxId}${String(clientIndex).padStart(3, '0')}`
      
      // 創建客戶
      const testClientId = await createTestClient(page, {
        companyName: `BR2.5生產規模測試客戶${clientIndex}-${timestamp}`,
        taxId: uniqueTaxId,
        contactPerson1: `測試聯絡人${clientIndex}`,
        phone: `02-${String(9999 + i).slice(-4)}-${String(9999 + i).slice(-4)}`,
        email: `test-scale-${clientIndex}-${timestamp}@br2-5.com`,
        assigneeUserId: result.adminUserId
      })
      
      if (!testClientId) {
        console.warn(`[BR2.5 Production Scale] 客戶 ${clientIndex} 創建失敗，跳過`)
        continue
      }
      
      result.testClients.push({
        clientId: testClientId,
        companyName: `BR2.5生產規模測試客戶${clientIndex}-${timestamp}`,
        taxId: uniqueTaxId
      })

      // 為每個客戶創建服務
      const servicesToCreate = Math.min(servicesPerClient, recurringServices.length)
      
      for (let j = 0; j < servicesToCreate; j++) {
          const serviceIndex = j % recurringServices.length
          const service = recurringServices[serviceIndex]
          const serviceId = service.service_id || service.id
          const serviceName = service.service_name || `測試服務${serviceIndex + 1}`

        // 創建客戶服務
        const clientServiceResponse = await callAPI(page, 'POST', `/clients/${testClientId}/services`, {
          service_id: serviceId,
          service_type: 'recurring',
          use_for_auto_generate: 1,
          execution_months: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) // 每月執行
        })
        
        if (clientServiceResponse?.ok && clientServiceResponse?.data?.client_service_id) {
          const clientServiceId = clientServiceResponse.data.client_service_id
          result.testClientServices.push({
            clientServiceId,
            clientId: testClientId,
            serviceId,
            serviceName,
            serviceType: 'recurring'
          })

          // 為每個服務創建任務配置
          const taskConfigs = []
          
          // 創建不同類型的任務配置
          const generationTimeRules = [
            { rule: 'service_month_start', params: '{}' },
            { rule: 'prev_month_last_x_days', params: JSON.stringify({ days: 3 }) },
            { rule: 'service_month_start', params: '{}' }, // 重複以達到目標數量
            { rule: 'prev_month_last_x_days', params: JSON.stringify({ days: 5 }) },
            { rule: 'service_month_start', params: '{}' },
            { rule: 'prev_month_last_x_days', params: JSON.stringify({ days: 7 }) }
          ]
          
          for (let k = 0; k < tasksPerService; k++) {
            const configIndex = k + 1
            const ruleConfig = generationTimeRules[k % generationTimeRules.length]
            const isFixedDeadline = k === 2 // 第3個任務是固定期限
            
            taskConfigs.push({
              task_name: `BR2.5生產規模任務${configIndex}-客戶${clientIndex}-服務${j+1}`,
              stage_order: configIndex,
              generation_time_rule: ruleConfig.rule,
              generation_time_params: ruleConfig.params,
              days_due: isFixedDeadline ? 15 : 30,
              is_fixed_deadline: isFixedDeadline ? 1 : 0,
              auto_generate: 1,
              estimated_hours: 2 + (k % 3), // 2-4小時
              assignee_user_id: result.adminUserId
            })
          }

          // 批量創建任務配置
          for (const config of taskConfigs) {
            try {
              const configResponse = await callAPI(page, 'POST', `/clients/${testClientId}/services/${clientServiceId}/task-configs`, config)
              if (configResponse?.ok && configResponse?.data?.config_id) {
                result.testTaskConfigs.push({
                  configId: configResponse.data.config_id,
                  clientServiceId,
                  taskName: config.task_name,
                  generationTimeRule: config.generation_time_rule,
                  generationTimeParams: config.generation_time_params,
                  isFixedDeadline: config.is_fixed_deadline === 1
                })
              }
            } catch (err) {
              console.warn(`[BR2.5 Production Scale] 創建任務配置失敗: ${config.task_name}`, err)
            }
          }
        }
      }
      
      // 每創建10個客戶輸出進度
      if ((i + 1) % 10 === 0) {
        console.log(`[BR2.5 Production Scale] 已創建 ${i + 1}/${clientCount} 個客戶`)
      }
    }

    console.log(`[BR2.5 Production Scale] 測試數據設置完成：${result.testClients.length}個客戶，${result.testClientServices.length}個服務，${result.testTaskConfigs.length}個任務配置`)
    
    return result
  } catch (error) {
    console.error('[BR2.5 Production Scale] 設置測試數據失敗:', error)
    throw error
  }
}

/**
 * 清理生產規模的 BR2.5 測試數據
 */
export async function cleanupBR2_5ProductionScaleTestData(
  page: Page,
  testData: {
    testClients: Array<{ clientId: string }>
    testClientServices: Array<{ clientServiceId: number }>
    testTaskConfigs: Array<{ configId: number }>
  }
): Promise<void> {
  console.log(`[BR2.5 Production Scale] 開始清理測試數據：${testData.testClients.length}個客戶`)
  
  // 清理任務配置
  for (const config of testData.testTaskConfigs) {
    const service = testData.testClientServices.find(s => s.clientServiceId === config.clientServiceId)
    if (service) {
      const client = testData.testClients.find(c => c.clientId === service.clientId)
      if (client) {
        try {
          await callAPI(page, 'DELETE', `/clients/${client.clientId}/services/${service.clientServiceId}/task-configs/${config.configId}`)
        } catch (err) {
          console.warn(`[BR2.5 Production Scale] 清理任務配置 ${config.configId} 失敗:`, err)
        }
      }
    }
  }

  // 清理客戶服務
  for (const service of testData.testClientServices) {
    const client = testData.testClients.find(c => c.clientId === service.clientId)
    if (client) {
      try {
        await callAPI(page, 'DELETE', `/clients/${client.clientId}/services/${service.clientServiceId}`)
      } catch (err) {
        console.warn(`[BR2.5 Production Scale] 清理客戶服務 ${service.clientServiceId} 失敗:`, err)
      }
    }
  }

  // 清理客戶
  for (const client of testData.testClients) {
    try {
      await callAPI(page, 'DELETE', `/clients/${client.clientId}`)
    } catch (err) {
      console.warn(`[BR2.5 Production Scale] 清理客戶 ${client.clientId} 失敗:`, err)
    }
  }
  
  console.log(`[BR2.5 Production Scale] 測試數據清理完成`)
}

