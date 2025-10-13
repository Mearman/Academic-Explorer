import tseslint from "typescript-eslint";
import baseConfig from "../../eslint.config.base.js";

export default tseslint.config([
  ...baseConfig,
  {
    // Source files only (test files are handled by base config with project: false)
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.{test,spec}.{ts,tsx}"], // Exclude test files from type-aware linting
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Package-specific rules for shared utilities
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-console": "warn", // Logger package may use console internally

      // Utilities may need some type flexibility for generic functions
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
    },
  },
  {
    // State management utilities - allow Zustand usage and flexible typing
    files: ["src/state/**/*.{ts,tsx}"],
    rules: {
      "zustand-store-dry-plugin/zustand-store-dry": "off", // This package provides Zustand abstractions
      "@typescript-eslint/no-explicit-any": "off", // Complex middleware chains require flexible typing
      "@typescript-eslint/no-unsafe-assignment": "off", // Storage adapters have varying return types
    },
  },
  {
    // Logger file specifically should be allowed to use console
    files: ["src/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Test files - allow type assertions for mocks
    files: ["src/**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "no-type-assertions-plugin/no-type-assertions": "off",
    },
  },
]);
