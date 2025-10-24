import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * Simplified ESLint configuration for debugging
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
                    "knip.ts"
                ],
            },
        },
        plugins: {
            "@typescript-eslint": tseslint.plugin,
        },
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "argsIgnorePattern": "^_",
                    "varsIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_"
                }
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-non-null-assertion": "error",
        },
    },
    // Configuration for test files
    {
        files: ["**/*.{test,spec}.{ts,tsx}"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "no-console": "off",
        },
    },
]);