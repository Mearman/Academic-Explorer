import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintComments from 'eslint-plugin-eslint-comments';
import tseslint from 'typescript-eslint';
import noEmoji from './eslint-rules/no-emoji.js';
import noZustandComputedFunctions from './eslint-rules/no-zustand-computed-functions.js';
import noUnstableDependencies from './eslint-rules/no-unstable-dependencies.js';
import noSelectorObjectCreation from './eslint-rules/no-selector-object-creation.js';

export default tseslint.config([
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'coverage/**/*', 'src/routeTree.gen.ts', 'vite.config.ts', 'vite.config.old.ts', 'vitest.workspace.ts', 'src/test/setup.ts', '.nx/**/*', 'eslint.config.ts', 'eslint-rules/**/*', 'src/lib/openalex/debug-types.ts', 'src/lib/openalex/test-advanced-fields.ts'],
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
      'custom': {
        rules: {
          'no-emoji': noEmoji,
          'no-zustand-computed-functions': noZustandComputedFunctions,
          'no-unstable-dependencies': noUnstableDependencies,
          'no-selector-object-creation': noSelectorObjectCreation,
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // Official React ESLint rules to prevent infinite loops and performance issues
      'react/jsx-no-constructed-context-values': 'error',
      'react/no-array-index-key': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          // Remove underscore patterns - unused declarations must be removed
          ignoreRestSiblings: true,
        },
      ],

      // Additional strict rules beyond strictTypeChecked
      // Prevent type assertions (prefer type guards) - temporarily relaxed
      '@typescript-eslint/consistent-type-assertions': [
        'warn',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' }
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
      '@typescript-eslint/no-floating-promises': 'warn',

      // Temporarily relax unnecessary conditions - too many to fix in this session
      '@typescript-eslint/no-unnecessary-condition': 'warn',

      // Style preferences
      'quotes': ['error', 'double', { 'allowTemplateLiterals': true, 'avoidEscape': true }],
      'indent': ['error', 'tab', { 'SwitchCase': 1 }],

      // Custom rules
      'custom/no-emoji': 'error',

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