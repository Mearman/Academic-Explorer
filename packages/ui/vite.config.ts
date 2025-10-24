import { fileURLToPath, URL } from "node:url";
import { resolve } from "path";
import { defineConfig, mergeConfig } from "vite";
import baseConfig from "../../vite.config.base";

// UI library-specific Vite configuration
// Optimized for library distribution with proper externals
const uiConfig = defineConfig({
  build: {
    lib: {
      entry: resolve(
        fileURLToPath(new URL(".", import.meta.url)),
        "src/index.ts",
      ),
      name: "AcademicExplorerUI",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
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
        "@xyflow/react",
        "date-fns",
        "immer",

        // Internal workspace dependencies
        "@academic-explorer/types",
        "@academic-explorer/utils",
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
          "@xyflow/react": "XYFlow",
          "date-fns": "dateFns",
          immer: "immer",
        },
      },
    },
    sourcemap: true,
    copyPublicDir: false,
    emptyOutDir: true,
    target: "esnext",
  },

  resolve: {
    alias: {
      "@": resolve(fileURLToPath(new URL(".", import.meta.url)), "src"),
    },
  },
});

// Type assertion to handle mergeConfig compatibility between different Vite versions
export default mergeConfig(baseConfig, uiConfig) as any;
