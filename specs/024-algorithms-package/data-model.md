# Data Model: Algorithms Package

**Feature**: Algorithms Package
**Date**: 2025-11-24
**Status**: Complete

## Overview

This document defines the core data structures and types used throughout the algorithms package. All types use discriminated unions for type safety and pattern matching.

---

## Core Types

### Result<T, E>

Discriminated union for operations that can fail.

```typescript
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Helper constructors
function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

**Invariants**:
- Exactly one variant is true at runtime
- `ok: true` implies `value` property exists
- `ok: false` implies `error` property exists
- Type narrowing via `if (result.ok)` pattern

**Usage Pattern**:
```typescript
const result = someOperation();
if (result.ok) {
  console.log(result.value); // Type: T
} else {
  console.error(result.error); // Type: E
}
```

---

### Option<T>

Discriminated union for optional values.

```typescript
type Option<T> =
  | { some: true; value: T }
  | { some: false };

// Helper constructors
function Some<T>(value: T): Option<T> {
  return { some: true, value };
}

function None<T>(): Option<T> {
  return { some: false };
}
```

**Invariants**:
- Exactly one variant is true at runtime
- `some: true` implies `value` property exists
- `some: false` has no `value` property
- Type narrowing via `if (option.some)` pattern

**Usage Pattern**:
```typescript
const option = findNode(id);
if (option.some) {
  console.log(option.value); // Type: T
} else {
  console.log('Not found');
}
```

---

## Graph Entities

### Node

Generic node type with discriminated union support for heterogeneous graphs.

```typescript
interface Node {
  id: string;              // Unique identifier (required)
  type: string;            // Discriminator field (required)
  [key: string]: unknown;  // Type-specific payload
}

// Example: Academic entity nodes
type WorkNode = {
  id: string;
  type: 'work';
  title: string;
  year: number;
  citationCount: number;
};

type AuthorNode = {
  id: string;
  type: 'author';
  name: string;
  hIndex: number;
};

type InstitutionNode = {
  id: string;
  type: 'institution';
  name: string;
  country: string;
};

type AcademicNode = WorkNode | AuthorNode | InstitutionNode;
```

**Invariants**:
- `id` must be unique within a graph (enforced by Graph.addNode)
- `type` field enables runtime type narrowing
- Node IDs are strings (comparison via `===`)

**Type Narrowing Example**:
```typescript
function processNode(node: AcademicNode) {
  if (node.type === 'work') {
    console.log(node.title);        // Type: WorkNode
    console.log(node.citationCount);
  } else if (node.type === 'author') {
    console.log(node.name);         // Type: AuthorNode
    console.log(node.hIndex);
  }
}
```

---

### Edge

Generic edge type with discriminated union support for heterogeneous graphs.

```typescript
interface Edge {
  id: string;              // Unique identifier (required)
  source: string;          // Source node ID (required)
  target: string;          // Target node ID (required)
  type: string;            // Discriminator field (required)
  weight?: number;         // Optional edge weight (default: 1)
  [key: string]: unknown;  // Type-specific attributes
}

// Example: Academic relationship edges
type CitationEdge = {
  id: string;
  source: string;  // Citing work
  target: string;  // Referenced work
  type: 'citation';
  year: number;
};

type AuthorshipEdge = {
  id: string;
  source: string;  // Work
  target: string;  // Author
  type: 'authorship';
  position: number;  // Author position (1st, 2nd, etc.)
};

type AcademicEdge = CitationEdge | AuthorshipEdge;
```

**Invariants**:
- `source` and `target` must reference existing node IDs
- `weight` must be non-negative number (NaN and Infinity invalid)
- For undirected graphs: Edge stored in both directions in adjacency list
- `type` field enables runtime type narrowing

---

### Graph<N, E>

Generic graph container supporting heterogeneous nodes and edges.

```typescript
interface Graph<
  N extends { id: string; type: string },
  E extends { id: string; source: string; target: string; type: string }
> {
  nodes: Map<string, N>;                    // Node ID → Node object
  edges: Map<string, E>;                    // Edge ID → Edge object
  adjacencyList: Map<string, Set<string>>;  // Node ID → Set of neighbor IDs
  directed: boolean;                        // Graph directionality
}
```

**Invariants**:
- Node IDs unique (no duplicates in `nodes` Map)
- Edge source/target IDs must exist in `nodes` Map
- For undirected graphs: Adjacency list symmetric (A→B implies B→A)
- For directed graphs: Adjacency list follows edge direction
- Removing node removes all incident edges

**Space Complexity**: O(V + E) where V = node count, E = edge count

---

## Algorithm Results

### TraversalResult<N>

Output from DFS/BFS traversal algorithms.

```typescript
interface TraversalResult<N> {
  visitOrder: N[];                       // Nodes in visit order
  parents: Map<string, string | null>;   // Node ID → Parent ID (null for root)
  discovered: Map<string, number>;       // Node ID → Discovery time (DFS only)
  finished: Map<string, number>;         // Node ID → Finish time (DFS only)
}
```

**Properties**:
- `visitOrder`: All reachable nodes in traversal order
- `parents`: Reconstructs traversal tree
- `discovered`/`finished`: Timestamps for DFS (undefined for BFS)

**Usage**:
```typescript
const result = dfs(graph, startId);
if (result.ok) {
  console.log('Visit order:', result.value.visitOrder);
  console.log('Parent of node X:', result.value.parents.get('X'));
}
```

---

### Path<N, E>

Sequence of nodes and edges forming a path from source to destination.

```typescript
interface Path<N, E> {
  nodes: N[];        // Nodes in path order (source to destination)
  edges: E[];        // Edges connecting nodes
  totalWeight: number;  // Sum of edge weights
}
```

**Invariants**:
- `nodes.length >= 2` (at least source and destination)
- `edges.length === nodes.length - 1` (one edge between each pair)
- `edges[i].source === nodes[i].id && edges[i].target === nodes[i+1].id`
- `totalWeight === sum(edges.map(e => e.weight || 1))`

**Usage**:
```typescript
const result = dijkstra(graph, sourceId, targetId);
if (result.ok && result.value.some) {
  const path = result.value.value;
  console.log('Path length:', path.nodes.length);
  console.log('Total weight:', path.totalWeight);
}
```

---

### Component<N>

Set of connected nodes identified by component analysis.

```typescript
interface Component<N> {
  id: number;        // Component identifier (0-indexed)
  nodes: N[];        // Nodes in this component
  size: number;      // Number of nodes
}
```

**Invariants**:
- `size === nodes.length`
- All nodes in component are reachable from each other (undirected) or mutually reachable (directed SCC)
- Components are disjoint (no node appears in multiple components)

---

### CycleInfo

Information about cycle detection in graph.

```typescript
interface CycleInfo {
  hasCycle: boolean;           // Whether graph contains cycle
  cyclePath?: string[];        // Node IDs forming cycle (if found)
}
```

**Properties**:
- `hasCycle: false` implies `cyclePath` is undefined
- `hasCycle: true` implies `cyclePath` is array of node IDs
- `cyclePath[0] === cyclePath[cyclePath.length - 1]` (cycle closes)

---

## Error Types

### GraphError

Base discriminated union for all graph operation errors.

```typescript
type GraphError =
  | InvalidInputError
  | InvalidWeightError
  | NegativeWeightError
  | CycleDetectedError
  | DuplicateNodeError;
```

---

### InvalidInputError

Error for null/undefined/malformed input.

```typescript
type InvalidInputError = {
  type: 'invalid-input';
  message: string;
  input?: unknown;  // The invalid input (optional)
};
```

**Examples**:
- Graph is null/undefined
- Node ID is empty string
- Edge references non-existent node

---

### InvalidWeightError

Error for non-numeric or NaN/Infinity weights.

```typescript
type InvalidWeightError = {
  type: 'invalid-weight';
  message: string;
  weight: unknown;  // The invalid weight value
  edgeId: string;   // Edge with invalid weight
};
```

**Examples**:
- Weight is string instead of number
- Weight is NaN or Infinity

---

### NegativeWeightError

Error for negative edge weights (Dijkstra's algorithm).

```typescript
type NegativeWeightError = {
  type: 'negative-weight';
  message: string;
  weight: number;   // The negative weight value
  edgeId: string;   // Edge with negative weight
};
```

**Context**: Dijkstra's algorithm requires non-negative weights.

---

### CycleDetectedError

Error for cycles in DAG-only algorithms (e.g., topological sort).

```typescript
type CycleDetectedError = {
  type: 'cycle-detected';
  message: string;
  cyclePath: string[];  // Node IDs forming the cycle
};
```

**Context**: Topological sort requires acyclic graph.

---

### DuplicateNodeError

Error for attempting to add node with duplicate ID.

```typescript
type DuplicateNodeError = {
  type: 'duplicate-node';
  message: string;
  nodeId: string;  // The duplicate node ID
};
```

**Context**: Graph enforces node ID uniqueness.

---

## Type Relationships

```
Result<T, E>
  ├─ Ok<T>                → Success case
  └─ Err<E>               → Error case
      └─ GraphError       → All graph errors
          ├─ InvalidInputError
          ├─ InvalidWeightError
          ├─ NegativeWeightError
          ├─ CycleDetectedError
          └─ DuplicateNodeError

Option<T>
  ├─ Some<T>              → Value present
  └─ None                 → Value absent

Graph<N, E>
  ├─ nodes: Map<string, N>
  ├─ edges: Map<string, E>
  └─ adjacencyList: Map<string, Set<string>>

TraversalResult<N>
  ├─ visitOrder: N[]
  ├─ parents: Map<string, string | null>
  ├─ discovered: Map<string, number>
  └─ finished: Map<string, number>

Path<N, E>
  ├─ nodes: N[]
  ├─ edges: E[]
  └─ totalWeight: number

Component<N>
  ├─ id: number
  ├─ nodes: N[]
  └─ size: number
```

---

## Data Flow

**Graph Construction**:
```
Node → Graph.addNode() → Result<void, DuplicateNodeError>
Edge → Graph.addEdge() → Result<void, InvalidInputError>
```

**Traversal**:
```
Graph + StartID → DFS/BFS → Result<TraversalResult<N>, GraphError>
```

**Pathfinding**:
```
Graph + Source + Target → Dijkstra → Result<Option<Path<N, E>>, GraphError>
```

**Analysis**:
```
Graph → Topological Sort → Result<N[], CycleDetectedError | GraphError>
Graph → Cycle Detection → Result<CycleInfo, GraphError>
Graph → Connected Components → Result<Component<N>[], GraphError>
Graph → SCC → Result<Component<N>[], GraphError>
```

---

**Generated**: 2025-11-24 (Phase 1 complete)
