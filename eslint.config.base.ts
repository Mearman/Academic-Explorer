import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import importPlugin from "eslint-plugin-import";
import promisePlugin from "eslint-plugin-promise";
import regexpPlugin from "eslint-plugin-regexp";
import autofixPlugin from "eslint-plugin-autofix";
import eslintReact from "@eslint-react/eslint-plugin";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import vitestPlugin from "@vitest/eslint-plugin";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";
import noOnlyTests from "eslint-plugin-no-only-tests";
import jsdoc from "eslint-plugin-jsdoc";
import nodePlugin from "eslint-plugin-n";
import jsoncPlugin from "eslint-plugin-jsonc";
import ymlPlugin from "eslint-plugin-yml";
import { customRulesPlugin } from "./tools/eslint-rules/index.js";

/**
 * ESLint configuration using recommended presets where available
 */
export default tseslint.config([
    // Global ignores
    {
        ignores: [
            "dist/**/*",
            "build/**/*",
            "node_modules/**/*",
            ".nx/**/*",
            "coverage/**/*",
            "**/*.d.ts",
            "**/routeTree.gen.ts",
            "**/*.generated.ts",
            "**/generated/**/*",
            "**/*.js",
            "**/*.js.map",
            // Config files outside tsconfig rootDir - excluded from lint
            "**/vitest.config.ts",
            "**/vitest.setup.ts",
            "**/vite.config.ts",
            "**/vite.config.*.ts",
            "**/eslint.config.*.ts",
            "**/.storybook/**/*",
            "**/tests/setup.ts",
            // Algorithms test files - pre-existing type issues, lint ignored
            "packages/algorithms/__tests__/**/*",
        ],
    },
    // Base configuration for all TypeScript files
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                allowDefaultProject: [
                    // All TypeScript files in packages
                    "packages/**/*.ts",
                    "packages/**/*.tsx",
                    // All test files
                    "**/*.test.ts",
                    "**/*.test.tsx",
                    "**/*.spec.ts",
                    "**/*.spec.tsx",
                    "**/*.e2e.test.ts",
                    "**/*.e2e.test.tsx",
                    "**/*.component.test.tsx",
                    "**/*.integration.test.ts",
                    "**/*.integration.test.tsx",
                    // Build and config files
                    "**/build-plugins/**",
                    "**/*.config.ts",
                    "**/*.config.js",
                    "**/*.config.mjs",
                    "**/vitest.setup.ts",
                    "**/tests/setup.ts",
                    // Source files that might not be in tsconfig
                    "src/**/*.ts",
                    "src/**/*.tsx",
                    "src/**/*.js",
                    "src/**/*.jsx",
                    // Scripts and tools
                    "scripts/**/*.ts",
                    "tools/**/*.ts",
                    // Test files excluded from tsconfig but need linting
                    "apps/web/test.ts",
                    // Storybook and config files
                    "**/.storybook/**/*",
                    "**/eslint.config.*.ts",
                    "**/vite.config.*.ts",
                    "apps/web/vite.config.minimal.ts",
                    "apps/web/test.ts",
                    "config/test-utils/render-helpers.tsx",
                    "eslint.config.base.ts",
                    "eslint.config.react.ts",
                    "eslint.config.ts",
                    // Root configuration files
                    ".commitlintrc.ts",
                    "commitlintrc.ts",
                    "workspace-coverage.config.ts",
                    // Additional root level files
                    "**/.commitlintrc.ts",
                    "**/workspace-coverage.config.ts",
                    // Utils package files that need linting
                    "packages/utils/src/cache-browser/*.ts",
                    "packages/utils/src/cache/*.ts",
                    "packages/utils/src/data-evaluation.ts",
                    "packages/utils/src/data.ts",
                    "packages/utils/src/environment/*.ts",
                    "packages/utils/src/error-handling.tsx",
                    "packages/utils/src/hooks/*.tsx",
                    "packages/utils/src/navigation.ts",
                    "packages/utils/src/normalize-route.ts",
                    "packages/utils/src/query-parser.ts",
                    "packages/utils/src/services.ts",
                    "packages/utils/src/state/*.tsx",
                    "packages/utils/src/static-data/*.ts",
                    "packages/utils/src/storage/*.ts",
                    "packages/utils/src/stores/*.tsx",
                    "packages/utils/src/ui/*.tsx",
                    "packages/utils/src/utils.integration.test.ts",
                    "packages/utils/src/utils.unit.test.ts",
                    "packages/utils/src/validation.ts",
                    "packages/utils/src/workers/messages.ts"
                ],
            },
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
            "import": importPlugin,
            "promise": promisePlugin,
            "regexp": regexpPlugin,
            "autofix": autofixPlugin,
            "simple-import-sort": simpleImportSort,
            "prefer-arrow-functions": preferArrowFunctions,
            "jsdoc": jsdoc,
            "n": nodePlugin,
            "custom": customRulesPlugin,
        },
        rules: {
            // TypeScript rules
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-non-null-assertion": "error",

            // Custom rules
            "custom/barrelsby-header": "error",
            "custom/no-deprecated": "error",
            "custom/no-duplicate-reexports": "error",
            "custom/no-reexport-from-non-barrel": "error",
            "custom/no-redundant-assignment": "off",

            // Import rules (from recommended + custom)
            ...importPlugin.configs.recommended.rules,
            ...importPlugin.configs.typescript.rules,
            "import/no-relative-packages": "error",
            "import/no-cycle": "error",
            "import/no-default-export": "error",
            "import/order": ["error", {
                "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
                "newlines-between": "always",
                "alphabetize": { "order": "asc", "caseInsensitive": true }
            }],

            // Promise rules (from flat/recommended)
            ...promisePlugin.configs["flat/recommended"].rules,

            // Regexp rules (from flat/recommended)
            ...regexpPlugin.configs["flat/recommended"].rules,

            // Autofix plugin
            "autofix/no-debugger": "error",

            // Simple import sort (excellent autofix)
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",

            // Prefer arrow functions (has autofix)
            "prefer-arrow-functions/prefer-arrow-functions": ["error", {
                "classPropertiesAllowed": false,
                "disallowPrototype": false,
                "returnStyle": "unchanged",
                "singleReturnOnly": false,
            }],

            // JSDoc rules (from flat/recommended-typescript)
            ...jsdoc.configs["flat/recommended-typescript"].rules,
            "jsdoc/require-jsdoc": "off", // Too strict - don't require JSDoc everywhere
            "jsdoc/require-description": "off",
            "jsdoc/require-param-description": "off",
            "jsdoc/require-returns-description": "off",
            "jsdoc/require-returns": "off", // Too noisy for React components

            // Node.js rules (from flat/recommended-module for ES modules)
            ...nodePlugin.configs["flat/recommended-module"].rules,
            "n/no-missing-import": "off", // TypeScript handles this
            "n/no-unpublished-import": "off", // We use workspace packages
        },
        settings: {
            "import/resolver": {
                "typescript": {
                    "alwaysTryTypes": true,
                    "project": "./tsconfig.base.json",
                },
            },
        },
    },
    // Configuration for test files (using vitest recommended)
    {
        files: ["**/*.{test,spec}.{ts,tsx}", "**/*.e2e.test.{ts,tsx}", "**/test/**/*.ts", "**/e2e/**/*.ts"],
        plugins: {
            vitest: vitestPlugin,
            "no-only-tests": noOnlyTests,
        },
        rules: {
            // Vitest recommended rules
            ...vitestPlugin.configs.recommended.rules,
            // Relax rules for tests
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "no-console": "off",
            "custom/no-deprecated": "off",
            "jsdoc/require-jsdoc": "off",
            // Prevent .only from being committed
            "no-only-tests/no-only-tests": "error",
        },
    },
    // TanStack Query rules (using flat/recommended)
    ...tanstackQuery.configs["flat/recommended"],
    // React rules using @eslint-react (using recommended-typescript)
    {
        files: ["**/*.tsx"],
        ...eslintReact.configs["recommended-typescript"],
        rules: {
            ...eslintReact.configs["recommended-typescript"].rules,
            "@eslint-react/no-unstable-context-value": "error",
            "@eslint-react/no-unstable-default-props": "error",
            "@eslint-react/prefer-read-only-props": "off",
        },
    },
    // Allow default exports for config files and special cases
    {
        files: [
            "**/*.config.{ts,js,mjs}",
            "**/vite.config.*.ts",
            "**/eslint.config.*.ts",
            "**/.storybook/**/*",
            "**/routes/**/*.tsx",
            "**/routeTree.gen.ts",
            "**/config/**/*",
        ],
        rules: {
            "import/no-default-export": "off",
            "import/no-relative-packages": "off",
        },
    },
    // Disable Node.js-specific rules for browser code
    {
        files: [
            "apps/web/**/*.{ts,tsx}",
            "packages/ui/**/*.{ts,tsx}",
            "packages/client/**/*.{ts,tsx}",
        ],
        rules: {
            "n/no-unsupported-features/node-builtins": "off",
            "n/no-missing-import": "off",
            "n/no-missing-require": "off",
        },
    },
    // JSONC configuration (using flat/recommended-with-jsonc)
    ...jsoncPlugin.configs["flat/recommended-with-jsonc"],
    {
        files: ["**/*.json", "**/*.jsonc"],
        rules: {
            "jsonc/sort-keys": "off",
        },
    },
    // YML configuration (using flat/standard)
    ...ymlPlugin.configs["flat/standard"],
    {
        files: ["**/*.yml", "**/*.yaml"],
        rules: {
            "yml/no-empty-mapping-value": "off",
        },
    },
]);
