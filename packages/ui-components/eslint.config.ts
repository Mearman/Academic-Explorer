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
      // Package-specific rules for UI components
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error', // No console usage in library code

      // React components may need some prop flexibility
      'react/prop-types': 'off', // Using TypeScript
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',

      // Storybook integration
      'react-refresh/only-export-components': 'off', // Allow multiple exports for components
    },
  },
]);