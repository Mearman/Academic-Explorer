/**
 * Force-directed graph visualization component
 *
 * Renders a graph using react-force-graph-2d with customizable styling.
 * Presentation logic (colors, highlights, filters) is passed in as props,
 * keeping this component focused on rendering.
 */

import type { EntityType,GraphEdge, GraphNode } from '@bibgraph/types';
import { Box, LoadingOverlay, useComputedColorScheme } from '@mantine/core';
import React, { useCallback, useEffect, useMemo,useRef } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type LinkObject,type NodeObject } from 'react-force-graph-2d';

import { ENTITY_TYPE_COLORS as HASH_BASED_ENTITY_COLORS } from '../../styles/hash-colors';
import { getEdgeStyle } from './edge-styles';

// Entity type colors using hash-based generation for deterministic, consistent coloring
const ENTITY_TYPE_COLORS: Record<EntityType, string> = HASH_BASED_ENTITY_COLORS;

// Default prop values extracted as constants to prevent infinite render loops
const DEFAULT_HIGHLIGHTED_NODE_IDS = new Set<string>();
const DEFAULT_HIGHLIGHTED_PATH: string[] = [];
const DEFAULT_EXPANDING_NODE_IDS = new Set<string>();

// Node for the force graph (extends NodeObject)
interface ForceGraphNode extends NodeObject {
  id: string;
  entityType: EntityType;
  label: string;
  entityId: string;
  // Position managed by force simulation
  x?: number;
  y?: number;
  fx?: number; // Fixed x position
  fy?: number; // Fixed y position
  // Original data
  originalNode: GraphNode;
}

// Link for the force graph (extends LinkObject)
interface ForceGraphLink extends LinkObject {
  id: string;
  type: string;
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  // Original data
  originalEdge: GraphEdge;
}

// Import and re-export shared types
import type { DisplayMode, LinkStyle,NodeStyle } from './types';

export interface ForceGraphVisualizationProps {
  /** Graph nodes */
  nodes: GraphNode[];
  /** Graph edges */
  edges: GraphEdge[];
  /** Whether to show the graph (for controlled visibility) */
  visible?: boolean;
  /** Width of the visualization (defaults to container width) */
  width?: number;
  /** Height of the visualization */
  height?: number;
  /** Display mode: highlight dims non-selected, filter hides non-selected */
  displayMode?: DisplayMode;
  /** Set of highlighted node IDs */
  highlightedNodeIds?: Set<string>;
  /** Path to highlight (ordered array of node IDs) */
  highlightedPath?: string[];
  /** Community assignments: nodeId -> communityId */
  communityAssignments?: Map<string, number>;
  /** Community colors: communityId -> color */
  communityColors?: Map<number, string>;
  /** Node IDs currently being expanded (loading relationships) */
  expandingNodeIds?: Set<string>;
  /** Loading state */
  loading?: boolean;
  /** Custom node style override */
  getNodeStyle?: (node: GraphNode, isHighlighted: boolean, communityId?: number) => NodeStyle;
  /** Custom link style override */
  getLinkStyle?: (edge: GraphEdge, isHighlighted: boolean) => LinkStyle;
  /** Node click handler */
  onNodeClick?: (node: GraphNode) => void;
  /** Node right-click handler (for context menu) */
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
  /** Node hover handler */
  onNodeHover?: (node: GraphNode | null) => void;
  /** Background click handler */
  onBackgroundClick?: () => void;
  /** Enable/disable force simulation */
  enableSimulation?: boolean;
  /** Seed for deterministic initial positions (defaults to 42 for reproducibility) */
  seed?: number;
  /** Callback when graph methods become available (for external control like zoomToFit) */
  onGraphReady?: (methods: ForceGraphMethods) => void;
}

/** Default seed for deterministic layouts */
const DEFAULT_SEED = 42;

/**
 * Simple seeded random number generator for deterministic layouts
 * @param seed
 */
const seededRandom = (seed: number): () => number => () => {
    seed = (seed * 1_103_515_245 + 12_345) & 0x7F_FF_FF_FF;
    return seed / 0x7F_FF_FF_FF;
  };

export const ForceGraphVisualization = ({
  nodes,
  edges,
  visible = true,
  width,
  height = 500,
  displayMode = 'highlight',
  highlightedNodeIds = DEFAULT_HIGHLIGHTED_NODE_IDS,
  highlightedPath = DEFAULT_HIGHLIGHTED_PATH,
  communityAssignments,
  communityColors,
  expandingNodeIds = DEFAULT_EXPANDING_NODE_IDS,
  loading = false,
  getNodeStyle,
  getLinkStyle,
  onNodeClick,
  onNodeRightClick,
  onNodeHover,
  onBackgroundClick,
  enableSimulation = true,
  seed,
  onGraphReady,
}: ForceGraphVisualizationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const colorScheme = useComputedColorScheme('light');

  // Notify parent when graph methods become available
  useEffect(() => {
    // Use a short delay to ensure the ref is populated after render
    const checkRef = () => {
      if (graphRef.current && onGraphReady) {
        onGraphReady(graphRef.current);
      }
    };
    // Check immediately and after a short delay (for initial mount)
    checkRef();
    const timeoutId = setTimeout(checkRef, 100);
    return () => clearTimeout(timeoutId);
  }, [onGraphReady]);

  // Track container width for responsive sizing
  const [containerWidth, setContainerWidth] = React.useState(width ?? 800);

  useEffect(() => {
    if (!containerRef.current || width) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [width]);

  // Create highlighted path edge set for quick lookup
  const highlightedPathEdges = useMemo(() => {
    const edgeSet = new Set<string>();
    for (let i = 0; i < highlightedPath.length - 1; i++) {
      const source = highlightedPath[i];
      const target = highlightedPath[i + 1];
      // Add both directions since graph might be undirected
      edgeSet.add(`${source}-${target}`);
      edgeSet.add(`${target}-${source}`);
    }
    return edgeSet;
  }, [highlightedPath]);

  // Only use highlightedNodeIds for filtering if in filter mode
  // This prevents graphData from recalculating on every highlight change in "highlight" mode
  const filterNodeIds = displayMode === 'filter' ? highlightedNodeIds : undefined;

  // Transform nodes for force graph
  const graphData = useMemo(() => {
    // Always use deterministic seeding for reproducible layouts
    const random = seededRandom(seed ?? DEFAULT_SEED);

    // Deduplicate nodes by ID (safety net - upstream should already deduplicate)
    const seenNodeIds = new Set<string>();
    const deduplicatedNodes = nodes.filter(n => {
      if (seenNodeIds.has(n.id)) {
        return false;
      }
      seenNodeIds.add(n.id);
      return true;
    });

    // Filter nodes if in filter mode
    const filteredNodes = filterNodeIds && filterNodeIds.size > 0
      ? deduplicatedNodes.filter(n => filterNodeIds.has(n.id))
      : deduplicatedNodes;

    const nodeIdSet = new Set(filteredNodes.map(n => n.id));

    // Filter edges to only include those between visible nodes
    const filteredEdges = edges.filter(e =>
      nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
    );

    const forceNodes: ForceGraphNode[] = filteredNodes.map((node) => ({
      id: node.id,
      entityType: node.entityType,
      label: node.label,
      entityId: node.entityId,
      // Use existing positions or generate random ones
      x: node.x ?? (random() - 0.5) * 400,
      y: node.y ?? (random() - 0.5) * 400,
      originalNode: node,
    }));

    const forceLinks: ForceGraphLink[] = filteredEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      originalEdge: edge,
    }));

    return { nodes: forceNodes, links: forceLinks };
  }, [nodes, edges, filterNodeIds, seed]);

  // Determine if a node is highlighted
  const isNodeHighlighted = useCallback((nodeId: string): boolean => {
    if (highlightedNodeIds.size === 0 && highlightedPath.length === 0) {
      return true; // No highlighting active, all nodes are "highlighted"
    }
    return highlightedNodeIds.has(nodeId) || highlightedPath.includes(nodeId);
  }, [highlightedNodeIds, highlightedPath]);

  // Determine if an edge is highlighted
  const isEdgeHighlighted = useCallback((edge: GraphEdge): boolean => {
    // Extract source and target IDs (always strings in our implementation)
    const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as unknown as string);
    const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as unknown as string);

    if (highlightedPath.length > 0) {
      return highlightedPathEdges.has(`${sourceId}-${targetId}`);
    }
    if (highlightedNodeIds.size === 0) {
      return true; // No highlighting active
    }
    // Highlight edge if both endpoints are highlighted
    return highlightedNodeIds.has(sourceId) && highlightedNodeIds.has(targetId);
  }, [highlightedNodeIds, highlightedPath, highlightedPathEdges]);

  // Node canvas rendering
  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const forceNode = node as ForceGraphNode;
    const isHighlighted = isNodeHighlighted(forceNode.id);
    const isExpanding = expandingNodeIds.has(forceNode.id);
    const communityId = communityAssignments?.get(forceNode.id);

    // Get style from custom function or defaults
    const style = getNodeStyle
      ? getNodeStyle(forceNode.originalNode, isHighlighted, communityId)
      : getDefaultNodeStyle(forceNode, isHighlighted, communityId, communityColors);

    const x = forceNode.x ?? 0;
    const y = forceNode.y ?? 0;
    const size = style.size ?? 6;

    // Apply opacity for non-highlighted nodes in highlight mode
    ctx.globalAlpha = isHighlighted ? (style.opacity ?? 1) : 0.2;

    // Draw node circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = style.color ?? ENTITY_TYPE_COLORS[forceNode.entityType] ?? 'var(--mantine-color-dimmed)';
    ctx.fill();

    // Draw border if specified
    if (style.borderWidth && style.borderColor) {
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = style.borderWidth;
      ctx.stroke();
    }

    // Draw spinning ring for expanding nodes (loading indicator)
    if (isExpanding) {
      const ringRadius = size * 1.5;
      const ringWidth = size * 0.3;
      // Time-based rotation (full rotation every 1.5 seconds)
      const rotation = (Date.now() / 1500) * Math.PI * 2;

      ctx.globalAlpha = 0.8;

      // Main spinning arc (deep sky blue)
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, rotation, rotation + Math.PI * 1.5);
      ctx.strokeStyle = '#00bfff';
      ctx.lineWidth = ringWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Secondary faster arc (white, for visual interest)
      const fastRotation = (Date.now() / 750) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, fastRotation, fastRotation + Math.PI * 0.5);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = ringWidth * 0.6;
      ctx.stroke();

      ctx.lineCap = 'butt'; // Reset
    }

    // Draw label when zoomed in
    if (globalScale > 1.5) {
      const label = forceNode.label || forceNode.id;
      const fontSize = Math.max(10 / globalScale, 3);
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isHighlighted ? 'var(--mantine-color-text)' : 'var(--mantine-color-dimmed)';
      ctx.fillText(label, x, y + size + 2);
    }

    ctx.globalAlpha = 1;
  }, [isNodeHighlighted, expandingNodeIds, communityAssignments, communityColors, getNodeStyle]);

  // Link canvas rendering
  const linkCanvasObject = useCallback((link: LinkObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const forceLink = link as ForceGraphLink;
    const isHighlighted = isEdgeHighlighted(forceLink.originalEdge);

    const style = getLinkStyle
      ? getLinkStyle(forceLink.originalEdge, isHighlighted)
      : getDefaultLinkStyle(forceLink, isHighlighted, highlightedPath.length > 0);

    const source = forceLink.source as ForceGraphNode;
    const target = forceLink.target as ForceGraphNode;

    if (!source.x || !source.y || !target.x || !target.y) return;

    ctx.globalAlpha = isHighlighted ? (style.opacity ?? 0.6) : 0.1;
    ctx.strokeStyle = style.color ?? 'var(--mantine-color-dimmed)';
    ctx.fillStyle = style.color ?? 'var(--mantine-color-dimmed)';
    ctx.lineWidth = (style.width ?? 1) / globalScale;

    if (style.dashed) {
      ctx.setLineDash([5 / globalScale, 5 / globalScale]);
    } else {
      ctx.setLineDash([]);
    }

    // Draw the line
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();

    // Draw arrowhead for directed edges
    if (style.directed) {
      const targetNodeSize = 6; // Default node size
      const arrowLength = 8 / globalScale;

      // Calculate angle from source to target
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      // Position arrow at target node edge (offset by node radius)
      const arrowTipX = source.x + (dist - targetNodeSize) * Math.cos(angle);
      const arrowTipY = source.y + (dist - targetNodeSize) * Math.sin(angle);

      // Draw arrowhead
      ctx.setLineDash([]); // Arrowhead should not be dashed
      ctx.beginPath();
      ctx.moveTo(arrowTipX, arrowTipY);
      ctx.lineTo(
        arrowTipX - arrowLength * Math.cos(angle - Math.PI / 6),
        arrowTipY - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowTipX - arrowLength * Math.cos(angle + Math.PI / 6),
        arrowTipY - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }, [isEdgeHighlighted, getLinkStyle, highlightedPath.length]);

  // Handle node click
  const handleNodeClick = useCallback((node: NodeObject) => {
    const forceNode = node as ForceGraphNode;
    onNodeClick?.(forceNode.originalNode);
  }, [onNodeClick]);

  // Handle node right-click (context menu)
  const handleNodeRightClick = useCallback((node: NodeObject, event: MouseEvent) => {
    event.preventDefault();
    const forceNode = node as ForceGraphNode;
    onNodeRightClick?.(forceNode.originalNode, event);
  }, [onNodeRightClick]);

  // Handle node hover
  const handleNodeHover = useCallback((node: NodeObject | null) => {
    if (node) {
      const forceNode = node as ForceGraphNode;
      onNodeHover?.(forceNode.originalNode);
    } else {
      onNodeHover?.(null);
    }
  }, [onNodeHover]);

  // Handle background click
  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  // Pause simulation when not enabled
  useEffect(() => {
    if (graphRef.current) {
      if (enableSimulation) {
        graphRef.current.resumeAnimation();
      } else {
        graphRef.current.pauseAnimation();
      }
    }
  }, [enableSimulation]);

  // Fit graph to view on data change
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      // Small delay to let simulation settle
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50);
      }, 500);
    }
  }, [graphData.nodes.length]);

  if (!visible) {
    return null;
  }

  return (
    <Box
      ref={containerRef}
      pos="relative"
      style={{
        width: width ?? '100%',
        height,
        border: `1px solid ${colorScheme === 'dark' ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'}`,
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
        backgroundColor: colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'var(--mantine-color-gray-0)',
      }}
    >
      <LoadingOverlay visible={loading} />
      <ForceGraph2D
        ref={graphRef}
        width={width ?? containerWidth}
        height={height}
        graphData={graphData}
        nodeCanvasObject={nodeCanvasObject}
        linkCanvasObject={linkCanvasObject}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        cooldownTime={enableSimulation ? 3000 : 0}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </Box>
  );
};

/**
 * Default node styling based on entity type and highlighting
 * @param node
 * @param isHighlighted
 * @param communityId
 * @param communityColors
 */
const getDefaultNodeStyle = (node: ForceGraphNode, isHighlighted: boolean, communityId?: number, communityColors?: Map<number, string>): NodeStyle => {
  let color = ENTITY_TYPE_COLORS[node.entityType] ?? 'var(--mantine-color-dimmed)';

  // Use community color if available
  if (communityId !== undefined && communityColors?.has(communityId)) {
    color = communityColors.get(communityId) ?? color;
  }

  return {
    color,
    size: isHighlighted ? 8 : 6,
    opacity: 1,
    borderColor: isHighlighted ? 'var(--mantine-color-body)' : undefined,
    borderWidth: isHighlighted ? 2 : 0,
  };
};

/**
 * Default link styling based on edge type, direction, and highlighting
 * Uses edge-styles.ts for consistent relationship type colors
 * @param link
 * @param isHighlighted
 * @param isPathHighlightMode
 */
const getDefaultLinkStyle = (link: ForceGraphLink, isHighlighted: boolean, isPathHighlightMode: boolean): LinkStyle => {
  const edge = link.originalEdge;
  const edgeStyle = getEdgeStyle(edge);
  const isDirected = edge.direction !== undefined;

  // Path highlight mode overrides edge type colors
  if (isHighlighted && isPathHighlightMode) {
    return {
      color: 'var(--mantine-primary-color-filled)', // Primary color for path highlighting
      width: 3,
      opacity: 0.8,
      dashed: false,
      directed: isDirected,
    };
  }

  return {
    color: edgeStyle.stroke ?? 'var(--mantine-color-dimmed)',
    width: edgeStyle.strokeWidth ?? 2,
    opacity: edgeStyle.strokeOpacity ?? 0.6,
    dashed: edgeStyle.strokeDasharray !== undefined,
    directed: isDirected,
  };
};
