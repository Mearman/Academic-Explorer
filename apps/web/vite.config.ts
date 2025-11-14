import { defineConfig, type UserConfig, type PluginOption } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { openalexCachePlugin } from '../../config/vite-plugins/openalex-cache';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appRoot = resolve(__dirname, "..");

/**
 * GitHub Pages plugin - creates .nojekyll file for proper asset serving
 */
function githubPagesPlugin(): PluginOption {
  return {
    name: "github-pages",
    apply: "build",
    closeBundle() {
      const outputDir = resolve(appRoot, "dist");
      // Ensure output directory exists
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      const nojekyllPath = resolve(outputDir, ".nojekyll");
      writeFileSync(nojekyllPath, "");
    },
  };
}

// Type-safe configuration creation
function createWebConfig(): UserConfig {
  const isGitHubPages = process.env.GITHUB_PAGES === 'true';

  return {
    // Base path for GitHub Pages deployment
    base: isGitHubPages ? '/Academic-Explorer/' : '/',

    // Pass GITHUB_PAGES to client code via import.meta.env
    envPrefix: ['VITE_', 'GITHUB_PAGES'],

    // Plugins configuration
    plugins: [
      nxViteTsPaths(),
      // OpenAlex Cache Plugin
      openalexCachePlugin({
        staticDataPath: "public/data/openalex",
        verbose: false,
      }),
      // Vanilla Extract Plugin
      vanillaExtractPlugin(),
      // React Plugin
      react(),
      // GitHub Pages Plugin
      githubPagesPlugin(),
    ],

    // Build configuration
    build: {
      outDir: 'dist',
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: true,
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress certain warnings that are common in monorepos
          if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
          if (warning.code === "THIS_IS_UNDEFINED") return;
          warn(warning);
        },
        output: {
          // Removed manual chunking - React 19 has initialization issues with manual vendor chunks
          // Let Vite/Rollup handle chunking automatically
          manualChunks: undefined,
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
        // Removed aggressive tree-shaking config - use Rollup defaults
        // React 19 scheduler requires proper module side effect handling
        treeshake: true,
      },
      chunkSizeWarningLimit: 1000,
    },

    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },

    // Development server configuration
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      hmr: {
        overlay: true,
        port: 5174,
      },
      fs: {
        strict: true,
      },
      watch: {
        usePolling: false,
        interval: 300,
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          '**/public/data/**',
          '**/*.log',
          '**/.nx/**',
        ],
      },
    },

    // Optimize dependencies
    optimizeDeps: {
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

    // Define global replacements
    define: {
      global: 'globalThis',
    },

    // Preview server configuration
    preview: {
      port: 4173,
      strictPort: true,
    },
  };
}

// Create and export the configuration
export default defineConfig(createWebConfig());
