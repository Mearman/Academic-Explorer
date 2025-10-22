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
export const createPlugins = ({
  command,
  mode,
}: {
  command: string;
  mode: string;
}) => [
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

  // React plugin
  react(),

  // PWA Plugin with custom service worker
  VitePWA({
    strategies: "injectManifest",
    srcDir: "src/workers",
    filename: "openalex-sw.ts",
    registerType: "autoUpdate",
    injectRegister: "auto",
    devOptions: {
      enabled: true,
      type: "module",
    },
    injectManifest: {
      globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      globIgnores: ["**/node_modules/**/*"],
      injectionPoint: "self.__WB_MANIFEST",
    },
    // PWA manifest configuration
    manifest: {
      name: "Academic Explorer",
      short_name: "Academic Explorer",
      description: "Explore academic research and scholarly data",
      theme_color: "#1e40af",
      background_color: "#ffffff",
      display: "standalone",
      icons: [
        {
          src: "pwa-192x192.svg",
          sizes: "192x192",
          type: "image/svg+xml",
        },
        {
          src: "pwa-512x512.svg",
          sizes: "512x512",
          type: "image/svg+xml",
        },
      ],
    },
  }),

  // Vanilla Extract for CSS-in-JS
  vanillaExtractPlugin(),
];
