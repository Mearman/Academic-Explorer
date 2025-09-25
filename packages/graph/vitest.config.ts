import { defineConfig, mergeConfig } from 'vitest/config';
import { resolve } from 'path';
import baseConfig from '../../vitest.config.base.ts';

export default defineConfig(
  mergeConfig(baseConfig, {
    test: {
      // Node.js environment for pure library code
      environment: 'node',

      // Setup files for comprehensive test utilities
      setupFiles: [
        './src/__tests__/utils/vitest-setup.ts',
      ],

      // Enhanced coverage configuration
      coverage: {
        provider: 'v8',
        reporter: [
          'text',
          'text-summary',
          'json',
          'json-summary',
          'html',
          'lcov',
          'cobertura'
        ],

        // Output directories for different formats
        reportsDirectory: './coverage',

        // Include all source files for accurate coverage reporting
        include: [
          'src/**/*.ts',
          'src/**/*.tsx'
        ],

        // Comprehensive exclusions for non-testable files
        exclude: [
          'node_modules/**',
          'dist/**',
          'coverage/**',
          '**/*.d.ts',
          '**/*.config.*',
          '**/*.stories.*',
          'src/__tests__/**',
          'src/test/**',
          'src/**/*.test.*',
          'src/**/*.spec.*',
          // Exclude generated files and type-only files
          'src/**/index.ts', // Often just re-exports
          'src/types/index.ts', // Type definitions only
          'src/constants/index.ts', // Constants only
          'src/events/index.ts', // Event definitions only
        ],

        // High coverage thresholds (90%+) for comprehensive test coverage
        thresholds: {
          global: {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
          },
          // Per-file thresholds for critical Phase 2 components
          'src/providers/**': {
            branches: 95,
            functions: 95,
            lines: 95,
            statements: 95,
          },
          'src/services/**': {
            branches: 95,
            functions: 95,
            lines: 95,
            statements: 95,
          },
          'src/hooks/**': {
            branches: 90,
            functions: 90,
            lines: 90,
            statements: 90,
          },
          'src/forces/**': {
            branches: 85,
            functions: 85,
            lines: 85,
            statements: 85,
          },
        },

        // Enable watermarks for visual coverage indication
        watermarks: {
          statements: [80, 95],
          functions: [80, 95],
          branches: [80, 95],
          lines: [80, 95]
        },

        // Additional coverage options
        all: true, // Include all files in coverage, even if not tested
        clean: true, // Clean coverage directory before generating reports
        skipFull: false, // Don't skip files with 100% coverage
      },

      // Performance optimizations for coverage collection
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true, // Prevents OOM issues as per project requirements
        },
      },

      // Enhanced timeouts for coverage collection
      testTimeout: 15000,
      hookTimeout: 15000,

      // Test result configuration
      reporter: ['verbose', 'junit', 'json'],
      outputFile: {
        junit: './coverage/junit-report.xml',
        json: './coverage/test-results.json',
      },

      // Retry configuration for flaky tests
      retry: 2,
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  })
);