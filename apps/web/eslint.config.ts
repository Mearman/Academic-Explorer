import reactConfig from '../../eslint.config.react.ts';

const config = [
  {
    // Global ignores for this app - exclude test files and build plugins
    ignores: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/test/**/*.{ts,tsx}',
      'src/build-plugins/**/*',
    ],
  },
  ...reactConfig,
  {
    // Source files - use strict type checking (test files already ignored globally)
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        // Temporarily disable type-aware linting for performance
        project: false,
        // project: './tsconfig.json',
        // tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // App-specific rules
      'no-console': 'warn', // Allow console in app development
      '@typescript-eslint/no-explicit-any': 'warn', // More lenient for app code

      // React-specific overrides for the app
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Disable type-aware rules for performance (these require project config)
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
  {
    // Generated files
    files: ['src/routeTree.gen.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'unused-imports/no-unused-imports': 'off',
    },
  },
  {
    // Service worker files should be allowed to use console for debugging
    files: [
      'src/workers/**/*.{ts,js}',
      'src/**/*worker*.{ts,js}',
      'src/**/*.worker.{ts,js}',
      'src/**/*sw.{ts,js}',
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'warn', // Allow any for service worker event types
    },
  },
  {
    // Config files - use dedicated tsconfig and disable type-aware rules
    files: ['*.config.{ts,js}', 'vite.config.ts', 'vitest.config.ts', 'eslint.config.ts', 'playwright.config.ts', 'knip.ts'],
    languageOptions: {
      parserOptions: {
        // Temporarily disable type-aware linting for performance
        project: false,
        // project: './tsconfig.config.json',
        // tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
  // Test files are handled by the base configuration with project: false
];

export default config;