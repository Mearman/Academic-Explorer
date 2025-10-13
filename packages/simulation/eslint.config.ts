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
      // Package-specific rules for simulation algorithms
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-console": "error", // No console usage in library code

      // Allow some flexibility for mathematical calculations
      "@typescript-eslint/no-magic-numbers": "off",
    },
  },
  {
    // Test files - use base config without type-aware rules
    files: ["src/**/*.{test,spec}.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: true, // Allow parsing even if not in tsconfig
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
]);
