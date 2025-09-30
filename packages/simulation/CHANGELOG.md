# Changelog

All notable changes to the `@academic-explorer/simulation` package will be documented in this file.

This package follows independent versioning. Changes are tracked from the monorepo baseline commit `3bb89ce3`.

## 1.0.4 (2025-09-28)

### Fixes

- **test:** reorganize test files with type-specific naming ([fc924838](https://github.com/Mearman/Academic-Explorer/commit/fc924838))
  - Move from generic `.test.ts` to structured naming convention
  - Add `.unit.test.ts` and `.integration.test.ts` for better test organization
  - Enable type-specific test configuration in vitest workspaces

## 1.0.3 (2025-09-28)

### Fixes

- **monorepo:** resolve circular dependencies and task hanging issues ([06466e9c](https://github.com/Mearman/Academic-Explorer/commit/06466e9c))
  - Remove unnecessary build dependencies from project configuration
  - Add proper inputs configuration for better caching
  - Fix Nx task configuration deadlocks

## 1.0.2 (2025-09-26)

### Fixes

- **config:** correct vitest configuration import paths ([1c085b6e](https://github.com/Mearman/Academic-Explorer/commit/1c085b6e))
  - Fix import paths from `.js` extensions to `.ts` for proper resolution
  - Ensure vitest configurations use correct TypeScript imports
  - Resolve module resolution errors in test environments

## 1.0.1 (2025-09-26)

### Fixes

- **tests:** add placeholder test files for utils and simulation packages ([430491d3](https://github.com/Mearman/Academic-Explorer/commit/430491d3))
  - Add basic test files to satisfy vitest 'no test files found' requirement
  - Prevent test job from failing with exit code 1

## 1.0.0 (2025-09-26)

Initial release of the `@academic-explorer/simulation` package as part of the monorepo migration.

### Features

- Core force-directed graph simulation utilities
- Deterministic simulation with seeded random number generation
- Web Worker support for background processing
- TypeScript type definitions