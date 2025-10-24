import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import baseConfig from '../../vite.config.base';

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
    // Inherit base configuration properties safely
    ...base,

    plugins: [
      ...(base.plugins || []),
      react(),
    ],

    build: {
      ...base.build,
      outDir: 'dist',
      rollupOptions: {
        ...base.build?.rollupOptions,
        output: {
          ...base.build?.rollupOptions?.output,
          manualChunks: {
            // Split vendor chunks for better caching
            vendor: ['react', 'react-dom'],
            router: ['@tanstack/react-router'],
            ui: ['@mantine/core', '@mantine/hooks'],
          },
        },
      },
    },

    // Development server configuration for the web app
    server: {
      ...base.server,
      port: 5173,
      open: true,
    },

    // Preview server configuration
    preview: {
      ...base.preview,
      port: 4173,
      open: true,
    },
  };
}

// Create and export the configuration
export default defineConfig(createWebConfig());
