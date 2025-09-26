# Academic Explorer Web

React SPA for exploring academic literature through interactive knowledge graphs. Search papers, authors, journals, and institutions using the OpenAlex API and visualize their connections.

## Features

- Interactive network graphs with XYFlow
- Entity-centric routing for works, authors, sources, institutions
- Multi-tier caching (memory, localStorage, IndexedDB)
- Real-time search with auto-detection of DOIs, ORCIDs
- Progressive data loading with background workers

## Development

```bash
pnpm dev          # Start development server
pnpm test         # Run tests
pnpm build        # Build for production
pnpm typecheck    # TypeScript checking
pnpm lint         # ESLint
```

Built with React 19, Vite, TanStack Router, Zustand, and Mantine UI.