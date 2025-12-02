# Feature Specification: Enhanced Weighted Traversal

**Feature Branch**: `036-enhanced-weighted-traversal`
**Created**: 2025-12-02
**Status**: Draft
**Input**: User description: "Enhanced Weighted Traversal - Add edge type filtering, node property weights, and arbitrary entity property access for weighted graph traversal"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter Paths by Relationship Type (Priority: P1)

As a researcher exploring citation networks, I want to find shortest paths that only traverse specific relationship types (e.g., only CITES or only AUTHORSHIP edges), so I can understand how entities are connected through particular relationship semantics.

**Why this priority**: Edge type filtering is the most fundamental missing capability. Without it, users cannot constrain traversals to semantically meaningful paths (e.g., "show me only citation paths" vs "show me authorship connections").

**Independent Test**: Can be fully tested by selecting two nodes, choosing one or more edge types from a filter, and verifying the path only uses edges of those types. Delivers immediate value by enabling relationship-specific path discovery.

**Acceptance Scenarios**:

1. **Given** a graph with works connected by CITES, AUTHORSHIP, and TOPIC edges, **When** I search for a path from Work A to Work B with edge types filtered to only CITES, **Then** the returned path contains only CITES edges
2. **Given** a path search with edge type filter set to [AUTHORSHIP, AFFILIATION], **When** no path exists using only those edge types, **Then** the system reports "No path exists" (not a path using other edge types)
3. **Given** the Advanced Options panel in ShortestPathItem, **When** I open edge type filtering, **Then** I see a multi-select of all available relationship types

---

### User Story 2 - Weight Paths by Node Properties (Priority: P2)

As a researcher analyzing impact, I want to weight traversals by node properties like citation count or h-index, so I can find paths that pass through high-impact or low-impact nodes.

**Why this priority**: Node property weighting enables finding "influential paths" (through highly-cited nodes) or "emerging paths" (through newer, less-cited work), which is critical for academic network analysis but requires more complex data access than edge filtering.

**Independent Test**: Can be fully tested by selecting source/target, choosing a node property weight (e.g., cited_by_count), and verifying that the path prioritizes or de-prioritizes nodes based on that property. Delivers value by enabling impact-aware pathfinding.

**Acceptance Scenarios**:

1. **Given** nodes with varying cited_by_count values, **When** I search for a path weighted by cited_by_count (higher = shorter), **Then** the path preferentially routes through highly-cited nodes
2. **Given** node property weighting enabled, **When** a node lacks the selected property, **Then** the system uses a configurable default value (not failing)
3. **Given** the weight configuration UI, **When** I select "Node Property" as weight source, **Then** I can choose from available numeric node properties

---

### User Story 3 - Custom Composite Weight Functions (Priority: P3)

As a power user, I want to define custom weight calculations that combine edge and node properties (e.g., edge score multiplied by target node citation count), so I can model complex traversal preferences.

**Why this priority**: Composite weights are the most flexible but also most complex capability. They build on edge and node property access (P1 and P2) and serve advanced use cases. Most users will be satisfied with simpler property-based weights.

**Independent Test**: Can be fully tested by providing a weight expression/configuration that references both edge and node properties, executing pathfinding, and verifying the path reflects the composite calculation. Delivers value for advanced research scenarios.

**Acceptance Scenarios**:

1. **Given** a weight function combining edge.score and target.cited_by_count, **When** I search for a path, **Then** the path reflects the combined weight calculation
2. **Given** a composite weight references a missing property, **When** traversal executes, **Then** the system applies default values without crashing
3. **Given** the Advanced Options panel, **When** I select "Custom Formula" weight mode, **Then** I can specify a calculation involving edge and node properties

---

### Edge Cases

- What happens when edge type filter excludes all edge types? System should report "No edges match filter" before attempting traversal
- What happens when selected node property exists on some nodes but not others? Use configurable default (default: 1) with clear documentation
- What happens when a composite weight formula produces negative or zero values? Clamp to minimum positive value (0.001) to ensure valid Dijkstra weights
- What happens when entity data is not yet loaded for nodes in the path? Provide option to use only indexed properties (fast) vs fetch full entity data (complete but slower)
- What happens when the graph has millions of nodes? Ensure weight calculations are efficient (O(1) per edge/node access)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow filtering edges by one or more RelationType values during traversal
- **FR-002**: System MUST provide UI controls (multi-select) for selecting allowed edge types in the Advanced Options panel
- **FR-003**: System MUST support weighting paths by numeric node properties (e.g., cited_by_count, works_count, h_index)
- **FR-004**: System MUST provide UI for selecting node property as weight source with inversion option
- **FR-005**: System MUST apply configurable default values when properties are missing from nodes or edges
- **FR-006**: System MUST support custom weight functions that access both edge properties and source/target node properties
- **FR-007**: System MUST ensure all weight calculations produce positive values suitable for Dijkstra's algorithm
- **FR-008**: System MUST preserve backward compatibility with existing WeightConfig and TraversalOptions interfaces
- **FR-009**: System MUST display the calculated weight/distance in path results, regardless of weight source

### Key Entities

- **TraversalOptions**: Extended to include `edgeTypes?: RelationType[]` filter
- **WeightConfig**: Extended to support `nodeProperty?: string` and `compositeWeightFn?` configurations
- **GraphNode**: Must expose numeric properties for weighting (cited_by_count, works_count via metadata)
- **GraphEdge**: Already exposes score, weight, authorPosition, isCorresponding, isOpenAccess
- **WeightSource**: New concept representing the origin of weight values (edge property, node property, or composite function)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can filter paths by edge type, with results containing only edges of selected types (100% accuracy)
- **SC-002**: Users can weight paths by node citation count, with path routing demonstrably affected by node values
- **SC-003**: Path calculations complete within 500ms for graphs up to 5,000 nodes/20,000 edges
- **SC-004**: All existing weighted traversal tests continue to pass (backward compatibility)
- **SC-005**: New traversal options are discoverable in UI within 2 clicks from the shortest path panel
- **SC-006**: Users can combine edge type filtering with weight configuration in a single query

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature introduces typed `edgeTypes` filter using existing `RelationType` union; new weight source types are strictly typed
- **Test-First**: User stories include testable acceptance scenarios; unit tests for new filtering/weighting logic before implementation
- **Monorepo Architecture**: Extends existing `@bibgraph/types` (TraversalOptions, WeightConfig), `apps/web` services and hooks
- **Storage Abstraction**: Uses PersistentGraphAdapter for edge filtering; no direct IndexedDB access
- **Performance & Memory**: SC-003 defines performance target; weight functions execute O(1) per edge
- **Atomic Conventional Commits**: Implementation split into: types, service layer, hooks, UI components
- **Development-Stage Pragmatism**: May extend existing interfaces without backward compatibility shims
- **Test-First Bug Fixes**: Any edge cases discovered during implementation get regression tests first
- **Repository Integrity**: All changes must pass typecheck, test, lint, build before commit
- **Continuous Execution**: Implementation proceeds through all phases; spec commits after each
- **Complete Implementation**: Full edge type filtering and node property weighting; no partial implementations
- **Spec Index Maintenance**: specs/README.md updated when this spec completes
- **Build Output Isolation**: TypeScript builds to dist/ directories
- **Working Files Hygiene**: No debug files committed
- **DRY Code & Configuration**: Weight function builders reuse existing patterns; no duplicate filtering logic
- **Presentation/Functionality Decoupling**: Weight config logic in services/hooks; UI only renders controls and displays results
