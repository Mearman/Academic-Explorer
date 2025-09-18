/// <reference types="vitest" />
import { defineWorkspace } from 'vitest/config'
import { resolveConfig, testSetupFiles } from './config/shared'

// Common configuration shared across all test projects
const commonConfig = {
  resolve: resolveConfig,
  test: {
    globals: true,
    setupFiles: testSetupFiles,
    watch: false,
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.config.js',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        'src/routeTree.gen.ts',
        'src/test/**',
        '**/vite.config.ts',
        '**/vitest.config.ts',
        '**/vitest.workspace.ts',
        '**/.eslintrc.{js,cjs}',
        '**/eslint.config.{js,ts}',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        perFile: true,
        skipFull: false,
        autoUpdate: false,
        './src/lib/graph/graph-utilities-service.ts': {
          branches: 90,
          functions: 100,
          lines: 90,
          statements: 90,
        },
        './src/hooks/use-graph-utilities.ts': {
          branches: 85,
          functions: 90,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
}

// Test project configurations
const testProjects = [
  {
    name: 'unit',
    include: ['src/**/*.unit.test.ts'],
    environment: 'jsdom',
    testTimeout: 30000,
    description: 'Unit tests - pure logic, utilities, data transformations',
  },
  {
    name: 'component',
    include: ['src/**/*.component.test.ts', 'src/**/*.component.test.tsx'],
    environment: 'jsdom',
    testTimeout: 30000,
    description: 'Component tests - React component rendering and interactions',
  },
  {
    name: 'integration',
    include: ['src/**/*.integration.test.ts'],
    environment: 'node',
    testTimeout: 45000,
    description: 'Integration tests - API integration, cache behaviour, cross-component workflows',
  },
  {
    name: 'e2e',
    include: ['src/**/*.e2e.test.ts'],
    environment: 'node',
    testTimeout: 90000,
    setupFiles: ['./src/test/setup.ts', './src/test/e2e-setup.ts'],
    // Serial execution for memory efficiency
    maxConcurrency: 1,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    description: 'E2E tests - Full user journeys and critical paths with Playwright',
  },
] as const

export default defineWorkspace(
  testProjects.map(({ description, ...projectConfig }) => ({
    ...commonConfig,
    test: {
      ...commonConfig.test,
      ...projectConfig,
    },
  }))
)