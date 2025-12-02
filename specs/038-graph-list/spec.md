# Feature Specification: Graph List Persistent Working Set

**Feature Branch**: `038-graph-list`
**Created**: 2025-12-02
**Status**: Draft
**Input**: User description: "Introduce a 'Graph' list alongside history and bookmarks which persists the currently visible nodes"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Persist Graph Working Set (Priority: P1)

Users need a persistent working set that represents "what's currently in my graph." When exploring academic literature, users build up a graph by loading from bookmarks, searching for nodes, and expanding relationships. This working set should persist across browser sessions so users can return to their investigation exactly where they left off.

**Why this priority**: This is the foundational capability that enables all other graph list features. Without persistence, users lose their exploration context every time they reload the page.

**Independent Test**: Can be fully tested by adding nodes to the graph (via search, bookmark load, or expansion), closing the browser, reopening, and verifying the same nodes are visible.

**Acceptance Scenarios**:

1. **Given** user has loaded 5 works from bookmarks into the graph, **When** user refreshes the page, **Then** those same 5 works are still visible in the graph
2. **Given** user has expanded an author node to reveal 3 connected works, **When** user closes and reopens the browser, **Then** both the author and 3 works remain in the graph
3. **Given** user searches for and adds a specific institution to the graph, **When** user navigates away and returns to the graph page, **Then** the institution is still visible

---

### User Story 2 - Graph List Bypasses Entity Type Filters (Priority: P1)

Users need nodes in the graph working set to always be visible, regardless of entity type filter settings. Entity type filters should apply only to collection loading (bookmarks/history), not to the explicit working set. This prevents the confusing UX where expanding a node makes it "disappear" because the discovered entity type is filtered out.

**Why this priority**: This is critical for solving the expansion visibility problem. Without this, users will experience frustrating behavior where expansions appear to fail when they actually succeeded.

**Independent Test**: Can be fully tested by enabling only "works" entity type filter, adding an author to graph list, and verifying the author remains visible despite type filter.

**Acceptance Scenarios**:

1. **Given** user has enabled only "works" entity type filter and has 3 authors in graph list, **When** user views the graph, **Then** all 3 authors are visible
2. **Given** user has bookmarked works and authors, and enabled only "works" type filter, **When** user loads bookmarks, **Then** only bookmarked works appear in graph (authors filtered out from bookmarks)
3. **Given** user has 5 works in graph list and disables "works" entity type, **When** user views the graph, **Then** all 5 works remain visible (graph list bypasses type filters)
4. **Given** user expands a work node that reveals 2 institutions, **When** "institutions" type is disabled, **Then** the 2 institutions are still visible because they're in graph list

---

### User Story 3 - Add Nodes to Graph List (Priority: P1)

Users need multiple ways to add nodes to the graph list: searching and selecting nodes, loading from collections (bookmarks/history), expanding nodes to discover relationships, and through auto-population. Each addition method should record provenance (how the node was added) for transparency.

**Why this priority**: This enables users to build their working set through natural graph exploration workflows. Without this, users cannot populate the graph list.

**Independent Test**: Can be fully tested by adding a node via search, verifying it appears in graph and graph list sidebar, and checking provenance indicator.

**Acceptance Scenarios**:

1. **Given** user searches for "machine learning", **When** user selects a work from results and clicks "Add to graph", **Then** work appears in graph and graph list with provenance "user"
2. **Given** user has bookmarked 10 works, **When** user loads bookmarks with "works" filter enabled, **Then** all 10 works are added to graph list with provenance "collection-load"
3. **Given** user expands an author node, **When** system discovers 5 works the author published, **Then** all 5 works are added to graph list with provenance "expansion"
4. **Given** user has auto-population enabled, **When** system discovers citation relationships between existing nodes, **Then** newly discovered nodes are added to graph list with provenance "auto-population"

---

### User Story 4 - Remove Nodes from Graph List (Priority: P2)

Users need to remove unwanted nodes from their graph working set. This includes removing individual nodes (e.g., nodes added by auto-population that clutter the graph) and clearing the entire graph to start fresh.

**Why this priority**: This provides necessary control over the working set. Users should be able to curate their graph, not just add to it. Lower priority than P1 because users can work with the graph even without removal capabilities.

**Independent Test**: Can be fully tested by adding 5 nodes to graph list, removing 2 individually, clearing the rest, and verifying graph is empty.

**Acceptance Scenarios**:

1. **Given** graph list contains 8 nodes, **When** user clicks "Remove" on a specific node in graph list sidebar, **Then** that node disappears from graph and is removed from graph list
2. **Given** graph contains 15 nodes, **When** user clicks "Clear graph" button, **Then** all nodes disappear and graph list is empty
3. **Given** user removes a node that has edges connected to it, **When** node is removed, **Then** all connected edges are also removed from the graph

---

### User Story 5 - View and Manage Graph List (Priority: P2)

Users need visibility into their graph list working set through a dedicated UI section. This should show all nodes currently in the list, their provenance, and provide management actions (remove individual, clear all). Users should understand what's in their working set at a glance.

**Why this priority**: This provides transparency and discoverability of the graph list feature. Lower priority than P1 because the feature can work without explicit UI (nodes just appear), but UI significantly improves usability.

**Independent Test**: Can be fully tested by adding nodes via different methods and verifying the graph list sidebar correctly displays all nodes with accurate provenance indicators.

**Acceptance Scenarios**:

1. **Given** graph list contains 12 nodes added via different methods, **When** user views graph list sidebar, **Then** all 12 nodes are listed with their provenance (user, expansion, auto-population, collection-load)
2. **Given** graph list contains 20 nodes, **When** user hovers over a provenance indicator, **Then** tooltip explains how that node was added (e.g., "Added via bookmark load on 2025-12-02")
3. **Given** user views graph list sidebar, **When** user clicks on a node in the list, **Then** graph centers and highlights that node
4. **Given** graph list is empty, **When** user views graph list sidebar, **Then** helpful empty state message appears: "Your graph is empty. Add nodes by searching, loading bookmarks, or expanding nodes."

---

### User Story 6 - Graph List Size Management (Priority: P3)

Users with large graphs need the system to manage graph list size to prevent performance degradation. The system should warn users when approaching size limits and provide options to prune less-used nodes (especially auto-populated ones).

**Why this priority**: This prevents pathological cases but is not needed for basic functionality. Most users won't hit size limits during normal usage. Lowest priority because it's a safeguard for edge cases.

**Independent Test**: Can be fully tested by programmatically adding nodes until size limit is approached, verifying warning appears, and testing prune functionality.

**Acceptance Scenarios**:

1. **Given** graph list contains 900 nodes (approaching 1000 node limit), **When** user adds more nodes, **Then** system shows warning: "Graph approaching size limit (900/1000 nodes). Consider removing unused nodes."
2. **Given** graph list contains 1000 nodes and user tries to add more, **When** addition is attempted, **Then** system shows error: "Graph list is full (1000 nodes). Remove some nodes to add more."
3. **Given** graph list contains 500 nodes, 200 added via auto-population, **When** user clicks "Prune auto-populated nodes", **Then** system removes auto-populated nodes added more than 24 hours ago and not manually interacted with

---

### Edge Cases

- What happens when a node exists in both graph list and a collection (e.g., bookmarked work is also in graph list)? → Node appears once; removing from graph list doesn't affect bookmark status
- How does system handle graph list if a node's entity data is deleted or becomes unavailable from OpenAlex API? → Node remains in graph list but shows "unavailable" indicator; user can remove it
- What happens when user loads bookmarks with all entity types disabled? → Only nodes already in graph list remain visible; bookmark load adds nothing because all types are filtered
- How does system handle very large graph lists (10,000+ nodes) for performance? → Implement size limit (1000 nodes) with pruning options; warn at 900 nodes
- What happens when user clears graph while auto-population is running? → Auto-population tasks are cancelled; graph list is emptied; clear operation completes
- How does removing a node affect connected edges? → All edges connected to the removed node are also removed
- What happens if user manually adds a node that's already in graph list via different provenance? → Provenance is updated to most recent addition method; no duplicate entries

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST persist graph list across browser sessions using IndexedDB storage
- **FR-002**: System MUST store each graph list node with: entity ID, entity type, label, timestamp, and provenance (user | expansion | auto-population | collection-load)
- **FR-003**: System MUST make graph list nodes visible regardless of entity type filter settings
- **FR-004**: System MUST apply entity type filters only to collection loading (bookmarks/history), not to graph list nodes
- **FR-005**: System MUST add nodes to graph list when user searches and selects a node (provenance: user)
- **FR-006**: System MUST add nodes to graph list when loading from collections (provenance: collection-load)
- **FR-007**: System MUST add discovered nodes to graph list when user expands a node (provenance: expansion)
- **FR-008**: System MUST add discovered nodes to graph list during auto-population (provenance: auto-population)
- **FR-009**: Users MUST be able to remove individual nodes from graph list via UI control
- **FR-010**: Users MUST be able to clear all nodes from graph list via "Clear graph" action
- **FR-011**: System MUST remove all connected edges when a node is removed from graph list
- **FR-012**: System MUST display graph list contents in a dedicated sidebar UI section
- **FR-013**: System MUST show provenance indicator for each node in graph list UI
- **FR-014**: System MUST update graph list UI in real-time as nodes are added or removed
- **FR-015**: System MUST combine graph list nodes and collection nodes (filtered by type) using union logic: `visible = graph_list ∪ (collections ∩ entity_types)`
- **FR-016**: System MUST prevent duplicate nodes in graph list (same entity ID can only appear once)
- **FR-017**: System MUST enforce maximum graph list size of 1000 nodes
- **FR-018**: System MUST warn users when graph list exceeds 900 nodes
- **FR-019**: System MUST prevent adding nodes when graph list is at capacity (1000 nodes)
- **FR-020**: System MUST provide option to prune auto-populated nodes older than 24 hours
- **FR-021**: System MUST cancel ongoing auto-population tasks when user clears graph list
- **FR-022**: System MUST allow clicking on graph list node to center and highlight it in graph visualization

### Key Entities

- **Graph List Node**: Represents a node in the persistent working set
  - Entity ID (e.g., "W2741809807")
  - Entity type (works, authors, institutions, etc.)
  - Display label
  - Added timestamp
  - Provenance (how it was added: user, expansion, auto-population, collection-load)

- **Graph List**: The persistent collection of nodes currently visible in graph
  - Stored in IndexedDB as special list (alongside bookmarks, history)
  - Supports CRUD operations: add, remove, clear, list
  - Enforces size limits and uniqueness constraints

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add nodes to graph via 4 methods (search, collection load, expansion, auto-population) with 100% reliability
- **SC-002**: Graph list persists across browser sessions with zero data loss
- **SC-003**: Graph displays all graph list nodes in under 2 seconds for lists up to 1000 nodes
- **SC-004**: Expanding a node with entity type filter disabled shows discovered nodes 100% of the time (no "invisible expansion" bug)
- **SC-005**: Users can identify how each node was added to graph (provenance) in under 5 seconds
- **SC-006**: Removing a node from graph list completes in under 500ms and immediately updates UI
- **SC-007**: Graph list UI updates in real-time (under 100ms) when nodes are added or removed
- **SC-008**: System handles 1000-node graph list without performance degradation (60fps graph rendering)
- **SC-009**: Size limit warnings appear accurately when graph list exceeds 900 nodes
- **SC-010**: Clear graph operation completes in under 1 second regardless of graph size

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature avoids `any` types; GraphListNode interface uses strict typing; provenance enum type-safe
- **Test-First**: User stories include testable acceptance scenarios; implementation will follow Red-Green-Refactor; E2E tests for persistence
- **Monorepo Architecture**: Feature extends `@bibgraph/utils` storage provider interface; UI components in `apps/web`; types in `@bibgraph/types`; packages MUST NOT re-export exports from other internal packages
- **Storage Abstraction**: Graph list uses existing `CatalogueStorageProvider` interface; adds graph list as third special list alongside bookmarks/history; testable with in-memory provider
- **Performance & Memory**: Success criteria include 1000-node performance targets; size limits prevent memory issues; efficient IndexedDB queries
- **Atomic Conventional Commits**: Implementation tasks will be committed atomically with conventional commit messages; spec files committed after each phase; NEVER use `git add .`, `git add -A`, or `git commit -a`—use explicit file paths
- **Development-Stage Pragmatism**: Breaking change to node visibility logic acceptable; no migration path needed for existing graphs
- **Test-First Bug Fixes**: Any bugs discovered will have regression tests written before fixes
- **Repository Integrity**: ALL issues (tests, lint, build, audit, errors, warnings) MUST be resolved—"pre-existing" is not an excuse; entire monorepo must be deployable
- **Continuous Execution**: Implementation will proceed through all phases without pausing; spec commits after each phase completion; if no outstanding questions after /speckit.plan, automatically invoke /speckit.tasks then /speckit.implement
- **Complete Implementation**: Full feature as specified will be implemented; no simplified fallbacks without explicit user approval
- **Spec Index Maintenance**: specs/README.md will be updated when spec status changes; committed alongside spec changes
- **Build Output Isolation**: TypeScript builds to dist/, never alongside source files
- **Working Files Hygiene**: Debug screenshots, fix chain docs, and temporary artifacts will be cleaned up before commit
- **DRY Code & Configuration**: Graph list node management logic extracted to shared utility; provenance types centralized; no duplicate storage operations
- **Presentation/Functionality Decoupling**: Graph list UI components (sidebar, node list) separate from business logic; logic in `use-graph-list` hook; storage operations in provider
- **No Magic Numbers/Values**: Size limits (1000 nodes, 900 warning threshold, 24-hour prune age) extracted to named constants
- **Agent Embed Link Format**: Agent instruction files use `[@path](path)` format in blockquotes for document embeds
- **Documentation Token Efficiency**: AGENTS.md, README.md, and constitution are kept deduplicated and concise; hierarchical embedding preferred
- **Canonical Hash Computed Colours**: Graph list UI nodes use hash-computed colours from entity IDs; provenance badges use consistent colour scheme
