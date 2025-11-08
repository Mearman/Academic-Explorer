import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { openalexCachePlugin } from "../../../config/vite-plugins/openalex-cache";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
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
      // Ensure output directory exists
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
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
    staticDataPath: "public/data/openalex",
    verbose: false, // Reduced verbosity to prevent console spam
  }),

  // TanStack Router Plugin with correct routes directory (absolute path for Nx compatibility)
  // TEMPORARILY DISABLED: Route generator has parsing issues with some route files
  // Using static routeTree.gen.ts until generator is fixed
  // tanstackRouter({
  //   routesDirectory: resolve(appRoot, "src/routes"),
  //   generatedRouteTree: resolve(appRoot, "src/routeTree.gen.ts"),
  //   routeFileIgnorePrefix: "-",
  //   routeFileIgnorePattern: ".(test|spec|d.ts).",
  // }),

  // Vanilla Extract Plugin for CSS-in-TypeScript
  vanillaExtractPlugin(),

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
    overlay: true,
    port: 5174,
  },
  fs: {
    strict: true,
  },
  watch: {
    usePolling: false,
    interval: 300, // Increased to reduce CPU usage
    ignored: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/public/data/**', // Ignore static data changes
      '**/*.log',
      '**/.nx/**',
    ],
  },
});
