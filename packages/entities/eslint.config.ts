import baseConfig from "../../eslint.config.base";

export default [
  ...baseConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {},
  },
];
