import { fileURLToPath, URL } from "node:url";
import { resolve } from "path";
import { defineConfig, mergeConfig } from "vite";
import baseConfig from "../../vite.config.base";

const uiOverrides = defineConfig({
  plugins: [],
  build: {
    emptyOutDir: true,
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
        "react",
        "react-dom",
        "react/jsx-runtime",
        "@mantine/core",
        "@mantine/hooks",
        "@mantine/dates",
        "@mantine/notifications",
        "@mantine/spotlight",
        "@tabler/icons-react",
        "@tanstack/react-table",
        "@xyflow/react",
        "date-fns",
        "immer",
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
  },
  resolve: {
    alias: {
      "@": resolve(fileURLToPath(new URL(".", import.meta.url)), "src"),
    },
  },
});

// Debug logging for external dependencies
console.log("UI Package externals:", uiOverrides.build.rollupOptions.external);

export default mergeConfig(baseConfig, uiOverrides);
