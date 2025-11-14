import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    vue(),
    // 自動導入 Ant Design Vue 組件（按需導入）
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false // 使用 reset.css，不需要樣式導入
        })
      ],
      dts: false // 不生成類型定義文件
    }),
    // 自動導入 Vue API
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: false
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    // 構建優化配置 - 使用 esbuild 更穩定
    minify: 'esbuild',
    sourcemap: false, // 生產環境不生成 sourcemap
    chunkSizeWarningLimit: 800, // 降低警告閾值，更嚴格控制包大小
    target: 'es2015', // 目標瀏覽器版本，平衡兼容性和體積
    rollupOptions: {
      output: {
        // 優化 chunk 命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // 手動分割代碼塊
        manualChunks: (id) => {
          // 將 node_modules 中的大型依賴分離
          if (id.includes('node_modules')) {
            // Ant Design Vue 圖標庫單獨打包
            if (id.includes('@ant-design/icons-vue')) {
              return 'antd-icons'
            }
            // Ant Design Vue 組件庫統一打包，避免循環依賴問題
            if (id.includes('ant-design-vue')) {
              return 'antd'
            }
            // Vue 核心庫單獨打包
            if (id.includes('vue') && !id.includes('node_modules/vue-router')) {
              return 'vue-core'
            }
            // Vue Router 和 Pinia 單獨打包
            if (id.includes('vue-router') || id.includes('pinia')) {
              return 'vue-routing'
            }
            // Axios 單獨打包
            if (id.includes('axios')) {
              return 'axios'
            }
            // Day.js 單獨打包
            if (id.includes('dayjs')) {
              return 'dayjs'
            }
            // 其他 node_modules 依賴
            return 'vendor'
          }
          
          // 按功能模組分割業務代碼
          if (id.includes('/src/views/')) {
            // 客戶相關頁面
            if (id.includes('/views/clients/')) {
              return 'views-clients'
            }
            // 任務相關頁面
            if (id.includes('/views/tasks/')) {
              return 'views-tasks'
            }
            // 薪資相關頁面
            if (id.includes('/views/payroll/')) {
              return 'views-payroll'
            }
            // 成本相關頁面
            if (id.includes('/views/costs/')) {
              return 'views-costs'
            }
            // 知識庫相關頁面
            if (id.includes('/views/knowledge/')) {
              return 'views-knowledge'
            }
            // 設定相關頁面
            if (id.includes('/views/settings/')) {
              return 'views-settings'
            }
            // 報表相關頁面
            if (id.includes('/views/reports/')) {
              return 'views-reports'
            }
            // 其他視圖頁面
            return 'views-other'
          }
          
          // 組件按功能模組分割
          if (id.includes('/src/components/')) {
            // 客戶相關組件
            if (id.includes('/components/clients/')) {
              return 'components-clients'
            }
            // 任務相關組件
            if (id.includes('/components/tasks/')) {
              return 'components-tasks'
            }
            // 薪資相關組件 - 合併到 components-other 避免循環依賴
            // if (id.includes('/components/payroll/')) {
            //   return 'components-payroll'
            // }
            // 成本相關組件
            if (id.includes('/components/costs/')) {
              return 'components-costs'
            }
            // 知識庫相關組件
            if (id.includes('/components/knowledge/')) {
              return 'components-knowledge'
            }
            // 設定相關組件
            if (id.includes('/components/settings/')) {
              return 'components-settings'
            }
            // 報表相關組件
            if (id.includes('/components/reports/')) {
              return 'components-reports'
            }
            // 其他組件（包含 payroll）
            return 'components-other'
          }
          
          // API 和工具函數
          if (id.includes('/src/api/')) {
            return 'api'
          }
          if (id.includes('/src/utils/') || id.includes('/src/stores/')) {
            return 'utils'
          }
        }
      }
    },
    // 啟用 CSS 代碼分割
    cssCodeSplit: true,
    // 報告壓縮後的文件大小
    reportCompressedSize: true,
    // 啟用 gzip 壓縮大小報告
    assetsInlineLimit: 4096, // 小於 4KB 的資源內聯為 base64
    // 優化依賴預構建
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    // 優化構建性能
    modulePreload: {
      polyfill: false // 現代瀏覽器不需要 polyfill
    }
  },
  // 優化依賴預構建
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'axios', 'dayjs'],
    exclude: ['ant-design-vue'] // antd 使用按需導入，不需要預構建
  }
})

