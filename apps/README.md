# Apps

This directory contains the main applications for the Academic Explorer monorepo.

## Applications

- **[cli](cli/README.md)** - Command-line interface for OpenAlex data access and cache management
- **[web](web/README.md)** - React SPA for interactive OpenAlex API exploration with visualization

## Package Dependencies

Both apps depend on shared packages in `../packages/`:
- `@academic-explorer/client` - OpenAlex API client
- `@academic-explorer/types` - Shared type definitions
- `@academic-explorer/ui` - UI components (web only)
- `@academic-explorer/utils` - Common utilities

## Development

Run `pnpm dev` from the web app directory or `pnpm cli` for the CLI tool.