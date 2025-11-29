/**
 * Shared types for algorithm components
 *
 * @module components/algorithms/types
 */

import type { GraphNode, GraphEdge } from '@bibgraph/types';

/**
 * Community result from community detection algorithms
 */
export interface CommunityResult {
  id: number;
  nodeIds: string[];
  size: number;
  density: number;
}

/**
 * Base props shared by all algorithm item components
 */
export interface AlgorithmItemBaseProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onHighlightNodes?: (nodeIds: string[]) => void;
  onHighlightPath?: (path: string[]) => void;
}

/**
 * Props for community-related algorithm items
 */
export interface CommunityAlgorithmProps extends AlgorithmItemBaseProps {
  onSelectCommunity?: (communityId: number, nodeIds: string[]) => void;
  onCommunitiesDetected?: (communities: CommunityResult[], communityColors: Map<number, string>) => void;
}

/**
 * Props for path-related algorithm items
 */
export interface PathAlgorithmProps extends AlgorithmItemBaseProps {
  pathSource?: string | null;
  pathTarget?: string | null;
  onPathSourceChange?: (nodeId: string | null) => void;
  onPathTargetChange?: (nodeId: string | null) => void;
}

/**
 * Full props for the AlgorithmTabs container
 */
export interface AlgorithmTabsProps extends AlgorithmItemBaseProps, CommunityAlgorithmProps, PathAlgorithmProps {
  highlightedNodes?: Set<string>;
  highlightedPath?: string[];
}

/**
 * Props for category tab components
 */
export interface CategoryTabProps extends AlgorithmTabsProps {}
