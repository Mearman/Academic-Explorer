# Apps

This directory contains the main applications for the Academic Explorer monorepo.

## Applications

- **[cli](cli/README.md)** - Command-line interface for OpenAlex data access and cache management
- **[web](web/README.md)** - React SPA for interactive OpenAlex API exploration with visualization

## Package Dependencies

Both apps depend on shared packages in `../packages/`:
- `@academic-explorer/client` - OpenAlex API client
- `@academic-explorer/utils` - Common utilities
- `@academic-explorer/graph` - Graph data structures (web only)
- `@academic-explorer/simulation` - Force simulation logic (web only)

## Development

Run `pnpm dev` from the web app directory or `pnpm cli` for the CLI tool.