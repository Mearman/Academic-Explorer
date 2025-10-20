/// <reference types='vitest' />

export const baseVitestConfig = {
  test: {
    seed: 12345,
    reporters: ["default"],
    globals: true,
    testTimeout: 10000, // 10 seconds per test
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8" as const,
    },
  },
};
