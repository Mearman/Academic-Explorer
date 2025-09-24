import { defineConfig, mergeConfig } from 'vitest/config';
import { resolve } from 'path';
import reactConfig from '../../vitest.config.react.js';

export default defineConfig(
  mergeConfig(reactConfig, {
    test: {
      // App-specific test setup
      setupFiles: ['./src/test/setup.ts'],

      // Lower coverage thresholds for app code
      coverage: {
        thresholds: {
          global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
          },
        },
        exclude: [
          'src/routeTree.gen.ts', // Generated files
          'src/test/**',
          'e2e/**',
          '**/*.stories.*',
          '**/*.config.*',
          'dist/',
          'coverage/',
          '**/*.test.*',
          '**/*.spec.*',
        ],
      },

      // Include E2E test patterns
      include: [
        'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        'src/**/*.component.{test,spec}.{ts,tsx}',
        'src/**/*.integration.{test,spec}.{ts,tsx}',
      ],
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  })
);