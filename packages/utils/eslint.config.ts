import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.base.js';

export default tseslint.config([
  ...baseConfig,
  {
    // Source files only (test files are handled by base config with project: false)
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.{test,spec}.{ts,tsx}'], // Exclude test files from type-aware linting
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Package-specific rules for shared utilities
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': 'warn', // Logger package may use console internally

      // Utilities may need some type flexibility for generic functions
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
    },
  },
  {
    // Test files - use base config without type-aware rules
    files: ['src/**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: false, // Disable type-aware linting for test files
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'no-console': 'off',
    },
  },
  {
    // Logger file specifically should be allowed to use console
    files: ['src/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]);