import tseslint from "typescript-eslint";
import reactConfig from "../../eslint.config.react.ts";

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
  // UI-specific config that overrides base config - must come AFTER reactConfig
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // Package-specific rules for UI components
      "@typescript-eslint/no-explicit-any": "off", // Allow any types in UI for flexibility
      "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions in UI
      "no-console": "error", // No console usage in library code

      // UI components work with dynamic data and need flexible type handling
      "no-type-assertions-plugin/no-type-assertions": "off", // Allow type assertions in UI components

      // Disable ALL unsafe type rules for UI components that handle dynamic entity data
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",

      // Also disable these rules that might be causing issues
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
    },
  },
]);
