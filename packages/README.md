# Packages

Shared packages for the Academic Explorer monorepo. These packages provide reusable functionality across the main web application and CLI tool.

## Package Structure

- **[`client`](client/README.md)** - TypeScript client for OpenAlex API with entity support and utilities
- **[`types`](types/README.md)** - Shared type definitions for entities, relationships, and data structures
- **[`ui`](ui/README.md)** - Reusable UI components built with Mantine
- **[`utils`](utils/README.md)** - Shared utilities including logging, caching, storage, and type guards

## Dependencies

The packages form a dependency hierarchy: `utils` provides foundations for `types` and `client`, which support the higher-level `ui` package. All packages are consumed by the main web application and CLI tool.

## Development

Each package can be built independently with `pnpm build` or watched with `pnpm dev`. Use workspace filters for package-specific operations: `pnpm --filter @academic-explorer/graph build`.