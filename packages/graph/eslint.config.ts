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
    // Production source files only - strict rules with TypeScript project
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Package-specific rules for pure graph data structures
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': 'error', // No console usage in library code
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
]);