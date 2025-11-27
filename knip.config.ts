import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: [
        'scripts/*.ts',
        'tools/scripts/*.ts',
      ],
      project: ['scripts/**/*.ts', 'tools/scripts/**/*.ts'],
      ignore: [
        'dist/**',
        'coverage/**',
        '.nx/**',
        'node_modules/**',
      ],
    },
    'apps/web': {
      entry: [
        'src/main.tsx',
        'src/routes/**/*.tsx',
        'vite.config.ts',
        'playwright.config.ts',
        'e2e/**/*.ts',
      ],
      project: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts'],
      ignore: ['dist/**', 'coverage/**'],
    },
    'apps/cli': {
      entry: ['src/openalex-cli.ts', 'src/index.ts'],
      project: ['src/**/*.ts'],
      ignore: ['dist/**'],
    },
    'packages/types': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
      ignore: ['dist/**'],
    },
    'packages/utils': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
      ignore: ['dist/**'],
    },
    'packages/client': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
      ignore: ['dist/**'],
    },
    'packages/ui': {
      entry: [
        'src/index.ts',
        '.storybook/main.ts',
        '.storybook/preview.tsx',
      ],
      project: ['src/**/*.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
      ignore: ['dist/**', 'storybook-static/**'],
    },
    'packages/algorithms': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
      ignore: ['dist/**'],
    },
    'tools/generators': {
      entry: ['index.ts', '**/index.ts', '**/generator.ts'],
      project: ['**/*.ts'],
      ignore: ['dist/**'],
    },
  },

  // Only ignore dependencies that knip can't detect automatically
  ignoreDependencies: [
    // Nx plugins (used via nx.json plugin configuration, not imports)
    '@nx/js',
    '@nx/web',
    // Build tools loaded by Nx/Vite, not imported directly
    '@swc/core',
    '@swc/helpers',
    '@swc-node/register',
    'tslib',
    // Testing utilities loaded via vitest config setupFiles
    'fake-indexeddb',
    // Husky (git hooks, not imported)
    'husky',
    // Tools used via npm scripts, not imported
    'barrelsby',
    'syncpack',
    'lint-staged',
    'monorepo-license-checker',
    'chokidar',
    'jiti',
  ],

  // Plugins - knip will auto-detect dependencies from these configs
  eslint: true,
  vitest: true,
  playwright: true,
  storybook: true,
  typescript: true,
};

export default config;
