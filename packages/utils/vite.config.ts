/// <reference types="vitest" />
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin";
import dts from "vite-plugin-dts";
import { defineConfig, type UserConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: __dirname,
  plugins: [
    nxViteTsPaths(),
    dts({
      include: ["src/**/*"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      outDir: "dist",
      tsconfigPath: resolve(__dirname, "tsconfig.json"),
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "BibGraphUtils",
      formats: ["es"],
      fileName: () => "index.js",
    },
    sourcemap: true,
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      external: [
        // Node built-ins
        /^node:/,
        // All workspace packages
        /^@bibgraph\//,
        // Common externals
        "dexie",
        "zustand",
        "immer",
      ],
      output: {
        // Generate bundled index file instead of nested modules
        preserveModules: false,
      },
    },
  },
});
