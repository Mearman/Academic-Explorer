# Changelog

This file tracks changes to the `@academic-explorer/client` package using independent versioning.

## 1.28.0 (2025-09-30)

### Features

- update disk writer for unified hex encoding ([8cd158d7](https://github.com/Mearman/Academic-Explorer/commit/8cd158d7))
- enhance caching and api reliability ([c3584278](https://github.com/Mearman/Academic-Explorer/commit/c3584278))

### Fixes

- resolve CI pipeline failures ([799a293b](https://github.com/Mearman/Academic-Explorer/commit/799a293b))

## 1.27.0 (2025-09-28)

### Features

- update typescript module resolution to bundler ([6e04515c](https://github.com/Mearman/Academic-Explorer/commit/6e04515c))

### Fixes

- update remaining works.unit.test.ts sort parameters ([30f150cb](https://github.com/Mearman/Academic-Explorer/commit/30f150cb))
- update unit tests to match API behavior changes ([903405fe](https://github.com/Mearman/Academic-Explorer/commit/903405fe))
- remove unused catch parameter entirely in id-resolver ([d984af30](https://github.com/Mearman/Academic-Explorer/commit/d984af30))
- resolve final unused parameter violation in id-resolver ([a8825686](https://github.com/Mearman/Academic-Explorer/commit/a8825686))
- resolve unused parameter violations in id-resolver and filter-builder ([f925cfab](https://github.com/Mearman/Academic-Explorer/commit/f925cfab))
- resolve final three unused parameter violations in filter-builder ([7a1f3402](https://github.com/Mearman/Academic-Explorer/commit/7a1f3402))
- resolve absolutely final TypeScript violations - unused parameters and catch typing ([afa5d069](https://github.com/Mearman/Academic-Explorer/commit/afa5d069))
- resolve final three catch parameter any type violations in static-data-provider ([9023a18d](https://github.com/Mearman/Academic-Explorer/commit/9023a18d))
- resolve remaining catch parameter any type violations in static-data-provider ([1a6f7e0f](https://github.com/Mearman/Academic-Explorer/commit/1a6f7e0f))
- resolve JSON.parse and catch parameter any type violations in static-data-provider ([edc82daf](https://github.com/Mearman/Academic-Explorer/commit/edc82daf))
- resolve final unused import and catch parameter type violations ([cd476ed3](https://github.com/Mearman/Academic-Explorer/commit/cd476ed3))
- replace Window type with inline interface to avoid DOM dependency ([db77ec84](https://github.com/Mearman/Academic-Explorer/commit/db77ec84))
- resolve final globalThis.window any type violation ([2784b639](https://github.com/Mearman/Academic-Explorer/commit/2784b639))
- resolve globalThis any type and unused variable violations ([231b24f8](https://github.com/Mearman/Academic-Explorer/commit/231b24f8))
- resolve all remaining any type violations in funders, institutions, and client ([6dd8aaf6](https://github.com/Mearman/Academic-Explorer/commit/6dd8aaf6))
- resolve all remaining catch parameter any type violations ([fe516f4c](https://github.com/Mearman/Academic-Explorer/commit/fe516f4c))
- resolve unused variable and catch parameter type violations ([7dd99ea3](https://github.com/Mearman/Academic-Explorer/commit/7dd99ea3))
- resolve final catch parameter any type violations ([7e72fe2d](https://github.com/Mearman/Academic-Explorer/commit/7e72fe2d))
- remove unused catch parameter completely ([55e9470e](https://github.com/Mearman/Academic-Explorer/commit/55e9470e))
- resolve final TypeScript violations in github-pages-reader ([7cb9f94f](https://github.com/Mearman/Academic-Explorer/commit/7cb9f94f))
- resolve TypeScript strict type violations in disk-writer ([5124d7b5](https://github.com/Mearman/Academic-Explorer/commit/5124d7b5))
- resolve final object destructuring violations ([8ae953b9](https://github.com/Mearman/Academic-Explorer/commit/8ae953b9))
- resolve eslint configuration and test file exclusions ([c3a82e43](https://github.com/Mearman/Academic-Explorer/commit/c3a82e43))
- resolve empty interface eslint violation ([ca973d7e](https://github.com/Mearman/Academic-Explorer/commit/ca973d7e))
- resolve eslint violations in entity files ([4d77c7a7](https://github.com/Mearman/Academic-Explorer/commit/4d77c7a7))

### Refactoring

- reorganize test files with type-specific naming ([fc924838](https://github.com/Mearman/Academic-Explorer/commit/fc924838))

## 1.26.0 (2025-09-27)

### Features

- add static cache implementation for GitHub Pages ([0a5baf51](https://github.com/Mearman/Academic-Explorer/commit/0a5baf51))

### Fixes

- update cache implementations for raw api response storage ([c83ae158](https://github.com/Mearman/Academic-Explorer/commit/c83ae158))

### Tests

- add cache integration and performance tests ([3e037f37](https://github.com/Mearman/Academic-Explorer/commit/3e037f37))

## 1.25.0 (2025-09-27)

### Features

- add browser compatibility for disk caching ([d4d63c9f](https://github.com/Mearman/Academic-Explorer/commit/d4d63c9f))

### Fixes

- add type assertions for sort parameters ([d7814c3b](https://github.com/Mearman/Academic-Explorer/commit/d7814c3b))

## 1.24.0 (2025-09-27)

### Features

- integrate API interceptor with HTTP client for disk caching ([9d166ad0](https://github.com/Mearman/Academic-Explorer/commit/9d166ad0))

## 1.23.0 (2025-09-27)

### Features

- integrate static data provider with multi-tier caching ([b6e901e0](https://github.com/Mearman/Academic-Explorer/commit/b6e901e0))

## 1.22.0 (2025-09-27)

### Features

- implement disk cache writer for development static data ([529370ce](https://github.com/Mearman/Academic-Explorer/commit/529370ce))

## 1.21.0 (2025-09-27)

### Features

- add api request/response interceptor for development caching ([2165d7dc](https://github.com/Mearman/Academic-Explorer/commit/2165d7dc))

### Fixes

- resolve TypeScript errors for test regeneration ([5afb0326](https://github.com/Mearman/Academic-Explorer/commit/5afb0326))

### Tests

- regenerate comprehensive API route tests with fixes ([e20bb251](https://github.com/Mearman/Academic-Explorer/commit/e20bb251))
- fix WorksApi buildFilterString test to use utility function ([cc4d42db](https://github.com/Mearman/Academic-Explorer/commit/cc4d42db))
- fix TextAnalysisApi test generation and mock configuration ([3af26ffa](https://github.com/Mearman/Academic-Explorer/commit/3af26ffa))

### Refactoring

- improve entity APIs with enhanced search options and type safety ([49a63700](https://github.com/Mearman/Academic-Explorer/commit/49a63700))

## 1.20.0 (2025-09-27)

### Features

- add getText alias method to TextAnalysisApi ([953d4025](https://github.com/Mearman/Academic-Explorer/commit/953d4025))

## 1.19.0 (2025-09-27)

### Features

- add search alias methods for API consistency ([da88b69b](https://github.com/Mearman/Academic-Explorer/commit/da88b69b))

### Documentation

- update generated test timestamps ([0eac21b0](https://github.com/Mearman/Academic-Explorer/commit/0eac21b0))

## 1.18.0 (2025-09-27)

### Features

- enhance TopicsApi with alias methods and filter processing ([be0b22c2](https://github.com/Mearman/Academic-Explorer/commit/be0b22c2))

## 1.17.0 (2025-09-27)

### Features

- enhance PublishersApi with alias methods and filter processing ([d52b939f](https://github.com/Mearman/Academic-Explorer/commit/d52b939f))

## 1.16.0 (2025-09-27)

### Features

- enhance KeywordsApi filter object processing ([7e06912b](https://github.com/Mearman/Academic-Explorer/commit/7e06912b))

## 1.15.0 (2025-09-27)

### Features

- achieve 90.9% test coverage with major API consistency fixes ([46954356](https://github.com/Mearman/Academic-Explorer/commit/46954356))

### Fixes

- resolve major test generation issues to achieve 87% test coverage ([f009bc19](https://github.com/Mearman/Academic-Explorer/commit/f009bc19))

### Documentation

- add comprehensive documentation and examples for external IDs ([9eed9451](https://github.com/Mearman/Academic-Explorer/commit/9eed9451))

## 1.14.0 (2025-09-27)

### Features

- integrate TextAnalysisApi and ConceptsApi into main client exports ([9ea447c5](https://github.com/Mearman/Academic-Explorer/commit/9ea447c5))

## 1.13.0 (2025-09-27)

### Features

- enhance autocomplete utilities with comprehensive entity support ([3d832939](https://github.com/Mearman/Academic-Explorer/commit/3d832939))

## 1.12.0 (2025-09-27)

### Features

- implement comprehensive Concepts API with Wikidata support ([4e836e0c](https://github.com/Mearman/Academic-Explorer/commit/4e836e0c))

## 1.11.0 (2025-09-27)

### Features

- enhance entity APIs with comprehensive external ID support ([84f63355](https://github.com/Mearman/Academic-Explorer/commit/84f63355))

## 1.10.0 (2025-09-27)

### Features

- add comprehensive external ID validation utilities ([1882c32d](https://github.com/Mearman/Academic-Explorer/commit/1882c32d))

### Tests

- update generated tests for new API entities ([48e4209d](https://github.com/Mearman/Academic-Explorer/commit/48e4209d))

## 1.9.0 (2025-09-27)

### Features

- add comprehensive text analysis API entities ([283a2ff9](https://github.com/Mearman/Academic-Explorer/commit/283a2ff9))

## 1.8.0 (2025-09-27)

### Features

- add deprecated concepts API entity for backward compatibility ([5cb21503](https://github.com/Mearman/Academic-Explorer/commit/5cb21503))

## 1.7.0 (2025-09-27)

### Features

- add autocomplete methods to all entity APIs ([3b8456a6](https://github.com/Mearman/Academic-Explorer/commit/3b8456a6))

### Refactoring

- restructure autocomplete API into base class architecture ([cd6a77fa](https://github.com/Mearman/Academic-Explorer/commit/cd6a77fa))

## 1.6.0 (2025-09-27)

### Features

- add ConceptsFilters interface and extend EntityFilters union ([2799f62b](https://github.com/Mearman/Academic-Explorer/commit/2799f62b))

### Tests

- regenerate comprehensive API route tests ([8e48ff13](https://github.com/Mearman/Academic-Explorer/commit/8e48ff13))
- update unit tests for standardized filter handling ([5c5987c0](https://github.com/Mearman/Academic-Explorer/commit/5c5987c0))

### Fixes

- improve route categorization logic ([a39dc8e4](https://github.com/Mearman/Academic-Explorer/commit/a39dc8e4))

### Refactoring

- standardize filter handling across entity APIs ([2e6f3b8f](https://github.com/Mearman/Academic-Explorer/commit/2e6f3b8f))

## 1.5.0 (2025-09-27)

### Features

- add shared FilterBuilder utility class ([5bae27a3](https://github.com/Mearman/Academic-Explorer/commit/5bae27a3))

### Tests

- add comprehensive generated tests for all OpenAlex API routes ([b124c497](https://github.com/Mearman/Academic-Explorer/commit/b124c497))

## 1.4.0 (2025-09-27)

### Features

- add comprehensive OpenAlex API test generator ([524a344d](https://github.com/Mearman/Academic-Explorer/commit/524a344d))

## 1.3.0 (2025-09-26)

### Features

- achieve perfect CI pipeline with zero warnings and issues ([333e68cd](https://github.com/Mearman/Academic-Explorer/commit/333e68cd))

## 1.2.1 (2025-09-27)

### Fixes

- disable project-aware TypeScript rules for markdown code blocks ([a7dd0f65](https://github.com/Mearman/Academic-Explorer/commit/a7dd0f65))

### Documentation

- fix underscore prefixed variables in markdown code examples ([04b8b478](https://github.com/Mearman/Academic-Explorer/commit/04b8b478))
- resolve lint issues in client package README files ([d58d1aac](https://github.com/Mearman/Academic-Explorer/commit/d58d1aac))
- resolve lint issues in package README files ([f7139df2](https://github.com/Mearman/Academic-Explorer/commit/f7139df2))
- update documentation and improve project configuration ([b5e5d031](https://github.com/Mearman/Academic-Explorer/commit/b5e5d031))

### Refactoring

- remove emojis from conventional commit titles and changelogs ([4c67add9](https://github.com/Mearman/Academic-Explorer/commit/4c67add9))

## 1.2.0 (2025-09-26)

### Fixes

- include error object in sampling logger calls to match test expectations ([f2a71f6c](https://github.com/Mearman/Academic-Explorer/commit/f2a71f6c))
- resolve all remaining CI pipeline ESLint and TypeScript issues ([f2437ebc](https://github.com/Mearman/Academic-Explorer/commit/f2437ebc))
- resolve CI pipeline test failures and lint issues ([ed0f4008](https://github.com/Mearman/Academic-Explorer/commit/ed0f4008))
- resolve all ESLint hanging and build issues ([564eb14a](https://github.com/Mearman/Academic-Explorer/commit/564eb14a))
- resolve test pipeline hanging issues ([0f7ca1f0](https://github.com/Mearman/Academic-Explorer/commit/0f7ca1f0))

### Tests

- comprehensive CI pipeline validation test ([53e2348c](https://github.com/Mearman/Academic-Explorer/commit/53e2348c))

## 1.1.1 (2025-09-26)

### Fixes

- fix client package test failures by properly mocking logger ([dcf9d0eb](https://github.com/Mearman/Academic-Explorer/commit/dcf9d0eb))
- complete type guard and union type fixes ([84b883ed](https://github.com/Mearman/Academic-Explorer/commit/84b883ed))
- resolve union types and console statement issues ([11485ebe](https://github.com/Mearman/Academic-Explorer/commit/11485ebe))
- correct logger import path for typecheck ([1926b5e4](https://github.com/Mearman/Academic-Explorer/commit/1926b5e4))
- resolve remaining ci issues for complete pipeline ([297acfb3](https://github.com/Mearman/Academic-Explorer/commit/297acfb3))
- correct vitest configuration import paths ([1c085b6e](https://github.com/Mearman/Academic-Explorer/commit/1c085b6e))
- update project configurations for build stability ([a5546d2e](https://github.com/Mearman/Academic-Explorer/commit/a5546d2e))

## 1.1.0 (2025-09-26)

### Features

- add apps and packages structure ([79961238](https://github.com/Mearman/Academic-Explorer/commit/79961238))

### Fixes

- resolve TypeScript compilation errors ([bcdfc20d](https://github.com/Mearman/Academic-Explorer/commit/bcdfc20d))
- restore essential client exports with stub implementations ([5628d0d9](https://github.com/Mearman/Academic-Explorer/commit/5628d0d9))
- resolve React app mounting and EntityDetectionService integration ([41f1e856](https://github.com/Mearman/Academic-Explorer/commit/41f1e856))
- resolve nx task configuration, typescript errors, and react component issues ([a954d719](https://github.com/Mearman/Academic-Explorer/commit/a954d719))
- resolve remaining lint violations across monorepo ([c824e599](https://github.com/Mearman/Academic-Explorer/commit/c824e599))
- resolve TypeScript null safety issues in statistics ([82855fe0](https://github.com/Mearman/Academic-Explorer/commit/82855fe0))
- resolve major linting violations across monorepo ([dabe58f4](https://github.com/Mearman/Academic-Explorer/commit/dabe58f4))

### Performance

- optimize TypeScript compilation and CI performance ([decd092e](https://github.com/Mearman/Academic-Explorer/commit/decd092e))

### Refactoring

- clean up remaining unused files and fix imports ([f4a9f64e](https://github.com/Mearman/Academic-Explorer/commit/f4a9f64e))
- remove unused components and files flagged by knip ([a5046269](https://github.com/Mearman/Academic-Explorer/commit/a5046269))
- remove unused dependencies to fix knip CI failures ([5bf57c40](https://github.com/Mearman/Academic-Explorer/commit/5bf57c40))

### Chores

- remove unused synthetic cache stub implementation ([0fc90c20](https://github.com/Mearman/Academic-Explorer/commit/0fc90c20))

## 1.0.0 (2025-09-24)

Initial release of `@academic-explorer/client` (formerly `@academic-explorer/openalex-client`) as part of monorepo restructuring.

### Features

- TypeScript client for OpenAlex API
- Comprehensive entity support (works, authors, sources, institutions, topics, publishers, funders)
- Multi-tier caching architecture (memory, localStorage, IndexedDB)
- Entity type detection and ID resolution
- Filter building and query utilities
- Autocomplete support for all entity types
- External ID validation (DOI, ORCID, ISSN-L, ROR, Wikidata)
- Test utilities and mock data generators