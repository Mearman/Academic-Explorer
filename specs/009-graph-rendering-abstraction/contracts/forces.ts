/**
 * Force Function Contracts
 *
 * This file defines TypeScript types for force functions used in graph simulations.
 * Forces mutate node force accumulators (fx, fy) to influence node positions during
 * physics simulation. All force implementations must adhere to these contracts.
 *
 * @module forces
 * @see data-model.md Section 4 (Force<TNode, TEdge>)
 */

import type { Node, Edge } from './core-types';

/**
 * Function signature for applying forces to nodes based on graph structure.
 *
 * Forces are pure functions that mutate node force accumulators (fx, fy) without
 * directly modifying positions. The simulation integrator uses these accumulators
 * to update velocities and positions.
 *
 * @template TNode - Node type extending base Node interface
 * @template TEdge - Edge type extending base Edge interface
 *
 * @param nodes - Array of nodes to apply forces to
 * @param edges - Array of edges defining graph structure
 * @param alpha - Cooling parameter in range [0, 1]; decreases over time to stabilize simulation
 *
 * @remarks
 * - Forces MUST mutate `node.fx` and `node.fy` accumulators only
 * - Forces MUST NOT modify `node.x`, `node.y`, `node.vx`, `node.vy` directly
 * - Forces SHOULD scale output by `alpha` for proper cooling behavior
 * - Forces SHOULD respect `node.fixed` flag by skipping fixed nodes
 *
 * @example
 * ```typescript
 * const repulsionForce: ForceFunction<BasicNode, BasicEdge> = (nodes, edges, alpha) => {
 *   for (let i = 0; i < nodes.length; i++) {
 *     for (let j = i + 1; j < nodes.length; j++) {
 *       const nodeA = nodes[i];
 *       const nodeB = nodes[j];
 *
 *       // Skip fixed nodes
 *       if (nodeA.fixed || nodeB.fixed) continue;
 *
 *       const dx = nodeB.x - nodeA.x;
 *       const dy = nodeB.y - nodeA.y;
 *       const distance = Math.sqrt(dx * dx + dy * dy) || 1;
 *
 *       // Coulomb-like repulsion scaled by alpha
 *       const force = -30 * alpha / (distance * distance);
 *
 *       nodeA.fx += (dx / distance) * force;
 *       nodeA.fy += (dy / distance) * force;
 *       nodeB.fx -= (dx / distance) * force;
 *       nodeB.fy -= (dy / distance) * force;
 *     }
 *   }
 * };
 * ```
 */
export type ForceFunction<TNode extends Node, TEdge extends Edge> = (
  nodes: TNode[],
  edges: TEdge[],
  alpha: number
) => void;

/**
 * Configuration interface for force functions.
 *
 * All forces support runtime enabling/disabling and strength adjustment.
 *
 * @example
 * ```typescript
 * const config: ForceConfig = {
 *   strength: -30,
 *   enabled: true
 * };
 * ```
 */
export interface ForceConfig {
  /**
   * Force magnitude multiplier.
   *
   * - Positive values: Attractive forces (pull nodes together)
   * - Negative values: Repulsive forces (push nodes apart)
   * - Zero: Disable force effect
   *
   * @remarks
   * Typical ranges:
   * - Repulsion: -100 to -10
   * - Attraction: 0.01 to 1.0
   * - Centering: 0.01 to 0.1
   * - Collision: 1.0 (binary constraint)
   */
  strength: number;

  /**
   * Toggle force on/off without removing from simulation.
   *
   * @remarks
   * When `false`, force function may still be called but should return early.
   * Prefer this over removing forces to avoid re-initialization overhead.
   */
  enabled: boolean;
}

/**
 * Many-body repulsion force configuration.
 *
 * Implements Coulomb-like n-body force to prevent node overlap.
 * Complexity: O(n²) for naive implementation, O(n log n) with spatial indexing.
 *
 * @remarks
 * Formula: F = k * (q₁ * q₂) / r²
 * - k: strength (typically negative for repulsion)
 * - q₁, q₂: charge (default 1.0 per node, customizable via charge callback)
 * - r: distance between nodes
 *
 * @example
 * ```typescript
 * const repulsion: RepulsionForce = {
 *   strength: -30,
 *   enabled: true,
 *   charge: (node) => node.data.citations ? -Math.sqrt(node.data.citations) : -1,
 *   distanceMin: 1,
 *   distanceMax: Infinity,
 *   theta: 0.9 // Barnes-Hut optimization threshold
 * };
 * ```
 */
export interface RepulsionForce extends ForceConfig {
  /**
   * Charge callback for heterogeneous repulsion.
   *
   * @param node - Node to compute charge for
   * @returns Charge value (negative = repel, positive = attract, zero = neutral)
   *
   * @remarks
   * Default: `() => -1` (uniform repulsion)
   */
  charge?: <TNode extends Node>(node: TNode) => number;

  /**
   * Minimum distance threshold to prevent singularities.
   *
   * @remarks
   * When nodes are closer than `distanceMin`, force is clamped to avoid
   * infinite or NaN values.
   *
   * @default 1
   */
  distanceMin?: number;

  /**
   * Maximum distance threshold for performance optimization.
   *
   * @remarks
   * Pairs farther than `distanceMax` are skipped. Use `Infinity` to
   * disable (all pairs considered).
   *
   * @default Infinity
   */
  distanceMax?: number;

  /**
   * Barnes-Hut approximation parameter.
   *
   * @remarks
   * Controls accuracy vs. performance tradeoff in quadtree/octree optimizations.
   * - theta = 0: Exact O(n²) computation
   * - theta = 0.5-0.9: Good approximation with O(n log n) complexity
   * - theta = 1.0: Maximum approximation, lowest accuracy
   *
   * @default 0.9
   */
  theta?: number;
}

/**
 * Spring attraction force configuration.
 *
 * Implements Hooke's law spring force along edges to pull connected nodes together.
 * Complexity: O(m) where m = number of edges.
 *
 * @remarks
 * Formula: F = k * (d - d₀)
 * - k: strength (edge.strength or global strength)
 * - d: current distance between source and target
 * - d₀: ideal distance (edge.distance or global distance)
 *
 * @example
 * ```typescript
 * const attraction: AttractionForce = {
 *   strength: 0.1,
 *   enabled: true,
 *   distance: 30,
 *   iterations: 1
 * };
 * ```
 */
export interface AttractionForce extends ForceConfig {
  /**
   * Ideal spring length (rest distance).
   *
   * @remarks
   * - Per-edge override: Use `edge.distance` if defined
   * - Global fallback: Use this value if `edge.distance` is undefined
   *
   * @default 30
   */
  distance?: number;

  /**
   * Number of constraint satisfaction iterations per tick.
   *
   * @remarks
   * Multiple iterations improve spring stiffness at the cost of performance.
   * - iterations = 1: Soft springs
   * - iterations = 3-5: Medium stiffness
   * - iterations = 10+: Rigid springs (expensive)
   *
   * @default 1
   */
  iterations?: number;
}

/**
 * Centering force configuration.
 *
 * Applies weak global force to prevent graph from drifting off-screen.
 * Complexity: O(n).
 *
 * @remarks
 * Formula: F = k * (center - position)
 * - k: strength (weak, typically 0.01-0.1)
 * - center: target center point (x, y)
 * - position: node current position
 *
 * @example
 * ```typescript
 * const centering: CenteringForce = {
 *   strength: 0.05,
 *   enabled: true,
 *   x: 400,
 *   y: 300
 * };
 * ```
 */
export interface CenteringForce extends ForceConfig {
  /**
   * Target X-coordinate for graph center.
   *
   * @remarks
   * Typically set to viewport center (width / 2).
   *
   * @default 0
   */
  x?: number;

  /**
   * Target Y-coordinate for graph center.
   *
   * @remarks
   * Typically set to viewport center (height / 2).
   *
   * @default 0
   */
  y?: number;
}

/**
 * Collision detection force configuration.
 *
 * Enforces minimum separation between nodes via radius-based collision detection.
 * Complexity: O(n²) for naive implementation, O(n log n) with spatial indexing.
 *
 * @remarks
 * Unlike soft forces, collision is a hard constraint resolved through position
 * adjustment. Nodes are pushed apart until separation >= radius₁ + radius₂.
 *
 * @example
 * ```typescript
 * const collision: CollisionForce = {
 *   strength: 1.0,
 *   enabled: true,
 *   radius: (node) => node.data.size || 5,
 *   iterations: 1
 * };
 * ```
 */
export interface CollisionForce extends ForceConfig {
  /**
   * Radius callback for heterogeneous node sizes.
   *
   * @param node - Node to compute radius for
   * @returns Collision radius in pixels
   *
   * @remarks
   * Default: `() => 5` (uniform 5px radius)
   *
   * @example
   * ```typescript
   * // Radius proportional to citation count
   * radius: (node) => Math.sqrt(node.data.citations || 1) * 2
   * ```
   */
  radius?: <TNode extends Node>(node: TNode) => number;

  /**
   * Number of constraint satisfaction iterations per tick.
   *
   * @remarks
   * More iterations reduce overlap but increase computation time.
   * - iterations = 1: Allow minor overlap
   * - iterations = 3-5: Good separation
   * - iterations = 10+: Hard separation (expensive)
   *
   * @default 1
   */
  iterations?: number;
}
