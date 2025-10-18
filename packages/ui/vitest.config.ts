/// <reference types="vitest" />
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "path";

export default defineConfig(() => ({
  test: {
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "node_modules",
      "dist",
      "coverage",
      ".nx",
      "**/*.d.ts",
      "**/routeTree.gen.ts",
      "**/*.e2e.test.ts",
    ],
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    seed: 12345,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.stories.*",
        "**/*.config.*",
        "dist/",
        "coverage/",
        "**/*.test.*",
        "**/*.spec.*",
      ],
      thresholds: {
        global: { branches: 80, functions: 80, lines: 80, statements: 80 },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(fileURLToPath(new URL(".", import.meta.url)), "src"),
    },
  },
}));
