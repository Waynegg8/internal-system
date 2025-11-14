import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 按需導入 Ant Design Vue 的全局方法（組件會由 unplugin-vue-components 自動導入）
import { message, notification, Modal } from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
// 配置 dayjs（Ant Design Vue DatePicker 需要）
// 使用動態導入避免 ESM 導入問題
import dayjs from 'dayjs'

// 動態導入並擴展 dayjs 插件
const loadDayjsPlugins = async () => {
  try {
    const [
      advancedFormat,
      customParseFormat,
      localeData,
      weekOfYear,
      weekYear,
      dayOfYear,
      quarterOfYear,
      isoWeek,
      isLeapYear,
      isSameOrAfter,
      isSameOrBefore,
      weekday
    ] = await Promise.all([
      import('dayjs/plugin/advancedFormat'),
      import('dayjs/plugin/customParseFormat'),
      import('dayjs/plugin/localeData'),
      import('dayjs/plugin/weekOfYear'),
      import('dayjs/plugin/weekYear'),
      import('dayjs/plugin/dayOfYear'),
      import('dayjs/plugin/quarterOfYear'),
      import('dayjs/plugin/isoWeek'),
      import('dayjs/plugin/isLeapYear'),
      import('dayjs/plugin/isSameOrAfter'),
      import('dayjs/plugin/isSameOrBefore'),
      import('dayjs/plugin/weekday')
    ])
    
    dayjs.extend(advancedFormat.default || advancedFormat)
    dayjs.extend(customParseFormat.default || customParseFormat)
    dayjs.extend(localeData.default || localeData)
    dayjs.extend(weekOfYear.default || weekOfYear)
    dayjs.extend(weekYear.default || weekYear)
    dayjs.extend(dayOfYear.default || dayOfYear)
    dayjs.extend(quarterOfYear.default || quarterOfYear)
    dayjs.extend(isoWeek.default || isoWeek)
    dayjs.extend(isLeapYear.default || isLeapYear)
    dayjs.extend(isSameOrAfter.default || isSameOrAfter)
    dayjs.extend(isSameOrBefore.default || isSameOrBefore)
    dayjs.extend(weekday.default || weekday)
  } catch (error) {
    console.warn('載入 dayjs 插件失敗:', error)
  }
}

// 立即載入插件
loadDayjsPlugins()

import App from './App.vue'
import router from './router'
import './assets/css/design-tokens.css' // 设计系统变量
import './assets/css/common.css' // 全局樣式
import './assets/css/table-styles.css' // 表格样式规范

const app = createApp(App)
const pinia = createPinia()

// 使用 Pinia
app.use(pinia)

// 使用 Vue Router
app.use(router)

// 全局配置 Ant Design Vue 的方法（組件已通過 unplugin-vue-components 自動導入，無需手動註冊）
app.config.globalProperties.$message = message
app.config.globalProperties.$notification = notification
app.config.globalProperties.$modal = Modal

app.mount('#app')

