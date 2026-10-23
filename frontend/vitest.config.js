import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    minWorkers: 1,
    maxWorkers: 4,
    clearMocks: true,
    restoreMocks: true
  }
}))
