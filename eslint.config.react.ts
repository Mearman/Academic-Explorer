import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';
import baseConfig from './eslint.config.base.ts';

/**
 * React-specific ESLint configuration for Academic Explorer monorepo
 *
 * Extends base configuration with:
 * - React plugin and rules
 * - React Hooks rules
 * - JSX accessibility rules
 * - React Refresh (for dev)
 *
 * Usage:
 * ```ts
 * import tseslint from 'typescript-eslint';
 * import reactConfig from '../../eslint.config.react.ts';
 *
 * export default tseslint.config([
 *   ...reactConfig,
 *   // component-specific overrides
 * ]);
 * ```
 */
export default tseslint.config([
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react': react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-unknown-property': 'error',

      // React Hooks rules
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // JSX Accessibility rules
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',

      // React Refresh rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Storybook files
    files: ['**/*.stories.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);