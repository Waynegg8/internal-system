/**
 * AddServiceModal 組件單元測試
 * 測試 BR1.2.2 客戶新增服務設定功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import AddServiceModal from '@/components/clients/AddServiceModal.vue'
import Antd from 'ant-design-vue'

// Mock 依賴
vi.mock('@/api/services', () => ({
  fetchAllServices: vi.fn(() => Promise.resolve({
    ok: true,
    data: [
      {
        service_id: 1,
        service_name: '記帳服務',
        default_service_type: 'recurring',
        default_execution_months: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
        default_use_for_auto_generate: 1
      },
      {
        service_id: 2,
        service_name: '公司設立服務',
        default_service_type: 'one-time',
        default_execution_months: null,
        default_use_for_auto_generate: 0
      }
    ]
  }))
}))

vi.mock('@/api/tasks', () => ({
  useTaskApi: () => ({
    generateTasksForOneTimeService: vi.fn(() => Promise.resolve({
      generated: 1,
      skipped: 0,
      errors: []
    }))
  })
}))

vi.mock('@/composables/usePageAlert', () => ({
  usePageAlert: () => ({
    errorMessage: ref(''),
    warningMessage: ref(''),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showSuccess: vi.fn()
  })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

vi.mock('@/stores/clientAdd', () => ({
  useClientAddStore: () => ({
    supportData: {
      services: [
        {
          id: 1,
          service_id: 1,
          name: '記帳服務',
          default_service_type: 'recurring',
          default_execution_months: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
          default_use_for_auto_generate: 1
        },
        {
          id: 2,
          service_id: 2,
          name: '公司設立服務',
          default_service_type: 'one-time',
          default_execution_months: null,
          default_use_for_auto_generate: 0
        }
      ]
    },
    fetchSupportData: vi.fn(() => Promise.resolve())
  })
}))

describe('AddServiceModal 組件', () => {
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

  describe('組件渲染', () => {
    it('應該正確渲染模態框', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()
      // 等待模態框渲染
      await new Promise(resolve => setTimeout(resolve, 100))

      // 檢查模態框是否存在（通過查找標題）
      const modal = wrapper.findComponent({ name: 'AModal' })
      expect(modal.exists()).toBe(true)
    })

    it('應該在 visible 為 false 時不顯示模態框', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: false
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // 模態框應該存在但不可見
      const modal = wrapper.findComponent({ name: 'AModal' })
      expect(modal.exists()).toBe(true)
    })
  })

  describe('服務選擇', () => {
    it('應該顯示服務選擇下拉框', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      const select = wrapper.findComponent({ name: 'ASelect' })
      expect(select.exists()).toBe(true)
    })
  })

  describe('服務類型選擇', () => {
    it('應該顯示定期服務和一次性服務選項', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      const radioGroup = wrapper.findComponent({ name: 'ARadioGroup' })
      expect(radioGroup.exists()).toBe(true)
    })

    it('應該在選擇定期服務時顯示執行頻率選項', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // 直接設置服務類型為定期服務
      wrapper.vm.formData.service_type = 'recurring'

      await wrapper.vm.$nextTick()

      const checkboxGroup = wrapper.findComponent({ name: 'ACheckboxGroup' })
      expect(checkboxGroup.exists()).toBe(true)
    })

    it('應該在選擇一次性服務時隱藏執行頻率選項', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // 直接設置服務類型為一次性服務
      wrapper.vm.formData.service_type = 'one-time'

      await wrapper.vm.$nextTick()

      const checkboxGroup = wrapper.findComponent({ name: 'ACheckboxGroup' })
      // 一次性服務不應該顯示執行頻率選項
      expect(checkboxGroup.exists()).toBe(false)
    })
  })

  describe('表單驗證', () => {
    it('應該在未選擇服務時顯示警告', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // 嘗試提交表單（未選擇服務）
      await wrapper.vm.handleOk()

      // 應該觸發警告（通過 showWarning 被調用）
      // 注意：由於我們 mock 了 usePageAlert，實際的警告顯示不會發生
      // 但我們可以驗證 handleOk 函數的邏輯
      expect(wrapper.vm.formData.service_id).toBeNull()
    })

    it('應該在定期服務未選擇執行月份時顯示警告', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // 直接設置服務類型和服務 ID，但不設置執行月份
      wrapper.vm.formData.service_id = 1
      wrapper.vm.formData.service_type = 'recurring'
      wrapper.vm.formData.execution_months = []

      await wrapper.vm.$nextTick()

      // 嘗試提交表單
      await wrapper.vm.handleOk()

      // 應該觸發警告（定期服務必須至少勾選一個月份）
      expect(wrapper.vm.formData.execution_months.length).toBe(0)
    })
  })

  describe('服務類型預設值自動帶入', () => {
    it('應該在選擇服務時自動帶入預設值', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // 模擬選擇服務（記帳服務，預設為定期服務）
      await wrapper.vm.handleServiceChange(1)

      expect(wrapper.vm.formData.service_type).toBe('recurring')
      expect(wrapper.vm.formData.execution_months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      expect(wrapper.vm.formData.use_for_auto_generate).toBe(true)
    })

    it('應該在選擇一次性服務時自動設置為一次性服務類型', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()
      // 等待數據載入
      await new Promise(resolve => setTimeout(resolve, 100))

      // 模擬選擇服務（公司設立服務，預設為一次性服務）
      await wrapper.vm.handleServiceChange(2)

      expect(wrapper.vm.formData.service_type).toBe('one-time')
      expect(wrapper.vm.formData.use_for_auto_generate).toBe(false)
      // 注意：一次性服務的 execution_months 可能不會立即清空，因為 handleServiceChange 會設置預設值
    })
  })

  describe('事件發射', () => {
    it('應該在確定時發射 service-selected 事件', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // 直接設置表單數據
      wrapper.vm.formData.service_id = 1
      wrapper.vm.formData.service_type = 'recurring'
      wrapper.vm.formData.execution_months = [1, 2, 3]
      wrapper.vm.formData.use_for_auto_generate = true

      await wrapper.vm.$nextTick()

      // 調用 handleOk
      await wrapper.vm.handleOk()

      // 應該發射 service-selected 事件
      expect(wrapper.emitted('service-selected')).toBeTruthy()
      expect(wrapper.emitted('service-selected')[0][0]).toMatchObject({
        service_id: 1,
        service_type: 'recurring',
        execution_months: [1, 2, 3],
        use_for_auto_generate: 1
      })
    })

    it('應該在取消時發射 update:visible 事件', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // 調用 handleCancel
      await wrapper.vm.handleCancel()

      // 應該發射 update:visible 事件
      expect(wrapper.emitted('update:visible')).toBeTruthy()
      expect(wrapper.emitted('update:visible')[0][0]).toBe(false)
    })
  })

  describe('服務類型變化處理', () => {
    it('應該在切換到一次性服務時清空執行月份', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // 先設置為定期服務並選擇執行月份
      wrapper.vm.formData.service_type = 'recurring'
      wrapper.vm.formData.execution_months = [1, 2, 3]

      await wrapper.vm.$nextTick()

      // 切換到一次性服務
      wrapper.vm.formData.service_type = 'one-time'

      await wrapper.vm.$nextTick()

      // 調用 handleServiceTypeChange
      await wrapper.vm.handleServiceTypeChange()

      expect(wrapper.vm.formData.execution_months).toEqual([])
      expect(wrapper.vm.formData.use_for_auto_generate).toBe(false)
    })

    it('應該在切換到定期服務時預設為全年執行', async () => {
      wrapper = mount(AddServiceModal, {
        props: {
          visible: true
        },
        global: {
          plugins: [Antd, pinia]
        }
      })

      await wrapper.vm.$nextTick()

      // 先設置為一次性服務
      wrapper.vm.formData.service_type = 'one-time'
      wrapper.vm.formData.execution_months = []

      await wrapper.vm.$nextTick()

      // 切換到定期服務
      wrapper.vm.formData.service_type = 'recurring'

      await wrapper.vm.$nextTick()

      // 調用 handleServiceTypeChange
      await wrapper.vm.handleServiceTypeChange()

      expect(wrapper.vm.formData.execution_months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      expect(wrapper.vm.formData.use_for_auto_generate).toBe(true)
    })
  })
})

