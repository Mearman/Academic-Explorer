# Quickstart Guide: Graph Clustering Algorithms

**Feature**: [spec.md](./spec.md) | [plan.md](./plan.md) | [research.md](./research.md) | [data-model.md](./data-model.md)

This guide provides quick examples for using the 9 graph clustering, partitioning, and decomposition algorithms.

## Installation

No external dependencies required. Algorithms are part of the `@bibgraph/algorithms` package.

```typescript
import {
  louvain,
  leiden,
  labelPropagation,
  infomap,
  spectralPartition,
  hierarchicalClustering,
  kCoreDecomposition,
  corePeripheryDecomposition,
  biconnectedComponents,
} from '@bibgraph/algorithms';
```

## Quick Examples

### 1. Community Detection (Louvain)

**Use Case**: Identify research clusters in citation networks

```typescript
import { Graph } from '@bibgraph/algorithms';
import { louvain } from '@bibgraph/algorithms/clustering';

// Create citation network
const graph = new Graph<string, CitationEdge>();
graph.addNode('ML-001');
graph.addNode('ML-002');
// ... add more papers ...
graph.addEdge('ML-001', 'ML-002', { year: 2020, citations: 42 });

// Detect communities
const result = louvain(graph, { resolution: 1.0 });

if (result.isOk()) {
  const { communities, metrics } = result.unwrap();

  console.log(`Found ${communities.length} research communities`);
  console.log(`Modularity: ${metrics.modularity.toFixed(3)}`);

  // Analyze each community
  communities.forEach((community, idx) => {
    console.log(`\nCommunity ${idx}:`);
    console.log(`  Size: ${community.size} papers`);
    console.log(`  Density: ${community.density.toFixed(3)}`);
    console.log(`  Papers: ${Array.from(community.nodes).join(', ')}`);
  });
}
```

---

### 2. Balanced Partitioning (Spectral)

**Use Case**: Divide large graphs for efficient visualization

```typescript
import { spectralPartition } from '@bibgraph/algorithms/partitioning';

// Partition graph into 5 balanced subgraphs
const result = spectralPartition(graph, {
  k: 5,
  balanceTolerance: 1.2, // Allow 20% size imbalance
});

if (result.isOk()) {
  const { partitions, balanceRatio, totalEdgeCuts } = result.unwrap();

  console.log(`Created ${partitions.length} partitions`);
  console.log(`Balance ratio: ${balanceRatio.toFixed(2)}`);
  console.log(`Total edge cuts: ${totalEdgeCuts}`);

  partitions.forEach((partition, idx) => {
    console.log(`Partition ${idx}: ${partition.size} nodes`);
  });
}
```

---

### 3. Hierarchical Topic Taxonomy

**Use Case**: Visualize research topic hierarchies at multiple resolutions

```typescript
import { hierarchicalClustering } from '@bibgraph/algorithms/hierarchical';

const result = hierarchicalClustering(graph, { linkage: 'average' });

if (result.isOk()) {
  const { dendrogram } = result.unwrap();

  // Cut dendrogram at different heights
  const coarseGrain = dendrogram.cutAtHeight(0.8); // Few broad categories
  const fineGrain = dendrogram.cutAtHeight(0.2); // Many specific topics

  console.log(`At height 0.8: ${coarseGrain.length} broad categories`);
  console.log(`At height 0.2: ${fineGrain.length} specific topics`);

  // Or specify exact number of clusters
  const clusters = dendrogram.getClusters(10); // Exactly 10 clusters
}
```

---

### 4. K-Core Decomposition

**Use Case**: Identify highly cited paper cores

```typescript
import { kCoreDecomposition } from '@bibgraph/algorithms/decomposition';

const result = kCoreDecomposition(graph);

if (result.isOk()) {
  const { cores, degeneracy, coreNumbers } = result.unwrap();

  console.log(`Graph degeneracy: ${degeneracy}`);

  // Extract 5-core (papers cited by ≥5 others in core)
  const core5 = cores.get(5);
  if (core5) {
    console.log(`\n5-Core: ${core5.size} highly cited papers`);
    console.log(`Papers: ${Array.from(core5.nodes).join(', ')}`);
  }

  // Find core number for specific paper
  const paperId = 'ML-042';
  const coreNum = coreNumbers.get(paperId);
  console.log(`\n${paperId} is in ${coreNum}-core`);
}
```

---

### 5. Leiden Clustering (High Quality)

**Use Case**: Accurate community detection with connectivity guarantee

```typescript
import { leiden } from '@bibgraph/algorithms/clustering';

const result = leiden(graph, { resolution: 1.0 });

if (result.isOk()) {
  const { communities, metrics } = result.unwrap();

  // All communities are guaranteed to be connected
  communities.forEach((community) => {
    console.assert(community.isConnected, 'Leiden guarantee violated!');
  });

  console.log(`Modularity: ${metrics.modularity} (≥ Louvain)`);
}
```

---

### 6. Label Propagation (Fast)

**Use Case**: Quick clustering for large graphs (10,000+ nodes)

```typescript
import { labelPropagation } from '@bibgraph/algorithms/clustering';

const result = labelPropagation(graph, {
  maxIterations: 100,
  seed: 42, // For reproducibility
});

if (result.isOk()) {
  const { clusters, metadata } = result.unwrap();

  console.log(`Found ${clusters.length} clusters in ${metadata.runtime}ms`);
  console.log(`Converged: ${metadata.converged}`);
  console.log(`Iterations: ${metadata.iterations}`);

  // Typically converges in 3-5 iterations for citation networks
}
```

---

### 7. Infomap Clustering (Citation Flow)

**Use Case**: Cluster based on knowledge propagation patterns

```typescript
import { infomap } from '@bibgraph/algorithms/clustering';

const result = infomap(graph, { numTrials: 10 });

if (result.isOk()) {
  const { modules, compressionRatio, descriptionLength } = result.unwrap();

  console.log(`Found ${modules.length} information-flow modules`);
  console.log(`Compression: ${compressionRatio.toFixed(2)}x`);
  console.log(`Description length: ${descriptionLength.toFixed(2)} bits`);

  // Sort modules by importance (visit probability)
  const sortedModules = modules.sort(
    (a, b) => b.visitProbability - a.visitProbability
  );

  sortedModules.slice(0, 3).forEach((module, idx) => {
    console.log(
      `\nModule ${idx + 1}: ${module.nodes.size} papers, ` +
        `visit probability: ${module.visitProbability.toFixed(3)}`
    );
  });
}
```

---

### 8. Core-Periphery Decomposition

**Use Case**: Distinguish seminal papers (core) from derivative work (periphery)

```typescript
import { corePeripheryDecomposition } from '@bibgraph/algorithms/decomposition';

const result = corePeripheryDecomposition(graph, { coreThreshold: 0.7 });

if (result.isOk()) {
  const { structure } = result.unwrap();
  const { coreNodes, peripheryNodes, corenessScores, fitQuality } = structure;

  console.log(`Core: ${coreNodes.size} seminal papers (${((coreNodes.size / (coreNodes.size + peripheryNodes.size)) * 100).toFixed(1)}%)`);
  console.log(`Periphery: ${peripheryNodes.size} derivative papers`);
  console.log(`Fit quality: ${fitQuality.toFixed(3)}`);

  // Find most influential papers
  const sortedCore = Array.from(coreNodes).sort(
    (a, b) => (corenessScores.get(b) || 0) - (corenessScores.get(a) || 0)
  );

  console.log('\nTop 5 most influential papers:');
  sortedCore.slice(0, 5).forEach((paperId) => {
    const coreness = corenessScores.get(paperId) || 0;
    console.log(`  ${paperId}: coreness = ${coreness.toFixed(3)}`);
  });
}
```

---

### 9. Biconnected Components (Bridge Papers)

**Use Case**: Identify critical papers connecting research communities

```typescript
import { biconnectedComponents } from '@bibgraph/algorithms/decomposition';

const result = biconnectedComponents(graph);

if (result.isOk()) {
  const { components, articulationPoints } = result.unwrap();

  console.log(`Found ${components.length} biconnected components`);
  console.log(`Found ${articulationPoints.size} articulation points`);

  // Articulation points are bridge papers - removing them disconnects the network
  if (articulationPoints.size > 0) {
    console.log('\nBridge papers (critical for connectivity):');
    articulationPoints.forEach((paperId) => {
      console.log(`  - ${paperId}`);
    });
  }

  // Find largest robust component (no single point of failure)
  const largest = components.sort((a, b) => b.size - a.size)[0];
  console.log(`\nLargest biconnected component: ${largest.size} papers`);
  console.log(`Connected to ${largest.articulationPoints.size} bridge papers`);
}
```

---

## Error Handling Pattern

All algorithms return `Result<T, E>` types for type-safe error handling:

```typescript
const result = louvain(graph);

if (result.isOk()) {
  const { communities, metrics } = result.unwrap();
  // Handle success
} else {
  const error = result.unwrapErr();

  switch (error.type) {
    case 'EmptyGraph':
      console.error('Graph has no nodes');
      break;
    case 'InsufficientNodes':
      console.error(`Need at least ${error.required} nodes, got ${error.actual}`);
      break;
    case 'ConvergenceFailure':
      console.warn(`Failed to converge after ${error.iterations} iterations`);
      break;
    default:
      console.error(error.message);
  }
}
```

---

## Performance Tips

### 1. Choose the Right Algorithm

| Use Case                          | Algorithm              | Time Complexity | Best For                    |
| --------------------------------- | ---------------------- | --------------- | --------------------------- |
| General community detection       | Louvain                | O(n log n)      | Balanced quality/speed      |
| High-quality communities          | Leiden                 | O(n log n)      | Accuracy over speed         |
| Very large graphs (10k+ nodes)    | Label Propagation      | O(m + n)        | Speed over quality          |
| Citation flow analysis            | Infomap                | O(n log n)      | Directed networks           |
| Balanced visualization partitions | Spectral               | O(n²) - O(n³)   | k-way balanced splits       |
| Multi-resolution topic taxonomy   | Hierarchical           | O(n² log n)     | Dendrogram structure        |
| Highly cited paper tiers          | K-Core                 | O(m + n)        | Nested core hierarchy       |
| Influential vs derivative papers  | Core-Periphery         | O(k × (m + n))  | Core/periphery distinction  |
| Critical bridge papers            | Biconnected Components | O(m + n)        | Articulation point detection|

### 2. Handle Disconnected Components

```typescript
// Most algorithms handle disconnected components gracefully
const result = louvain(graph);

if (result.isOk()) {
  // Communities detected independently per component
  const { communities } = result.unwrap();
} else if (result.unwrapErr().type === 'DisconnectedGraph') {
  // Some algorithms may report this as a warning
  console.warn('Graph has multiple components');
}
```

### 3. Use Weight Functions

```typescript
// Custom edge weights based on citation count
const weightFn: WeightFunction<string, CitationEdge> = (edge, source, target) => {
  return edge.citations || 1.0; // Use citation count as weight
};

const result = louvain(graph, { weightFunction: weightFn });
```

### 4. Tune Parameters

```typescript
// Louvain: higher resolution = smaller communities
louvain(graph, { resolution: 1.5 });

// Spectral: balance tolerance tradeoff
spectralPartition(graph, { k: 5, balanceTolerance: 1.1 }); // Stricter balance

// Label Propagation: seed for reproducibility
labelPropagation(graph, { seed: 42 });
```

---

## Next Steps

1. **Read the spec**: [spec.md](./spec.md) for detailed requirements and acceptance scenarios
2. **Explore contracts**: [contracts/](./contracts/) for complete API documentation
3. **Understand the design**: [data-model.md](./data-model.md) for entity definitions
4. **Review research**: [research.md](./research.md) for algorithm choices and references

---

## Common Patterns

### Pattern 1: Compare Multiple Algorithms

```typescript
// Compare Louvain vs Leiden quality
const louvainResult = louvain(graph);
const leidenResult = leiden(graph);

if (louvainResult.isOk() && leidenResult.isOk()) {
  const louvainMod = louvainResult.unwrap().metrics.modularity;
  const leidenMod = leidenResult.unwrap().metrics.modularity;

  console.log(`Louvain modularity: ${louvainMod.toFixed(3)}`);
  console.log(`Leiden modularity: ${leidenMod.toFixed(3)}`);
  console.log(`Improvement: ${((leidenMod - louvainMod) * 100).toFixed(1)}%`);
}
```

### Pattern 2: Multi-Resolution Analysis

```typescript
// Hierarchical clustering at multiple resolutions
const result = hierarchicalClustering(graph);

if (result.isOk()) {
  const { dendrogram } = result.unwrap();

  // Coarse to fine: 3 → 10 → 50 clusters
  [3, 10, 50].forEach((numClusters) => {
    const clusters = dendrogram.getClusters(numClusters);
    console.log(`${numClusters} clusters: avg size = ${clusters.reduce((sum, c) => sum + c.size, 0) / numClusters}`);
  });
}
```

### Pattern 3: Pipeline Multiple Algorithms

```typescript
// Step 1: Detect communities with Louvain
const commResult = louvain(graph);

if (commResult.isOk()) {
  const { communities } = commResult.unwrap();

  // Step 2: Within each community, find k-cores
  communities.forEach((community) => {
    const subgraph = graph.subgraph(Array.from(community.nodes));
    const coresResult = kCoreDecomposition(subgraph);

    if (coresResult.isOk()) {
      const { degeneracy } = coresResult.unwrap();
      console.log(`Community ${community.id}: degeneracy = ${degeneracy}`);
    }
  });
}
```

---

**Tip**: All algorithms operate on in-memory `Graph<N, E>` structures with O(V + E) or better space complexity. No persistence layer required.

