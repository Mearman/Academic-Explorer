import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { openalexCachePlugin } from "../../../config/vite-plugins/openalex-cache";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";
import type { Plugin } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appRoot = resolve(__dirname, "..");

/**
 * GitHub Pages plugin - creates .nojekyll file for proper asset serving
 */
function githubPagesPlugin(): Plugin {
  return {
    name: "github-pages",
    apply: "build",
    closeBundle() {
      const outputDir = resolve(appRoot, "dist");
      const nojekyllPath = resolve(outputDir, ".nojekyll");
      writeFileSync(nojekyllPath, "");
    },
  };
}

/**
 * Plugin configuration for the web app
 */
export const createPlugins = () => [
  // OpenAlex Cache Plugin for development caching with validation
  // Note: Using inline path constant to avoid importing from workspace packages
  // during Nx project graph generation (before dependencies are built)
  openalexCachePlugin({
    staticDataPath: "apps/web/public/data/openalex",
    verbose: true,
  }),

  // TanStack Router Plugin with correct routes directory (absolute path for Nx compatibility)
  tanstackRouter({
    routesDirectory: resolve(appRoot, "src/routes"),
    generatedRouteTree: resolve(appRoot, "src/routeTree.gen.ts"),
    routeFileIgnorePrefix: "-",
  }),

  // React Plugin
  react(),

  // GitHub Pages Plugin
  githubPagesPlugin(),
];

export const previewConfig = {
  port: 4173,
  strictPort: true,
};

export const serverConfig = () => ({
  port: 5173,
  strictPort: true,
  hmr: {
    overlay: false,
  },
});
