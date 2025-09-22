# Academic Explorer

Academic Explorer is a client-side web application that provides access to academic literature data through the [OpenAlex API](https://docs.openalex.org/). The application allows users to search, browse, and visualize academic works, authors, institutions, and other scholarly entities. Built as a single-page application using React and Vite, it operates entirely in the browser without requiring a backend server.

The application features advanced force-directed graph visualizations, comprehensive search capabilities, and real-time data exploration tools.

[OpenAlex](https://openalex.org/) is a free and open catalog of the world's scholarly papers, authors, institutions, and more.

**[View the live application ->](https://mearman.github.io/Academic-Explorer/#/authors/A5017898742)**

## Features

- **OpenAlex API Integration**: Access to works, authors, institutions, topics, publishers, funders, and concepts
- **Synthetic Response Cache**: Intelligent field-level caching with surgical API optimization (40-99% bandwidth savings)
- **Multi-Layer Storage**: Memory → localStorage → IndexedDB → Static Data → API with tier-aware coordination
- **Entity-Centric Routing**: Direct entity access via OpenAlex IDs, DOIs, ORCIDs, and external identifiers
- **Data Visualizations**: Force-directed graphs with deterministic layouts
- **Progressive Web App**: Installable with offline capabilities
- **CLI Data Management**: Comprehensive cache analysis and static data generation
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

### Synthetic Response Cache System
Intelligent multi-tier caching with surgical API optimization:

**Architecture**:
- **EntityFieldAccumulator**: Field-level entity caching with TTL policies
- **CollectionResultMapper**: Query result mapping with pagination support
- **SyntheticResponseGenerator**: Response synthesis from cached + API data
- **StorageTierManager**: Coordinates data across memory, localStorage, IndexedDB, static cache

**Storage Tiers**:
- **Memory**: Hot data for immediate access
- **localStorage**: Warm data with fast retrieval
- **IndexedDB**: Cold data for bulk storage
- **Static Data Cache**: Pre-computed entities and queries
- **OpenAlex API**: Live data source with rate limiting

**Optimization Features**:
- **Surgical Requests**: Fetch only missing entity fields (80-99% bandwidth savings)
- **Field Accumulation**: Build complete entities from partial API requests over time
- **Collection Warming**: Populate individual entity caches from collection requests
- **TTL Management**: Field-specific time-to-live policies for optimal freshness
- **Request Deduplication**: Eliminate redundant API calls through intelligent caching

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

## OpenAlex CLI Tool

Comprehensive command-line interface for data management and cache analysis:

### Entity Operations
```bash
# List entities
pnpm cli list authors
pnpm cli stats

# Get specific entity
pnpm cli get A5017898742
pnpm cli get-typed authors A5017898742

# Search entities
pnpm cli search authors "machine learning" --limit 10

# Query with filters
pnpm cli fetch works --filter "author.id:A123" --select "id,display_name"
```

### Cache Management
```bash
# Cache statistics and performance metrics
pnpm cli cache:stats
pnpm cli cache:stats --format json

# Field coverage analysis
pnpm cli cache:field-coverage authors A5017898742
pnpm cli cache:field-coverage works W123 --format json

# Popular entities and collections
pnpm cli cache:popular-entities authors --limit 20
pnpm cli cache:popular-collections --limit 15

# Cache management
pnpm cli cache:clear --confirm
```

### Static Data Generation
```bash
# Analyze usage patterns
pnpm cli static:analyze

# Generate optimized static cache
pnpm cli static:generate --dry-run
pnpm cli static:generate --entity-type authors
pnpm cli static:generate --force
```

### Cache Options
All data commands support cache control:
- `--no-cache`: Skip cache, fetch directly from API
- `--cache-only`: Use cache only, don't fetch if not found
- `--no-save`: Don't save API results to cache

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

_Last verified: 2025-09-22-045525 - Application tested and confirmed functional. All quality checks passing (typecheck, build, lint). Playwright testing successful at localhost:5173/#/authors/A5025875274._
