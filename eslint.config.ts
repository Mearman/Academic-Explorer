import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintComments from 'eslint-plugin-eslint-comments';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';
import noEmoji from './eslint-rules/no-emoji.js';
import noZustandComputedFunctions from './eslint-rules/no-zustand-computed-functions.js';
import noUnstableDependencies from './eslint-rules/no-unstable-dependencies.js';
import noSelectorObjectCreation from './eslint-rules/no-selector-object-creation.js';
import noDeprecatedComments from './eslint-rules/no-deprecated-comments.js';
import noLoggerInfo from './eslint-rules/no-logger-info.js';

export default tseslint.config([
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'coverage/**/*', 'src/routeTree.gen.ts', 'vite.config.ts', 'vite.config.old.ts', 'vitest.workspace.ts', 'src/test/setup.ts', '.nx/**/*', 'eslint.config.ts', 'eslint-rules/**/*', 'src/lib/openalex/debug-types.ts', 'src/lib/openalex/test-advanced-fields.ts', 'knip.ts'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
    ],
    plugins: {
      'react': react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'eslint-comments': eslintComments,
      'jsx-a11y': jsxA11y,
      'custom': {
        rules: {
          'no-emoji': noEmoji,
          'no-zustand-computed-functions': noZustandComputedFunctions,
          'no-unstable-dependencies': noUnstableDependencies,
          'no-selector-object-creation': noSelectorObjectCreation,
          'no-deprecated-comments': noDeprecatedComments,
          'no-logger-info': noLoggerInfo,
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],

      // Official React ESLint rules to prevent infinite loops and performance issues
      'react/jsx-no-constructed-context-values': 'error',
      'react/no-array-index-key': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_', // Allow underscore-prefixed unused parameters
          ignoreRestSiblings: true,
        },
      ],

      // Additional strict rules beyond strictTypeChecked
      // Prevent type assertions (prefer type guards)
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' }
      ],

      // Prevent non-null assertions
      '@typescript-eslint/no-non-null-assertion': 'error',

      // Disallow direct console usage - use logger instead
      'no-console': 'error',

      // Ban all eslint-disable comments - fix issues properly instead
      'eslint-comments/no-use': ['error', { 'allow': [] }],

      // Ban TypeScript escape hatch comments - fix types properly instead
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': false, // Allow with description
          'ts-ignore': true,       // Never allow
          'ts-nocheck': true,      // Never allow
          'ts-check': true,        // Never allow
          'minimumDescriptionLength': 10
        }
      ],

      // Temporarily relax floating promises to focus on other issues
      '@typescript-eslint/no-floating-promises': 'error',

      // FIXME: Temporarily disabled due to false positives with Record<string, T> types in layout-store.ts
      '@typescript-eslint/no-unnecessary-condition': 'off',

      // Style preferences
      'quotes': ['error', 'double', { 'allowTemplateLiterals': true, 'avoidEscape': true }],
      // FIXME: Temporarily disabled due to ESLint 9.35.0 stack overflow on complex JSX nesting
      // 'indent': ['error', 'tab', { 'SwitchCase': 1 }],

      // Accessibility rules - enforce WCAG 2.1 AA standards
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/img-redundant-alt': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/mouse-events-have-key-events': 'error',
      'jsx-a11y/no-autofocus': 'error',
      'jsx-a11y/no-distracting-elements': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',

      // Custom rules
      'custom/no-emoji': 'error',
      'custom/no-deprecated-comments': 'error',
      'custom/no-logger-info': 'warn',

      // React 19 + Zustand + Immer infinite loop prevention rules
      'custom/no-zustand-computed-functions': 'error',
      'custom/no-unstable-dependencies': 'error',
      'custom/no-selector-object-creation': 'error',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Allow console usage in specific files where it's necessary for logging infrastructure
  {
    files: [
      'src/components/devtools/*.tsx',
      'src/lib/logger.ts',
      'scripts/**/*.ts',
      'scripts/**/*.js',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  // Relax strict type checking for test files due to mocking framework patterns
  // This MUST come after the main config to properly override rules
  {
    files: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.integration.test.ts',
      'src/**/*.unit.test.ts',
      'src/**/*.component.test.ts',
      'src/**/*.e2e.test.ts',
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
    },
  },
]);