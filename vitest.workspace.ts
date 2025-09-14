/// <reference types="vitest" />
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // Unit tests - pure logic, utilities, data transformations
  {
    test: {
      name: 'unit',
      include: ['src/**/*.unit.test.ts'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 30000,
      coverage: {
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
      },
    },
  },

  // Component tests - React component rendering and interactions
  {
    test: {
      name: 'component',
      include: ['src/**/*.component.test.ts', 'src/**/*.component.test.tsx'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 30000,
      coverage: {
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
      },
    },
  },

  // Integration tests - API integration, cache behaviour, cross-component workflows
  {
    test: {
      name: 'integration',
      include: ['src/**/*.integration.test.ts'],
      environment: 'node',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 45000,
      coverage: {
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
      },
    },
  },

  // E2E tests - Full user journeys and critical paths
  {
    test: {
      name: 'e2e',
      include: ['src/**/*.e2e.test.ts'],
      environment: 'node',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      testTimeout: 90000,
      coverage: {
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
      },
    },
  },
])