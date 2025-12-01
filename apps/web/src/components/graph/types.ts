/**
 * Shared types for graph visualization components
 *
 * These types are used by both 2D (ForceGraphVisualization) and 3D (ForceGraph3DVisualization)
 * components to ensure consistent styling and display behavior.
 */

/**
 * Display mode for graph visualization
 * - 'highlight': Non-highlighted nodes are dimmed but visible
 * - 'filter': Non-highlighted nodes are hidden
 */
export type DisplayMode = 'highlight' | 'filter';

/**
 * Style properties for rendering graph nodes
 */
export interface NodeStyle {
  color?: string;
  size?: number;
  opacity?: number;
  borderColor?: string;
  borderWidth?: number;
}

/**
 * Style properties for rendering graph edges/links
 */
export interface LinkStyle {
  color?: string;
  width?: number;
  opacity?: number;
  curvature?: number;
  dashed?: boolean;
  directed?: boolean;
}
