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
      "no-console": "error", // No console usage in library code

      // UI components work with dynamic data and need flexible type handling
      "no-type-assertions-plugin/no-type-assertions": "off", // Allow type assertions in UI components

      // React components may need some prop flexibility
      "react/prop-types": "off", // Using TypeScript
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",

      // Storybook integration
      "react-refresh/only-export-components": "off", // Allow multiple exports for components
    },
  },
]);
