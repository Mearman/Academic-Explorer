import baseConfig from "../eslint.config.base.js";

/**
 * ESLint configuration for tools package
 *
 * Extends base config with relaxed rules for utility scripts:
 * - Allow console statements (essential for CLI tools)
 * - Allow unsafe operations (scripts often deal with external data)
 * - Allow floating promises (scripts may not need to await all operations)
 * - Disable strict type checking rules (tsconfig has strict: false)
 */
export default [
  ...baseConfig,
  {
    // Scripts should be allowed to use console and have relaxed type checking
    files: ["**/*.ts"],
    rules: {
      "no-console": "off", // Scripts need console output
      "@typescript-eslint/no-floating-promises": "off", // Scripts may not await all promises
      "@typescript-eslint/no-unsafe-assignment": "off", // Scripts often work with external data
      "@typescript-eslint/no-unsafe-member-access": "off", // External APIs/data structures
      "@typescript-eslint/no-unsafe-call": "off", // External function calls
      "@typescript-eslint/no-unsafe-argument": "off", // External function arguments
      "@typescript-eslint/no-unsafe-return": "off", // External return values
      "no-type-assertions-plugin/no-type-assertions": "off", // Scripts often need type assertions

      // Disable type-aware rules that require strictNullChecks
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
    },
  },
];
