import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { reviewApi } from './scripts/review-plugin.ts'

// Fixtures (synthetic test puzzles) exist only outside production builds.
// `__INCLUDE_FIXTURES__` is replaced at build time, so the fixtures module and
// its assets are dead-code-eliminated from `vite build` (mode "production").
export default defineConfig(({ mode }) => ({
  plugins: [react(), reviewApi()],
  define: {
    __INCLUDE_FIXTURES__: JSON.stringify(mode !== 'production'),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}))
