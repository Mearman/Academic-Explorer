import tseslint from 'typescript-eslint';
import js from '@eslint/js';
import globals from 'globals';

export default tseslint.config([
  {
    // Global ignores for CLI
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      'coverage/**/*',
    ],
  },
  // Non-test TypeScript files - use strict type checking
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.{test,spec}.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // CLI app specific rules - console statements are appropriate for CLI output
      'no-console': 'off', // CLI apps need console output for user interaction
      '@typescript-eslint/no-explicit-any': 'warn', // Some flexibility for CLI parsing

      // Node.js CLI specific - relaxed for CLI parsing
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      // Disable problematic rules for CLI environments
      '@typescript-eslint/no-array-delete': 'off',
      '@typescript-eslint/no-floating-promises': 'warn', // Important for CLI but not fatal
      '@typescript-eslint/no-unnecessary-condition': 'warn', // CLI has dynamic conditions
      '@typescript-eslint/no-redundant-type-constituents': 'off', // Allow explicit null unions for clarity
    },
  },
  // Test files - use basic linting only, no type checking
  {
    files: ['src/**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
      parserOptions: {
        project: false, // No type checking for test files
      },
    },
    rules: {
      'no-console': 'off', // Allow console in tests
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in tests
    },
  },
]);