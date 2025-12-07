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
      // Exclude performance and integration tests from CI
      exclude: [
        ...(baseVitestConfig.test?.exclude || []),
        '__tests__/**/*.integration.test.ts',
        'src/**/*.integration.test.ts',
        '__tests__/**/*.performance.test.ts',
        '__tests__/**/*scaling*.test.ts',
        '__tests__/**/*profiling*.test.ts',
      ],
      // Optimized pool settings for algorithm tests
      pool: 'threads',
      poolOptions: {
        threads: {
          maxThreads: 2, // Limit threads for memory management
          minThreads: 1,
        },
      },
      // Enable file parallelism for faster algorithm tests
      fileParallelism: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json'], // Minimal reporters for CI speed
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.d.ts', 'src/index.ts', '__tests__/**'],
        thresholds: {
          lines: 70, // Slightly reduced thresholds
          functions: 70,
          branches: 70,
          statements: 70,
        },
      },
    },
  })
);
