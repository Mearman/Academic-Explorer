/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
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
  test: {
    projects: [
      {
        name: 'unit',
        include: ['src/**/*.unit.test.ts', 'src/**/*.test.ts'],
        exclude: ['src/**/*.integration.test.ts', 'src/**/*.component.test.ts', 'src/**/*.e2e.test.ts'],
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          exclude: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            '**/*.d.ts',
            '**/*.config.*',
            '**/routeTree.gen.ts',
            'src/test/**'
          ]
        }
      },
      {
        name: 'integration',
        include: ['src/**/*.integration.test.ts'],
        globals: true,
        environment: 'node',
        setupFiles: ['./src/test/setup.ts'],
        testTimeout: 45000,
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          exclude: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            '**/*.d.ts',
            '**/*.config.*',
            '**/routeTree.gen.ts',
            'src/test/**'
          ]
        }
      }
    ]
  }
})
