import tseslint from "typescript-eslint";
import baseConfig from "../../eslint.config.base";

export default tseslint.config([
  ...baseConfig,
  {
    // Global ignores for this package
    ignores: [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/*.unit.test.ts",
      "**/*.integration.test.ts",
      "src/generated-tests/**/*",
      "src/test-generator/**/*",
      "src/**/__tests__/**/*",
      "eslint.config.ts",
    ],
  },
  {
    // Disable prefer-destructured-params for the entire client package
    rules: {
      "prefer-destructured-params-plugin/prefer-destructured-params": "off",
    },
  },
  {
    // Only apply strict rules to non-test TypeScript files
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Package-specific rules for API client
      "@typescript-eslint/no-explicit-any": "warn", // Some flexibility for API responses
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-console": "error", // No console usage in library code

      // API clients may need some type flexibility
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",

      // Disable prefer-destructured-params for API function patterns
      "prefer-destructured-params-plugin/prefer-destructured-params": "off",
    },
  },
  {
    // Allow console in logger files
    files: ["src/internal/logger.{ts,js}"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Disable project-aware TypeScript rules for markdown code blocks
    files: ["**/*.md/*.{js,ts,jsx,tsx}"],
    languageOptions: {
      parserOptions: {
        project: false, // Disable type-aware linting for markdown code blocks
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "no-console": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "off",
    },
  },
]);
