/// <reference types="vitest" />
import { defineConfig, mergeConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { resolve } from "path";
import { baseVitestConfig } from "../../vitest.config.base";

export default defineConfig(
  mergeConfig(baseVitestConfig, {
    test: {
      exclude: [
        "node_modules",
        "dist",
        "coverage",
        ".nx",
        "**/*.d.ts",
        "**/routeTree.gen.ts",
        "**/*.e2e.test.ts",
      ],
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
      coverage: {
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
  }),
);
