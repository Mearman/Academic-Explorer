import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import checker from 'vite-plugin-checker';
import path from 'path';
import { copyFileSync } from 'fs';
import { generateBuildInfoFile } from './scripts/generate-build-info';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Academic-Explorer/' : '/',
  plugins: [
    // Generate build info only during build, not during dev server
    {
      name: 'generate-build-info',
      buildStart() {
        // Only generate build info during build command, not dev server
        if (command === 'build') {
          try {
            generateBuildInfoFile();
            console.log('✓ Generated build info for deployment');
          } catch (error) {
            console.warn('Failed to generate build info:', error);
          }
        }
      }
    },
    react(),
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
      exclude: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.story.*',
        '**/*.stories.*',
      ],
    }),
    vanillaExtractPlugin(),
    // TypeScript checking during build
    checker({
      typescript: true,
      overlay: false,
    }),
    // Custom plugin to copy built index.html to 404.html for GitHub Pages SPA routing
    {
      name: 'copy-index-to-404',
      writeBundle() {
        try {
          copyFileSync('dist/index.html', 'dist/404.html');
          console.log('✓ Copied dist/index.html to dist/404.html for GitHub Pages SPA routing');
        } catch (error) {
          console.warn('Failed to copy index.html to 404.html:', error);
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/components': path.resolve(__dirname, './src/components'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Test file patterns for different test types
    include: (() => {
      const testType = process.env.TEST_TYPE;
      if (testType) {
        return [`**/*.${testType}.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}`];
      }
      return [
        '**/*.{unit,component,integration,e2e}.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', // Fallback for existing tests
      ];
    })(),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.ts',
        '**/*.d.ts',
        '**/*.css.ts',
        'src/lib/openalex/examples.ts',
      ],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true,
  },
}));