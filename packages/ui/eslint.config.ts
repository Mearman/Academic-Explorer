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
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // Disable type-aware rules for performance in UI package
        project: false,
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    rules: {
      // Package-specific rules for UI components
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "error", // No console usage in library code

      // UI components often need type assertions and flexible operators
      "no-type-assertions-plugin/no-type-assertions": "off", // Allow type assertions in UI components
      "@typescript-eslint/prefer-nullish-coalescing": "off", // Allow logical OR in JSX
      "@typescript-eslint/prefer-optional-chain": "off", // Allow explicit checks
      "@typescript-eslint/no-unsafe-assignment": "off", // Allow unsafe assignments in UI
      "@typescript-eslint/no-unsafe-return": "off", // Allow unsafe returns in UI

      // React components may need some prop flexibility
      "react/prop-types": "off", // Using TypeScript
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",

      // Storybook integration
      "react-refresh/only-export-components": "off", // Allow multiple exports for components
    },
  },
]);
