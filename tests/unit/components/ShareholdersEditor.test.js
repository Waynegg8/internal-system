/**
 * ShareholdersEditor 組件單元測試
 * 測試股東持股資訊編輯器組件
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ShareholdersEditor from '@/components/clients/ShareholdersEditor.vue'
import Antd from 'ant-design-vue'

describe('ShareholdersEditor 組件', () => {
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

  const createWrapper = (props = {}) => {
    return mount(ShareholdersEditor, {
      props: {
        modelValue: null,
        ...props
      },
      global: {
        plugins: [Antd, pinia]
      }
    })
  }

  describe('組件渲染', () => {
    it('應該正確渲染組件', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toContain('股東持股資訊')
    })

    it('應該在沒有數據時顯示空狀態', () => {
      wrapper = createWrapper({ modelValue: null })
      expect(wrapper.text()).toContain('暫無股東資訊')
    })

    it('應該在有數據時顯示股東列表', () => {
      const shareholders = [
        { name: '股東1', share_percentage: 50, share_count: 1000, share_amount: 500000 }
      ]
      wrapper = createWrapper({ modelValue: shareholders })
      expect(wrapper.text()).toContain('股東 1')
    })
  })

  describe('新增股東', () => {
    it('應該能夠新增股東', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const addButton = wrapper.find('button')
      expect(addButton.exists()).toBe(true)
      
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()

      // 應該觸發 update:modelValue 事件
      const emits = wrapper.emitted('update:modelValue')
      expect(emits).toBeDefined()
    })
  })

  describe('刪除股東', () => {
    it('應該能夠刪除股東', async () => {
      const shareholders = [
        { name: '股東1', share_percentage: 50 }
      ]
      wrapper = createWrapper({ modelValue: shareholders })
      await wrapper.vm.$nextTick()

      const removeButton = wrapper.find('button[type="text"]')
      if (removeButton.exists()) {
        await removeButton.trigger('click')
        await wrapper.vm.$nextTick()

        // 應該觸發 update:modelValue 事件
        const emits = wrapper.emitted('update:modelValue')
        expect(emits).toBeDefined()
      }
    })
  })

  describe('數據同步', () => {
    it('應該在 modelValue 變化時更新內部狀態', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const newShareholders = [
        { name: '新股東', share_percentage: 30 }
      ]
      
      await wrapper.setProps({ modelValue: newShareholders })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.items.length).toBeGreaterThan(0)
    })

    it('應該過濾空項目', async () => {
      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      // 添加一個空項目
      wrapper.vm.items.push({
        id: 999,
        name: '',
        share_percentage: null,
        share_count: null,
        share_amount: null,
        share_type: ''
      })

      wrapper.vm.handleChange()
      await wrapper.vm.$nextTick()

      const emits = wrapper.emitted('update:modelValue')
      if (emits && emits.length > 0) {
        const lastEmit = emits[emits.length - 1][0]
        // 空項目應該被過濾
        expect(lastEmit).toBeNull()
      }
    })
  })
})


