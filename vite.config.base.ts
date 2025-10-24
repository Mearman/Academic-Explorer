/// <reference types="vitest" />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { defineConfig } from "vite";

// Workspace-level Vite configuration with Nx best practices
// This provides common configuration for all projects in the monorepo
export default defineConfig({
  // Nx TypeScript paths plugin for proper module resolution
  plugins: [nxViteTsPaths()],

  // Global environment variables
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
  },

  // Path aliases for absolute imports
  resolve: {
    alias: {
      "@": "/Users/joe/Documents/Research/PhD/Academic Explorer/apps/web/src",
    },
  },

  // Common configuration that applies to all projects
  server: {
    host: true,
    port: 4200,
  },

  build: {
    target: "esnext",
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress certain warnings that are common in monorepos
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        if (warning.code === "THIS_IS_UNDEFINED") return;
        warn(warning);
      },
    },
  },

  // Optimized dependencies handling for monorepo
  optimizeDeps: {
    include: [],
  },
});
