import { fileURLToPath, URL } from "node:url";
import { resolve } from "path";
import { defineConfig } from "vite";

// Development configuration with React included
// This allows Vite to handle React 19 types transformation during development
const devConfig = defineConfig({
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
    sourcemap: true,
    copyPublicDir: false,
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      // Externalize all dependencies including React (peer dependencies)
      external: [
        // React (peer dependency - must be externalized)
        "react",
        "react-dom",
        "react/jsx-runtime",

        // Mantine UI library (heavy)
        "@mantine/core",
        "@mantine/hooks",
        "@mantine/dates",
        "@mantine/notifications",
        "@mantine/spotlight",

        // Icons (large)
        "@tabler/icons-react",

        // Other heavy dependencies
        "@tanstack/react-table",
        "@tanstack/react-router",
        "@xyflow/react",
        "date-fns",
        "immer",

        // Internal workspace dependencies (avoid circular dependencies)
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

  esbuild: {
    jsx: "automatic",
    jsxFactory: "React",
    jsxFragment: "React.Fragment",
  },

  resolve: {
    alias: {
      "@": resolve(fileURLToPath(new URL(".", import.meta.url)), "src"),
    },
  },
});

export default devConfig;