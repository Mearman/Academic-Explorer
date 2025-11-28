# Quickstart: Louvain Algorithm Scaling Optimization

**Feature**: Louvain Algorithm Scaling Optimization
**Audience**: Developers implementing or testing the optimizations
**Last Updated**: 2025-11-25

## Overview

This guide provides step-by-step instructions for implementing the three-phase Louvain optimization. Each phase is independently testable and delivers incremental performance improvements.

## Prerequisites

- **Baseline**: Existing Louvain implementation in `packages/algorithms/src/clustering/louvain.ts`
- **Tests**: 9 existing tests in `packages/algorithms/__tests__/clustering/louvain.test.ts`
- **Fixtures**: Test graphs in `packages/algorithms/__tests__/fixtures/citation-networks.ts`
- **Tooling**: Node.js 18+, pnpm 8+, TypeScript 5.x

## Phase 1: Quick Performance Wins (1-2 days, 40% speedup)

### Goal

Reduce runtime from 15.4s to ~11s for 1000-node graphs through parameter tuning.

### Implementation Steps

1. **Add LouvainConfiguration type** (`packages/algorithms/src/types/clustering-types.ts`)
   ```typescript
   export interface LouvainConfiguration {
     mode?: "auto" | "best" | "random";
     seed?: number;
     minModularityIncrease?: number;
     maxIterations?: number;
   }
   ```

2. **Implement adaptive threshold** (`louvain.ts`)
   ```typescript
   function getAdaptiveThreshold(nodeCount: number): number {
     return nodeCount > 500 ? 1e-5 : 1e-6;
   }
   ```

3. **Implement progressive tolerance** (hierarchy loop in `louvain.ts`)
   ```typescript
   const tolerance = level === 0 ? 0.01 : Math.max(0.01 * Math.pow(0.1, level), 1e-6);
   ```

4. **Reduce iteration limits** (local moving phase in `louvain.ts`)
   ```typescript
   function getAdaptiveIterationLimit(nodeCount: number, level: number): number {
     if (level === 0 && nodeCount > 200) return 20;
     return nodeCount < 100 ? 50 : 40;
   }
   ```

5. **Add early convergence detection** (local moving loop in `louvain.ts`)
   ```typescript
   let consecutiveZeroMoves = 0;
   if (movedCount === 0) {
     consecutiveZeroMoves++;
     if (nodeCount > 500 && consecutiveZeroMoves >= 2) break;
   } else {
     consecutiveZeroMoves = 0;
   }
   ```

### Verification

```bash
# Run existing tests (all 9 must pass)
cd "/Users/joe/Documents/Research/PhD/BibGraph"
pnpm nx test algorithms --testPathPattern=louvain.test.ts

# Run performance benchmark
pnpm vitest run __tests__/performance/louvain-scaling.performance.test.ts

# Expected results:
# - 1000-node graph: 8-11s (down from 15.4s)
# - Modularity: ≥0.19
# - All existing tests: PASS
```

### Success Criteria

- ✅ Runtime: 8-11s for 1000 nodes (40% improvement)
- ✅ Quality: Modularity ≥0.19
- ✅ Backward compatibility: All 9 existing tests pass

---

## Phase 2: Medium Impact Optimizations (3-5 days, 2-3x additional speedup)

### Goal

Reduce runtime from ~11s to 3-5s for 1000-node graphs through Fast Louvain and altered communities.

### Implementation Steps

1. **Implement Fast Louvain random mode** (neighbor selection in `louvain.ts`)
   ```typescript
   // Existing (best mode): evaluate all neighbors, select max ΔQ
   for (const neighbor of neighbors) {
     const deltaQ = calculateModularityGain(node, neighbor, ...);
     if (deltaQ > bestDeltaQ) {
       bestDeltaQ = deltaQ;
       bestNeighbor = neighbor;
     }
   }

   // New (random mode): accept first positive ΔQ after shuffle
   const shuffledNeighbors = shuffle(neighbors, seed);
   for (const neighbor of shuffledNeighbors) {
     const deltaQ = calculateModularityGain(node, neighbor, ...);
     if (deltaQ > 0) {
       bestNeighbor = neighbor;
       break; // Accept immediately
     }
   }
   ```

2. **Implement mode selection logic** (`louvain.ts` entry point)
   ```typescript
   function determineOptimalMode(nodeCount: number): "best" | "random" {
     if (nodeCount < 200) return "best";
     if (nodeCount >= 500) return "random";
     return "best"; // 200-500 range defaults to quality
   }

   const resolvedMode = config?.mode === "auto"
     ? determineOptimalMode(graph.getNodeCount())
     : (config?.mode ?? "auto");
   ```

3. **Implement altered communities tracking** (`louvain.ts`)
   ```typescript
   interface AlteredCommunitiesState {
     alteredCommunities: Set<number>;
   }

   function getNodesTo Visit(
     alteredState: AlteredCommunitiesState,
     communities: Map<string, number>,
     graph: Graph
   ): Set<string> {
     const nodesToVisit = new Set<string>();

     // Add all nodes in altered communities
     communities.forEach((communityId, nodeId) => {
       if (alteredState.alteredCommunities.has(communityId)) {
         nodesToVisit.add(nodeId);
       }
     });

     // Add neighbors of altered nodes (border nodes)
     nodesToVisit.forEach(nodeId => {
       const neighbors = graph.getNeighbors(nodeId);
       neighbors.forEach(neighbor => nodesToVisit.add(neighbor));
     });

     return nodesToVisit;
   }
   ```

4. **Update iteration loop** (local moving phase in `louvain.ts`)
   ```typescript
   // First iteration: visit all nodes
   let alteredState: AlteredCommunitiesState = {
     alteredCommunities: new Set(Array.from(communities.values()))
   };

   for (let iter = 0; iter < maxIterations; iter++) {
     const nodesToVisit = iter === 0
       ? new Set(graph.getAllNodes().map(n => n.id))
       : getNodesToVisit(alteredState, communities, graph);

     alteredState.alteredCommunities.clear();

     for (const nodeId of nodesToVisit) {
       const oldCommunity = communities.get(nodeId);
       const newCommunity = findBestCommunity(nodeId, ...);

       if (newCommunity !== oldCommunity) {
         alteredState.alteredCommunities.add(oldCommunity);
         alteredState.alteredCommunities.add(newCommunity);
       }
     }

     if (alteredState.alteredCommunities.size === 0) break;
   }
   ```

### Verification

```bash
# Test both modes
pnpm vitest run __tests__/clustering/louvain.test.ts --mode=best
pnpm vitest run __tests__/clustering/louvain.test.ts --mode=random

# Performance comparison
pnpm vitest run __tests__/performance/louvain-scaling.performance.test.ts

# Expected results:
# - Best mode (small graphs): ~11s, modularity 0.2
# - Random mode (large graphs): 3-5s, modularity 0.19
# - Auto mode: Adaptive based on graph size
```

### Success Criteria

- ✅ Runtime: 3-5s for 1000 nodes (random mode)
- ✅ Quality: Modularity ≥0.19 (5% loss acceptable)
- ✅ Auto mode: Correct threshold switching (<200 vs ≥500 nodes)
- ✅ Altered communities: 20-40% speedup in later iterations

---

## Phase 3: Data Structure Refactoring (1-2 weeks, 2x final speedup)

### Goal

Reduce runtime from 3-5s to 1.5-2.5s for 1000-node graphs through CSR representation and community caching.

### Implementation Steps

1. **Create CSR utilities** (`packages/algorithms/src/utils/csr.ts`)
   ```typescript
   export function convertToCSR<N, E>(graph: Graph<N, E>): CSRGraph<N, E> {
     const nodeIds = graph.getAllNodes().map(n => n.id);
     const n = nodeIds.length;
     const nodeIndex = new Map(nodeIds.map((id, idx) => [id, idx]));

     const offsets = new Uint32Array(n + 1);
     const edgesTemp: number[][] = Array.from({ length: n }, () => []);
     const weightsTemp: number[][] = Array.from({ length: n }, () => []);

     // Build adjacency lists
     graph.getAllEdges().forEach(edge => {
       const srcIdx = nodeIndex.get(edge.source)!;
       const tgtIdx = nodeIndex.get(edge.target)!;
       edgesTemp[srcIdx].push(tgtIdx);
       weightsTemp[srcIdx].push(edge.weight ?? 1.0);
     });

     // Flatten into CSR format
     let edgeCount = 0;
     for (let i = 0; i < n; i++) {
       offsets[i] = edgeCount;
       edgeCount += edgesTemp[i].length;
     }
     offsets[n] = edgeCount;

     const edges = new Uint32Array(edgeCount);
     const weights = new Float64Array(edgeCount);
     for (let i = 0; i < n; i++) {
       const start = offsets[i];
       for (let j = 0; j < edgesTemp[i].length; j++) {
         edges[start + j] = edgesTemp[i][j];
         weights[start + j] = weightsTemp[i][j];
       }
     }

     return { offsets, edges, weights, nodeIds, nodeIndex };
   }
   ```

2. **Refactor neighbor access** (all graph lookups in `louvain.ts`)
   ```typescript
   // Old (Map-based)
   const neighbors = graph.getNeighbors(nodeId);

   // New (CSR-based)
   const nodeIdx = csrGraph.nodeIndex.get(nodeId)!;
   const start = csrGraph.offsets[nodeIdx];
   const end = csrGraph.offsets[nodeIdx + 1];
   const neighborIndices = csrGraph.edges.slice(start, end);
   const neighborWeights = csrGraph.weights.slice(start, end);
   const neighbors = neighborIndices.map(idx => csrGraph.nodeIds[idx]);
   ```

3. **Implement community cache** (`louvain.ts`)
   ```typescript
   type CommunityHashTable = Map<string, number>;

   function communityKey(fromId: number, toId: number): string {
     return `${fromId}-${toId}`;
   }

   function getCommunityEdgeWeight(
     cache: CommunityHashTable,
     fromCommunity: number,
     toCommunity: number,
     csrGraph: CSRGraph,
     communities: Map<string, number>
   ): number {
     const key = communityKey(fromCommunity, toCommunity);
     if (cache.has(key)) return cache.get(key)!;

     // Recalculate (lazy)
     let weight = 0;
     communities.forEach((communityId, nodeId) => {
       if (communityId === fromCommunity) {
         const nodeIdx = csrGraph.nodeIndex.get(nodeId)!;
         const start = csrGraph.offsets[nodeIdx];
         const end = csrGraph.offsets[nodeIdx + 1];

         for (let i = start; i < end; i++) {
           const neighborIdx = csrGraph.edges[i];
           const neighborId = csrGraph.nodeIds[neighborIdx];
           const neighborCommunity = communities.get(neighborId)!;

           if (neighborCommunity === toCommunity) {
             weight += csrGraph.weights[i];
           }
         }
       }
     });

     cache.set(key, weight);
     return weight;
   }
   ```

4. **Implement selective cache invalidation** (node move handler in `louvain.ts`)
   ```typescript
   function invalidateCommunityCache(
     cache: CommunityHashTable,
     communityId: number
   ): void {
     const keysToDelete: string[] = [];

     cache.forEach((_, key) => {
       const [from, to] = key.split('-').map(Number);
       if (from === communityId || to === communityId) {
         keysToDelete.push(key);
       }
     });

     keysToDelete.forEach(key => cache.delete(key));
   }

   // On node move
   const oldCommunity = communities.get(nodeId);
   const newCommunity = findBestCommunity(nodeId, ...);

   if (newCommunity !== oldCommunity) {
     invalidateCommunityCache(cache, oldCommunity);
     invalidateCommunityCache(cache, newCommunity);
     communities.set(nodeId, newCommunity);
   }
   ```

5. **Add memory fallback** (CSR conversion in `louvain.ts`)
   ```typescript
   let csrGraph: CSRGraph | null = null;
   try {
     csrGraph = convertToCSR(graph);
   } catch (e) {
     if (e instanceof RangeError) {
       // Memory exhaustion - fall back to legacy implementation
       console.warn('CSR allocation failed, using legacy Map-based implementation');
       return louvainLegacy(graph, config);
     }
     throw e;
   }
   ```

### Verification

```bash
# Dual implementation testing
pnpm vitest run __tests__/clustering/louvain.test.ts --implementation=legacy
pnpm vitest run __tests__/clustering/louvain.test.ts --implementation=csr

# Performance benchmark
pnpm vitest run __tests__/performance/louvain-scaling.performance.test.ts

# Memory benchmark
pnpm vitest run __tests__/performance/louvain-memory.performance.test.ts

# Expected results:
# - CSR runtime: 1.5-2.5s for 1000 nodes
# - Memory: <100MB for 1000 nodes
# - Quality: Modularity ≥0.19 (same as Phase 2)
# - Both implementations: Identical results (±0.01 modularity)
```

### Success Criteria

- ✅ Runtime: 1.5-2.5s for 1000 nodes (matching graphology ~940ms target)
- ✅ Memory: <100MB for 1000 nodes
- ✅ Correctness: CSR results match legacy results (±0.01 modularity)
- ✅ Fallback: Graceful degradation if CSR allocation fails

---

## Testing Strategy

### Unit Tests

```bash
# Run all Louvain tests
pnpm nx test algorithms --testPathPattern=louvain

# Run specific test suites
pnpm vitest run __tests__/clustering/louvain.test.ts          # Core functionality
pnpm vitest run __tests__/utils/csr.unit.test.ts              # CSR utilities
pnpm vitest run __tests__/clustering/altered-communities.unit.test.ts  # Altered communities
```

### Performance Tests

```bash
# Scaling benchmarks (100, 500, 1000, 5000 nodes)
pnpm vitest run __tests__/performance/louvain-scaling.performance.test.ts

# Memory benchmarks
pnpm vitest run __tests__/performance/louvain-memory.performance.test.ts

# Quality benchmarks (modularity verification)
pnpm vitest run __tests__/performance/louvain-quality.performance.test.ts
```

### Integration Tests

```bash
# Full test suite (algorithms package)
pnpm nx test algorithms

# Quality gates (entire monorepo)
pnpm validate
```

---

## Troubleshooting

### Performance Not Meeting Targets

**Problem**: Phase 1 only achieves 20% speedup (not 40%)

**Solutions**:
1. Check iteration counts in logs - should drop from 40+ to 20 for large graphs
2. Verify threshold scaling active - console.log adaptive threshold value
3. Profile with `performance.now()` - identify bottleneck (modularity calc vs neighbor iteration)

**Problem**: Phase 2 random mode slower than expected

**Solutions**:
1. Verify shuffle implementation - should be Fisher-Yates O(n) shuffle
2. Check altered communities set size - should shrink after iteration 2-3
3. Profile border node calculation - may be adding too many nodes

**Problem**: Phase 3 CSR slower than legacy

**Solutions**:
1. Check CSR construction time - should be <5% of total runtime
2. Verify typed array slicing - should use subarray (zero-copy), not slice (copy)
3. Profile cache hit rate - should be >80% after first iteration

### Quality Degradation

**Problem**: Modularity drops below 0.18

**Solutions**:
1. Reduce threshold from 1e-5 to 1e-6
2. Increase iteration limit from 20 to 30
3. Switch to best-neighbor mode for specific graph types

**Problem**: Communities are disconnected

**Solutions**:
1. This is expected with Fast Louvain (random mode)
2. If unacceptable, use best-neighbor mode
3. Consider post-processing with Leiden refinement (separate feature)

### Memory Issues

**Problem**: CSR allocation fails with RangeError

**Solutions**:
1. Verify fallback to legacy implementation works
2. Check graph size - CSR memory = 24n + 12m bytes
3. For extremely large graphs (>50k nodes), consider sampling or partitioning

---

## Deployment Checklist

- [ ] All 9 existing Louvain tests pass
- [ ] Performance benchmarks meet targets for all phases
- [ ] Modularity ≥0.19 for all test graphs
- [ ] `pnpm validate` passes (typecheck, test, build, lint)
- [ ] Atomic commits created for each phase
- [ ] Documentation updated (README, API docs)
- [ ] CLAUDE.md updated with new optimization status

---

## References

- **Spec**: `specs/027-louvain-scaling-optimization/spec.md`
- **Research**: `specs/027-louvain-scaling-optimization/research.md`
- **Data Model**: `specs/027-louvain-scaling-optimization/data-model.md`
- **API Contract**: `specs/027-louvain-scaling-optimization/contracts/louvain-api.ts`
