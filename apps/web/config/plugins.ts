import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { openalexCachePlugin } from "../../../config/vite-plugins/openalex-cache";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appRoot = resolve(__dirname, "..");

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
