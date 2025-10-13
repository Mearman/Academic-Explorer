import base from "../../../eslint.config.base.ts";

export default [
  ...base,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // CLI tools often need type assertions and unsafe operations
      "no-type-assertions-plugin/no-type-assertions": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
    },
  },
];
