import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';
import { copyFileSync } from 'fs';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Academic-Explorer/' : '/',
  plugins: [
    react(),
    TanStackRouterVite(),
    vanillaExtractPlugin(),
    // Custom plugin to copy 404.html for GitHub Pages SPA routing
    {
      name: 'copy-404',
      closeBundle() {
        try {
          copyFileSync('public/404.html', 'dist/404.html');
        } catch (error) {
          console.warn('Failed to copy 404.html:', error);
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