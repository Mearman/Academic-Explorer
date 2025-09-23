import { defineConfig, mergeConfig } from 'vitest/config';
import { resolve } from 'path';
import baseConfig from '../../vitest.config.base.js';

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
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  })
);