import { defineConfig, mergeConfig } from 'vitest/config';
import { resolve } from 'path';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import reactConfig from '../../vitest.config.react.js';

export default defineConfig(
  mergeConfig(reactConfig, {
    plugins: [
      vanillaExtractPlugin(),
    ],
    test: {
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
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  })
);