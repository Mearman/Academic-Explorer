/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()] as any,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
    globals: true,
    watch: false,
    exclude: [
      "node_modules",
      "**/*.e2e.test.ts", // Exclude E2E tests from Vitest
      "**/*.integration.test.ts", // Exclude all integration tests
      "**/*.integration.test.tsx", // Exclude all integration tests
    ],
  },
});
