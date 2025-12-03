/// <reference types='vitest' />
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig, mergeConfig } from 'vitest/config';

import { baseVitestConfig } from '../../vitest.config.base';

export default defineConfig(
  mergeConfig(baseVitestConfig, {
    root: __dirname,
    plugins: [nxViteTsPaths()],
    resolve: {
      // Use source condition to resolve workspace packages to source files
      conditions: ['source', 'import', 'module', 'default'],
    },
    test: {
      watch: false,
      include: ['__tests__/**/*.test.ts'],
      // Exclude integration tests from default run - they run via test:integration
      exclude: [
        ...(baseVitestConfig.test?.exclude || []),
        '__tests__/**/*.integration.test.ts',
        'src/**/*.integration.test.ts',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.d.ts', 'src/index.ts'],
        thresholds: {
          lines: 74,
          functions: 74,
          branches: 74,
          statements: 74,
        },
      },
      // Named projects for targeted test execution
      projects: [
        {
          test: {
            name: 'unit',
            include: ['__tests__/**/*.test.ts'],
            exclude: ['__tests__/**/*.integration.test.ts'],
            environment: 'node',
          },
        },
        {
          test: {
            name: 'integration',
            include: ['__tests__/**/*.integration.test.ts', 'src/**/*.integration.test.ts'],
            environment: 'node',
            testTimeout: 30000,
          },
        },
      ],
    },
  })
);
