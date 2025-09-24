import { defineConfig, mergeConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseVitestConfig } from './vitest.config.base';

/**
 * React-specific Vitest configuration for Academic Explorer monorepo
 *
 * Extends base configuration with:
 * - React plugin for JSX support
 * - jsdom environment for DOM testing
 * - React Testing Library setup
 *
 * Usage:
 * ```ts
 * import { mergeConfig } from 'vitest/config';
 * import reactConfig from '../../vitest.config.react.ts';
 *
 * export default mergeConfig(reactConfig, {
 *   // component-specific overrides
 * });
 * ```
 */
export default defineConfig(
  mergeConfig(baseVitestConfig, {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      // Additional React-specific test patterns
      include: [
        'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        'src/**/*.component.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      ],
      coverage: {
        exclude: [
          ...((baseVitestConfig.test?.coverage as any)?.exclude || []),
          '**/*.stories.*',
          '**/storybook-static/**',
          '**/*.story.*',
        ],
      },
    },
  })
);