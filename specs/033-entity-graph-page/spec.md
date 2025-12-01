# Feature Specification: Entity Graph Page

**Feature Branch**: `033-entity-graph-page`
**Created**: 2025-12-01
**Status**: Draft
**Input**: User description: "abstract the functionality of http://localhost:5173/#/algorithms and use it to build a http://localhost:5173/#/graph page which uses real entity data and relationships"

## Overview

Extract the reusable graph visualization and algorithm functionality from the algorithms demonstration page into shared components/hooks, then create a new `/graph` page that displays real academic entities and their relationships from the repository store. This transforms the demo-only algorithms page into a production-ready graph exploration tool for actual OpenAlex data.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Repository Graph (Priority: P1)

As a researcher, I want to see all entities in my repository displayed as an interactive graph so that I can visualize the relationships between works, authors, institutions, and other academic entities I've collected.

**Why this priority**: This is the core value proposition - visualizing real data. Without this, the page has no purpose.

**Independent Test**: Can be fully tested by adding entities to the repository from entity detail pages, navigating to `/graph`, and seeing the graph populate with those entities.

**Acceptance Scenarios**:

1. **Given** I have added entities to my repository, **When** I navigate to `/graph`, **Then** I see all repository entities displayed as nodes with edges representing their relationships
2. **Given** I have an empty repository, **When** I navigate to `/graph`, **Then** I see an empty state message encouraging me to add entities
3. **Given** I have entities with relationships in my repository, **When** I view the graph, **Then** edges correctly connect related entities (e.g., author to work, work to institution)

---

### User Story 2 - Interactive Graph Exploration (Priority: P1)

As a researcher, I want to interact with the graph through panning, zooming, and node selection so that I can explore dense networks of academic relationships.

**Why this priority**: Interactivity is essential for any useful graph visualization - a static graph provides minimal value.

**Independent Test**: Can be fully tested by loading a graph with 10+ nodes and verifying pan, zoom, click, and hover behaviors work correctly.

**Acceptance Scenarios**:

1. **Given** I am viewing a graph, **When** I click and drag on the background, **Then** the view pans in the direction I drag
2. **Given** I am viewing a graph, **When** I scroll or pinch, **Then** the view zooms in or out
3. **Given** I am viewing a graph, **When** I click a node, **Then** that node and its immediate neighbors are highlighted
4. **Given** I am viewing a graph, **When** I hover over a node, **Then** I see a tooltip with the entity's label and type

---

### User Story 3 - Apply Graph Algorithms (Priority: P2)

As a researcher, I want to run graph algorithms (community detection, pathfinding, etc.) on my repository data so that I can discover patterns, clusters, and relationships I might have missed.

**Why this priority**: This adds analytical value beyond simple visualization, but requires the base visualization to work first.

**Independent Test**: Can be fully tested by loading a repository with interconnected entities, running community detection, and verifying nodes are colored by community.

**Acceptance Scenarios**:

1. **Given** I am viewing my repository graph, **When** I run community detection, **Then** nodes are colored by their detected community
2. **Given** I am viewing my repository graph with a selected source and target, **When** I run shortest path, **Then** the path between them is highlighted
3. **Given** I am viewing my repository graph, **When** I run k-core decomposition, **Then** only the k-core subgraph is highlighted

---

### User Story 4 - Toggle Between 2D and 3D Views (Priority: P2)

As a researcher, I want to switch between 2D and 3D graph views so that I can explore complex networks from different perspectives.

**Why this priority**: 3D can help disambiguate dense graphs, but 2D is often sufficient and performs better.

**Independent Test**: Can be fully tested by toggling the view mode switch and verifying the visualization changes appropriately.

**Acceptance Scenarios**:

1. **Given** I am viewing a graph in 2D mode, **When** I toggle to 3D mode, **Then** the same nodes and edges render in a 3D space with orbit controls
2. **Given** I am viewing a graph in 3D mode, **When** I toggle back to 2D mode, **Then** the visualization returns to 2D with pan/zoom controls

---

### User Story 5 - Filter Graph Contents (Priority: P3)

As a researcher, I want to filter which entity types and relationship types appear in the graph so that I can focus on specific aspects of my data.

**Why this priority**: Filtering is an enhancement that helps with large datasets but isn't required for basic functionality.

**Independent Test**: Can be fully tested by unchecking entity type filters and verifying nodes of that type disappear from the graph.

**Acceptance Scenarios**:

1. **Given** I am viewing a graph with multiple entity types, **When** I uncheck "Authors" in the filter, **Then** all author nodes and their edges are hidden
2. **Given** I have filtered out some entity types, **When** I re-enable them, **Then** those nodes reappear in the graph

---

### Edge Cases

- What happens when the repository contains entities with no relationships to each other? The graph shows disconnected components.
- What happens when the repository contains only one entity? The graph shows a single node with no edges.
- What happens when the graph has too many nodes (1000+)? Performance may degrade; consider pagination or sampling (future enhancement).
- How does the system handle cycles in relationships? Cycles are displayed as-is; shortest path correctly handles cyclic graphs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `/graph` route that displays repository entities as an interactive graph
- **FR-002**: System MUST reuse existing ForceGraphVisualization and ForceGraph3DVisualization components from algorithms page
- **FR-003**: System MUST load graph data from the repository store (nodes from repositoryNodes, edges from repositoryEdges)
- **FR-004**: System MUST display nodes colored by entity type using existing hash-based color scheme
- **FR-005**: System MUST display edges styled by relationship type using existing edge-styles
- **FR-006**: System MUST provide 2D/3D view toggle with preference persistence
- **FR-007**: System MUST provide algorithm controls (community detection, pathfinding, etc.) reused from algorithms page
- **FR-008**: System MUST show an empty state when repository has no entities
- **FR-009**: System MUST update the graph when repository contents change
- **FR-010**: System MUST allow node selection and highlight connected nodes/edges
- **FR-011**: System MUST provide fit-to-view controls (all nodes, selected nodes)
- **FR-012**: System MUST provide simulation toggle (enable/disable force layout)

### Key Entities

- **GraphNode**: Represents an academic entity (work, author, institution, etc.) with position, label, entityType, and entityId
- **GraphEdge**: Represents a relationship between entities with source, target, type (RelationType), and direction
- **RepositoryState**: Contains repositoryNodes and repositoryEdges maps representing user's collected entities

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their repository data as a graph within 2 seconds of navigating to `/graph`
- **SC-002**: Graph supports at least 500 nodes with smooth interaction (pan/zoom at 30+ FPS)
- **SC-003**: Community detection results display within 500ms for graphs under 500 nodes
- **SC-004**: All existing algorithm functionality from `/algorithms` works identically on `/graph` with real data
- **SC-005**: 100% of algorithm-related code is extracted into reusable hooks/components (no duplication)

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature uses existing typed GraphNode/GraphEdge interfaces from @bibgraph/types; no `any` types
- **Test-First**: User stories include testable acceptance scenarios; implementation will follow Red-Green-Refactor
- **Monorepo Architecture**: New route in apps/web; shared graph components may move to packages/ui if not already there
- **Storage Abstraction**: Uses existing repository-store which wraps Dexie; no direct IndexedDB access
- **Performance & Memory**: Success criteria include 500-node performance target; serial test execution maintained
- **Atomic Conventional Commits**: Each extraction (hooks, components, route) committed separately
- **Development-Stage Pragmatism**: Breaking changes to algorithms page acceptable if needed for abstraction
- **Test-First Bug Fixes**: Any bugs discovered will have regression tests written before fixes
- **Repository Integrity**: All tests/lint/build must pass before completion
- **Continuous Execution**: Implementation will proceed through all phases without pausing
- **Complete Implementation**: Full feature as specified will be implemented; no simplified fallbacks
- **Spec Index Maintenance**: specs/README.md will be updated when spec status changes
- **Build Output Isolation**: TypeScript builds to dist/, never alongside source files
- **Working Files Hygiene**: Debug screenshots and temporary artifacts cleaned up before commit
- **DRY Code & Configuration**: Graph visualization logic extracted to shared components/hooks; no duplication between algorithms and graph pages
- **Presentation/Functionality Decoupling**: Graph algorithms in hooks (use-graph-algorithms.ts); rendering in components (ForceGraphVisualization); page connects them
