import type { KnipConfig } from "knip";

/**
 * Knip configuration for Academic Explorer monorepo
 *
 * Simplified configuration focusing on core unused file/dependency detection
 * without complex plugin configurations that may have path issues.
 */
const config: KnipConfig = {
  ignore: [
    // Test utilities and helpers (intentionally exported for reuse)
    "**/__tests__/utils/**",
    "**/__tests__/mocks/**",
    "**/test-*.ts",
    "**/*.test-helpers.ts",
    // Library exports (used by external consumers)
    "packages/*/src/index.ts",
    "packages/*/src/**/index.ts",
    // Package.json files with library entries
    "packages/*/package.json",
    // Test setup files referenced in vitest config
    "apps/web/src/test/setup.ts",
    "apps/web/src/test/component-setup.ts",
    "apps/web/src/test/e2e-setup.ts",
    // Development utility files (may be used in future development)
    "packages/client/src/advanced-field-selection.ts",
    "packages/client/src/cached-client.ts",
    "packages/client/src/type-guards.ts",
    // UI components that are exported but not currently used in web app
    "packages/ui/src/components/cards/AuthorCard.tsx",
    "packages/ui/src/components/cards/WorkCard.tsx",
    "packages/ui/src/components/cards/SourceCard.tsx",
    "packages/ui/src/components/cards/InstitutionCard.tsx",
    "packages/ui/src/components/cards/TopicCard.tsx",
    "packages/ui/src/components/cards/PublisherCard.tsx",
    "packages/ui/src/components/cards/FunderCard.tsx",
    "packages/ui/src/components/cards/examples.tsx",
    // Filter system components (built but not integrated)
    "apps/web/src/components/filters/**",
    // Search components (built but not integrated)
    "apps/web/src/components/search/AdvancedQueryBuilder.tsx",
    "apps/web/src/components/search/OpenAlexFilters.tsx",
    "apps/web/src/components/search/UnifiedSearch.tsx",
    "apps/web/src/components/search/VisualQueryBuilder.tsx",
    "apps/web/src/components/search/VisualQueryBuilder.example.tsx",
    // Test infrastructure exports (intentionally exported for test reuse)
    "packages/graph/src/__tests__/**/*.ts",
    // CLI utilities and tools
    "apps/cli/src/cache/static-cache-manager.ts",
    "apps/cli/src/entity-detection.ts",
    "apps/cli/src/openalex-cli-class.ts",
    // Graph visualization components (future features)
    "apps/web/src/components/graph/adapters/**",
    "apps/web/src/components/graph/configs/**",
    "apps/web/src/components/graph/AnimatedLayoutProvider.tsx",
    "apps/web/src/components/graph/GraphToolbar.tsx",
    // Cache and data management components
    "apps/web/src/components/cache/**",
    // Layout components (sidebar components)
    "apps/web/src/components/layout/LeftRibbon.tsx",
    "apps/web/src/components/layout/LeftSidebarDynamic.tsx",
    "apps/web/src/components/layout/RightRibbon.tsx",
    "apps/web/src/components/layout/RightSidebarDynamic.tsx",
    // Section components (panel components)
    "apps/web/src/components/sections/**",
    // Search interface components
    "apps/web/src/components/search/DateRangeFilter.tsx",
    "apps/web/src/components/search/FieldSearch.tsx",
    "apps/web/src/components/search/SavedQueries.tsx",
    "apps/web/src/components/search/SearchInterface.tsx",
    // Evaluation and analysis components
    "apps/web/src/components/evaluation/**",
    // Test utilities and helpers
    "apps/web/src/test/**",
    // Configuration and routing files
    "apps/web/src/config/**",
    "apps/web/src/hooks/use-context-menu.ts",
    "apps/web/src/hooks/use-graph-persistence.ts",
    "apps/web/src/hooks/use-web-worker.ts",
    "apps/web/src/services/**",
    // Route files (generated and lazy loaded)
    "apps/web/src/routes/**/*.tsx",
    "apps/web/src/routes/**/*.ts",
    // Style files
    "apps/web/src/styles/**",
    // Store files (state management)
    "apps/web/src/stores/**",
    // Component files not currently used but part of development
    "apps/web/src/components/EntityGrid.tsx",
    "apps/web/src/components/EntityListView.tsx",
    "apps/web/src/components/ViewModeToggle.tsx",
    "apps/web/src/components/types.ts",
    // Legacy and development files
    "packages/client/src/**",
    "packages/utils/src/**",
    "packages/graph/src/**",
    "packages/simulation/src/**",
    "packages/types/src/**",
  ],
  ignoreExportsUsedInFile: true,
  // Research project settings - be more lenient with unused exports
  includeEntryExports: false,
  workspaces: {
    // Root workspace - scripts and configs
    ".": {
      entry: [
        "tools/scripts/*.{ts,js}",
        "config/shared.ts",
        "config/vite-plugins/static-data-index.ts",
        "vite.config.base.ts",
        "nx.json",
      ],
      project: ["tools/scripts/**/*.{ts,js}", "config/**/*.ts", "*.{ts,js}"],
    },

    // Web application
    "apps/web": {
      entry: [
        "src/main.tsx",
        "src/test/setup.ts",
        "src/test/component-setup.ts",
        "src/test/e2e-setup.ts",
        "src/test/msw/server.ts",
        "src/test/msw/handlers.ts",
        "src/build-plugins/openalex-data-plugin.ts",
        "src/stores/data-fetching-progress-store.ts",
      ],
      project: ["src/**/*.{ts,tsx}"],
      ignore: [
        "src/routeTree.gen.ts", // Generated by TanStack Router
        "src/**/*.{test,spec}.{ts,tsx}",
        "e2e/**/*",
        // Future features not currently integrated
        "src/components/filters/**",
        "src/components/search/AdvancedQueryBuilder.tsx",
        "src/components/search/OpenAlexFilters.tsx",
        "src/components/search/UnifiedSearch.tsx",
        "src/components/search/VisualQueryBuilder.tsx",
        "src/components/search/VisualQueryBuilder.example.tsx",
        "src/components/ApiCallTracker.tsx",
        "src/utils/navigation-tracker.ts",
        "src/workers/**",
      ],
    },

    // CLI application
    "apps/cli": {
      entry: ["src/simple-cli.ts"],
      project: ["src/**/*.ts"],
      ignore: ["src/**/*.{test,spec}.ts"],
    },

    // Graph package
    "packages/graph": {
      project: ["src/**/*.ts"],
    },

    // Simulation package
    "packages/simulation": {
      project: ["src/**/*.ts"],
    },

    // OpenAlex client package
    "packages/client": {
      entry: ["src/index.ts"],
      project: ["src/**/*.ts"],
    },

    // UI components package
    "packages/ui": {
      entry: ["src/index.ts", "src/test/setup.ts"],
      project: ["src/**/*.{ts,tsx}"],
      ignore: [
        "src/**/*.stories.{ts,tsx}", // Storybook stories
        "src/**/*.{test,spec}.{ts,tsx}",
        // Specialized card components (future features)
        "src/components/cards/AuthorCard.tsx",
        "src/components/cards/WorkCard.tsx",
        "src/components/cards/SourceCard.tsx",
        "src/components/cards/InstitutionCard.tsx",
        "src/components/cards/TopicCard.tsx",
        "src/components/cards/PublisherCard.tsx",
        "src/components/cards/FunderCard.tsx",
        "src/components/cards/examples.tsx",
        // Library components exported but not yet used in web app
        "src/components/data-display/BaseTable.tsx",
        "src/components/data-display/index.ts",
        "src/components/feedback/ErrorBoundary/ErrorBoundary.tsx",
        "src/components/feedback/ErrorBoundary/index.ts",
        "src/components/feedback/index.ts",
        "src/components/layout/CollapsibleSection.tsx",
        "src/components/layout/index.ts",
        "src/components/section-kit/BulkActionToolbar.tsx",
        "src/components/section-kit/EntityCollectionList.tsx",
        "src/components/section-kit/index.ts",
      ],
    },

    // Shared utilities package
    "packages/utils": {
      project: ["src/**/*.ts"],
    },
  },

  // Global ignore patterns
  ignore: [
    "**/dist/**",
    "**/coverage/**",
    "**/.nx/**",
    "**/node_modules/**",
    "**/.tmp/**",
    "**/.cache/**",
    ".github/**", // GitHub workflows contain complex YAML that can confuse knip
    ".github/workflows/**",
  ],

  // Ignore dependencies that are used but not detected correctly
  ignoreDependencies: [
    "@vanilla-extract/vite-plugin", // Used in vite.config.ts but knip doesn't detect it properly
    "@mantine/notifications", // Optional peerDependency for UI components
    "@tanstack/react-table", // Used by BaseTable component in UI package
    // Module resolution dependencies added for runtime and test environments
    "@types/d3-force", // Type definitions for d3-force used in graph visualizations
    "@types/d3-random", // Type definitions for d3-random used in force simulations
    "@types/lodash-es", // Type definitions for lodash-es utility functions
    "d3-force", // Force simulation library used in graph components
    "d3-random", // Random number generation for deterministic layouts
    "idb", // IndexedDB wrapper used for browser storage
    "lodash-es", // ES module utilities used across applications
    // Workspace dependencies that may not be actively used but are part of development
    "@academic-explorer/utils", // Utility package used across workspace projects
    // Testing and development dependencies
    "@testing-library/jest-dom", // Testing utilities
    "@testing-library/user-event", // Testing utilities
    "@testing-library/react", // Testing utilities
    "@axe-core/playwright", // Accessibility testing
    "eslint", // Linting and code quality
    "immer", // State management utilities
    "memfs", // Memory filesystem for testing
    "msw", // Mock Service Worker for API mocking
    "prettier", // Code formatting
    "vitest-axe", // Accessibility testing
    "vite-tsconfig-paths", // Vite path mapping
    // Development tooling
    "@eslint/markdown", // ESLint markdown support
    "@nx/eslint-plugin", // Nx ESLint integration
    "@nx/web", // Nx web development utilities
    "@semantic-release/commit-analyzer", // Release automation
    "@semantic-release/github", // GitHub release automation
    "@semantic-release/npm", // NPM release automation
    "@semantic-release/release-notes-generator", // Release notes automation
    "@stylistic/eslint-plugin", // ESLint stylistic plugin
    "@swc/helpers", // SWC helper utilities
    "@typescript-eslint/eslint-plugin", // TypeScript ESLint plugin
    "@typescript-eslint/parser", // TypeScript ESLint parser
    "@typescript-eslint/utils", // TypeScript ESLint utilities
    "eslint-config-xo", // XO ESLint config
    "eslint-config-xo-typescript", // XO TypeScript ESLint config
    "eslint-formatter-compact", // Compact ESLint formatter
    "eslint-plugin-eslint-comments", // ESLint comment plugin
    "eslint-plugin-perfectionist", // Perfectionist ESLint plugin
    "eslint-plugin-prettier", // Prettier ESLint plugin
    "eslint-plugin-security", // Security ESLint plugin
    "eslint-plugin-sonarjs", // SonarJS ESLint plugin
    "eslint-plugin-unicorn", // Unicorn ESLint plugin
    "eslint-plugin-unused-imports", // Unused imports ESLint plugin
    "eslint-plugin-yaml", // YAML ESLint plugin
  ],

  // Plugin configurations
  eslint: {
    config: [
      "eslint.config.base.ts",
      "eslint.config.react.ts",
      "apps/*/eslint.config.ts",
      "packages/*/eslint.config.ts",
    ],
  },
  vitest: {
    config: [
      "vitest.config.base.ts",
      "vitest.config.react.ts",
      "apps/*/vitest.config.ts",
      "packages/*/vitest.config.ts",
    ],
  },

  // Re-enable vite plugin for better analysis
  vite: true,
  playwright: false,
};

export default config;
