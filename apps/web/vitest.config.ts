/// <reference types="vitest" />
import { defineConfig, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { baseVitestConfig } from "../../vitest.config.base";

export default defineConfig(
  mergeConfig(baseVitestConfig, {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    test: {
      environment: "jsdom",
      setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
      watch: false,
    },
  }),
);
