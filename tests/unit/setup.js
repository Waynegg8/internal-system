/**
 * Vitest 測試環境設置
 * 提供全局的測試工具和 mock
 */

import { vi } from 'vitest'

// Mock Cloudflare Workers 環境
global.ENV = {
  DATABASE: {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn()
  },
  CACHE: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  APP_ENV: 'test'
}

// Mock console 方法（避免測試輸出過多）
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
}



