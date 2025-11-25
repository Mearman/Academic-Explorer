import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
      all: true,
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
    },
    maxConcurrency: 1,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
