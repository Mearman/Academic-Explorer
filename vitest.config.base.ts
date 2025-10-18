/// <reference types='vitest' />

export const baseVitestConfig = {
  test: {
    seed: 12345,
    reporters: ["default"],
    globals: true,
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8" as const,
    },
  },
};
