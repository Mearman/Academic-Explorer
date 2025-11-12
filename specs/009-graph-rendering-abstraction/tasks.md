---
description: "Task list for Graph Rendering Abstraction feature implementation"
---

# Tasks: Graph Rendering Abstraction

**Input**: Design documents from `/specs/009-graph-rendering-abstraction/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo structure**: `packages/graph-renderer/`
- Package imports: `@academic-explorer/graph-renderer` (never relative cross-package imports)
- Tests: `packages/graph-renderer/__tests__/` with `foo.[type].test.ts` naming
- Test types: `unit`, `integration`, `component`, `e2e`

---

## Phase 1: Setup (Package Initialization)

**Purpose**: Create package structure and configure build/test infrastructure

- [ ] T001 Create package directory `packages/graph-renderer/` with package.json (name: `@academic-explorer/graph-renderer`, version: 0.1.0)
- [ ] T002 [P] Configure Nx project config in `packages/graph-renderer/project.json` with build and test targets
- [ ] T003 [P] Create TypeScript config in `packages/graph-renderer/tsconfig.json` extending workspace base config with strict mode
- [ ] T004 [P] Configure Vite for library mode in `packages/graph-renderer/vite.config.ts` with ES module output
- [ ] T005 [P] Configure Vitest in `packages/graph-renderer/vitest.config.ts` with serial execution and 5-min timeout
- [ ] T006 [P] Create source directory structure: `src/core/`, `src/simulation/`, `src/forces/`, `src/renderers/`, `src/utils/`
- [ ] T007 [P] Create test directory structure: `__tests__/core/`, `__tests__/simulation/`, `__tests__/forces/`, `__tests__/renderers/`, `__tests__/e2e/`
- [ ] T008 [P] Add package alias `@academic-explorer/graph-renderer` to workspace `tsconfig.base.json` paths
- [ ] T009 Create package exports in `packages/graph-renderer/src/index.ts` with barrel exports for core, simulation, forces, renderers

**Checkpoint**: Package structure ready - foundational work can begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and base types that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Utilities

- [ ] T010 [P] Create vector math utilities in `packages/graph-renderer/src/utils/vector.ts` (add, subtract, magnitude, normalize, scale)
- [ ] T011 [P] Write FAILING unit tests for vector utilities in `packages/graph-renderer/__tests__/utils/vector.unit.test.ts`
- [ ] T012 [P] Create bounding box utilities in `packages/graph-renderer/src/utils/bbox.ts` (contains, intersects, expand)
- [ ] T013 [P] Write FAILING unit tests for bbox utilities in `packages/graph-renderer/__tests__/utils/bbox.unit.test.ts`

### Type Guards

- [ ] T014 [P] Create type guard utilities in `packages/graph-renderer/src/utils/type-guards.ts` (isNode, isEdge, isValidPosition)
- [ ] T015 [P] Write FAILING unit tests for type guards in `packages/graph-renderer/__tests__/utils/type-guards.unit.test.ts`

### Core Data Structures

- [ ] T016 Create Node generic type in `packages/graph-renderer/src/core/node.ts` with `Node<TData>` interface (id, type, x, y, vx, vy, properties, data)
- [ ] T017 Write FAILING unit tests for Node validation in `packages/graph-renderer/__tests__/core/node.unit.test.ts`
- [ ] T018 Create Edge generic type in `packages/graph-renderer/src/core/edge.ts` with `Edge<TData>` interface (id, source, target, type, directed, properties, data)
- [ ] T019 Write FAILING unit tests for Edge validation in `packages/graph-renderer/__tests__/core/edge.unit.test.ts`

### Graph Container

- [ ] T020 Create Graph generic class in `packages/graph-renderer/src/core/graph.ts` with `Graph<TNode, TEdge>` supporting addNode, removeNode, addEdge, removeEdge, getNode, getEdge, validate
- [ ] T021 Write FAILING unit tests for Graph CRUD operations in `packages/graph-renderer/__tests__/core/graph.unit.test.ts`
- [ ] T022 Implement edge validation (FR-016) to ensure source/target nodes exist in `packages/graph-renderer/src/core/graph.ts`
- [ ] T023 Write FAILING unit tests for edge validation with invalid node references in `packages/graph-renderer/__tests__/core/graph.unit.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Display Multi-Type Graph Structure (Priority: P1) MVP

**Goal**: Render nodes with different types and visual properties

**Independent Test**: Provide graph with 3+ node types and verify distinct rendering

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T024 [P] [US1] Write FAILING unit test for node type visual mapping in `packages/graph-renderer/__tests__/renderers/visual-mapping.unit.test.ts`
- [ ] T025 [P] [US1] Write FAILING component test for rendering multiple node types in `packages/graph-renderer/__tests__/renderers/canvas-renderer-nodes.component.test.ts`
- [ ] T026 [P] [US1] Write FAILING component test for rendering graph with zero edges in `packages/graph-renderer/__tests__/renderers/canvas-renderer-nodes-only.component.test.ts`
- [ ] T027 [P] [US1] Write FAILING E2E test for 100+ nodes of mixed types in `packages/graph-renderer/__tests__/e2e/multi-type-rendering.e2e.test.ts`

### Implementation for User Story 1

- [ ] T028 [P] [US1] Create VisualProperties type in `packages/graph-renderer/src/core/visual-properties.ts` (size, color, shape, label, opacity)
- [ ] T029 [P] [US1] Create NodeVisualConfig type mapping in `packages/graph-renderer/src/core/visual-config.ts` for node type to visual properties
- [ ] T030 [US1] Create RendererAdapter interface in `packages/graph-renderer/src/renderers/renderer-interface.ts` with init, render, destroy, resize lifecycle methods
- [ ] T031 [US1] Implement Canvas renderer in `packages/graph-renderer/src/renderers/canvas-renderer.ts` with node type visual mapping support
- [ ] T032 [US1] Implement node shape rendering functions in `packages/graph-renderer/src/renderers/canvas-renderer.ts` (circle, square, triangle, diamond)
- [ ] T033 [US1] Implement node label rendering in `packages/graph-renderer/src/renderers/canvas-renderer.ts` with text overflow handling
- [ ] T034 [US1] Implement default visual config in `packages/graph-renderer/src/core/visual-config.ts` for undefined node types
- [ ] T035 [US1] Add error handling for missing visual config in `packages/graph-renderer/src/renderers/canvas-renderer.ts` with fallback defaults
- [ ] T036 [US1] Implement random position initialization in `packages/graph-renderer/src/utils/layout.ts` for nodes without x/y coordinates

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Render Multiple Edge Types (Priority: P1) MVP

**Goal**: Render edges with directionality and type-specific visuals

**Independent Test**: Provide graph with 3+ edge types (directed and undirected) and verify visual differentiation

### Tests for User Story 2

- [ ] T037 [P] [US2] Write FAILING unit test for edge type visual mapping in `packages/graph-renderer/__tests__/renderers/visual-mapping.unit.test.ts`
- [ ] T038 [P] [US2] Write FAILING component test for rendering directed edges with arrows in `packages/graph-renderer/__tests__/renderers/canvas-renderer-directed-edges.component.test.ts`
- [ ] T039 [P] [US2] Write FAILING component test for rendering undirected edges without arrows in `packages/graph-renderer/__tests__/renderers/canvas-renderer-undirected-edges.component.test.ts`
- [ ] T040 [P] [US2] Write FAILING component test for multiple edge types with distinct visuals in `packages/graph-renderer/__tests__/renderers/canvas-renderer-edge-types.component.test.ts`

### Implementation for User Story 2

- [ ] T041 [P] [US2] Create EdgeVisualProperties type in `packages/graph-renderer/src/core/visual-properties.ts` (color, width, style, arrowStyle, opacity)
- [ ] T042 [P] [US2] Create EdgeVisualConfig type mapping in `packages/graph-renderer/src/core/visual-config.ts` for edge type to visual properties
- [ ] T043 [US2] Extend RendererAdapter interface in `packages/graph-renderer/src/renderers/renderer-interface.ts` with edge visual config support
- [ ] T044 [US2] Implement edge rendering in `packages/graph-renderer/src/renderers/canvas-renderer.ts` with type-based visual mapping
- [ ] T045 [US2] Implement directional arrow rendering in `packages/graph-renderer/src/renderers/canvas-renderer.ts` (triangle, circle, diamond arrow styles)
- [ ] T046 [US2] Implement edge line styles in `packages/graph-renderer/src/renderers/canvas-renderer.ts` (solid, dashed, dotted)
- [ ] T047 [US2] Implement edge width scaling in `packages/graph-renderer/src/renderers/canvas-renderer.ts` based on visual config
- [ ] T048 [US2] Add error handling for invalid edge references in `packages/graph-renderer/src/renderers/canvas-renderer.ts` (missing source/target nodes)
- [ ] T049 [US2] Implement default edge visual config in `packages/graph-renderer/src/core/visual-config.ts` for undefined edge types

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Decouple Force Simulation from Rendering (Priority: P2)

**Goal**: Run simulation independently from renderer with position update events

**Independent Test**: Run simulation headlessly, verify position updates, then connect to renderer

### Tests for User Story 3

- [ ] T050 [P] [US3] Write FAILING unit test for simulation engine initialization in `packages/graph-renderer/__tests__/simulation/engine.unit.test.ts`
- [ ] T051 [P] [US3] Write FAILING unit test for simulation tick loop in `packages/graph-renderer/__tests__/simulation/engine.unit.test.ts`
- [ ] T052 [P] [US3] Write FAILING unit test for simulation pause/resume in `packages/graph-renderer/__tests__/simulation/engine.unit.test.ts`
- [ ] T053 [P] [US3] Write FAILING integration test for headless simulation with position updates in `packages/graph-renderer/__tests__/simulation/headless-simulation.integration.test.ts`
- [ ] T054 [P] [US3] Write FAILING integration test for simulation-renderer connection in `packages/graph-renderer/__tests__/simulation/renderer-connection.integration.test.ts`

### Implementation for User Story 3

- [ ] T055 [P] [US3] Create SimulationConfig type in `packages/graph-renderer/src/simulation/config.ts` (alpha, alphaMin, alphaDecay, velocityDecay, iterations)
- [ ] T056 [P] [US3] Create SimulationState enum in `packages/graph-renderer/src/simulation/state.ts` (RUNNING, PAUSED, STOPPED)
- [ ] T057 [US3] Create Simulation class in `packages/graph-renderer/src/simulation/engine.ts` with init, start, pause, resume, stop, tick methods
- [ ] T058 [US3] Implement alpha decay cooling schedule in `packages/graph-renderer/src/simulation/engine.ts` with configurable decay rate
- [ ] T059 [US3] Implement RAF-based tick loop in `packages/graph-renderer/src/simulation/engine.ts` with automatic stop at alphaMin
- [ ] T060 [US3] Create event emitter for simulation events in `packages/graph-renderer/src/simulation/engine.ts` (tick, end, pause, resume)
- [ ] T061 [US3] Implement velocity Verlet integrator in `packages/graph-renderer/src/simulation/integrator.ts` for position/velocity updates
- [ ] T062 [US3] Write FAILING unit tests for velocity Verlet integrator in `packages/graph-renderer/__tests__/simulation/integrator.unit.test.ts`
- [ ] T063 [US3] Connect simulation tick events to renderer updates in `packages/graph-renderer/src/renderers/canvas-renderer.ts`
- [ ] T064 [US3] Implement position change detection in `packages/graph-renderer/src/simulation/engine.ts` to skip rendering when positions stable

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Apply Node-Based Forces (Priority: P2)

**Goal**: Apply custom forces to nodes based on node properties

**Independent Test**: Assign different force values to nodes, verify positions reflect those forces

### Tests for User Story 4

- [ ] T065 [P] [US4] Write FAILING unit test for repulsion force calculation in `packages/graph-renderer/__tests__/forces/repulsion.unit.test.ts`
- [ ] T066 [P] [US4] Write FAILING unit test for centering force calculation in `packages/graph-renderer/__tests__/forces/centering.unit.test.ts`
- [ ] T067 [P] [US4] Write FAILING integration test for node force application with varying strengths in `packages/graph-renderer/__tests__/forces/node-force-application.integration.test.ts`
- [ ] T068 [P] [US4] Write FAILING integration test for dynamic force value updates in `packages/graph-renderer/__tests__/forces/dynamic-force-updates.integration.test.ts`
- [ ] T069a [P] [US4] Write FAILING unit test for circular environmental force calculation in `packages/graph-renderer/__tests__/forces/circular.unit.test.ts`
- [ ] T069b [P] [US4] Write FAILING unit test for linear environmental force calculation in `packages/graph-renderer/__tests__/forces/linear.unit.test.ts`
- [ ] T069c [P] [US4] Write FAILING integration test for circular force creating rotational layout in `packages/graph-renderer/__tests__/forces/circular-rotation-layout.integration.test.ts`
- [ ] T069d [P] [US4] Write FAILING integration test for linear force creating directional flow in `packages/graph-renderer/__tests__/forces/linear-directional-flow.integration.test.ts`

### Implementation for User Story 4

- [ ] T069 [P] [US4] Create Force generic interface in `packages/graph-renderer/src/forces/force-interface.ts` with signature `(nodes: Node<T>[], edges: Edge<E>[], alpha: number) => void`
- [ ] T070 [P] [US4] Create ForceConfig type in `packages/graph-renderer/src/forces/force-config.ts` for force strength and parameters
- [ ] T071 [US4] Implement repulsion force in `packages/graph-renderer/src/forces/repulsion.ts` with per-node strength based on node data
- [ ] T072 [US4] Implement centering force in `packages/graph-renderer/src/forces/centering.ts` with configurable center point
- [ ] T073 [US4] Implement force composition utility in `packages/graph-renderer/src/forces/compose.ts` for additive force accumulation
- [ ] T074 [US4] Add force registration to Simulation class in `packages/graph-renderer/src/simulation/engine.ts` with addForce, removeForce methods
- [ ] T075 [US4] Implement force application loop in `packages/graph-renderer/src/simulation/engine.ts` that applies all forces each tick
- [ ] T076 [US4] Add support for node property access in forces in `packages/graph-renderer/src/forces/force-interface.ts` via generic TNodeData
- [ ] T077 [US4] Implement force strength scaling by alpha in `packages/graph-renderer/src/simulation/engine.ts` for gradual stabilization
- [ ] T077a [P] [US4] Implement circular environmental force in `packages/graph-renderer/src/forces/circular.ts` with perpendicular vector calculation for rotation
- [ ] T077b [P] [US4] Implement linear environmental force in `packages/graph-renderer/src/forces/linear.ts` with direction vector normalization
- [ ] T077c [P] [US4] Add radius-based attenuation to circular force in `packages/graph-renderer/src/forces/circular.ts` for influence zone control
- [ ] T077d [P] [US4] Create factory functions `createCircularForce` and `createLinearForce` in `packages/graph-renderer/src/forces/index.ts` for convenient force creation

**Checkpoint**: At this point, User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - Apply Edge-Based Forces (Priority: P3)

**Goal**: Apply custom forces to edges based on edge properties/types

**Independent Test**: Create graphs with different edge types having different force parameters, verify layouts differ

### Tests for User Story 5

- [ ] T078 [P] [US5] Write FAILING unit test for attraction force calculation in `packages/graph-renderer/__tests__/forces/attraction.unit.test.ts`
- [ ] T079 [P] [US5] Write FAILING unit test for edge force with varying spring strengths in `packages/graph-renderer/__tests__/forces/attraction-spring-strength.unit.test.ts`
- [ ] T080 [P] [US5] Write FAILING integration test for edge type force configuration in `packages/graph-renderer/__tests__/forces/edge-type-forces.integration.test.ts`
- [ ] T081 [P] [US5] Write FAILING integration test for directional edge forces in `packages/graph-renderer/__tests__/forces/directional-edge-forces.integration.test.ts`

### Implementation for User Story 5

- [ ] T082 [P] [US5] Create EdgeForceConfig type in `packages/graph-renderer/src/forces/edge-force-config.ts` (springStrength, idealLength, damping)
- [ ] T083 [US5] Implement attraction force in `packages/graph-renderer/src/forces/attraction.ts` with Hooke's law spring behavior
- [ ] T084 [US5] Add per-edge-type force configuration in `packages/graph-renderer/src/forces/attraction.ts` based on edge data
- [ ] T085 [US5] Implement ideal length calculation in `packages/graph-renderer/src/forces/attraction.ts` with configurable distance per edge type
- [ ] T086 [US5] Implement spring strength scaling in `packages/graph-renderer/src/forces/attraction.ts` based on edge properties
- [ ] T087 [US5] Add directional force support in `packages/graph-renderer/src/forces/attraction.ts` for directed edges (asymmetric push/pull)
- [ ] T088 [US5] Implement damping factor in `packages/graph-renderer/src/forces/attraction.ts` to prevent oscillation

**Checkpoint**: At this point, User Stories 1-5 should all work independently

---

## Phase 8: User Story 6 - Hidden Edge Influence (Priority: P3)

**Goal**: Node properties influence layout forces even when edges not rendered

**Independent Test**: Compare layouts with same nodes but different hidden edge counts, verify positions differ

### Tests for User Story 6

- [ ] T089 [P] [US6] Write FAILING unit test for hidden edge force calculation in `packages/graph-renderer/__tests__/forces/hidden-edge-force.unit.test.ts`
- [ ] T090 [P] [US6] Write FAILING integration test for visible vs hidden edge force contribution in `packages/graph-renderer/__tests__/forces/visible-hidden-edges.integration.test.ts`
- [ ] T091 [P] [US6] Write FAILING integration test for layout with only hidden edges in `packages/graph-renderer/__tests__/forces/hidden-edges-only.integration.test.ts`

### Implementation for User Story 6

- [ ] T092 [US6] Extend Node interface in `packages/graph-renderer/src/core/node.ts` to support hidden edge count/weight properties
- [ ] T093 [US6] Create hidden edge influence utility in `packages/graph-renderer/src/utils/hidden-edge-influence.ts` to calculate force from hidden connections
- [ ] T094 [US6] Extend repulsion force in `packages/graph-renderer/src/forces/repulsion.ts` to consider hidden edge influence
- [ ] T095 [US6] Extend attraction force in `packages/graph-renderer/src/forces/attraction.ts` to consider hidden edges alongside visible edges
- [ ] T096 [US6] Add visual rendering filter in `packages/graph-renderer/src/renderers/canvas-renderer.ts` to skip hidden edges while simulation uses them
- [ ] T097 [US6] Implement hidden edge metadata storage in Graph class in `packages/graph-renderer/src/core/graph.ts` separate from visible edges

**Checkpoint**: All user stories (1-6) should now be independently functional

---

## Phase 9: Performance Optimization & Spatial Indexing

**Purpose**: Meet performance requirements (SC-003, SC-004)

### Tests for Performance

- [ ] T098 [P] Write FAILING unit test for quadtree insertion in `packages/graph-renderer/__tests__/simulation/quadtree.unit.test.ts`
- [ ] T099 [P] Write FAILING unit test for quadtree query in `packages/graph-renderer/__tests__/simulation/quadtree.unit.test.ts`
- [ ] T100 [P] Write FAILING integration test for 500 nodes at 60fps in `packages/graph-renderer/__tests__/e2e/performance-500-nodes.e2e.test.ts`
- [ ] T101 [P] Write FAILING integration test for 100 nodes stabilizing in 3 seconds in `packages/graph-renderer/__tests__/simulation/stabilization-time.integration.test.ts`
- [ ] T102 [P] Write FAILING integration test for deterministic layout with fixed seed in `packages/graph-renderer/__tests__/simulation/deterministic-layout.integration.test.ts`

### Implementation for Performance

- [ ] T103 [P] Create Quadtree data structure in `packages/graph-renderer/src/simulation/spatial-index.ts` for O(n log n) collision detection
- [ ] T104 [US4] Implement collision force in `packages/graph-renderer/src/forces/collision.ts` using quadtree for radius-based node separation
- [ ] T105 [P] Write FAILING unit tests for collision force in `packages/graph-renderer/__tests__/forces/collision.unit.test.ts`
- [ ] T106 Implement Barnes-Hut optimization for repulsion force in `packages/graph-renderer/src/forces/repulsion.ts` using quadtree
- [ ] T107 Add PRNG seeding in `packages/graph-renderer/src/utils/random.ts` for deterministic layout reproducibility
- [ ] T108 Implement Web Worker wrapper in `packages/graph-renderer/src/simulation/worker.ts` for simulation offloading
- [ ] T109 [P] Write FAILING integration test for Web Worker simulation in `packages/graph-renderer/__tests__/simulation/worker-simulation.integration.test.ts`
- [ ] T110 Implement structured clone optimization for position updates in `packages/graph-renderer/src/simulation/worker.ts`
- [ ] T111 Add performance monitoring hooks in `packages/graph-renderer/src/simulation/engine.ts` (tick duration, FPS calculation)
- [ ] T112 Implement dirty rectangle tracking in `packages/graph-renderer/src/renderers/canvas-renderer.ts` for partial redraws
- [ ] T113 Add layer separation in `packages/graph-renderer/src/renderers/canvas-renderer.ts` (static edges, dynamic nodes)

**Checkpoint**: Performance targets (SC-003, SC-004) should now be met

---

## Phase 10: Alternative Renderers (SVG Support)

**Purpose**: Demonstrate renderer abstraction with SVG implementation

### Tests for SVG Renderer

- [ ] T114 [P] Write FAILING component test for SVG node rendering in `packages/graph-renderer/__tests__/renderers/svg-renderer-nodes.component.test.ts`
- [ ] T115 [P] Write FAILING component test for SVG edge rendering in `packages/graph-renderer/__tests__/renderers/svg-renderer-edges.component.test.ts`
- [ ] T116 [P] Write FAILING E2E test for renderer swap (Canvas to SVG) in `packages/graph-renderer/__tests__/e2e/renderer-swap.e2e.test.ts`

### Implementation for SVG Renderer

- [ ] T117 Implement SVG renderer in `packages/graph-renderer/src/renderers/svg-renderer.ts` implementing RendererAdapter interface
- [ ] T118 Implement SVG node shape rendering in `packages/graph-renderer/src/renderers/svg-renderer.ts` using SVG primitives
- [ ] T119 Implement SVG edge rendering in `packages/graph-renderer/src/renderers/svg-renderer.ts` with SVG path and marker elements
- [ ] T120 Implement SVG arrow markers in `packages/graph-renderer/src/renderers/svg-renderer.ts` for directed edges
- [ ] T121 Add renderer swap support in `packages/graph-renderer/src/simulation/engine.ts` without losing simulation state
- [ ] T122 Implement visual regression tests in `packages/graph-renderer/__tests__/renderers/visual-regression.integration.test.ts` comparing Canvas and SVG outputs

**Checkpoint**: Renderer abstraction validated with two implementations

---

## Phase 11: Edge Cases & Error Handling

**Purpose**: Handle edge cases gracefully (SC-009)

### Tests for Edge Cases

- [ ] T123 [P] Write FAILING unit test for empty graph (zero nodes) in `packages/graph-renderer/__tests__/core/graph-edge-cases.unit.test.ts`
- [ ] T124 [P] Write FAILING unit test for graph with zero edges in `packages/graph-renderer/__tests__/core/graph-edge-cases.unit.test.ts`
- [ ] T125 [P] Write FAILING unit test for negative force values in `packages/graph-renderer/__tests__/forces/negative-forces.unit.test.ts`
- [ ] T126 [P] Write FAILING unit test for zero force values in `packages/graph-renderer/__tests__/forces/zero-forces.unit.test.ts`
- [ ] T127 [P] Write FAILING unit test for extreme force values in `packages/graph-renderer/__tests__/forces/extreme-forces.unit.test.ts`
- [ ] T128 [P] Write FAILING unit test for NaN/Infinity position handling in `packages/graph-renderer/__tests__/simulation/nan-positions.unit.test.ts`
- [ ] T129 [P] Write FAILING unit test for invalid node references in edges in `packages/graph-renderer/__tests__/core/invalid-edge-references.unit.test.ts`
- [ ] T130 [P] Write FAILING unit test for circular edge references in `packages/graph-renderer/__tests__/core/circular-edges.unit.test.ts`

### Implementation for Edge Cases

- [ ] T131 Add empty graph handling in `packages/graph-renderer/src/renderers/canvas-renderer.ts` with graceful no-op
- [ ] T132 Add empty graph handling in `packages/graph-renderer/src/simulation/engine.ts` with immediate stop
- [ ] T133 Implement force value validation in `packages/graph-renderer/src/forces/force-interface.ts` (clamp negatives, handle zeros, limit extremes)
- [ ] T134 Implement position validation in `packages/graph-renderer/src/simulation/integrator.ts` (clamp NaN/Infinity to viewport bounds)
- [ ] T135 Add detailed error messages for invalid node references in `packages/graph-renderer/src/core/graph.ts` with node ID reporting
- [ ] T136 Add circular edge detection in `packages/graph-renderer/src/core/graph.ts` with warning messages
- [ ] T137 Implement real-time graph update handling in `packages/graph-renderer/src/simulation/engine.ts` (add/remove nodes during simulation)
- [ ] T138 Add 10K+ node stress test in `packages/graph-renderer/__tests__/e2e/large-graph-stress.e2e.test.ts` with graceful degradation

**Checkpoint**: All edge cases handled gracefully with clear error messages

---

## Phase 12: Documentation & Finalization

**Purpose**: Complete documentation and validate constitution compliance

- [ ] T139 [P] Create README.md in `packages/graph-renderer/README.md` with installation, quickstart, and API overview
- [ ] T140 [P] Create API documentation in `packages/graph-renderer/docs/api.md` with interface descriptions and examples
- [ ] T141 [P] Create force customization guide in `packages/graph-renderer/docs/forces.md` with examples for node-based and edge-based forces
- [ ] T142 [P] Create renderer customization guide in `packages/graph-renderer/docs/renderers.md` with RendererAdapter implementation guide
- [ ] T143 [P] Create performance guide in `packages/graph-renderer/docs/performance.md` with optimization techniques and benchmarks
- [ ] T144 [P] Create examples directory in `packages/graph-renderer/examples/` with basic usage, custom forces, and renderer swap examples
- [ ] T145 [P] Add JSDoc comments to all public APIs in `packages/graph-renderer/src/` with TypeScript generic parameter documentation
- [ ] T146 Validate zero academic-specific terminology (FR-017) across all files with grep search
- [ ] T147 Run performance validation for SC-003 (500 nodes at 60fps) with measurement logging
- [ ] T148 Run performance validation for SC-004 (100 nodes stabilize in 3 seconds) with timing logs
- [ ] T149 Validate all tests follow `foo.[type].test.ts` naming convention with script check
- [ ] T150 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety) - run TypeScript strict check
  - [ ] All tests written before implementation (Test-First) - verify git history
  - [ ] Package uses `@academic-explorer/graph-renderer` alias imports (Monorepo Architecture)
  - [ ] No storage operations (Storage Abstraction N/A)
  - [ ] Performance requirements met: 60fps @ 500 nodes, 3s stabilization @ 100 nodes (Performance & Memory)
  - [ ] Atomic conventional commits created after each task group (Atomic Conventional Commits)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational - no dependencies on other stories
  - US2 (Phase 4): Can start after Foundational - extends US1 renderer but independently testable
  - US3 (Phase 5): Can start after Foundational - requires US1 for renderer connection but independently testable
  - US4 (Phase 6): Depends on US3 (simulation engine) - cannot start before Phase 5
  - US5 (Phase 7): Depends on US3 (simulation engine) - cannot start before Phase 5
  - US6 (Phase 8): Depends on US4 and US5 (force implementations) - cannot start before Phase 7
- **Performance (Phase 9)**: Depends on US3-US5 (simulation and forces) - cannot start before Phase 7
- **SVG Renderer (Phase 10)**: Depends on US1-US3 (renderer abstraction and simulation) - cannot start before Phase 5
- **Edge Cases (Phase 11)**: Depends on all user stories being complete
- **Documentation (Phase 12)**: Depends on all implementation being complete

### Within Each Phase

- Tests MUST be written and FAIL before implementation
- Utils and type guards before core types
- Core types before simulation and renderers
- Simulation engine before forces
- Forces before performance optimization
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational utility tasks marked [P] can run in parallel (within Phase 2)
- US1 and US2 tests can run in parallel (different renderer aspects)
- US1 and US2 visual property types can run in parallel (different files)
- US4 and US5 can run in parallel after US3 completes (different force types)
- All test writing within a story marked [P] can run in parallel
- Performance optimization tasks marked [P] can run in parallel (different files)
- All documentation tasks marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (node rendering)
4. Complete Phase 4: User Story 2 (edge rendering)
5. **STOP and VALIDATE**: Test US1 + US2 independently with basic static layouts
6. Deploy/demo if ready (basic graph visualization without simulation)

### Core Value (Add US3 for Simulation)

1. Complete MVP (US1 + US2)
2. Complete Phase 5: User Story 3 (force simulation decoupling)
3. **STOP and VALIDATE**: Test dynamic layouts with simulation
4. Deploy/demo (interactive force-directed graph visualization)

### Enhanced Features (Add US4 + US5 for Custom Forces)

1. Complete Core Value (US1-US3)
2. Complete Phase 6: User Story 4 (node-based forces)
3. Complete Phase 7: User Story 5 (edge-based forces)
4. **STOP and VALIDATE**: Test custom force configurations
5. Deploy/demo (fully customizable force-directed layouts)

### Full Feature Set (Add US6 + Performance + SVG)

1. Complete Enhanced Features (US1-US5)
2. Complete Phase 8: User Story 6 (hidden edge influence)
3. Complete Phase 9: Performance Optimization
4. Complete Phase 10: SVG Renderer
5. Complete Phase 11: Edge Cases
6. Complete Phase 12: Documentation
7. **FINAL VALIDATION**: All success criteria met
8. Deploy/release version 1.0.0

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (node rendering) + User Story 2 (edge rendering)
   - Developer B: User Story 3 (simulation engine)
   - Developer C: Documentation + examples setup
3. After US1-US3 complete:
   - Developer A: User Story 4 (node forces)
   - Developer B: User Story 5 (edge forces)
   - Developer C: Performance optimization (Phase 9)
4. After US4-US5 complete:
   - Developer A: User Story 6 (hidden edges)
   - Developer B: SVG Renderer (Phase 10)
   - Developer C: Edge cases (Phase 11)
5. Final: All developers on documentation and validation

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests MUST follow naming pattern: `foo.[type].test.ts` (unit/integration/component/e2e)
- Verify tests FAIL before implementing
- Commit after each task or logical group using conventional commit format: `feat(graph-renderer): description`
- Stop at any checkpoint to validate story independently
- Package MUST remain domain-agnostic (FR-017) - no academic terminology
- All imports from other packages MUST use `@academic-explorer/*` aliases, NEVER relative paths
- Tests run serially (no parallel) due to memory constraints
- Performance targets: 60fps @ 500 nodes (SC-003), 3s stabilization @ 100 nodes (SC-004)
- Deterministic layouts required for research reproducibility (use fixed PRNG seeds)
