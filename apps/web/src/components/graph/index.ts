/**
 * Graph component utilities
 * Exports styling and rendering utilities for graph visualization
 *
 * User Story 2 (T025, T026): Visual distinction for xpac works and unverified authors
 * User Story 2 (T030-T035): Edge direction visual distinction
 */

// Export node styling functions
export {
  getXpacWorkStyle,
  getUnverifiedAuthorStyle,
  getXpacUnverifiedStyle,
  getConditionalNodeStyle,
  getNodeAccessibilityLabel,
  NODE_STYLE_COLORS,
  type NodeStyleProperties,
} from "./node-styles";

// Export node rendering utilities
export {
  renderNodeOnCanvas,
  getSvgNodeAttributes,
  getDomNodeStyle,
  getNodeColor,
  createNodeCanvasObjectFunction,
  createNodePointerAreaPaintFunction,
  createNodeThreeObject,
  applyConditionalNodeStyling,
} from "./node-renderer";

// Export edge styling functions
export {
  getEdgeStyle,
  getOutboundStyle,
  getInboundStyle,
  getTypeColor,
  getEdgeHoverStyle,
  getEdgeFilteredStyle,
  TYPE_COLORS,
  type EdgeStyleProperties,
} from "./edge-styles";

// Export edge rendering utilities
export {
  renderEdgeOnCanvas,
  getSvgEdgeAttributes,
  getDomEdgeStyle,
  getEdgeColor,
  getEdgeWidth,
  createEdgeCanvasObjectFunction,
  getEdgeHoverColor,
  getEdgeFilteredColor,
  applyConditionalEdgeStyling,
} from "./edge-renderer";

// Re-export animated layout context (if it exists)
export * from "./animated-layout-context";
