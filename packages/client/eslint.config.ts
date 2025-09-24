import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.base.js';

export default tseslint.config([
  ...baseConfig,
  {
    // Only apply strict rules to non-test TypeScript files
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.unit.test.ts',
      '**/*.integration.test.ts'
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Package-specific rules for API client
      '@typescript-eslint/no-explicit-any': 'warn', // Some flexibility for API responses
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': 'error', // No console usage in library code

      // API clients may need some type flexibility
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
    },
  },
  {
    // Allow console in logger files
    files: ['src/internal/logger.{ts,js}'],
    rules: {
      'no-console': 'off',
    },
  },
]);