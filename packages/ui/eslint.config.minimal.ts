import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Minimal ESLint configuration for performance testing
 * This bypasses all the complex configurations to test basic functionality
 */
export default tseslint.config([
  {
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.d.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: false,
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
    },
  },
]);