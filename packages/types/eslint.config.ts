import baseConfig from "../../eslint.config.base";

export default [
  ...baseConfig,
  {
    files: ["entities/src/**/*.{ts,tsx}"],
    rules: {},
  },
];
