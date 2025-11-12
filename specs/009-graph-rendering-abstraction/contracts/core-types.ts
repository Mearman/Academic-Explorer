/**
 * Core Types for Graph Rendering Abstraction
 *
 * This file defines the fundamental TypeScript interfaces for graph entities
 * with generic type parameters to maintain domain independence.
 *
 * @see ../data-model.md for detailed specifications
 */

/**
 * Represents a graph vertex with position, velocity, and custom metadata.
 *
 * @template TData - Domain-specific metadata type (must be JSON-serializable)
 *
 * @property {string} id - Unique node identifier (non-empty, unique within graph)
 * @property {string} type - Type discriminator for visual mapping (non-empty)
 * @property {number} x - X-coordinate position (finite number, no NaN/Infinity)
 * @property {number} y - Y-coordinate position (finite number, no NaN/Infinity)
 * @property {number} [vx] - X-axis velocity for simulation (finite number, default 0)
 * @property {number} [vy] - Y-axis velocity for simulation (finite number, default 0)
 * @property {number} [fx] - X-axis force accumulator (finite number, default 0)
 * @property {number} [fy] - Y-axis force accumulator (finite number, default 0)
 * @property {boolean} [fixed] - Pin node to current position (default false)
 * @property {TData} [data] - Domain-specific metadata (generic)
 *
 * @example
 * ```typescript
 * // Simple node with no custom data
 * type BasicNode = Node<Record<string, never>>;
 *
 * // Academic node with custom metadata
 * interface AcademicData {
 *   title: string;
 *   citations: number;
 * }
 * type AcademicNode = Node<AcademicData>;
 * ```
 */
export interface Node<TData = unknown> {
  /** Unique node identifier (non-empty string) */
  id: string;

  /** Type discriminator for visual mapping (non-empty string) */
  type: string;

  /** X-coordinate position (finite number) */
  x: number;

  /** Y-coordinate position (finite number) */
  y: number;

  /** X-axis velocity for simulation (finite number, default 0) */
  vx?: number;

  /** Y-axis velocity for simulation (finite number, default 0) */
  vy?: number;

  /** X-axis force accumulator (finite number, default 0) */
  fx?: number;

  /** Y-axis force accumulator (finite number, default 0) */
  fy?: number;

  /** Pin node to current position (default false) */
  fixed?: boolean;

  /** Domain-specific metadata (must be JSON-serializable) */
  data?: TData;
}

/**
 * Represents a connection between two nodes with directionality and custom metadata.
 *
 * @template TData - Domain-specific metadata type (must be JSON-serializable)
 *
 * @property {string} id - Unique edge identifier (non-empty, unique within graph)
 * @property {string} type - Type discriminator for visual mapping (non-empty)
 * @property {string} source - Source node ID (must reference existing node)
 * @property {string} target - Target node ID (must reference existing node)
 * @property {boolean} [directed] - Directionality flag (true = directed, default true)
 * @property {number} [strength] - Spring strength for attraction force (finite positive number, default 1.0)
 * @property {number} [distance] - Ideal length for spring force (finite positive number, default 30)
 * @property {boolean} [hidden] - Exclude from rendering but include in forces (default false)
 * @property {TData} [data] - Domain-specific metadata (generic)
 *
 * @example
 * ```typescript
 * // Simple edge with no custom data
 * type BasicEdge = Edge<Record<string, never>>;
 *
 * // Collaboration edge with custom metadata
 * interface CollaborationData {
 *   coAuthorCount: number;
 *   firstYear: number;
 * }
 * type CollaborationEdge = Edge<CollaborationData>;
 * ```
 */
export interface Edge<TData = unknown> {
  /** Unique edge identifier (non-empty string) */
  id: string;

  /** Type discriminator for visual mapping (non-empty string) */
  type: string;

  /** Source node ID (must reference existing node) */
  source: string;

  /** Target node ID (must reference existing node) */
  target: string;

  /** Directionality flag (true = directed, default true) */
  directed?: boolean;

  /** Spring strength for attraction force (finite positive number, default 1.0) */
  strength?: number;

  /** Ideal length for spring force (finite positive number, default 30) */
  distance?: number;

  /** Exclude from rendering but include in forces (default false) */
  hidden?: boolean;

  /** Domain-specific metadata (must be JSON-serializable) */
  data?: TData;
}

/**
 * Container for nodes and edges with CRUD operations and validation.
 *
 * @template TNode - Node type extending base Node interface
 * @template TEdge - Edge type extending base Edge interface
 *
 * Invariants:
 * - Unique node IDs (no duplicates)
 * - Unique edge IDs (no duplicates)
 * - Valid references: All edge.source and edge.target must reference existing nodes
 * - No orphan edges: Removing a node removes all incident edges
 *
 * @example
 * ```typescript
 * interface AcademicNode extends Node<{ title: string }> {}
 * interface CitationEdge extends Edge<{ year: number }> {}
 *
 * const graph: Graph<AcademicNode, CitationEdge> = // ... implementation
 * graph.addNode({ id: 'A1', type: 'author', x: 0, y: 0, data: { title: 'Dr. Smith' } });
 * graph.addEdge({ id: 'E1', type: 'cites', source: 'A1', target: 'A2' });
 * ```
 */
export interface Graph<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
> {
  // ============================================================================
  // Node Operations
  // ============================================================================

  /**
   * Add a node to the graph.
   *
   * @param {TNode} node - Node to add (must have unique ID)
   * @throws {Error} If node ID already exists or validation fails
   *
   * @example
   * ```typescript
   * graph.addNode({ id: 'N1', type: 'work', x: 100, y: 200 });
   * ```
   */
  addNode(node: TNode): void;

  /**
   * Remove a node from the graph.
   *
   * Also removes all edges connected to this node (incident edges).
   *
   * @param {string} id - Node ID to remove
   * @throws {Error} If node does not exist
   *
   * @example
   * ```typescript
   * graph.removeNode('N1'); // Also removes edges E1, E2 if they reference N1
   * ```
   */
  removeNode(id: string): void;

  /**
   * Get a node by ID.
   *
   * @param {string} id - Node ID to retrieve
   * @returns {TNode | undefined} Node if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const node = graph.getNode('N1');
   * if (node) {
   *   console.log(node.type);
   * }
   * ```
   */
  getNode(id: string): TNode | undefined;

  /**
   * Check if a node exists in the graph.
   *
   * @param {string} id - Node ID to check
   * @returns {boolean} True if node exists, false otherwise
   *
   * @example
   * ```typescript
   * if (graph.hasNode('N1')) {
   *   graph.removeNode('N1');
   * }
   * ```
   */
  hasNode(id: string): boolean;

  // ============================================================================
  // Edge Operations
  // ============================================================================

  /**
   * Add an edge to the graph.
   *
   * @param {TEdge} edge - Edge to add (must have unique ID, valid source/target)
   * @throws {Error} If edge ID exists, source/target invalid, or validation fails
   *
   * @example
   * ```typescript
   * graph.addEdge({ id: 'E1', type: 'cites', source: 'N1', target: 'N2' });
   * ```
   */
  addEdge(edge: TEdge): void;

  /**
   * Remove an edge from the graph.
   *
   * @param {string} id - Edge ID to remove
   * @throws {Error} If edge does not exist
   *
   * @example
   * ```typescript
   * graph.removeEdge('E1');
   * ```
   */
  removeEdge(id: string): void;

  /**
   * Get an edge by ID.
   *
   * @param {string} id - Edge ID to retrieve
   * @returns {TEdge | undefined} Edge if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const edge = graph.getEdge('E1');
   * if (edge) {
   *   console.log(`${edge.source} -> ${edge.target}`);
   * }
   * ```
   */
  getEdge(id: string): TEdge | undefined;

  /**
   * Check if an edge exists in the graph.
   *
   * @param {string} id - Edge ID to check
   * @returns {boolean} True if edge exists, false otherwise
   *
   * @example
   * ```typescript
   * if (!graph.hasEdge('E1')) {
   *   graph.addEdge({ id: 'E1', type: 'cites', source: 'N1', target: 'N2' });
   * }
   * ```
   */
  hasEdge(id: string): boolean;

  // ============================================================================
  // Query Operations
  // ============================================================================

  /**
   * Get all neighbor nodes connected to a given node.
   *
   * Returns nodes connected by either incoming or outgoing edges.
   *
   * @param {string} nodeId - Node ID to get neighbors for
   * @returns {TNode[]} Array of neighbor nodes (empty if node has no neighbors)
   * @throws {Error} If node does not exist
   *
   * @example
   * ```typescript
   * const neighbors = graph.getNeighbors('N1');
   * console.log(`Node N1 has ${neighbors.length} neighbors`);
   * ```
   */
  getNeighbors(nodeId: string): TNode[];

  /**
   * Get all edges connected to a given node.
   *
   * Returns edges where node is either source or target.
   *
   * @param {string} nodeId - Node ID to get incident edges for
   * @returns {TEdge[]} Array of incident edges (empty if node has no edges)
   * @throws {Error} If node does not exist
   *
   * @example
   * ```typescript
   * const edges = graph.getIncidentEdges('N1');
   * const incoming = edges.filter(e => e.target === 'N1');
   * const outgoing = edges.filter(e => e.source === 'N1');
   * ```
   */
  getIncidentEdges(nodeId: string): TEdge[];

  /**
   * Get the degree (number of connections) of a node.
   *
   * Degree = number of incident edges (both incoming and outgoing).
   *
   * @param {string} nodeId - Node ID to get degree for
   * @returns {number} Degree of the node (0 if isolated)
   * @throws {Error} If node does not exist
   *
   * @example
   * ```typescript
   * const degree = graph.getDegree('N1');
   * if (degree === 0) {
   *   console.log('N1 is an isolated node');
   * }
   * ```
   */
  getDegree(nodeId: string): number;

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate the entire graph structure.
   *
   * Checks:
   * - Unique node IDs
   * - Unique edge IDs
   * - All edge references point to existing nodes
   * - All node positions are finite numbers
   * - All edge strength/distance values are valid
   *
   * @returns {ValidationResult} Validation result with errors if invalid
   *
   * @example
   * ```typescript
   * const result = graph.validate();
   * if (!result.valid) {
   *   console.error('Graph validation failed:', result.error);
   * }
   * ```
   */
  validate(): ValidationResult;
}

/**
 * Result of validation operations.
 *
 * @property {boolean} valid - True if validation passed, false otherwise
 * @property {string} [error] - Error message if validation failed (undefined if valid)
 *
 * @example
 * ```typescript
 * const result: ValidationResult = { valid: false, error: 'Node N1 not found' };
 * if (!result.valid) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export interface ValidationResult {
  /** True if validation passed, false otherwise */
  valid: boolean;

  /** Error message if validation failed (undefined if valid) */
  error?: string;
}
