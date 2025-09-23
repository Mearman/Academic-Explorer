import tseslint from 'typescript-eslint';
import reactConfig from '../../eslint.config.react.js';

export default tseslint.config([
  ...reactConfig,
  {
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
    // Config files
    files: ['*.config.{ts,js}', 'vite.config.ts', 'vitest.config.*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
]);