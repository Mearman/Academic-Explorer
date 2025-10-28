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

  return {
    // Base path for GitHub Pages deployment
    base: process.env.GITHUB_PAGES === 'true' ? '/Academic-Explorer/' : '/',

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
        // Enable manual chunking to improve bundle size
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['@tanstack/react-router'],
            ui: ['@mantine/core', '@mantine/hooks', '@mantine/dates', '@mantine/notifications', '@tabler/icons-react'],
            table: ['@tanstack/react-table', '@tanstack/react-virtual'],
            state: ['zustand', 'immer'],
            query: ['@tanstack/react-query'],
            graph: ['@academic-explorer/simulation', '@react-three/fiber', '@react-three/drei', 'react-force-graph-2d', 'react-force-graph-3d', 'r3f-forcegraph', 'three', 'three-spritetext'],
            xyflow: ['@xyflow/react', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            client: ['@academic-explorer/client'],
            utils: ['@academic-explorer/utils'],
            graphlib: ['@academic-explorer/graph'],
            uiPackage: ['@academic-explorer/ui'],
            dexie: ['dexie'],
          },
        },
      },
    },

    // Development server configuration for the web app
    server: {
      ...base.server,
      ...serverConfig(),
      open: true,
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
