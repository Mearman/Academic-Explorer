import { defineConfig, type UserConfig } from 'vite';
import baseConfig from '../../vite.config.base';
import { createPlugins, serverConfig, previewConfig } from './config/plugins';

// Type-safe configuration creation
function createWebConfig(): UserConfig {
  // Type guard for base configuration
  function isValidUserConfig(config: unknown): config is UserConfig {
    return config !== null && typeof config === 'object';
  }

  // Validate base configuration type
  if (!isValidUserConfig(baseConfig)) {
    throw new Error('Base configuration is not a valid UserConfig');
  }

  const base = baseConfig;

  const isGitHubPages = process.env.GITHUB_PAGES === 'true';

  return {
    // Base path for GitHub Pages deployment
    base: isGitHubPages ? '/Academic-Explorer/' : '/',

    // Pass GITHUB_PAGES to client code via import.meta.env
    // Use envPrefix to expose GITHUB_PAGES as import.meta.env.GITHUB_PAGES
    envPrefix: ['VITE_', 'GITHUB_PAGES'],

    // Inherit base configuration properties safely
    ...base,

    // Use configured plugins from config/plugins.ts
    plugins: [
      ...(base.plugins || []),
      ...createPlugins(),
    ],

    // Ensure resolve configuration is properly inherited
    resolve: {
      ...(base.resolve || {}),
    },

    build: {
      ...base.build,
      outDir: 'dist',
      rollupOptions: {
        // For web app, we don't want external dependencies
        // Don't spread base.build.rollupOptions since it has external deps for library builds
        onwarn: base.build?.rollupOptions?.onwarn,
        // Enhanced manual chunking with better optimization
        output: {
          manualChunks: (id) => {
            // Core React ecosystem
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }

            // TanStack ecosystem
            if (id.includes('@tanstack/react-router')) {
              return 'vendor-router';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('@tanstack/react-table') || id.includes('@tanstack/react-virtual')) {
              return 'vendor-table';
            }

            // Mantine UI (split for better caching)
            if (id.includes('@mantine/core') || id.includes('@mantine/hooks')) {
              return 'vendor-ui-core';
            }
            if (id.includes('@mantine/dates') || id.includes('@mantine/notifications')) {
              return 'vendor-ui-extra';
            }
            if (id.includes('@tabler/icons-react')) {
              return 'vendor-icons';
            }

            // Graph visualization (split by library for better loading)
            if (id.includes('@xyflow/react') || id.includes('@dnd-kit')) {
              return 'vendor-xyflow';
            }
            if (id.includes('@react-three') || id.includes('three') || id.includes('react-force-graph') || id.includes('r3f-forcegraph')) {
              return 'vendor-three';
            }

            // Database and storage
            if (id.includes('dexie')) {
              return 'vendor-storage';
            }

            // Workspace packages
            if (id.includes('@academic-explorer/client')) {
              return 'workspace-client';
            }
            if (id.includes('@academic-explorer/graph')) {
              return 'workspace-graph';
            }
            if (id.includes('@academic-explorer/utils')) {
              return 'workspace-utils';
            }
            if (id.includes('@academic-explorer/ui')) {
              return 'workspace-ui';
            }
            if (id.includes('@academic-explorer/simulation')) {
              return 'workspace-simulation';
            }

            // Node modules fallback
            if (id.includes('node_modules')) {
              return 'vendor-libs';
            }

            // Default chunk
            return 'chunk';
          },
          // Optimize chunk naming for better caching
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
            return `assets/[name]-[hash].js`;
          },
          assetFileNames: (assetInfo) => {
            if (!assetInfo.name) {
              return `assets/[name]-[hash][extname]`;
            }
            const info = assetInfo.name.split('.');
            const extType = info[info.length - 1];
            if (/\.(css)$/.test(assetInfo.name)) {
              return `assets/css/[name]-[hash][extname]`;
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
        // Enable additional optimizations
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
      // Optimize build targets and compression
      target: 'esnext',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        },
        mangle: {
          safari10: true,
        },
      },
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Generate source maps for production debugging
      sourcemap: true,
      // Optimize chunk size warnings
      chunkSizeWarningLimit: 1000,
    },

    // Development server configuration for the web app
    server: {
      ...base.server,
      ...serverConfig(),
      open: true,
    },

    // Improve HMR and resolve issues
    optimizeDeps: {
      ...base.optimizeDeps,
      include: [
        'react',
        'react-dom',
        '@tanstack/react-router',
        '@tanstack/react-query',
        '@mantine/core',
        '@mantine/hooks',
      ],
      exclude: [
        '@academic-explorer/client',
        '@academic-explorer/utils',
        '@academic-explorer/graph',
        '@academic-explorer/simulation',
      ],
      force: true,
    },

    // Define global replacements for browser compatibility
    define: {
      ...base.define,
      global: 'globalThis',
    },

    // Preview server configuration
    preview: {
      ...base.preview,
      ...previewConfig,
      open: true,
    },
  };
}

// Create and export the configuration
export default defineConfig(createWebConfig());
