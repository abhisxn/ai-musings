import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const alias = { '@': projectRoot }

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'experiments',
          globals: true,
          environment: 'node',
          include: ['experiments/**/*.test.ts', 'experiments/**/*.test.tsx'],
        },
      },
      {
        resolve: { alias },
        oxc: {
          jsx: {
            runtime: 'automatic',
          },
        },
        test: {
          name: 'components',
          globals: true,
          environment: 'jsdom',
          include: ['app/**/*.test.tsx', 'components/**/*.test.tsx', 'lib/**/*.test.tsx'],
          setupFiles: ['./test/setup.ts'],
        },
      },
    ],
  },
})
