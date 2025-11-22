/**
 * TaskConfiguration 組件單元測試
 * 測試 BR1.2.2 任務配置功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TaskConfiguration from '@/components/clients/TaskConfiguration.vue'
import Antd from 'ant-design-vue'

// Mock 依賴
vi.mock('@/api/task-templates', () => ({
  fetchTaskTemplates: vi.fn(() => Promise.resolve({
    ok: true,
    data: []
  }))
}))

vi.mock('@/api/users', () => ({
  fetchAllUsers: vi.fn(() => Promise.resolve({
    ok: true,
    data: [
      { user_id: 1, name: '測試用戶1' },
      { user_id: 2, name: '測試用戶2' }
    ]
  }))
}))

vi.mock('@/api/sop', () => ({
  fetchAllSOPs: vi.fn(() => Promise.resolve({
    ok: true,
    data: []
  }))
}))

vi.mock('@/api/services', () => ({
  fetchAllServices: vi.fn(() => Promise.resolve({
    ok: true,
    data: [
      {
        service_id: 1,
        service_name: '記帳服務',
        service_code: 'ACCOUNTING'
      }
    ]
  })),
  fetchServiceItems: vi.fn(() => Promise.resolve({
    ok: true,
    data: [
      {
        service_id: 1,
        item_name: '記帳任務1'
      }
    ]
  }))
}))

vi.mock('@/composables/usePageAlert', () => ({
  usePageAlert: () => ({
    showWarning: vi.fn(),
    showError: vi.fn(),
    showInfo: vi.fn()
  })
}))

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual('ant-design-vue')
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn()
    }
  }
})

// Mock 子組件
vi.mock('@/components/clients/TaskSOPSelector.vue', () => ({
  default: {
    name: 'TaskSOPSelector',
    template: '<div class="task-sop-selector-mock"></div>'
  }
}))

vi.mock('@/components/clients/TaskGenerationTimeRule.vue', () => ({
  default: {
    name: 'TaskGenerationTimeRule',
    template: '<div class="task-generation-time-rule-mock"></div>'
  }
}))

vi.mock('@/components/clients/TaskDueDateRule.vue', () => ({
  default: {
    name: 'TaskDueDateRule',
    template: '<div class="task-due-date-rule-mock"></div>'
  }
}))

vi.mock('@/components/clients/TaskGenerationPreview.vue', () => ({
  default: {
    name: 'TaskGenerationPreview',
    template: '<div class="task-generation-preview-mock"></div>'
  }
}))

describe('TaskConfiguration 組件', () => {
  let wrapper
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('組件初始化', () => {
    it('應該正確渲染組件', async () => {
      wrapper = mount(TaskConfiguration, {
        props: {
          serviceId: 1,
          tasks: [],
          sops: []
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()
      // 等待組件初始化
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(wrapper.exists()).toBe(true)
    })

    it('應該在提供 tasks prop 時初始化本地任務列表', async () => {
      const initialTasks = [
        {
          name: '測試任務',
          stage_order: 1,
          generation_time_rule: { rule: null, params: {} },
          due_date_rule: { rule: null, params: {}, days_due: null, is_fixed_deadline: false }
        }
      ]

      wrapper = mount(TaskConfiguration, {
        props: {
          serviceId: 1,
          tasks: initialTasks,
          sops: []
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()
      // 等待數據載入和初始化
      await new Promise(resolve => setTimeout(resolve, 300))

      expect(wrapper.vm.localTasks.length).toBeGreaterThan(0)
    })
  })

  describe('任務管理功能', () => {
    it('應該能夠新增任務', async () => {
      wrapper = mount(TaskConfiguration, {
        props: {
          serviceId: 1,
          tasks: [],
          sops: [],
          serviceType: 'recurring'
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()
      // 等待數據載入
      await new Promise(resolve => setTimeout(resolve, 200))

      const initialCount = wrapper.vm.localTasks.length
      await wrapper.vm.addTask()

      expect(wrapper.vm.localTasks.length).toBe(initialCount + 1)
    })

    it('應該能夠移除任務', async () => {
      wrapper = mount(TaskConfiguration, {
        props: {
          serviceId: 1,
          tasks: [
            {
              name: '測試任務1',
              stage_order: 1,
              generation_time_rule: { rule: null, params: {} },
              due_date_rule: { rule: null, params: {}, days_due: null, is_fixed_deadline: false }
            }
          ],
          sops: []
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()
      // 等待數據載入
      await new Promise(resolve => setTimeout(resolve, 200))

      const initialCount = wrapper.vm.localTasks.length
      if (initialCount > 0) {
        await wrapper.vm.removeTask(0)
        expect(wrapper.vm.localTasks.length).toBe(initialCount - 1)
      }
    })
  })

  describe('SOP 自動綁定邏輯', () => {
    it('應該正確計算服務層級 SOP', async () => {
      wrapper = mount(TaskConfiguration, {
        props: {
          serviceId: 1,
          clientId: 'CLIENT001',
          tasks: [],
          sops: []
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()
      // 等待數據載入
      await new Promise(resolve => setTimeout(resolve, 300))

      // 驗證 autoSelectedServiceSops computed 存在且為數組
      expect(wrapper.vm.autoSelectedServiceSops).toBeDefined()
      expect(Array.isArray(wrapper.vm.autoSelectedServiceSops)).toBe(true)
    })
  })

  describe('任務驗證功能', () => {
    it('應該提供 validateAllTasks 方法', async () => {
      wrapper = mount(TaskConfiguration, {
        props: {
          serviceId: 1,
          tasks: [],
          sops: []
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()
      // 等待數據載入
      await new Promise(resolve => setTimeout(resolve, 200))

      // 驗證 validateAllTasks 方法存在
      expect(wrapper.vm.validateAllTasks).toBeDefined()
      expect(typeof wrapper.vm.validateAllTasks).toBe('function')
    })
  })

  describe('事件發射', () => {
    it('應該在任務變化時發射 update:tasks 事件', async () => {
      wrapper = mount(TaskConfiguration, {
        props: {
          serviceId: 1,
          tasks: [],
          sops: []
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()
      // 等待數據載入
      await new Promise(resolve => setTimeout(resolve, 200))

      // 新增任務應該觸發 emitTasks
      await wrapper.vm.addTask()

      // 等待事件發射
      await wrapper.vm.$nextTick()

      // 驗證事件被發射
      expect(wrapper.emitted('update:tasks')).toBeTruthy()
    })
  })
})

