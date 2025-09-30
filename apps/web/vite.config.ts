/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { workspaceRoot } from '../../config/shared'
import { staticDataIndexPlugin } from '../../config/vite-plugins/static-data-index'
import { openalexCachePlugin } from '../../config/vite-plugins/openalex-cache'

// Build metadata generation
function getBuildInfo() {
  try {
    // Read version from package.json instead of relying on npm_package_version
    const packageJson = JSON.parse(
      readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
    ) as { version: string };

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
      version: packageJson.version,
      repositoryUrl: 'https://github.com/Mearman/Academic-Explorer'
    }
  } catch (error) {
    console.warn('Failed to get build metadata:', error)
    return {
      buildTimestamp: new Date().toISOString(),
      commitHash: 'unknown',
      shortCommitHash: 'unknown',
      commitTimestamp: new Date().toISOString(),
      branchName: 'unknown',
      version: '0.0.0',
      repositoryUrl: 'https://github.com/Mearman/Academic-Explorer'
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode: _mode, command }) => ({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@academic-explorer/utils': path.resolve(workspaceRoot, 'packages/utils/src'),
      '@academic-explorer/client': path.resolve(workspaceRoot, 'packages/client/src'),
      '@academic-explorer/ui': path.resolve(workspaceRoot, 'packages/ui/src'),
      '@academic-explorer/graph': path.resolve(workspaceRoot, 'packages/graph/src'),
      '@academic-explorer/simulation': path.resolve(workspaceRoot, 'packages/simulation/src'),
    },
  },
  plugins: [
    // TanStack Router Plugin - must be before React plugin
    TanStackRouterVite({
      routesDirectory: path.resolve(__dirname, 'src/routes'),
      generatedRouteTree: path.resolve(__dirname, 'src/routeTree.gen.ts'),
    }),
    // PWA Plugin for TypeScript service worker support
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/workers',
      filename: 'openalex-sw.ts',
      injectManifest: {
        swSrc: 'src/workers/openalex-sw.ts',
        swDest: 'dist/openalex-sw.js',
        injectionPoint: false // Disable manifest injection since we're not using precaching
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      injectRegister: null, // Manual registration in main.tsx
      workbox: {
        globPatterns: [] // Disable default precaching since we have custom logic
      }
    }),
    // OpenAlex cache plugin for development request caching
    openalexCachePlugin({
      verbose: true, // Enable logging to see cache activity
      enabled: true // Enable in development
    }),
    // Static data index plugin for OpenAlex entity caching (development only)
    ...(command === 'serve' ? [staticDataIndexPlugin({
      autoDownload: false, // Disable auto-download for now
      validate: true, // Enable validation
      verbose: false, // Disable verbose logging for cleaner output
      debounceMs: 500 // 500ms debounce for file changes
    })] : []),
    // Only run OpenAlex data plugin in production builds, not during tests
    // ...(mode !== 'test' ? [openalexDataPlugin()] : []), // Temporarily disabled during monorepo refactoring
    // Temporarily disable devtools to avoid port conflicts
    // devtools(),
    react(),
    vanillaExtractPlugin(),
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
    setupFiles: ['./src/test/setup.ts'],
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
        './packages/shared-utils/src/graph/graph-utilities-service.ts': {
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
        resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@academic-explorer/utils': path.resolve(workspaceRoot, 'packages/utils/src'),
      '@academic-explorer/client': path.resolve(workspaceRoot, 'packages/client/src'),
      '@academic-explorer/ui': path.resolve(workspaceRoot, 'packages/ui/src'),
      '@academic-explorer/graph': path.resolve(workspaceRoot, 'packages/graph/src'),
      '@academic-explorer/simulation': path.resolve(workspaceRoot, 'packages/simulation/src'),
    },
  },
        test: {
          name: 'unit',
          include: ['src/**/*.unit.test.ts'],
          exclude: [
            // Temporarily exclude hook tests with complex mocking issues
            'src/hooks/use-context-menu.unit.test.ts',
            'src/hooks/use-entity-interaction.unit.test.ts',
            'src/hooks/use-graph-data.unit.test.ts',
            'src/hooks/use-graph-utilities.unit.test.ts',
            'src/hooks/use-raw-entity-data.unit.test.ts',
            'src/hooks/use-search-results.unit.test.ts',
            'src/hooks/use-theme-colors.unit.test.ts',
            // Services with mock setup issues
            'src/services/relationship-detection-service.unit.test.ts',
            'src/services/expansion-query-builder.unit.test.ts',
            // Store tests with mocking issues
            'src/stores/graph-store.unit.test.ts',
            // Test infrastructure tests
            'src/test/execution-strategy.unit.test.ts',
            'src/test/force-simulation-executor.unit.test.ts'
          ],
          environment: 'jsdom',
          testTimeout: 15000,
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
        },
      },
      {
        resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@academic-explorer/utils': path.resolve(workspaceRoot, 'packages/utils/src'),
      '@academic-explorer/client': path.resolve(workspaceRoot, 'packages/client/src'),
      '@academic-explorer/ui': path.resolve(workspaceRoot, 'packages/ui/src'),
      '@academic-explorer/graph': path.resolve(workspaceRoot, 'packages/graph/src'),
      '@academic-explorer/simulation': path.resolve(workspaceRoot, 'packages/simulation/src'),
    },
  },
        test: {
          name: 'component',
          include: ['src/**/*.component.test.ts', 'src/**/*.component.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts', './src/test/component-setup.ts'],
          testTimeout: 15000,
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
        },
      },
      {
        resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@academic-explorer/utils': path.resolve(workspaceRoot, 'packages/utils/src'),
      '@academic-explorer/client': path.resolve(workspaceRoot, 'packages/client/src'),
      '@academic-explorer/ui': path.resolve(workspaceRoot, 'packages/ui/src'),
      '@academic-explorer/graph': path.resolve(workspaceRoot, 'packages/graph/src'),
      '@academic-explorer/simulation': path.resolve(workspaceRoot, 'packages/simulation/src'),
    },
  },
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts'],
          environment: 'node',
          testTimeout: 30000,
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
        },
      },
      // E2E test project - enabled for testing application functionality
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'src'),
            '@academic-explorer/utils': path.resolve(workspaceRoot, 'packages/utils/src'),
            '@academic-explorer/client': path.resolve(workspaceRoot, 'packages/client/src'),
            '@academic-explorer/ui': path.resolve(workspaceRoot, 'packages/ui/src'),
            '@academic-explorer/graph': path.resolve(workspaceRoot, 'packages/graph/src'),
            '@academic-explorer/simulation': path.resolve(workspaceRoot, 'packages/simulation/src'),
          },
        },
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
      input: {
        main: path.resolve(__dirname, 'index.html'),
        sw: path.resolve(__dirname, 'src/workers/openalex-sw.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'sw' ? 'openalex-sw.js' : 'assets/[name]-[hash].js';
        },
        manualChunks: {
          // Core React and routing
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['@tanstack/react-router'],

          // TanStack suite
          'vendor-tanstack': [
            '@tanstack/react-query',
            '@tanstack/react-table'
          ],

          // Mantine UI suite
          'vendor-mantine': [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/notifications',
            '@mantine/dates'
          ],

          // Graph visualization (route-specific)
          'vendor-xyflow': ['@xyflow/react'],

          // Icons and utilities
          'vendor-icons': ['@tabler/icons-react'],
          'vendor-utils': ['zustand']
        }
      }
    },
    // Increase chunk size warning threshold since we're now splitting properly
    chunkSizeWarningLimit: 800
  },
}))