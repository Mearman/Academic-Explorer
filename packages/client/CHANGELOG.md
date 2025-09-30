## 9.0.1 (2025-09-30)

This was a version bump only for client to align it with other projects, there were no code changes.

# 9.0.0 (2025-09-30)

### 🚀 Features

- **openalex-client:** update disk writer for unified hex encoding ([8cd158d7](https://github.com/Mearman/Academic-Explorer/commit/8cd158d7))
- **openalex-client:** enhance caching and api reliability ([c3584278](https://github.com/Mearman/Academic-Explorer/commit/c3584278))
- **openalex-client:** update typescript module resolution to bundler ([6e04515c](https://github.com/Mearman/Academic-Explorer/commit/6e04515c))
- **config:** implement scoped test dependencies across all projects ([17e80743](https://github.com/Mearman/Academic-Explorer/commit/17e80743))
- **client:** add static cache implementation for GitHub Pages ([0a5baf51](https://github.com/Mearman/Academic-Explorer/commit/0a5baf51))
- **client:** add browser compatibility for disk caching ([d4d63c9f](https://github.com/Mearman/Academic-Explorer/commit/d4d63c9f))
- **client:** integrate API interceptor with HTTP client for disk caching ([9d166ad0](https://github.com/Mearman/Academic-Explorer/commit/9d166ad0))
- **client:** integrate static data provider with multi-tier caching ([b6e901e0](https://github.com/Mearman/Academic-Explorer/commit/b6e901e0))
- **client:** implement disk cache writer for development static data ([529370ce](https://github.com/Mearman/Academic-Explorer/commit/529370ce))
- **client:** add api request/response interceptor for development caching ([2165d7dc](https://github.com/Mearman/Academic-Explorer/commit/2165d7dc))
- **client:** add getText alias method to TextAnalysisApi ([953d4025](https://github.com/Mearman/Academic-Explorer/commit/953d4025))
- **client:** add search alias methods for API consistency ([da88b69b](https://github.com/Mearman/Academic-Explorer/commit/da88b69b))
- **client:** enhance TopicsApi with alias methods and filter processing ([be0b22c2](https://github.com/Mearman/Academic-Explorer/commit/be0b22c2))
- **client:** enhance PublishersApi with alias methods and filter processing ([d52b939f](https://github.com/Mearman/Academic-Explorer/commit/d52b939f))
- **client:** enhance KeywordsApi filter object processing ([7e06912b](https://github.com/Mearman/Academic-Explorer/commit/7e06912b))
- **apis:** achieve 90.9% test coverage with major API consistency fixes ([46954356](https://github.com/Mearman/Academic-Explorer/commit/46954356))
- **client:** integrate TextAnalysisApi and ConceptsApi into main client exports ([9ea447c5](https://github.com/Mearman/Academic-Explorer/commit/9ea447c5))
- **client:** enhance autocomplete utilities with comprehensive entity support ([3d832939](https://github.com/Mearman/Academic-Explorer/commit/3d832939))
- **client:** implement comprehensive Concepts API with Wikidata support ([4e836e0c](https://github.com/Mearman/Academic-Explorer/commit/4e836e0c))
- **client:** enhance entity APIs with comprehensive external ID support ([84f63355](https://github.com/Mearman/Academic-Explorer/commit/84f63355))
- **client:** add comprehensive external ID validation utilities ([1882c32d](https://github.com/Mearman/Academic-Explorer/commit/1882c32d))
- **client:** add comprehensive text analysis API entities ([283a2ff9](https://github.com/Mearman/Academic-Explorer/commit/283a2ff9))
- **client:** add deprecated concepts API entity for backward compatibility ([5cb21503](https://github.com/Mearman/Academic-Explorer/commit/5cb21503))
- **client:** add autocomplete methods to all entity APIs ([3b8456a6](https://github.com/Mearman/Academic-Explorer/commit/3b8456a6))
- **client:** add ConceptsFilters interface and extend EntityFilters union ([2799f62b](https://github.com/Mearman/Academic-Explorer/commit/2799f62b))
- **client:** add shared FilterBuilder utility class ([5bae27a3](https://github.com/Mearman/Academic-Explorer/commit/5bae27a3))
- **client:** add comprehensive OpenAlex API test generator ([524a344d](https://github.com/Mearman/Academic-Explorer/commit/524a344d))

### 🩹 Fixes

- **ci:** resolve CI pipeline failures ([799a293b](https://github.com/Mearman/Academic-Explorer/commit/799a293b))
- **client:** update remaining works.unit.test.ts sort parameters ([30f150cb](https://github.com/Mearman/Academic-Explorer/commit/30f150cb))
- **client:** update unit tests to match API behavior changes ([903405fe](https://github.com/Mearman/Academic-Explorer/commit/903405fe))
- **client:** remove unused catch parameter entirely in id-resolver ([d984af30](https://github.com/Mearman/Academic-Explorer/commit/d984af30))
- **client:** resolve final unused parameter violation in id-resolver ([a8825686](https://github.com/Mearman/Academic-Explorer/commit/a8825686))
- **client:** resolve unused parameter violations in id-resolver and filter-builder ([f925cfab](https://github.com/Mearman/Academic-Explorer/commit/f925cfab))
- **client:** resolve final three unused parameter violations in filter-builder ([7a1f3402](https://github.com/Mearman/Academic-Explorer/commit/7a1f3402))
- **client:** resolve absolutely final TypeScript violations - unused parameters and catch typing ([afa5d069](https://github.com/Mearman/Academic-Explorer/commit/afa5d069))
- **client:** resolve final three catch parameter any type violations in static-data-provider ([9023a18d](https://github.com/Mearman/Academic-Explorer/commit/9023a18d))
- **client:** resolve remaining catch parameter any type violations in static-data-provider ([1a6f7e0f](https://github.com/Mearman/Academic-Explorer/commit/1a6f7e0f))
- **client:** resolve JSON.parse and catch parameter any type violations in static-data-provider ([edc82daf](https://github.com/Mearman/Academic-Explorer/commit/edc82daf))
- **client:** resolve final unused import and catch parameter type violations ([cd476ed3](https://github.com/Mearman/Academic-Explorer/commit/cd476ed3))
- **client:** replace Window type with inline interface to avoid DOM dependency ([db77ec84](https://github.com/Mearman/Academic-Explorer/commit/db77ec84))
- **client:** resolve final globalThis.window any type violation ([2784b639](https://github.com/Mearman/Academic-Explorer/commit/2784b639))
- **client:** resolve globalThis any type and unused variable violations ([231b24f8](https://github.com/Mearman/Academic-Explorer/commit/231b24f8))
- **client:** resolve all remaining any type violations in funders, institutions, and client ([6dd8aaf6](https://github.com/Mearman/Academic-Explorer/commit/6dd8aaf6))
- **client:** resolve all remaining catch parameter any type violations ([fe516f4c](https://github.com/Mearman/Academic-Explorer/commit/fe516f4c))
- **client:** resolve unused variable and catch parameter type violations ([7dd99ea3](https://github.com/Mearman/Academic-Explorer/commit/7dd99ea3))
- **client:** resolve final catch parameter any type violations ([7e72fe2d](https://github.com/Mearman/Academic-Explorer/commit/7e72fe2d))
- **client:** remove unused catch parameter completely ([55e9470e](https://github.com/Mearman/Academic-Explorer/commit/55e9470e))
- **client:** resolve final TypeScript violations in github-pages-reader ([7cb9f94f](https://github.com/Mearman/Academic-Explorer/commit/7cb9f94f))
- **client:** resolve TypeScript strict type violations in disk-writer ([5124d7b5](https://github.com/Mearman/Academic-Explorer/commit/5124d7b5))
- **client:** resolve final object destructuring violations ([8ae953b9](https://github.com/Mearman/Academic-Explorer/commit/8ae953b9))
- **client:** resolve eslint configuration and test file exclusions ([c3a82e43](https://github.com/Mearman/Academic-Explorer/commit/c3a82e43))
- **client:** resolve empty interface eslint violation ([ca973d7e](https://github.com/Mearman/Academic-Explorer/commit/ca973d7e))
- **client:** resolve eslint violations in entity files ([4d77c7a7](https://github.com/Mearman/Academic-Explorer/commit/4d77c7a7))
- **config:** improve eslint configuration and ci lint tolerance ([8f0c703d](https://github.com/Mearman/Academic-Explorer/commit/8f0c703d))
- **web,client:** resolve critical eslint issues blocking ci ([eb18bb74](https://github.com/Mearman/Academic-Explorer/commit/eb18bb74))
- **monorepo:** resolve circular dependencies and task hanging issues ([06466e9c](https://github.com/Mearman/Academic-Explorer/commit/06466e9c))
- **client:** update cache implementations for raw api response storage ([c83ae158](https://github.com/Mearman/Academic-Explorer/commit/c83ae158))
- **client:** add type assertions for sort parameters ([d7814c3b](https://github.com/Mearman/Academic-Explorer/commit/d7814c3b))
- **client,web:** resolve TypeScript errors for test regeneration ([5afb0326](https://github.com/Mearman/Academic-Explorer/commit/5afb0326))
- **test-generator:** resolve major test generation issues to achieve 87% test coverage ([f009bc19](https://github.com/Mearman/Academic-Explorer/commit/f009bc19))
- **test-generator:** improve route categorization logic ([a39dc8e4](https://github.com/Mearman/Academic-Explorer/commit/a39dc8e4))

## 8.3.0 (2025-09-27)

This was a version bump only for client to align it with other projects, there were no code changes.

## 1.2.1 (2025-09-27)

### 🩹 Fixes

- **client:** disable project-aware TypeScript rules for markdown code blocks ([a7dd0f65](https://github.com/Mearman/Academic-Explorer/commit/a7dd0f65))

## 1.2.0 (2025-09-26)

### 🚀 Features

- **ci:** achieve perfect CI pipeline with zero warnings and issues ([333e68cd](https://github.com/Mearman/Academic-Explorer/commit/333e68cd))

### 🧱 Updated Dependencies

- Updated utils to 8.3.0

### ❤️ Thank You

- Joseph Mearman

## 1.1.1 (2025-09-26)

### Fixes

- **test:** include error object in sampling logger calls to match test expectations ([f2a71f6c](https://github.com/Mearman/Academic-Explorer/commit/f2a71f6c))
- resolve all remaining CI pipeline ESLint and TypeScript issues ([f2437ebc](https://github.com/Mearman/Academic-Explorer/commit/f2437ebc))
- resolve CI pipeline test failures and lint issues ([ed0f4008](https://github.com/Mearman/Academic-Explorer/commit/ed0f4008))
- **ci:** resolve all ESLint hanging and build issues ([564eb14a](https://github.com/Mearman/Academic-Explorer/commit/564eb14a))
- **ci:** resolve test pipeline hanging issues ([0f7ca1f0](https://github.com/Mearman/Academic-Explorer/commit/0f7ca1f0))

### 🧱 Updated Dependencies

- Updated utils to 8.2.1

### Thank You

- Joseph Mearman

## 1.1.0 (2025-09-26)

### Features

- **monorepo:** add apps and packages structure ([79961238](https://github.com/Mearman/Academic-Explorer/commit/79961238))

### Fixes

- **tests:** fix client package test failures by properly mocking logger ([dcf9d0eb](https://github.com/Mearman/Academic-Explorer/commit/dcf9d0eb))
- **lint:** complete type guard and union type fixes ([84b883ed](https://github.com/Mearman/Academic-Explorer/commit/84b883ed))
- **types:** resolve union types and console statement issues ([11485ebe](https://github.com/Mearman/Academic-Explorer/commit/11485ebe))
- **client:** correct logger import path for typecheck ([1926b5e4](https://github.com/Mearman/Academic-Explorer/commit/1926b5e4))
- **monorepo:** resolve remaining ci issues for complete pipeline ([297acfb3](https://github.com/Mearman/Academic-Explorer/commit/297acfb3))
- **config:** correct vitest configuration import paths ([1c085b6e](https://github.com/Mearman/Academic-Explorer/commit/1c085b6e))
- **config:** update project configurations for build stability ([a5546d2e](https://github.com/Mearman/Academic-Explorer/commit/a5546d2e))
- resolve TypeScript compilation errors ([bcdfc20d](https://github.com/Mearman/Academic-Explorer/commit/bcdfc20d))
- restore essential client exports with stub implementations ([5628d0d9](https://github.com/Mearman/Academic-Explorer/commit/5628d0d9))
- resolve React app mounting and EntityDetectionService integration ([41f1e856](https://github.com/Mearman/Academic-Explorer/commit/41f1e856))
- resolve nx task configuration, typescript errors, and react component issues ([a954d719](https://github.com/Mearman/Academic-Explorer/commit/a954d719))
- **lint:** resolve remaining lint violations across monorepo ([c824e599](https://github.com/Mearman/Academic-Explorer/commit/c824e599))
- **client:** resolve TypeScript null safety issues in statistics ([82855fe0](https://github.com/Mearman/Academic-Explorer/commit/82855fe0))
- **lint:** resolve major linting violations across monorepo ([dabe58f4](https://github.com/Mearman/Academic-Explorer/commit/dabe58f4))

### Performance

- optimize TypeScript compilation and CI performance ([decd092e](https://github.com/Mearman/Academic-Explorer/commit/decd092e))

### 🧱 Updated Dependencies

- Updated utils to 8.2.0

### Thank You

- Joseph Mearman