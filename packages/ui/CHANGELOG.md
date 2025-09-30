# Changelog

All notable changes to the `@academic-explorer/ui` package (formerly `@academic-explorer/ui-components`) will be documented in this file.

This package follows independent versioning from the monorepo.

## 1.3.0 (2025-09-30)

This version marks the transition from monorepo fixed versioning (9.x.x) to independent package versioning. No functional changes were introduced in this release.

## 1.2.3 (2025-09-30)

### Fixes

- **ui-components:** allow tests to pass when no test files exist ([c1614023](https://github.com/Mearman/Academic-Explorer/commit/c1614023522142ca823ee7b002d10e665b3d6429))

## 1.2.2 (2025-09-30)

### Fixes

- **ui-components:** resolve duplicate vitest project names ([0c95c9ea](https://github.com/Mearman/Academic-Explorer/commit/0c95c9ea815612cfc68674e7fb48daef88efc177))

## 1.2.1 (2025-09-30)

### Fixes

- **monorepo:** resolve circular dependencies and task hanging issues ([06466e9c](https://github.com/Mearman/Academic-Explorer/commit/06466e9c1e08ff0095b61bf0eaeeb628814a2ac1))

## 1.2.0 (2025-09-27)

### Features

- **ui-components:** add minimal eslint configuration ([e27a6f5f](https://github.com/Mearman/Academic-Explorer/commit/e27a6f5f5c7563dab981cc970b1447dcfe681a4a))

### Performance

- **config:** optimize eslint configuration for stability ([9de96126](https://github.com/Mearman/Academic-Explorer/commit/9de96126f03dd3fd9a16087ca572bd516c6fb16f))

## 1.1.2 (2025-09-26)

### Fixes

- **ui:** restore composite project configuration for typecheck compatibility ([e09ee505](https://github.com/Mearman/Academic-Explorer/commit/e09ee505fcd408b9a390c1a75e0be946c8f4660d))

## 1.1.1 (2025-09-26)

### Fixes

- **ui:** resolve typescript compilation and lint hanging issues ([9b1b949d](https://github.com/Mearman/Academic-Explorer/commit/9b1b949d05d7ca610518af329be70c5f0ba8c188))

## 1.1.0 (2025-09-26)

### Features

- **style:** reintroduce Vanilla Extract for CSS-in-TS styling ([a38d1213](https://github.com/Mearman/Academic-Explorer/commit/a38d121310f894971ff2eb1ab4e707ee686e12ba))

## 1.0.1 (2025-09-26)

### Fixes

- **config:** resolve TanStack Router and vite-plugin-dts issues ([4451d378](https://github.com/Mearman/Academic-Explorer/commit/4451d378cfbf9d6575543e29e38279e8795c67aa))
- **ui:** revert vite-plugin-dts import to default path ([36904a5d](https://github.com/Mearman/Academic-Explorer/commit/36904a5d5a2d78c5419d023b6c89b49680d813d4))
- **deps:** resolve storybook version conflicts and react component typing issues ([96815d7d](https://github.com/Mearman/Academic-Explorer/commit/96815d7d719553acb7acf5141f19af4963124bf7))
- resolve nx task configuration, typescript errors, and react component issues ([a954d719](https://github.com/Mearman/Academic-Explorer/commit/a954d71924b761b261e095a6fd90759833cdb5e6))

### Performance

- optimize TypeScript compilation and CI performance ([decd092e](https://github.com/Mearman/Academic-Explorer/commit/decd092e6e5ed0e8af85212f45ae56edc652e1dd))

## 1.0.0 (2025-09-26)

### Features

- **monorepo:** add apps and packages structure ([79961238](https://github.com/Mearman/Academic-Explorer/commit/79961238e599240411dee684c9d126350cce2e09))

### Fixes

- **lint:** resolve major linting violations across monorepo ([dabe58f4](https://github.com/Mearman/Academic-Explorer/commit/dabe58f447a9ad3ca947f6e64bb3361133999fab))

---

**Note:** This package was renamed from `@academic-explorer/ui-components` to `@academic-explorer/ui` during monorepo restructuring. All historical commits reference the original `packages/ui-components/` path.