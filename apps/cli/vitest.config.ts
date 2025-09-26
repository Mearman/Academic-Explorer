import { defineConfig, mergeConfig } from 'vitest/config';
import { resolve } from 'path';
import baseConfig from '../../vitest.config.base.ts';

export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      // Node.js environment for CLI testing
      environment: 'node',

      // CLI-specific coverage thresholds
      coverage: {
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
          },
        },
      },

      // Longer timeout for CLI operations
      testTimeout: 10000,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  })
);