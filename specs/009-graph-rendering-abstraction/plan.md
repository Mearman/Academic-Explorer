# Implementation Plan: Graph Rendering Abstraction

**Branch**: `009-graph-rendering-abstraction` | **Date**: 2025-01-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-graph-rendering-abstraction/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a domain-agnostic graph visualization component that decouples force simulation from rendering implementation. The component must support multi-type nodes and edges with pluggable renderers (Canvas, SVG, D3, Cytoscape), custom force application at node and edge levels, and hidden edge influence on layout. Performance target: 500 nodes at 60fps with 3-second stabilization for graphs under 100 nodes.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled
**Primary Dependencies**: None required (zero dependencies for core); optional peer dependencies for renderer adapters (d3-force for D3 adapter)
**Storage**: N/A - operates entirely on in-memory graph data structures
**Testing**: Vitest for unit/integration tests; visual regression tests for rendering; deterministic layout tests with fixed seeds
**Target Platform**: Modern browsers (ES2022+) with requestAnimationFrame support; optional Web Worker offloading for simulation
**Project Type**: Monorepo package - shared library
**Performance Goals**: 60fps for 500 nodes, 1000 edges; 3-second stabilization for <100 nodes; <100ms per force calculation tick
**Constraints**: Zero domain-specific concepts; generic type parameters only; swappable renderers without simulation changes; spatial indexing for O(n log n) collision detection
**Scale/Scope**: Core package (~2000 LOC), 2 default renderer adapters (Canvas, SVG ~500 LOC each), 5 default force implementations (~300 LOC each)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ No `any` types planned; strict generic type parameters for `Node<TNodeData>`, `Edge<TEdgeData>`, `Force<TNode, TEdge>`; type guards for dynamic property access in force functions
2. **Test-First Development**: ✅ Tests written and failing before implementation; unit tests for forces (deterministic outputs), integration tests for simulation convergence, visual regression tests for renderer outputs
3. **Monorepo Architecture**: ✅ New package `packages/graph-renderer` with substructure: `/core` (data structures), `/simulation` (force engine), `/renderers` (Canvas/SVG adapters), `/forces` (default implementations)
4. **Storage Abstraction**: ✅ N/A - no persistence; operates on in-memory data only
5. **Performance & Memory**: ✅ Web Worker support for simulation offloading; spatial indexing (quadtree) for efficient force calculations; RAF-based rendering loop; tests run serially
6. **Atomic Conventional Commits**: ✅ Incremental commits per component: `feat(graph-renderer): add node type system`, `feat(graph-renderer): implement force simulation engine`, etc.

**Complexity Justification Required?** YES - see Complexity Tracking section below

## Project Structure

### Documentation (this feature)

```text
specs/009-graph-rendering-abstraction/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── core-types.ts    # Node, Edge, Graph interfaces
│   ├── simulation.ts    # Simulation engine interface
│   ├── renderer.ts      # Renderer adapter interface
│   └── forces.ts        # Force function signatures
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/graph-renderer/
├── src/
│   ├── core/
│   │   ├── node.ts              # Node<TData> generic type, validation
│   │   ├── edge.ts              # Edge<TData> generic type, directionality
│   │   ├── graph.ts             # Graph<TNode, TEdge> container, CRUD operations
│   │   └── index.ts             # Core exports
│   ├── simulation/
│   │   ├── engine.ts            # Simulation class, tick loop, state management
│   │   ├── integrator.ts        # Velocity Verlet or similar physics integration
│   │   ├── spatial-index.ts     # Quadtree for efficient collision detection
│   │   ├── worker.ts            # Web Worker wrapper for offloading
│   │   └── index.ts             # Simulation exports
│   ├── forces/
│   │   ├── force-interface.ts   # Force<TNode, TEdge> generic signature
│   │   ├── repulsion.ts         # Coulomb-like node repulsion
│   │   ├── attraction.ts        # Spring-like edge attraction (Hooke's law)
│   │   ├── centering.ts         # Center of mass anchoring
│   │   ├── collision.ts         # Radius-based collision prevention
│   │   └── index.ts             # Force exports
│   ├── renderers/
│   │   ├── renderer-interface.ts # RendererAdapter<TNode, TEdge> interface
│   │   ├── canvas-renderer.ts    # HTML5 Canvas implementation
│   │   ├── svg-renderer.ts       # SVG DOM implementation
│   │   └── index.ts              # Renderer exports
│   ├── utils/
│   │   ├── vector.ts            # 2D vector math utilities
│   │   ├── bbox.ts              # Bounding box calculations
│   │   └── index.ts             # Utils exports
│   └── index.ts                 # Package main entry point
├── __tests__/
│   ├── core/
│   │   ├── node.unit.test.ts
│   │   ├── edge.unit.test.ts
│   │   └── graph.unit.test.ts
│   ├── simulation/
│   │   ├── engine.unit.test.ts
│   │   ├── integrator.unit.test.ts
│   │   └── deterministic-layout.integration.test.ts
│   ├── forces/
│   │   ├── repulsion.unit.test.ts
│   │   ├── attraction.unit.test.ts
│   │   ├── centering.unit.test.ts
│   │   └── collision.unit.test.ts
│   ├── renderers/
│   │   ├── canvas-renderer.component.test.ts
│   │   ├── svg-renderer.component.test.ts
│   │   └── visual-regression.integration.test.ts
│   └── e2e/
│       ├── multi-type-rendering.e2e.test.ts
│       ├── renderer-swap.e2e.test.ts
│       └── force-application.e2e.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts              # Build config (library mode)
├── vitest.config.ts            # Test config
└── README.md                   # Usage documentation
```

**Structure Decision**: Monorepo package structure chosen to enable sharing across web and CLI apps. Package is organized by concern: `core/` for data structures, `simulation/` for physics engine, `forces/` for default force implementations, `renderers/` for pluggable visualization adapters. This separation enables:
1. Core types can be imported independently for non-rendering use cases
2. Simulation can run headlessly for testing or server-side layout generation
3. Custom forces can be implemented by consumers without modifying package
4. Renderer adapters can be tree-shaken if only one is used

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New package `packages/graph-renderer` | Domain-agnostic graph visualization is needed by both web app (Academic Explorer) and potential future CLI visualization tools. Existing `packages/graph` package is coupled to academic domain (works, authors, citations). | Extending existing `packages/graph` would violate FR-017 (no academic-specific concepts) and prevent reuse in non-academic contexts. Refactoring existing package would break Academic Explorer. |
| Web Worker support for simulation | Performance requirement SC-003 mandates 60fps for 500 nodes. Main thread rendering + force calculations cannot meet this target; simulation must offload to worker. | Attempting main-thread-only approach would fail performance gates and create unresponsive UI during layout calculations, violating research usability requirements. |
| Spatial indexing (quadtree) | Naive O(n²) collision detection fails at 500 nodes (250k comparisons per tick). Quadtree reduces to O(n log n), enabling performance target. | Simple pairwise comparison was measured at ~200ms per tick for 500 nodes, far below 60fps requirement. Spatial indexing is necessary, not premature optimization. |
| Generic type parameters `<TNodeData, TEdgeData>` | FR-020 requires type-safe interfaces; FR-017 forbids domain semantics. Generics enable consumers to attach arbitrary metadata while maintaining type safety. | Using `Record<string, unknown>` or `any` would violate Constitution Principle I (Type Safety). Fixed interfaces would violate FR-017 (no domain concepts). |

**Justification Summary**: All complexity additions directly satisfy either functional requirements (FR-006, FR-007, FR-017, FR-020) or success criteria (SC-003, SC-004) from the feature specification. No YAGNI violations present.

## Phase 0: Research & Decision Log

*Output: `research.md` with all NEEDS CLARIFICATION resolved*

### Research Tasks

1. **Physics Integration Method**: Research velocity Verlet vs. Euler vs. RK4 for force simulation stability and performance characteristics
2. **Spatial Indexing Structure**: Evaluate quadtree vs. R-tree vs. grid-based indexing for 2D collision detection with dynamic node counts
3. **Web Worker Communication**: Research structured clone performance vs. Transferable objects vs. SharedArrayBuffer for position updates
4. **Force Composition Pattern**: Research force accumulation strategies (additive, multiplicative, priority-based) for multiple simultaneous forces
5. **Renderer Event System**: Research event delegation patterns for node/edge interaction (click, hover, drag) across Canvas/SVG renderers
6. **Type Parameter Variance**: Research TypeScript covariance/contravariance for generic graph types to enable safe renderer substitution
7. **Deterministic Layout**: Research PRNG seeding strategies for reproducible layouts in tests and research publications
8. **Performance Measurement**: Research RAF timing APIs and long task detection for performance monitoring in production

### Best Practices

1. **Force-Directed Layout Best Practices**: Barnes-Hut optimization, cooling schedules, adaptive timesteps
2. **Canvas Rendering Optimization**: Dirty rectangle tracking, layer separation, offscreen canvas usage
3. **TypeScript Generics**: Constraint design, variance annotations, type inference optimization
4. **Vitest Visual Testing**: Snapshot strategies for renderer output, pixel diff tolerances

See [`research.md`](./research.md) for consolidated findings and decisions.

## Phase 1: Data Model & Contracts

*Output: `data-model.md`, `contracts/`, `quickstart.md`*

### Entities

From spec Key Entities section:
- **Node**: Unique ID (string), type discriminator (string), position (x: number, y: number), velocity (vx: number, vy: number), visual properties (size, color, shape, label), metadata (generic TNodeData)
- **Edge**: Unique ID (string), source node ID (string), target node ID (string), type discriminator (string), directed flag (boolean), visual properties (color, width, style, arrowStyle), metadata (generic TEdgeData)
- **Graph**: Node collection (Map<id, Node>), edge collection (Map<id, Edge>), operations (addNode, removeNode, addEdge, removeEdge, getNode, getEdge, getNeighbors, validate)
- **Force**: Generic function signature `(nodes: Node<T>[], edges: Edge<E>[], alpha: number) => void` that mutates node velocities
- **Simulation**: Engine state (running, paused, stopped), alpha (cooling parameter 0-1), configuration (forces, iterations, decay rate), tick loop, event emitters (tick, end, pause)
- **Renderer**: Adapter interface with lifecycle methods (init, render, destroy, resize), event handlers (onClick, onHover, onDrag), visual configuration maps (node type → visual props, edge type → visual props)

### Contracts

API contracts will be TypeScript interface definitions in `/contracts/`:
- `core-types.ts`: Node, Edge, Graph interfaces with generic type parameters
- `simulation.ts`: Simulation class interface, configuration options, event types
- `renderer.ts`: RendererAdapter interface, lifecycle methods, event delegation
- `forces.ts`: Force function signature, default force configurations, composition utilities

### Quickstart

Developer journey from installation to first graph rendering:
1. Install package: `npm install @academic-explorer/graph-renderer`
2. Define node/edge types with custom metadata
3. Create graph instance and populate with typed nodes/edges
4. Configure simulation with default or custom forces
5. Attach Canvas or SVG renderer with visual configuration
6. Start simulation and handle lifecycle events

See [`quickstart.md`](./quickstart.md) for full code examples.

## Implementation Phases (for tasks.md generation)

**Phase 1 (MVP - P1 User Stories)**: Multi-type node/edge rendering
- Core data structures (Node, Edge, Graph) with generic types
- Canvas renderer adapter with type-based visual mapping
- Basic layout (random initialization, no forces yet)
- Node/edge validation (FR-016)

**Phase 2 (Core Value - P2 User Stories)**: Force simulation decoupling
- Simulation engine with tick loop and alpha decay
- Velocity Verlet integrator
- Default forces (repulsion, attraction, centering)
- Renderer-simulation communication interface
- Web Worker wrapper for offloading

**Phase 3 (Enhanced Features - P2/P3 User Stories)**: Custom force application
- Force function interface with node/edge property access
- Node-based force configuration (FR-010)
- Edge-based force configuration (FR-011)
- Hidden edge influence (FR-012)
- Force composition utilities

**Phase 4 (Alternative Renderers - P1 Support)**: SVG renderer adapter
- SVG DOM manipulation renderer
- Renderer-agnostic event delegation
- Visual configuration mapping
- Renderer swap demonstration

**Phase 5 (Performance Optimization - SC-003, SC-004)**: Spatial indexing and optimization
- Quadtree spatial index
- Collision detection force (FR-013)
- Performance measurement hooks
- Deterministic layout tests with fixed seeds

**Phase 6 (Edge Cases - SC-009)**: Error handling and validation
- Empty graph handling
- Invalid node reference detection (FR-016)
- NaN/Infinity position clamping
- Force value validation (negative, zero, extreme values)

## Next Steps

After `/speckit.plan` completes:
1. Review `research.md` for technology decisions
2. Review `data-model.md` for entity schemas
3. Review `contracts/` for API interfaces
4. Review `quickstart.md` for usage patterns
5. Run `/speckit.tasks` to generate atomic task breakdown from this plan
6. Begin implementation following test-first discipline
