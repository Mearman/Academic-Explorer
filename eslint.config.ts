import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import boundaries from 'eslint-plugin-boundaries';
import type { TSESLint } from '@typescript-eslint/utils';

export default tseslint.config(
  { 
    ignores: [
      'dist',
      'coverage',
      'src/components/examples/**',
      '**/*.unit.test.ts',
      '**/*.component.test.ts',
      '**/*.integration.test.ts',
      '**/*.e2e.test.ts',
      'src/test/**',
      'src/routeTree.gen.ts', // TanStack Router generated file
      'src/app/**', // Old Next.js files (will be removed)
      'eslint.config.ts', // ESLint config file
      'vite.config.ts', // Vite config file
      'vitest.config.ts', // Vitest config file
      '.eslintrc-atomic-design.js', // Old stashed config
    ]
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'import': importPlugin,
      'boundaries': boundaries,
    },
    settings: {
      // Import resolver for TypeScript - Flat config syntax
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
          extensions: ['.ts', '.tsx', '.js', '.jsx']
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx']
        }
      },
      // Boundaries configuration for Atomic Design
      'boundaries/elements': [
        {
          type: 'atom',
          pattern: 'src/components/atoms/**/*',
          mode: 'folder'
        },
        {
          type: 'molecule',
          pattern: 'src/components/molecules/**/*',
          mode: 'folder'
        },
        {
          type: 'organism',
          pattern: 'src/components/organisms/**/*',
          mode: 'folder'
        },
        {
          type: 'template',
          pattern: 'src/components/templates/**/*',
          mode: 'folder'
        },
        {
          type: 'page',
          pattern: 'src/routes/**/*',
          mode: 'folder'
        },
        {
          type: 'shared',
          pattern: [
            'src/lib/**/*',
            'src/hooks/**/*',
            'src/stores/**/*',
            'src/types/**/*',
            'src/design-tokens.css.ts',
            'src/components/**/utils/**/*',
            'src/components/**/hooks/**/*'
          ],
          mode: 'folder'
        }
      ] satisfies Array<{
        type: string;
        pattern: string | string[];
        mode: 'folder' | 'file';
      }>
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      
      // Existing migration rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-prototype-builtins': 'warn',
      'no-useless-catch': 'warn',

      // ===========================================
      // ATOMIC DESIGN ENFORCEMENT RULES
      // ===========================================

      // Core hierarchical dependency enforcement
      'boundaries/element-types': ['warn', { // Start with warnings
        default: 'disallow',
        rules: [
          {
            from: 'atom',
            allow: ['shared'],
            message: 'Atoms can only import from shared utilities and external libraries. No component dependencies allowed.'
          },
          {
            from: 'molecule',
            allow: ['atom', 'shared'],
            message: 'Molecules can only import from atoms and shared utilities.'
          },
          {
            from: 'organism',
            allow: ['atom', 'molecule', 'shared'],
            message: 'Organisms can only import from atoms, molecules, and shared utilities.'
          },
          {
            from: 'template',
            allow: ['atom', 'molecule', 'organism', 'shared'],
            message: 'Templates can only import from atoms, molecules, organisms, and shared utilities.'
          },
          {
            from: 'page',
            allow: ['atom', 'molecule', 'organism', 'template', 'shared'],
            message: 'Pages can import from all component levels and shared utilities.'
          },
          {
            from: 'shared',
            allow: ['shared'],
            message: 'Shared modules can only import other shared modules and external libraries.'
          }
        ]
      }],
      
      // Prevent unknown or ignored boundaries
      'boundaries/no-unknown': 'warn',
      'boundaries/no-ignored': 'warn',

      // Import organization and restrictions
      'import/order': ['warn', {
        groups: [
          'builtin',     // Node built-ins
          'external',    // External packages
          'internal',    // Internal packages (configured in tsconfig paths)
          'parent',      // Parent directories (..)
          'sibling',     // Sibling files (.)
          'index'        // Index files
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }],
      
      // Supplementary path restrictions (backup for boundaries)
      'import/no-restricted-paths': ['warn', {
        zones: [
          {
            target: './src/components/atoms/**/*',
            from: [
              './src/components/molecules/**/*',
              './src/components/organisms/**/*',
              './src/components/templates/**/*',
              './src/routes/**/*'
            ],
            message: 'Atoms cannot import from higher-level components. This violates Atomic Design principles.'
          },
          {
            target: './src/components/molecules/**/*',
            from: [
              './src/components/organisms/**/*',
              './src/components/templates/**/*',
              './src/routes/**/*'
            ],
            message: 'Molecules cannot import from higher-level components. This violates Atomic Design principles.'
          },
          {
            target: './src/components/**/*',
            from: './src/routes/**/*',
            message: 'Components should not import from routes. Routes should import and compose components.'
          }
        ]
      }],

      // Prevent named default exports for better tree shaking (except routes)
      'import/prefer-default-export': 'off',
      'import/no-default-export': 'off', // Allow for route components
    },
  } satisfies TSESLint.FlatConfig.Config,
  
  // Atomic Design specific overrides by component level
  {
    files: ['src/components/atoms/**/*.{ts,tsx}'],
    rules: {
      'complexity': ['warn', 8], // Keep atoms simple
      'max-lines-per-function': ['warn', { max: 30, skipBlankLines: true, skipComments: true }],
    }
  },
  {
    files: ['src/components/molecules/**/*.{ts,tsx}'],
    rules: {
      'complexity': ['warn', 12],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
    }
  },
  {
    files: ['src/components/organisms/**/*.{ts,tsx}'],
    rules: {
      'complexity': ['warn', 20],
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
    }
  },
  {
    files: ['src/components/templates/**/*.{ts,tsx}'],
    rules: {
      'complexity': ['warn', 10], // Templates should focus on layout
      'max-lines-per-function': ['warn', { max: 60, skipBlankLines: true, skipComments: true }],
    }
  },
  {
    files: ['src/routes/**/*.{ts,tsx}'],
    rules: {
      'complexity': ['warn', 25], // Pages can orchestrate complex logic
      'import/no-default-export': 'off', // TanStack Router requires default exports
    }
  }
) satisfies TSESLint.FlatConfig.ConfigArray;