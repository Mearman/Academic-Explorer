# Feature Specification: Progressive Graph Expansion Pathfinding

**Feature Branch**: `037-progressive-pathfinding`
**Created**: 2025-12-02
**Status**: Draft
**Input**: User description: "Progressive Graph Expansion Pathfinding - When pathfinding returns no path, automatically expand node relationships to discover connections. Prioritize expansion based on relationship type meaningfulness (e.g., author-work-work-author citation chains preferred over author-work-source-work-author journal chains)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find Path With Automatic Expansion (Priority: P1) 🎯 MVP

A researcher selects two academic entities (e.g., two authors) and requests to find a path between them. The system discovers there's no direct path in the current graph. Instead of simply reporting "no path found," the system automatically expands relationships from both endpoints, progressively discovering connections until a path is found or a limit is reached.

**Why this priority**: This is the core value proposition - transforming a "no path" dead end into actionable discovery. Without this, users must manually click and expand nodes blindly hoping to find connections.

**Independent Test**: Select two unconnected authors in a sparse graph, trigger "Find Path with Expansion", observe system automatically fetching relationships until a citation chain is discovered.

**Acceptance Scenarios**:

1. **Given** two nodes exist in the graph with no connecting path, **When** user requests pathfinding with expansion enabled, **Then** system automatically expands node relationships until a path is found or expansion budget is exhausted
2. **Given** pathfinding with expansion is running, **When** a path is discovered, **Then** system immediately stops expanding and returns the found path
3. **Given** expansion budget is set to 10 API calls, **When** 10 expansions complete without finding a path, **Then** system stops and reports "no path found within expansion budget"
4. **Given** pathfinding with expansion is in progress, **When** user cancels the operation, **Then** expansion stops immediately and partial results are preserved in the graph

---

### User Story 2 - Relationship Type Priority (Priority: P2)

When multiple expansion opportunities exist, the system prioritizes which nodes to expand based on relationship type meaningfulness. Citation-based paths (author → work → cited_work → author) are preferred over publication venue paths (author → work → source → work → author).

**Why this priority**: Ensures discovered paths are academically meaningful rather than just any connection. A citation chain represents intellectual influence; a journal co-publication is a weaker signal.

**Independent Test**: Configure relationship priorities, trigger expansion between two authors, verify the discovered path uses high-priority relationship types (citations/authorships) over low-priority types (source/topic).

**Acceptance Scenarios**:

1. **Given** relationship type priorities are configured with REFERENCE highest and PUBLICATION lowest, **When** expansion discovers multiple potential paths, **Then** the returned path uses the highest-priority relationship types available
2. **Given** a path exists through REFERENCE relationships requiring 3 expansions, and a path exists through SOURCE relationships requiring 2 expansions, **When** pathfinding completes, **Then** the REFERENCE path is returned (quality over brevity)
3. **Given** user has not configured custom priorities, **When** expansion runs, **Then** default priorities apply (REFERENCE > AUTHORSHIP > AFFILIATION > TOPIC > PUBLICATION)

---

### User Story 3 - Bidirectional Expansion Strategy (Priority: P3)

The system uses a bidirectional expansion strategy, alternating between expanding from the source node frontier and the target node frontier. This typically finds paths faster than expanding from only one direction.

**Why this priority**: Performance optimization. Bidirectional search reduces the search space exponentially compared to unidirectional expansion.

**Independent Test**: Compare expansion count when finding path between two authors using bidirectional vs. unidirectional strategy; bidirectional should require fewer API calls.

**Acceptance Scenarios**:

1. **Given** source and target nodes both have unexpanded relationships, **When** expansion begins, **Then** system alternates between expanding from source frontier and target frontier
2. **Given** source frontier has 5 unexpanded neighbors and target has 1, **When** selecting next expansion, **Then** system may prioritize the target side to balance frontiers
3. **Given** frontiers meet (shared node discovered), **When** connection is detected, **Then** system immediately constructs and returns the complete path

---

### User Story 4 - Expansion Progress Feedback (Priority: P4)

Users see real-time feedback during progressive expansion: current expansion count, nodes discovered, whether frontiers are approaching each other.

**Why this priority**: Long-running operations need user feedback to maintain trust and allow informed cancellation decisions.

**Independent Test**: Trigger expansion between distant nodes, observe UI updating with progress information at each expansion step.

**Acceptance Scenarios**:

1. **Given** expansion is in progress, **When** each node is expanded, **Then** UI displays: expansions used, total nodes in graph, distance between frontiers (if calculable)
2. **Given** expansion is running, **When** user views progress, **Then** they can see which specific node is currently being expanded
3. **Given** expansion completes (success or budget exhausted), **Then** UI displays summary: total expansions, nodes added, path found (yes/no), path quality score

---

### Edge Cases

- What happens when source or target node doesn't exist in the graph? → Error: "Source/target node must exist before pathfinding"
- What happens when source and target are the same node? → Return trivial path of length 0
- What happens when a path already exists without expansion? → Return existing path immediately without any API calls
- What happens when expansion discovers cycles? → Track visited nodes; never re-expand an already-expanded node
- What happens when API rate limits are hit during expansion? → Pause expansion, respect rate limit backoff, resume automatically
- What happens when an API call fails? → Skip that node, continue with other candidates, report partial failure in results
- What happens when expansion budget is set to 0? → Equivalent to standard pathfinding (no expansion)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST check for existing path before initiating any expansions
- **FR-002**: System MUST track an "expansion budget" limiting total API calls per pathfinding request
- **FR-003**: System MUST prioritize expansion candidates based on configurable relationship type weights
- **FR-004**: System MUST use bidirectional expansion strategy, maintaining separate source and target frontiers
- **FR-005**: System MUST detect when frontiers meet (shared node exists in both) and construct the complete path
- **FR-006**: System MUST stop expansion immediately upon finding a path (no unnecessary API calls)
- **FR-007**: System MUST provide progress callbacks during expansion for UI updates
- **FR-008**: System MUST handle API failures gracefully, continuing with remaining candidates
- **FR-009**: System MUST respect OpenAlex API rate limits during expansion
- **FR-010**: System MUST persist all discovered nodes and edges to the graph during expansion
- **FR-011**: System MUST allow users to cancel in-progress expansion operations
- **FR-012**: System MUST return a "path quality score" based on relationship types used in the discovered path
- **FR-013**: System MUST support configurable maximum expansion depth (hops from source/target)

### Key Entities

- **ExpansionBudget**: Maximum API calls allowed per pathfinding request (default: 10, range: 0-50)
- **RelationshipPriority**: Mapping of relationship types to numeric priority weights (lower = better)
- **ExpansionFrontier**: Set of nodes at the current expansion boundary, with their distances from origin
- **PathQualityScore**: Computed value based on sum of relationship priorities in discovered path
- **ExpansionProgress**: Current state including expansions used, nodes discovered, frontier sizes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find paths between previously unconnected nodes in under 30 seconds (with default 10-expansion budget)
- **SC-002**: System discovers paths using default budget 80% of the time when a 3-hop path exists
- **SC-003**: Bidirectional expansion uses 40% fewer API calls on average compared to unidirectional for paths of 4+ hops
- **SC-004**: Users can cancel expansion operations with response time under 500ms
- **SC-005**: Progress updates display within 200ms of each expansion completing
- **SC-006**: Path quality scores correctly rank citation-based paths higher than venue-based paths
- **SC-007**: System handles API failures gracefully with 0 unhandled errors during expansion

## Assumptions

- Users have network connectivity to the OpenAlex API during expansion operations
- The OpenAlex API rate limit (10 requests/second) is sufficient for interactive expansion
- Most academically-related entities can be connected within 5-6 hops through citations/authorships
- Users prefer finding meaningful paths over finding the shortest path in hops
- Default relationship priorities (REFERENCE > AUTHORSHIP > AFFILIATION > TOPIC > PUBLICATION) align with typical research use cases

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature uses proper TypeScript types; no `any` types; Zod schemas for API response validation
- **Test-First**: User stories include testable acceptance scenarios; implementation will follow Red-Green-Refactor
- **Monorepo Architecture**: Feature extends `apps/web/src/services/graph-algorithms.ts` and `packages/client/src/cache/dexie/graph-expansion.ts`
- **Storage Abstraction**: Uses existing PersistentGraph interface for storing discovered nodes/edges
- **Performance & Memory**: Expansion budget prevents runaway API calls; bidirectional strategy minimizes search space
- **Atomic Conventional Commits**: Implementation tasks will be committed atomically with conventional commit messages
- **Development-Stage Pragmatism**: Breaking changes acceptable; API may evolve during implementation
- **Repository Integrity**: ALL issues must be resolved; complete test coverage for expansion logic
- **Continuous Execution**: Implementation will proceed through all phases without pausing
- **Complete Implementation**: Full bidirectional expansion with priorities will be implemented
- **Spec Index Maintenance**: specs/README.md will be updated when spec status changes
- **Build Output Isolation**: TypeScript builds to dist/, never alongside source files
- **Working Files Hygiene**: No debug artifacts committed
- **DRY Code & Configuration**: Relationship priorities defined once as constants; shared utility functions
- **Presentation/Functionality Decoupling**: Expansion logic in services; progress UI in components; both independently testable
