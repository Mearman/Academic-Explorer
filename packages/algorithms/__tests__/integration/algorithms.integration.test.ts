import { describe, it, expect } from 'vitest';

import {
  Graph,
  dfs,
  bfs,
  dijkstra,
  topologicalSort,
  detectCycle,
  connectedComponents,
  stronglyConnectedComponents,
  type Node,
  type Edge,
} from '../../src/index';

describe('algorithms integration', () => {
  describe('combined algorithm workflow', () => {
    it('should perform multiple operations on the same graph', () => {
      // Build a citation network graph
      const graph = new Graph<Node, Edge>(true); // directed

      // Add nodes (papers)
      const paper1: Node = { id: 'W1', type: 'work' };
      const paper2: Node = { id: 'W2', type: 'work' };
      const paper3: Node = { id: 'W3', type: 'work' };
      const paper4: Node = { id: 'W4', type: 'work' };
      const paper5: Node = { id: 'W5', type: 'work' };

      graph.addNode(paper1);
      graph.addNode(paper2);
      graph.addNode(paper3);
      graph.addNode(paper4);
      graph.addNode(paper5);

      // Add citation edges (W1 → W2 means W1 cites W2)
      graph.addEdge({ id: 'e1', source: 'W1', target: 'W2', type: 'citation', weight: 1 });
      graph.addEdge({ id: 'e2', source: 'W1', target: 'W3', type: 'citation', weight: 1 });
      graph.addEdge({ id: 'e3', source: 'W2', target: 'W4', type: 'citation', weight: 1 });
      graph.addEdge({ id: 'e4', source: 'W3', target: 'W4', type: 'citation', weight: 1 });
      graph.addEdge({ id: 'e5', source: 'W4', target: 'W5', type: 'citation', weight: 1 });

      // 1. DFS traversal from W1
      const dfsResult = dfs(graph, 'W1');
      expect(dfsResult.ok).toBe(true);
      if (dfsResult.ok) {
        expect(dfsResult.value.visitOrder).toHaveLength(5);
        expect(dfsResult.value.visitOrder[0].id).toBe('W1');
      }

      // 2. BFS traversal from W1
      const bfsResult = bfs(graph, 'W1');
      expect(bfsResult.ok).toBe(true);
      if (bfsResult.ok) {
        expect(bfsResult.value.visitOrder).toHaveLength(5);
        expect(bfsResult.value.visitOrder[0].id).toBe('W1');
      }

      // 3. Find shortest path from W1 to W5
      const pathResult = dijkstra(graph, 'W1', 'W5');
      expect(pathResult.ok).toBe(true);
      if (pathResult.ok && pathResult.value.some) {
        const path = pathResult.value.value;
        expect(path.nodes).toHaveLength(4); // W1 → W2 → W4 → W5 or W1 → W3 → W4 → W5
        expect(path.nodes[0].id).toBe('W1');
        expect(path.nodes[path.nodes.length - 1].id).toBe('W5');
        expect(path.totalWeight).toBe(3);
      }

      // 4. Topological sort (citation network should be acyclic)
      const topoResult = topologicalSort(graph);
      expect(topoResult.ok).toBe(true);
      if (topoResult.ok) {
        expect(topoResult.value).toHaveLength(5);
        // W1 should come before W2, W3
        const w1Index = topoResult.value.findIndex(n => n.id === 'W1');
        const w2Index = topoResult.value.findIndex(n => n.id === 'W2');
        const w3Index = topoResult.value.findIndex(n => n.id === 'W3');
        expect(w1Index).toBeLessThan(w2Index);
        expect(w1Index).toBeLessThan(w3Index);
      }

      // 5. Cycle detection (should find no cycles)
      const cycleResult = detectCycle(graph);
      expect(cycleResult.ok).toBe(true);
      if (cycleResult.ok) {
        expect(cycleResult.value.some).toBe(false);
      }

      // 6. Connected components (all nodes connected in directed sense)
      const componentsResult = connectedComponents(graph);
      expect(componentsResult.ok).toBe(true);
      if (componentsResult.ok) {
        expect(componentsResult.value).toHaveLength(1);
        expect(componentsResult.value[0].size).toBe(5);
      }

      // 7. Strongly connected components (no SCCs in DAG except singletons)
      const sccResult = stronglyConnectedComponents(graph);
      expect(sccResult.ok).toBe(true);
      if (sccResult.ok) {
        expect(sccResult.value).toHaveLength(5); // Each node is its own SCC in a DAG
      }
    });

    it('should handle graph modifications and re-analysis', () => {
      const graph = new Graph<Node, Edge>(false); // undirected

      // Build initial graph
      const a: Node = { id: 'A', type: 'author' };
      const b: Node = { id: 'B', type: 'author' };
      const c: Node = { id: 'C', type: 'author' };

      graph.addNode(a);
      graph.addNode(b);
      graph.addNode(c);
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'collaboration' });

      // Initially: 2 components (A-B, C)
      const components1 = connectedComponents(graph);
      expect(components1.ok && components1.value).toHaveLength(2);

      // Add edge to connect C
      graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'collaboration' });

      // Now: 1 component (A-B-C)
      const components2 = connectedComponents(graph);
      expect(components2.ok && components2.value).toHaveLength(1);

      // Remove edge
      const removeResult = graph.removeEdge('e2');
      expect(removeResult.ok).toBe(true);

      // Back to 2 components
      const components3 = connectedComponents(graph);
      expect(components3.ok && components3.value).toHaveLength(2);
    });

    it('should detect cycles after introducing back edge', () => {
      const graph = new Graph<Node, Edge>(true);

      const nodes: Node[] = [
        { id: 'A', type: 'node' },
        { id: 'B', type: 'node' },
        { id: 'C', type: 'node' },
      ];

      nodes.forEach(n => graph.addNode(n));
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
      graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge' });

      // Initially: no cycle
      const cycle1 = detectCycle(graph);
      expect(cycle1.ok && !cycle1.value.some).toBe(true);

      // Topological sort should work
      const topo1 = topologicalSort(graph);
      expect(topo1.ok).toBe(true);

      // Add back edge to create cycle
      graph.addEdge({ id: 'e3', source: 'C', target: 'A', type: 'edge' });

      // Now: cycle detected
      const cycle2 = detectCycle(graph);
      expect(cycle2.ok && cycle2.value.some).toBe(true);

      // Topological sort should fail
      const topo2 = topologicalSort(graph);
      expect(topo2.ok).toBe(false);
      if (!topo2.ok) {
        expect(topo2.error.type).toBe('cycle-detected');
      }
    });

    it('should find shortest path with weights vs unweighted BFS', () => {
      const graph = new Graph<Node, Edge>(true);

      const nodes: Node[] = [
        { id: 'A', type: 'location' },
        { id: 'B', type: 'location' },
        { id: 'C', type: 'location' },
        { id: 'D', type: 'location' },
      ];

      nodes.forEach(n => graph.addNode(n));

      // Create graph where BFS shortest path != weighted shortest path
      // A → B (weight 1) → D (weight 1) = total 2
      // A → C (weight 5) → D (weight 1) = total 6 (but only 2 hops)
      graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'road', weight: 1 });
      graph.addEdge({ id: 'e2', source: 'B', target: 'D', type: 'road', weight: 1 });
      graph.addEdge({ id: 'e3', source: 'A', target: 'C', type: 'road', weight: 5 });
      graph.addEdge({ id: 'e4', source: 'C', target: 'D', type: 'road', weight: 1 });

      // BFS finds path with fewest hops (ignores weights)
      const bfsResult = bfs(graph, 'A');
      expect(bfsResult.ok).toBe(true);

      // Dijkstra finds path with minimum weight
      const dijkstraResult = dijkstra(graph, 'A', 'D');
      expect(dijkstraResult.ok).toBe(true);
      if (dijkstraResult.ok && dijkstraResult.value.some) {
        const path = dijkstraResult.value.value;
        expect(path.totalWeight).toBe(2); // A → B → D
        expect(path.nodes).toHaveLength(3);
      }
    });

    it('should analyze complex graph with multiple algorithms', () => {
      // Build a more complex graph with multiple features
      const graph = new Graph<Node, Edge>(true);

      // Create 10 nodes in multiple SCCs
      for (let i = 1; i <= 10; i++) {
        graph.addNode({ id: `N${i}`, type: 'node' });
      }

      // SCC 1: N1 ↔ N2 ↔ N3 (strongly connected)
      graph.addEdge({ id: 'e1', source: 'N1', target: 'N2', type: 'edge' });
      graph.addEdge({ id: 'e2', source: 'N2', target: 'N3', type: 'edge' });
      graph.addEdge({ id: 'e3', source: 'N3', target: 'N1', type: 'edge' });

      // SCC 2: N4 ↔ N5 (strongly connected)
      graph.addEdge({ id: 'e4', source: 'N4', target: 'N5', type: 'edge' });
      graph.addEdge({ id: 'e5', source: 'N5', target: 'N4', type: 'edge' });

      // Bridge from SCC 1 to SCC 2
      graph.addEdge({ id: 'e6', source: 'N1', target: 'N4', type: 'edge' });

      // Isolated nodes: N6, N7, N8 (3 more SCCs)
      graph.addEdge({ id: 'e7', source: 'N6', target: 'N7', type: 'edge' });

      // N9 and N10 completely disconnected

      // Analyze with SCC
      const sccResult = stronglyConnectedComponents(graph);
      expect(sccResult.ok).toBe(true);
      if (sccResult.ok) {
        // Should find 7 SCCs: {N1,N2,N3}, {N4,N5}, {N6}, {N7}, {N8}, {N9}, {N10}
        expect(sccResult.value).toHaveLength(7);
        const sccSizes = sccResult.value.map(c => c.size).sort((a, b) => b - a);
        expect(sccSizes[0]).toBe(3); // SCC 1
        expect(sccSizes[1]).toBe(2); // SCC 2
      }

      // Analyze with weakly connected components
      const wcResult = connectedComponents(graph);
      expect(wcResult.ok).toBe(true);
      if (wcResult.ok) {
        // Should find 5 components: {N1-N5}, {N6,N7}, {N8}, {N9}, {N10}
        expect(wcResult.value).toHaveLength(5);
      }

      // Cycle detection should find multiple cycles
      const cycleResult = detectCycle(graph);
      expect(cycleResult.ok).toBe(true);
      if (cycleResult.ok) {
        expect(cycleResult.value.some).toBe(true); // Has cycles
      }

      // Find path from N1 to N5 (crosses SCC boundary)
      const pathResult = dijkstra(graph, 'N1', 'N5');
      expect(pathResult.ok).toBe(true);
      if (pathResult.ok && pathResult.value.some) {
        const path = pathResult.value.value;
        expect(path.nodes[0].id).toBe('N1');
        expect(path.nodes[path.nodes.length - 1].id).toBe('N5');
      }

      // No path from N1 to N9 (disconnected)
      const noPathResult = dijkstra(graph, 'N1', 'N9');
      expect(noPathResult.ok).toBe(true);
      if (noPathResult.ok) {
        expect(noPathResult.value.some).toBe(false);
      }
    });
  });

  describe('error handling across algorithms', () => {
    it('should consistently handle null/undefined graphs', () => {
      const nullGraph = null as unknown as Graph<Node, Edge>;

      const dfsResult = dfs(nullGraph, 'A');
      expect(dfsResult.ok).toBe(false);
      if (!dfsResult.ok) {
        expect(dfsResult.error.type).toBe('invalid-input');
      }

      const bfsResult = bfs(nullGraph, 'A');
      expect(bfsResult.ok).toBe(false);
      if (!bfsResult.ok) {
        expect(bfsResult.error.type).toBe('invalid-input');
      }

      const dijkstraResult = dijkstra(nullGraph, 'A', 'B');
      expect(dijkstraResult.ok).toBe(false);
      if (!dijkstraResult.ok) {
        expect(dijkstraResult.error.type).toBe('invalid-input');
      }

      const topoResult = topologicalSort(nullGraph);
      expect(topoResult.ok).toBe(false);
      if (!topoResult.ok) {
        expect(topoResult.error.type).toBe('invalid-input');
      }

      const cycleResult = detectCycle(nullGraph);
      expect(cycleResult.ok).toBe(false);
      if (!cycleResult.ok) {
        expect(cycleResult.error.type).toBe('invalid-input');
      }

      const ccResult = connectedComponents(nullGraph);
      expect(ccResult.ok).toBe(false);
      if (!ccResult.ok) {
        expect(ccResult.error.type).toBe('invalid-input');
      }

      const sccResult = stronglyConnectedComponents(nullGraph);
      expect(sccResult.ok).toBe(false);
      if (!sccResult.ok) {
        expect(sccResult.error.type).toBe('invalid-input');
      }
    });

    it('should consistently handle invalid start nodes', () => {
      const graph = new Graph<Node, Edge>(true);
      graph.addNode({ id: 'A', type: 'node' });

      const dfsResult = dfs(graph, 'INVALID');
      expect(dfsResult.ok).toBe(false);
      if (!dfsResult.ok) {
        expect(dfsResult.error.type).toBe('invalid-input');
      }

      const bfsResult = bfs(graph, 'INVALID');
      expect(bfsResult.ok).toBe(false);
      if (!bfsResult.ok) {
        expect(bfsResult.error.type).toBe('invalid-input');
      }

      const dijkstraResult = dijkstra(graph, 'INVALID', 'A');
      expect(dijkstraResult.ok).toBe(false);
      if (!dijkstraResult.ok) {
        expect(dijkstraResult.error.type).toBe('invalid-input');
      }
    });
  });
});
