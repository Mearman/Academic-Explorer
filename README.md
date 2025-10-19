# Academic Explorer

> A comprehensive monorepo for exploring academic literature through interactive knowledge graphs and data visualizations.

Academic Explorer is a TypeScript-based research platform that provides intuitive access to academic literature via the [OpenAlex API](https://docs.openalex.org/). Built as a modern monorepo, it combines a powerful React web application with a sophisticated CLI tool for academic data exploration and management.

**[View Live Application](https://mearman.github.io/Academic-Explorer/#/authors/A5017898742)**

## CI/CD Status

[![CI Pipeline](https://github.com/Mearman/Academic-Explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/Mearman/Academic-Explorer/actions/workflows/ci.yml)

## Monorepo Structure

This repository is organized as an Nx-managed monorepo with shared packages and focused applications:

```
Academic Explorer/
├── apps/
│   ├── cli/                    # Command-line interface
│   └── web/                    # React SPA application
├── packages/
│   ├── client/                 # OpenAlex API client
│   ├── graph/                  # Graph data structures
│   ├── simulation/             # Force simulation engine
│   ├── ui/                     # UI components
│   └── utils/                  # Shared utilities
├── config/                     # Shared configuration
├── scripts/                    # Build and utility scripts
├── tools/                      # Development tools
├── nx.json                     # Nx workspace configuration
├── package.json               # Root package configuration
├── pnpm-workspace.yaml        # PNPM workspace definition
└── README.md                  # This file
```

### [Applications](apps/README.md)

- **[`apps/web`](apps/README.md)** - React SPA for interactive OpenAlex exploration
- **[`apps/cli`](apps/README.md)** - Command-line interface for data management

### [Shared Packages](packages/README.md)

- **[`packages/client`](packages/README.md)** - TypeScript OpenAlex API client with caching
- **[`packages/graph`](packages/README.md)** - Core graph data structures and entity management
- **[`packages/simulation`](packages/README.md)** - Force-directed graph simulation engine
- **[`packages/ui`](packages/README.md)** - Reusable UI components with Mantine
- **[`packages/utils`](packages/README.md)** - Shared utilities and type guards

## Quick Start

```bash
# Install dependencies
pnpm install

# Start web application
pnpm dev

# Use CLI tool
pnpm cli stats
pnpm cli search authors "machine learning"

# Run quality checks
pnpm validate
```

## Development Commands

### Essential Commands

```bash
pnpm dev              # Start web development server
pnpm cli              # OpenAlex CLI tool
pnpm build            # Build all projects
pnpm test             # Run all tests with typecheck (Nx-managed dependencies)
pnpm test:verbose     # Run tests in parallel with verbose output (may hang)
pnpm test:sequential  # Alias for pnpm test
pnpm typecheck        # TypeScript validation (runs automatically with tests)
pnpm lint             # ESLint checking
pnpm validate         # Complete quality pipeline (build + test + lint + typecheck)
```

### Nx Monorepo Commands

```bash
nx graph              # View dependency graph
nx affected:test      # Test + typecheck only changed projects (fail-fast order)
nx affected:build     # Build only changed projects
nx run-many -t test   # Run tests + typecheck across all projects (fail-fast order)
```

#### Test Execution Order (Fail-Fast)

Tests run in the following order to fail fast on basic issues:

1. **Type Check** - TypeScript validation (automatic dependency)
2. **Unit Tests** - Fast, isolated component tests
3. **Component Tests** - React component integration tests
4. **Integration Tests** - Cross-component integration tests
5. **E2E Tests** - Full application end-to-end tests

If unit tests fail, the more expensive component/integration/e2e tests won't run.

### CLI Features

```bash
# Entity operations
pnpm cli get A5017898742
pnpm cli search works "neural networks"
pnpm cli list authors --limit 10

# Cache management
pnpm cli cache:stats
pnpm cli cache:field-coverage authors A123
pnpm cli cache:clear --confirm

# Static data generation
pnpm cli static:analyze
pnpm cli static:generate
```

## Core Features

### Web Application

- **Interactive Knowledge Graphs** - Force-directed visualizations with deterministic layouts
- **Entity-Centric Routing** - Direct access via OpenAlex IDs, DOIs, ORCIDs
- **Multi-Tier Caching** - Memory → localStorage → IndexedDB → Static → API
- **Progressive Web App** - Installable with offline capabilities
- **Accessibility First** - WCAG2AA compliance with automated testing

### CLI Tool

- **Intelligent Caching** - Field-level entity caching with 80-99% bandwidth savings
- **Surgical API Requests** - Fetch only missing entity fields
- **Cache Analytics** - Field coverage analysis and usage patterns
- **Static Data Generation** - Pre-computed entity and query optimization

### Synthetic Response Cache

Advanced caching system with surgical API optimization:

- **EntityFieldAccumulator** - Field-level caching with TTL policies
- **CollectionResultMapper** - Query result mapping with pagination
- **SyntheticResponseGenerator** - Response synthesis from cached + API data
- **StorageTierManager** - Multi-tier storage coordination

## Technology Stack

- **Frontend**: React + Vite + TanStack Router + XYFlow
- **Styling**: Vanilla Extract CSS-in-JS + Mantine UI
- **State**: Zustand + Immer with persistence
- **Storage**: IndexedDB + localStorage with fallbacks
- **Testing**: Vitest + MSW + Playwright + React Testing Library
- **Build**: Nx for caching and orchestration
- **Language**: TypeScript with strict configuration

## OpenAlex Integration

### Supported Entity Types

- **W** - Works (papers, articles, books)
- **A** - Authors (researchers, scientists)
- **S** - Sources (journals, repositories)
- **I** - Institutions (universities, organizations)
- **P** - Publishers
- **F** - Funders (grants, funding agencies)
- **T** - Topics (research areas, subjects)

### URL Patterns

```
/authors/A123456789                    # Direct author access
/works/W2741809807                     # Direct work access
/entity/institutions/I27837315         # Generic entity route
/doi/10.1038/nature.2023.12345         # DOI resolution
/$bareId                               # Auto-detection
```

## Architecture

### Component Architecture

Following Atomic Design methodology:

```
apps/web/src/components/
├── atoms/           # Button, Input, Icon
├── molecules/       # SearchBox, EntityCard
├── organisms/       # GraphVisualization, EntityList
├── templates/       # PageLayout, EntityLayout
└── entity-displays/ # AuthorDisplay, WorkDisplay
```

### Force Simulation System

- **Web Worker Execution** - Non-blocking force calculations
- **Deterministic Layouts** - Fixed seeds for consistent positioning
- **Animated Streaming** - Real-time position updates
- **Custom Forces** - Academic entity relationship modeling
- **Performance Scaling** - Dynamic configuration based on graph size

### Worker System

- **Data Fetching Worker** - Background OpenAlex API operations
- **Force Animation Worker** - D3 force simulation execution
- **Event Bridge** - Cross-context communication
- **Progress Reporting** - Real-time operation updates

## Research Context

Part of PhD research on **cultural heritage data preservation and citizen science engagement** at Bangor University, Wales.

**Research Focus**: Bridging computational methods with cultural heritage accessibility through crowdsourced data repositories and ML/CV techniques.

## Contributing

### Quality Pipeline

```bash
pnpm typecheck        # TypeScript validation
pnpm test             # Full test suite
pnpm build            # Production build
pnpm lint             # Code quality
pnpm validate           # Complete verification
```

### Development Guidelines

- **Memory Constraints**: Tests run serially to prevent OOM errors
- **No `any` Types**: Use `unknown` with type guards
- **DRY Principle**: Create abstractions over duplication
- **Deterministic Layouts**: Fixed seeds for reproducible graphs

## Deployment

### Web Application

Built for GitHub Pages with hash-based routing:

```bash
pnpm build
# Deploy apps/web/dist/ to GitHub Pages
```

### CLI Tool

Distributed as part of the monorepo:

```bash
pnpm cli --help
```

## Performance

- **Bundle Size**: Code splitting with 800kB warnings
- **Caching**: 40-99% bandwidth savings with surgical requests
- **Memory**: Optimized for large graph datasets
- **Testing**: Serial execution prevents OOM crashes
- **Build**: Nx caching and affected builds

---

_PhD Research • Bangor University • Cultural Heritage + Computational Methods_

# Test commit
