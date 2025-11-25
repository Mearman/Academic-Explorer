# Quickstart: Graph Extraction Operations

**Feature**: 026-graph-extraction
**Package**: `@academic-explorer/algorithms`
**Module**: `packages/algorithms/src/extraction/`

## Installation

```bash
# From repository root
cd packages/algorithms
pnpm install
pnpm build
```

## Basic Usage

### 1. Extract Ego Network (Citation Context)

Explore the immediate citation neighborhood of a paper:

```typescript
import { Graph } from '@academic-explorer/algorithms';
import { extractEgoNetwork } from '@academic-explorer/algorithms';

// Create citation graph
const graph = new Graph<WorkNode, CitationEdge>(true); // directed

// Add papers
graph.addNode({ id: 'W1', type: 'work', title: 'Seminal Paper', year: 2020 });
graph.addNode({ id: 'W2', type: 'work', title: 'Follow-up Study', year: 2021 });
graph.addNode({ id: 'W3', type: 'work', title: 'Review Paper', year: 2022 });

// Add citations
graph.addEdge({ id: 'E1', source: 'W2', target: 'W1', type: 'REFERENCE' });
graph.addEdge({ id: 'E2', source: 'W3', target: 'W1', type: 'REFERENCE' });

// Extract 2-hop neighborhood
const result = extractEgoNetwork(graph, {
  seeds: 'W1',
  radius: 2
});

if (result.ok) {
  const egoNet = result.value;
  console.log('Ego network size:', egoNet.getNodeCount(), 'nodes');
  console.log('Edges:', egoNet.getEdgeCount());
}
```

**Multi-source ego network:**

```typescript
// Explore neighborhoods of multiple papers
const result = extractEgoNetwork(graph, {
  seeds: ['W1', 'W5', 'W10'],
  radius: 1
});
```

---

### 2. Filter by Attributes (Scope Research)

Filter to recent, highly-cited papers:

```typescript
import { filterSubgraph } from '@academic-explorer/algorithms';

const result = filterSubgraph(graph, {
  nodeFilter: (node) => node.year >= 2020 && node.citationCount > 10,
  edgeFilter: (edge) => edge.type === 'REFERENCE',
  combinator: 'AND'
});

if (result.ok) {
  const filtered = result.value;
  console.log('Filtered to', filtered.getNodeCount(), 'relevant papers');
}
```

**Filter by entity type:**

```typescript
// Extract only work-to-work citation edges
const result = filterSubgraph(graph, {
  nodeFilter: (node) => node.type === 'work',
  edgeFilter: (edge) => edge.type === 'REFERENCE'
});
```

---

### 3. Find Citation Paths (Intellectual Lineage)

Trace how one paper influenced another:

```typescript
import { findShortestPath } from '@academic-explorer/algorithms';

const result = findShortestPath(graph, 'W1', 'W10');

if (result.ok) {
  const path = result.value;
  if (path.length < Infinity) {
    console.log('Citation path:', path.path);
    console.log('Path length:', path.length, 'hops');
  } else {
    console.log('No citation path exists');
  }
}
```

**Reachability analysis:**

```typescript
import { extractReachabilitySubgraph } from '@academic-explorer/algorithms';

// Find all papers citing a seminal work (backward reachability)
const result = extractReachabilitySubgraph(graph, 'W1', 'backward');

if (result.ok) {
  const { reachability, subgraph } = result.value;
  console.log('Papers citing W1:', reachability.reachableNodeIds.size);
}

// Find all papers influenced by a paper (forward reachability)
const result2 = extractReachabilitySubgraph(graph, 'W1', 'forward');
```

---

### 4. Detect Patterns (Co-citation & Triangles)

Find papers with shared citations:

```typescript
import { detectCoCitations, detectTriangles } from '@academic-explorer/algorithms';

// Co-citation analysis
const coCitationResult = detectCoCitations(graph);
if (coCitationResult.ok) {
  const pairs = coCitationResult.value;
  console.log('Co-citation pairs:', pairs.length);

  // Aggregate coupling strength
  const couplingMap = new Map<string, number>();
  pairs.forEach(pair => {
    const key = [pair.citingPapers[0], pair.citingPapers[1]].sort().join('-');
    couplingMap.set(key, (couplingMap.get(key) || 0) + 1);
  });
}

// Triangle detection
const triangleResult = detectTriangles(graph);
if (triangleResult.ok) {
  const triangles = triangleResult.value;
  console.log('Found', triangles.length, 'triangles');
}
```

**Star patterns (highly cited papers):**

```typescript
import { detectStarPatterns } from '@academic-explorer/algorithms';

// Find papers with 50+ citations
const result = detectStarPatterns(graph, 50, 'IN_STAR');
if (result.ok) {
  const stars = result.value;
  stars.forEach(star => {
    console.log(`Hub paper ${star.center}: ${star.degree} citations`);
  });
}
```

---

### 5. Extract Dense Clusters (K-Truss)

Find tightly-coupled research communities:

```typescript
import { extractKTruss } from '@academic-explorer/algorithms';

// Extract 4-truss (every edge in at least 2 triangles)
const result = extractKTruss(graph, 4);

if (result.ok) {
  const truss = result.value;
  console.log('4-truss subgraph:');
  console.log('  Nodes:', truss.subgraph.getNodeCount());
  console.log('  Edges:', truss.subgraph.getEdgeCount());

  // Analyze edge cohesion
  truss.edgeSupport.forEach((support, edgeId) => {
    console.log(`Edge ${edgeId}: ${support} triangles`);
  });
}
```

---

## Error Handling

All extraction functions return `Result<T, ExtractionError>`:

```typescript
import { extractEgoNetwork } from '@academic-explorer/algorithms';

const result = extractEgoNetwork(graph, {
  seeds: 'INVALID_ID',
  radius: 2
});

if (!result.ok) {
  switch (result.error.type) {
    case 'invalid-input':
      console.error('Invalid input:', result.error.message);
      break;
    case 'invalid-radius':
      console.error('Invalid radius:', result.error.radius);
      break;
    case 'empty-result':
      console.warn('Empty result:', result.error.context);
      break;
    default:
      console.error('Unexpected error:', result.error);
  }
}
```

---

## Performance Guidelines

### Target Performance (1000-node graphs):
- **Ego network (radius-3)**: <500ms
- **Triangle detection**: <2s
- **K-truss extraction (k=3)**: <3s

### Optimization Tips:

1. **Use appropriate radius**: Smaller radius = faster extraction
   ```typescript
   // Fast: radius-1 (immediate neighbors)
   extractEgoNetwork(graph, { seeds: 'W1', radius: 1 });

   // Slower: radius-5 (5-hop neighborhood)
   extractEgoNetwork(graph, { seeds: 'W1', radius: 5 });
   ```

2. **Filter before expensive operations**: Reduce graph size first
   ```typescript
   // Filter to recent papers first
   const filtered = filterSubgraph(graph, {
     nodeFilter: (n) => n.year >= 2020
   });

   // Then detect triangles on smaller graph
   if (filtered.ok) {
     detectTriangles(filtered.value);
   }
   ```

3. **Batch operations**: Reuse subgraphs for multiple analyses
   ```typescript
   const egoResult = extractEgoNetwork(graph, { seeds: 'W1', radius: 2 });
   if (egoResult.ok) {
     const egoNet = egoResult.value;

     // Run multiple analyses on same subgraph
     detectTriangles(egoNet);
     detectStarPatterns(egoNet, 10);
     extractKTruss(egoNet, 3);
   }
   ```

---

## Common Patterns

### Pattern 1: Progressive Exploration

Start with ego network, then expand based on findings:

```typescript
// 1. Extract immediate neighborhood
const level1 = extractEgoNetwork(graph, { seeds: 'W1', radius: 1 });

// 2. Analyze for interesting papers
const stars = detectStarPatterns(level1.value, 10);

// 3. Expand around highly-cited papers
if (stars.ok && stars.value.length > 0) {
  const newSeeds = stars.value.map(s => s.center);
  const level2 = extractEgoNetwork(graph, {
    seeds: newSeeds,
    radius: 1
  });
}
```

### Pattern 2: Multi-Criteria Filtering

Combine multiple filters with boolean logic:

```typescript
// Recent papers OR highly-cited papers
const result1 = filterSubgraph(graph, {
  nodeFilter: (n) => n.year >= 2023 || n.citationCount > 100,
  combinator: 'OR'
});

// Recent AND highly-cited papers
const result2 = filterSubgraph(graph, {
  nodeFilter: (n) => n.year >= 2023 && n.citationCount > 100,
  combinator: 'AND'
});
```

### Pattern 3: Hierarchical Community Detection

Combine ego networks with k-truss:

```typescript
// 1. Extract local community around seed
const egoResult = extractEgoNetwork(graph, { seeds: 'W1', radius: 2 });

if (egoResult.ok) {
  // 2. Find dense core within ego network
  const trussResult = extractKTruss(egoResult.value, 3);

  if (trussResult.ok) {
    console.log('Dense core:', trussResult.value.subgraph.getNodeCount(), 'nodes');
  }
}
```

---

## Testing Your Code

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { extractEgoNetwork } from './ego-network';

describe('extractEgoNetwork', () => {
  it('extracts radius-1 ego network', () => {
    const graph = createTestGraph();
    const result = extractEgoNetwork(graph, { seeds: 'W1', radius: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.getNodeCount()).toBe(3);
    }
  });

  it('handles missing seed node', () => {
    const graph = createTestGraph();
    const result = extractEgoNetwork(graph, { seeds: 'INVALID', radius: 1 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid-input');
    }
  });
});
```

### Performance Tests

```typescript
import { describe, it, expect } from 'vitest';
import { generateLargeGraph } from '../fixtures/extraction-graphs';

describe('extractEgoNetwork performance', () => {
  it('completes in <500ms for 1000-node graph', () => {
    const graph = generateLargeGraph(1000, 5000);

    const start = performance.now();
    const result = extractEgoNetwork(graph, { seeds: 'W1', radius: 3 });
    const elapsed = performance.now() - start;

    expect(result.ok).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });
});
```

---

## Advanced Usage

### Custom Predicates with Type Guards

```typescript
import type { WorkNode, AuthorNode } from '@academic-explorer/types';

// Type-safe node filter
function isHighImpactWork(node: Node): node is WorkNode {
  return node.type === 'work' &&
         'citationCount' in node &&
         node.citationCount > 100;
}

const result = filterSubgraph(graph, {
  nodeFilter: isHighImpactWork
});
```

### Combining Multiple Extraction Operations

```typescript
// Build analysis pipeline
function analyzeResearchTopic(graph: Graph, seedPaper: string) {
  // 1. Extract citation context
  const egoResult = extractEgoNetwork(graph, {
    seeds: seedPaper,
    radius: 2
  });

  if (!egoResult.ok) return egoResult;
  const context = egoResult.value;

  // 2. Find co-cited papers
  const coCitationResult = detectCoCitations(context);

  // 3. Identify research clusters
  const trussResult = extractKTruss(context, 3);

  // 4. Find influential papers
  const starResult = detectStarPatterns(context, 20, 'IN_STAR');

  return {
    context,
    coCitations: coCitationResult.ok ? coCitationResult.value : [],
    clusters: trussResult.ok ? trussResult.value : null,
    hubs: starResult.ok ? starResult.value : []
  };
}
```

---

## Next Steps

1. **Read the full spec**: `specs/026-graph-extraction/spec.md`
2. **Explore the data model**: `specs/026-graph-extraction/data-model.md`
3. **Review the API**: `specs/026-graph-extraction/contracts/extraction-api.ts`
4. **Check the tests**: `packages/algorithms/__tests__/extraction/`

## Troubleshooting

### Issue: Empty results

**Symptom**: Extraction returns empty subgraph

**Solutions**:
- Check that seed nodes exist: `graph.hasNode(seedId)`
- Verify radius is reasonable: `radius >= 1`
- Check graph connectivity: use `extractReachabilitySubgraph` to test
- Inspect filter predicates: ensure they match some nodes

### Issue: Slow performance

**Symptom**: Operations take longer than target performance

**Solutions**:
- Reduce graph size: filter before extraction
- Use smaller radius: radius-2 instead of radius-5
- Check graph density: sparse graphs perform better
- Profile hot paths: use performance tests

### Issue: Type errors

**Symptom**: TypeScript compilation errors

**Solutions**:
- Ensure node/edge types extend `Node`/`Edge` interfaces
- Use type guards for attribute filtering
- Import types from `@academic-explorer/algorithms`
- Check generic type parameters match graph types

---

## Related Documentation

- [Graph Data Structure](../../packages/algorithms/src/graph/graph.ts)
- [BFS Traversal](../../packages/algorithms/src/traversal/bfs.ts)
- [DFS Traversal](../../packages/algorithms/src/traversal/dfs.ts)
- [Dijkstra Pathfinding](../../packages/algorithms/src/pathfinding/dijkstra.ts)
- [Constitution](../../.specify/memory/constitution.md)
