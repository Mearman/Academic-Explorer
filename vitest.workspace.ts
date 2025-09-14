/// <reference types="vitest" />
import { defineWorkspace } from 'vitest/config'
import * as path from 'path'

export default defineWorkspace([
  // Unit tests - pure logic, utilities, data transformations
  {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      name: 'unit',
      include: ['src/**/*.unit.test.ts'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 30000,
    },
  },

  // Component tests - React component rendering and interactions
  {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      name: 'component',
      include: ['src/**/*.component.test.ts', 'src/**/*.component.test.tsx'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 30000,
    },
  },

  // Integration tests - API integration, cache behaviour, cross-component workflows
  {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      name: 'integration',
      include: ['src/**/*.integration.test.ts'],
      environment: 'node',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 45000,
    },
  },

  // E2E tests - Full user journeys and critical paths
  {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      name: 'e2e',
      include: ['src/**/*.e2e.test.ts'],
      environment: 'node',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 90000,
    },
  },
])