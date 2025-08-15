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
    // Global test configuration with aggressive memory optimization
    globals: true,
    setupFiles: ['./src/test/setup.ts', './src/test/jest-dom-setup.ts'],
    environment: 'jsdom',
    
    // CRITICAL: Use threads pool instead of forks to prevent process communication issues
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,       // Single thread execution to prevent memory leaks
        maxThreads: 1,           // Absolute maximum: 1 thread
        minThreads: 1,           // Minimum threads: 1
        isolate: true,           // Strict thread isolation
        useAtomics: false,       // Disable atomics to prevent worker communication issues
      },
    },
    
    // CRITICAL: Sequential execution to prevent memory fragmentation
    isolate: true,
    sequence: {
      concurrent: false,         // No concurrent execution
      shuffle: false,           // Deterministic test order
      hooks: 'stack',          // Stack hooks to prevent memory leaks
    },
    
    // CRITICAL: Memory management
    maxConcurrency: 1,          // Absolute limit: 1 test at a time
    maxWorkers: 1,              // Only 1 worker process
    minWorkers: 1,              // Minimum 1 worker
    workerMemoryLimit: '4GB',   // Memory limit per worker
    
    // CRITICAL: Timeout configuration for stability
    testTimeout: 30000,         // 30 seconds max per test
    hookTimeout: 10000,         // 10 seconds for hooks
    teardownTimeout: 10000,     // 10 seconds for teardown
    
    // CRITICAL: Disable coverage globally to prevent inspector/memory crashes
    coverage: {
      enabled: false,
      provider: 'v8',
    },
    
    // CRITICAL: Force garbage collection and cleanup
    forceRerunTriggers: [
      '**/package-lock.json',
      '**/yarn.lock', 
      '**/pnpm-lock.yaml'
    ],
    
    // CRITICAL: Disable file watching in test environment
    watch: false,
    
    // CRITICAL: Minimal reporter configuration for stability
    reporter: process.env.CI === 'true' ? ['dot'] : ['default'],
    
    // CRITICAL: Optimized project configuration
    projects: [
      {
        ...sharedConfig,
        test: {
          name: 'unit',
          include: ['**/*.unit.test.{js,ts,jsx,tsx}'],
          exclude: ['node_modules/**', 'dist/**', '**/*.skip.*'],
          environment: 'jsdom',
          
          // CRITICAL: Ultra-conservative thread settings for unit tests
          pool: 'threads',
          poolOptions: {
            threads: {
              singleThread: true,
              maxThreads: 1,
              minThreads: 1,
              isolate: true,
              useAtomics: false,
            },
          },
          
          // CRITICAL: No concurrency for unit tests
          isolate: true,
          sequence: {
            concurrent: false,
            shuffle: false,
            hooks: 'stack',
          },
          maxConcurrency: 1,
          workerMemoryLimit: '4GB',
          
          // CRITICAL: Conservative timeouts
          testTimeout: process.env.CI === 'true' ? 30000 : 20000,
          hookTimeout: 8000,
          teardownTimeout: 8000,
          
          // CRITICAL: Coverage disabled
          coverage: { enabled: false },
          
          // CRITICAL: Memory monitoring
          logHeapUsage: process.env.CI !== 'true',
          
          // CRITICAL: Minimal reporter for unit tests
          reporter: 'dot',
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'component',
          include: ['**/*.component.test.{js,ts,jsx,tsx}'],
          exclude: ['node_modules/**', 'dist/**', '**/*.skip.*'],
          environment: 'jsdom',
          
          // CRITICAL: Single thread for component tests (DOM intensive)
          pool: 'threads',
          poolOptions: {
            threads: {
              singleThread: true,
              maxThreads: 1,
              minThreads: 1,
              isolate: true,
              useAtomics: false,
            },
          },
          
          // CRITICAL: Sequential execution for component tests
          isolate: true,
          sequence: {
            concurrent: false,
            shuffle: false,
            hooks: 'stack',
          },
          maxConcurrency: 1,
          workerMemoryLimit: '4GB',
          
          // CRITICAL: Extended timeouts for DOM operations
          testTimeout: process.env.CI === 'true' ? 45000 : 35000,
          hookTimeout: 12000,
          teardownTimeout: 12000,
          
          // CRITICAL: Coverage disabled
          coverage: { enabled: false },
          
          // CRITICAL: Minimal reporter
          reporter: 'dot',
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'integration',
          include: ['**/*.integration.test.{js,ts,jsx,tsx}'],
          exclude: ['node_modules/**', 'dist/**', '**/*.skip.*'],
          environment: 'node',
          
          // CRITICAL: Node environment with single thread
          pool: 'threads',
          poolOptions: {
            threads: {
              singleThread: true,
              maxThreads: 1,
              minThreads: 1,
              isolate: true,
              useAtomics: false,
            },
          },
          
          // CRITICAL: Sequential for integration tests
          isolate: true,
          sequence: {
            concurrent: false,
            shuffle: false,
            hooks: 'stack',
          },
          maxConcurrency: 1,
          workerMemoryLimit: '4GB',
          
          // CRITICAL: Extended timeouts for API calls
          testTimeout: process.env.CI === 'true' ? 60000 : 50000,
          hookTimeout: 15000,
          teardownTimeout: 15000,
          
          // CRITICAL: Coverage disabled
          coverage: { enabled: false },
          
          // CRITICAL: Minimal reporter
          reporter: 'dot',
        },
      },
      {
        ...sharedConfig,
        test: {
          name: 'e2e',
          include: ['**/*.e2e.test.{js,ts,jsx,tsx}'],
          exclude: ['node_modules/**', 'dist/**', '**/*.skip.*'],
          environment: 'node',
          
          // CRITICAL: Single thread for E2E tests
          pool: 'threads',
          poolOptions: {
            threads: {
              singleThread: true,
              maxThreads: 1,
              minThreads: 1,
              isolate: true,
              useAtomics: false,
            },
          },
          
          // CRITICAL: Sequential E2E execution
          isolate: true,
          sequence: {
            concurrent: false,
            shuffle: false,
            hooks: 'stack',
          },
          maxConcurrency: 1,
          workerMemoryLimit: '4GB',
          
          // CRITICAL: Very long timeouts for E2E
          testTimeout: process.env.CI === 'true' ? 120000 : 100000,
          hookTimeout: 30000,
          teardownTimeout: 30000,
          
          // CRITICAL: Coverage disabled
          coverage: { enabled: false },
          
          // CRITICAL: Minimal reporter
          reporter: 'dot',
        },
      },
    ],
  },
});