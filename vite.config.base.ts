/// <reference types="vitest" />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  // Note: This is resolved dynamically relative to this config file
  resolve: {
    alias: {
      "@": resolve(__dirname, "apps/web/src"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
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
      // External dependencies for library builds
      external: [
        // React ecosystem
        "react",
        "react-dom",
        "react/jsx-runtime",

        // Mantine UI library
        "@mantine/core",
        "@mantine/hooks",
        "@mantine/dates",
        "@mantine/notifications",
        "@mantine/spotlight",

        // Icons and utilities
        "@tabler/icons-react",
        "@tanstack/react-table",
        "@tanstack/react-router",
        "@xyflow/react",
        "date-fns",
        "immer",

        // Internal workspace dependencies
        "@academic-explorer/types",
        "@academic-explorer/utils",
        "@academic-explorer/graph",
      ],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "jsxRuntime",
          "@mantine/core": "MantineCore",
          "@mantine/hooks": "MantineHooks",
          "@mantine/dates": "MantineDates",
          "@mantine/notifications": "MantineNotifications",
          "@mantine/spotlight": "MantineSpotlight",
          "@tabler/icons-react": "TablerIcons",
          "@tanstack/react-table": "ReactTable",
          "@tanstack/react-router": "ReactRouter",
          "@xyflow/react": "XYFlow",
          "date-fns": "dateFns",
          immer: "immer",
        },
      },
    },
  },

  // Optimized dependencies handling for monorepo
  optimizeDeps: {
    include: [],
  },
});
