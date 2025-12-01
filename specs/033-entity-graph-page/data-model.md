# Data Model: Entity Graph Page

**Date**: 2025-12-01
**Feature**: 033-entity-graph-page

## Overview

This feature primarily consumes existing data models from the repository store and graph visualization components. No new database schemas or storage structures are required.

## Existing Entities (Reused)

### GraphNode (from @bibgraph/types)

Represents an academic entity in the graph visualization.

```typescript
interface GraphNode {
  id: string;              // Unique identifier (e.g., "A5017898742")
  entityType: EntityType;  // 'works' | 'authors' | 'sources' | ... (12 types)
  label: string;           // Display name
  entityId: string;        // OpenAlex ID
  externalIds: string[];   // Additional external identifiers
  x?: number;              // X position (set by force simulation)
  y?: number;              // Y position (set by force simulation)
  z?: number;              // Z position (3D mode only)
}
```

### GraphEdge (from @bibgraph/types)

Represents a relationship between entities.

```typescript
interface GraphEdge {
  id: string;              // Unique edge identifier
  source: string;          // Source node ID
  target: string;          // Target node ID
  type: RelationType;      // Relationship type (e.g., 'AUTHORSHIP', 'AFFILIATION')
  direction?: 'inbound' | 'outbound';  // Edge direction indicator
}
```

### EntityType (from @bibgraph/types)

All 12 OpenAlex entity types:
```typescript
type EntityType =
  | 'works'
  | 'authors'
  | 'sources'
  | 'institutions'
  | 'concepts'
  | 'keywords'
  | 'funders'
  | 'publishers'
  | 'topics'
  | 'subfields'
  | 'fields'
  | 'domains';
```

### RelationType (from @bibgraph/types)

All 22 relationship types:
```typescript
enum RelationType {
  AUTHORSHIP = 'AUTHORSHIP',
  AFFILIATION = 'AFFILIATION',
  PUBLICATION = 'PUBLICATION',
  FUNDED_BY = 'FUNDED_BY',
  REFERENCE = 'REFERENCE',
  RELATED_TO = 'RELATED_TO',
  HOST_ORGANIZATION = 'HOST_ORGANIZATION',
  LINEAGE = 'LINEAGE',
  // ... and 14 more
}
```

## New Types (Feature-Specific)

### GraphVisualizationState

State managed by the `useGraphVisualization` hook:

```typescript
interface GraphVisualizationState {
  // Highlighting
  highlightedNodes: Set<string>;
  highlightedPath: string[];

  // Community coloring
  communityAssignments: Map<string, number>;  // nodeId -> communityId
  communityColors: Map<number, string>;       // communityId -> color

  // View settings
  displayMode: 'highlight' | 'filter';
  enableSimulation: boolean;
  viewMode: '2D' | '3D';

  // Path selection (for shortest path algorithm)
  pathSource: string | null;
  pathTarget: string | null;
}
```

### RepositoryGraphState

State returned by the `useRepositoryGraph` hook:

```typescript
interface RepositoryGraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  loading: boolean;
  isEmpty: boolean;
  error: Error | null;
}
```

### GraphVisualizationActions

Actions/handlers from `useGraphVisualization`:

```typescript
interface GraphVisualizationActions {
  // Node highlighting
  highlightNodes: (nodeIds: string[]) => void;
  highlightPath: (path: string[]) => void;
  clearHighlights: () => void;

  // Community handling
  setCommunitiesResult: (
    assignments: Map<string, number>,
    colors: Map<number, string>
  ) => void;
  selectCommunity: (communityId: number, nodeIds: string[]) => void;

  // View controls
  setDisplayMode: (mode: 'highlight' | 'filter') => void;
  toggleSimulation: () => void;
  setViewMode: (mode: '2D' | '3D') => void;

  // Path selection
  setPathSource: (nodeId: string | null) => void;
  setPathTarget: (nodeId: string | null) => void;

  // Node interaction
  handleNodeClick: (node: GraphNode) => void;
  handleBackgroundClick: () => void;
}
```

## Data Flow

```
┌─────────────────────┐
│  Repository Store   │
│  (IndexedDB/Dexie)  │
└─────────┬───────────┘
          │
          │ getRepositoryState()
          ▼
┌─────────────────────┐
│  useRepositoryGraph │
│  (polling hook)     │
└─────────┬───────────┘
          │
          │ { nodes, edges, loading, isEmpty }
          ▼
┌─────────────────────┐
│  GraphPageContent   │
│  (container)        │
└─────────┬───────────┘
          │
          ├──────────────────────────────┐
          │                              │
          ▼                              ▼
┌─────────────────────┐    ┌─────────────────────┐
│ ForceGraphVis (2D)  │    │    AlgorithmTabs    │
│ ForceGraph3DVis     │    │    (algorithm UI)   │
└─────────────────────┘    └─────────────────────┘
```

## State Relationships

```
useGraphVisualization
├── highlightedNodes ────► ForceGraphVisualization.highlightedNodeIds
├── highlightedPath ─────► ForceGraphVisualization.highlightedPath
├── communityAssignments ► ForceGraphVisualization.communityAssignments
├── communityColors ─────► ForceGraphVisualization.communityColors
├── displayMode ─────────► ForceGraphVisualization.displayMode
├── enableSimulation ────► ForceGraphVisualization.enableSimulation
├── pathSource ──────────► AlgorithmTabs.pathSource
└── pathTarget ──────────► AlgorithmTabs.pathTarget
```

## Validation Rules

### GraphNode Validation
- `id`: Non-empty string
- `entityType`: Must be valid EntityType
- `label`: Non-empty string (display name)
- `entityId`: Valid OpenAlex ID format (prefix + digits)

### GraphEdge Validation
- `id`: Non-empty string
- `source`: Must reference existing node ID
- `target`: Must reference existing node ID
- `type`: Must be valid RelationType

## Storage Considerations

### No New Storage Required
This feature reads from existing repository storage. The repository-store manages:
- `bibgraph-repository` IndexedDB database
- `nodes` table: RepositoryNodeRecord
- `edges` table: RepositoryEdgeRecord
- `config` table: Configuration/preferences

### State Persistence
- View mode (2D/3D): Persisted via `useViewModePreference` hook (localStorage)
- Simulation state: Session-only (not persisted)
- Highlighting/path selection: Session-only (not persisted)
- Community results: Session-only (not persisted)
