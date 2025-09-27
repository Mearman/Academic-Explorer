import { defineConfig, mergeConfig } from 'vitest/config';
import { resolve } from 'path';
import baseConfig from '../../vitest.config.base.ts';

export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      // Node.js environment for API client testing
      environment: 'node',

      // Package-specific coverage thresholds
      coverage: {
        thresholds: {
          global: {
            branches: 75,
            functions: 75,
            lines: 75,
            statements: 75,
          },
        },
      },

      // Longer timeout for API tests
      testTimeout: 15000,

      // Sequential execution for integration tests to avoid rate limiting
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
      maxConcurrency: 1, // Ensure tests run one at a time
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  })
);