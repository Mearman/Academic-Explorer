import js from "@eslint/js";
import markdownPlugin from "@eslint/markdown";
import nxPlugin from "@nx/eslint-plugin";
import eslintComments from "eslint-plugin-eslint-comments";
import unusedImports from "eslint-plugin-unused-imports";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import path from "path";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "url";

// Load custom TypeScript ESLint rules using jiti
import { createJiti } from "jiti";

// Create jiti instance for loading TypeScript modules
const jiti = createJiti(import.meta.url, {
  interopDefault: true,
});

// Helper function to load TypeScript modules using jiti
function loadTsModule(modulePath: string) {
  try {
    const module = jiti(modulePath);
    // Return the default export which contains the plugin object with rules
    return module.default || module;
  } catch (error) {
    console.warn(`Failed to load ${modulePath}, skipping...`);
    return {};
  }
}

const noEmojiPlugin = loadTsModule("./eslint-rules/no-emoji.ts");
const noTypeAssertionsPlugin = loadTsModule(
  "./eslint-rules/no-type-assertions.ts",
);
const testFileNamingPlugin = loadTsModule("./eslint-rules/test-file-naming.ts");
const zustandStoreDryPlugin = loadTsModule(
  "./eslint-rules/zustand-store-dry.ts",
);
const noDeprecatedCommentsPlugin = loadTsModule(
  "./eslint-rules/no-deprecated-comments.ts",
);
const noLoggerInfoPlugin = loadTsModule("./eslint-rules/no-logger-info.ts");
const noSelectorObjectCreationPlugin = loadTsModule(
  "./eslint-rules/no-selector-object-creation.ts",
);
const noUnstableDependenciesPlugin = loadTsModule(
  "./eslint-rules/no-unstable-dependencies.ts",
);
const preferDestructuredParamsPlugin = loadTsModule(
  "./eslint-rules/prefer-destructured-params.ts",
);
const noZustandComputedFunctionsPlugin = loadTsModule(
  "./eslint-rules/no-zustand-computed-functions.ts",
);

/**
 * Base ESLint configuration for Academic Explorer monorepo
 *
 * This configuration provides:
 * - TypeScript strict type checking
 * - Common rules for all packages/apps
 * - Import/export linting
 * - Comment rules
 *
 * Individual packages/apps can extend this and add specific plugins.
 */
export default tseslint.config([
  {
    // Global ignores for all workspaces
    ignores: [
      // Build and distribution files
      "dist/**/*",
      "build/**/*",
      "out/**/*",
      "coverage/**/*",

      // Dependencies and cache
      "node_modules/**/*",
      ".nx/**/*",
      ".pnpm-store/**/*",
      ".cache/**/*",

      // Generated files
      "**/*.d.ts",
      "**/*.config.js", // Allow JS config files
      "**/routeTree.gen.ts",
      "**/*.generated.ts",
      "**/*.generated.tsx",
      "**/generated/**/*",

      // Test and Storybook output
      "storybook-static/**/*",
      "test-results/**/*",
      "playwright-report/**/*",

      // Temporary files
      "tmp/**/*",
      "temp/**/*",
      "**/*.tmp",
      "**/*.temp",

      // IDE and editor files
      ".vscode/**/*",
      ".idea/**/*",
      "**/.DS_Store",

      // Markdown files to exclude from emoji checking
      "docs/openalex-docs/**/*.md",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      // Use recommended instead of strict for performance
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
      parserOptions: {
        // Enable type-aware linting using project service for automatic tsconfig detection
        projectService: {
          allowDefaultProject: ["eslint.config.ts", "eslint.config.js"],
        },
        ecmaVersion: 2020,
        sourceType: "module",
        tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
      },
    },
    plugins: {
      "eslint-comments": eslintComments,
      "unused-imports": unusedImports,
      sonarjs,
      "@nx": nxPlugin,
      "no-emoji": noEmojiPlugin,
      "no-type-assertions-plugin": noTypeAssertionsPlugin,
      "test-file-naming-plugin": testFileNamingPlugin,
      "zustand-store-dry-plugin": zustandStoreDryPlugin,
      "no-deprecated-comments-plugin": noDeprecatedCommentsPlugin,
      "no-logger-info-plugin": noLoggerInfoPlugin,
      "no-selector-object-creation-plugin": noSelectorObjectCreationPlugin,
      "no-unstable-dependencies-plugin": noUnstableDependenciesPlugin,
      "no-zustand-computed-functions-plugin": noZustandComputedFunctionsPlugin,
      "prefer-destructured-params-plugin": preferDestructuredParamsPlugin,
    },
    rules: {
      // TypeScript-specific rules
      "@typescript-eslint/no-unused-vars": "off", // handled by unused-imports
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": false,
          "ts-ignore": false,
        },
      ],
      // Type-aware rules for better type safety
      "@typescript-eslint/prefer-nullish-coalescing": "error",
      "@typescript-eslint/prefer-optional-chain": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",

      // Strict type safety rules to prevent type coercion
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",

      // Keep some rules relaxed for practical reasons
      "@typescript-eslint/restrict-template-expressions": "off",

      // Code duplication and quality rules
      "sonarjs/no-duplicate-string": "warn",
      "sonarjs/no-duplicated-branches": "error",
      "sonarjs/no-identical-functions": "error",
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-collapsible-if": "error",
      "sonarjs/no-inverted-boolean-check": "error",
      "sonarjs/no-redundant-jump": "error",
      "sonarjs/no-same-line-conditional": "error",
      "sonarjs/no-unused-collection": "error",
      "sonarjs/prefer-immediate-return": "error",
      "sonarjs/prefer-object-literal": "error",
      "sonarjs/prefer-single-boolean-return": "error",
      "sonarjs/prefer-while": "error",

      // Emoji detection
      "no-emoji/no-emoji": "error",

      // Forbid all type assertions - use type guards instead
      "no-type-assertions-plugin/no-type-assertions": "error",
      "zustand-store-dry-plugin/zustand-store-dry": "error",
      "no-deprecated-comments-plugin/no-deprecated-comments": "error",
      "no-logger-info-plugin/no-logger-info": "error",
      "no-selector-object-creation-plugin/no-selector-object-creation": "error",
      "no-unstable-dependencies-plugin/no-unstable-dependencies": "error",
      "no-zustand-computed-functions-plugin/no-zustand-computed-functions":
        "error",
      "prefer-destructured-params-plugin/prefer-destructured-params": "error",
    },
  },
  {
    // Nx dependency checks for buildable/publishable libraries
    files: ["packages/*/src/**/*.{ts,tsx}"],
    plugins: {
      "@nx": nxPlugin,
    },
    rules: {
      "@nx/dependency-checks": [
        "error",
        {
          buildTargets: ["build"],
          checkMissingDependencies: true,
          checkObsoleteDependencies: true,
          checkVersionMismatches: true,
          includeTransitiveDependencies: false,
          useLocalPathsForWorkspaceDependencies: true,
          ignoredDependencies: [
            // Common dev dependencies that don't need to be in package.json
            "vitest",
            "@vitest/ui",
            "@testing-library/*",
            "eslint*",
            "typescript",
            "@types/*",
          ],
        },
      ],
    },
  },
  {
    // Relaxed rules for config files
    files: [
      "**/*.config.{ts,js}",
      "**/vite.config.{ts,js}",
      "**/vitest.config.{ts,js}",
      "**/knip.ts",
      "**/config/**/*.{ts,js}",
    ],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // "no-type-assertions-plugin/no-type-assertions": "off",
      "no-console": "off",
    },
  },
  {
    // Test file rules - disable strict type checking since test files aren't in tsconfig
    files: ["**/*.{test,spec}.{ts,tsx}", "**/test/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: false, // Disable type-aware rules for test files
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "no-console": "off",
      "test-file-naming-plugin/test-file-naming": "error",
    },
  },
  {
    // CLI files - allow console for user output
    files: ["apps/cli/src/**/*.{ts,tsx}"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Logger files should be allowed to use console
    files: [
      "**/logger.{ts,js}",
      "**/src/logger.{ts,js}",
      "**/src/internal/logger.{ts,js}",
    ],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Service worker files should be allowed to use console for debugging
    files: [
      "**/*worker*.{ts,js}",
      "**/src/workers/**/*.{ts,js}",
      "**/*.worker.{ts,js}",
      "**/*sw.{ts,js}",
    ],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "warn", // Allow any for service worker event types
    },
  },
  {
    // CLI scripts and tools should be allowed to use emojis for user-friendly console output
    files: [
      "**/tools/scripts/**/*.{ts,js}",
      "**/scripts/**/*.{ts,js}",
      "**/*cli*.{ts,js}",
    ],
    rules: {
      "no-emoji-plugin/no-emoji": "off",
    },
  },
  {
    // UI components - disable prefer-destructured-params for React component patterns
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: {
      "prefer-destructured-params-plugin/prefer-destructured-params": "off",
    },
  },
  {
    // Markdown files - process with markdown plugin and apply no-emoji rule
    files: ["**/*.md"],
    languageOptions: {
      parserOptions: {
        // Disable project service for markdown files to avoid parsing errors
        projectService: false,
      },
    },
    plugins: {
      markdown: markdownPlugin,
      "no-emoji-plugin": noEmojiPlugin,
    },
    processor: "markdown/markdown",
    rules: {
      "no-emoji-plugin/no-emoji": "error",
    },
  },
  {
    // Code blocks in markdown files - relax rules for examples
    files: ["**/*.md/*.{js,ts,jsx,tsx}"],
    languageOptions: {
      parserOptions: {
        // Disable project service for markdown code blocks to avoid parsing errors
        projectService: false,
      },
    },
    rules: {
      // Variable and import rules - common in code samples
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "off",
      "unused-imports/no-unused-vars": "off",

      // TypeScript strict rules - often not relevant in samples
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/prefer-optional-chain": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/await-thenable": "off",

      // General JavaScript rules that might be strict for samples
      "prefer-const": "off",
      "no-var": "off",
      "object-shorthand": "off",
      "prefer-destructuring": "off",

      // Comment and import rules not needed in samples
      "eslint-comments/disable-enable-pair": "off",
      "eslint-comments/no-unused-disable": "off",
      "eslint-comments/no-unlimited-disable": "off",

      // Allow any patterns in code samples
      "no-empty": "off",
      "no-unreachable": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-inferrable-types": "off",
    },
  },
]);
