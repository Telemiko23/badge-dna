import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { reviewApi } from './scripts/review-plugin.ts'

// Fixtures (synthetic test puzzles) exist only outside production builds.
// `__INCLUDE_FIXTURES__` is replaced at build time, so the fixtures module and
// its assets are dead-code-eliminated from `vite build` (mode "production").
// BASE_PATH is set only for the GitHub Pages build (the site lives under /badge-dna/); everywhere else it is '/'.
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), reviewApi()],
  define: {
    __INCLUDE_FIXTURES__: JSON.stringify(mode !== 'production'),
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}))
