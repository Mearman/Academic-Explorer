# Implementation Plan: Algorithms Package

**Branch**: `024-algorithms-package` | **Date**: 2025-11-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-algorithms-package/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a new `packages/algorithms/` package providing generic graph traversal and analysis algorithms for BibGraph. The package implements 8 core algorithms (DFS, BFS, Dijkstra, topological sort, cycle detection, connected components, SCC) with full type safety using discriminated unions for heterogeneous graphs and Result/Option types for error handling. Zero internal dependencies, strict TypeScript mode, 100% test coverage, performance targets <100ms for traversal and <200ms for pathfinding on graphs with 1000-2000 edges.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled (`strict: true`, `strictNullChecks: true`, `noImplicitAny: false`)
**Primary Dependencies**: None (zero runtime dependencies - pure TypeScript algorithms)
**Storage**: N/A (operates on in-memory graph data structures only)
**Testing**: Vitest with serial execution; unit tests for algorithms, performance benchmarks, edge case validation
**Target Platform**: Node.js 18+ and modern browsers (ES2022 target); isomorphic package usable from both web and CLI apps
**Project Type**: Monorepo package (`packages/algorithms/`) within Nx workspace
**Performance Goals**: <100ms traversal for 1,000 nodes; <200ms shortest path for 500 nodes with 2,000 edges; <100MB memory for 10,000 nodes with 50,000 edges
**Constraints**: Zero internal dependencies (FR-014); must not re-export from other packages; discriminated union types for heterogeneous graphs; Result/Option error handling (no exceptions); strict node ID uniqueness enforcement
**Scale/Scope**: 8 core algorithms, 10+ supporting types (Result, Option, GraphError variants), full test suite with unit/performance/edge case coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with BibGraph Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ No `any` types; discriminated union types for nodes/edges with `type` discriminator fields; Result/Option types enforce exhaustive pattern matching; strict mode enabled
2. **Test-First Development**: ✅ Tests written before implementation for all 8 algorithms; failing tests verify behavior; unit tests + performance tests + edge case tests
3. **Monorepo Architecture**: ✅ New package at `packages/algorithms/`; uses Nx workspace structure; exports via `@bibgraph/algorithms` alias; MUST NOT re-export from other internal packages (FR-014)
4. **Storage Abstraction**: ✅ N/A - package operates on in-memory data structures only; no persistence layer
5. **Performance & Memory**: ✅ Performance targets in success criteria (<100ms, <200ms); memory limits defined (<100MB); tests run serially; efficient adjacency list data structures
6. **Atomic Conventional Commits**: ✅ Commits use `feat(algorithms)`, `test(algorithms)`, `docs(algorithms)` scopes; atomic commits after each task; spec files committed after each phase
7. **Development-Stage Pragmatism**: ✅ Breaking changes acceptable during development; no backward compatibility required; API may evolve
8. **Test-First Bug Fixes**: ✅ Any bugs discovered will have regression tests written before fixes
9. **Deployment Readiness**: ✅ Package must build cleanly with `pnpm build`; all existing packages must continue to build successfully; zero TypeScript errors required
10. **Continuous Execution**: ✅ Implementation proceeds through all phases without pausing; spec commits after each phase; automatic chaining to /speckit.tasks → /speckit.implement

**Complexity Justification Required?** No - adding a new package is standard monorepo practice; algorithms package is clearly scoped and doesn't add architectural complexity beyond the expected package structure.

## Project Structure

### Documentation (this feature)

```text
specs/024-algorithms-package/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (Phase 0-1 output)
├── research.md          # Phase 0 output (algorithm design decisions)
├── data-model.md        # Phase 1 output (type definitions)
├── quickstart.md        # Phase 1 output (usage examples)
├── contracts/           # Phase 1 output (algorithm signatures)
│   └── algorithms.ts    # TypeScript interface definitions
├── checklists/          # Validation checklists
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/algorithms/
├── src/
│   ├── types/                    # Core type definitions
│   │   ├── graph.ts             # Graph, Node, Edge interfaces
│   │   ├── result.ts            # Result<T, E> discriminated union
│   │   ├── option.ts            # Option<T> discriminated union
│   │   ├── errors.ts            # GraphError variants
│   │   └── algorithm-results.ts # TraversalResult, Path, Component types
│   ├── graph/                    # Graph data structure implementation
│   │   ├── graph.ts             # Graph class with node/edge operations
│   │   └── adjacency-list.ts    # Adjacency list data structure
│   ├── traversal/                # Traversal algorithms
│   │   ├── dfs.ts               # Depth-first search
│   │   └── bfs.ts               # Breadth-first search
│   ├── pathfinding/              # Path finding algorithms
│   │   ├── dijkstra.ts          # Dijkstra's shortest path
│   │   └── priority-queue.ts    # Min-heap priority queue for Dijkstra
│   ├── analysis/                 # Graph analysis algorithms
│   │   ├── topological-sort.ts  # Topological sorting (DAG)
│   │   ├── cycle-detection.ts   # Cycle detection
│   │   ├── connected-components.ts  # Connected components (undirected)
│   │   └── scc.ts               # Strongly connected components (Tarjan's algorithm)
│   ├── utils/                    # Internal utilities
│   │   ├── validators.ts        # Input validation helpers
│   │   └── type-guards.ts       # Type narrowing helpers
│   └── index.ts                  # Public API exports
├── __tests__/                    # Test suites
│   ├── types/
│   │   ├── result.unit.test.ts
│   │   └── option.unit.test.ts
│   ├── graph/
│   │   └── graph.unit.test.ts
│   ├── traversal/
│   │   ├── dfs.unit.test.ts
│   │   ├── dfs.performance.test.ts
│   │   └── bfs.unit.test.ts
│   ├── pathfinding/
│   │   ├── dijkstra.unit.test.ts
│   │   └── dijkstra.performance.test.ts
│   ├── analysis/
│   │   ├── topological-sort.unit.test.ts
│   │   ├── cycle-detection.unit.test.ts
│   │   ├── connected-components.unit.test.ts
│   │   └── scc.unit.test.ts
│   └── integration/
│       └── algorithms.integration.test.ts
├── package.json                  # Package configuration
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite build configuration
├── project.json                  # Nx project configuration
└── README.md                     # Package documentation

# Nx workspace integration
tsconfig.base.json                # Add @bibgraph/algorithms alias
.github/workflows/ci.yml          # Add algorithms to test matrices (if applicable)
```

**Structure Decision**: New monorepo package at `packages/algorithms/` following standard Nx workspace conventions. Organized by algorithm category (traversal, pathfinding, analysis) with supporting types and utilities. Comprehensive test coverage with unit tests, performance tests, and integration tests. Zero dependencies on other internal packages to enable standalone usage.

## Complexity Tracking

> **No complexity justifications required** - this feature aligns with all constitution principles without violations.

---

## Phase 0: Research & Technology Decisions

### Research Tasks

1. **Result/Option Type Design Patterns**
   - **Decision**: Use discriminated unions with `{ ok: true, value: T }` | `{ ok: false, error: E }` for Result and `{ some: true, value: T }` | `{ some: false }` for Option
   - **Rationale**: TypeScript discriminated unions provide exhaustive pattern matching at compile time; no monadic operators needed initially; familiar pattern for TypeScript developers
   - **Alternatives Considered**:
     - Third-party libraries (fp-ts, neverthrow) - rejected due to zero dependency requirement
     - Nullable returns (`T | undefined`) - rejected due to loss of error information
     - Exceptions - rejected per spec requirement for no-throw APIs

2. **Graph Data Structure Representation**
   - **Decision**: Adjacency list using `Map<string, Set<string>>` for O(1) neighbor lookup
   - **Rationale**: Standard efficient representation for sparse graphs (typical in academic networks); supports both directed and undirected edges; fast neighbor enumeration for traversal algorithms
   - **Alternatives Considered**:
     - Adjacency matrix - rejected due to O(V²) space complexity for sparse graphs
     - Edge list - rejected due to O(E) neighbor lookup time
     - Hybrid approaches - unnecessary complexity for target graph sizes (<10,000 nodes)

3. **Node ID Uniqueness Enforcement Strategy**
   - **Decision**: Use `Map<string, Node>` for node storage; check `has()` before `set()` in `addNode()` method; return `Err(DuplicateNodeError)` if exists
   - **Rationale**: Map provides O(1) existence checks; fails fast on duplicate IDs preventing silent data corruption; clear error messages guide developers
   - **Alternatives Considered**:
     - Last-write-wins - rejected due to risk of accidental overwrites
     - Merge strategy - rejected due to complexity and ambiguous merge semantics

4. **Algorithm Performance Optimization Techniques**
   - **Decision**: Use visited sets (Set<string>) for cycle detection; priority queue (binary min-heap) for Dijkstra; iterative implementations to avoid stack overflow
   - **Rationale**: O(1) visited checks; O(log V) priority queue operations; stack-safe for large graphs
   - **Alternatives Considered**:
     - Recursive implementations - rejected due to stack overflow risk with deep graphs
     - Fibonacci heap - rejected due to implementation complexity vs. marginal performance gain for target graph sizes

5. **Type-Safe Discriminated Union Patterns**
   - **Decision**: Use literal `type` field for node/edge discrimination; define union types like `WorkNode | AuthorNode`; TypeScript narrows types via `type` field checks
   - **Rationale**: Standard TypeScript pattern; compile-time type narrowing; runtime type inspection via `type` field
   - **Alternatives Considered**:
     - Nominal typing with branded types - rejected due to added complexity
     - Class hierarchies - rejected due to serialization complexity and instanceof brittleness
     - Symbol-based discrimination - rejected due to non-serializable nature

6. **Error Type Hierarchy Design**
   - **Decision**: Base `GraphError` discriminated union with variants: `InvalidInputError`, `InvalidWeightError`, `NegativeWeightError`, `CycleDetectedError`, `DuplicateNodeError`; each has `type` discriminator and `message` string
   - **Rationale**: Exhaustive pattern matching on error types; descriptive error messages; consistent error structure
   - **Alternatives Considered**:
     - Error subclasses - rejected due to instanceof brittleness and serialization issues
     - Error codes as strings - rejected due to lack of type safety
     - Union of string literals - rejected due to loss of error message context

7. **Test Strategy for Algorithm Correctness**
   - **Decision**: Test fixtures with known graph structures and expected results; property-based testing for algorithm invariants; performance benchmarks with time limits; edge case coverage (empty graphs, disconnected components, cycles)
   - **Rationale**: Known-answer tests verify correctness; property tests verify invariants hold; benchmarks enforce performance requirements
   - **Alternatives Considered**:
     - Snapshot testing - rejected due to lack of semantic verification
     - Fuzzing - considered supplementary but not primary testing strategy

### Best Practices

- **Immutability**: Graph operations return new Result/Option values rather than mutating arguments
- **Type narrowing**: Use `if (result.ok)` to narrow Result types; `if (option.some)` for Option types
- **Error messages**: Include context in error messages (e.g., "Node 'A123' already exists in graph")
- **Algorithm documentation**: JSDoc comments with time/space complexity analysis
- **Test naming**: `algorithm-name.unit.test.ts`, `algorithm-name.performance.test.ts`
- **Deterministic testing**: Use fixed graph structures with known topology for reproducible tests

**Output**: `research.md` document with decisions, rationale, and alternatives

---

## Phase 1: Data Model & API Contracts

### Data Model (`data-model.md`)

**Core Types**:

1. **Result<T, E>**
   - Success: `{ ok: true, value: T }`
   - Failure: `{ ok: false, error: E }`
   - Pattern matching: `if (result.ok) { result.value } else { result.error }`

2. **Option<T>**
   - Present: `{ some: true, value: T }`
   - Absent: `{ some: false }`
   - Pattern matching: `if (option.some) { option.value }`

3. **Graph<N, E>**
   - Fields: `nodes: Map<string, N>`, `edges: Map<string, E>`, `adjacencyList: Map<string, Set<string>>`
   - Methods: `addNode(node: N)`, `addEdge(edge: E)`, `hasNode(id: string)`, `getNode(id: string)`, `getNeighbors(id: string)`
   - Invariants: Node IDs unique (enforced by Map); edge source/target nodes must exist

4. **Node (discriminated union)**
   - Required fields: `id: string`, `type: string` (discriminator)
   - Example union: `WorkNode | AuthorNode | InstitutionNode`
   - Type narrowing: `if (node.type === 'work') { /* node is WorkNode */ }`

5. **Edge (discriminated union)**
   - Required fields: `id: string`, `source: string`, `target: string`, `type: string` (discriminator)
   - Optional fields: `weight?: number`, `directed?: boolean`
   - Example union: `CitationEdge | AuthorshipEdge | AffiliationEdge`

6. **TraversalResult<N>**
   - Fields: `visitOrder: N[]`, `parent: Map<string, string>`, `discoveryTime: Map<string, number>`, `finishTime: Map<string, number>`
   - Preserves node type information in `visitOrder`

7. **Path<N, E>**
   - Fields: `nodes: N[]`, `edges: E[]`, `totalWeight: number`
   - Invariants: `nodes.length === edges.length + 1`; edges connect consecutive nodes

8. **Component<N>**
   - Fields: `id: string`, `nodes: N[]`, `size: number`
   - Represents connected component in graph

9. **GraphError (discriminated union)**
   - Variants:
     - `InvalidInputError`: `{ type: 'invalid-input', message: string }`
     - `InvalidWeightError`: `{ type: 'invalid-weight', message: string }`
     - `NegativeWeightError`: `{ type: 'negative-weight', message: string }`
     - `CycleDetectedError`: `{ type: 'cycle-detected', message: string, cycle?: string[] }`
     - `DuplicateNodeError`: `{ type: 'duplicate-node', message: string, nodeId: string }`

**Relationships**:
- Graph contains Nodes and Edges (1-to-many)
- TraversalResult references Nodes (1-to-many)
- Path contains Nodes and Edges (ordered sequences)
- Component contains Nodes (subset of graph)

### API Contracts (`contracts/algorithms.ts`)

```typescript
// Graph construction and management
export interface Graph<N extends { id: string; type: string }, E extends { id: string; source: string; target: string; type: string }> {
  addNode(node: N): Result<void, DuplicateNodeError>;
  removeNode(id: string): Result<void, InvalidInputError>;
  hasNode(id: string): boolean;
  getNode(id: string): Option<N>;
  addEdge(edge: E): Result<void, InvalidInputError>;
  removeEdge(id: string): Result<void, InvalidInputError>;
  getNeighbors(id: string): Result<string[], InvalidInputError>;
  getNodeCount(): number;
  getEdgeCount(): number;
}

// Traversal algorithms
export function dfs<N extends { id: string; type: string }>(
  graph: Graph<N, any>,
  startId: string
): Result<TraversalResult<N>, GraphError>;

export function bfs<N extends { id: string; type: string }>(
  graph: Graph<N, any>,
  startId: string
): Result<TraversalResult<N>, GraphError>;

// Path finding
export function dijkstra<N extends { id: string; type: string }, E extends { id: string; source: string; target: string; type: string; weight?: number }>(
  graph: Graph<N, E>,
  startId: string,
  endId: string
): Result<Option<Path<N, E>>, GraphError>;

// Graph analysis
export function topologicalSort<N extends { id: string; type: string }>(
  graph: Graph<N, any>
): Result<N[], CycleDetectedError | InvalidInputError>;

export function detectCycles<N extends { id: string; type: string }>(
  graph: Graph<N, any>
): Result<CycleInfo, GraphError>;

export function connectedComponents<N extends { id: string; type: string }>(
  graph: Graph<N, any>
): Result<Component<N>[], GraphError>;

export function stronglyConnectedComponents<N extends { id: string; type: string }>(
  graph: Graph<N, any>
): Result<Component<N>[], GraphError>;
```

### Quickstart Examples (`quickstart.md`)

**Example 1: Basic Graph Traversal**
```typescript
import { Graph, dfs } from '@bibgraph/algorithms';

// Create graph with typed nodes
type WorkNode = { id: string; type: 'work'; title: string };
const graph = new Graph<WorkNode, any>();

const addResult = graph.addNode({ id: 'W1', type: 'work', title: 'Paper A' });
if (!addResult.ok) {
  console.error('Failed to add node:', addResult.error.message);
  return;
}

// Traverse graph
const traversalResult = dfs(graph, 'W1');
if (traversalResult.ok) {
  console.log('Visited nodes:', traversalResult.value.visitOrder);
} else {
  console.error('Traversal failed:', traversalResult.error.message);
}
```

**Example 2: Shortest Path Finding**
```typescript
import { Graph, dijkstra } from '@bibgraph/algorithms';

type Node = { id: string; type: 'generic' };
type Edge = { id: string; source: string; target: string; type: 'generic'; weight: number };

const graph = new Graph<Node, Edge>();
// ... add nodes and weighted edges

const pathResult = dijkstra(graph, 'A', 'B');
if (pathResult.ok && pathResult.value.some) {
  const path = pathResult.value.value;
  console.log('Shortest path weight:', path.totalWeight);
  console.log('Path:', path.nodes.map(n => n.id).join(' -> '));
} else if (pathResult.ok) {
  console.log('No path exists between A and B');
} else {
  console.error('Pathfinding failed:', pathResult.error.message);
}
```

**Example 3: Cycle Detection**
```typescript
import { Graph, detectCycles } from '@bibgraph/algorithms';

const cycleResult = detectCycles(graph);
if (cycleResult.ok) {
  if (cycleResult.value.hasCycle) {
    console.log('Graph contains cycle:', cycleResult.value.cycle);
  } else {
    console.log('Graph is acyclic');
  }
}
```

### Agent Context Update

Run `.specify/scripts/bash/update-agent-context.sh claude` to update CLAUDE.md with new technology:
- Add `@bibgraph/algorithms` to "Active Technologies" section
- Document zero dependency constraint
- Note discriminated union pattern for heterogeneous graphs
- Document Result/Option error handling pattern

**Output**: `data-model.md`, `contracts/algorithms.ts`, `quickstart.md`, CLAUDE.md updated

---

## Phase 2: Task Generation

**Note**: Phase 2 (task breakdown into `tasks.md`) is handled by the `/speckit.tasks` command, NOT by `/speckit.plan`. This plan provides the foundation for task generation.

**Expected task categories**:
1. **Setup** (5-10 tasks): Package initialization, TypeScript config, Nx integration, build setup
2. **Types** (8-12 tasks): Result, Option, GraphError, Node, Edge, Graph interfaces, algorithm result types
3. **Core Graph** (5-8 tasks): Graph class, adjacency list, node/edge operations, uniqueness enforcement
4. **Traversal** (6-10 tasks): DFS implementation + tests, BFS implementation + tests
5. **Pathfinding** (8-12 tasks): Priority queue, Dijkstra implementation + tests, performance benchmarks
6. **Analysis** (15-20 tasks): Topological sort, cycle detection, connected components, SCC (each with tests)
7. **Integration** (5-8 tasks): Integration tests, performance validation, CI/CD integration
8. **Documentation** (3-5 tasks): README, API docs, examples

**Total estimated tasks**: 60-80 atomic tasks across 7-8 phases

---

## Constitution Re-Check (Post-Design)

Verify alignment after Phase 1 design work:

1. **Type Safety**: ✅ All types defined with discriminated unions; no `any` types in contracts; strict mode enforced
2. **Test-First Development**: ✅ Test structure planned; unit + performance + edge case coverage
3. **Monorepo Architecture**: ✅ Package structure at `packages/algorithms/`; Nx integration planned; no re-exports
4. **Storage Abstraction**: ✅ N/A - no storage operations
5. **Performance & Memory**: ✅ Performance targets defined in contracts; adjacency list for efficiency
6. **Atomic Conventional Commits**: ✅ Commit strategy per phase outlined
7. **Development-Stage Pragmatism**: ✅ No backward compatibility planned
8. **Test-First Bug Fixes**: ✅ Test strategy includes regression coverage
9. **Deployment Readiness**: ✅ Build setup planned; CI/CD integration outlined
10. **Continuous Execution**: ✅ Automatic progression to /speckit.tasks → /speckit.implement planned

**Phase 0-1 Complete**: All planning artifacts generated. Ready for `/speckit.tasks` command.

---

**Next Command**: `/speckit.tasks` (automatically invoked per Principle X: Continuous Execution)
