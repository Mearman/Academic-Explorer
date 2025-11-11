# Academic Explorer Constitution

## Core Principles

### I. TypeScript-First Development
All code must be written in TypeScript with strict type checking enabled. No use of `any` types - use `unknown` with type guards instead. Type safety is non-negotiable across all packages and applications.

### II. Monorepo Architecture
Features are organized as shared packages in an Nx-managed monorepo. Each package must be independently testable, have clear dependencies, and serve a specific purpose. Applications consume these packages with minimal duplication.

### III. Test-First Development (NON-NEGOTIABLE)
TDD is mandatory: Tests written → User approved → Tests fail → Then implement. Red-Green-Refactor cycle strictly enforced. Tests run in fail-fast order: Type Check → Unit → Component → Integration → E2E.

### IV. Memory-Conscious Testing
Tests must run serially to prevent OOM errors. Memory constraints guide test strategy. Use `--max-old-space-size=8192` for resource-intensive operations. Nx daemon disabled in CI environments.

### V. Deterministic Behavior
Graph layouts use fixed seeds for reproducible visualizations. Force simulations are deterministic. All randomness must be seeded for consistent testing and user experience.

### VI. Multi-Tier Caching Strategy
Implement intelligent caching at multiple levels: Memory → localStorage → IndexedDB → Static → API. Field-level entity caching with surgical API requests. Cache analytics drive optimization decisions.

### VII. Accessibility & Performance
WCAG 2AA compliance is mandatory. All UI components must be keyboard navigable and screen-reader compatible. Bundle size warnings at 800kB. Progressive enhancement with offline capabilities.

## Development Standards

### Code Quality
- **DRY Principle**: Create abstractions over duplication
- **Security**: No OWASP top 10 vulnerabilities (XSS, SQL injection, etc.)
- **Linting**: ESLint must pass before merge
- **Type Checking**: Must pass `pnpm typecheck` with no errors

### Testing Requirements
- Unit tests for all business logic
- Component tests for React components with React Testing Library
- Integration tests for cross-component interactions
- E2E tests with Playwright for critical user journeys
- MSW for API mocking in tests

### OpenAlex Integration
- Support all entity types: Works (W), Authors (A), Sources (S), Institutions (I), Publishers (P), Funders (F), Topics (T)
- Handle multiple ID formats: OpenAlex IDs, DOIs, ORCIDs
- Implement surgical API requests to fetch only missing fields
- Maintain field-level cache coverage analytics

## Quality Pipeline

All changes must pass:
```bash
pnpm typecheck        # TypeScript validation
pnpm test             # Full test suite
pnpm build            # Production build
pnpm lint             # Code quality
pnpm validate         # Complete verification
```

## CI/CD Requirements

### GitHub Actions Pipeline
- Build and test on all PRs
- Quality gates run daily and on main branch pushes
- E2E tests against live GitHub Pages deployment
- Automatic rollback on post-deployment E2E failures
- Semantic release with conventional commits

### Deployment
- Web app deploys to GitHub Pages with hash-based routing
- CLI tool distributed as part of monorepo
- Coverage reports uploaded to artifacts
- Lighthouse CI and accessibility testing required

## Governance

This constitution supersedes all other practices. All PRs must verify compliance with these principles. Amendments require documentation, approval, and migration plan.

**Version**: 1.0.0 | **Ratified**: 2025-11-11 | **Last Amended**: 2025-11-11
