/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { devtools } from '@tanstack/devtools-vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { execSync } from 'child_process'
import { resolveConfig, testSetupFiles } from './config/shared'

// Build metadata generation
function getBuildInfo() {
  try {
    const now = new Date()
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    const shortCommitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    const commitTimestamp = execSync('git log -1 --format=%ct', { encoding: 'utf8' }).trim()
    const commitDate = new Date(parseInt(commitTimestamp) * 1000)
    const branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()

    return {
      buildTimestamp: now.toISOString(),
      commitHash,
      shortCommitHash,
      commitTimestamp: commitDate.toISOString(),
      branchName,
      version: process.env.npm_package_version || '0.0.0',
      repositoryUrl: 'https://github.com/Mearman/Academic-Explorer'
    }
  } catch (error) {
    console.warn('Failed to get git information:', error)
    return {
      buildTimestamp: new Date().toISOString(),
      commitHash: 'unknown',
      shortCommitHash: 'unknown',
      commitTimestamp: new Date().toISOString(),
      branchName: 'unknown',
      version: process.env.npm_package_version || '0.0.0',
      repositoryUrl: 'https://github.com/Mearman/Academic-Explorer'
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  resolve: resolveConfig,
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
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.openalex\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'openalex-api-cache',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Academic Explorer',
        short_name: 'AcademicExplorer',
        description: 'Explore academic literature through the OpenAlex API with interactive visualizations',
        theme_color: '#228be6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: './',
        start_url: './',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    }),
  ],
  // Configure for hash-based routing deployment
  base: './',
  server: {
    port: 5173,
    strictPort: true, // Fail if port is already in use instead of trying another port
    hmr: {
      overlay: false
    }
  },
  preview: {
    port: 4173,
    strictPort: true, // Fail if port is already in use instead of trying another port
  },
  define: {
    __DEV__: JSON.stringify(true),
    __BUILD_INFO__: JSON.stringify(getBuildInfo()),
  },
  worker: {
    format: 'es', // Enable ES module format for workers
  },
  test: {
    globals: true,
    setupFiles: testSetupFiles,
    watch: false,
    reporters: [
      [
        'default',
        {
          summary: false
        }
      ]
    ],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.config.js',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        'src/routeTree.gen.ts',
        'src/test/**',
        '**/vite.config.ts',
        '**/vitest.config.ts',
        '**/vitest.workspace.ts',
        '**/.eslintrc.{js,cjs}',
        '**/eslint.config.{js,ts}',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        perFile: true,
        skipFull: false,
        autoUpdate: false,
        './src/lib/graph/graph-utilities-service.ts': {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0,
        },
        './src/hooks/use-graph-utilities.ts': {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0,
        },
      },
    },
    projects: [
      {
        resolve: resolveConfig,
        test: {
          name: 'unit',
          include: ['src/**/*.unit.test.ts'],
          environment: 'jsdom',
          testTimeout: 30000,
        },
      },
      {
        resolve: resolveConfig,
        test: {
          name: 'component',
          include: ['src/**/*.component.test.ts', 'src/**/*.component.test.tsx'],
          environment: 'jsdom',
          testTimeout: 30000,
        },
      },
      {
        resolve: resolveConfig,
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts'],
          environment: 'node',
          testTimeout: 45000,
        },
      },
      {
        resolve: resolveConfig,
        test: {
          name: 'e2e',
          include: ['src/**/*.e2e.test.ts'],
          environment: 'node',
          testTimeout: 90000,
          setupFiles: ['./src/test/setup.ts', './src/test/e2e-setup.ts'],
          // Serial execution for memory efficiency
          maxConcurrency: 1,
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
        },
      },
    ],
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
            '@tanstack/react-router-devtools'
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
          'vendor-d3': ['d3-force', 'd3-random'],

          // Icons and utilities
          'vendor-icons': ['@tabler/icons-react'],
          'vendor-utils': ['lodash-es', 'date-fns', 'zustand']
        }
      }
    },
    // Increase chunk size warning threshold since we're now splitting properly
    chunkSizeWarningLimit: 800
  },
})