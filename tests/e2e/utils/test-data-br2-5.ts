/**
 * BR2.5 測試數據設置工具
 * 
 * 用於設置任務自動生成測試所需的測試數據
 */

import type { Page } from '@playwright/test'
import { callAPI, createTestClient, createTestUser } from './test-data'

/**
 * 設置 BR2.5 測試所需的測試數據
 */
export async function setupBR2_5TestData(page: Page): Promise<{
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
    // 1. 獲取管理員用戶 ID
    const usersResponse = await callAPI(page, 'GET', '/settings/users')
    if (usersResponse?.ok && usersResponse?.data?.length > 0) {
      const adminUser = usersResponse.data.find((u: any) => u.is_admin || u.username === 'admin')
      if (adminUser) {
        result.adminUserId = adminUser.user_id || adminUser.id
      }
    } else {
      throw new Error(`無法獲取用戶列表: ${JSON.stringify(usersResponse)}`)
    }

    // 2. 創建測試員工（如果不存在或不是員工）
    const employeeUser = usersResponse?.data?.find((u: any) => u.username === 'test_employee_br2_5')
    if (!employeeUser) {
      // 創建新員工
      const newEmployeeId = await createTestUser(page, {
        username: 'test_employee_br2_5',
        name: '測試員工（BR2.5）',
        isAdmin: false
      })
      if (newEmployeeId) {
        result.employeeUserId = newEmployeeId
      }
    } else if (employeeUser.is_admin) {
      // 如果用戶存在但是管理員，嘗試更新為非管理員
      try {
        const updateResponse = await callAPI(page, 'PUT', `/settings/users/${employeeUser.user_id || employeeUser.id}`, {
          username: employeeUser.username,
          name: employeeUser.name || '測試員工（BR2.5）',
          is_admin: 0
        })
        if (updateResponse?.ok) {
          result.employeeUserId = employeeUser.user_id || employeeUser.id
        } else {
          console.warn('無法更新測試員工用戶權限，將跳過員工權限測試')
          result.employeeUserId = employeeUser.user_id || employeeUser.id
        }
      } catch (err) {
        console.warn('無法更新測試員工用戶權限:', err)
        result.employeeUserId = employeeUser.user_id || employeeUser.id
      }
    } else {
      // 用戶存在且不是管理員，使用現有用戶
      result.employeeUserId = employeeUser.user_id || employeeUser.id
    }

    // 3. 創建測試客戶（使用時間戳確保唯一性）
    const timestamp = Date.now()
    const uniqueTaxId = String(timestamp).slice(-8) // 使用時間戳後8位作為統一編號
    const testClientId = await createTestClient(page, {
      companyName: `BR2.5測試客戶有限公司-${timestamp}`,
      taxId: uniqueTaxId,
      contactPerson1: '測試聯絡人',
      phone: '02-9999-9999',
      email: `test-${timestamp}@br2-5.com`,
      assigneeUserId: result.adminUserId
    })
    if (!testClientId) throw new Error('測試客戶建立失敗')
    result.testClients.push({
      clientId: testClientId,
      companyName: `BR2.5測試客戶有限公司-${timestamp}`,
      taxId: uniqueTaxId
    })

    // 4. 獲取服務列表並創建客戶服務
    const servicesResponse = await callAPI(page, 'GET', '/settings/services')
    if (!servicesResponse?.ok || !servicesResponse?.data?.length) {
      throw new Error('無法獲取服務列表')
    }
    
    // 選擇第一個定期服務
    const recurringService = servicesResponse.data.find((s: any) => s.service_type === 'recurring') || servicesResponse.data[0]
    const serviceId = recurringService.service_id || recurringService.id
    const serviceName = recurringService.service_name || '測試服務'

    // 創建客戶服務（定期服務）
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

      // 5. 創建任務配置（測試不同的生成時間規則）
      const taskConfigs = [
        {
          task_name: 'BR2.5測試任務-服務月份開始時',
          stage_order: 1,
          generation_time_rule: 'service_month_start',
          generation_time_params: '{}',
          days_due: 30,
          is_fixed_deadline: 0,
          auto_generate: 1
        },
        {
          task_name: 'BR2.5測試任務-前一個月最後3天',
          stage_order: 2,
          generation_time_rule: 'prev_month_last_x_days',
          generation_time_params: JSON.stringify({ days: 3 }),
          days_due: 30,
          is_fixed_deadline: 0,
          auto_generate: 1
        },
        {
          task_name: 'BR2.5測試任務-固定期限',
          stage_order: 3,
          generation_time_rule: 'service_month_start',
          generation_time_params: '{}',
          days_due: 15,
          is_fixed_deadline: 1,
          auto_generate: 1
        }
      ]

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
          console.warn(`創建任務配置失敗: ${config.task_name}`, err)
        }
      }
    }

    return result
  } catch (error) {
    console.error('設置 BR2.5 測試數據失敗:', error)
    throw error
  }
}

/**
 * 清理 BR2.5 測試數據
 */
export async function cleanupBR2_5TestData(page: Page, testData: {
  testClients: Array<{ clientId: string }>
  testClientServices: Array<{ clientServiceId: number }>
  testTaskConfigs: Array<{ configId: number }>
}): Promise<void> {
  try {
    // 清理任務配置（需要 clientId 和 clientServiceId）
    for (const config of testData.testTaskConfigs) {
      try {
        // 找到對應的客戶服務以獲取 clientId 和 clientServiceId
        const service = testData.testClientServices.find(s => s.clientServiceId === config.clientServiceId)
        if (service) {
          await callAPI(page, 'DELETE', `/clients/${service.clientId}/services/${service.clientServiceId}/task-configs/${config.configId}`)
        }
      } catch (err) {
        console.warn(`清理任務配置 ${config.configId} 失敗:`, err)
      }
    }

    // 清理客戶服務（需要 clientId）
    for (const service of testData.testClientServices) {
      try {
        await callAPI(page, 'DELETE', `/clients/${service.clientId}/services/${service.clientServiceId}`)
      } catch (err) {
        console.warn(`清理客戶服務 ${service.clientServiceId} 失敗:`, err)
      }
    }

    // 清理客戶
    for (const client of testData.testClients) {
      try {
        await callAPI(page, 'DELETE', `/clients/${client.clientId}`)
      } catch (err) {
        console.warn(`清理客戶 ${client.clientId} 失敗:`, err)
      }
    }
  } catch (error) {
    console.error('清理 BR2.5 測試數據失敗:', error)
  }
}

