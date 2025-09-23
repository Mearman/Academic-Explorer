import { defineConfig, mergeConfig } from 'vitest/config';
import { resolve } from 'path';
import baseConfig from '../../vitest.config.base.js';

export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      // Node.js environment for pure library code
      environment: 'node',

      // Package-specific coverage thresholds
      coverage: {
        thresholds: {
          global: {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  })
);