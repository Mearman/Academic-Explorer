import tseslint from 'typescript-eslint';
import reactConfig from '../../eslint.config.react.ts';

export default tseslint.config([
  {
    // Global ignores for this app - exclude test files for now
    ignores: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/test/**/*.{ts,tsx}',
    ],
  },
  ...reactConfig,
  {
    // Source files - use strict type checking (test files already ignored globally)
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
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

      // Allow some flexibility in app code
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
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
    // Config files - use dedicated tsconfig and disable type-aware rules
    files: ['*.config.{ts,js}', 'vite.config.ts', 'vitest.config.ts', 'eslint.config.ts', 'playwright.config.ts', 'knip.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.config.json',
        tsconfigRootDir: import.meta.dirname,
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
  {
    // Build plugins - also need special handling
    files: ['src/build-plugins/**/*.{ts,js}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.config.json',
        tsconfigRootDir: import.meta.dirname,
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
    },
  },
  // Test files are handled by the base configuration with project: false
]);