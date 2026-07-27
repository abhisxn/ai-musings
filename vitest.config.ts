import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const projectRoot = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'experiments',
          globals: true,
          environment: 'node',
          include: ['experiments/**/*.test.ts', 'experiments/**/*.test.tsx'],
        },
      },
      {
        oxc: {
          jsx: {
            runtime: 'automatic',
          },
        },
        resolve: {
          alias: { '@': projectRoot },
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
