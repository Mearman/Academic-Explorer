import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.base.js';

export default tseslint.config([
  ...baseConfig,
  {
    // CLI-specific configuration - override base config for all CLI TypeScript files
    files: ['src/**/*.{ts,tsx}'],
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
  {
    // Disable ALL type-aware rules for test files since they're excluded from tsconfig
    files: ['src/**/*.{test,spec}.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: false, // Disable all type-aware rules for test files
      },
    },
    rules: {
      // Core TypeScript rules that need type information
      '@typescript-eslint/no-array-delete': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      'no-console': 'off', // Allow console in tests
    },
  },
]);