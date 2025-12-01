/**
 * 3D Force-directed graph visualization component
 *
 * Renders a graph using react-force-graph-3d with customizable styling.
 * Presentation logic (colors, highlights, filters) is passed in as props,
 * keeping this component focused on rendering.
 */

import type { GraphNode, GraphEdge, EntityType } from '@bibgraph/types';
import { detectWebGLCapabilities } from '@bibgraph/utils';
import { Box, LoadingOverlay } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

import { ENTITY_TYPE_COLORS as HASH_BASED_ENTITY_COLORS } from '../../../styles/hash-colors';
import { getEdgeStyle } from '../edge-styles';

// Entity type colors using hash-based generation for deterministic, consistent coloring
const ENTITY_TYPE_COLORS: Record<EntityType, string> = HASH_BASED_ENTITY_COLORS;

// Node for the force graph (extends NodeObject)
interface ForceGraphNode {
  id: string;
  entityType: EntityType;
  label: string;
  entityId: string;
  // Position managed by force simulation
  x?: number;
  y?: number;
  z?: number;
  fx?: number; // Fixed x position
  fy?: number; // Fixed y position
  fz?: number; // Fixed z position
  // Original data
  originalNode: GraphNode;
}

// Link for the force graph
interface ForceGraphLink {
  id: string;
  type: string;
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  // Original data
  originalEdge: GraphEdge;
}

export type DisplayMode = 'highlight' | 'filter';

export interface NodeStyle {
  color?: string;
  size?: number;
  opacity?: number;
}

export interface LinkStyle {
  color?: string;
  width?: number;
  opacity?: number;
  curvature?: number;
  dashed?: boolean;
}

export interface ForceGraph3DVisualizationProps {
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
  /** Loading state */
  loading?: boolean;
  /** Custom node style override */
  getNodeStyle?: (node: GraphNode, isHighlighted: boolean, communityId?: number) => NodeStyle;
  /** Custom link style override */
  getLinkStyle?: (edge: GraphEdge, isHighlighted: boolean) => LinkStyle;
  /** Node click handler */
  onNodeClick?: (node: GraphNode) => void;
  /** Node hover handler */
  onNodeHover?: (node: GraphNode | null) => void;
  /** Background click handler */
  onBackgroundClick?: () => void;
  /** Enable/disable force simulation */
  enableSimulation?: boolean;
  /** Seed for deterministic initial positions (defaults to 42 for reproducibility) */
  seed?: number;
  /** Callback when WebGL is unavailable */
  onWebGLUnavailable?: (reason: string) => void;
}

/** Default seed for deterministic layouts */
const DEFAULT_SEED = 42;

/**
 * Simple seeded random number generator for deterministic layouts
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * WebGL unavailable fallback component
 */
function WebGLUnavailable({ reason }: { reason: string }) {
  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 'var(--mantine-spacing-xl)',
        textAlign: 'center',
        color: 'var(--mantine-color-dimmed)',
      }}
    >
      <IconAlertTriangle size={48} style={{ marginBottom: 'var(--mantine-spacing-md)' }} />
      <Box style={{ fontWeight: 500, marginBottom: 'var(--mantine-spacing-xs)' }}>
        3D Visualization Unavailable
      </Box>
      <Box style={{ fontSize: 'var(--mantine-font-size-sm)' }}>
        {reason}
      </Box>
    </Box>
  );
}

export function ForceGraph3DVisualization({
  nodes,
  edges,
  visible = true,
  width,
  height = 500,
  displayMode = 'highlight',
  highlightedNodeIds = new Set(),
  highlightedPath = [],
  communityAssignments,
  communityColors,
  loading = false,
  getNodeStyle,
  getLinkStyle,
  onNodeClick,
  onNodeHover,
  onBackgroundClick,
  enableSimulation = true,
  seed,
  onWebGLUnavailable,
}: ForceGraph3DVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Use any for the ref type to avoid complex generic type issues with react-force-graph-3d
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(undefined);
  const [webglStatus, setWebglStatus] = useState<{ available: boolean; reason?: string } | null>(null);

  // Check WebGL availability on mount
  useEffect(() => {
    const result = detectWebGLCapabilities();
    setWebglStatus({ available: result.available, reason: result.reason });
    if (!result.available && onWebGLUnavailable) {
      onWebGLUnavailable(result.reason ?? 'WebGL not available');
    }
  }, [onWebGLUnavailable]);

  // Track container width for responsive sizing
  const [containerWidth, setContainerWidth] = useState(width ?? 800);

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
  const filterNodeIds = displayMode === 'filter' ? highlightedNodeIds : undefined;

  // Transform nodes for force graph with 3D positions
  const graphData = useMemo(() => {
    // Always use deterministic seeding for reproducible layouts
    const random = seededRandom(seed ?? DEFAULT_SEED);

    // Filter nodes if in filter mode
    const filteredNodes = filterNodeIds && filterNodeIds.size > 0
      ? nodes.filter(n => filterNodeIds.has(n.id))
      : nodes;

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
      // Use existing positions or generate random ones in 3D space
      x: node.x ?? (random() - 0.5) * 400,
      y: node.y ?? (random() - 0.5) * 400,
      z: (random() - 0.5) * 400, // Add Z dimension
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
    if (highlightedPath.length > 0) {
      return highlightedPathEdges.has(`${edge.source}-${edge.target}`);
    }
    if (highlightedNodeIds.size === 0) {
      return true; // No highlighting active
    }
    return highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target);
  }, [highlightedNodeIds, highlightedPath, highlightedPathEdges]);

  // 3D node rendering - return a Three.js object with depth-based visual effects
  const nodeThreeObject = useCallback((node: ForceGraphNode) => {
    const isHighlighted = isNodeHighlighted(node.id);
    const communityId = communityAssignments?.get(node.id);

    // Get style from custom function or defaults
    const style = getNodeStyle
      ? getNodeStyle(node.originalNode, isHighlighted, communityId)
      : getDefaultNodeStyle(node, isHighlighted, communityId, communityColors);

    const color = style.color ?? ENTITY_TYPE_COLORS[node.entityType] ?? '#888888';
    const baseSize = style.size ?? 6;
    const opacity = isHighlighted ? (style.opacity ?? 1) : 0.3;

    // Create a group to hold both sphere and label
    const group = new THREE.Group();

    // Create sphere geometry with enhanced material for better depth perception
    const geometry = new THREE.SphereGeometry(baseSize, 16, 16);

    // Use MeshPhongMaterial for better lighting and depth perception
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      emissive: new THREE.Color(color).multiplyScalar(0.2), // Subtle glow
      emissiveIntensity: isHighlighted ? 0.3 : 0.1,
      shininess: 50,
    });

    const sphere = new THREE.Mesh(geometry, material);

    // Add subtle ring for highlighted nodes (visual emphasis)
    if (isHighlighted) {
      const ringGeometry = new THREE.RingGeometry(baseSize * 1.2, baseSize * 1.4, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2; // Face camera
      group.add(ring);
    }

    group.add(sphere);

    // Add label as sprite text (always faces camera)
    const sprite = new SpriteText(node.label);
    sprite.color = isHighlighted ? '#ffffff' : '#888888';
    sprite.textHeight = 4;
    sprite.position.y = baseSize + 5;
    sprite.backgroundColor = isHighlighted ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)';
    sprite.padding = 1;
    sprite.borderRadius = 2;
    group.add(sprite);

    return group;
  }, [isNodeHighlighted, communityAssignments, communityColors, getNodeStyle]);

  // Link color based on highlighting
  const linkColor = useCallback((link: ForceGraphLink) => {
    const isHighlighted = isEdgeHighlighted(link.originalEdge);

    if (highlightedPath.length > 0 && isHighlighted) {
      return 'rgba(100, 149, 237, 0.8)'; // Cornflower blue for path
    }

    const style = getLinkStyle
      ? getLinkStyle(link.originalEdge, isHighlighted)
      : getDefaultLinkStyle(link, isHighlighted, highlightedPath.length > 0);

    return isHighlighted
      ? (style.color ?? 'rgba(150, 150, 150, 0.6)')
      : 'rgba(100, 100, 100, 0.2)';
  }, [isEdgeHighlighted, getLinkStyle, highlightedPath.length]);

  // Link width based on highlighting
  const linkWidth = useCallback((link: ForceGraphLink) => {
    const isHighlighted = isEdgeHighlighted(link.originalEdge);
    const style = getLinkStyle
      ? getLinkStyle(link.originalEdge, isHighlighted)
      : getDefaultLinkStyle(link, isHighlighted, highlightedPath.length > 0);

    return isHighlighted ? (style.width ?? 1.5) : 0.5;
  }, [isEdgeHighlighted, getLinkStyle, highlightedPath.length]);

  // Handle node click
  const handleNodeClick = useCallback((node: ForceGraphNode | null) => {
    if (node) {
      onNodeClick?.(node.originalNode);
    }
  }, [onNodeClick]);

  // Handle node hover
  const handleNodeHover = useCallback((node: ForceGraphNode | null) => {
    if (node) {
      onNodeHover?.(node.originalNode);
    } else {
      onNodeHover?.(null);
    }
  }, [onNodeHover]);

  // Handle background click
  const handleBackgroundClick = useCallback(() => {
    onBackgroundClick?.();
  }, [onBackgroundClick]);

  // Keyboard navigation for accessibility (T045)
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!graphRef.current) return;

    const graph = graphRef.current;
    const cameraPosition = graph.cameraPosition();
    const distance = 50; // Camera movement distance

    switch (event.key) {
      case 'ArrowUp':
        // Move camera forward (zoom in) or pan up with Shift
        if (event.shiftKey) {
          graph.cameraPosition({ y: cameraPosition.y + distance });
        } else {
          const newZ = cameraPosition.z - distance;
          graph.cameraPosition({ z: Math.max(newZ, 100) });
        }
        event.preventDefault();
        break;
      case 'ArrowDown':
        // Move camera backward (zoom out) or pan down with Shift
        if (event.shiftKey) {
          graph.cameraPosition({ y: cameraPosition.y - distance });
        } else {
          graph.cameraPosition({ z: cameraPosition.z + distance });
        }
        event.preventDefault();
        break;
      case 'ArrowLeft':
        // Pan camera left
        graph.cameraPosition({ x: cameraPosition.x - distance });
        event.preventDefault();
        break;
      case 'ArrowRight':
        // Pan camera right
        graph.cameraPosition({ x: cameraPosition.x + distance });
        event.preventDefault();
        break;
      case 'Home':
        // Reset camera to fit graph
        graph.zoomToFit(400, 50);
        event.preventDefault();
        break;
      case '+':
      case '=':
        // Zoom in
        graph.cameraPosition({ z: Math.max(cameraPosition.z - 100, 100) });
        event.preventDefault();
        break;
      case '-':
      case '_':
        // Zoom out
        graph.cameraPosition({ z: cameraPosition.z + 100 });
        event.preventDefault();
        break;
      case 'r':
      case 'R':
        // Reset view
        graph.zoomToFit(400, 50);
        event.preventDefault();
        break;
      default:
        break;
    }
  }, []);

  // Pause/resume simulation
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

  // Show loading state while checking WebGL
  if (webglStatus === null) {
    return (
      <Box
        ref={containerRef}
        pos="relative"
        style={{
          width: width ?? '100%',
          height,
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
          backgroundColor: 'var(--mantine-color-gray-0)',
        }}
      >
        <LoadingOverlay visible />
      </Box>
    );
  }

  // Show fallback if WebGL unavailable
  if (!webglStatus.available) {
    return (
      <Box
        ref={containerRef}
        pos="relative"
        style={{
          width: width ?? '100%',
          height,
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: 'var(--mantine-radius-md)',
          overflow: 'hidden',
          backgroundColor: 'var(--mantine-color-gray-0)',
        }}
      >
        <WebGLUnavailable reason={webglStatus.reason ?? 'WebGL not available'} />
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      pos="relative"
      tabIndex={0}
      role="application"
      aria-label="3D Graph Visualization. Use arrow keys to pan, +/- to zoom, R to reset view."
      onKeyDown={handleKeyDown}
      style={{
        width: width ?? '100%',
        height,
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: 'var(--mantine-radius-md)',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-gray-0)',
        outline: 'none',
      }}
    >
      <LoadingOverlay visible={loading} />
      <ForceGraph3D
        ref={graphRef}
        width={width ?? containerWidth}
        height={height}
        graphData={graphData}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={false}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkOpacity={0.6}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
        cooldownTime={enableSimulation ? 3000 : 0}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        backgroundColor="rgba(0,0,0,0)"
        // Performance optimizations for large graphs
        warmupTicks={graphData.nodes.length > 100 ? 100 : 50}
        cooldownTicks={graphData.nodes.length > 500 ? 0 : 100}
        numDimensions={3}
        // Reduce physics complexity for large graphs
        d3AlphaMin={graphData.nodes.length > 500 ? 0.01 : 0.001}
      />
    </Box>
  );
}

/**
 * Default node styling based on entity type and highlighting
 */
function getDefaultNodeStyle(
  node: ForceGraphNode,
  isHighlighted: boolean,
  communityId?: number,
  communityColors?: Map<number, string>
): NodeStyle {
  let color = ENTITY_TYPE_COLORS[node.entityType] ?? '#888888';

  // Use community color if available
  if (communityId !== undefined && communityColors?.has(communityId)) {
    color = communityColors.get(communityId) ?? color;
  }

  return {
    color,
    size: isHighlighted ? 8 : 6,
    opacity: 1,
  };
}

/**
 * Default link styling based on edge type and highlighting
 */
function getDefaultLinkStyle(
  link: ForceGraphLink,
  isHighlighted: boolean,
  isPathHighlightMode: boolean
): LinkStyle {
  const edge = link.originalEdge;
  const edgeStyle = getEdgeStyle(edge);

  // Path highlight mode overrides edge type colors
  if (isHighlighted && isPathHighlightMode) {
    return {
      color: 'rgba(100, 149, 237, 0.8)', // Cornflower blue for path
      width: 3,
      opacity: 0.8,
      dashed: false,
    };
  }

  return {
    color: edgeStyle.stroke ?? 'rgba(150, 150, 150, 0.6)',
    width: edgeStyle.strokeWidth ?? 1.5,
    opacity: edgeStyle.strokeOpacity ?? 0.6,
    dashed: edgeStyle.strokeDasharray !== undefined,
  };
}
