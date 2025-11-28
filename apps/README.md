# Apps

This directory contains the main applications for the BibGraph monorepo.

## Applications

- **[cli](cli/README.md)** - Command-line interface for OpenAlex data access and cache management
- **[web](web/README.md)** - React SPA for interactive OpenAlex API exploration with visualization

## Package Dependencies

Both apps depend on shared packages in `../packages/`:
- `@bibgraph/client` - OpenAlex API client
- `@bibgraph/utils` - Common utilities
- `@bibgraph/graph` - Graph data structures (web only)
- `@bibgraph/simulation` - Force simulation logic (web only)

## Development

Run `pnpm dev` from the web app directory or `pnpm cli` for the CLI tool.