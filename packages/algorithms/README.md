# @academic-explorer/algorithms

Generic graph traversal and analysis algorithms for Academic Explorer.

## Overview

This package provides type-safe graph algorithms designed for academic entity relationship analysis. All algorithms use discriminated unions for heterogeneous graphs and Result/Option types for error handling.

**Zero Runtime Dependencies** - Pure TypeScript implementation with no external dependencies.

## Features

- **Graph Traversal**: DFS, BFS algorithms with type preservation
- **Path Finding**: Dijkstra's shortest path with weighted edges
- **Graph Analysis**: Topological sort, cycle detection, connected components, strongly connected components
- **Type Safety**: Discriminated unions for heterogeneous graphs (e.g., `WorkNode | AuthorNode | InstitutionNode`)
- **Error Handling**: Result/Option types - no exceptions thrown
- **Performance**: Optimized for graphs with 10,000+ nodes

## Installation

```bash
pnpm install @academic-explorer/algorithms
```

## Quick Start

```typescript
import { Graph, dfs, dijkstra, type Node, type Edge } from '@academic-explorer/algorithms';

// Define custom node types
interface WorkNode extends Node {
  id: string;
  type: 'work';
  title: string;
}

interface AuthorNode extends Node {
  id: string;
  type: 'author';
  name: string;
}

type AcademicNode = WorkNode | AuthorNode;

// Create graph
const graph = new Graph<AcademicNode, Edge>(true); // directed

// Add nodes
graph.addNode({ id: 'W1', type: 'work', title: 'Paper A' });
graph.addNode({ id: 'A1', type: 'author', name: 'Alice' });

// Add edges
graph.addEdge({ id: 'e1', source: 'W1', target: 'A1', type: 'authorship' });

// Traverse graph
const traversalResult = dfs(graph, 'W1');
if (traversalResult.ok) {
  console.log('Visited:', traversalResult.value.visitOrder.map(n => n.id));
}
```

## API Documentation

### Graph Class

```typescript
import { Graph, type Node, type Edge } from '@academic-explorer/algorithms';

// Create directed or undirected graph
const directedGraph = new Graph<Node, Edge>(true);
const undirectedGraph = new Graph<Node, Edge>(false);

// Add nodes
const addResult = directedGraph.addNode({ id: 'A', type: 'node' });
if (!addResult.ok) {
  console.error('Duplicate node:', addResult.error.nodeId);
}

// Add edges
directedGraph.addEdge({
  id: 'e1',
  source: 'A',
  target: 'B',
  type: 'edge',
  weight: 5, // optional
});

// Query graph
console.log('Node count:', directedGraph.getNodeCount());
console.log('Edge count:', directedGraph.getEdgeCount());
console.log('Is directed:', directedGraph.isDirected());

// Get node
const nodeResult = directedGraph.getNode('A');
if (nodeResult.some) {
  console.log('Found node:', nodeResult.value);
}

// Get neighbors
const neighborsResult = directedGraph.getNeighbors('A');
if (neighborsResult.ok) {
  console.log('Neighbors of A:', neighborsResult.value);
}

// Remove nodes/edges
directedGraph.removeNode('A');
directedGraph.removeEdge('e1');
```

### 1. Depth-First Search (DFS)

Explores graph by going as deep as possible before backtracking.

**Time Complexity**: O(V + E)
**Space Complexity**: O(V)

```typescript
import { Graph, dfs, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(true);

// Build graph
graph.addNode({ id: 'A', type: 'node' });
graph.addNode({ id: 'B', type: 'node' });
graph.addNode({ id: 'C', type: 'node' });
graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge' });

// Run DFS
const result = dfs(graph, 'A');

if (result.ok) {
  console.log('Visit order:', result.value.visitOrder);
  console.log('Parents:', result.value.parents);
  console.log('Discovery times:', result.value.discovered); // DFS only
  console.log('Finish times:', result.value.finished); // DFS only
} else {
  console.error('Error:', result.error.message);
}
```

### 2. Breadth-First Search (BFS)

Explores graph level by level from the starting node.

**Time Complexity**: O(V + E)
**Space Complexity**: O(V)

```typescript
import { Graph, bfs, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(false); // undirected

// Build graph
graph.addNode({ id: 'A', type: 'node' });
graph.addNode({ id: 'B', type: 'node' });
graph.addNode({ id: 'C', type: 'node' });
graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge' });

// Run BFS
const result = bfs(graph, 'A');

if (result.ok) {
  console.log('Visit order:', result.value.visitOrder);
  console.log('Parents:', result.value.parents);
} else {
  console.error('Error:', result.error.message);
}
```

### 3. Dijkstra's Shortest Path

Finds shortest path between two nodes in a weighted graph.

**Time Complexity**: O((V + E) log V)
**Space Complexity**: O(V)

**Important**: Does not work with negative edge weights.

```typescript
import { Graph, dijkstra, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(true);

// Build weighted graph
graph.addNode({ id: 'A', type: 'location' });
graph.addNode({ id: 'B', type: 'location' });
graph.addNode({ id: 'C', type: 'location' });
graph.addNode({ id: 'D', type: 'location' });

graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'road', weight: 4 });
graph.addEdge({ id: 'e2', source: 'A', target: 'C', type: 'road', weight: 2 });
graph.addEdge({ id: 'e3', source: 'C', target: 'D', type: 'road', weight: 3 });
graph.addEdge({ id: 'e4', source: 'B', target: 'D', type: 'road', weight: 1 });

// Find shortest path from A to D
const result = dijkstra(graph, 'A', 'D');

if (result.ok) {
  if (result.value.some) {
    const path = result.value.value;
    console.log('Path nodes:', path.nodes.map(n => n.id));
    console.log('Path edges:', path.edges.map(e => e.id));
    console.log('Total weight:', path.totalWeight); // 5 (A → B → D)
  } else {
    console.log('No path exists');
  }
} else {
  console.error('Error:', result.error.message);
  if (result.error.type === 'negative-weight') {
    console.error('Edge:', result.error.edgeId, 'Weight:', result.error.weight);
  }
}
```

### 4. Topological Sort

Orders nodes in a DAG such that all edges point forward.

**Time Complexity**: O(V + E)
**Space Complexity**: O(V)

```typescript
import { Graph, topologicalSort, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(true); // must be directed

// Build DAG (course prerequisites)
graph.addNode({ id: 'Calc1', type: 'course' });
graph.addNode({ id: 'Calc2', type: 'course' });
graph.addNode({ id: 'LinearAlg', type: 'course' });
graph.addNode({ id: 'ML', type: 'course' });

graph.addEdge({ id: 'e1', source: 'Calc1', target: 'Calc2', type: 'prereq' });
graph.addEdge({ id: 'e2', source: 'Calc2', target: 'ML', type: 'prereq' });
graph.addEdge({ id: 'e3', source: 'LinearAlg', target: 'ML', type: 'prereq' });

// Get topological ordering
const result = topologicalSort(graph);

if (result.ok) {
  console.log('Course order:', result.value.map(n => n.id));
  // Output: ["Calc1", "LinearAlg", "Calc2", "ML"] (or similar valid ordering)
} else {
  if (result.error.type === 'cycle-detected') {
    console.error('Cycle detected! Path:', result.error.cyclePath);
  }
}
```

### 5. Cycle Detection

Detects cycles in directed or undirected graphs.

**Time Complexity**: O(V + E)
**Space Complexity**: O(V)

```typescript
import { Graph, detectCycle, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(true);

// Build graph with cycle
graph.addNode({ id: 'A', type: 'node' });
graph.addNode({ id: 'B', type: 'node' });
graph.addNode({ id: 'C', type: 'node' });
graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge' });
graph.addEdge({ id: 'e3', source: 'C', target: 'A', type: 'edge' }); // Creates cycle

// Detect cycle
const result = detectCycle(graph);

if (result.ok) {
  if (result.value.some) {
    const cycle = result.value.value;
    console.log('Cycle found!');
    console.log('Nodes:', cycle.nodes.map(n => n.id));
    console.log('Edges:', cycle.edges.map(e => e.id));
  } else {
    console.log('No cycles - graph is acyclic');
  }
} else {
  console.error('Error:', result.error.message);
}
```

### 6. Connected Components

Finds all connected components (weakly connected for directed graphs).

**Time Complexity**: O(V + E)
**Space Complexity**: O(V)

```typescript
import { Graph, connectedComponents, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(false); // undirected

// Build graph with multiple components
graph.addNode({ id: 'A', type: 'node' });
graph.addNode({ id: 'B', type: 'node' });
graph.addNode({ id: 'C', type: 'node' });
graph.addNode({ id: 'D', type: 'node' });
graph.addNode({ id: 'E', type: 'node' });

// Component 1: A-B
graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });

// Component 2: C-D-E
graph.addEdge({ id: 'e2', source: 'C', target: 'D', type: 'edge' });
graph.addEdge({ id: 'e3', source: 'D', target: 'E', type: 'edge' });

// Find components
const result = connectedComponents(graph);

if (result.ok) {
  console.log(`Found ${result.value.length} components`);
  result.value.forEach(component => {
    console.log(`Component ${component.id}: ${component.size} nodes`);
    console.log('Nodes:', component.nodes.map(n => n.id));
  });
  // Output: 2 components ([A, B] and [C, D, E])
} else {
  console.error('Error:', result.error.message);
}
```

### 7. Strongly Connected Components (SCC)

Finds strongly connected components using Tarjan's algorithm.

**Time Complexity**: O(V + E)
**Space Complexity**: O(V)

```typescript
import { Graph, stronglyConnectedComponents, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(true); // must be directed

// Build graph with SCCs
graph.addNode({ id: 'A', type: 'node' });
graph.addNode({ id: 'B', type: 'node' });
graph.addNode({ id: 'C', type: 'node' });
graph.addNode({ id: 'D', type: 'node' });

// SCC 1: A ↔ B ↔ C (strongly connected cycle)
graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge' });
graph.addEdge({ id: 'e3', source: 'C', target: 'A', type: 'edge' });

// Bridge edge to isolated node
graph.addEdge({ id: 'e4', source: 'A', target: 'D', type: 'edge' });

// Find SCCs
const result = stronglyConnectedComponents(graph);

if (result.ok) {
  console.log(`Found ${result.value.length} SCCs`);
  result.value.forEach(scc => {
    console.log(`SCC ${scc.id}: ${scc.size} nodes`);
    console.log('Nodes:', scc.nodes.map(n => n.id));
  });
  // Output: 2 SCCs ([A, B, C] and [D])
} else {
  console.error('Error:', result.error.message);
}
```

### 8. Community Detection (Louvain)

Detects communities in networks using modularity optimization.

**Time Complexity**: O(n log n) empirical
**Space Complexity**: O(V + E)

```typescript
import { Graph, detectCommunities, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(false); // undirected recommended

// Build citation network
graph.addNode({ id: 'P1', type: 'paper' });
graph.addNode({ id: 'P2', type: 'paper' });
graph.addNode({ id: 'P3', type: 'paper' });
graph.addNode({ id: 'P4', type: 'paper' });

// Add citation edges
graph.addEdge({ id: 'e1', source: 'P1', target: 'P2', type: 'cites' });
graph.addEdge({ id: 'e2', source: 'P2', target: 'P3', type: 'cites' });
graph.addEdge({ id: 'e3', source: 'P3', target: 'P4', type: 'cites' });

// Detect communities
const result = detectCommunities(graph);

if (result.ok) {
  console.log(`Found ${result.value.communities.length} communities`);
  console.log(`Modularity: ${result.value.modularity}`);

  result.value.communities.forEach(community => {
    console.log(`Community ${community.id}: ${community.nodes.size} nodes`);
    console.log(`Density: ${community.density}`);
  });
}
```

### 9. Spectral Partitioning

Partitions graphs into balanced subgraphs using spectral methods.

**Time Complexity**: O(n² + k×iterations)
**Space Complexity**: O(n²)

```typescript
import { Graph, spectralPartition, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(false);

// Build graph
// ... add nodes and edges ...

// Partition into k=3 balanced subgraphs
const result = spectralPartition(graph, { k: 3, balanceTolerance: 1.2 });

if (result.ok) {
  result.value.forEach((partition, i) => {
    console.log(`Partition ${i}: ${partition.nodes.size} nodes`);
    console.log(`Balance ratio: ${partition.balanceRatio}`);
  });
}
```

### 10. Hierarchical Clustering

Creates hierarchical clusterings with dendrogram support.

**Time Complexity**: O(n²)
**Space Complexity**: O(n²)

```typescript
import { Graph, hierarchicalClustering, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(false);

// Build graph
// ... add nodes and edges ...

// Perform hierarchical clustering
const result = hierarchicalClustering(graph);

if (result.ok) {
  const dendrogram = result.value;

  // Cut at specific height
  const clusters = dendrogram.cutAtHeight(0.5);
  console.log(`Clusters at height 0.5: ${clusters.length}`);

  // Get exactly k clusters
  const kClusters = dendrogram.getClusters(5);
  console.log(`Exactly 5 clusters created`);
}
```

### 11. K-Core Decomposition

Finds k-cores (maximal subgraphs with minimum degree k).

**Time Complexity**: O(V + E)
**Space Complexity**: O(V)

```typescript
import { Graph, kCoreDecomposition, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(false);

// Build graph
// ... add nodes and edges ...

// Find all k-cores
const result = kCoreDecomposition(graph);

if (result.ok) {
  result.value.cores.forEach(core => {
    console.log(`${core.k}-core: ${core.nodes.size} nodes`);
  });
  console.log(`Degeneracy: ${result.value.degeneracy}`);
}
```

### 12. Leiden Clustering

Community detection with connectivity guarantee (improves on Louvain).

**Time Complexity**: O(n log n) empirical
**Space Complexity**: O(V + E)

```typescript
import { Graph, leiden, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(false);

// Build graph
// ... add nodes and edges ...

// Run Leiden algorithm
const result = leiden(graph);

if (result.ok) {
  console.log(`Modularity: ${result.value.modularity}`);
  result.value.communities.forEach(community => {
    console.log(`Community ${community.id}: ${community.nodes.size} nodes`);
    console.log(`Connected: ${community.isConnected}`); // Always true for Leiden
  });
}
```

### 13. Label Propagation

Fast linear-time clustering based on label propagation.

**Time Complexity**: O(V + E)
**Space Complexity**: O(V)

```typescript
import { Graph, labelPropagation, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(false);

// Build large graph (10,000+ nodes)
// ... add nodes and edges ...

// Fast clustering
const result = labelPropagation(graph, { maxIterations: 10 });

if (result.ok) {
  console.log(`Found ${result.value.clusters.length} clusters`);
  console.log(`Converged in ${result.value.iterations} iterations`);
}
```

### 14. Infomap Clustering

Information-theoretic clustering based on minimum description length.

**Time Complexity**: O((V + E) × iterations)
**Space Complexity**: O(V + E)

```typescript
import { Graph, infomap, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(true); // directed recommended

// Build directed graph
// ... add nodes and edges ...

// Run Infomap
const result = infomap(graph, { maxIterations: 100 });

if (result.ok) {
  console.log(`Compression ratio: ${result.value.compressionRatio}`);
  result.value.modules.forEach(module => {
    console.log(`Module ${module.id}: ${module.nodes.size} nodes`);
  });
}
```

### 15. Core-Periphery Decomposition

Identifies core and periphery nodes using Borgatti-Everett model.

**Time Complexity**: O((V + E) × iterations)
**Space Complexity**: O(V)

```typescript
import { Graph, corePeripheryDecomposition, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(false);

// Build graph
// ... add nodes and edges ...

// Find core-periphery structure
const result = corePeripheryDecomposition(graph, { coreThreshold: 0.7 });

if (result.ok) {
  console.log(`Core: ${result.value.core.size} nodes`);
  console.log(`Periphery: ${result.value.periphery.size} nodes`);
  console.log(`Fit quality: ${result.value.fitQuality}`);

  // Get coreness scores
  result.value.corenessScores.forEach((score, nodeId) => {
    console.log(`${nodeId}: ${score.toFixed(3)}`);
  });
}
```

### 16. Biconnected Components

Finds biconnected components and articulation points using Tarjan's algorithm.

**Time Complexity**: O(V + E)
**Space Complexity**: O(V)

```typescript
import { Graph, biconnectedComponents, type Node, type Edge } from '@academic-explorer/algorithms';

const graph = new Graph<Node, Edge>(false); // undirected

// Build graph
// ... add nodes and edges ...

// Find biconnected components
const result = biconnectedComponents(graph);

if (result.ok) {
  console.log(`Found ${result.value.components.length} biconnected components`);
  console.log(`Articulation points: ${result.value.articulationPoints.size}`);

  result.value.components.forEach(component => {
    console.log(`Component: ${component.nodes.size} nodes, ${component.edges.size} edges`);
  });
}
```

## Clustering & Partitioning Algorithms

The package includes 9 graph clustering and partitioning algorithms:

| Algorithm | Use Case | Time Complexity | Key Feature |
|-----------|----------|-----------------|-------------|
| **Louvain** | General community detection | O(n log n) | High modularity optimization |
| **Leiden** | Communities with connectivity | O(n log n) | Guarantees connected communities |
| **Label Propagation** | Large graphs (10k+ nodes) | O(V + E) | Fastest, linear time |
| **Infomap** | Directed flow networks | O((V+E)×iter) | Information-theoretic |
| **Spectral Partitioning** | Balanced graph cuts | O(n²) | Balanced partition sizes |
| **Hierarchical** | Multi-level clustering | O(n²) | Dendrogram with flexible cuts |
| **K-Core** | Dense subgraph mining | O(V + E) | Finds highly connected cores |
| **Core-Periphery** | Hub identification | O((V+E)×iter) | Distinguishes core from periphery |
| **Biconnected** | Bridge/cut-vertex analysis | O(V + E) | Finds articulation points |

## Advanced Usage

### Heterogeneous Graphs

```typescript
import { Graph, dfs, type Node, type Edge } from '@academic-explorer/algorithms';

// Define multiple node types
interface WorkNode extends Node {
  id: string;
  type: 'work';
  title: string;
  year: number;
}

interface AuthorNode extends Node {
  id: string;
  type: 'author';
  name: string;
  hIndex: number;
}

type AcademicNode = WorkNode | AuthorNode;

const graph = new Graph<AcademicNode, Edge>(true);

// Add heterogeneous nodes
graph.addNode({ id: 'W1', type: 'work', title: 'Paper', year: 2024 });
graph.addNode({ id: 'A1', type: 'author', name: 'Alice', hIndex: 25 });
graph.addEdge({ id: 'e1', source: 'W1', target: 'A1', type: 'authorship' });

// Traverse - type information preserved
const result = dfs(graph, 'W1');
if (result.ok) {
  result.value.visitOrder.forEach(node => {
    // Type narrowing works!
    if (node.type === 'work') {
      console.log('Work:', node.title, node.year);
    } else if (node.type === 'author') {
      console.log('Author:', node.name, node.hIndex);
    }
  });
}
```

### Error Handling Patterns

```typescript
import { dijkstra } from '@academic-explorer/algorithms';

const result = dijkstra(graph, 'A', 'Z');

// Pattern 1: Early return
if (!result.ok) {
  return result; // Propagate error
}

// Pattern 2: Pattern matching
if (result.ok) {
  if (result.value.some) {
    // Path exists
    const path = result.value.value;
    processPath(path);
  } else {
    // No path exists
    console.log('Nodes are disconnected');
  }
} else {
  // Error occurred
  switch (result.error.type) {
    case 'invalid-input':
      console.error('Invalid input:', result.error.message);
      break;
    case 'negative-weight':
      console.error('Negative weight on edge:', result.error.edgeId);
      break;
  }
}

// Pattern 3: Helper function
function unwrapOrThrow<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(JSON.stringify(result.error));
}

const path = unwrapOrThrow(dijkstra(graph, 'A', 'Z'));
```

## Performance

Based on actual benchmarks:

- **DFS**: 1.07ms for 1,000 nodes (target: <100ms) - 93x faster
- **BFS**: 0.62ms for 1,000 nodes (target: <100ms) - 161x faster
- **Dijkstra**: 17.09ms for 500 nodes, 2,000 edges (target: <200ms) - 12x faster
- **Memory**: 20MB for 10,000 nodes, 50,000 edges (target: <100MB) - 5x better

All algorithms scale linearly O(V + E) or near-linear O((V + E) log V).

## Type System

### Result Type

```typescript
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

### Option Type

```typescript
type Option<T> =
  | { some: true; value: T }
  | { some: false };
```

### Graph Error Types

```typescript
type GraphError =
  | InvalidInputError     // Null/undefined/not found
  | InvalidWeightError    // Non-numeric weight
  | NegativeWeightError   // Negative weight (Dijkstra)
  | CycleDetectedError    // Cycle in DAG
  | DuplicateNodeError;   // Duplicate node ID
```

## Testing

```bash
# Run all tests
pnpm nx test algorithms

# Run specific test suite
pnpm nx test algorithms --grep="DFS"

# Run with coverage
pnpm nx test algorithms --coverage
```

Current test coverage: 211 tests passing (100% coverage).

## Contributing

This package follows strict development practices:

1. **Tests First**: All tests written before implementation
2. **No `any` Types**: Use `unknown` with type guards
3. **No Exceptions**: Use Result/Option types
4. **Performance**: Maintain O(V + E) complexity
5. **Documentation**: JSDoc comments with complexity analysis

## License

MIT

## See Also

- [Algorithm Design Specification](../../specs/024-algorithms-package/spec.md)
- [Implementation Plan](../../specs/024-algorithms-package/plan.md)
- [Task Breakdown](../../specs/024-algorithms-package/tasks.md)
