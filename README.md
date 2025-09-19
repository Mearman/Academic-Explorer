# Academic Explorer

Academic Explorer is a client-side web application that provides access to academic literature data through the [OpenAlex API](https://docs.openalex.org/). The application allows users to search, browse, and visualize academic works, authors, institutions, and other scholarly entities. Built as a single-page application using React and Vite, it operates entirely in the browser without requiring a backend server.

[OpenAlex](https://openalex.org/) is a free and open catalog of the world's scholarly papers, authors, institutions, and more.

**[View the live application ->](https://mearman.github.io/Academic-Explorer/#/authors/A5017898742)**

## Features

- **OpenAlex API Integration**: Access to works, authors, institutions, topics, publishers, funders, and concepts
- **Multi-Layer Caching**: Memory -> IndexedDB -> localStorage -> API caching with year-based TTL
- **Entity-Centric Routing**: Direct entity access via OpenAlex IDs, DOIs, ORCIDs, and external identifiers
- **Data Visualizations**: Force-directed graphs with deterministic layouts
- **Progressive Web App**: Installable with offline capabilities
- **Accessibility Testing**: WCAG2AA standards with automated testing

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Technology Stack

- **Frontend**: React 19 + Vite + TanStack Router
- **Styling**: Vanilla Extract CSS-in-JS + Mantine Core
- **State Management**: Zustand + Immer
- **Storage**: IndexedDB (idb) + localStorage fallback
- **Testing**: Vitest + MSW + Playwright
- **Build**: Nx for caching and orchestration

## Development Commands

### Primary Commands
```bash
pnpm dev              # Development server
pnpm typecheck        # TypeScript checking
pnpm build            # Production build
pnpm test             # All tests with coverage
pnpm lint             # ESLint checking
pnpm verify           # Full quality pipeline
```

### Testing
```bash
pnpm test             # All tests (unit + component)
pnpm test:ui          # Vitest UI interface
pnpm test:unit        # Unit tests only
pnpm test:component   # Component tests only
pnpm test:integration # Integration tests
pnpm test:e2e         # End-to-end tests
pnpm test:a11y        # Accessibility tests
```

### Code Quality
```bash
pnpm knip             # Find unused code
pnpm licenses:check   # License compliance
pnpm clean            # Clean build artifacts
```

## Entity Navigation

Access entities directly via URL patterns:

- **Direct Access**: `/authors/A123456789`
- **Generic Route**: `/entity/authors/A123456789`
- **HTTPS URLs**: `/https/openalex.org/A123456789`
- **DOIs**: `/doi/10.1038/nature.2023.12345`
- **Auto-detection**: `/$bareId` for automatic entity type detection

## Architecture

### Multi-Layer Caching
Request flow: Memory -> localStorage -> IndexedDB -> Static Data Cache -> OpenAlex API

### Entity Types
- **W**: Works (papers, articles)
- **A**: Authors (researchers)
- **S**: Sources (journals, repositories)
- **I**: Institutions (universities, organizations)
- **P**: Publishers
- **F**: Funders
- **T**: Topics (research areas)
- **C**: Concepts (deprecated, use Topics)

### Component Structure
Following [Atomic Design](https://atomicdesign.bradfrost.com/) methodology:
```
src/components/
├── atoms/           # Basic UI elements
├── molecules/       # Component combinations
├── organisms/       # Complex components
├── templates/       # Page layouts
└── entity-displays/ # Entity-specific presentations
```

### Storage System
The application uses a hybrid storage approach with automatic fallback:

- **Primary**: localStorage for fast access to frequently used data
- **Secondary**: IndexedDB via `idb` library for bulk storage when localStorage is full
- **Static Data Cache**: Pre-computed query results and entities served from `/data/openalex/`
- **Fallback**: In-memory storage for testing environments
- **State Persistence**: Zustand stores with persistence middleware for application state
- **Cache Management**: Multi-layer caching with TTL (time-to-live) and invalidation strategies

### Force Simulation System
Graph visualizations use D3 force simulation with deterministic behavior:

- **Web Worker Execution**: Force calculations run in background workers to prevent UI blocking
- **Animated Streaming**: Real-time position updates streamed from worker to main thread
- **Deterministic Layout**: Fixed random seeds ensure consistent graph positioning across sessions
- **Custom Forces**: Specialized force calculations for academic entity relationships
- **Performance Scaling**: Dynamic configuration based on graph size (nodes/edges)

### Request System
API communication follows a structured pipeline:

- **Rate Limiting**: Built-in rate limiting for OpenAlex API compliance
- **Query Building**: Structured query construction with field selection
- **Response Caching**: Multi-layer response caching with entity-specific TTL
- **Error Handling**: Structured error handling with retry logic
- **Background Processing**: API calls executed in web workers for large operations

### Worker System
Web Workers handle computationally intensive operations:

- **Data Fetching Worker**: Handles OpenAlex API calls for graph expansion
- **Force Animation Worker**: Runs D3 force simulations for graph layout
- **Event Bridge**: Cross-context communication system between main thread and workers
- **Message Passing**: Structured message protocols for worker communication
- **Progress Reporting**: Real-time progress updates for long-running operations

### Event System
Centralized event management for cross-component communication:

- **Event Bridge**: Central communication hub for main thread and worker contexts
- **Graph Events**: Node addition, removal, selection, and layout events
- **Entity Events**: Data loading, caching, and update events
- **Worker Events**: Background task progress and completion events
- **Cross-Context**: Message serialization for communication between execution contexts

### Hook System
Custom React hooks provide reusable functionality:

- **Entity Data Hooks**: `use-raw-entity-data` for OpenAlex entity fetching with caching
- **Graph Hooks**: `use-graph-data`, `use-graph-persistence` for graph state management
- **Simulation Hooks**: `use-animated-force-simulation` for D3 force simulation integration
- **Worker Hooks**: `use-data-fetching-worker` for background API operations
- **Utility Hooks**: `use-context-menu`, `use-document-title`, `use-theme-colors` for UI functionality

## Memory Considerations

Tests run sequentially due to memory constraints. Parallel execution causes out-of-memory errors.

## Contributing

1. Check TypeScript compliance: `pnpm typecheck`
2. Run full test suite: `pnpm test`
3. Verify build: `pnpm build`
4. Check linting: `pnpm lint`
5. Run complete verification: `pnpm verify`

## Deployment

Built for GitHub Pages with hash-based routing. Deploy via:

```bash
pnpm build
# Deploy dist/ folder to GitHub Pages
```

---

Part of PhD research on cultural heritage data preservation and citizen science engagement at Bangor University, Wales.
