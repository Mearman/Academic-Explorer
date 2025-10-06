import { tanstackRouter } from "@tanstack/router-vite-plugin";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { openalexCachePlugin } from "../../../config/vite-plugins/openalex-cache";
import { STATIC_DATA_CACHE_PATH } from "@academic-explorer/utils/static-data/cache-utilities";

/**
 * Plugin configuration for the web app
 * Contains all Vite plugins with their configuration
 */
export const createPlugins = (_command: string, _mode: string) => [
  // OpenAlex Cache Plugin for development caching with validation
  openalexCachePlugin({
    staticDataPath: STATIC_DATA_CACHE_PATH,
    verbose: true,
  }),

  // TanStack Router Plugin - must be before React plugin
  tanstackRouter({
    routesDirectory: path.resolve(__dirname, "../src/routes"),
    generatedRouteTree: path.resolve(__dirname, "../src/routeTree.gen.ts"),
    routeFileIgnorePrefix: "-",
  }),

  // PWA Plugin for TypeScript service worker support
  VitePWA({
    strategies: "injectManifest",
    srcDir: "src/workers",
    filename: "openalex-sw.ts",
    injectManifest: {
      swSrc: "src/workers/openalex-sw.ts",
      swDest: "dist/openalex-sw.js",
      injectionPoint: "self.__WB_MANIFEST", // Use default injection point
    },
    devOptions: {
      enabled: true,
      type: "module",
    },
    injectRegister: null, // Manual registration in main.tsx
    workbox: {
      globPatterns: [], // Disable default precaching since we have custom logic
    },
  }),

  // React plugin
  react(),

  // Vanilla Extract for CSS-in-JS
  vanillaExtractPlugin(),
];
