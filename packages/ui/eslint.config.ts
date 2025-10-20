import tseslint from "typescript-eslint";
import reactConfig from "../../eslint.config.react.ts";
import path from "path";
import { fileURLToPath } from "url";

export default tseslint.config([
  {
    // Enhanced ignores for better performance
    ignores: [
      // Test files
      "src/**/*.test.*",
      "src/**/*.spec.*",
      "src/**/*.stories.*",
      "src/test/**/*",

      // Build outputs
      "dist/**/*",
      "lib/**/*",
      "esm/**/*",

      // Generated files
      "**/*.d.ts",
      "**/*.generated.*",

      // Storybook and tooling
      "storybook-static/**/*",
      ".storybook/main.js",
    ],
  },
  ...reactConfig,
  {
    // Override base config unsafe rules for UI components
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // Disable type-aware linting for UI components to allow flexible data handling
        projectService: false,
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    rules: {
      // Package-specific rules for UI components
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error", // No console usage in library code

      // UI components work with dynamic data and need flexible type handling
      "no-type-assertions-plugin/no-type-assertions": "off", // Allow type assertions in UI components
      "@typescript-eslint/prefer-nullish-coalescing": "off", // Allow logical OR in JSX
      "@typescript-eslint/prefer-optional-chain": "off", // Allow explicit checks
      "@typescript-eslint/no-explicit-any": "off", // Allow any types in UI for flexibility

      // CRITICAL: Disable unsafe rules for UI components that handle dynamic/error data
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",

      // Disable destructuring rule for React component patterns
      "prefer-destructured-params-plugin/prefer-destructured-params": "off",

      // React components may need some prop flexibility
      "react/prop-types": "off", // Using TypeScript
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",

      // Storybook integration
      "react-refresh/only-export-components": "off", // Allow multiple exports for components
    },
  },
]);
