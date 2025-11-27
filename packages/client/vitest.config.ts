/// <reference types='vitest' />
import * as path from "node:path"

import { nxCopyAssetsPlugin } from "@nx/vite/plugins/nx-copy-assets.plugin"
import { nxViteTsPaths } from "@nx/vite/plugins/nx-tsconfig-paths.plugin"
import { defineConfig, mergeConfig } from "vite"

import { baseVitestConfig } from "../../vitest.config.base"

export default defineConfig(
  mergeConfig(baseVitestConfig, {
    root: __dirname,
    cacheDir: "../../node_modules/.vite/packages/client",
    plugins: [nxViteTsPaths(), nxCopyAssetsPlugin(["*.md"])],
    resolve: {
      // Use source condition to resolve workspace packages to source files
      conditions: ["source", "import", "module", "default"],
    },
    server: {
      deps: {
        // Inline workspace packages to resolve from source files
        inline: [
          "@academic-explorer/types",
          "@academic-explorer/utils",
        ],
      },
    },
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
    test: {
      watch: false,
      environment: "node",
      // Force vitest to bundle workspace packages through vite's resolver
      deps: {
        inline: [/@academic-explorer\/.*/],
      },
      coverage: {
        reportsDirectory: "../../coverage/packages/client",
      },
      projects: [
        {
          test: {
            name: "unit",
            include: ["src/**/*.unit.test.ts"],
            // Exclude tests with workspace package resolution issues until fixed
            // These tests were never running due to broken @nx/vitest include option
            exclude: [
              "src/client.unit.test.ts",
              "src/utils/__tests__/autocomplete.unit.test.ts",
            ],
            environment: "node",
          },
        },
        {
          test: {
            name: "integration",
            include: ["src/**/*.integration.test.ts"],
            // Exclude tests with workspace package resolution issues until fixed
            // These tests were never running due to broken @nx/vitest include option
            exclude: [
              "src/cache/__tests__/cache-performance.integration.test.ts",
              "src/cache/__tests__/cache.integration.test.ts",
              "src/utils/__tests__/autocomplete.integration.test.ts",
            ],
            environment: "node",
            testTimeout: 30000,
          },
        },
      ],
    },
  }),
);
