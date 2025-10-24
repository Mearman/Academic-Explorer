import { STATIC_DATA_CACHE_PATH } from "@academic-explorer/utils/static-data/cache-utilities";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { openalexCachePlugin } from "../../../config/vite-plugins/openalex-cache";

/**
 * Plugin configuration for the web app
 */
export const createPlugins = () => [
  // OpenAlex Cache Plugin for development caching with validation
  openalexCachePlugin({
    staticDataPath: STATIC_DATA_CACHE_PATH,
    verbose: true,
  }),

  // TanStack Router Plugin with correct routes directory
  tanstackRouter({
    routesDirectory: "./src/routes",
    generatedRouteTree: "./src/routeTree.gen.ts",
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
