import baseConfig from "../../eslint.config.base";
import path from "path";
import { fileURLToPath } from "url";

export default [
  {
    // Global ignores for simulation package
    ignores: [
      "eslint.config.ts",
      "dist/**/*",
      "node_modules/**/*",
      "**/*.d.ts",
    ],
  },
  ...baseConfig,
  {
    // Package-specific overrides for simulation
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
      },
    },
    rules: {
      // Allow some flexibility for mathematical calculations
      "@typescript-eslint/no-magic-numbers": "off",

      // Package-specific rules for simulation algorithms
      "no-console": "error", // No console usage in library code
    },
  },
];
