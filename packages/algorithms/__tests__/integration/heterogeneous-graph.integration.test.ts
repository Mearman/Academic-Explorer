import { describe, it, expect } from 'vitest';
import {
  Graph,
  dfs,
  bfs,
  dijkstra,
  connectedComponents,
  type Node,
  type Edge,
} from '../../src/index';

// Academic domain-specific node types
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

interface InstitutionNode extends Node {
  id: string;
  type: 'institution';
  name: string;
  country: string;
}

// Domain-specific edge types
interface CitationEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: 'citation';
  weight: number;
  year: number;
}

interface AuthorshipEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: 'authorship';
  weight: number;
  position: number; // author position in paper
}

interface AffiliationEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: 'affiliation';
  weight: number;
  startYear: number;
}

// Union types for heterogeneous graphs
type AcademicNode = WorkNode | AuthorNode | InstitutionNode;
type AcademicEdge = CitationEdge | AuthorshipEdge | AffiliationEdge;

describe('heterogeneous graph integration', () => {
  describe('academic citation network', () => {
    it('should handle mixed node types in citation graph', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      // Create works
      const work1: WorkNode = {
        id: 'W1',
        type: 'work',
        title: 'Introduction to Algorithms',
        year: 2020,
      };

      const work2: WorkNode = {
        id: 'W2',
        type: 'work',
        title: 'Advanced Data Structures',
        year: 2021,
      };

      const work3: WorkNode = {
        id: 'W3',
        type: 'work',
        title: 'Graph Theory Applications',
        year: 2022,
      };

      // Create authors
      const author1: AuthorNode = {
        id: 'A1',
        type: 'author',
        name: 'Alice Smith',
        hIndex: 25,
      };

      const author2: AuthorNode = {
        id: 'A2',
        type: 'author',
        name: 'Bob Jones',
        hIndex: 18,
      };

      // Add all nodes
      [work1, work2, work3, author1, author2].forEach(node => {
        graph.addNode(node);
      });

      // Add citation edges (work → work)
      const citation1: CitationEdge = {
        id: 'c1',
        source: 'W3',
        target: 'W1',
        type: 'citation',
        weight: 1,
        year: 2022,
      };

      const citation2: CitationEdge = {
        id: 'c2',
        source: 'W3',
        target: 'W2',
        type: 'citation',
        weight: 1,
        year: 2022,
      };

      graph.addEdge(citation1);
      graph.addEdge(citation2);

      // Add authorship edges (work → author)
      const authorship1: AuthorshipEdge = {
        id: 'auth1',
        source: 'W1',
        target: 'A1',
        type: 'authorship',
        weight: 1,
        position: 1,
      };

      const authorship2: AuthorshipEdge = {
        id: 'auth2',
        source: 'W2',
        target: 'A2',
        type: 'authorship',
        weight: 1,
        position: 1,
      };

      const authorship3: AuthorshipEdge = {
        id: 'auth3',
        source: 'W3',
        target: 'A1',
        type: 'authorship',
        weight: 1,
        position: 1,
      };

      const authorship4: AuthorshipEdge = {
        id: 'auth4',
        source: 'W3',
        target: 'A2',
        type: 'authorship',
        weight: 1,
        position: 2,
      };

      graph.addEdge(authorship1);
      graph.addEdge(authorship2);
      graph.addEdge(authorship3);
      graph.addEdge(authorship4);

      // DFS from W3 should discover all reachable nodes
      const dfsResult = dfs(graph, 'W3');
      expect(dfsResult.ok).toBe(true);
      if (dfsResult.ok) {
        expect(dfsResult.value.visitOrder).toHaveLength(5);

        // Type narrowing works - can access domain-specific properties
        for (const node of dfsResult.value.visitOrder) {
          if (node.type === 'work') {
            expect(node.title).toBeDefined();
            expect(node.year).toBeDefined();
          } else if (node.type === 'author') {
            expect(node.name).toBeDefined();
            expect(node.hIndex).toBeDefined();
          }
        }
      }

      // Find path from W3 to A1 (through authorship)
      const pathResult = dijkstra(graph, 'W3', 'A1');
      expect(pathResult.ok).toBe(true);
      if (pathResult.ok && pathResult.value.some) {
        const path = pathResult.value.value;
        expect(path.nodes).toHaveLength(2); // W3 → A1
        expect(path.edges).toHaveLength(1);

        // Edge type narrowing
        const edge = path.edges[0];
        if (edge.type === 'authorship') {
          expect(edge.position).toBeDefined();
        }
      }

      // Connected components treats directed as undirected
      const componentsResult = connectedComponents(graph);
      expect(componentsResult.ok).toBe(true);
      if (componentsResult.ok) {
        expect(componentsResult.value).toHaveLength(1); // All connected
        expect(componentsResult.value[0].size).toBe(5);
      }
    });

    it('should handle institutional affiliations with heterogeneous types', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      // Create authors
      const author1: AuthorNode = {
        id: 'A1',
        type: 'author',
        name: 'Carol Lee',
        hIndex: 30,
      };

      const author2: AuthorNode = {
        id: 'A2',
        type: 'author',
        name: 'David Kim',
        hIndex: 22,
      };

      // Create institutions
      const inst1: InstitutionNode = {
        id: 'I1',
        type: 'institution',
        name: 'MIT',
        country: 'USA',
      };

      const inst2: InstitutionNode = {
        id: 'I2',
        type: 'institution',
        name: 'Oxford',
        country: 'UK',
      };

      graph.addNode(author1);
      graph.addNode(author2);
      graph.addNode(inst1);
      graph.addNode(inst2);

      // Add affiliation edges
      const aff1: AffiliationEdge = {
        id: 'aff1',
        source: 'A1',
        target: 'I1',
        type: 'affiliation',
        weight: 1,
        startYear: 2015,
      };

      const aff2: AffiliationEdge = {
        id: 'aff2',
        source: 'A2',
        target: 'I2',
        type: 'affiliation',
        weight: 1,
        startYear: 2018,
      };

      graph.addEdge(aff1);
      graph.addEdge(aff2);

      // BFS from A1
      const bfsResult = bfs(graph, 'A1');
      expect(bfsResult.ok).toBe(true);
      if (bfsResult.ok) {
        expect(bfsResult.value.visitOrder).toHaveLength(2); // A1, I1

        // Verify types preserved
        const nodes = bfsResult.value.visitOrder;
        expect(nodes.some(n => n.type === 'author')).toBe(true);
        expect(nodes.some(n => n.type === 'institution')).toBe(true);

        // Access domain-specific properties
        const institution = nodes.find(n => n.type === 'institution') as InstitutionNode | undefined;
        expect(institution?.country).toBe('USA');
      }

      // Components shows 2 separate communities
      const componentsResult = connectedComponents(graph);
      expect(componentsResult.ok).toBe(true);
      if (componentsResult.ok) {
        expect(componentsResult.value).toHaveLength(2);
      }
    });
  });

  describe('type preservation and narrowing', () => {
    it('should preserve node types through traversal operations', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(false);

      const work: WorkNode = {
        id: 'W1',
        type: 'work',
        title: 'Test Paper',
        year: 2023,
      };

      const author: AuthorNode = {
        id: 'A1',
        type: 'author',
        name: 'Test Author',
        hIndex: 10,
      };

      const institution: InstitutionNode = {
        id: 'I1',
        type: 'institution',
        name: 'Test University',
        country: 'USA',
      };

      graph.addNode(work);
      graph.addNode(author);
      graph.addNode(institution);

      graph.addEdge({
        id: 'e1',
        source: 'W1',
        target: 'A1',
        type: 'authorship',
        weight: 1,
        position: 1,
      });

      graph.addEdge({
        id: 'e2',
        source: 'A1',
        target: 'I1',
        type: 'affiliation',
        weight: 1,
        startYear: 2020,
      });

      // BFS preserves all type information
      const bfsResult = bfs(graph, 'W1');
      expect(bfsResult.ok).toBe(true);
      if (bfsResult.ok) {
        const nodes = bfsResult.value.visitOrder;

        // Can narrow types and access domain-specific properties
        const workNodes = nodes.filter((n): n is WorkNode => n.type === 'work');
        const authorNodes = nodes.filter((n): n is AuthorNode => n.type === 'author');
        const institutionNodes = nodes.filter((n): n is InstitutionNode => n.type === 'institution');

        expect(workNodes).toHaveLength(1);
        expect(workNodes[0].title).toBe('Test Paper');
        expect(workNodes[0].year).toBe(2023);

        expect(authorNodes).toHaveLength(1);
        expect(authorNodes[0].name).toBe('Test Author');
        expect(authorNodes[0].hIndex).toBe(10);

        expect(institutionNodes).toHaveLength(1);
        expect(institutionNodes[0].name).toBe('Test University');
        expect(institutionNodes[0].country).toBe('USA');
      }
    });

    it('should preserve edge types through pathfinding operations', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(true);

      const work1: WorkNode = { id: 'W1', type: 'work', title: 'Paper 1', year: 2020 };
      const work2: WorkNode = { id: 'W2', type: 'work', title: 'Paper 2', year: 2021 };
      const author: AuthorNode = { id: 'A1', type: 'author', name: 'Author', hIndex: 15 };

      graph.addNode(work1);
      graph.addNode(work2);
      graph.addNode(author);

      const citation: CitationEdge = {
        id: 'c1',
        source: 'W2',
        target: 'W1',
        type: 'citation',
        weight: 1,
        year: 2021,
      };

      const authorship: AuthorshipEdge = {
        id: 'auth1',
        source: 'W1',
        target: 'A1',
        type: 'authorship',
        weight: 1,
        position: 1,
      };

      graph.addEdge(citation);
      graph.addEdge(authorship);

      // Find path W2 → W1 → A1
      const pathResult = dijkstra(graph, 'W2', 'A1');
      expect(pathResult.ok).toBe(true);
      if (pathResult.ok && pathResult.value.some) {
        const path = pathResult.value.value;
        expect(path.edges).toHaveLength(2);

        // Type narrowing on edges
        const citationEdge = path.edges.find((e): e is CitationEdge => e.type === 'citation');
        const authorshipEdge = path.edges.find((e): e is AuthorshipEdge => e.type === 'authorship');

        expect(citationEdge).toBeDefined();
        expect(citationEdge?.year).toBe(2021);

        expect(authorshipEdge).toBeDefined();
        expect(authorshipEdge?.position).toBe(1);
      }
    });
  });

  describe('complex academic scenarios', () => {
    it('should handle multi-author collaboration network', () => {
      const graph = new Graph<AcademicNode, AcademicEdge>(false);

      // Create 4 authors
      const authors: AuthorNode[] = [
        { id: 'A1', type: 'author', name: 'Author 1', hIndex: 20 },
        { id: 'A2', type: 'author', name: 'Author 2', hIndex: 15 },
        { id: 'A3', type: 'author', name: 'Author 3', hIndex: 25 },
        { id: 'A4', type: 'author', name: 'Author 4', hIndex: 18 },
      ];

      // Create 3 works
      const works: WorkNode[] = [
        { id: 'W1', type: 'work', title: 'Paper 1', year: 2020 },
        { id: 'W2', type: 'work', title: 'Paper 2', year: 2021 },
        { id: 'W3', type: 'work', title: 'Paper 3', year: 2022 },
      ];

      authors.forEach(a => graph.addNode(a));
      works.forEach(w => graph.addNode(w));

      // Paper 1: Authors 1, 2
      graph.addEdge({ id: 'e1', source: 'W1', target: 'A1', type: 'authorship', weight: 1, position: 1 });
      graph.addEdge({ id: 'e2', source: 'W1', target: 'A2', type: 'authorship', weight: 1, position: 2 });

      // Paper 2: Authors 2, 3
      graph.addEdge({ id: 'e3', source: 'W2', target: 'A2', type: 'authorship', weight: 1, position: 1 });
      graph.addEdge({ id: 'e4', source: 'W2', target: 'A3', type: 'authorship', weight: 1, position: 2 });

      // Paper 3: Authors 3, 4
      graph.addEdge({ id: 'e5', source: 'W3', target: 'A3', type: 'authorship', weight: 1, position: 1 });
      graph.addEdge({ id: 'e6', source: 'W3', target: 'A4', type: 'authorship', weight: 1, position: 2 });

      // All nodes should be in one connected component
      const componentsResult = connectedComponents(graph);
      expect(componentsResult.ok).toBe(true);
      if (componentsResult.ok) {
        expect(componentsResult.value).toHaveLength(1);
        expect(componentsResult.value[0].size).toBe(7); // 4 authors + 3 works
      }

      // Path from A1 to A4 exists through collaboration chain
      const pathResult = dijkstra(graph, 'A1', 'A4');
      expect(pathResult.ok).toBe(true);
      if (pathResult.ok && pathResult.value.some) {
        const path = pathResult.value.value;
        // A1 → W1 → A2 → W2 → A3 → W3 → A4
        expect(path.nodes.length).toBeGreaterThanOrEqual(2);
        expect(path.nodes[0].id).toBe('A1');
        expect(path.nodes[path.nodes.length - 1].id).toBe('A4');
      }
    });
  });
});
