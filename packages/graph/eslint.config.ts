import tseslint from 'typescript-eslint';
import js from '@eslint/js';

export default tseslint.config([
  {
    // Global ignores (completely ignore test files to avoid TypeScript rule conflicts)
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      'coverage/**/*',
      '**/*.d.ts',
      'src/**/*.{test,spec}.{ts,tsx}', // Completely ignore test files
      'src/__tests__/**/*', // Completely ignore test directories
      'src/__mocks__/**/*', // Completely ignore mock directories
    ],
  },
  {
    // Production source files only - simplified TypeScript configuration
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Package-specific rules for pure graph data structures
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': 'error', // No console usage in library code

      // Configure unused vars to ignore parameters prefixed with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
]);