/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { devtools } from '@tanstack/devtools-vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    devtools(),
    TanStackRouterVite({
      // Enable hash-based routing for GitHub Pages compatibility
      routeFilePrefix: '',
      routeFileIgnorePrefix: '-',
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    vanillaExtractPlugin(),
    react(),
  ],
  // Configure for hash-based routing deployment
  base: './',
  server: {
    hmr: {
      overlay: false
    }
  },
  define: {
    __DEV__: JSON.stringify(true),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React and routing
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['@tanstack/react-router'],

          // TanStack suite
          'vendor-tanstack': [
            '@tanstack/react-query',
            '@tanstack/react-table',
            '@tanstack/react-devtools',
            '@tanstack/react-query-devtools',
            '@tanstack/react-router-devtools',
            '@tanstack/react-table-devtools'
          ],

          // Mantine UI suite
          'vendor-mantine': [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/notifications',
            '@mantine/dates',
            '@mantine/spotlight'
          ],

          // Graph visualization (route-specific)
          'vendor-xyflow': ['@xyflow/react'],

          // Icons and utilities
          'vendor-icons': ['@tabler/icons-react'],
          'vendor-utils': ['lodash-es', 'date-fns', 'zod', 'zustand']
        }
      }
    },
    // Increase chunk size warning threshold since we're now splitting properly
    chunkSizeWarningLimit: 800
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', 'src/routes/', 'src/styles/', 'src/routeTree.gen.ts'],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
} as any)