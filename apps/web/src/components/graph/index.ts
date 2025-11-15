/**
 * Graph component utilities
 * Exports styling and rendering utilities for graph visualization
 *
 * User Story 2 (T025, T026): Visual distinction for xpac works and unverified authors
 */

// Export styling functions
export {
  getXpacWorkStyle,
  getUnverifiedAuthorStyle,
  getXpacUnverifiedStyle,
  getConditionalNodeStyle,
  getNodeAccessibilityLabel,
  NODE_STYLE_COLORS,
  type NodeStyleProperties,
} from "./node-styles";

// Export rendering utilities
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

// Re-export animated layout context (if it exists)
export * from "./animated-layout-context";
