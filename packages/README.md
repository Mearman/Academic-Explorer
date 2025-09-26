# Packages

Shared packages for the Academic Explorer monorepo. These packages provide reusable functionality across the main web application and CLI tool.

## Package Structure

- **[`client`](client/README.md)** - TypeScript client for OpenAlex API with entity support and utilities
- **[`graph`](graph/README.md)** - Core graph data structures, types, and services for Academic Explorer
- **[`simulation`](simulation/README.md)** - Force-directed graph simulation engine using D3 and web workers
- **[`ui`](ui/README.md)** - Reusable UI components built with Mantine and XYFlow
- **[`utils`](utils/README.md)** - Shared utilities including logging, caching, storage, and type guards

## Dependencies

The packages form a dependency hierarchy: `utils` provides foundations for `graph` and `client`, which support the higher-level `simulation` and `ui` packages. All packages are consumed by the main web application and CLI tool.

## Development

Each package can be built independently with `pnpm build` or watched with `pnpm dev`. Use workspace filters for package-specific operations: `pnpm --filter @academic-explorer/graph build`.