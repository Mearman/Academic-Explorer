import { defineConfig, mergeConfig } from 'vitest/config';
import { resolve } from 'path';
import baseConfig from '../../vitest.config.base.js';

export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      // Node.js environment for algorithm testing
      environment: 'node',

      // Package-specific coverage thresholds
      coverage: {
        thresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
          },
        },
      },

      // Longer timeout for simulation tests
      testTimeout: 15000,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  })
);