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
    testTimeout: 10000, // 10 seconds max per test
    hookTimeout: 10000, // 10 seconds for setup/teardown
    pool: 'forks', // Use separate processes to avoid memory leaks
    poolOptions: {
      forks: {
        maxForks: 4, // Limit concurrent processes
        minForks: 1,
      },
    },
    // Isolate tests to prevent memory leaks
    isolate: true,
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
      reporter: ['text', 'json', 'html'],
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