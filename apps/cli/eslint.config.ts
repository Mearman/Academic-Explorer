import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.base.js';

export default tseslint.config([
  ...baseConfig,
  {
    files: ['src/**/*.{ts}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // CLI app specific rules
      'no-console': 'off', // CLI apps need console output
      '@typescript-eslint/no-explicit-any': 'warn', // Some flexibility for CLI parsing

      // Node.js CLI specific
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
    },
  },
]);