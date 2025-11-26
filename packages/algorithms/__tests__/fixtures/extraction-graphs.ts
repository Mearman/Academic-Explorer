/**
 * Test fixtures for graph extraction algorithms
 */
import { Graph, type Node, type Edge } from '../../src/graph/graph';

/**
 * Creates a simple star graph with a central hub
 * Center node connected to k outer nodes
 */
export function createStarGraph(k: number): Graph<Node, Edge> {
  const graph = new Graph<Node, Edge>(false);

  // Add center node
  graph.addNode({ id: 'center', type: 'hub' });

  // Add outer nodes and connect to center
  for (let i = 0; i < k; i++) {
    const nodeId = `outer_${i}`;
    graph.addNode({ id: nodeId, type: 'leaf' });
    graph.addEdge({
      id: `e_center_${i}`,
      source: 'center',
      target: nodeId,
      type: 'connection',
    });
  }

  return graph;
}

/**
 * Creates a linear chain graph: n1 -> n2 -> n3 -> ... -> nk
 */
export function createChainGraph(k: number): Graph<Node, Edge> {
  const graph = new Graph<Node, Edge>(true);

  // Add nodes
  for (let i = 0; i < k; i++) {
    graph.addNode({ id: `n${i}`, type: 'node' });
  }

  // Add edges
  for (let i = 0; i < k - 1; i++) {
    graph.addEdge({
      id: `e${i}`,
      source: `n${i}`,
      target: `n${i + 1}`,
      type: 'edge',
    });
  }

  return graph;
}

/**
 * Creates a complete graph (all nodes connected to all others)
 */
export function createCompleteGraph(n: number): Graph<Node, Edge> {
  const graph = new Graph<Node, Edge>(false);

  // Add nodes
  for (let i = 0; i < n; i++) {
    graph.addNode({ id: `n${i}`, type: 'node' });
  }

  // Add all edges
  let edgeId = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      graph.addEdge({
        id: `e${edgeId++}`,
        source: `n${i}`,
        target: `n${j}`,
        type: 'edge',
      });
    }
  }

  return graph;
}

/**
 * Creates a citation network with known structure
 * Papers cite older papers, creating a directed acyclic structure
 */
export function createCitationNetwork(
  numPapers: number,
  avgCitationsPerPaper: number = 3
): Graph<Node, Edge> {
  const graph = new Graph<Node, Edge>(true);

  // Add papers (newer papers have higher IDs)
  for (let i = 0; i < numPapers; i++) {
    graph.addNode({
      id: `P${i}`,
      type: 'paper',
    });
  }

  // Each paper cites some older papers
  let edgeId = 0;
  for (let i = 1; i < numPapers; i++) {
    // Number of citations varies
    const numCitations = Math.min(i, Math.floor(avgCitationsPerPaper + Math.random() * 2 - 1));

    // Pick random older papers to cite
    const citedPapers = new Set<number>();
    for (let j = 0; j < numCitations && citedPapers.size < i; j++) {
      const cited = Math.floor(Math.random() * i);
      if (!citedPapers.has(cited)) {
        citedPapers.add(cited);
        graph.addEdge({
          id: `cite_${edgeId++}`,
          source: `P${i}`,
          target: `P${cited}`,
          type: 'cites',
        });
      }
    }
  }

  return graph;
}

/**
 * Creates a graph with known triangles for motif detection testing
 */
export function createTriangleGraph(): Graph<Node, Edge> {
  const graph = new Graph<Node, Edge>(false);

  // Triangle 1: A-B-C
  graph.addNode({ id: 'A', type: 'node' });
  graph.addNode({ id: 'B', type: 'node' });
  graph.addNode({ id: 'C', type: 'node' });
  graph.addEdge({ id: 'e_AB', source: 'A', target: 'B', type: 'edge' });
  graph.addEdge({ id: 'e_BC', source: 'B', target: 'C', type: 'edge' });
  graph.addEdge({ id: 'e_CA', source: 'C', target: 'A', type: 'edge' });

  // Triangle 2: B-C-D (shares edge with triangle 1)
  graph.addNode({ id: 'D', type: 'node' });
  graph.addEdge({ id: 'e_BD', source: 'B', target: 'D', type: 'edge' });
  graph.addEdge({ id: 'e_CD', source: 'C', target: 'D', type: 'edge' });

  // Isolated edge (no triangle)
  graph.addNode({ id: 'E', type: 'node' });
  graph.addNode({ id: 'F', type: 'node' });
  graph.addEdge({ id: 'e_EF', source: 'E', target: 'F', type: 'edge' });

  return graph;
}

/**
 * Creates a graph with known co-citation patterns
 * Multiple papers citing the same set of references
 */
export function createCoCitationGraph(): Graph<Node, Edge> {
  const graph = new Graph<Node, Edge>(true);

  // Seminal papers (references)
  graph.addNode({ id: 'R1', type: 'paper' });
  graph.addNode({ id: 'R2', type: 'paper' });
  graph.addNode({ id: 'R3', type: 'paper' });

  // Papers that cite same references (co-citation)
  graph.addNode({ id: 'P1', type: 'paper' });
  graph.addNode({ id: 'P2', type: 'paper' });
  graph.addNode({ id: 'P3', type: 'paper' });

  // P1, P2, P3 all cite R1 and R2 (co-citation pair)
  graph.addEdge({ id: 'c1', source: 'P1', target: 'R1', type: 'cites' });
  graph.addEdge({ id: 'c2', source: 'P1', target: 'R2', type: 'cites' });
  graph.addEdge({ id: 'c3', source: 'P2', target: 'R1', type: 'cites' });
  graph.addEdge({ id: 'c4', source: 'P2', target: 'R2', type: 'cites' });
  graph.addEdge({ id: 'c5', source: 'P3', target: 'R1', type: 'cites' });
  graph.addEdge({ id: 'c6', source: 'P3', target: 'R2', type: 'cites' });

  // P1 also cites R3 (not co-cited with R1, R2 by P2, P3)
  graph.addEdge({ id: 'c7', source: 'P1', target: 'R3', type: 'cites' });

  return graph;
}

/**
 * Creates a graph with bibliographic coupling pattern
 * Papers that cite the same references are coupled
 */
export function createBibliographicCouplingGraph(): Graph<Node, Edge> {
  const graph = new Graph<Node, Edge>(true);

  // References
  graph.addNode({ id: 'ref1', type: 'reference' });
  graph.addNode({ id: 'ref2', type: 'reference' });
  graph.addNode({ id: 'ref3', type: 'reference' });

  // Citing papers
  graph.addNode({ id: 'citing1', type: 'paper' });
  graph.addNode({ id: 'citing2', type: 'paper' });
  graph.addNode({ id: 'citing3', type: 'paper' });

  // citing1 and citing2 both cite ref1 and ref2 (strong coupling)
  graph.addEdge({ id: 'bc1', source: 'citing1', target: 'ref1', type: 'cites' });
  graph.addEdge({ id: 'bc2', source: 'citing1', target: 'ref2', type: 'cites' });
  graph.addEdge({ id: 'bc3', source: 'citing2', target: 'ref1', type: 'cites' });
  graph.addEdge({ id: 'bc4', source: 'citing2', target: 'ref2', type: 'cites' });

  // citing3 cites only ref3 (not coupled with citing1, citing2)
  graph.addEdge({ id: 'bc5', source: 'citing3', target: 'ref3', type: 'cites' });

  return graph;
}

/**
 * Creates a random graph with approximately n nodes and m edges
 */
export function createRandomGraph(n: number, m: number): Graph<Node, Edge> {
  const graph = new Graph<Node, Edge>(false);

  // Add nodes
  for (let i = 0; i < n; i++) {
    graph.addNode({ id: `n${i}`, type: 'node' });
  }

  // Add random edges
  const addedEdges = new Set<string>();
  let edgeCount = 0;

  while (edgeCount < m) {
    const source = Math.floor(Math.random() * n);
    const target = Math.floor(Math.random() * n);

    if (source !== target) {
      const edgeKey = source < target ? `${source}-${target}` : `${target}-${source}`;
      if (!addedEdges.has(edgeKey)) {
        addedEdges.add(edgeKey);
        graph.addEdge({
          id: `e${edgeCount}`,
          source: `n${source}`,
          target: `n${target}`,
          type: 'edge',
        });
        edgeCount++;
      }
    }
  }

  return graph;
}

/**
 * Creates a disconnected graph with multiple components
 */
export function createDisconnectedGraph(): Graph<Node, Edge> {
  const graph = new Graph<Node, Edge>(false);

  // Component 1: A-B-C
  graph.addNode({ id: 'A', type: 'node' });
  graph.addNode({ id: 'B', type: 'node' });
  graph.addNode({ id: 'C', type: 'node' });
  graph.addEdge({ id: 'e1', source: 'A', target: 'B', type: 'edge' });
  graph.addEdge({ id: 'e2', source: 'B', target: 'C', type: 'edge' });

  // Component 2: D-E (isolated pair)
  graph.addNode({ id: 'D', type: 'node' });
  graph.addNode({ id: 'E', type: 'node' });
  graph.addEdge({ id: 'e3', source: 'D', target: 'E', type: 'edge' });

  // Component 3: F (isolated node)
  graph.addNode({ id: 'F', type: 'node' });

  return graph;
}
