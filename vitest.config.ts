import { defineConfig } from 'vitest/config'

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
