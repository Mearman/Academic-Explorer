# Quickstart Guide: Algorithms Package

**Feature**: Algorithms Package
**Date**: 2025-11-24
**Audience**: Developers using the algorithms package

## Overview

This guide provides practical examples of using the algorithms package for common graph analysis tasks. All examples use TypeScript with strict mode enabled.

---

## Installation

```bash
# In Academic Explorer monorepo
pnpm install @academic-explorer/algorithms
```

---

## Example 1: Basic Graph Traversal

**Scenario**: Traverse a citation network to discover all papers reachable from a starting paper.

```typescript
import {
  Graph,
  dfs,
  bfs,
  Ok,
  Err,
  type Node,
  type Edge,
} from '@academic-explorer/algorithms';

// Define custom node types for academic entities
type WorkNode = {
  id: string;
  type: 'work';
  title: string;
  year: number;
};

type CitationEdge = {
  id: string;
  source: string;  // Citing work
  target: string;  // Referenced work
  type: 'citation';
};

// Create graph
const graph = new Graph<WorkNode, CitationEdge>(/* directed */ true);

// Add nodes
const addNodeResult1 = graph.addNode({
  id: 'W1',
  type: 'work',
  title: 'Deep Learning Fundamentals',
  year: 2015,
});

const addNodeResult2 = graph.addNode({
  id: 'W2',
  type: 'work',
  title: 'Neural Networks Explained',
  year: 2018,
});

const addNodeResult3 = graph.addNode({
  id: 'W3',
  type: 'work',
  title: 'Advanced ML Techniques',
  year: 2020,
});

// Check for errors (strict uniqueness enforcement)
if (!addNodeResult1.ok) {
  console.error('Failed to add node:', addNodeResult1.error.message);
}

// Add edges (citations)
const addEdgeResult1 = graph.addEdge({
  id: 'E1',
  source: 'W2',  // W2 cites W1
  target: 'W1',
  type: 'citation',
});

const addEdgeResult2 = graph.addEdge({
  id: 'E2',
  source: 'W3',  // W3 cites W2
  target: 'W2',
  type: 'citation',
});

// Perform depth-first search
const dfsResult = dfs(graph, 'W3');

if (dfsResult.ok) {
  const traversal = dfsResult.value;

  console.log('Visit order:');
  traversal.visitOrder.forEach((node) => {
    console.log(`  ${node.id}: ${node.title} (${node.year})`);
  });

  console.log('\nParent relationships:');
  traversal.parents.forEach((parent, nodeId) => {
    console.log(`  ${nodeId} -> ${parent || 'ROOT'}`);
  });
} else {
  console.error('DFS failed:', dfsResult.error.message);
}

// Perform breadth-first search (level-order)
const bfsResult = bfs(graph, 'W3');

if (bfsResult.ok) {
  console.log('\nBFS level-order traversal:');
  bfsResult.value.visitOrder.forEach((node, index) => {
    console.log(`  Level ${index}: ${node.id} - ${node.title}`);
  });
}

// Output:
// Visit order:
//   W3: Advanced ML Techniques (2020)
//   W2: Neural Networks Explained (2018)
//   W1: Deep Learning Fundamentals (2015)
//
// Parent relationships:
//   W3 -> ROOT
//   W2 -> W3
//   W1 -> W2
//
// BFS level-order traversal:
//   Level 0: W3 - Advanced ML Techniques
//   Level 1: W2 - Neural Networks Explained
//   Level 2: W1 - Deep Learning Fundamentals
```

---

## Example 2: Shortest Path Finding

**Scenario**: Find shortest citation path between two papers (number of intermediate papers).

```typescript
import {
  Graph,
  dijkstra,
  type Node,
  type Edge,
} from '@academic-explorer/algorithms';

// Define node and edge types
type WorkNode = {
  id: string;
  type: 'work';
  title: string;
};

type CitationEdge = {
  id: string;
  source: string;
  target: string;
  type: 'citation';
  weight?: number;  // Citation strength (optional)
};

// Create citation network
const graph = new Graph<WorkNode, CitationEdge>(true);

// Add 5 papers
graph.addNode({ id: 'A', type: 'work', title: 'Paper A' });
graph.addNode({ id: 'B', type: 'work', title: 'Paper B' });
graph.addNode({ id: 'C', type: 'work', title: 'Paper C' });
graph.addNode({ id: 'D', type: 'work', title: 'Paper D' });
graph.addNode({ id: 'E', type: 'work', title: 'Paper E' });

// Add citation edges (A cites B, B cites C, etc.)
graph.addEdge({ id: 'E1', source: 'A', target: 'B', type: 'citation', weight: 1 });
graph.addEdge({ id: 'E2', source: 'B', target: 'C', type: 'citation', weight: 2 });
graph.addEdge({ id: 'E3', source: 'A', target: 'D', type: 'citation', weight: 3 });
graph.addEdge({ id: 'E4', source: 'D', target: 'C', type: 'citation', weight: 1 });
graph.addEdge({ id: 'E5', source: 'C', target: 'E', type: 'citation', weight: 1 });

// Find shortest path from A to E
const pathResult = dijkstra(graph, 'A', 'E');

if (pathResult.ok) {
  if (pathResult.value.some) {
    const path = pathResult.value.value;

    console.log('Shortest path found!');
    console.log('Path:', path.nodes.map(n => n.id).join(' -> '));
    console.log('Total weight:', path.totalWeight);

    console.log('\nDetailed path:');
    path.nodes.forEach((node, index) => {
      if (index < path.edges.length) {
        const edge = path.edges[index];
        console.log(`  ${node.title} --[weight: ${edge.weight}]--> ${path.nodes[index + 1].title}`);
      } else {
        console.log(`  ${node.title}`);
      }
    });
  } else {
    console.log('No path exists between A and E');
  }
} else {
  // Handle errors (e.g., negative weights)
  if (pathResult.error.type === 'negative-weight') {
    console.error('Error: Negative weight detected:', pathResult.error.weight);
    console.error('  Edge ID:', pathResult.error.edgeId);
  } else {
    console.error('Error:', pathResult.error.message);
  }
}

// Output:
// Shortest path found!
// Path: A -> D -> C -> E
// Total weight: 5
//
// Detailed path:
//   Paper A --[weight: 3]--> Paper D
//   Paper D --[weight: 1]--> Paper C
//   Paper C --[weight: 1]--> Paper E
```

---

## Example 3: Cycle Detection

**Scenario**: Detect citation cycles (circular references) in a paper database.

```typescript
import {
  Graph,
  detectCycle,
  topologicalSort,
  type Node,
  type Edge,
} from '@academic-explorer/algorithms';

type WorkNode = {
  id: string;
  type: 'work';
  title: string;
};

type CitationEdge = {
  id: string;
  source: string;
  target: string;
  type: 'citation';
};

// Create directed graph
const graph = new Graph<WorkNode, CitationEdge>(true);

// Add papers
graph.addNode({ id: 'P1', type: 'work', title: 'Introduction to AI' });
graph.addNode({ id: 'P2', type: 'work', title: 'Machine Learning Basics' });
graph.addNode({ id: 'P3', type: 'work', title: 'Deep Learning Theory' });
graph.addNode({ id: 'P4', type: 'work', title: 'Neural Network Design' });

// Add citations (including a cycle)
graph.addEdge({ id: 'E1', source: 'P1', target: 'P2', type: 'citation' });
graph.addEdge({ id: 'E2', source: 'P2', target: 'P3', type: 'citation' });
graph.addEdge({ id: 'E3', source: 'P3', target: 'P4', type: 'citation' });
graph.addEdge({ id: 'E4', source: 'P4', target: 'P2', type: 'citation' });  // Cycle!

// Detect cycles
const cycleResult = detectCycle(graph);

if (cycleResult.ok) {
  const cycleInfo = cycleResult.value;

  if (cycleInfo.hasCycle) {
    console.log('⚠️  Citation cycle detected!');
    console.log('Cycle path:', cycleInfo.cyclePath?.join(' -> '));

    // Topological sort will fail
    const sortResult = topologicalSort(graph);

    if (!sortResult.ok && sortResult.error.type === 'cycle-detected') {
      console.log('\n❌ Cannot perform topological sort: graph has cycle');
      console.log('Cycle:', sortResult.error.cyclePath.join(' -> '));
    }
  } else {
    console.log('✓ No cycles detected - graph is acyclic');

    // Topological sort will succeed
    const sortResult = topologicalSort(graph);

    if (sortResult.ok) {
      console.log('Topological order:');
      sortResult.value.forEach((node, index) => {
        console.log(`  ${index + 1}. ${node.id}: ${node.title}`);
      });
    }
  }
}

// Output:
// ⚠️  Citation cycle detected!
// Cycle path: P2 -> P3 -> P4 -> P2
//
// ❌ Cannot perform topological sort: graph has cycle
// Cycle: P2 -> P3 -> P4 -> P2
```

---

## Example 4: Connected Components Analysis

**Scenario**: Find research clusters (disconnected groups) in a co-authorship network.

```typescript
import {
  Graph,
  connectedComponents,
  type Node,
  type Edge,
} from '@academic-explorer/algorithms';

type AuthorNode = {
  id: string;
  type: 'author';
  name: string;
};

type CoauthorshipEdge = {
  id: string;
  source: string;
  target: string;
  type: 'coauthorship';
};

// Create undirected graph (co-authorship is bidirectional)
const graph = new Graph<AuthorNode, CoauthorshipEdge>(false);

// Research Group 1: AI researchers
graph.addNode({ id: 'A1', type: 'author', name: 'Alice' });
graph.addNode({ id: 'A2', type: 'author', name: 'Bob' });
graph.addNode({ id: 'A3', type: 'author', name: 'Carol' });

// Research Group 2: Bioinformatics researchers
graph.addNode({ id: 'B1', type: 'author', name: 'David' });
graph.addNode({ id: 'B2', type: 'author', name: 'Eve' });

// Research Group 3: Single independent researcher
graph.addNode({ id: 'C1', type: 'author', name: 'Frank' });

// Add co-authorship edges (Group 1)
graph.addEdge({ id: 'E1', source: 'A1', target: 'A2', type: 'coauthorship' });
graph.addEdge({ id: 'E2', source: 'A2', target: 'A3', type: 'coauthorship' });

// Add co-authorship edges (Group 2)
graph.addEdge({ id: 'E3', source: 'B1', target: 'B2', type: 'coauthorship' });

// Find connected components
const componentsResult = connectedComponents(graph);

if (componentsResult.ok) {
  const components = componentsResult.value;

  console.log(`Found ${components.length} research clusters:\n`);

  components.forEach((component) => {
    console.log(`Cluster ${component.id + 1} (${component.size} authors):`);
    component.nodes.forEach((author) => {
      console.log(`  - ${author.name}`);
    });
    console.log('');
  });
}

// Output:
// Found 3 research clusters:
//
// Cluster 1 (3 authors):
//   - Alice
//   - Bob
//   - Carol
//
// Cluster 2 (2 authors):
//   - David
//   - Eve
//
// Cluster 3 (1 authors):
//   - Frank
```

---

## Example 5: Error Handling Patterns

**Scenario**: Robust error handling for production code.

```typescript
import {
  Graph,
  dijkstra,
  type GraphError,
  type Node,
  type Edge,
} from '@academic-explorer/algorithms';

type WorkNode = {
  id: string;
  type: 'work';
  title: string;
};

type CitationEdge = {
  id: string;
  source: string;
  target: string;
  type: 'citation';
  weight?: number;
};

function findShortestPath(
  graph: Graph<WorkNode, CitationEdge>,
  sourceId: string,
  targetId: string
): void {
  const result = dijkstra(graph, sourceId, targetId);

  // Pattern matching on Result type
  if (result.ok) {
    // Pattern matching on Option type
    if (result.value.some) {
      const path = result.value.value;
      console.log(`Path found: ${path.totalWeight} steps`);
    } else {
      console.log('No path exists between nodes');
    }
  } else {
    // Exhaustive error handling via discriminated union
    const error = result.error;

    switch (error.type) {
      case 'invalid-input':
        console.error(`Invalid input: ${error.message}`);
        console.error('  Input value:', error.input);
        break;

      case 'negative-weight':
        console.error(`Negative weight detected: ${error.weight}`);
        console.error(`  Edge ID: ${error.edgeId}`);
        console.error('  Dijkstra requires non-negative weights');
        break;

      case 'invalid-weight':
        console.error(`Invalid weight type: ${typeof error.weight}`);
        console.error(`  Edge ID: ${error.edgeId}`);
        break;

      case 'duplicate-node':
        console.error(`Duplicate node ID: ${error.nodeId}`);
        break;

      case 'cycle-detected':
        console.error('Unexpected cycle detected');
        console.error('  Cycle path:', error.cyclePath.join(' -> '));
        break;

      default:
        // TypeScript ensures this is unreachable (exhaustive check)
        const _exhaustive: never = error;
        throw new Error('Unhandled error type');
    }
  }
}

// Example: Handling duplicate node errors
const graph = new Graph<WorkNode, CitationEdge>(true);

const addResult1 = graph.addNode({ id: 'W1', type: 'work', title: 'Paper 1' });
const addResult2 = graph.addNode({ id: 'W1', type: 'work', title: 'Paper 1 Duplicate' });

if (!addResult2.ok && addResult2.error.type === 'duplicate-node') {
  console.error(`Cannot add duplicate node: ${addResult2.error.nodeId}`);
  console.error('Use hasNode() to check before adding');

  // Correct approach: check before adding
  if (!graph.hasNode('W1')) {
    graph.addNode({ id: 'W1', type: 'work', title: 'New paper' });
  }
}
```

---

## Example 6: Heterogeneous Graphs

**Scenario**: Mixed node and edge types in a single graph.

```typescript
import {
  Graph,
  bfs,
  type Node,
  type Edge,
} from '@academic-explorer/algorithms';

// Define multiple node types
type WorkNode = {
  id: string;
  type: 'work';
  title: string;
};

type AuthorNode = {
  id: string;
  type: 'author';
  name: string;
};

type InstitutionNode = {
  id: string;
  type: 'institution';
  name: string;
};

// Union type for heterogeneous nodes
type AcademicNode = WorkNode | AuthorNode | InstitutionNode;

// Define multiple edge types
type AuthorshipEdge = {
  id: string;
  source: string;
  target: string;
  type: 'authorship';
  position: number;
};

type AffiliationEdge = {
  id: string;
  source: string;
  target: string;
  type: 'affiliation';
  year: number;
};

// Union type for heterogeneous edges
type AcademicEdge = AuthorshipEdge | AffiliationEdge;

// Create heterogeneous graph
const graph = new Graph<AcademicNode, AcademicEdge>(true);

// Add different node types
graph.addNode({ id: 'W1', type: 'work', title: 'AI Research Paper' });
graph.addNode({ id: 'AU1', type: 'author', name: 'Dr. Smith' });
graph.addNode({ id: 'I1', type: 'institution', name: 'MIT' });

// Add different edge types
graph.addEdge({
  id: 'E1',
  source: 'W1',
  target: 'AU1',
  type: 'authorship',
  position: 1,  // First author
});

graph.addEdge({
  id: 'E2',
  source: 'AU1',
  target: 'I1',
  type: 'affiliation',
  year: 2023,
});

// Traverse heterogeneous graph
const traversalResult = bfs(graph, 'W1');

if (traversalResult.ok) {
  traversalResult.value.visitOrder.forEach((node) => {
    // Type narrowing based on discriminator field
    if (node.type === 'work') {
      console.log(`Work: ${node.title}`);
    } else if (node.type === 'author') {
      console.log(`Author: ${node.name}`);
    } else if (node.type === 'institution') {
      console.log(`Institution: ${node.name}`);
    }
  });
}

// Output:
// Work: AI Research Paper
// Author: Dr. Smith
// Institution: MIT
```

---

## Best Practices

1. **Always check Result types** before accessing `.value`:
   ```typescript
   if (result.ok) {
     // Safe to access result.value
   }
   ```

2. **Use type narrowing** for discriminated unions:
   ```typescript
   if (node.type === 'work') {
     // TypeScript knows node is WorkNode
   }
   ```

3. **Check node existence** before operations:
   ```typescript
   if (graph.hasNode(id)) {
     const node = graph.getNode(id);
     if (node.some) {
       // Use node.value
     }
   }
   ```

4. **Handle all error cases** in production:
   ```typescript
   switch (error.type) {
     case 'invalid-input': ...
     case 'negative-weight': ...
     // ... all cases
   }
   ```

5. **Use Option type** for nullable returns instead of `null | undefined`:
   ```typescript
   const nodeOption = graph.getNode(id);
   if (nodeOption.some) {
     console.log(nodeOption.value);
   }
   ```

---

## Next Steps

- See `data-model.md` for detailed type definitions
- See `contracts/algorithms.ts` for full API reference
- See test files in `__tests__/` for comprehensive usage examples
- Read `research.md` for technology decisions and performance characteristics

---

**Generated**: 2025-11-24 (Phase 1 complete)
