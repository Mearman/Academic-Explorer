import js from "@eslint/js";
import globals from "globals";
import eslintComments from "eslint-plugin-eslint-comments";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";
import markdownPlugin from "@eslint/markdown";
import noEmojiPlugin from "./eslint-rules/no-emoji.js";

/**
 * Base ESLint configuration for Academic Explorer monorepo
 *
 * This configuration provides:
 * - TypeScript strict type checking
 * - Common rules for all packages/apps
 * - Import/export linting
 * - Comment rules
 *
 * Individual packages/apps can extend this and add specific plugins.
 */
export default tseslint.config([
  {
    // Global ignores for all workspaces
    ignores: [
      // Build and distribution files
      "dist/**/*",
      "build/**/*",
      "out/**/*",
      "coverage/**/*",

      // Dependencies and cache
      "node_modules/**/*",
      ".nx/**/*",
      ".pnpm-store/**/*",
      ".cache/**/*",

      // Generated files
      "**/*.d.ts",
      "**/*.config.js", // Allow JS config files
      "**/routeTree.gen.ts",
      "**/*.generated.ts",
      "**/*.generated.tsx",
      "**/generated/**/*",

      // Test and Storybook output
      "storybook-static/**/*",
      "test-results/**/*",
      "playwright-report/**/*",

      // Temporary files
      "tmp/**/*",
      "temp/**/*",
      "**/*.tmp",
      "**/*.temp",

      // IDE and editor files
      ".vscode/**/*",
      ".idea/**/*",
      "**/.DS_Store",

      // Markdown files to exclude from emoji checking
      "docs/openalex-docs/**/*.md",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      // Use recommended instead of strict for performance
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
      parserOptions: {
        // Disable type-aware linting for performance - use specific projects only
        project: false,
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    plugins: {
      "eslint-comments": eslintComments,
      "unused-imports": unusedImports,
      "no-emoji-plugin": noEmojiPlugin,
    },
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": "off", // handled by unused-imports
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      // Disable type-aware rules that require project config for performance
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off", // Type-aware rule - disable for performance
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",

      // Import rules
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // Comment rules
      "eslint-comments/disable-enable-pair": "error",
      "eslint-comments/no-unused-disable": "error",
      "eslint-comments/no-unlimited-disable": "error",

      // General rules
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-destructuring": ["error", { object: true, array: false }],

      // Disable rules that are too strict for some cases
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",

      // Emoji detection
      "no-emoji-plugin/no-emoji": "error",
    },
  },
  {
    // Relaxed rules for config files
    files: [
      "**/*.config.{ts,js}",
      "**/vite.config.{ts,js}",
      "**/vitest.config.{ts,js}",
    ],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "no-console": "off",
    },
  },
  {
    // Test file rules - disable strict type checking since test files aren't in tsconfig
    files: ["**/*.{test,spec}.{ts,tsx}", "**/test/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: false, // Disable type-aware rules for test files
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "no-console": "off",
    },
  },
  {
    // Logger files should be allowed to use console
    files: [
      "**/logger.{ts,js}",
      "**/src/logger.{ts,js}",
      "**/src/internal/logger.{ts,js}",
    ],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Markdown files - process with markdown plugin and apply no-emoji rule
    files: ["**/*.md"],
    plugins: {
      markdown: markdownPlugin,
      "no-emoji-plugin": noEmojiPlugin,
    },
    processor: "markdown/markdown",
    rules: {
      "no-emoji-plugin/no-emoji": "error",
    },
  },
  {
    // Code blocks in markdown files - relax rules for examples
    files: ["**/*.md/*.{js,ts,jsx,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "off",
    },
  },
]);
