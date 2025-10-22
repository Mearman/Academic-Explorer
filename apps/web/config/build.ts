import path from "path";

/**
 * Build configuration for the web app
 *
 * This configuration optimizes the production build by:
 * - Using hash-based routing (base: "./") for deployment flexibility
 * - Splitting vendor code into logical chunks for better caching
 * - Configuring service worker entry point separately
 * - Setting appropriate chunk size limits
 */
export const buildConfig = (isProduction: boolean = false) => ({
  // Configure for hash-based routing deployment
  // Allows the app to be deployed in any subdirectory
  base: "./",

  build: {
    rollupOptions: {
      external: ["@academic-explorer/types"],
      input: {
        // Main HTML entry point
        main: path.resolve(__dirname, "../index.html"),
        // Service worker is now handled by VitePWA injectManifest
      },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        manualChunks: {
          // Core React and routing - loaded first for fast initial render
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["@tanstack/react-router"],

          // TanStack suite - data fetching and table functionality
          "vendor-tanstack": ["@tanstack/react-query", "@tanstack/react-table"],

          // Mantine UI suite - split by functionality for better caching
          // Core components and utilities
          "vendor-mantine": [
            "@mantine/core",
            "@mantine/hooks",
            "@mantine/notifications",
            "@mantine/dates",
          ],

          // Graph visualization - loaded on-demand for graph routes only
          "vendor-xyflow": ["@xyflow/react"],

          // Icons and utilities - shared across the entire app
          "vendor-icons": ["@tabler/icons-react"],
          "vendor-utils": ["zustand"],
        },
      },
    },
    // Increase chunk size warning threshold since we're now splitting properly
    // This reduces false warnings while maintaining reasonable bundle sizes
    chunkSizeWarningLimit: 800,
  },
});
