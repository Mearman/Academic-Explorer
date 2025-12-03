import { type Edge,type Node } from './graph';

/**
 * Weight function that extracts weight from an edge and optionally considers source/target nodes.
 *
 * This allows flexible weight calculation based on:
 * - Edge attributes: `(edge) => edge.customCost`
 * - Node attributes: `(edge, source, target) => source.elevation - target.elevation`
 * - Combined: `(edge, source, target) => edge.distance * target.difficulty`
 * @param edge - The edge being traversed
 * @param sourceNode - The source node of the edge
 * @param targetNode - The target node of the edge
 * @returns The numeric weight for this edge (must be non-negative for Dijkstra)
 * @example
 * ```typescript
 * // Use custom edge attribute
 * const edgeCostFn: WeightFunction<MyNode, MyEdge> = (edge) => edge.cost;
 *
 * // Use node elevation difference
 * const elevationFn: WeightFunction<MyNode, MyEdge> = (edge, source, target) =>
 *   Math.abs(source.elevation - target.elevation);
 *
 * // Combine edge distance with target difficulty
 * const complexFn: WeightFunction<MyNode, MyEdge> = (edge, source, target) =>
 *   edge.distance * (target.difficulty ?? 1);
 * ```
 */
export type WeightFunction<N extends Node, E extends Edge> = (
  edge: E,
  sourceNode: N,
  targetNode: N
) => number;

/**
 * Default weight function that uses edge.weight with fallback to 1.
 * This maintains backward compatibility with existing behavior.
 * @param edge
 */
export const defaultWeightFunction = <E extends Edge>(edge: E): number => edge.weight ?? 1;
