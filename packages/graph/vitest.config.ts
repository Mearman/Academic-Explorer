import { defineConfig, mergeConfig } from 'vitest/config';
import { resolve } from 'path';
import baseConfig from '../../vitest.config.base.ts';

export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      environment: 'node',

      coverage: {
        thresholds: {
          global: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
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