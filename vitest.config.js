import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    // 測試環境
    environment: 'happy-dom',
    
    // 測試文件匹配模式
    include: [
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/api/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    
    // 覆蓋率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/*.config.ts',
        'dist/',
        'playwright-report/',
        '**/*.d.ts',
        '**/index.js',
        '**/router/**',
        '**/main.js'
      ],
      include: [
        'backend/src/**/*.js',
        'src/**/*.{js,vue}'
      ]
    },
    
    // 全局設置
    globals: true,
    
    // 測試超時時間
    testTimeout: 10000,
    
    // 設置文件
    setupFiles: ['./tests/unit/setup.js']
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})

