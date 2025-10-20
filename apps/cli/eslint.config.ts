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
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",

      // CLI tools should be allowed to use console for output and emojis for user-friendly output
      "no-console": "off",
      "no-emoji-plugin/no-emoji": "off",
    },
  },
];
