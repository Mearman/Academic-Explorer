export default {
  entry: [
    "src/main.tsx",
    "vite.config.base.ts",
    "vitest.config.*.ts",
    "playwright.config.ts",
    "eslint.config.js",
    "nx.json",
  ],
  project: ["src/**/*.{ts,tsx}"],
  ignore: [
    // Generated files
    "src/routeTree.gen.ts",
    "dist/**",
    "coverage/**",
    ".nx/**",

    // Test files (keep them as they are part of project structure)
    "src/**/*.test.{ts,tsx}",
    "src/**/*.spec.{ts,tsx}",

    // Build artifacts
    "node_modules/**",
  ],
  // Remove ignoreBinaries and ignoreDependencies - let knip analyze what's actually used
  workspaces: {
    ".": {
      entry: ["src/main.tsx", "vite.config.ts"],
    },
  },
};
