import tseslint from "typescript-eslint";

export default tseslint.config([
  {
    // Global ignores
    ignores: [
      "dist/**/*",
      "build/**/*",
      "out/**/*",
      "coverage/**/*",
      "node_modules/**/*",
      ".nx/**/*",
      ".pnpm-store/**/*",
      ".cache/**/*",
      "**/*.d.ts",
      "**/*.config.js",
      "**/routeTree.gen.ts",
      "**/*.generated.ts",
      "**/*.generated.tsx",
      "**/generated/**/*",
      "storybook-static/**/*",
      "test-results/**/*",
      "playwright-report/**/*",
      "tmp/**/*",
      "temp/**/*",
      "**/*.tmp",
      "**/*.temp",
      ".vscode/**/*",
      ".idea/**/*",
      "**/.DS_Store",
      "docs/openalex-docs/**/*.md",
      "**/eslint.config.ts",
      "**/*.config.ts",
      "**/vitest.config.ts",
      "**/*.{test,spec}.{ts,tsx}", // Ignore test files for now
    ],
  },
  {
    // Config files - disable type-aware rules
    files: ["**/eslint.config.ts", "**/*.config.ts", "**/vitest.config.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // Disable ALL type-aware rules for config files
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      // Also disable custom rules that require type information
      "no-type-assertions-plugin/no-type-assertions": "off",
      "prefer-destructured-params-plugin/prefer-destructured-params": "off",
      "zustand-store-dry-plugin/zustand-store-dry": "off",
      "no-deprecated-comments-plugin/no-deprecated-comments": "off",
      "no-logger-info-plugin/no-logger-info": "off",
      "no-selector-object-creation-plugin/no-selector-object-creation": "off",
      "no-unstable-dependencies-plugin/no-unstable-dependencies": "off",
      "no-zustand-computed-functions-plugin/no-zustand-computed-functions": "off",
      // Disable other rules that might cause issues
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/cognitive-complexity": "off",
      "no-emoji/no-emoji": "off",
      "@nx/dependency-checks": "off",
    },
  },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // Disable ALL type-aware rules for config files
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      // Also disable custom rules that require type information
      "no-type-assertions-plugin/no-type-assertions": "off",
      "prefer-destructured-params-plugin/prefer-destructured-params": "off",
      "zustand-store-dry-plugin/zustand-store-dry": "off",
      "no-deprecated-comments-plugin/no-deprecated-comments": "off",
      "no-logger-info-plugin/no-logger-info": "off",
      "no-selector-object-creation-plugin/no-selector-object-creation": "off",
      "no-unstable-dependencies-plugin/no-unstable-dependencies": "off",
      "no-zustand-computed-functions-plugin/no-zustand-computed-functions":
        "off",
      // Disable other rules that might cause issues
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/cognitive-complexity": "off",
      "no-emoji/no-emoji": "off",
      "@nx/dependency-checks": "off",
    },
  },
  {
    // Source files with type-aware linting
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.{test,spec}.{ts,tsx}"], // Exclude test files
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // Basic TypeScript rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": "off", // handled by unused-imports

      // Allow some flexibility for mathematical calculations
      "@typescript-eslint/no-magic-numbers": "off",

      // Package-specific rules for simulation algorithms
      "no-console": "error", // No console usage in library code
    },
  },
  {
    // Test files - relaxed rules
    files: ["src/**/*.{test,spec}.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: true, // Allow parsing even if not in tsconfig
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "no-console": "off",
    },
  },
]);
