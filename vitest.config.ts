import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import path from 'path';

export default defineConfig({
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Performance and memory optimizations
    testTimeout: process.env.CI === 'true' ? 60000 : 15000, // Extra time for coverage in CI
    hookTimeout: 10000, // 10 seconds for setup/teardown
    teardownTimeout: 10000,
    // Use threads pool for better compatibility across environments
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: process.env.CI !== 'true', // Allow multi-threading in CI for coverage
        maxThreads: process.env.CI === 'true' ? 4 : 1,
        minThreads: 1,
      },
    },
    // Isolate tests to prevent memory leaks
    isolate: true,
    // Reduce memory usage
    sequence: {
      concurrent: false, // Run tests sequentially to reduce memory pressure
    },
    // Test file patterns for different test types
    include: (() => {
      const testType = process.env.TEST_TYPE;
      if (testType) {
        return [`**/*.${testType}.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}`];
      }
      return [
        '**/*.{unit,component,integration,e2e}.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', // Fallback for existing tests
      ];
    })(),
    coverage: {
      provider: 'v8',
      reporter: process.env.CI === 'true' ? ['text', 'json'] : ['text', 'json', 'html'], // Skip HTML in CI for speed
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.ts',
        '**/*.d.ts',
        '**/*.css.ts',
        'src/lib/openalex/examples.ts',
      ],
    },
  },
});