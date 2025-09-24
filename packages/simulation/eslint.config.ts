import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.base.js';

export default tseslint.config([
  ...baseConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Package-specific rules for simulation algorithms
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': 'error', // No console usage in library code

      // Allow some flexibility for mathematical calculations
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
]);