/**
 * Graph edge rendering utilities
 * Applies multi-modal visual distinction for outbound vs inbound relationships
 *
 * User Story 2 (T035): Apply edge styling in graph renderer
 *
 * This module provides utilities for rendering graph edges with directional styling
 * for various graph visualization libraries (react-force-graph, XYFlow, D3, etc.)
 */

import type { GraphEdge } from "@bibgraph/types";

import {
  getEdgeStyle,
  getEdgeHoverStyle,
  getEdgeFilteredStyle,
  type EdgeStyleProperties,
} from "./edge-styles";

/**
 * Canvas rendering function for react-force-graph-2d/3d edges
 * Renders an edge on a canvas with conditional styling based on direction
 *
 * @param edge - Graph edge to render
 * @param sourceNode - Source node position
 * @param targetNode - Target node position
 * @param ctx - Canvas 2D rendering context
 * @param globalScale - Current zoom level (for adaptive rendering)
 */
export function renderEdgeOnCanvas(
  edge: GraphEdge,
  sourceNode: { x: number; y: number },
  targetNode: { x: number; y: number },
  ctx: CanvasRenderingContext2D,
  globalScale: number
): void {
  const style = getEdgeStyle(edge);

  // Save canvas state
  ctx.save();

  // Set stroke style
  ctx.strokeStyle = style.stroke || '#708090';
  ctx.lineWidth = (style.strokeWidth || 2) / globalScale;
  ctx.globalAlpha = style.strokeOpacity ?? style.opacity ?? 0.8;

  // Handle dashed lines for inbound edges
  if (style.strokeDasharray) {
    const dashArray = style.strokeDasharray.split(',').map(Number);
    ctx.setLineDash(dashArray);
  } else {
    ctx.setLineDash([]); // Solid line
  }

  // Draw the edge line
  ctx.beginPath();
  ctx.moveTo(sourceNode.x, sourceNode.y);
  ctx.lineTo(targetNode.x, targetNode.y);
  ctx.stroke();

  // Restore canvas state
  ctx.restore();
}

/**
 * SVG element generator for SVG-based renderers
 * Returns SVG line/path attributes for conditional styling
 *
 * @param edge - Graph edge
 * @returns SVG attributes object
 */
export function getSvgEdgeAttributes(
  edge: GraphEdge
): Record<string, string | number> {
  const style = getEdgeStyle(edge);

  return {
    stroke: style.stroke || '#708090',
    'stroke-width': style.strokeWidth || 2,
    'stroke-dasharray': style.strokeDasharray || 'none',
    'stroke-opacity': style.strokeOpacity ?? style.opacity ?? 0.8,
    'marker-end': style.markerEnd ? `url(#${style.markerEnd})` : undefined,
    ...(style['data-direction'] && { 'data-direction': style['data-direction'] }),
    ...(style['data-relation-type'] && {
      'data-relation-type': style['data-relation-type'],
    }),
  } as Record<string, string | number>;
}

/**
 * DOM element styling for DOM-based renderers (e.g., XYFlow)
 * Returns CSS style object for conditional styling
 *
 * @param edge - Graph edge
 * @returns React CSSProperties object
 */
export function getDomEdgeStyle(
  edge: GraphEdge
): React.CSSProperties & Record<string, unknown> {
  const style = getEdgeStyle(edge);

  return {
    borderColor: style.borderColor || style.stroke || '#708090',
    borderStyle: style.borderStyle || (style.strokeDasharray ? 'dashed' : 'solid'),
    borderWidth: style.strokeWidth || 2,
    opacity: style.opacity ?? 0.8,
    // Data attributes for testing
    ...(style['data-direction'] && { 'data-direction': style['data-direction'] }),
    ...(style['data-relation-type'] && {
      'data-relation-type': style['data-relation-type'],
    }),
  };
}

/**
 * Color accessor function for react-force-graph
 * Returns the stroke color for an edge based on its type and direction
 *
 * @param edge - Graph edge
 * @returns Hex color string
 */
export function getEdgeColor(edge: GraphEdge): string {
  const style = getEdgeStyle(edge);
  return style.stroke || '#708090';
}

/**
 * Width accessor function for react-force-graph
 * Returns the stroke width for an edge
 *
 * @param edge - Graph edge
 * @returns Width in pixels
 */
export function getEdgeWidth(edge: GraphEdge): number {
  const style = getEdgeStyle(edge);
  return style.strokeWidth || 2;
}

/**
 * Edge canvas object function for react-force-graph
 * Custom canvas rendering function that replaces default edge rendering
 *
 * This is the main integration point for react-force-graph-2d
 *
 * @returns Function compatible with ForceGraph2D's linkCanvasObject property
 *
 * @example
 * <ForceGraph2D
 *   linkCanvasObject={createEdgeCanvasObjectFunction()}
 *   linkColor={(link) => getEdgeColor(link as GraphEdge)}
 *   linkWidth={(link) => getEdgeWidth(link as GraphEdge)}
 * />
 */
export function createEdgeCanvasObjectFunction() {
  return (
    edge: GraphEdge,
    ctx: CanvasRenderingContext2D,
    globalScale: number
  ): void => {
    // Get source and target node positions from edge object
    // react-force-graph adds source/target as objects with x,y properties
    const source = (edge as GraphEdge & { source: { x: number; y: number } }).source;
    const target = (edge as GraphEdge & { target: { x: number; y: number } }).target;

    if (!source || !target) {
      return;
    }

    renderEdgeOnCanvas(
      edge,
      { x: source.x, y: source.y },
      { x: target.x, y: target.y },
      ctx,
      globalScale
    );
  };
}

/**
 * Hover state handler for edges
 * Returns style properties for an edge in hover state
 *
 * @param edge - Graph edge
 * @returns Hover style properties
 */
export function getEdgeHoverColor(edge: GraphEdge): string {
  const style = getEdgeHoverStyle(edge);
  return style.stroke || '#708090';
}

/**
 * Filtered/dimmed state handler for edges
 * Returns style properties for edges that are filtered out
 *
 * @param edge - Graph edge
 * @returns Filtered style properties
 */
export function getEdgeFilteredColor(edge: GraphEdge): string {
  const style = getEdgeFilteredStyle(edge);
  return style.stroke || '#708090';
}

/**
 * Integration helper for applying styles to any graph edge element
 * Provides a unified interface for all rendering approaches
 *
 * @param edge - Graph edge
 * @param rendererType - Type of renderer being used
 * @returns Style properties appropriate for the renderer
 */
export function applyConditionalEdgeStyling(
  edge: GraphEdge,
  rendererType: 'canvas' | 'svg' | 'dom'
): EdgeStyleProperties | React.CSSProperties | Record<string, unknown> {
  switch (rendererType) {
    case 'canvas':
      // Return style properties for canvas
      return getEdgeStyle(edge);

    case 'svg':
      // Return SVG attributes
      return getSvgEdgeAttributes(edge);

    case 'dom':
      // Return CSS properties
      return getDomEdgeStyle(edge);

    default:
      return getEdgeStyle(edge);
  }
}
