# 9.0.0 (2025-10-01)

### 🚀 Features

- **shared-utils:** add index format adapter functions ([219c3914](https://github.com/Mearman/Academic-Explorer/commit/219c3914))
- ⚠️  **shared-utils:** implement unified hex encoding for cache filenames ([9d99e7b4](https://github.com/Mearman/Academic-Explorer/commit/9d99e7b4))
- **shared-utils:** enhance static data generation and caching ([8791bfcf](https://github.com/Mearman/Academic-Explorer/commit/8791bfcf))
- **config:** implement scoped test dependencies across all projects ([17e80743](https://github.com/Mearman/Academic-Explorer/commit/17e80743))
- **shared-utils:** add unified static data cache utilities ([eea3044e](https://github.com/Mearman/Academic-Explorer/commit/eea3044e))
- **utils:** add browser compatibility for static data generator ([38be9efd](https://github.com/Mearman/Academic-Explorer/commit/38be9efd))
- **utils:** implement static data index generator and utilities ([76683996](https://github.com/Mearman/Academic-Explorer/commit/76683996))
- **utils:** add environment detection and cache configuration system ([c393b330](https://github.com/Mearman/Academic-Explorer/commit/c393b330))
- **utils:** add comprehensive query syntax parser with wildcard and field prefix support ([08a7f1c3](https://github.com/Mearman/Academic-Explorer/commit/08a7f1c3))
- **utils:** add cache browser service and utilities ([b69fc963](https://github.com/Mearman/Academic-Explorer/commit/b69fc963))

### 🩹 Fixes

- **monorepo:** restore independent package versioning from correct baseline ([f4962602](https://github.com/Mearman/Academic-Explorer/commit/f4962602))
- **shared-utils:** handle future dates gracefully in relative time display ([c4ce902e](https://github.com/Mearman/Academic-Explorer/commit/c4ce902e))
- **web,shared-utils:** fix build-time metadata injection ([a4e29ff7](https://github.com/Mearman/Academic-Explorer/commit/a4e29ff7))
- **shared-utils:** remove non-existent type import ([2b2e920b](https://github.com/Mearman/Academic-Explorer/commit/2b2e920b))
- **static-data:** exclude query cache directories from entity processing ([f26c0449](https://github.com/Mearman/Academic-Explorer/commit/f26c0449))
- **utils:** update tests to use unified object-based directory index structure ([43d05414](https://github.com/Mearman/Academic-Explorer/commit/43d05414))
- **utils:** remove unused import types from test file ([e879fbaf](https://github.com/Mearman/Academic-Explorer/commit/e879fbaf))
- **utils:** exclude entire meta field from content hash generation ([9f30b859](https://github.com/Mearman/Academic-Explorer/commit/9f30b859))
- **ci:** resolve CI pipeline failures ([799a293b](https://github.com/Mearman/Academic-Explorer/commit/799a293b))
- **utils:** resolve typescript undefined object errors ([89ef74e8](https://github.com/Mearman/Academic-Explorer/commit/89ef74e8))
- **utils:** resolve all eslint violations for ci compliance ([930b153c](https://github.com/Mearman/Academic-Explorer/commit/930b153c))
- **utils:** add missing EnvironmentMode import in mode-switcher ([e5edf3dd](https://github.com/Mearman/Academic-Explorer/commit/e5edf3dd))
- **utils:** resolve critical ESLint errors blocking CI ([a57ae373](https://github.com/Mearman/Academic-Explorer/commit/a57ae373))
- **monorepo:** resolve circular dependencies and task hanging issues ([06466e9c](https://github.com/Mearman/Academic-Explorer/commit/06466e9c))
- **shared-utils:** add missing static-data/cache-utilities export ([dc048eb0](https://github.com/Mearman/Academic-Explorer/commit/dc048eb0))
- **utils:** prevent proactive creation of empty entity directories ([cad83a88](https://github.com/Mearman/Academic-Explorer/commit/cad83a88))

### ⚠️  Breaking Changes

- **shared-utils:** Cache filenames use new encoding format

# Changelog

All notable changes to the utils package will be documented in this file.

This package uses independent versioning separate from the monorepo version.

## 2.1.3 (2025-09-30)

### Fixes

- handle future dates gracefully in relative time display ([c4ce902e](https://github.com/Mearman/Academic-Explorer/commit/c4ce902e))

  When the build system's clock is ahead of the user's browser clock, the build timestamp appears to be in the future. Now returns "just now" for dates more than 1 week in the future, assuming clock mismatch rather than actual future date.

## 2.1.2 (2025-09-30)

### Fixes

- fix build-time metadata injection ([a4e29ff7](https://github.com/Mearman/Academic-Explorer/commit/a4e29ff7))

  Add TypeScript declarations for `__BUILD_INFO__` and fix build-info.ts to directly reference the constant instead of globalThis. Read version directly from package.json instead of npm_package_version.

## 2.1.1 (2025-09-30)

### Fixes

- remove non-existent type import ([2b2e920b](https://github.com/Mearman/Academic-Explorer/commit/2b2e920b))

  Remove stale import of PathFileReference type that was never defined in types.ts.

## 2.1.0 (2025-09-30)

### Features

- add index format adapter functions ([219c3914](https://github.com/Mearman/Academic-Explorer/commit/219c3914))

  Add directoryIndexToUnifiedIndex() and unifiedIndexToDirectoryIndex() converters with smart readers for cross-system cache format compatibility.

# 2.0.0 (2025-09-30)

### Features

- **BREAKING:** implement unified hex encoding for cache filenames ([9d99e7b4](https://github.com/Mearman/Academic-Explorer/commit/9d99e7b4))

  Replace mixed URL/hex encoding with consistent `__XX__` hex format. All special characters (`:=&+,%`) now use uppercase hex codes with auto-normalization to prevent duplicates.

### BREAKING CHANGES

- Cache filenames use new encoding format. Existing cache files will need regeneration.

## 1.8.5 (2025-09-30)

### Fixes

- exclude query cache directories from entity processing ([f26c0449](https://github.com/Mearman/Academic-Explorer/commit/f26c0449))

  Skip 'queries' directories in index generation to prevent query cache files from being validated as entities.

## 1.8.4 (2025-09-30)

### Fixes

- update tests to use unified object-based directory index structure ([43d05414](https://github.com/Mearman/Academic-Explorer/commit/43d05414))

## 1.8.3 (2025-09-30)

### Fixes

- remove unused import types from test file ([e879fbaf](https://github.com/Mearman/Academic-Explorer/commit/e879fbaf))

## 1.8.2 (2025-09-30)

### Fixes

- exclude entire meta field from content hash generation ([9f30b859](https://github.com/Mearman/Academic-Explorer/commit/9f30b859))

  Remove entire meta field instead of selective exclusion to ensure stable content hashes by treating all API metadata as volatile.

## 1.8.1 (2025-09-30)

### Fixes

- resolve CI pipeline failures ([799a293b](https://github.com/Mearman/Academic-Explorer/commit/799a293b))

  Remove unused imports, fix build artifact upload by URL-encoding filenames with colons, update index.json references.

## 1.8.0 (2025-09-30)

### Features

- enhance static data generation and caching ([8791bfcf](https://github.com/Mearman/Academic-Explorer/commit/8791bfcf))

  Improve cache utilities with better path resolution, enhance index generator with more robust file handling, add better type definitions.

## 1.7.0 (2025-09-26)

### Features

- implement scoped test dependencies across all projects ([17e80743](https://github.com/Mearman/Academic-Explorer/commit/17e80743))

  Configure test tasks to depend on scoped test tasks (test:unit, test:component, test:integration) with standardized project names.

## 1.6.5 (2025-09-26)

### Fixes

- resolve typescript undefined object errors ([89ef74e8](https://github.com/Mearman/Academic-Explorer/commit/89ef74e8))

  Use definite assignment assertion for fs and path properties in index generator.

## 1.6.4 (2025-09-26)

### Fixes

- resolve all eslint violations for ci compliance ([930b153c](https://github.com/Mearman/Academic-Explorer/commit/930b153c))

  Replace console statements with logger imports, remove emojis, fix unused variables, resolve unsafe TypeScript assignments.

## 1.6.3 (2025-09-26)

### Fixes

- add missing EnvironmentMode import in mode-switcher ([e5edf3dd](https://github.com/Mearman/Academic-Explorer/commit/e5edf3dd))

## 1.6.2 (2025-09-26)

### Fixes

- resolve critical ESLint errors blocking CI ([a57ae373](https://github.com/Mearman/Academic-Explorer/commit/a57ae373))

  Fixed prefer-destructuring error, replaced explicit 'any' types with proper type assertions, removed emojis.

## 1.6.1 (2025-09-26)

### Fixes

- resolve circular dependencies and task hanging issues ([06466e9c](https://github.com/Mearman/Academic-Explorer/commit/06466e9c))

  Remove unnecessary build dependencies from typecheck and test targets, add proper inputs configuration.

## 1.6.0 (2025-09-26)

### Features

- add unified static data cache utilities ([eea3044e](https://github.com/Mearman/Academic-Explorer/commit/eea3044e))

  Add shared cache-utilities module for consistent data handling with content hashing, URL parsing, and file path utilities.

## 1.5.2 (2025-09-26)

### Fixes

- add missing static-data/cache-utilities export ([dc048eb0](https://github.com/Mearman/Academic-Explorer/commit/dc048eb0))

  Add export for './static-data/cache-utilities' to utils package.json.

## 1.5.1 (2025-09-26)

### Fixes

- prevent proactive creation of empty entity directories ([cad83a88](https://github.com/Mearman/Academic-Explorer/commit/cad83a88))

  Only log message when no entity directories exist rather than creating empty directories.

## 1.5.0 (2025-09-26)

### Features

- add browser compatibility for static data generator ([38be9efd](https://github.com/Mearman/Academic-Explorer/commit/38be9efd))

  Replace static imports with dynamic imports, add initializeNodeModules() for lazy loading, add runtime environment detection.

## 1.4.0 (2025-09-26)

### Features

- implement static data index generator and utilities ([76683996](https://github.com/Mearman/Academic-Explorer/commit/76683996))

  Add StaticDataIndexGenerator for creating searchable indexes with support for master index and entity-type-specific indexes.

## 1.3.0 (2025-09-26)

### Features

- add environment detection and cache configuration system ([c393b330](https://github.com/Mearman/Academic-Explorer/commit/c393b330))

  Implement environment detection for dev/prod modes, add cache strategy configuration, create mode switcher for dynamic behavior changes.

## 1.2.0 (2025-09-26)

### Features

- add comprehensive query syntax parser with wildcard and field prefix support ([08a7f1c3](https://github.com/Mearman/Academic-Explorer/commit/08a7f1c3))

  Support for quoted phrases, wildcards (*), and field prefixes (title:, author:) with full TypeScript interfaces and type guards.

## 1.1.0 (2025-09-26)

### Features

- add cache browser service and utilities ([b69fc963](https://github.com/Mearman/Academic-Explorer/commit/b69fc963))

  Add CacheBrowserService for managing cached entity data with statistics, filtering, and search functionality.

## 1.0.0 (2025-09-26)

### Features

- initial release as independent package in monorepo structure

  Extracted from shared-utils with core utilities for Academic Explorer project including environment detection, cache management, and static data generation.