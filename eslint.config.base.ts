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
                projectService: false,
                tsconfigRootDir: import.meta.dirname,
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