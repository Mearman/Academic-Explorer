import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import path from 'path';

const sharedConfig = {
  plugins: [
    react(),
    vanillaExtractPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/components': path.resolve(__dirname, './src/components'),
    },
  },
};

export default defineConfig({
  ...sharedConfig,
  test: {
    // Global test configuration
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Global memory optimization
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1,
        minForks: 1,
      },
    },
    // Reduce memory usage
    isolate: false,
    sequence: {
      concurrent: false,
    },
    // Global timeouts
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    // Default coverage for all tests - disable globally to prevent memory/inspector issues
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: process.env.CI === 'true' ? ['text'] : ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.ts',
        '**/*.d.ts',
        '**/*.css.ts',
        'src/lib/openalex/examples.ts',
      ],
    },
    // Vitest Projects
    projects: [
      {
        ...sharedConfig,
        test: {
          name: 'unit',
          include: ['**/*.unit.test.{js,ts,jsx,tsx}'],
          environment: 'jsdom',
          // Disable coverage for unit tests to prevent memory issues
          coverage: {
            enabled: false,
          },
          // Optimized for unit tests to prevent memory issues
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true,
              maxForks: 1,
              minForks: 1,
            },
          },
          isolate: false,
          sequence: {
            concurrent: false,
          },
          testTimeout: process.env.CI === 'true' ? 30000 : 15000,
          hookTimeout: 5000,
          teardownTimeout: 5000,
          // Additional memory optimization
          logHeapUsage: true,
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'component',
          include: ['**/*.component.test.{js,ts,jsx,tsx}'],
          environment: 'jsdom',
          testTimeout: process.env.CI === 'true' ? 45000 : 30000,
          hookTimeout: 10000,
          teardownTimeout: 10000,
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'integration',
          include: ['**/*.integration.test.{js,ts,jsx,tsx}'],
          environment: 'node',
          // Disable coverage for integration tests to prevent inspector errors
          coverage: {
            enabled: false,
          },
          testTimeout: process.env.CI === 'true' ? 60000 : 45000,
          hookTimeout: 15000,
          teardownTimeout: 15000,
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'e2e',
          include: ['**/*.e2e.test.{js,ts,jsx,tsx}'],
          environment: 'node',
          testTimeout: process.env.CI === 'true' ? 120000 : 90000,
          hookTimeout: 30000,
          teardownTimeout: 30000,
        },
      },
    ],
  },
});