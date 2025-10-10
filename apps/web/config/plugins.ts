import { STATIC_DATA_CACHE_PATH } from "@academic-explorer/utils/static-data/cache-utilities";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { openalexCachePlugin } from "../../../config/vite-plugins/openalex-cache";

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

  // PWA Plugin for service worker support
  VitePWA({
    strategies: "generateSW",
    registerType: "autoUpdate",
    workbox: {
      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\.openalex\.org\/.*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "openalex-api-cache",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
            },
          },
        },
      ],
    },
    injectRegister: null, // Manual registration in main.tsx
  }),

  // React plugin
  react(),

  // Vanilla Extract for CSS-in-JS
  vanillaExtractPlugin(),
];
