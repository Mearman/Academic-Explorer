import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Use source condition to resolve workspace packages to source files
    conditions: ["source", "import", "module", "default"],
  },
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
    maxConcurrency: 1,
    maxWorkers: 1,
    // Named projects for targeted test execution
    projects: [
      {
        test: {
          name: 'unit',
          include: ['__tests__/**/*.test.ts', 'src/**/*.unit.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts'],
          environment: 'node',
          testTimeout: 30000,
        },
      },
    ],
  },
});
