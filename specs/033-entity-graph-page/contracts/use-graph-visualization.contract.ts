/**
 * Contract: useGraphVisualization Hook
 *
 * This contract defines the interface for the useGraphVisualization hook,
 * which manages visualization state shared between algorithms and graph pages.
 *
 * @module contracts/use-graph-visualization
 */

import type { GraphNode } from '@bibgraph/types';

/**
 * Display mode for graph visualization
 */
export type DisplayMode = 'highlight' | 'filter';

/**
 * View mode for 2D/3D toggle
 */
export type ViewMode = '2D' | '3D';

/**
 * Community detection result (from algorithm execution)
 */
export interface CommunityResult {
  id: number;
  nodeIds: string[];
  size: number;
}

/**
 * Visualization state managed by the hook
 */
export interface GraphVisualizationState {
  /**
   * Set of highlighted node IDs
   * Nodes in this set are visually emphasized
   */
  highlightedNodes: Set<string>;

  /**
   * Ordered array of node IDs forming a path
   * Used for shortest path visualization
   */
  highlightedPath: string[];

  /**
   * Map from node ID to community ID
   * Used for community detection coloring
   */
  communityAssignments: Map<string, number>;

  /**
   * Map from community ID to color string
   * Defines the color palette for communities
   */
  communityColors: Map<number, string>;

  /**
   * Current display mode
   * 'highlight': dim non-highlighted nodes
   * 'filter': hide non-highlighted nodes
   */
  displayMode: DisplayMode;

  /**
   * Whether force simulation is running
   */
  enableSimulation: boolean;

  /**
   * Current view mode (2D or 3D)
   */
  viewMode: ViewMode;

  /**
   * Source node for pathfinding
   */
  pathSource: string | null;

  /**
   * Target node for pathfinding
   */
  pathTarget: string | null;
}

/**
 * Actions/handlers provided by the hook
 */
export interface GraphVisualizationActions {
  /**
   * Highlight specific nodes (clears previous highlights)
   */
  highlightNodes: (nodeIds: string[]) => void;

  /**
   * Highlight a path (ordered array of node IDs)
   */
  highlightPath: (path: string[]) => void;

  /**
   * Clear all highlights and path
   */
  clearHighlights: () => void;

  /**
   * Set community detection results for coloring
   */
  setCommunitiesResult: (
    communities: CommunityResult[],
    colors: Map<number, string>
  ) => void;

  /**
   * Select a specific community (highlights its nodes)
   */
  selectCommunity: (communityId: number, nodeIds: string[]) => void;

  /**
   * Change display mode
   */
  setDisplayMode: (mode: DisplayMode) => void;

  /**
   * Toggle force simulation on/off
   */
  setEnableSimulation: (enabled: boolean) => void;

  /**
   * Change view mode (2D/3D)
   */
  setViewMode: (mode: ViewMode) => void;

  /**
   * Set source node for pathfinding
   */
  setPathSource: (nodeId: string | null) => void;

  /**
   * Set target node for pathfinding
   */
  setPathTarget: (nodeId: string | null) => void;

  /**
   * Handle node click in visualization
   * Implements path source/target selection logic
   */
  handleNodeClick: (node: GraphNode) => void;

  /**
   * Handle background click (clears selection)
   */
  handleBackgroundClick: () => void;

  /**
   * Reset all visualization state to defaults
   */
  reset: () => void;
}

/**
 * Combined return type of useGraphVisualization
 */
export type UseGraphVisualizationResult = GraphVisualizationState & GraphVisualizationActions;

/**
 * Hook contract: useGraphVisualization
 *
 * Usage:
 * ```typescript
 * function GraphPage() {
 *   const {
 *     highlightedNodes,
 *     highlightedPath,
 *     communityAssignments,
 *     communityColors,
 *     displayMode,
 *     enableSimulation,
 *     viewMode,
 *     pathSource,
 *     pathTarget,
 *     highlightNodes,
 *     handleNodeClick,
 *     // ... other actions
 *   } = useGraphVisualization();
 *
 *   return (
 *     <>
 *       <ForceGraphVisualization
 *         nodes={nodes}
 *         edges={edges}
 *         highlightedNodeIds={highlightedNodes}
 *         highlightedPath={highlightedPath}
 *         communityAssignments={communityAssignments}
 *         communityColors={communityColors}
 *         displayMode={displayMode}
 *         enableSimulation={enableSimulation}
 *         onNodeClick={handleNodeClick}
 *       />
 *       <AlgorithmTabs
 *         pathSource={pathSource}
 *         pathTarget={pathTarget}
 *         onHighlightNodes={highlightNodes}
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * Behavior:
 * - Initializes with default state (no highlights, 2D mode, simulation on)
 * - viewMode is persisted to localStorage via useViewModePreference
 * - All other state is session-only
 * - handleNodeClick implements source/target selection for pathfinding
 */
export type UseGraphVisualization = () => UseGraphVisualizationResult;
