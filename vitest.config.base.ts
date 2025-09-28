import { defineConfig, type UserConfig } from 'vitest/config';

/**
 * Base Vitest configuration for Academic Explorer monorepo
 *
 * This provides common test configuration that can be extended by:
 * - Packages (libraries with Node.js environment)
 * - Apps (React components with jsdom environment)
 *
 * Usage in individual configs:
 * ```ts
 * import { mergeConfig } from 'vitest/config';
 * import baseConfig from '../../vitest.config.base.ts';
 *
 * export default mergeConfig(baseConfig, {
 *   // package-specific overrides
 * });
 * ```
 */

export const baseVitestConfig: UserConfig = {
  test: {
    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'coverage',
      '.nx',
      '**/*.d.ts',
      '**/routeTree.gen.ts',
    ],

    // Global test configuration
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.stories.*',
        '**/*.config.*',
        'dist/',
        'coverage/',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Performance configuration for monorepo
    // Serial execution prevents OOM issues with large test suites
    // Use threads in CI environment to prevent hanging, forks locally for isolation
    pool: process.env.CI ? 'threads' : 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
      threads: {
        singleThread: true,
      },
    },

    // Timeout configuration - shorter in CI to prevent hangs
    testTimeout: process.env.CI ? 30000 : 10000,
    hookTimeout: process.env.CI ? 30000 : 10000,

    // Silent mode for cleaner output in monorepo
    silent: false,
    reporter: process.env.CI ? ['default'] : ['verbose'],

    // Retry configuration - less retries in CI to prevent hanging
    retry: process.env.CI ? 0 : 1,

    // Standard test projects for consistent patterns across packages
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.unit.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
};

// Export as default config for packages that don't need customization
export default defineConfig(baseVitestConfig);