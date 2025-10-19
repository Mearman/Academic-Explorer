import tseslint from "typescript-eslint";
import baseConfig from "../../eslint.config.base.js";

export default tseslint.config([
  ...baseConfig,
  {
    // ESLint config file itself - disable type-aware rules
    files: ["eslint.config.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    rules: {
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
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
