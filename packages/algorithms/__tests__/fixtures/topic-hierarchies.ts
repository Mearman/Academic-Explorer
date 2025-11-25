/**
 * Topic hierarchy test fixtures for hierarchical clustering testing.
 * Provides topic graphs with known hierarchical structures (3 levels).
 *
 * @module fixtures/topic-hierarchies
 */

import { Graph } from '../../src/graph/graph';

/**
 * Topic node for hierarchical clustering.
 */
export interface TopicNode {
  id: string;
  name: string;
  level: number; // 0 = root, 1 = mid-level, 2 = leaf
  parentId?: string; // For validation of hierarchy
}

/**
 * Topic relationship edge (directed: child → parent or undirected similarity).
 */
export interface TopicEdge {
  id: string;
  source: string;
  target: string;
  type: 'hierarchy' | 'similarity';
  weight: number; // Similarity score or hierarchy strength
}

/**
 * Create a topic hierarchy graph with 50 topics across 3 levels.
 *
 * Structure:
 * - Level 0 (Root): 5 broad topics
 * - Level 1 (Mid): 15 sub-topics (3 per root)
 * - Level 2 (Leaf): 30 specific topics (2 per mid-level)
 *
 * Edges:
 * - Hierarchy edges: child → parent (directed)
 * - Similarity edges: between topics at same level (undirected)
 *
 * Total: 50 nodes, ~90 edges (45 hierarchy + 45 similarity)
 *
 * @param directed - If true, includes hierarchy edges; if false, only similarity edges
 * @returns Graph with 50 topics in 3-level hierarchy
 *
 * @example
 * ```typescript
 * const graph = topicHierarchyGraph(true); // With hierarchy edges
 * console.log(`Nodes: ${graph.getNodeCount()}`); // 50
 * console.log(`Edges: ${graph.getEdgeCount()}`); // ~90
 * ```
 */
export function topicHierarchyGraph(directed = false): Graph<TopicNode, TopicEdge> {
  const graph = new Graph<TopicNode, TopicEdge>(directed);

  const rootTopics = [
    'Computer Science',
    'Biology',
    'Physics',
    'Chemistry',
    'Mathematics',
  ];

  const midLevelTopics = [
    // Computer Science
    'Machine Learning',
    'Databases',
    'Networks',
    // Biology
    'Genetics',
    'Ecology',
    'Neuroscience',
    // Physics
    'Quantum Mechanics',
    'Thermodynamics',
    'Astrophysics',
    // Chemistry
    'Organic Chemistry',
    'Physical Chemistry',
    'Analytical Chemistry',
    // Mathematics
    'Algebra',
    'Calculus',
    'Topology',
  ];

  const leafTopics = [
    // Machine Learning
    'Deep Learning',
    'Reinforcement Learning',
    // Databases
    'SQL',
    'NoSQL',
    // Networks
    'TCP/IP',
    'Wireless Networks',
    // Genetics
    'DNA Sequencing',
    'Gene Expression',
    // Ecology
    'Population Dynamics',
    'Ecosystem Services',
    // Neuroscience
    'Brain Imaging',
    'Neural Networks',
    // Quantum Mechanics
    'Quantum Computing',
    'Quantum Entanglement',
    // Thermodynamics
    'Heat Transfer',
    'Entropy',
    // Astrophysics
    'Black Holes',
    'Cosmology',
    // Organic Chemistry
    'Synthesis',
    'Reaction Mechanisms',
    // Physical Chemistry
    'Kinetics',
    'Spectroscopy',
    // Analytical Chemistry
    'Chromatography',
    'Mass Spectrometry',
    // Algebra
    'Group Theory',
    'Ring Theory',
    // Calculus
    'Differential Equations',
    'Integration',
    // Topology
    'Manifolds',
    'Knot Theory',
  ];

  // Add root nodes (Level 0)
  for (let i = 0; i < rootTopics.length; i++) {
    const node: TopicNode = {
      id: `T0-${i}`,
      name: rootTopics[i],
      level: 0,
    };
    graph.addNode(node);
  }

  // Add mid-level nodes (Level 1)
  for (let i = 0; i < midLevelTopics.length; i++) {
    const parentIdx = Math.floor(i / 3);
    const node: TopicNode = {
      id: `T1-${i}`,
      name: midLevelTopics[i],
      level: 1,
      parentId: `T0-${parentIdx}`,
    };
    graph.addNode(node);
  }

  // Add leaf nodes (Level 2)
  for (let i = 0; i < leafTopics.length; i++) {
    const parentIdx = Math.floor(i / 2);
    const node: TopicNode = {
      id: `T2-${i}`,
      name: leafTopics[i],
      level: 2,
      parentId: `T1-${parentIdx}`,
    };
    graph.addNode(node);
  }

  // Add hierarchy edges (child → parent) if directed
  if (directed) {
    // Level 1 → Level 0 edges
    for (let i = 0; i < midLevelTopics.length; i++) {
      const parentIdx = Math.floor(i / 3);
      const edge: TopicEdge = {
        id: `H1-${i}-to-0-${parentIdx}`,
        source: `T1-${i}`,
        target: `T0-${parentIdx}`,
        type: 'hierarchy',
        weight: 1.0,
      };
      graph.addEdge(edge);
    }

    // Level 2 → Level 1 edges
    for (let i = 0; i < leafTopics.length; i++) {
      const parentIdx = Math.floor(i / 2);
      const edge: TopicEdge = {
        id: `H2-${i}-to-1-${parentIdx}`,
        source: `T2-${i}`,
        target: `T1-${parentIdx}`,
        type: 'hierarchy',
        weight: 1.0,
      };
      graph.addEdge(edge);
    }
  }

  // Add similarity edges (within same level)
  // Level 0 similarity (all roots connected to each other)
  for (let i = 0; i < rootTopics.length; i++) {
    for (let j = i + 1; j < rootTopics.length; j++) {
      const edge: TopicEdge = {
        id: `S0-${i}-${j}`,
        source: `T0-${i}`,
        target: `T0-${j}`,
        type: 'similarity',
        weight: 0.3, // Low similarity (broad topics)
      };
      graph.addEdge(edge);
    }
  }

  // Level 1 similarity (within same root topic)
  for (let i = 0; i < midLevelTopics.length; i++) {
    const parentIdx = Math.floor(i / 3);
    const startInParent = parentIdx * 3;
    const endInParent = startInParent + 3;

    for (let j = startInParent; j < endInParent; j++) {
      if (i < j) {
        const edge: TopicEdge = {
          id: `S1-${i}-${j}`,
          source: `T1-${i}`,
          target: `T1-${j}`,
          type: 'similarity',
          weight: 0.6, // Medium similarity (related sub-topics)
        };
        graph.addEdge(edge);
      }
    }
  }

  // Level 2 similarity (within same mid-level topic)
  for (let i = 0; i < leafTopics.length; i++) {
    const parentIdx = Math.floor(i / 2);
    const startInParent = parentIdx * 2;
    const endInParent = startInParent + 2;

    for (let j = startInParent; j < endInParent; j++) {
      if (i < j) {
        const edge: TopicEdge = {
          id: `S2-${i}-${j}`,
          source: `T2-${i}`,
          target: `T2-${j}`,
          type: 'similarity',
          weight: 0.9, // High similarity (specific related topics)
        };
        graph.addEdge(edge);
      }
    }
  }

  return graph;
}

/**
 * Create a simple 3-level hierarchy for testing dendrogram operations.
 *
 * Structure:
 * - Level 0: 1 root
 * - Level 1: 3 children
 * - Level 2: 9 grandchildren (3 per child)
 *
 * Total: 13 nodes, 12 hierarchy edges
 *
 * @returns Graph with simple 3-level hierarchy
 *
 * @example
 * ```typescript
 * const graph = simpleHierarchy();
 * console.log(`Nodes: ${graph.getNodeCount()}`); // 13
 * ```
 */
export function simpleHierarchy(): Graph<TopicNode, TopicEdge> {
  const graph = new Graph<TopicNode, TopicEdge>(true);

  // Root
  graph.addNode({
    id: 'ROOT',
    name: 'Root Topic',
    level: 0,
  });

  // Level 1
  for (let i = 0; i < 3; i++) {
    graph.addNode({
      id: `L1-${i}`,
      name: `Level 1 Topic ${i}`,
      level: 1,
      parentId: 'ROOT',
    });

    graph.addEdge({
      id: `E-L1-${i}-ROOT`,
      source: `L1-${i}`,
      target: 'ROOT',
      type: 'hierarchy',
      weight: 1.0,
    });
  }

  // Level 2
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const childIdx = i * 3 + j;
      graph.addNode({
        id: `L2-${childIdx}`,
        name: `Level 2 Topic ${childIdx}`,
        level: 2,
        parentId: `L1-${i}`,
      });

      graph.addEdge({
        id: `E-L2-${childIdx}-L1-${i}`,
        source: `L2-${childIdx}`,
        target: `L1-${i}`,
        type: 'hierarchy',
        weight: 1.0,
      });
    }
  }

  return graph;
}
