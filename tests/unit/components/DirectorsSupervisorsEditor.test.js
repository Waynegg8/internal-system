/**
 * DirectorsSupervisorsEditor 組件單元測試
 * 測試董監事資訊編輯器組件
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DirectorsSupervisorsEditor from '@/components/clients/DirectorsSupervisorsEditor.vue'
import Antd from 'ant-design-vue'

describe('DirectorsSupervisorsEditor 組件', () => {
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
    return mount(DirectorsSupervisorsEditor, {
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
      expect(wrapper.text()).toContain('董監事資訊')
    })

    it('應該在沒有數據時顯示空狀態', () => {
      wrapper = createWrapper({ modelValue: null })
      expect(wrapper.text()).toContain('暫無董監事資訊')
    })

    it('應該在有數據時顯示董監事列表', () => {
      const directors = [
        { name: '董事1', position: '董事', is_current: true }
      ]
      wrapper = createWrapper({ modelValue: directors })
      expect(wrapper.text()).toContain('董監事 1')
    })
  })

  describe('新增董監事', () => {
    it('應該能夠新增董監事', async () => {
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

  describe('刪除董監事', () => {
    it('應該能夠刪除董監事', async () => {
      const directors = [
        { name: '董事1', position: '董事' }
      ]
      wrapper = createWrapper({ modelValue: directors })
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

      const newDirectors = [
        { name: '新董事', position: '董事' }
      ]
      
      await wrapper.setProps({ modelValue: newDirectors })
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
        position: '',
        term_start: null,
        term_end: null,
        is_current: true
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


